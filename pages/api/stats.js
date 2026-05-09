// pages/api/stats.js
// Retourne les stats globales depuis Supabase
// Protégé par un mot de passe simple (DASHBOARD_PASSWORD)

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // Protection basique par mot de passe en query param
  const { pwd } = req.query;
  if (pwd !== process.env.DASHBOARD_PASSWORD) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    // Mode démo sans Supabase
    return res.status(200).json({
      mode: "demo",
      total: 0,
      stmg: 0,
      general: 0,
      note_moyenne: null,
      par_jour: [],
      feedbacks_recents: [],
    });
  }

  try {
    const base = `${process.env.SUPABASE_URL}/rest/v1/simulations`;
    const headers = {
      "apikey": process.env.SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${process.env.SUPABASE_ANON_KEY}`,
    };

    // Total simulations
    const [totalRes, stmgRes, genRes, feedRes] = await Promise.all([
      fetch(`${base}?select=count`, { headers: { ...headers, "Prefer":"count=exact", "Range":"0-0" } }),
      fetch(`${base}?filiere=eq.stmg&select=count`, { headers: { ...headers, "Prefer":"count=exact", "Range":"0-0" } }),
      fetch(`${base}?filiere=eq.general&select=count`, { headers: { ...headers, "Prefer":"count=exact", "Range":"0-0" } }),
      fetch(`${base}?select=filiere,question,note_percue,note_jury,utilite,manque,created_at&order=created_at.desc&limit=20`, { headers }),
    ]);

    const getCount = r => parseInt(r.headers.get("Content-Range")?.split("/")[1] || "0");
    const feedbacks = await feedRes.json();

    // Note moyenne
    const notesRes = await fetch(`${base}?select=note_jury&note_jury=not.is.null`, { headers });
    const notes = await notesRes.json();
    const noteMoyenne = notes.length
      ? (notes.reduce((s, n) => s + parseFloat(n.note_jury || 0), 0) / notes.length).toFixed(1)
      : null;

    return res.status(200).json({
      mode: "live",
      total: getCount(totalRes),
      stmg: getCount(stmgRes),
      general: getCount(genRes),
      note_moyenne: noteMoyenne,
      feedbacks_recents: feedbacks,
    });
  } catch (e) {
    console.error("Stats error:", e);
    return res.status(500).json({ error: e.message });
  }
}
