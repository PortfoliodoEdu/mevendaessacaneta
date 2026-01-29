import { useState, useEffect } from 'react';
import { Phone, MessageSquare } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AudioRecorder } from './AudioRecorder';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useCreateInteracao, useUpdateLead, useUploadAudio } from '@/hooks/useLeads';
import type { LeadWithInteracoes, TipoInteracao } from '@/types/lead';
import { RESULTADOS_LIGACAO, RESULTADOS_MENSAGEM } from '@/types/lead';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface InteractionFormProps {
  lead: LeadWithInteracoes;
  onSuccess: () => void;
}

export function InteractionForm({ lead, onSuccess }: InteractionFormProps) {
  // Determina tipo baseado na próxima interação prevista
  const proximaInteracao = lead.interacoes
    .filter(i => i.data_prevista && !i.data_realizada)
    .sort((a, b) => new Date(a.data_prevista!).getTime() - new Date(b.data_prevista!).getTime())[0];

  const [tipo, setTipo] = useState<TipoInteracao>(proximaInteracao?.tipo as TipoInteracao || 'ligacao');
  const [resultado, setResultado] = useState<string>('');
  const [comentarios, setComentarios] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isRecording, duration, transcript, startRecording, stopRecording, resetTranscript } = useAudioRecorder();
  const createInteracao = useCreateInteracao();
  const updateLead = useUpdateLead();
  const uploadAudio = useUploadAudio();

  // Atualiza comentários com transcrição
  useEffect(() => {
    if (transcript) {
      setComentarios(transcript);
    }
  }, [transcript]);

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
      // Upload será feito no submit
    }
  };

  const handleSubmit = async () => {
    if (!resultado) {
      toast.error('Selecione um resultado');
      return;
    }

    setIsSubmitting(true);

    try {
      let audioUrl = null;

      // Se estava gravando, para e faz upload
      if (isRecording) {
        const audioBlob = await stopRecording();
        if (audioBlob) {
          audioUrl = await uploadAudio.mutateAsync(audioBlob);
        }
      }

      // Calcula o número da sequência
      const sequencia = lead.interacoes.filter(i => i.tipo === tipo).length + 1;

      // Cria a interação
      await createInteracao.mutateAsync({
        lead_id: lead.id,
        tipo,
        numero_sequencia: sequencia,
        data_realizada: new Date().toISOString(),
        resultado,
        engajou,
        comentarios: comentarios || null,
        audio_url: audioUrl,
      });

      // Atualiza o status do lead
      const newStatus = getNewStatus();
      await updateLead.mutateAsync({
        id: lead.id,
        status: newStatus,
      });

      toast.success('Interação registrada!');
      resetTranscript();
      onSuccess();
    } catch (error) {
      console.error('Erro ao registrar interação:', error);
      toast.error('Erro ao registrar interação');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-slide-up">
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
          onStartRecording={startRecording}
          onStopRecording={handleStopRecording}
        />
      </div>

      {/* Comentários */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">Comentários</label>
          <span className="text-xs text-muted-foreground">{comentarios.length}/500</span>
        </div>
        <Textarea
          value={comentarios}
          onChange={(e) => setComentarios(e.target.value.slice(0, 500))}
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
    </div>
  );
}
