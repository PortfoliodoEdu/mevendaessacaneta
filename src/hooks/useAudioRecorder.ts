import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  duration: number;
  transcript: string;
  audioLevel: number; // 0..1 (aprox)
  isRefining: boolean;
  setTranscriptValue: (text: string) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  resetTranscript: () => void;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isRefining, setIsRefining] = useState(false);
  const setTranscriptValue = useCallback((text: string) => {
    setTranscript(text);
  }, []);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  // WS usado apenas para o modo "whisper chunks" (/ws/transcribe)
  const wsRef = useRef<WebSocket | null>(null);
  // WS usado apenas para o modo Vosk (/ws/vosk)
  const wsVoskRef = useRef<WebSocket | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const workletPortHandlerRef = useRef<((ev: MessageEvent) => void) | null>(null);
  const speechStartedRef = useRef(false);
  const voskConnectedRef = useRef(false);
  const voskFinalRef = useRef<string>('');
  const voskPartialRef = useRef<string>('');
  const localWsBase = (import.meta.env.VITE_LOCAL_TRANSCRIBE_WS as string | undefined)?.trim();
  const useLocalWs = !!localWsBase;
  const voskWsBase =
    (import.meta.env.VITE_LOCAL_VOSK_WS as string | undefined)?.trim() ||
    (import.meta.env.DEV ? "ws://localhost:8008" : "");
  const useVoskWs = !!voskWsBase;
  const micGain = (() => {
    const raw = Number((import.meta.env.VITE_MIC_GAIN as string | undefined) ?? "2");
    if (!Number.isFinite(raw)) return 2;
    return Math.min(6, Math.max(1, raw));
  })();

  const sendClientLog = useCallback((event: string, data?: any) => {
    if (!import.meta.env.DEV) return;
    try {
      fetch("http://localhost:8008/client-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ts: new Date().toISOString(),
          event,
          data,
        }),
      }).catch(() => {});
    } catch {
      // ignore
    }
  }, []);

  // Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(prev => {
          const baseText = prev.replace(/\[.*\]$/, '').trim();
          if (finalTranscript) {
            return (baseText + ' ' + finalTranscript).trim();
          }
          return baseText + (interimTranscript ? ` [${interimTranscript}]` : '');
        });
      };

      recognition.onerror = (event: any) => {
        console.log('Speech recognition error:', event.error);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startLevelMeter = useCallback((stream: MediaStream) => {
    try {
      const AudioContextCtor = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return;

      const ctx: AudioContext = new AudioContextCtor();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      // pré-gain para aumentar sensibilidade sem precisar falar alto
      const preGain = ctx.createGain();
      preGain.gain.value = micGain;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.75;
      analyserRef.current = analyser;

      source.connect(preGain).connect(analyser);

      const data = new Uint8Array(analyser.fftSize);

      const tick = () => {
        analyser.getByteTimeDomainData(data);
        // RMS normalizado aproximado
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        // curva mais "sensível" (com ganho por software)
        const level = Math.min(1, Math.max(0, rms * 2.8));
        setAudioLevel(level);
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      // se falhar, só não mostra o nível
      setAudioLevel(0);
    }
  }, []);

  const startVoskStreaming = useCallback(
    async (stream: MediaStream) => {
      if (!voskWsBase) return;

      sendClientLog("vosk_ws_connecting", { voskWsBase });
      setIsRefining(true);
      const ws = new WebSocket(voskWsBase.replace(/\/$/, "") + "/ws/vosk");
      ws.binaryType = "arraybuffer";
      wsVoskRef.current = ws;
      voskConnectedRef.current = false;

      ws.onopen = () => {
        voskConnectedRef.current = true;
        setIsRefining(false);
        sendClientLog("vosk_ws_open");
        // se o speech fallback tiver iniciado, para para não misturar
        if (recognitionRef.current && speechStartedRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {}
          speechStartedRef.current = false;
        }
      };
      ws.onerror = () => {
        voskConnectedRef.current = false;
        setIsRefining(false);
        sendClientLog("vosk_ws_error");
      };
      ws.onclose = () => {
        voskConnectedRef.current = false;
        setIsRefining(false);
        sendClientLog("vosk_ws_close");
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg?.type === "partial") {
            if (typeof msg.text === "string") {
              voskPartialRef.current = msg.text;
              const combined = (voskFinalRef.current + (msg.text ? ` ${msg.text}` : '')).trim();
              setTranscript(combined);
            }
            sendClientLog("vosk_ws_message", { type: msg?.type, len: (msg?.text || "").length });
          } else if (msg?.type === "final") {
            if (typeof msg.text === "string") {
              const incoming = msg.text.trim();
              if (incoming) {
                // evita duplicação simples (overlap curto)
                const base = (voskFinalRef.current || '').trim();
                let next = base;
                if (!base) {
                  next = incoming;
                } else {
                  const tail = base.slice(-80).toLowerCase();
                  const inc = incoming.toLowerCase();
                  // se incoming já está no final, ignora
                  if (!tail.endsWith(inc)) {
                    next = (base + ' ' + incoming).trim();
                  }
                }
                voskFinalRef.current = next;
              }
              voskPartialRef.current = '';
              setTranscript(voskFinalRef.current);
            }
            sendClientLog("vosk_ws_message", { type: msg?.type, len: (msg?.text || "").length });
          } else if (msg?.type === "error") {
            // backend reportou erro; deixa fallback do browser assumir
            voskConnectedRef.current = false;
            sendClientLog("vosk_ws_backend_error", msg);
          }
        } catch {
          // ignore
        }
      };

      // Usa o MESMO AudioContext do medidor se existir; senão cria um.
      const AudioContextCtor = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return;

      const ctx: AudioContext = audioContextRef.current ?? new AudioContextCtor();
      audioContextRef.current = ctx;
      try {
        // Garante que o processamento roda (muitos browsers começam em "suspended")
        if (ctx.state === "suspended") await ctx.resume();
      } catch {
        // ignore
      }

      // garante módulo do worklet
      try {
        await ctx.audioWorklet.addModule("/pcm-worklet.js");
      } catch {
        // sem worklet não dá streaming em low-latency
        return;
      }

      const source = ctx.createMediaStreamSource(stream);
      // aumenta sensibilidade também no áudio enviado pro STT
      const preGain = ctx.createGain();
      preGain.gain.value = micGain;
      const node = new AudioWorkletNode(ctx, "pcm-worklet");
      workletNodeRef.current = node;

      // Handler único: mede e envia
      let bytesSent = 0;
      let framesSent = 0;
      const handler = (e: MessageEvent) => {
        const buf = e.data;
        const w = wsVoskRef.current;
        if (buf instanceof ArrayBuffer) {
          bytesSent += buf.byteLength;
          framesSent += 1;
          if (framesSent % 100 === 0) {
            sendClientLog("vosk_pcm_sent", { framesSent, bytesSent });
          }
          if (w && w.readyState === WebSocket.OPEN) {
            w.send(buf);
          }
        }
      };
      workletPortHandlerRef.current = handler;
      node.port.onmessage = handler;

      // conecta para processar (pode ir pro destino com gain 0)
      const gain = ctx.createGain();
      gain.gain.value = 0;
      source.connect(preGain).connect(node).connect(gain).connect(ctx.destination);
    },
    [micGain, voskWsBase]
  );

  const stopLevelMeter = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    analyserRef.current = null;
    if (audioContextRef.current) {
      // fecha o contexto para economizar bateria
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const stopVoskStreaming = useCallback(() => {
    const node = workletNodeRef.current;
    if (node) {
      try {
        node.port.onmessage = null;
        node.disconnect();
      } catch {
        // ignore
      }
      workletNodeRef.current = null;
    }
    workletPortHandlerRef.current = null;
    voskFinalRef.current = '';
    voskPartialRef.current = '';
    const ws = wsVoskRef.current;
    if (ws) {
      try {
        if (ws.readyState === WebSocket.OPEN) ws.send("stop");
        ws.close();
      } catch {
        // ignore
      } finally {
        wsVoskRef.current = null;
      }
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Esses flags aumentam sensibilidade/clareza quando suportados pelo browser
          autoGainControl: true,
          noiseSuppression: true,
          echoCancellation: true,
        } as any,
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      audioChunksRef.current = [];

      // WS local (streaming): abre conexão e envia chunks durante a gravação
      if (localWsBase) {
        setIsRefining(true);
        const ws = new WebSocket(localWsBase.replace(/\/$/, '') + '/ws/transcribe');
        wsRef.current = ws;
        ws.onopen = () => setIsRefining(false);
        ws.onerror = () => setIsRefining(false);
        ws.onclose = () => setIsRefining(false);
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg?.type === 'partial' || msg?.type === 'final') {
              if (typeof msg.text === 'string') setTranscript(msg.text);
            }
          } catch {
            // ignore
          }
        };
      }

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);

          // IMPORTANTE: só envia chunks WebM no modo /ws/transcribe.
          // No modo Vosk, o envio deve ser PCM16 via AudioWorklet (senão corrompe o reconhecimento).
          if (localWsBase) {
            const ws = wsRef.current;
            if (ws && ws.readyState === WebSocket.OPEN) {
              try {
                const buf = await event.data.arrayBuffer();
                ws.send(buf);
              } catch {
                // ignore
              }
            }
          }
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(localWsBase ? 800 : 100);
      setIsRecording(true);
      setDuration(0);
      startLevelMeter(stream);
      if (useVoskWs) {
        // inicia Vosk (não-bloqueante) e agenda fallback do browser se não conectar rápido
        startVoskStreaming(stream).catch(() => {});
        window.setTimeout(() => {
          if (!voskConnectedRef.current && recognitionRef.current && !useLocalWs) {
            try {
              recognitionRef.current.start();
              speechStartedRef.current = true;
            } catch {
              // ignore
            }
          }
        }, 1200);
      }

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Start speech recognition
      // Se Vosk streaming estiver ativo, não starta o SpeechRecognition (evita disputa)
      if (recognitionRef.current && !useLocalWs && !useVoskWs) {
        try {
          recognitionRef.current.start();
          speechStartedRef.current = true;
        } catch (e) {
          console.log('Speech recognition already started');
        }
      }
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }, [localWsBase, startLevelMeter, startVoskStreaming, useLocalWs, useVoskWs]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        speechStartedRef.current = false;
      }

      stopLevelMeter();
      if (useVoskWs) stopVoskStreaming();

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
        
        setIsRecording(false);
        
        // Clean up transcript (remove interim markers)
        setTranscript(prev => prev.replace(/\[.*\]$/, '').trim());

        // Refino opcional via backend local (Python / faster-whisper)
        const baseUrl = (import.meta.env.VITE_LOCAL_TRANSCRIBE_URL as string | undefined)?.trim();
        if (baseUrl) {
          setIsRefining(true);
          const url = `${baseUrl.replace(/\/$/, '')}/transcribe`;
          const form = new FormData();
          form.append('file', audioBlob, 'audio.webm');
          fetch(url, { method: 'POST', body: form })
            .then((r) => (r.ok ? r.json() : r.text().then((t) => Promise.reject(new Error(t || r.statusText)))))
            .then((json) => {
              if (json?.text && typeof json.text === 'string') {
                setTranscript(json.text.trim());
              }
            })
            .catch(() => {
              // silencioso: a transcrição ao vivo já existe
            })
            .finally(() => setIsRefining(false));
        }
        
        resolve(audioBlob);
      };

      mediaRecorderRef.current.stop();

      // finaliza WS local "chunk based" (whisper)
      const ws = wsRef.current;
      if (ws) {
        try {
          if (ws.readyState === WebSocket.OPEN) ws.send('stop');
          ws.close();
        } catch {
          // ignore
        } finally {
          wsRef.current = null;
        }
      }
    });
  }, [stopLevelMeter, stopVoskStreaming, useVoskWs]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setDuration(0);
    setAudioLevel(0);
    setIsRefining(false);
    voskFinalRef.current = '';
    voskPartialRef.current = '';
  }, []);

  return {
    isRecording,
    duration,
    transcript,
    audioLevel,
    isRefining,
    setTranscriptValue,
    startRecording,
    stopRecording,
    resetTranscript,
  };
}
