import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic({ apiKey: process.env.K });
const fixtures = "#537327 — Mexique (dom.) vs Afrique du Sud (ext.) [Groupe A]\n#537328 — Corée du Sud (dom.) vs Tchéquie (ext.) [Groupe A]";
const t0 = Date.now();
try {
  const r = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    thinking: { type: "adaptive" },
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
    messages: [{ role: "user", content:
      `Coupe du Monde 2026. Matchs à venir à analyser :\n${fixtures}\n\n` +
      `Effectue des recherches web ciblées pour récupérer :\n` +
      `1) les prédictions data d'Opta / The Analyst pour ces équipes et matchs (probabilités de victoire/nul, points attendus « xPTS », % de qualification « QUAL ») ;\n` +
      `2) l'actualité récente : forme, blessures, suspensions, compositions probables, dynamique.\n` +
      `Privilégie les chiffres d'Opta. Rédige une synthèse concise (quelques lignes par équipe, en citant les probabilités trouvées). Ne donne pas encore de score.` }],
  });
  const secs = ((Date.now()-t0)/1000).toFixed(1);
  const txt = r.content.filter(b=>b.type==="text").map(b=>b.text).join("\n");
  const u = r.usage;
  console.log(`OK en ${secs}s | stop=${r.stop_reason} | in=${u.input_tokens} out=${u.output_tokens} websearch=${u.server_tool_use?.web_search_requests ?? "?"}`);
  console.log("\n===== SYNTHÈSE =====\n"+txt);
} catch(e) {
  console.log(`ERREUR après ${((Date.now()-t0)/1000).toFixed(1)}s :`, e.status, e.name, "\n", String(e.message).slice(0,500));
}
