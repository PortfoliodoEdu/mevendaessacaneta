type GeminiResultOption = { value: string; label: string; emoji?: string };

export type GeminiInterpretation = {
  resultado_sugerido: string | null;
  resumo: string;
  proximo_passo: string | null;
  confianca: "baixa" | "media" | "alta";
};

function getGeminiApiKey() {
  const key = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!key) {
    throw new Error(
      "VITE_GEMINI_API_KEY não configurada. Crie um .env.local com VITE_GEMINI_API_KEY=... e reinicie o dev server."
    );
  }
  return key;
}

function getGeminiModel() {
  return (import.meta.env.VITE_GEMINI_MODEL as string | undefined) ?? "gemini-1.5-flash";
}

function tryParseJson(text: string): any {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

export async function interpretInteractionTranscript(args: {
  transcript: string;
  tipo: "ligacao" | "mensagem";
  resultadosDisponiveis: GeminiResultOption[];
}): Promise<GeminiInterpretation> {
  const key = getGeminiApiKey();
  const model = getGeminiModel();

  const { transcript, tipo, resultadosDisponiveis } = args;
  const resultsList = resultadosDisponiveis
    .map((r) => `- value: ${r.value} | label: ${r.label}`)
    .join("\n");

  const prompt = `
Você é um assistente de vendas (Brasil, PT-BR). Dada a transcrição de uma interação com cliente, você deve:
1) sugerir o "resultado_sugerido" escolhendo EXATAMENTE um dos values disponíveis (ou null se não der)
2) gerar um resumo curto e objetivo do que aconteceu
3) sugerir um próximo passo prático
4) indicar confianca: baixa | media | alta

Tipo de interação: ${tipo}

Resultados disponíveis (value obrigatório):
${resultsList}

Transcrição:
${transcript}

Responda SOMENTE em JSON válido, sem markdown, com este formato:
{
  "resultado_sugerido": "um_value_ou_null",
  "resumo": "string",
  "proximo_passo": "string_ou_null",
  "confianca": "baixa|media|alta"
}
`.trim();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(key)}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 512,
      },
    }),
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => "");
    throw new Error(`Gemini erro (${resp.status}): ${msg || resp.statusText}`);
  }

  const data = await resp.json();
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n") ??
    undefined;

  if (!text) {
    throw new Error("Gemini não retornou texto.");
  }

  let parsed: any;
  try {
    parsed = tryParseJson(text);
  } catch {
    // tenta achar o primeiro {...} no texto
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Não consegui ler o JSON retornado pela IA.");
    parsed = tryParseJson(match[0]);
  }

  const allowed = new Set(resultadosDisponiveis.map((r) => r.value));
  const suggested =
    typeof parsed.resultado_sugerido === "string" && allowed.has(parsed.resultado_sugerido)
      ? parsed.resultado_sugerido
      : null;

  const confianca: GeminiInterpretation["confianca"] =
    parsed.confianca === "alta" || parsed.confianca === "media" || parsed.confianca === "baixa"
      ? parsed.confianca
      : "media";

  return {
    resultado_sugerido: suggested,
    resumo: typeof parsed.resumo === "string" ? parsed.resumo : "",
    proximo_passo: typeof parsed.proximo_passo === "string" ? parsed.proximo_passo : null,
    confianca,
  };
}

