import Anthropic from "@anthropic-ai/sdk";

const apiKey =
  process.env.ANTHROPIC_API_KEY ||
  process.env.CLE_API_ANTHROPIC ||
  process.env["CLÉ_API_ANTHROPIC"] ||
  process.env.CL_API_ANTHROPIC;

const client = new Anthropic({ apiKey });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { system, messages } = req.body;
  if (!system || !messages) return res.status(400).json({ error: "Missing params" });
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1400,
      system,
      messages,
    });
    res.status(200).json({ text: response.content[0].text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur API — réessayez." });
  }
}
