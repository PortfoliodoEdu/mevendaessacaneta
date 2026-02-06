import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { BottomDock } from "@/components/BottomDock";
import { useLeads } from "@/hooks/useLeads";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";

export default function Atividade() {
  const navigate = useNavigate();
  const { data: leads = [], isLoading } = useLeads();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"por-lead" | "todas">("por-lead");

  const term = q.trim().toLowerCase();

  const byLead = useMemo(() => {
    const rows = leads
      .map((lead) => {
        const last = (lead.interacoes || [])
          .filter((i) => i.data_realizada)
          .sort((a, b) => new Date(b.data_realizada!).getTime() - new Date(a.data_realizada!).getTime())[0];
        return { lead, last };
      })
      .filter((r) => !!r.last);

    const filtered = rows.filter(({ lead, last }) => {
      if (!term) return true;
      return (
        (lead.nome || "").toLowerCase().includes(term) ||
        (lead.whatsapp || "").toLowerCase().includes(term) ||
        (last?.comentarios || "").toLowerCase().includes(term) ||
        (last?.resultado || "").toLowerCase().includes(term)
      );
    });

    return filtered.sort((a, b) => new Date(b.last!.data_realizada!).getTime() - new Date(a.last!.data_realizada!).getTime());
  }, [leads, term]);

  const allInteractions = useMemo(() => {
    const all = leads.flatMap((lead) =>
      (lead.interacoes || [])
        .filter((i) => i.data_realizada)
        .map((i) => ({ lead, interacao: i }))
    );

    const filtered = all.filter(({ lead, interacao }) => {
      if (!term) return true;
      return (
        (lead.nome || "").toLowerCase().includes(term) ||
        (lead.whatsapp || "").toLowerCase().includes(term) ||
        (interacao.comentarios || "").toLowerCase().includes(term) ||
        (interacao.resultado || "").toLowerCase().includes(term)
      );
    });

    return filtered.sort((a, b) => new Date(b.interacao.data_realizada!).getTime() - new Date(a.interacao.data_realizada!).getTime());
  }, [leads, term]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-48">
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-40 px-4 py-3">
        <h1 className="text-xl font-bold text-foreground">Atividade</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Interações mais recentes com comentário e áudio
        </p>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsContent value="por-lead">
            <div className="space-y-3">
              {byLead.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma interação realizada ainda.
                </p>
              ) : (
                byLead.slice(0, 50).map(({ lead, last }) => (
                  <Card key={lead.id} className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between gap-2">
                        <span className="truncate">{lead.nome || lead.whatsapp}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {format(parseISO(last!.data_realizada!), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      </CardTitle>
                      <div className="text-xs text-muted-foreground truncate">{lead.whatsapp}</div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      <div className="text-xs text-muted-foreground">
                        Último resultado: <span className="font-medium text-foreground">{last!.resultado || "—"}</span>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/20 p-3">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Último comentário</div>
                        <p className="text-sm text-foreground whitespace-pre-wrap break-words max-h-24 overflow-hidden">
                          {last!.comentarios || "—"}
                        </p>
                      </div>

                      {last!.audio_url ? (
                        <audio controls src={last!.audio_url} className="w-full" />
                      ) : (
                        <div className="text-xs text-muted-foreground">Sem áudio</div>
                      )}

                      <Button className="w-full h-11" onClick={() => navigate(`/?lead=${lead.id}`)}>
                        Abrir cadastro deste lead
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="todas">
            <div className="space-y-3">
              {allInteractions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma interação realizada ainda.
                </p>
              ) : (
                allInteractions.slice(0, 100).map(({ lead, interacao }) => (
                  <Card key={interacao.id} className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between gap-2">
                        <span className="truncate">{lead.nome || lead.whatsapp}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {format(parseISO(interacao.data_realizada!), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      </CardTitle>
                      <div className="text-xs text-muted-foreground truncate">
                        {lead.whatsapp} • {interacao.tipo} • seq {interacao.numero_sequencia}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      <div className="text-xs text-muted-foreground">
                        Resultado: <span className="font-medium text-foreground">{interacao.resultado || "—"}</span>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/20 p-3">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Comentário</div>
                        <p className="text-sm text-foreground whitespace-pre-wrap break-words max-h-24 overflow-hidden">
                          {interacao.comentarios || "—"}
                        </p>
                      </div>

                      {interacao.audio_url ? (
                        <audio controls src={interacao.audio_url} className="w-full" />
                      ) : (
                        <div className="text-xs text-muted-foreground">Sem áudio</div>
                      )}

                      <Button variant="outline" className="w-full h-11" onClick={() => navigate(`/?lead=${lead.id}`)}>
                        Abrir cadastro deste lead
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Busca + filtro embaixo (mão direita) */}
      <BottomDock>
        <div className="space-y-2">
          {tab !== "todas" && (
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filtrar por nome, WhatsApp, comentário..."
            />
          )}

          <div className="flex items-center gap-2">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1">
              <TabsList className="w-full">
                <TabsTrigger value="por-lead" className="flex-1">Por lead</TabsTrigger>
                <TabsTrigger value="todas" className="flex-1">Todas</TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              type="button"
              variant="outline"
              className="h-10 w-12"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="Ir para o topo"
              title="Topo"
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </BottomDock>

      <BottomNav />
    </div>
  );
}

