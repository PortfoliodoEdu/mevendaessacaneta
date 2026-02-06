import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { useLeads } from "@/hooks/useLeads";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Planilha() {
  const navigate = useNavigate();
  const { data: leads = [], isLoading } = useLeads();
  const [q, setQ] = useState("");

  const normalizedQ = q.trim().toLowerCase();

  const rowsLeads = useMemo(() => {
    const filtered = leads.filter((l) => {
      if (!normalizedQ) return true;
      return (
        (l.nome || "").toLowerCase().includes(normalizedQ) ||
        (l.whatsapp || "").toLowerCase().includes(normalizedQ) ||
        (l.status || "").toLowerCase().includes(normalizedQ)
      );
    });

    return filtered.map((l) => {
      const ultimaRealizada = (l.interacoes || [])
        .filter((i) => i.data_realizada)
        .sort((a, b) => new Date(b.data_realizada!).getTime() - new Date(a.data_realizada!).getTime())[0];
      const proximaPrevista = (l.interacoes || [])
        .filter((i) => i.data_prevista && !i.data_realizada)
        .sort((a, b) => new Date(a.data_prevista!).getTime() - new Date(b.data_prevista!).getTime())[0];

      return {
        lead: l,
        ultimaRealizada,
        proximaPrevista,
      };
    });
  }, [leads, normalizedQ]);

  const rowsInteracoes = useMemo(() => {
    const all = leads.flatMap((l) =>
      (l.interacoes || []).map((i) => ({
        lead: l,
        interacao: i,
      }))
    );
    const filtered = all.filter(({ lead, interacao }) => {
      if (!normalizedQ) return true;
      return (
        (lead.nome || "").toLowerCase().includes(normalizedQ) ||
        (lead.whatsapp || "").toLowerCase().includes(normalizedQ) ||
        (interacao.tipo || "").toLowerCase().includes(normalizedQ) ||
        (interacao.resultado || "").toLowerCase().includes(normalizedQ) ||
        (interacao.comentarios || "").toLowerCase().includes(normalizedQ)
      );
    });
    return filtered.sort((a, b) => {
      const ad = a.interacao.data_realizada || a.interacao.data_prevista || a.interacao.created_at;
      const bd = b.interacao.data_realizada || b.interacao.data_prevista || b.interacao.created_at;
      return new Date(bd).getTime() - new Date(ad).getTime();
    });
  }, [leads, normalizedQ]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-40 px-4 py-3">
        <h1 className="text-xl font-bold text-foreground">Planilha</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Visualização tabular do banco (Leads + Interações)
        </p>
        <div className="mt-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por nome, WhatsApp, status..." />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4">
        <Tabs defaultValue="leads">
          <TabsList className="w-full">
            <TabsTrigger value="leads" className="flex-1">Leads</TabsTrigger>
            <TabsTrigger value="interacoes" className="flex-1">Interações</TabsTrigger>
          </TabsList>

          <TabsContent value="leads">
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader className="[&_tr]:bg-muted/30 sticky top-0">
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Atualizado</TableHead>
                    <TableHead>Último contato</TableHead>
                    <TableHead>Próximo contato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rowsLeads.map(({ lead, ultimaRealizada, proximaPrevista }) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/?lead=${lead.id}`)}
                    >
                      <TableCell className="font-medium">{lead.nome || "Sem nome"}</TableCell>
                      <TableCell>{lead.whatsapp}</TableCell>
                      <TableCell>{lead.status}</TableCell>
                      <TableCell>{format(parseISO(lead.updated_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                      <TableCell>
                        {ultimaRealizada?.data_realizada
                          ? format(parseISO(ultimaRealizada.data_realizada), "dd/MM HH:mm", { locale: ptBR })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {proximaPrevista?.data_prevista
                          ? format(parseISO(proximaPrevista.data_prevista), "dd/MM HH:mm", { locale: ptBR })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="interacoes">
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader className="[&_tr]:bg-muted/30 sticky top-0">
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Prevista</TableHead>
                    <TableHead>Realizada</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Engajou</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rowsInteracoes.map(({ lead, interacao }) => (
                    <TableRow key={interacao.id} className="cursor-pointer" onClick={() => navigate(`/?lead=${lead.id}`)}>
                      <TableCell className="font-medium">{lead.nome || "Sem nome"}</TableCell>
                      <TableCell>{lead.whatsapp}</TableCell>
                      <TableCell>{interacao.tipo}</TableCell>
                      <TableCell>
                        {interacao.data_prevista ? format(parseISO(interacao.data_prevista), "dd/MM HH:mm", { locale: ptBR }) : "—"}
                      </TableCell>
                      <TableCell>
                        {interacao.data_realizada ? format(parseISO(interacao.data_realizada), "dd/MM HH:mm", { locale: ptBR }) : "—"}
                      </TableCell>
                      <TableCell>{interacao.resultado || "—"}</TableCell>
                      <TableCell>{interacao.engajou ? "sim" : "não"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}

