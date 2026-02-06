import { useMemo, useState, useEffect, useRef } from 'react';
import { Search, User, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useLeads, useSearchLeads } from '@/hooks/useLeads';
import type { LeadWithInteracoes } from '@/types/lead';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface LeadSearchProps {
  onSelect: (lead: LeadWithInteracoes | null) => void;
  onNewLead: (whatsapp: string) => void;
  selectedLead: LeadWithInteracoes | null;
  /** Quando usado no rodapé, as sugestões devem abrir para cima. */
  openDirection?: 'up' | 'down';
}

export function LeadSearch({
  onSelect,
  onNewLead,
  selectedLead,
  openDirection = 'down',
}: LeadSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [browseMode, setBrowseMode] = useState<'recent' | 'az'>('recent');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const results = useSearchLeads(searchTerm);
  const { data: allLeads = [] } = useLeads();

  const isPhoneNumber = /^\d+$/.test(searchTerm.replace(/\D/g, ''));
  const cleanDigits = searchTerm.replace(/\D/g, '');

  useEffect(() => {
    if (selectedLead) {
      setSearchTerm('');
      setIsOpen(false);
    }
  }, [selectedLead]);

  // Fecha ao tocar fora / ESC (importante quando o componente está no rodapé)
  useEffect(() => {
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) {
      return `+55 ${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return phone;
  };

  const handleSelect = (lead: LeadWithInteracoes) => {
    onSelect(lead);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    const phone = searchTerm.replace(/\D/g, '');
    if (phone.length >= 10) {
      onNewLead(phone);
      setSearchTerm('');
      setIsOpen(false);
    }
  };

  const browseLeads = useMemo(() => {
    const base = [...allLeads];
    if (browseMode === 'az') {
      base.sort((a, b) => (a.nome || a.whatsapp).localeCompare((b.nome || b.whatsapp), 'pt-BR'));
    } else {
      // useLeads já vem ordenado por updated_at desc (recentes)
    }
    return base.slice(0, 12);
  }, [allLeads, browseMode]);

  const showBrowse = isOpen && searchTerm.trim().length < 2;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          inputMode={isPhoneNumber ? 'numeric' : 'text'}
          placeholder="WhatsApp ou Nome do cliente"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 h-14 text-lg bg-card border-border focus:ring-2 focus:ring-primary/20 touch-manipulation"
        />
      </div>

      {(showBrowse || (isOpen && searchTerm.length >= 2)) && (
        <div
          className={cn(
            "absolute left-0 right-0 bg-card rounded-lg shadow-lg border border-border z-50 overflow-hidden animate-fade-in",
            openDirection === 'down' ? 'top-full mt-2' : 'bottom-full mb-2'
          )}
        >
          {showBrowse ? (
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Buscar sem digitar
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={browseMode === 'recent' ? 'default' : 'secondary'}
                    size="sm"
                    className="h-8"
                    onClick={() => setBrowseMode('recent')}
                  >
                    Recentes
                  </Button>
                  <Button
                    type="button"
                    variant={browseMode === 'az' ? 'default' : 'secondary'}
                    size="sm"
                    className="h-8"
                    onClick={() => setBrowseMode('az')}
                  >
                    A–Z
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Você também pode <span className="font-medium text-foreground">digitar</span> para buscar por nome/WhatsApp.
              </div>

              {/* Mostra "4 itens" de altura e permite rolagem interna quando tiver mais */}
              <ul className="divide-y divide-border rounded-md overflow-hidden border border-border max-h-[248px] overflow-y-auto">
                {browseLeads.map((lead) => (
                  <li key={lead.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(lead)}
                      className="w-full px-3 py-3 flex items-center gap-3 hover:bg-muted transition-colors text-left tap-highlight-none"
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {lead.nome || 'Sem nome'}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {formatPhone(lead.whatsapp)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : results.length > 0 ? (
            <ul className="divide-y divide-border">
              {results.slice(0, 5).map((lead) => (
                <li key={lead.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(lead)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted transition-colors text-left tap-highlight-none"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {lead.nome || 'Sem nome'}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {formatPhone(lead.whatsapp)}
                      </p>
                    </div>
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-full",
                      lead.status === 'novo' && "bg-accent/10 text-accent",
                      lead.status === 'interessado' && "bg-success/10 text-success",
                      lead.status === 'standy_por_falta_de_resposta' && "bg-warning/10 text-warning",
                      lead.status === 'descartado' && "bg-destructive/10 text-destructive",
                    )}>
                      {lead.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : isPhoneNumber && cleanDigits.length >= 10 ? (
            <button
              type="button"
              onClick={handleCreateNew}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-muted transition-colors text-left tap-highlight-none"
            >
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="font-medium text-foreground">Criar novo lead</p>
                <p className="text-sm text-muted-foreground">
                  {formatPhone(searchTerm)}
                </p>
              </div>
            </button>
          ) : (
            <div className="px-4 py-4 text-center text-muted-foreground">
              {isPhoneNumber ? 'Digite pelo menos 10 dígitos' : 'Nenhum resultado encontrado'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
