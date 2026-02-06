import { useEffect, useState } from 'react';
import { LeadSearch } from '@/components/LeadSearch';
import { LeadSummary } from '@/components/LeadSummary';
import { InteractionForm } from '@/components/InteractionForm';
import { BottomNav } from '@/components/BottomNav';
import { BottomDock } from '@/components/BottomDock';
import { BottomTray } from '@/components/BottomTray';
import { useCreateLead, useLeads } from '@/hooks/useLeads';
import { useIsMobile } from '@/hooks/use-mobile';
import type { LeadWithInteracoes } from '@/types/lead';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

const Index = () => {
  const [selectedLead, setSelectedLead] = useState<LeadWithInteracoes | null>(null);
  const createLead = useCreateLead();
  const isMobile = useIsMobile();
  const { data: leads = [] } = useLeads();
  const [searchParams, setSearchParams] = useSearchParams();

  // Se vier de /leads ou /planilha com ?lead=, seleciona automaticamente.
  useEffect(() => {
    const leadId = searchParams.get('lead');
    if (!leadId) return;
    if (selectedLead?.id === leadId) return;
    const found = leads.find((l) => l.id === leadId);
    if (found) {
      setSelectedLead(found);
    }
  }, [leads, searchParams, selectedLead?.id]);

  const handleNewLead = async (whatsapp: string) => {
    try {
      const lead = await createLead.mutateAsync({
        whatsapp,
        status: 'novo',
        lead_tipo: 'novo',
      });
      
      // Simula lead com interações vazias
      setSelectedLead({
        ...lead,
        interacoes: [],
      } as LeadWithInteracoes);
      
      toast.success('Novo lead criado!');
    } catch (error) {
      console.error('Erro ao criar lead:', error);
      toast.error('Erro ao criar lead');
    }
  };

  const handleClear = () => {
    setSelectedLead(null);
    if (searchParams.get('lead')) {
      searchParams.delete('lead');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const handleSuccess = () => {
    setSelectedLead(null);
    if (searchParams.get('lead')) {
      searchParams.delete('lead');
      setSearchParams(searchParams, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-48">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-40 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Nova Interação</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Empty state */}
        {!selectedLead && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">Digite um número ou nome</p>
            <p className="text-sm mt-1">para registrar uma interação</p>
          </div>
        )}

        {/* Desktop fallback (mantém a UX antiga) */}
        {selectedLead && !isMobile && (
          <div className="space-y-4">
            <LeadSummary lead={selectedLead} />
            <InteractionForm lead={selectedLead} onSuccess={handleSuccess} />
          </div>
        )}
      </main>

      {/* Mobile-first */}
      {!selectedLead ? (
        <BottomDock>
          <LeadSearch
            onSelect={setSelectedLead}
            onNewLead={handleNewLead}
            selectedLead={selectedLead}
            openDirection="up"
          />
        </BottomDock>
      ) : (
        <div className={isMobile ? "block" : "hidden"}>
          <BottomTray heightVh={60}>
            {/* Conteúdo em cards com swipe */}
            <InteractionForm lead={selectedLead} onSuccess={handleSuccess} layout="carousel" onClose={handleClear} />
          </BottomTray>
        </div>
      )}

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
};

export default Index;
