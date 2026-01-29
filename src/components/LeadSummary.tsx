import { Phone, MessageSquare, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import type { LeadWithInteracoes } from '@/types/lead';
import { format, isToday, isTomorrow, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface LeadSummaryProps {
  lead: LeadWithInteracoes;
}

export function LeadSummary({ lead }: LeadSummaryProps) {
  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) {
      return `+55 ${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return phone;
  };

  // Última interação
  const ultimaLigacao = lead.interacoes
    .filter(i => i.tipo === 'ligacao' && i.data_realizada)
    .sort((a, b) => new Date(b.data_realizada!).getTime() - new Date(a.data_realizada!).getTime())[0];

  const ultimaMensagem = lead.interacoes
    .filter(i => i.tipo === 'mensagem' && i.data_realizada)
    .sort((a, b) => new Date(b.data_realizada!).getTime() - new Date(a.data_realizada!).getTime())[0];

  // Próxima interação prevista
  const proximaInteracao = lead.interacoes
    .filter(i => i.data_prevista && !i.data_realizada)
    .sort((a, b) => new Date(a.data_prevista!).getTime() - new Date(b.data_prevista!).getTime())[0];

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'hoje';
    if (isTomorrow(date)) return 'amanhã';
    const days = differenceInDays(date, new Date());
    if (days > 0 && days <= 7) return `em ${days} dias`;
    return format(date, 'dd/MM', { locale: ptBR });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'novo': return 'bg-accent/10 text-accent';
      case 'interessado': return 'bg-success/10 text-success';
      case 'standy_por_falta_de_resposta': return 'bg-warning/10 text-warning';
      case 'descartado': return 'bg-destructive/10 text-destructive';
      case 'reuniao_agendada': return 'bg-primary/10 text-primary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'novo': return 'Novo';
      case 'interessado': return 'Interessado';
      case 'standy_por_falta_de_resposta': return 'Standby - Sem resposta';
      case 'descartado': return 'Descartado';
      case 'reuniao_agendada': return 'Reunião agendada';
      case 'atendido': return 'Atendido';
      default: return status;
    }
  };

  // Último engajamento
  const ultimoEngajamento = lead.interacoes.find(i => i.engajou);

  return (
    <div className="bg-card rounded-xl p-4 border border-border space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-foreground text-lg">
            {lead.nome || 'Lead sem nome'}
          </h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            {formatPhone(lead.whatsapp)}
          </p>
        </div>
        <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", getStatusColor(lead.status))}>
          {getStatusLabel(lead.status)}
        </span>
      </div>

      {/* Última interação */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-4 w-4" />
          <span>
            Última ligação: {ultimaLigacao 
              ? format(parseISO(ultimaLigacao.data_realizada!), 'dd/MM', { locale: ptBR })
              : '—'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MessageSquare className="h-4 w-4" />
          <span>
            Última msg: {ultimaMensagem 
              ? format(parseISO(ultimaMensagem.data_realizada!), 'dd/MM', { locale: ptBR })
              : '—'}
          </span>
        </div>
      </div>

      {/* Próxima interação */}
      {proximaInteracao && (
        <div className="flex items-center gap-2 text-sm bg-primary/5 rounded-lg px-3 py-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-foreground">
            Próximo contato:{' '}
            <span className="font-medium text-primary">
              {proximaInteracao.tipo === 'ligacao' ? 'Ligação' : 'Mensagem'} ({formatDate(proximaInteracao.data_prevista!)})
            </span>
          </span>
        </div>
      )}

      {/* Engajamento */}
      <div className="flex items-center gap-2 text-sm">
        {ultimoEngajamento ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-success font-medium">Engajou</span>
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Ainda não engajou</span>
          </>
        )}
      </div>
    </div>
  );
}
