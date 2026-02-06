import { useMemo, useState } from 'react';
import { Search, Phone, ChevronRight, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { BottomNav } from '@/components/BottomNav';
import { BottomDock } from '@/components/BottomDock';
import { useLeads } from '@/hooks/useLeads';
import { addDays, differenceInDays, format, isToday, isTomorrow, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BottomTray } from '@/components/BottomTray';

export default function Leads() {
  const [search, setSearch] = useState('');
  const [filterPreset, setFilterPreset] = useState<'all' | 'today' | 'tomorrow' | 'week' | 'stale' | 'never'>('all');
  const [staleDays, setStaleDays] = useState(7);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data: leads = [], isLoading } = useLeads();

  const now = useMemo(() => new Date(), []);

  const getNextPlanned = (lead: any): Date | null => {
    const next = (lead.interacoes || [])
      .filter((i: any) => i.data_prevista && !i.data_realizada)
      .sort((a: any, b: any) => new Date(a.data_prevista!).getTime() - new Date(b.data_prevista!).getTime())[0];
    return next?.data_prevista ? parseISO(next.data_prevista) : null;
  };

  const getIsOverdue = (lead: any) => {
    const d = getNextPlanned(lead);
    return !!d && d.getTime() < Date.now();
  };

  const filteredLeads = useMemo(() => {
    const term = search.toLowerCase().trim();
    const base = leads.filter((lead) => {
      const matchSearch =
        !term ||
        lead.nome?.toLowerCase().includes(term) ||
        lead.whatsapp.toLowerCase().includes(term);

      if (!matchSearch) return false;

      if (filterPreset === 'all') return true;

      if (filterPreset === 'never') {
        const hasAnyRealizada = (lead.interacoes || []).some((i: any) => i.data_realizada);
        return !hasAnyRealizada;
      }

      if (filterPreset === 'stale') {
        const days = differenceInDays(new Date(), parseISO(lead.updated_at));
        return days >= staleDays;
      }

      const next = getNextPlanned(lead);
      if (!next) return false;

      if (filterPreset === 'today') return isToday(next);
      if (filterPreset === 'tomorrow') return isTomorrow(next);
      if (filterPreset === 'week') {
        return isWithinInterval(next, { start: new Date(), end: addDays(new Date(), 7) });
      }
      return true;
    });

    return base;
  }, [filterPreset, leads, search, staleDays]);

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
    <div className="min-h-screen bg-background pb-48">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-40 px-4 py-3">
        <h1 className="text-xl font-bold text-foreground">Leads</h1>
      </header>

      {/* Main content */}
      <main className="max-w-lg mx-auto">
        {(filterPreset !== 'all' || search) && (
          <div className="px-4 py-2 flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {filteredLeads.length} resultado(s)
              {filterPreset !== 'all' && (
                <span className="ml-2">
                  • filtro: <span className="font-medium text-foreground">{filterPreset}</span>
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setFiltersOpen(true)} className="h-9">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
        )}
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
                        {getIsOverdue(lead) && (
                          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 bg-destructive/10 text-destructive inline-flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Atrasado
                          </span>
                        )}
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

      {/* Search dock (mobile-first): fixa no rodapé e sobe ao focar */}
      <BottomDock>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 px-3"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="h-5 w-5" />
          </Button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nome ou telefone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border h-12"
            />
          </div>
        </div>
      </BottomDock>

      {filtersOpen && (
        <BottomTray heightVh={60}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Filtros</h2>
              <Button variant="ghost" onClick={() => setFiltersOpen(false)}>Fechar</Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'all', label: 'Todos' },
                { key: 'today', label: 'Contatar hoje' },
                { key: 'tomorrow', label: 'Contatar amanhã' },
                { key: 'week', label: 'Contatar na semana' },
                { key: 'never', label: 'Nunca contatado' },
                { key: 'stale', label: 'Sem update (X dias)' },
              ].map((opt: any) => (
                <Button
                  key={opt.key}
                  variant={filterPreset === opt.key ? 'default' : 'secondary'}
                  className="h-12 justify-start"
                  onClick={() => setFilterPreset(opt.key)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>

            {filterPreset === 'stale' && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Sem atualização há pelo menos:</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-12 w-12" onClick={() => setStaleDays((d) => Math.max(1, d - 1))}>-</Button>
                  <div className="flex-1 h-12 rounded-xl border border-border bg-card flex items-center justify-center font-semibold">
                    {staleDays} dia(s)
                  </div>
                  <Button variant="outline" className="h-12 w-12" onClick={() => setStaleDays((d) => Math.min(365, d + 1))}>+</Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={() => {
                  setFilterPreset('all');
                  setStaleDays(7);
                }}
              >
                Limpar
              </Button>
              <Button className="flex-1 h-12" onClick={() => setFiltersOpen(false)}>
                Aplicar
              </Button>
            </div>
          </div>
        </BottomTray>
      )}

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
