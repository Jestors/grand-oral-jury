import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { system, messages } = req.body;
  if (!system || !messages) return res.status(400).json({ error: "Missing params" });

  const apiKey =
    process.env.ANTHROPIC_API_KEY ||
    process.env.CLE_API_ANTHROPIC ||
    process.env.CL_API_ANTHROPIC ||
    process.env.MYKEY ||
    Object.values(process.env).find(v => v && v.startsWith("sk-ant-"));

  if (!apiKey) {
    return res.status(500).json({ error: "Clé API manquante" });
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1400,
      system,
      messages,
    });
    res.status(200).json({ text: response.content[0].text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Erreur API — réessayez." });
  }
}
