import { Phone, MessageSquare, TrendingUp, Clock, UserPlus, Repeat, History, Palette } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { useLeads } from '@/hooks/useLeads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, isToday, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BottomTray } from '@/components/BottomTray';
import { Button } from '@/components/ui/button';
import { PalettePicker, type PaletteId } from '@/components/PalettePicker';

export default function Dashboard() {
  const { data: leads = [], isLoading } = useLeads();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [palette, setPalette] = useState<PaletteId>('p1');

  useEffect(() => {
    const key = 'mevenda.palette';
    const saved = (window.localStorage.getItem(key) as PaletteId | null) || 'p1';
    setPalette(saved);
  }, []);

  const applyPalette = (p: PaletteId) => {
    const key = 'mevenda.palette';
    setPalette(p);
    window.localStorage.setItem(key, p);
    document.documentElement.dataset.palette = p;
  };

  // Métricas
  const allInteracoes = leads.flatMap(l => l.interacoes);
  
  const hoje = new Date();
  const interacoesHoje = allInteracoes.filter(i => 
    i.data_realizada && isToday(parseISO(i.data_realizada))
  );

  const ligacoesHoje = interacoesHoje.filter(i => i.tipo === 'ligacao').length;
  const mensagensHoje = interacoesHoje.filter(i => i.tipo === 'mensagem').length;
  const novosContatosHoje = interacoesHoje.filter(i => i.numero_sequencia === 1).length;
  const followUpsHoje = interacoesHoje.filter(i => i.numero_sequencia > 1).length;
  const nuncaContatados = leads.filter(l => !(l.interacoes || []).some(i => i.data_realizada)).length;

  const taxaEngajamento = allInteracoes.length > 0
    ? Math.round((allInteracoes.filter(i => i.engajou).length / allInteracoes.length) * 100)
    : 0;

  // Próximos contatos
  const proximosContatos = leads
    .flatMap(lead => 
      lead.interacoes
        .filter(i => i.data_prevista && !i.data_realizada)
        .map(i => ({ ...i, lead }))
    )
    .sort((a, b) => new Date(a.data_prevista!).getTime() - new Date(b.data_prevista!).getTime())
    .slice(0, 5);

  const leadsRecentes = leads
    .map((lead) => {
      const last = (lead.interacoes || [])
        .filter((i) => i.data_realizada)
        .sort((a, b) => new Date(b.data_realizada!).getTime() - new Date(a.data_realizada!).getTime())[0];
      return { lead, last };
    })
    .filter((x) => !!x.last)
    .sort((a, b) => new Date(b.last!.data_realizada!).getTime() - new Date(a.last!.data_realizada!).getTime())
    .slice(0, 5);

  // Atividade semanal
  const startWeek = startOfWeek(hoje, { weekStartsOn: 1 });
  const endWeek = endOfWeek(hoje, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: startWeek, end: endWeek });

  const atividadeSemanal = daysOfWeek.map(day => ({
    day: format(day, 'EEE', { locale: ptBR }),
    count: allInteracoes.filter(i => 
      i.data_realizada && format(parseISO(i.data_realizada), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    ).length,
  }));

  const maxAtividade = Math.max(...atividadeSemanal.map(d => d.count), 1);

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
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {format(hoje, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => setPaletteOpen(true)} aria-label="Cores">
            <Palette className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Métricas principais */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{ligacoesHoje}</p>
                  <p className="text-xs text-muted-foreground">Ligações hoje</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{mensagensHoje}</p>
                  <p className="text-xs text-muted-foreground">Mensagens hoje</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-foreground">{taxaEngajamento}%</p>
                  <p className="text-xs text-muted-foreground">Taxa de engajamento</p>
                </div>
                <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-success rounded-full transition-all"
                    style={{ width: `${taxaEngajamento}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{novosContatosHoje}</p>
                  <p className="text-xs text-muted-foreground">Novos hoje</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <Repeat className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{followUpsHoje}</p>
                  <p className="text-xs text-muted-foreground">Follow-ups hoje</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Nunca contatados</div>
                <div className="text-xl font-bold text-foreground">{nuncaContatados}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Atividade semanal */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Atividade semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-24">
              {atividadeSemanal.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className="w-full bg-primary/20 rounded-t transition-all"
                    style={{ 
                      height: `${Math.max((day.count / maxAtividade) * 100, 10)}%`,
                      backgroundColor: day.count > 0 ? 'hsl(var(--primary))' : undefined,
                    }}
                  />
                  <span className="text-xs text-muted-foreground capitalize">{day.day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Próximos contatos */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Próximos contatos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {proximosContatos.length > 0 ? (
              <ul className="space-y-3">
                {proximosContatos.map((interacao) => (
                  <li key={interacao.id} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      {interacao.tipo === 'ligacao' ? (
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {interacao.lead.nome || interacao.lead.whatsapp}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(interacao.data_prevista!), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum contato pendente
              </p>
            )}
          </CardContent>
        </Card>

        {/* Interações recentes (com comentário e áudio) */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground flex items-center justify-between">
              <span className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Interações recentes
              </span>
              <Link to="/atividade" className="text-xs text-primary">
                Ver tudo
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leadsRecentes.length > 0 ? (
              <ul className="space-y-3">
                {leadsRecentes.map(({ lead, last }) => (
                  <li key={lead.id} className="space-y-2">
                    <Link to={`/?lead=${lead.id}`} className="block">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {lead.nome || lead.whatsapp}
                        </p>
                        <p className="text-xs text-muted-foreground flex-shrink-0">
                          {format(parseISO(last!.data_realizada!), "dd/MM HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words max-h-10 overflow-hidden">
                        {last!.comentarios || "—"}
                      </p>
                    </Link>
                    {last!.audio_url ? (
                      <audio controls src={last!.audio_url} className="w-full" />
                    ) : (
                      <p className="text-xs text-muted-foreground">Sem áudio</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma interação recente
              </p>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Bottom navigation */}
      <BottomNav />

      {paletteOpen && (
        <BottomTray heightVh={60}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Cores</h2>
              <Button variant="ghost" onClick={() => setPaletteOpen(false)}>Fechar</Button>
            </div>

            <div className="text-sm text-muted-foreground">
              Escolha uma dupla <span className="font-medium text-foreground">(pastel + neon)</span>.
            </div>

            <PalettePicker value={palette} onChange={applyPalette} />
          </div>
        </BottomTray>
      )}
    </div>
  );
}
