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
    const headers = {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`,
    };

    // Requête 1 — Compte exact de TOUTES les simulations
    const countRes = await fetch(
      `${supabaseUrl}/rest/v1/simulations?select=id`,
      { headers: { ...headers, "Prefer": "count=exact", "Range": "0-0" } }
    );
    const total = parseInt(countRes.headers.get("Content-Range")?.split("/")[1] || "0");

    // Requête 2 — Compte STMG
    const stmgRes = await fetch(
      `${supabaseUrl}/rest/v1/simulations?filiere=eq.stmg&select=id`,
      { headers: { ...headers, "Prefer": "count=exact", "Range": "0-0" } }
    );
    const stmg = parseInt(stmgRes.headers.get("Content-Range")?.split("/")[1] || "0");

    // Requête 3 — Compte Série Générale
    const genRes = await fetch(
      `${supabaseUrl}/rest/v1/simulations?filiere=eq.general&select=id`,
      { headers: { ...headers, "Prefer": "count=exact", "Range": "0-0" } }
    );
    const general = parseInt(genRes.headers.get("Content-Range")?.split("/")[1] || "0");

    // Requête 4 — 20 derniers feedbacks
    const feedRes = await fetch(
      `${supabaseUrl}/rest/v1/simulations?select=filiere,question,note_percue,note_jury,utilite,manque,created_at&order=created_at.desc&limit=20`,
      { headers }
    );
    const feedbacks = await feedRes.json();

    // Requête 5 — Note moyenne sur toutes les simulations
    const notesRes = await fetch(
      `${supabaseUrl}/rest/v1/simulations?select=note_jury&note_jury=not.is.null`,
      { headers }
    );
    const notes = await notesRes.json();
    const noteMoyenne = Array.isArray(notes) && notes.length
      ? (notes.reduce((a, b) => a + parseFloat(b.note_jury || 0), 0) / notes.length).toFixed(1)
      : null;

    return res.status(200).json({
      mode: "live",
      total,
      stmg,
      general,
      note_moyenne: noteMoyenne,
      feedbacks_recents: Array.isArray(feedbacks) ? feedbacks : [],
    });

  } catch (e) {
    console.error("Stats error:", e);
    return res.status(500).json({ error: e.message });
  }
}
