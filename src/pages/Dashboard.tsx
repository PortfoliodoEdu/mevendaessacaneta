import { Phone, MessageSquare, TrendingUp, Clock } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { useLeads } from '@/hooks/useLeads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, isToday, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const { data: leads = [], isLoading } = useLeads();

  // Métricas
  const allInteracoes = leads.flatMap(l => l.interacoes);
  
  const hoje = new Date();
  const interacoesHoje = allInteracoes.filter(i => 
    i.data_realizada && isToday(parseISO(i.data_realizada))
  );

  const ligacoesHoje = interacoesHoje.filter(i => i.tipo === 'ligacao').length;
  const mensagensHoje = interacoesHoje.filter(i => i.tipo === 'mensagem').length;

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
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {format(hoje, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
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
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
