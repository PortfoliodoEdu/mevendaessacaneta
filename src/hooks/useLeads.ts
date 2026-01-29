import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Lead, Interacao, LeadWithInteracoes } from '@/types/lead';

export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async (): Promise<LeadWithInteracoes[]> => {
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .order('updated_at', { ascending: false });

      if (leadsError) throw leadsError;

      const { data: interacoes, error: interacoesError } = await supabase
        .from('interacoes')
        .select('*')
        .order('numero_sequencia', { ascending: true });

      if (interacoesError) throw interacoesError;

      return (leads || []).map(lead => ({
        ...lead,
        interacoes: (interacoes || []).filter(i => i.lead_id === lead.id) as Interacao[],
      }));
    },
  });
}

export function useSearchLeads(searchTerm: string) {
  const { data: leads } = useLeads();

  if (!searchTerm || searchTerm.length < 2) return [];

  const term = searchTerm.toLowerCase().replace(/\D/g, '');
  const termText = searchTerm.toLowerCase();

  return (leads || []).filter(lead => {
    const phoneMatch = lead.whatsapp.replace(/\D/g, '').includes(term);
    const nameMatch = lead.nome?.toLowerCase().includes(termText);
    return phoneMatch || nameMatch;
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { whatsapp: string; status?: string; nome?: string; fonte?: string; lead_tipo?: string }) => {
      const { data: lead, error } = await supabase
        .from('leads')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Lead> & { id: string }) => {
      const { data: lead, error } = await supabase
        .from('leads')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useCreateInteracao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      lead_id: string;
      tipo: string;
      numero_sequencia?: number;
      data_prevista?: string | null;
      data_realizada?: string | null;
      resultado?: string | null;
      engajou?: boolean;
      comentarios?: string | null;
      audio_url?: string | null;
    }) => {
      const { data: interacao, error } = await supabase
        .from('interacoes')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return interacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useUploadAudio() {
  return useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const fileName = `audio_${Date.now()}.webm`;
      
      const { data, error } = await supabase.storage
        .from('audios')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('audios')
        .getPublicUrl(data.path);

      return publicUrl;
    },
  });
}
