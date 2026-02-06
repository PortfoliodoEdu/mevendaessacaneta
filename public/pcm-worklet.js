// AudioWorkletProcessor para capturar áudio do microfone e enviar PCM16 16kHz mono.
// Mantido em JS puro para funcionar direto via /pcm-worklet.js no Vite.

class PcmWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._inRate = sampleRate;
    this._outRate = 16000;
    this._ratio = this._inRate / this._outRate;
    this._acc = 0;
    // 10ms @16kHz = 160 samples (mais responsivo)
    this._frameSamples = 160;
    this._buf = new Int16Array(this._frameSamples * 4);
    this._bufLen = 0;
  }

  _floatToInt16(f) {
    const s = Math.max(-1, Math.min(1, f));
    return s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const ch = input[0]; // mono
    // downsample melhor: média por janela (reduz aliasing)
    let sum = 0;
    let count = 0;
    for (let i = 0; i < ch.length; i++) {
      sum += ch[i];
      count += 1;
      this._acc += 1;
      if (this._acc >= this._ratio) {
        this._acc -= this._ratio;
        const avg = count > 0 ? (sum / count) : ch[i];
        sum = 0;
        count = 0;
        if (this._bufLen >= this._buf.length) {
          const bigger = new Int16Array(this._buf.length * 2);
          bigger.set(this._buf, 0);
          this._buf = bigger;
        }
        this._buf[this._bufLen++] = this._floatToInt16(avg);
      }
    }

    // envia em frames de ~20ms para evitar flood de mensagens no WS
    while (this._bufLen >= this._frameSamples) {
      const frame = this._buf.slice(0, this._frameSamples);
      // shift do restante
      this._buf.copyWithin(0, this._frameSamples, this._bufLen);
      this._bufLen -= this._frameSamples;
      this.port.postMessage(frame.buffer, [frame.buffer]);
    }
    return true;
  }
}

registerProcessor("pcm-worklet", PcmWorkletProcessor);

