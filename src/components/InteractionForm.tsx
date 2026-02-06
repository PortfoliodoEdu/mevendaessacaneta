import { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Phone, MessageSquare, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AudioRecorder } from './AudioRecorder';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useCreateInteracao, useUpdateLead, useUploadAudio } from '@/hooks/useLeads';
import type { LeadWithInteracoes, TipoInteracao } from '@/types/lead';
import { RESULTADOS_LIGACAO, RESULTADOS_MENSAGEM } from '@/types/lead';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { LeadSummary } from '@/components/LeadSummary';
import { interpretInteractionTranscript } from '@/lib/gemini';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InteractionFormProps {
  lead: LeadWithInteracoes;
  onSuccess: () => void;
  layout?: 'stack' | 'carousel';
  onClose?: () => void;
}

export function InteractionForm({ lead, onSuccess, layout = 'stack', onClose }: InteractionFormProps) {
  // Determina tipo baseado na próxima interação prevista
  const proximaInteracao = lead.interacoes
    .filter(i => i.data_prevista && !i.data_realizada)
    .sort((a, b) => new Date(a.data_prevista!).getTime() - new Date(b.data_prevista!).getTime())[0];

  const [tipo, setTipo] = useState<TipoInteracao>(proximaInteracao?.tipo as TipoInteracao || 'ligacao');
  const [resultado, setResultado] = useState<string>('');
  const [comentarios, setComentarios] = useState('');
  const [hasEditedComments, setHasEditedComments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioStatus, setAudioStatus] = useState<
    'idle' | 'recording' | 'recorded' | 'uploading' | 'uploaded' | 'error'
  >('idle');

  const { isRecording, duration, transcript, audioLevel, isRefining, setTranscriptValue, startRecording, stopRecording, resetTranscript } = useAudioRecorder();
  const createInteracao = useCreateInteracao();
  const updateLead = useUpdateLead();
  const uploadAudio = useUploadAudio();

  // Atualiza comentários com transcrição
  useEffect(() => {
    if (transcript) {
      if (!hasEditedComments) setComentarios(transcript);
    }
  }, [transcript, hasEditedComments]);

  // Mantém status do áudio sincronizado com o hook
  useEffect(() => {
    if (isRecording) setAudioStatus('recording');
  }, [isRecording]);

  // Cleanup do preview URL
  useEffect(() => {
    return () => {
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    };
  }, [audioPreviewUrl]);

  const resultados = tipo === 'ligacao' ? RESULTADOS_LIGACAO : RESULTADOS_MENSAGEM;

  // Determina se engajou baseado no resultado
  const engajou = resultado.includes('interessado') || resultado === 'agendou_reuniao';

  // Determina novo status baseado no resultado
  const getNewStatus = () => {
    if (resultado === 'agendou_reuniao') return 'reuniao_agendada';
    if (resultado.includes('interessado') && !resultado.includes('nao')) return 'interessado';
    if (resultado.includes('nao_interessado')) return 'descartado';
    if (resultado === 'nao_atendeu' || resultado === 'nao_respondeu') return 'standy_por_falta_de_resposta';
    if (resultado === 'numero_invalido') return 'descartado';
    return lead.status;
  };

  const handleStopRecording = async () => {
    const audioBlob = await stopRecording();
    if (audioBlob) {
      // Feedback imediato (super claro)
      setAudioBlob(audioBlob);
      const url = URL.createObjectURL(audioBlob);
      setAudioPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setAudioUrl(null);
      setAudioStatus('recorded');
      toast.success('Áudio gravado. Enviando…');

      // Upload automático ao parar (evita perder áudio antes do submit)
      setAudioStatus('uploading');
      try {
        const uploadedUrl = await uploadAudio.mutateAsync(audioBlob);
        setAudioUrl(uploadedUrl);
        setAudioStatus('uploaded');
        toast.success('Áudio salvo com sucesso.');
      } catch (e) {
        setAudioStatus('error');
        toast.error('Não consegui salvar o áudio (você ainda pode regravar).');
      }
    }
  };

  const handleClearAudio = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioStatus('idle');
    setAudioPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const handleSubmit = async () => {
    if (!resultado) {
      toast.error('Selecione um resultado');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalAudioUrl: string | null = audioUrl;

      // Se estava gravando, para (o stop já pode subir via WS, mas aqui precisamos do blob)
      if (isRecording) {
        const stoppedBlob = await stopRecording();
        if (stoppedBlob) {
          setAudioBlob(stoppedBlob);
          setAudioStatus('uploading');
          finalAudioUrl = await uploadAudio.mutateAsync(stoppedBlob);
          setAudioUrl(finalAudioUrl);
          setAudioStatus('uploaded');
        }
      } else if (!finalAudioUrl && audioBlob) {
        // caso tenha parado antes de submeter e o upload falhou/não aconteceu
        setAudioStatus('uploading');
        finalAudioUrl = await uploadAudio.mutateAsync(audioBlob);
        setAudioUrl(finalAudioUrl);
        setAudioStatus('uploaded');
      }

      // Calcula o número da sequência
      const sequencia = lead.interacoes.filter(i => i.tipo === tipo).length + 1;

      // Cria a interação realizada (agora)
      await createInteracao.mutateAsync({
        lead_id: lead.id,
        tipo,
        numero_sequencia: sequencia,
        data_realizada: new Date().toISOString(),
        resultado,
        engajou,
        comentarios: comentarios || null,
        audio_url: finalAudioUrl,
      });

      // Regra de follow-up automático quando ficar no vácuo
      const isVacuo = resultado === 'nao_respondeu' || resultado === 'nao_atendeu';
      if (isVacuo) {
        // Agenda próxima tentativa (até 4 tentativas no total)
        const delayByAttempt: Record<number, number> = {
          1: 1, // 2ª tentativa: +1 dia
          2: 3, // 3ª tentativa: +3 dias depois da 2ª (ou +4 do 1º)
          3: 6, // 4ª tentativa: +6 dias depois da 3ª (ou +10 do 1º)
        };
        const delayDays = delayByAttempt[sequencia];
        if (delayDays) {
          const alreadyPlanned = lead.interacoes.some((i) =>
            i.tipo === tipo &&
            i.numero_sequencia === sequencia + 1 &&
            !!i.data_prevista &&
            !i.data_realizada
          );
          if (!alreadyPlanned) {
            const when = addDays(new Date(), delayDays).toISOString();
            await createInteracao.mutateAsync({
              lead_id: lead.id,
              tipo,
              numero_sequencia: sequencia + 1,
              data_prevista: when,
              data_realizada: null,
              resultado: null,
              engajou: false,
              comentarios: null,
              audio_url: null,
            });
            toast.success(
              `Follow-up agendado para ${format(new Date(when), "dd/MM", { locale: ptBR })}`
            );
          }
        }
      }

      // Atualiza o status do lead
      const newStatus = getNewStatus();
      await updateLead.mutateAsync({
        id: lead.id,
        status: newStatus,
      });

      toast.success('Interação registrada!');
      resetTranscript();
      setComentarios('');
      setResultado('');
      setHasEditedComments(false);
      handleClearAudio();
      onSuccess();
    } catch (error) {
      console.error('Erro ao registrar interação:', error);
      toast.error('Erro ao registrar interação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInterpret = async () => {
    let t = transcript?.trim();
    if (!t) {
      // Se já temos áudio gravado, tenta gerar transcrição local (Python) sob demanda
      if (audioBlob) {
        const baseUrl = (import.meta.env.VITE_LOCAL_TRANSCRIBE_URL as string | undefined)?.trim();
        if (!baseUrl) {
          toast.error('Sem transcrição. Configure o backend local (VITE_LOCAL_TRANSCRIBE_URL) ou use um navegador com transcrição.');
          return;
        }
        try {
          setIsInterpreting(true);
          toast.message('Gerando transcrição local…');
          const url = `${baseUrl.replace(/\/$/, '')}/transcribe`;
          const form = new FormData();
          form.append('file', audioBlob, 'audio.webm');
          const r = await fetch(url, { method: 'POST', body: form });
          if (!r.ok) throw new Error(await r.text());
          const json = await r.json();
          if (json?.text && typeof json.text === 'string') {
            t = json.text.trim();
            setTranscriptValue(t);
          }
        } catch (e: any) {
          toast.error(e?.message ?? 'Falha ao transcrever localmente');
          return;
        } finally {
          setIsInterpreting(false);
        }
      } else {
        toast.error('Sem transcrição. Grave um áudio primeiro.');
        return;
      }
    }

    setIsInterpreting(true);
    try {
      const resultadosDisponiveis = (tipo === 'ligacao' ? RESULTADOS_LIGACAO : RESULTADOS_MENSAGEM) as any[];
      const out = await interpretInteractionTranscript({
        transcript: t,
        tipo,
        resultadosDisponiveis,
      });

      if (out.resultado_sugerido) {
        setResultado(out.resultado_sugerido);
      }

      const blocoIa =
        `IA (${out.confianca}): ${out.resumo}` +
        (out.proximo_passo ? `\nPróximo passo: ${out.proximo_passo}` : '');

      setComentarios((prev) => {
        const base = prev?.trim();
        if (!base) return blocoIa;
        // evita duplicar se o usuário clicou duas vezes
        if (base.startsWith('IA (')) return base;
        return `${blocoIa}\n\n${base}`;
      });
      setHasEditedComments(true);

      toast.success('Interpretação pronta — revise antes de salvar.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao interpretar com IA');
    } finally {
      setIsInterpreting(false);
    }
  };

  const audioStatusLabel = useMemo(() => {
    switch (audioStatus) {
      case 'idle': return 'Nenhum áudio gravado';
      case 'recording': return 'Gravando…';
      case 'recorded': return 'Áudio gravado';
      case 'uploading': return 'Salvando áudio…';
      case 'uploaded': return 'Áudio salvo';
      case 'error': return 'Falha ao salvar áudio';
      default: return '';
    }
  }, [audioStatus]);

  const totalSlides = 6;
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setSlideIdx(carouselApi.selectedScrollSnap());
    onSelect();
    carouselApi.on('select', onSelect);
    return () => {
      carouselApi.off('select', onSelect);
    };
  }, [carouselApi]);

  const goPrev = () => carouselApi?.scrollPrev();
  const goNext = () => carouselApi?.scrollNext();

  const progressLabel = useMemo(() => `${Math.min(slideIdx + 1, totalSlides)}/${totalSlides}`, [slideIdx]);

  return (
    <div className={cn("animate-slide-up", layout === 'stack' ? "space-y-5" : "space-y-3")}>

      {layout === 'carousel' ? (
        <Carousel
          setApi={setCarouselApi}
          opts={{ align: 'start', loop: false, containScroll: 'trimSnaps' }}
          className="select-none"
        >
          <CarouselContent className={cn("-ml-3", "pb-16")}>
            <CarouselItem className="pl-3">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Cliente</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <LeadSummary lead={lead} />
                </CardContent>
              </Card>
            </CarouselItem>

            <CarouselItem className="pl-3">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Tipo de interação</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTipo('ligacao');
                        goNext();
                      }}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-semibold transition-all touch-manipulation tap-highlight-none",
                        tipo === 'ligacao'
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      )}
                    >
                      <Phone className="h-5 w-5" />
                      Ligação
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTipo('mensagem');
                        goNext();
                      }}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-semibold transition-all touch-manipulation tap-highlight-none",
                        tipo === 'mensagem'
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      )}
                    >
                      <MessageSquare className="h-5 w-5" />
                      Mensagem
                    </button>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>

            <CarouselItem className="pl-3">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Resultado</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {resultados.map((res) => (
                      <button
                        key={res.value}
                        type="button"
                        onClick={() => {
                          setResultado(res.value);
                          goNext();
                        }}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-xl text-base font-semibold transition-all touch-manipulation tap-highlight-none text-left",
                          "min-h-14",
                          resultado === res.value
                            ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        )}
                      >
                        <span className="text-xl">{res.emoji}</span>
                        <span className="flex-1">{res.label}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>

            <CarouselItem className="pl-3">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Áudio / Notas</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <AudioRecorder
                    isRecording={isRecording}
                    duration={duration}
                    transcript={transcript}
                    audioLevel={audioLevel}
                    hint={
                      audioStatus === 'uploaded'
                        ? 'Áudio salvo — você pode ouvir abaixo'
                        : audioStatus === 'uploading'
                          ? 'Salvando áudio…'
                          : audioStatus === 'error'
                            ? 'Falha ao salvar — você pode regravar'
                            : audioBlob
                              ? 'Áudio gravado — salvando…'
                              : 'Toque para gravar áudio'
                    }
                    hintTone={
                      audioStatus === 'uploaded'
                        ? 'success'
                        : audioStatus === 'error'
                          ? 'destructive'
                          : 'muted'
                    }
                    onStartRecording={startRecording}
                    onStopRecording={handleStopRecording}
                  />
                    {isRefining && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Refinando transcrição (Python/local)...
                      </p>
                    )}
                  <div className="mt-3 space-y-2">
                    <div className={cn(
                      "text-sm font-medium",
                      audioStatus === 'uploaded' && "text-success",
                      audioStatus === 'uploading' && "text-muted-foreground",
                      audioStatus === 'error' && "text-destructive",
                      (audioStatus === 'recorded' || audioStatus === 'idle' || audioStatus === 'recording') && "text-foreground",
                    )}>
                      {audioStatusLabel}
                    </div>

                    {audioPreviewUrl && (
                      <audio controls src={audioPreviewUrl} className="w-full" />
                    )}

                    {(audioBlob || audioUrl) && !isRecording && (
                      <Button type="button" variant="outline" className="w-full h-12" onClick={handleClearAudio}>
                        Regravar / Remover áudio
                      </Button>
                    )}
                  </div>
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full h-12 text-base"
                      onClick={handleInterpret}
                      disabled={isInterpreting || isRecording}
                    >
                      {isInterpreting ? 'Interpretando...' : 'Interpretar com IA'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Usa o texto transcrito para sugerir o resultado e um resumo.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>

            <CarouselItem className="pl-3">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Comentários</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Notas / transcrição</span>
                    <span className="text-xs text-muted-foreground">{comentarios.length}/500</span>
                  </div>
                  <Textarea
                    value={comentarios}
                    onChange={(e) => {
                      setHasEditedComments(true);
                      setComentarios(e.target.value.slice(0, 500));
                    }}
                    placeholder="Adicione notas / editada pela transcrição"
                    className="min-h-[140px] bg-card border-border resize-none text-base"
                  />
                </CardContent>
              </Card>
            </CarouselItem>

            <CarouselItem className="pl-3">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Finalizar</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Toque em <span className="font-medium text-foreground">Registrar</span> para salvar a interação.
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !resultado}
                    className="w-full h-14 text-lg font-semibold bg-success hover:bg-success/90 text-success-foreground shadow-lg"
                  >
                    {isSubmitting ? 'Salvando...' : 'Registrar e Próximo'}
                  </Button>
                </CardContent>
              </Card>
            </CarouselItem>
          </CarouselContent>
        </Carousel>
      ) : null}

      {layout === 'carousel' && (
        <div className="sticky bottom-0 left-0 right-0 z-10 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-sm border-t border-border">
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12"
              onClick={onClose}
              disabled={!onClose}
              aria-label="Fechar"
            >
              <X />
            </Button>

            <div className="text-xs text-muted-foreground flex-1 text-center">
              Deslize • <span className="font-medium text-foreground">{progressLabel}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" className="h-12 w-12" onClick={goPrev} disabled={!carouselApi}>
                <ArrowLeft />
              </Button>
              <Button type="button" variant="outline" size="icon" className="h-12 w-12" onClick={goNext} disabled={!carouselApi}>
                <ArrowRight />
              </Button>
            </div>
          </div>
        </div>
      )}

      {layout === 'carousel' ? null : (
        <>
      {/* Tipo de interação */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTipo('ligacao')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all touch-manipulation tap-highlight-none",
            tipo === 'ligacao'
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          <Phone className="h-5 w-5" />
          Ligação
        </button>
        <button
          type="button"
          onClick={() => setTipo('mensagem')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all touch-manipulation tap-highlight-none",
            tipo === 'mensagem'
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          <MessageSquare className="h-5 w-5" />
          Mensagem
        </button>
      </div>

      {/* Resultado */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Resultado</label>
        <div className="grid grid-cols-2 gap-2">
          {resultados.map((res) => (
            <button
              key={res.value}
              type="button"
              onClick={() => setResultado(res.value)}
              className={cn(
                "flex items-center gap-2 p-3 rounded-xl text-sm font-medium transition-all touch-manipulation tap-highlight-none text-left",
                resultado === res.value
                  ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              <span className="text-lg">{res.emoji}</span>
              <span className="flex-1">{res.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Gravação de áudio */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Áudio / Notas</label>
        <AudioRecorder
          isRecording={isRecording}
          duration={duration}
          transcript={transcript}
          audioLevel={audioLevel}
          hint={
            audioStatus === 'uploaded'
              ? 'Áudio salvo — você pode ouvir abaixo'
              : audioStatus === 'uploading'
                ? 'Salvando áudio…'
                : audioStatus === 'error'
                  ? 'Falha ao salvar — você pode regravar'
                  : audioBlob
                    ? 'Áudio gravado — salvando…'
                    : 'Toque para gravar áudio'
          }
          hintTone={
            audioStatus === 'uploaded'
              ? 'success'
              : audioStatus === 'error'
                ? 'destructive'
                : 'muted'
          }
          onStartRecording={startRecording}
          onStopRecording={handleStopRecording}
        />
        {isRefining && (
          <p className="text-xs text-muted-foreground">
            Refinando transcrição (Python/local)...
          </p>
        )}
        <div className={cn(
          "text-sm font-medium",
          audioStatus === 'uploaded' && "text-success",
          audioStatus === 'uploading' && "text-muted-foreground",
          audioStatus === 'error' && "text-destructive",
          (audioStatus === 'recorded' || audioStatus === 'idle' || audioStatus === 'recording') && "text-foreground",
        )}>
          {audioStatusLabel}
        </div>
        {audioPreviewUrl && (
          <audio controls src={audioPreviewUrl} className="w-full" />
        )}
        {(audioBlob || audioUrl) && !isRecording && (
          <Button type="button" variant="outline" className="w-full h-12" onClick={handleClearAudio}>
            Regravar / Remover áudio
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          className="w-full h-12 text-base"
          onClick={handleInterpret}
          disabled={isInterpreting || isRecording}
        >
          {isInterpreting ? 'Interpretando...' : 'Interpretar com IA'}
        </Button>
      </div>

      {/* Comentários */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">Comentários</label>
          <span className="text-xs text-muted-foreground">{comentarios.length}/500</span>
        </div>
        <Textarea
          value={comentarios}
        onChange={(e) => {
          setHasEditedComments(true);
          setComentarios(e.target.value.slice(0, 500));
        }}
          placeholder="Adicione notas / editada pela transcrição"
          className="min-h-[100px] bg-card border-border resize-none"
        />
      </div>

      {/* Botão submit */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !resultado}
        className="w-full h-14 text-lg font-semibold bg-success hover:bg-success/90 text-success-foreground shadow-lg"
      >
        {isSubmitting ? 'Salvando...' : 'Registrar e Próximo'}
      </Button>
        </>
      )}
    </div>
  );
}
