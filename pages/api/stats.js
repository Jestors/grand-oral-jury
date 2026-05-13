export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { pwd } = req.query;

  const dashPwd =
    process.env.DASHBOARD_PASSWORD ||
    process.env.TABLEAU_DE_BORD_MOT_DE_PASSE ||
    "JennyGO2025";

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.URL_SUPABASE;

  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (pwd !== dashPwd) {
    return res.status(401).json({ error: "Non autorise" });
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
      "Prefer": "count=exact",
    };

    // 1. Total exact
    const totalRes = await fetch(`${base}?select=id&limit=1`, { headers });
    const contentRange = totalRes.headers.get("content-range");
    const total = contentRange ? parseInt(contentRange.split("/")[1]) : 0;

    // 2. Total STMG exact
    const stmgRes = await fetch(`${base}?select=id&filiere=eq.stmg&limit=1`, { headers });
    const stmgRange = stmgRes.headers.get("content-range");
    const stmg = stmgRange ? parseInt(stmgRange.split("/")[1]) : 0;

    // 3. Total General exact
    const generalRes = await fetch(`${base}?select=id&filiere=eq.general&limit=1`, { headers });
    const generalRange = generalRes.headers.get("content-range");
    const general = generalRange ? parseInt(generalRange.split("/")[1]) : 0;

    // 4. Note moyenne
    const notesRes = await fetch(
      `${base}?select=note_jury&note_jury=not.is.null&limit=500`,
      { headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` } }
    );
    const notesData = await notesRes.json();
    const notes = Array.isArray(notesData)
      ? notesData.map(f => parseFloat(f.note_jury)).filter(n => !isNaN(n))
      : [];
    const noteMoyenne = notes.length
      ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1)
      : null;

    // 5. 20 derniers feedbacks avec toutes les colonnes
    const feedRes = await fetch(
      `${base}?select=filiere,question,spe1,spe2,etablissement,ville,note_percue,note_jury,utilite,manque,created_at&order=created_at.desc&limit=20`,
      { headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` } }
    );
    const feedbacks = await feedRes.json();

    if (!Array.isArray(feedbacks)) {
      return res.status(500).json({ error: "Erreur Supabase", detail: feedbacks });
    }

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
