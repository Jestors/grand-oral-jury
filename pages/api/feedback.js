// pages/api/feedback.js
// Enregistre chaque simulation + feedback dans Supabase (gratuit)
// Variables d'environnement nécessaires :
//   SUPABASE_URL=https://xxxx.supabase.co
//   SUPABASE_ANON_KEY=eyJ...

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { filiere, question, spe1, spe2, note_percue, utilite, manque, note_jury } = req.body;

  // Si pas de Supabase configuré, on log juste et on répond OK
  const supabaseUrl = process.env.SUPABASE_URL || process.env["URL SUPABASE"] || process.env.URL_SUPABASE;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.log("Feedback reçu (Supabase non configuré):", req.body);
    return res.status(200).json({ ok: true, mode: "log_only" });
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/simulations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": process.env.SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${stats.js}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        filiere,
        question,
        spe1: spe1 || null,
        spe2: spe2 || null,
        note_percue: note_percue || null,
        utilite: utilite || null,
        manque: manque || null,
        note_jury: note_jury || null,
        created_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Supabase error:", err);
      return res.status(500).json({ error: "DB error" });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Feedback error:", e);
    return res.status(500).json({ error: e.message });
  }
}
