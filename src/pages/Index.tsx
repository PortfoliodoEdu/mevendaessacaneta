import { useState } from 'react';
import { X } from 'lucide-react';
import { LeadSearch } from '@/components/LeadSearch';
import { LeadSummary } from '@/components/LeadSummary';
import { InteractionForm } from '@/components/InteractionForm';
import { BottomNav } from '@/components/BottomNav';
import { useCreateLead } from '@/hooks/useLeads';
import type { LeadWithInteracoes } from '@/types/lead';
import { toast } from 'sonner';

const Index = () => {
  const [selectedLead, setSelectedLead] = useState<LeadWithInteracoes | null>(null);
  const createLead = useCreateLead();

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
  };

  const handleSuccess = () => {
    setSelectedLead(null);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-40 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Nova Interação</h1>
          {selectedLead && (
            <button
              onClick={handleClear}
              className="p-2 rounded-full hover:bg-muted transition-colors touch-manipulation tap-highlight-none"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Search */}
        <LeadSearch
          onSelect={setSelectedLead}
          onNewLead={handleNewLead}
          selectedLead={selectedLead}
        />

        {/* Lead Summary */}
        {selectedLead && (
          <>
            <LeadSummary lead={selectedLead} />
            <InteractionForm lead={selectedLead} onSuccess={handleSuccess} />
          </>
        )}

        {/* Empty state */}
        {!selectedLead && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">Digite um número ou nome</p>
            <p className="text-sm mt-1">para registrar uma interação</p>
          </div>
        )}
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
};

export default Index;
