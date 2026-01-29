import { useState } from 'react';
import { Search, Phone, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { BottomNav } from '@/components/BottomNav';
import { useLeads } from '@/hooks/useLeads';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function Leads() {
  const [search, setSearch] = useState('');
  const { data: leads = [], isLoading } = useLeads();

  const filteredLeads = leads.filter(lead => {
    const term = search.toLowerCase();
    return (
      lead.nome?.toLowerCase().includes(term) ||
      lead.whatsapp.includes(term)
    );
  });

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) {
      return `+55 ${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return phone;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'novo': return 'bg-accent/10 text-accent';
      case 'interessado': return 'bg-success/10 text-success';
      case 'standy_por_falta_de_resposta': return 'bg-warning/10 text-warning';
      case 'descartado': return 'bg-destructive/10 text-destructive';
      case 'reuniao_agendada': return 'bg-primary/10 text-primary';
      case 'atendido': return 'bg-success/10 text-success';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'novo': return 'Novo';
      case 'interessado': return 'Interessado';
      case 'standy_por_falta_de_resposta': return 'Standby';
      case 'descartado': return 'Descartado';
      case 'reuniao_agendada': return 'Reunião';
      case 'atendido': return 'Atendido';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-40 px-4 py-3">
        <h1 className="text-xl font-bold text-foreground mb-3">Leads</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nome ou telefone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-lg mx-auto">
        {filteredLeads.length > 0 ? (
          <ul className="divide-y divide-border">
            {filteredLeads.map((lead) => {
              const ultimaInteracao = lead.interacoes
                .filter(i => i.data_realizada)
                .sort((a, b) => new Date(b.data_realizada!).getTime() - new Date(a.data_realizada!).getTime())[0];

              return (
                <li key={lead.id}>
                  <Link
                    to={`/?lead=${lead.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">
                          {lead.nome || 'Sem nome'}
                        </p>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full flex-shrink-0",
                          getStatusColor(lead.status)
                        )}>
                          {getStatusLabel(lead.status)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatPhone(lead.whatsapp)}
                      </p>
                      {ultimaInteracao && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Último contato: {format(parseISO(ultimaInteracao.data_realizada!), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">Nenhum lead encontrado</p>
            {search && (
              <p className="text-sm mt-1">Tente uma busca diferente</p>
            )}
          </div>
        )}
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
