import { useState, useEffect, useRef } from 'react';
import { Search, User, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSearchLeads } from '@/hooks/useLeads';
import type { LeadWithInteracoes } from '@/types/lead';
import { cn } from '@/lib/utils';

interface LeadSearchProps {
  onSelect: (lead: LeadWithInteracoes | null) => void;
  onNewLead: (whatsapp: string) => void;
  selectedLead: LeadWithInteracoes | null;
}

export function LeadSearch({ onSelect, onNewLead, selectedLead }: LeadSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useSearchLeads(searchTerm);

  const isPhoneNumber = /^\d+$/.test(searchTerm.replace(/\D/g, ''));

  useEffect(() => {
    if (selectedLead) {
      setSearchTerm('');
      setIsOpen(false);
    }
  }, [selectedLead]);

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

  return (
    <div className="relative">
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

      {isOpen && searchTerm.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-lg shadow-lg border border-border z-50 overflow-hidden animate-fade-in">
          {results.length > 0 ? (
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
          ) : isPhoneNumber && searchTerm.replace(/\D/g, '').length >= 10 ? (
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
