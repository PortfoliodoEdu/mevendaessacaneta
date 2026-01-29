export interface Lead {
  id: string;
  status: string;
  nome: string | null;
  whatsapp: string;
  fonte: string | null;
  lead_tipo: string;
  created_at: string;
  updated_at: string;
}

export interface Interacao {
  id: string;
  lead_id: string;
  tipo: 'ligacao' | 'mensagem';
  numero_sequencia: number;
  data_prevista: string | null;
  data_realizada: string | null;
  resultado: string | null;
  engajou: boolean;
  comentarios: string | null;
  audio_url: string | null;
  created_at: string;
}

export interface LeadWithInteracoes extends Lead {
  interacoes: Interacao[];
}

export type TipoInteracao = 'ligacao' | 'mensagem';

export type ResultadoLigacao = 
  | 'nao_atendeu' 
  | 'atendeu_interessado' 
  | 'atendeu_nao_interessado' 
  | 'numero_invalido' 
  | 'agendou_reuniao';

export type ResultadoMensagem = 
  | 'nao_respondeu' 
  | 'respondeu_interessado' 
  | 'respondeu_nao_interessado' 
  | 'agendou_reuniao';

export const RESULTADOS_LIGACAO: { value: ResultadoLigacao; label: string; emoji: string }[] = [
  { value: 'nao_atendeu', label: 'Não atendeu', emoji: '📵' },
  { value: 'atendeu_interessado', label: 'Atendeu - Interessado', emoji: '✅' },
  { value: 'atendeu_nao_interessado', label: 'Atendeu - Não interessado', emoji: '❌' },
  { value: 'numero_invalido', label: 'Número inválido', emoji: '⚠️' },
  { value: 'agendou_reuniao', label: 'Agendou reunião', emoji: '📅' },
];

export const RESULTADOS_MENSAGEM: { value: ResultadoMensagem; label: string; emoji: string }[] = [
  { value: 'nao_respondeu', label: 'Não respondeu', emoji: '📵' },
  { value: 'respondeu_interessado', label: 'Respondeu - Interessado', emoji: '✅' },
  { value: 'respondeu_nao_interessado', label: 'Respondeu - Não interessado', emoji: '❌' },
  { value: 'agendou_reuniao', label: 'Agendou reunião', emoji: '📅' },
];

export const STATUS_OPTIONS = [
  { value: 'novo', label: 'Novo', color: 'accent' },
  { value: 'standy_por_falta_de_resposta', label: 'Standby - Sem resposta', color: 'warning' },
  { value: 'atendido', label: 'Atendido', color: 'success' },
  { value: 'interessado', label: 'Interessado', color: 'success' },
  { value: 'descartado', label: 'Descartado', color: 'destructive' },
  { value: 'reuniao_agendada', label: 'Reunião agendada', color: 'primary' },
];
