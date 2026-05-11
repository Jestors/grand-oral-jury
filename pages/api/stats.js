export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { pwd } = req.query;

  const dashPwd =
    process.env.DASHBOARD_PASSWORD ||
    process.env["TABLEAU DE BORD_MOT_DE_PASSE"] ||
    process.env.TABLEAU_DE_BORD_MOT_DE_PASSE ||
    "JennyGO2025";

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env["URL SUPABASE"] ||
    process.env.URL_SUPABASE;

  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (pwd !== dashPwd) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({
      mode: "demo", total: 0, stmg: 0, general: 0,
      note_moyenne: null, feedbacks_recents: []
    });
  }

  try {
    const base = `${supabaseUrl}/rest/v1/simulations`;
    const headers = {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`,
    };

    const feedRes = await fetch(
      `${base}?select=filiere,question,spe1,spe2,etablissement,ville,note_percue,note_jury,utilite,manque,created_at&order=created_at.desc&limit=50`,
    );
    const feedbacks = await feedRes.json();

    if (!Array.isArray(feedbacks)) {
      return res.status(500).json({ error: "Erreur Supabase", detail: feedbacks });
    }

    const total   = feedbacks.length;
    const stmg    = feedbacks.filter(f => f.filiere === "stmg").length;
    const general = feedbacks.filter(f => f.filiere === "general").length;
    const notes   = feedbacks.filter(f => f.note_jury).map(f => parseFloat(f.note_jury));
    const noteMoyenne = notes.length
      ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1)
      : null;

    return res.status(200).json({
      mode: "live", total, stmg, general,
      note_moyenne: noteMoyenne,
      feedbacks_recents: feedbacks
    });
  } catch (e) {
    console.error("Stats error:", e);
    return res.status(500).json({ error: e.message });
  }
}
