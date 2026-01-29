-- Tabela principal de leads/clientes
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT DEFAULT 'novo',
  nome TEXT,
  whatsapp TEXT NOT NULL,
  fonte TEXT,
  lead_tipo TEXT DEFAULT 'novo', -- 'novo' ou 'follow up'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de interações (ligações e mensagens)
CREATE TABLE public.interacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'ligacao' ou 'mensagem'
  numero_sequencia INTEGER NOT NULL DEFAULT 1, -- 1º, 2º, 3º...
  data_prevista DATE,
  data_realizada TIMESTAMP WITH TIME ZONE,
  resultado TEXT, -- 'nao_atendeu', 'atendeu_interessado', etc
  engajou BOOLEAN DEFAULT false,
  comentarios TEXT,
  audio_url TEXT, -- URL do arquivo de áudio gravado
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para busca rápida
CREATE INDEX idx_leads_whatsapp ON public.leads(whatsapp);
CREATE INDEX idx_leads_nome ON public.leads(nome);
CREATE INDEX idx_interacoes_lead_id ON public.interacoes(lead_id);
CREATE INDEX idx_interacoes_data_prevista ON public.interacoes(data_prevista);

-- Trigger para atualizar updated_at nos leads
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS - Permitir acesso público (sem autenticação para simplicidade)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interacoes ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (aplicação pessoal, sem auth)
CREATE POLICY "Leads são públicos" ON public.leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Interações são públicas" ON public.interacoes FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket para áudios
INSERT INTO storage.buckets (id, name, public) VALUES ('audios', 'audios', true);

CREATE POLICY "Áudios são públicos para leitura"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audios');

CREATE POLICY "Qualquer um pode fazer upload de áudio"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'audios');

CREATE POLICY "Qualquer um pode deletar áudio"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'audios');