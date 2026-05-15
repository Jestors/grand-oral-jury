import { useState, useRef, useEffect, useCallback } from "react";
import Head from "next/head";

const SPECIALITES = [
  "Mathématiques","Physique-Chimie","SVT","Sciences de l'ingénieur",
  "Histoire-Géographie","SES (Sciences Économiques et Sociales)",
  "Humanités, Littérature et Philosophie","Langues et Cultures de l'Antiquité",
  "Langues, Littératures et Cultures Étrangères","Arts","Éducation Physique",
  "Numérique et Sciences Informatiques","Biologie-Écologie",
  "Sciences Politiques","Droit et Grandes Questions du Monde Contemporain",
];

// ── CONSTANTES CRÉDITS ────────────────────────────────────────────────────
const FREE_LIMIT = 2;
const PAID_CREDITS = 20;

// ── MODAL EMAIL ───────────────────────────────────────────────────────────
function EmailModal({ onConfirmed }) {
  const [email, setEmail]     = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const val = email.trim().toLowerCase();
    if (!val || !val.includes("@") || !val.includes(".")) {
      setError("Adresse email invalide.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res  = await fetch("/api/check-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: val }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      localStorage.setItem("go_email", val);
      onConfirmed({ email: val, ...data });
    } catch (e) {
      setError("Erreur serveur — réessayez.");
    }
    setLoading(false);
  }

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,.72)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999,
    }}>
      <div style={{
        background:"#fff", borderRadius:20, padding:"36px 28px",
        maxWidth:420, width:"90%", textAlign:"center",
        boxShadow:"0 24px 64px rgba(0,0,0,.3)",
      }}>
        <div style={{ fontSize:38, marginBottom:12 }}>🎓</div>
        <h2 style={{ fontSize:20, fontWeight:700, color:"#1C1A2E", marginBottom:8 }}>
          Bienvenue sur le simulateur<br/>Grand Oral
        </h2>
        <p style={{ fontSize:13, color:"#666", marginBottom:24, lineHeight:1.7 }}>
          Entrez votre email pour accéder à vos <strong>2 simulations gratuites</strong>
          <br/>et retrouver votre accès sur tous vos appareils.
        </p>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="prenom.nom@lycee.fr"
          autoComplete="email"
          style={{
            width:"100%", padding:"11px 14px", fontSize:14,
            border:`2px solid ${error ? "#DC2626" : "#E8E7F0"}`,
            borderRadius:10, outline:"none", boxSizing:"border-box",
            marginBottom:8, fontFamily:"inherit",
            transition:"border-color .2s",
          }}
        />
        {error && <p style={{ color:"#DC2626", fontSize:12, marginBottom:8 }}>{error}</p>}
        <button
          onClick={submit}
          disabled={loading}
          style={{
            width:"100%", padding:"13px", background: loading ? "#9CA3AF" : "#6558D3",
            color:"#fff", border:"none", borderRadius:10, fontSize:15,
            fontWeight:600, cursor: loading ? "not-allowed" : "pointer",
            marginTop:4, transition:"background .2s",
          }}
        >
          {loading ? "Vérification…" : "Commencer →"}
        </button>
        <p style={{ fontSize:11, color:"#bbb", marginTop:14, lineHeight:1.6 }}>
          Pas de spam. Email utilisé uniquement pour gérer vos simulations.<br/>
          Conforme RGPD — voir mentions légales.
        </p>
      </div>
    </div>
  );
}

// ── HOOK CREDITS (serveur) ────────────────────────────────────────────────
function useCredits(userEmail) {
  // simCount & isPaid viennent du serveur via check-user, on les stocke localement
  // comme cache d'affichage. La vraie limite est vérifiée dans use-simulation côté serveur.
  const [simCount,    setSimCount]    = useState(0);
  const [isPaid,      setIsPaid]      = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Hydratation depuis les données renvoyées par check-user
  function hydrate({ simulations_used, is_paid }) {
    setSimCount(simulations_used ?? 0);
    setIsPaid(is_paid ?? false);
    setInitialized(true);
  }

  const totalRemaining = isPaid ? PAID_CREDITS : Math.max(0, FREE_LIMIT - simCount);
  const canSimulate    = isPaid || simCount < FREE_LIMIT;

  // Appel use-simulation avant de lancer : retourne true si autorisé
  async function useOne() {
    if (!userEmail) return false;
    try {
      const res  = await fetch("/api/use-simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await res.json();
      if (res.status === 403 || data.limit_reached) return false;
      if (res.ok) {
        setSimCount(data.simulations_used);
        setIsPaid(data.is_paid);
        return true;
      }
      return false;
    } catch { return false; }
  }

  function markPaid() {
    setIsPaid(true);
    setSimCount(0);
  }

  return { simCount, isPaid, totalRemaining, canSimulate, useOne, hydrate, initialized, markPaid };
}

// ── PAYWALL ───────────────────────────────────────────────────────────────
function PaymentWall({ onBack, email }) {
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    try {
      const res  = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      alert("Erreur de paiement — réessayez.");
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth:480, margin:"40px auto", padding:"0 20px" }}>
      <div style={{ background:"#1C1A2E", borderRadius:20, padding:"32px 28px", color:"#fff", textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>⚖️</div>
        <h2 style={{ fontSize:22, fontWeight:700, marginBottom:8 }}>
          Tu as utilisé tes 2 simulations gratuites
        </h2>
        <p style={{ fontSize:14, color:"#9A8EF5", marginBottom:24, lineHeight:1.6 }}>
          Continue à t'entraîner sans limite jusqu'au 11 juillet pour être prêt le jour J.
        </p>
        <div style={{ background:"rgba(255,255,255,.06)", borderRadius:14, padding:"20px", marginBottom:24 }}>
          <div style={{ fontSize:36, fontWeight:700, color:"#9A8EF5" }}>4,99 €</div>
          <div style={{ fontSize:13, color:"#888", marginTop:4 }}>paiement unique · accès jusqu'au 11 juillet</div>
          <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:8 }}>
            {["Simulations illimitées","STMG & Série Générale","3 niveaux de difficulté","Note sur 20 + axes d'amélioration","Dictée vocale incluse"].map((f,i) => (
              <div key={i} style={{ fontSize:13, color:"#C4BDFF", display:"flex", alignItems:"center", gap:8, textAlign:"left" }}>
                <span style={{ color:"#6558D3" }}>✓</span> {f}
              </div>
            ))}
          </div>
        </div>
        <button onClick={handlePay} disabled={loading}
          style={{ width:"100%", padding:"14px", background:"#6558D3", border:"none", borderRadius:12, color:"#fff", fontSize:16, fontWeight:600, cursor:loading?"not-allowed":"pointer", marginBottom:12 }}>
          {loading ? "Redirection..." : "Accès illimité pour 4,99 €"}
        </button>
        <button onClick={onBack}
          style={{ background:"none", border:"none", color:"#555", fontSize:13, cursor:"pointer" }}>
          ← Retour
        </button>
      </div>
      <div style={{ textAlign:"center", marginTop:16, fontSize:11, color:"#aaa" }}>
        🔒 Paiement sécurisé par Stripe · Conçu par Jenny ESTORS
      </div>
    </div>
  );
}

const COLORS = {
  stmg:    { primary:"#3D2FA0", light:"#EDE9FF", mid:"#6558D3", dark:"#1C1A2E" },
  general: { primary:"#0B6B54", light:"#E1F5EE", mid:"#1D9E75", dark:"#062E22" },
};

const DIFFICULTY_INSTRUCTIONS = {
  debutant: `NIVEAU DÉBUTANT — L'élève découvre le Grand Oral :
  • Questions courtes, bienveillantes, formulées simplement
  • Q1 : pose une question ouverte sur un point de la présentation (pas une objection frontale)
  • Q2 : demande un exemple simple du quotidien ou de l'actualité
  • Q3 : invite à nuancer plutôt qu'à défendre face à une tension
  • Après chaque réponse : encourage d'abord, puis suggère une piste d'amélioration
  • Ton chaleureux et rassurant — jamais intimidant
  • Note entre 8 et 14/20 selon la qualité`,

  intermediaire: `NIVEAU INTERMÉDIAIRE — L'élève est en cours de préparation :
  • Questions précises mais accessibles
  • Q1 : remet en cause un argument avec bienveillance
  • Q2 : demande un exemple concret absent de la présentation
  • Q3 : pousse sur la limite entre les deux parties
  • Après chaque réponse : identifie ce qui est solide et ce qui peut progresser
  • Ton professionnel et encourageant
  • Note entre 10 et 17/20 selon la qualité`,

  expert: `NIVEAU EXPERT — L'élève vise une excellente note :
  • Questions exigeantes, précises, qui challengent vraiment
  • Q1 : objection directe sur l'argument principal de la partie 1
  • Q2 : demande un exemple sectoriel ou académique précis
  • Q3 : pousse sur la contradiction fondamentale entre les deux parties
  • Après chaque réponse : évalue sans complaisance
  • Ton professionnel et exigeant — comme un vrai jury
  • Note entre 12 et 20/20 selon la qualité`,
};

const buildPromptSTMG = (q,t,level="intermediaire") => `Tu es un jury de grand oral STMG composé de deux examinateurs : un professeur d'économie-gestion et un jury naïf, conformément à la grille officielle de l'Académie de Bordeaux.
L'élève présente la question : ${q}
Transcription : ${t}
VERSION COMPACTE — 2 échanges max.

${DIFFICULTY_INSTRUCTIONS[level]}

ÉCHANGE 1 — Pose les 3 questions selon le niveau ci-dessus.
[Q1] · [Q2] · [Q3] · Termine par "Prenez le temps de répondre à chacune."

ÉCHANGE 2 — Après les réponses de l'élève, produis le bilan complet en respectant EXACTEMENT ce format :

FORMAT DU BILAN OBLIGATOIRE — conforme à la grille officielle BO n°36 du 28 septembre 2023 (MENE2323117N) :
[BILAN]

## Évaluation de chaque réponse du jury
**Q1 :** [Ce qui est solide] / [Ce qui peut progresser]
**Q2 :** [Ce qui est solide] / [Ce qui peut progresser]
**Q3 :** [Ce qui est solide] / [Ce qui peut progresser]

## Évaluation globale — Grille indicative officielle (BO 2023)
| Critère | Niveau |
|---|---|
| Qualité orale de l'épreuve (voix, regard, posture, vocabulaire) | Très insuffisant / Insuffisant / Satisfaisant / Très satisfaisant |
| Qualité de la prise de parole en continu — Temps 1 (clarté, structure, fluidité) | Très insuffisant / Insuffisant / Satisfaisant / Très satisfaisant |
| Qualité des connaissances (solidité, précision, esprit critique) | Très insuffisant / Insuffisant / Satisfaisant / Très satisfaisant |
| Qualité de l'interaction — Temps 2 (écoute, reformulation, initiative) | Très insuffisant / Insuffisant / Satisfaisant / Très satisfaisant |
| Qualité et construction de l'argumentation (cohérence, conviction, lien savoirs) | Très insuffisant / Insuffisant / Satisfaisant / Très satisfaisant |

## Profil et note indicative sur 20
Détermine le profil selon la grille officielle :
- Profil 1 — Majorité Très satisfaisant → 16 à 20
- Profil 2 — Majorité Satisfaisant → 12 à 16 (uniquement Satisfaisant : autour de 14)
- Profil 3 — Mélange Satisfaisant/Insuffisant → 8 à 12
- Profil 4 — Majorité Insuffisant → 4 à 8
- Profil 5 — Majorité Très insuffisant → 0 à 4

**Présentation initiale — Temps 1 (10 min)** : X/20 — [justification en 1 phrase sur la qualité orale et l'argumentation]
**Échange avec le jury — Temps 2 (10 min)** : X/20 — [justification en 1 phrase sur l'interaction et les connaissances mobilisées]
**Note globale** : X/20 — Profil [numéro] — [une phrase de justification globale]

## 3 axes d'amélioration prioritaires
1. [Axe 1 — concret, actionnable, lié à un critère de la grille]
2. [Axe 2 — concret, actionnable, lié à un critère de la grille]
3. [Axe 3 — concret, actionnable, lié à un critère de la grille]

Source : Grille indicative BO n°36 du 28 septembre 2023 — MENE2323117N

FORMAT BALISES : [Q1] [Q2] [Q3] pour les questions — [BILAN] pour commencer le bilan.`;

const buildPromptGeneral = (q,t,s1,s2,level="intermediaire") => `Tu es un jury de grand oral Terminale Série Générale composé de deux examinateurs : un professeur de ${s1} et un jury naïf, conformément à la grille officielle d'évaluation du Grand Oral — BO n°36 du 28 septembre 2023 (MENE2323117N).
Spécialités : ${s1} × ${s2}. Question : ${q}. Présentation : ${t}
VERSION COMPACTE — 2 échanges max.

${DIFFICULTY_INSTRUCTIONS[level]}

ÉCHANGE 1 — Pose les 3 questions selon le niveau ci-dessus.
[Q1] mobilise les savoirs de ${s1} · [Q2] articulation entre ${s1} et ${s2} · [Q3] tension théorie/réalité · Termine par "Prenez le temps de répondre à chacune."

ÉCHANGE 2 — Après les réponses de l'élève, produis le bilan complet en respectant EXACTEMENT ce format :

FORMAT DU BILAN OBLIGATOIRE — conforme à la grille officielle BO n°36 du 28 septembre 2023 (MENE2323117N) :
[BILAN]

## Évaluation de chaque réponse du jury
**Q1 :** [Ce qui est solide] / [Ce qui peut progresser]
**Q2 :** [Ce qui est solide] / [Ce qui peut progresser]
**Q3 :** [Ce qui est solide] / [Ce qui peut progresser]

## Évaluation globale — Grille indicative officielle (BO 2023)
| Critère | Niveau |
|---|---|
| Qualité orale de l'épreuve (voix, regard, posture, vocabulaire) | Très insuffisant / Insuffisant / Satisfaisant / Très satisfaisant |
| Qualité de la prise de parole en continu — Temps 1 (clarté, structure, fluidité) | Très insuffisant / Insuffisant / Satisfaisant / Très satisfaisant |
| Qualité des connaissances (solidité, précision, esprit critique) | Très insuffisant / Insuffisant / Satisfaisant / Très satisfaisant |
| Qualité de l'interaction — Temps 2 (écoute, reformulation, initiative) | Très insuffisant / Insuffisant / Satisfaisant / Très satisfaisant |
| Qualité et construction de l'argumentation (cohérence, conviction, lien savoirs) | Très insuffisant / Insuffisant / Satisfaisant / Très satisfaisant |

## Profil et note indicative sur 20
Détermine le profil selon la grille officielle :
- Profil 1 — Majorité Très satisfaisant → 16 à 20
- Profil 2 — Majorité Satisfaisant → 12 à 16 (uniquement Satisfaisant : autour de 14)
- Profil 3 — Mélange Satisfaisant/Insuffisant → 8 à 12
- Profil 4 — Majorité Insuffisant → 4 à 8
- Profil 5 — Majorité Très insuffisant → 0 à 4

**Présentation initiale — Temps 1 (10 min)** : X/20 — [justification en 1 phrase sur la qualité orale et l'argumentation]
**Échange avec le jury — Temps 2 (10 min)** : X/20 — [justification en 1 phrase sur l'interaction et les connaissances mobilisées]
**Note globale** : X/20 — Profil [numéro] — [une phrase de justification globale]

## 3 axes d'amélioration prioritaires
1. [Axe 1 — concret, actionnable, lié à un critère de la grille]
2. [Axe 2 — concret, actionnable, lié à un critère de la grille]
3. [Axe 3 — concret, actionnable, lié à un critère de la grille]

Source : Grille indicative BO n°36 du 28 septembre 2023 — MENE2323117N

FORMAT BALISES : [Q1] [Q2] [Q3] pour les questions — [BILAN] pour commencer le bilan.`;

async function callJury(system, messages) {
  const res = await fetch("/api/jury", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ system, messages }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text;
}

// ── HOOK MICRO ────────────────────────────────────────────────────────────
function useMic({ onPartial, onFinal }) {
  const recRef      = useRef(null);
  const finalRef    = useRef("");
  const previousRef = useRef("");
  const [active, setActive] = useState(false);
  const [ok,     setOk]     = useState(false);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setOk(true);
    const r = new SR();
    r.lang = "fr-FR";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = e => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += t + " ";
        else interim = t;
      }
      const combined = (previousRef.current + finalRef.current).trim();
      onPartial(combined, interim);
    };
    r.onend = () => {
      setActive(false);
      const combined = (previousRef.current + finalRef.current).trim();
      previousRef.current = combined ? combined + " " : "";
      finalRef.current = "";
      onFinal(combined);
    };
    r.onerror = () => setActive(false);
    recRef.current = r;
  }, []);

  const toggle = useCallback(() => {
    if (!recRef.current) return;
    if (active) { recRef.current.stop(); }
    else { finalRef.current = ""; setActive(true); recRef.current.start(); }
  }, [active]);

  const reset = useCallback(() => {
    previousRef.current = "";
    finalRef.current = "";
  }, []);

  return { active, ok, toggle, reset };
}

// ── CHAMP TEXTAREA + MICRO ────────────────────────────────────────────────
function FieldWithMic({ label, hint, value, onChange, placeholder, rows=9, color }) {
  const [interim, setInterim] = useState("");
  const textBeforeMic = useRef("");

  const { active, ok, toggle } = useMic({
    onPartial: (final, int) => { onChange(textBeforeMic.current + final); setInterim(int); },
    onFinal: (final) => {
      const newText = (textBeforeMic.current + final).trim();
      textBeforeMic.current = newText ? newText + " " : "";
      onChange(textBeforeMic.current.trim());
      setInterim("");
    },
  });

  const handleToggle = () => {
    if (!active) textBeforeMic.current = value ? value.trim() + " " : "";
    toggle();
  };

  return (
    <div style={{ marginBottom: 20 }}>
      {label && <div style={{ fontSize:10, fontWeight:600, letterSpacing:".1em", textTransform:"uppercase", color:"#888", fontFamily:"monospace", marginBottom:6 }}>{label}</div>}
      {hint  && <div style={{ fontSize:12, color:"#888", marginBottom:8, lineHeight:1.5 }}>{hint}</div>}
      <textarea value={value} onChange={e=>onChange(e.target.value)} rows={rows} placeholder={placeholder}
        style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${value.length>50?color:"#E8E7F0"}`, borderRadius:10, fontSize:13, fontFamily:"inherit", color:"#1C1A2E", resize:"vertical", outline:"none", lineHeight:1.6, transition:"border-color .2s" }}
      />
      {ok && (
        <div style={{ marginTop:8 }}>
          <button onClick={handleToggle} style={{
            display:"flex", alignItems:"center", gap:8,
            padding:"8px 16px", borderRadius:99, border:"none",
            background: active ? "#DC2626" : color,
            color:"#fff", fontSize:13, fontWeight:500, cursor:"pointer",
            boxShadow: active ? "0 0 0 4px rgba(220,38,38,.2)" : "none",
            transition:"all .2s",
          }}>
            <span style={{ fontSize:16 }}>{active ? "⏹" : "🎙️"}</span>
            <span>{active ? "Arrêter la dictée" : "Dicter ma présentation"}</span>
            {active && <span style={{ width:8, height:8, borderRadius:"50%", background:"#fff", animation:"pulse 1s ease infinite" }}/>}
          </button>
          {active && interim && (
            <div style={{ marginTop:6, padding:"7px 12px", background:"#FFF3D6", borderLeft:"3px solid #C47B1A", borderRadius:"0 8px 8px 0", fontSize:12, color:"#7A4A00", fontStyle:"italic" }}>
              🎙️ {interim}
            </div>
          )}
          {!active && value.length > 50 && (
            <div style={{ fontSize:11, color:"#0B6B54", marginTop:5 }}>✅ Dictée enregistrée — vous pouvez compléter ou modifier</div>
          )}
        </div>
      )}
      <div style={{ fontSize:11, color:value.length>=50?"#0B6B54":"#aaa", marginTop:6, textAlign:"right" }}>
        {value.length>=50 ? `✅ ${value.length} caractères` : `${value.length} / 50 minimum`}
      </div>
    </div>
  );
}

// ── PARSING ───────────────────────────────────────────────────────────────
function parseJury(text) {
  const blocks=[], lines=text.split("\n");
  let cur={type:"intro",text:""};
  for (const line of lines) {
    if      (/^\[Q1\]/.test(line))    { if(cur.text.trim()) blocks.push(cur); cur={type:"q1",   text:line.replace(/^\[Q1\]\s*/,"")}; }
    else if (/^\[Q2\]/.test(line))    { if(cur.text.trim()) blocks.push(cur); cur={type:"q2",   text:line.replace(/^\[Q2\]\s*/,"")}; }
    else if (/^\[Q3\]/.test(line))    { if(cur.text.trim()) blocks.push(cur); cur={type:"q3",   text:line.replace(/^\[Q3\]\s*/,"")}; }
    else if (/^\[BILAN\]/.test(line)) { if(cur.text.trim()) blocks.push(cur); cur={type:"bilan",text:line.replace(/^\[BILAN\]\s*/,"")}; }
    else { cur.text+=(cur.text?"\n":"")+line; }
  }
  if(cur.text.trim()) blocks.push(cur);
  if(!blocks.length) blocks.push({type:"intro",text});
  return blocks.filter(b=>b.text.trim());
}

const Q_CFG={
  intro:{label:"⚖️ Jury",                  bg:"#1C1A2E",color:"#EDE9FF"},
  q1:  {label:"⚖️ Question 1 — Objection", bg:"#2A1F7A",color:"#EDE9FF"},
  q2:  {label:"⚖️ Question 2 — Exemple",   bg:"#0B3D6B",color:"#E1F0FF"},
  q3:  {label:"⚖️ Question 3 — Tension",   bg:"#3D1A3A",color:"#F5E1FF"},
  bilan:{label:"📊 Bilan final",            bg:"#0B4A2A",color:"#E1F5EE"},
};

function Dots() {
  return <div style={{display:"flex",gap:5,padding:"8px 4px",alignItems:"center"}}>
    {[0,1,2].map(i=><span key={i} style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:"#6558D3",opacity:.5,animation:"bounce .8s ease infinite",animationDelay:`${i*.15}s`}}/>)}
  </div>;
}

function JuryMsg({text}) {
  const blocks=parseJury(text);
  return <div style={{display:"flex",gap:10,marginBottom:16}}>
    <div style={{width:36,height:36,borderRadius:"50%",background:"#1C1A2E",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0,marginTop:2}}>⚖️</div>
    <div style={{flex:1}}>{blocks.map((b,i)=>{
      const c=Q_CFG[b.type]||Q_CFG.intro;
      return <div key={i} style={{marginBottom:8}}>
        <div style={{fontSize:10,fontWeight:600,color:b.type==="bilan"?"#0B6B54":"#6558D3",letterSpacing:".06em",textTransform:"uppercase",marginBottom:3,fontFamily:"monospace"}}>{c.label}</div>
        <div style={{background:c.bg,color:c.color,padding:"10px 14px",borderRadius:"4px 14px 14px 14px",fontSize:14,lineHeight:1.7,whiteSpace:"pre-wrap",boxShadow:"0 2px 8px rgba(0,0,0,.15)"}}>{b.text}</div>
      </div>;
    })}</div>
  </div>;
}

function EleveMsg({text}) {
  return <div style={{display:"flex",gap:10,marginBottom:16,flexDirection:"row-reverse"}}>
    <div style={{width:36,height:36,borderRadius:"50%",background:"#EDE9FF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0,marginTop:2}}>👤</div>
    <div style={{flex:1}}>
      <div style={{fontSize:10,color:"#888",fontFamily:"monospace",letterSpacing:".06em",textTransform:"uppercase",marginBottom:3,textAlign:"right"}}>Vous</div>
      <div style={{background:"#EDE9FF",color:"#2A1F7A",padding:"10px 14px",borderRadius:"14px 4px 14px 14px",fontSize:14,lineHeight:1.7,whiteSpace:"pre-wrap",marginLeft:"auto"}}>{text}</div>
    </div>
  </div>;
}

function StepBar({step,filiere}) {
  const c=COLORS[filiere];
  const steps=[{l:"Prêt",i:"⚙️"},{l:"Questions",i:"❓"},{l:"Réponse",i:"💬"},{l:"Bilan",i:"📊"}];
  return <div style={{display:"flex",gap:6,marginBottom:20,alignItems:"center",flexWrap:"wrap"}}>
    {steps.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:4}}>
      <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:99,background:i===step?c.primary:i<step?c.light:"#F4F3F8",border:`1px solid ${i===step?c.primary:i<step?c.mid:"#E8E7F0"}`,transition:"all .3s"}}>
        <span style={{fontSize:12}}>{s.i}</span>
        <span style={{fontSize:11,fontWeight:i===step?600:400,color:i===step?"#fff":i<step?c.primary:"#aaa",fontFamily:"monospace"}}>{s.l}</span>
      </div>
      {i<steps.length-1&&<div style={{width:12,height:1,background:i<step?c.mid:"#E8E7F0"}}/>}
    </div>)}
  </div>;
}

// ── LEVEL SELECTOR ────────────────────────────────────────────────────────
function LevelSelector({ level, setLevel, color }) {
  const levels = [
    { id: "debutant",      label: "Débutant",      icon: "🌱", desc: "Questions accessibles, jury encourageant" },
    { id: "intermediaire", label: "Intermédiaire",  icon: "📚", desc: "Questions précises, ton professionnel" },
    { id: "expert",        label: "Expert",         icon: "🏆", desc: "Questions exigeantes, comme le vrai jury" },
  ];
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#888", fontFamily: "monospace", marginBottom: 8 }}>
        Niveau de difficulté
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {levels.map(l => (
          <button key={l.id} onClick={() => setLevel(l.id)}
            style={{
              flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer",
              border: `2px solid ${level === l.id ? color : "#E8E7F0"}`,
              background: level === l.id ? (color === "#3D2FA0" ? "#EDE9FF" : "#E1F5EE") : "#fff",
              transition: "all .2s", textAlign: "center",
            }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{l.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: level === l.id ? color : "#555" }}>{l.label}</div>
            <div style={{ fontSize: 10, color: "#888", lineHeight: 1.3, marginTop: 2 }}>{l.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── SETUP STMG ────────────────────────────────────────────────────────────
function SetupSTMG({onStart,onBack}) {
  const [q,setQ]=useState(""), [t,setT]=useState(""), [level,setLevel]=useState("intermediaire");
  const [etablissement,setEtablissement]=useState(""), [ville,setVille]=useState("");
  const c=COLORS.stmg, can=q.trim().length>10&&t.trim().length>50;
  return <div>
    <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:13,marginBottom:20,display:"flex",alignItems:"center",gap:6}}>← Retour</button>
    <div style={{background:c.light,borderLeft:`3px solid ${c.primary}`,padding:"12px 14px",borderRadius:"0 10px 10px 0",fontSize:13,color:"#2A1F7A",lineHeight:1.6,marginBottom:24}}>
      📊 <strong>Grand Oral STMG</strong> — Professeur d'économie-gestion + jury naïf
    </div>
    <div style={{marginBottom:20}}>
      <div style={{fontSize:10,fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:"#888",fontFamily:"monospace",marginBottom:6}}>Étape 1 — Question de gestion</div>
      <div style={{fontSize:12,color:"#888",marginBottom:8}}>Commence par "En quoi..." — plan dialectique</div>
      <input type="text" value={q} onChange={e=>setQ(e.target.value)} placeholder='En quoi... (votre question de gestion)'
        style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${q.length>10?c.primary:"#E8E7F0"}`,borderRadius:10,fontSize:14,fontFamily:"inherit",color:"#1C1A2E",outline:"none",transition:"border-color .2s"}}
      />
    </div>
    <FieldWithMic label="Étape 2 — Texte ou dictée de votre présentation"
      hint='Collez votre texte, ou cliquez sur "Dicter" pour parler directement'
      value={t} onChange={setT} color={c.primary}
      placeholder={"Collez ici votre présentation, ou utilisez le micro ci-dessous...\n\nAu cours de mon année de terminale, j'ai étudié l'entreprise..."}
    />
    <div style={{background:"#F4F3F8",borderRadius:12,padding:"14px 16px",marginBottom:20}}>
      <div style={{fontSize:11,color:"#888",fontFamily:"monospace",letterSpacing:".06em",textTransform:"uppercase",marginBottom:12}}>
        🏫 Votre établissement <span style={{fontWeight:400,color:"#bbb"}}>(optionnel)</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div>
          <div style={{fontSize:11,color:"#666",marginBottom:5}}>Nom du lycée</div>
          <input type="text" value={etablissement} onChange={e=>setEtablissement(e.target.value)}
            placeholder="Ex : Lycée Henri IV"
            style={{width:"100%",padding:"9px 12px",border:`1.5px solid ${etablissement?"#9CA3AF":"#E8E7F0"}`,borderRadius:8,fontSize:13,fontFamily:"inherit",color:"#1C1A2E",outline:"none",background:"#fff"}}
          />
        </div>
        <div>
          <div style={{fontSize:11,color:"#666",marginBottom:5}}>Ville</div>
          <input type="text" value={ville} onChange={e=>setVille(e.target.value)}
            placeholder="Ex : Paris"
            style={{width:"100%",padding:"9px 12px",border:`1.5px solid ${ville?"#9CA3AF":"#E8E7F0"}`,borderRadius:8,fontSize:13,fontFamily:"inherit",color:"#1C1A2E",outline:"none",background:"#fff"}}
          />
        </div>
      </div>
    </div>
    <LevelSelector level={level} setLevel={setLevel} color={c.primary}/>
    <button onClick={()=>onStart(q.trim(),t.trim(),level,etablissement.trim(),ville.trim())} disabled={!can}
      style={{width:"100%",padding:"14px",background:can?c.primary:"#C8C7D4",color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:500,cursor:can?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all .2s"}}>
      <span>⚖️ Le jury prend la parole</span><span style={{fontSize:18}}>→</span>
    </button>
  </div>;
}

// ── SETUP SÉRIE GÉNÉRALE ──────────────────────────────────────────────────
function SetupGeneral({onStart,onBack}) {
  const [q,setQ]=useState(""), [t,setT]=useState(""), [s1,setS1]=useState(""), [s2,setS2]=useState(""), [level,setLevel]=useState("intermediaire");
  const [etablissement,setEtablissement]=useState(""), [ville,setVille]=useState("");
  const c=COLORS.general, can=q.trim().length>10&&t.trim().length>50&&s1&&s2;
  return <div>
    <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:13,marginBottom:20,display:"flex",alignItems:"center",gap:6}}>← Retour</button>
    <div style={{background:c.light,borderLeft:`3px solid ${c.primary}`,padding:"12px 14px",borderRadius:"0 10px 10px 0",fontSize:13,color:"#062E22",lineHeight:1.6,marginBottom:24}}>
      📚 <strong>Grand Oral Série Générale</strong> — Professeur de spécialité + jury naïf
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
      {[{v:s1,set:setS1,o:s2,n:"Spécialité 1"},{v:s2,set:setS2,o:s1,n:"Spécialité 2"}].map((x,i)=>
        <div key={i}>
          <div style={{fontSize:10,fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:"#888",fontFamily:"monospace",marginBottom:6}}>{x.n}</div>
          <select value={x.v} onChange={e=>x.set(e.target.value)}
            style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${x.v?c.primary:"#E8E7F0"}`,borderRadius:10,fontSize:13,fontFamily:"inherit",color:x.v?"#1C1A2E":"#aaa",outline:"none",background:"#fff"}}>
            <option value="">Choisir...</option>
            {SPECIALITES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}
    </div>
    <div style={{background:"#F4F3F8",borderRadius:12,padding:"14px 16px",marginBottom:20}}>
      <div style={{fontSize:11,color:"#888",fontFamily:"monospace",letterSpacing:".06em",textTransform:"uppercase",marginBottom:12}}>
        🏫 Votre établissement <span style={{fontWeight:400,color:"#bbb"}}>(optionnel)</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div>
          <div style={{fontSize:11,color:"#666",marginBottom:5}}>Nom du lycée</div>
          <input type="text" value={etablissement} onChange={e=>setEtablissement(e.target.value)}
            placeholder="Ex : Lycée Henri IV"
            style={{width:"100%",padding:"9px 12px",border:`1.5px solid ${etablissement?"#9CA3AF":"#E8E7F0"}`,borderRadius:8,fontSize:13,fontFamily:"inherit",color:"#1C1A2E",outline:"none",background:"#fff"}}
          />
        </div>
        <div>
          <div style={{fontSize:11,color:"#666",marginBottom:5}}>Ville</div>
          <input type="text" value={ville} onChange={e=>setVille(e.target.value)}
            placeholder="Ex : Paris"
            style={{width:"100%",padding:"9px 12px",border:`1.5px solid ${ville?"#9CA3AF":"#E8E7F0"}`,borderRadius:8,fontSize:13,fontFamily:"inherit",color:"#1C1A2E",outline:"none",background:"#fff"}}
          />
        </div>
      </div>
    </div>
    <div style={{marginBottom:20}}>
      <div style={{fontSize:10,fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:"#888",fontFamily:"monospace",marginBottom:6}}>Question de recherche</div>
      <input type="text" value={q} onChange={e=>setQ(e.target.value)}
        placeholder="Ex : En quoi le changement climatique remet-il en cause les modèles économiques ?"
        style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${q.length>10?c.primary:"#E8E7F0"}`,borderRadius:10,fontSize:14,fontFamily:"inherit",color:"#1C1A2E",outline:"none",transition:"border-color .2s"}}
      />
    </div>
    <FieldWithMic label="Texte ou dictée de votre présentation"
      hint='Collez votre texte, ou cliquez sur "Dicter" pour parler directement'
      value={t} onChange={setT} color={c.primary}
      placeholder={"Collez ici votre présentation, ou utilisez le micro..."}
    />
    <LevelSelector level={level} setLevel={setLevel} color={c.primary}/>
    <button onClick={()=>onStart(q.trim(),t.trim(),s1,s2,level,etablissement.trim(),ville.trim())} disabled={!can}
      style={{width:"100%",padding:"14px",background:can?c.primary:"#C8C7D4",color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:500,cursor:can?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all .2s"}}>
      <span>⚖️ Le jury prend la parole</span><span style={{fontSize:18}}>→</span>
    </button>
  </div>;
}

// ── CHAT ──────────────────────────────────────────────────────────────────
function ChatScreen({system,question,filiere,spe1,spe2,etablissement,ville,onRestart}) {
  const [messages,setMessages]=useState([]), [history,setHistory]=useState([]);
  const [input,setInput]=useState(""), [waiting,setWaiting]=useState(false);
  const [done,setDone]=useState(false), [typing,setTyping]=useState(false), [step,setStep]=useState(1);
  const bottomRef=useRef(null);
  const c=COLORS[filiere];
  const [interim,setInterim]=useState("");

  const micTextBefore = useRef("");
  const {active:micActive,ok:micOk,toggle:micToggleBase}=useMic({
    onPartial:(final,int)=>{setInput(micTextBefore.current + final);setInterim(int);},
    onFinal:(final)=>{
      const newText = (micTextBefore.current + final).trim();
      micTextBefore.current = newText ? newText + " " : "";
      setInput(micTextBefore.current.trim());
      setInterim("");
    },
  });
  const micToggle = () => {
    if (!micActive) micTextBefore.current = input ? input.trim() + " " : "";
    micToggleBase();
  };

  useEffect(()=>{startJury();},[]);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages,typing]);

  async function startJury() {
    setWaiting(true);setTyping(true);
    try {
      const init=[{role:"user",content:"Pose les 3 questions maintenant."}];
      const reply=await callJury(system,init);
      setHistory([{role:"user",content:"Pose les 3 questions maintenant."},{role:"assistant",content:reply}]);
      setMessages([{role:"jury",text:reply}]);setStep(2);
    } catch(e) { setMessages([{role:"system",text:"Erreur de connexion. Vérifiez votre accès internet."}]); }
    setTyping(false);setWaiting(false);
  }

  async function send() {
    if(!input.trim()||waiting||done) return;
    const text=input.trim();setInput("");
    const nm=[...messages,{role:"eleve",text}];setMessages(nm);setStep(3);
    const nh=[...history,{role:"user",content:text}];
    setWaiting(true);setTyping(true);
    try {
      const reply=await callJury(system,nh);
      setHistory([...nh,{role:"assistant",content:reply}]);
      setMessages([...nm,{role:"jury",text:reply}]);setDone(true);setStep(4);
    } catch(e) { setMessages([...nm,{role:"system",text:"Erreur — réessayez."}]); }
    setTyping(false);setWaiting(false);
  }

  return <div>
    <div style={{background:"#F4F3F8",border:"1px solid #E8E7F0",borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",gap:10}}>
      <span style={{fontSize:18}}>⚖️</span>
      <div style={{flex:1}}>
        <div style={{fontStyle:"italic",color:c.primary,fontSize:13,marginBottom:3}}>« {question} »</div>
        <div style={{fontSize:11,color:"#888",fontFamily:"monospace"}}>
          {filiere==="stmg"?"STMG · Économie-Gestion":`Série Générale · ${spe1} × ${spe2}`} · BO n°36 — 28 sept. 2023
          {etablissement && <span> · {etablissement}{ville ? `, ${ville}` : ""}</span>}
        </div>
      </div>
    </div>
    <StepBar step={step} filiere={filiere}/>
    <div style={{minHeight:200,marginBottom:16}}>
      {messages.map((msg,i)=>{
        if(msg.role==="jury")   return <JuryMsg key={i} text={msg.text}/>;
        if(msg.role==="eleve")  return <EleveMsg key={i} text={msg.text}/>;
        if(msg.role==="system") return <div key={i} style={{background:"#FFF3D6",borderLeft:"3px solid #C47B1A",padding:"8px 12px",borderRadius:"0 8px 8px 0",fontSize:13,color:"#7A4A00",marginBottom:12}}>ℹ️ {msg.text}</div>;
        return null;
      })}
      {typing&&<div style={{display:"flex",gap:10,marginBottom:16}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:"#1C1A2E",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>⚖️</div>
        <div>
          <div style={{fontSize:10,color:"#6558D3",fontFamily:"monospace",letterSpacing:".06em",textTransform:"uppercase",marginBottom:3}}>Jury</div>
          <div style={{background:"#1C1A2E",padding:"8px 14px",borderRadius:"4px 14px 14px 14px",display:"inline-block"}}><Dots/></div>
        </div>
      </div>}
      {step===2&&!waiting&&!done&&<div style={{background:c.light,borderLeft:`3px solid ${c.primary}`,padding:"10px 14px",borderRadius:"0 10px 10px 0",fontSize:13,color:c.dark,marginBottom:16,lineHeight:1.6}}>
        💬 <strong>Répondez aux 3 questions dans un seul message.</strong> Vous pouvez taper ou dicter 🎙️
      </div>}
      <div ref={bottomRef}/>
    </div>
    {!done&&!waiting&&step===2&&<div>
      <textarea value={input} onChange={e=>setInput(e.target.value)} rows={5}
        placeholder={"Répondez à chacune des 3 questions :\n\nQuestion 1 : ...\nQuestion 2 : ...\nQuestion 3 : ..."}
        style={{width:"100%",padding:"10px 14px",border:"1.5px solid #E8E7F0",borderRadius:10,fontSize:13,fontFamily:"inherit",color:"#1C1A2E",resize:"vertical",outline:"none",lineHeight:1.6,marginBottom:6}}
      />
      {micOk&&<div style={{marginBottom:8}}>
        <button onClick={micToggle} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 14px",borderRadius:99,border:"none",background:micActive?"#DC2626":c.primary,color:"#fff",fontSize:12,fontWeight:500,cursor:"pointer",boxShadow:micActive?"0 0 0 4px rgba(220,38,38,.2)":"none",transition:"all .2s"}}>
          <span style={{fontSize:14}}>{micActive?"⏹":"🎙️"}</span>
          <span>{micActive?"Arrêter la dictée":"Dicter ma réponse"}</span>
          {micActive&&<span style={{width:7,height:7,borderRadius:"50%",background:"#fff",animation:"pulse 1s ease infinite"}}/>}
        </button>
        {micActive&&interim&&<div style={{marginTop:5,padding:"6px 10px",background:"#FFF3D6",borderLeft:"3px solid #C47B1A",borderRadius:"0 8px 8px 0",fontSize:12,color:"#7A4A00",fontStyle:"italic"}}>🎙️ {interim}</div>}
      </div>}
      <button onClick={send} disabled={!input.trim()}
        style={{width:"100%",padding:"12px",background:input.trim()?c.primary:"#C8C7D4",color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:500,cursor:input.trim()?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        <span>Envoyer mes réponses au jury</span><span>➤</span>
      </button>
    </div>}
    {waiting&&!done&&<div style={{textAlign:"center",color:"#888",fontSize:13,padding:"12px 0",fontStyle:"italic"}}>Le jury évalue vos réponses...</div>}
    {done&&<FeedbackForm filiere={filiere} question={question} spe1={spe1} spe2={spe2} etablissement={etablissement} ville={ville} bilanText={messages.find(m=>m.role==="jury"&&m.text.includes("[BILAN]"))?.text||""} onRestart={onRestart} color={c.primary} colorLight={c.light}/>}
  </div>;
}

// ── FORMULAIRE FEEDBACK ───────────────────────────────────────────────────
function FeedbackForm({filiere,question,spe1,spe2,etablissement,ville,bilanText,onRestart,color,colorLight}) {
  const [notePercue, setNotePercue] = useState("");
  const [utilite,    setUtilite]    = useState("");
  const [manque,     setManque]     = useState("");
  const [sent,       setSent]       = useState(false);
  const [sending,    setSending]    = useState(false);

  const noteJury = (() => {
    const m = bilanText.match(/(\d{1,2}(?:[.,]\d)?)\s*\/\s*20/);
    return m ? m[1].replace(",",".") : null;
  })();

  useEffect(() => {
    fetch("/api/feedback", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ filiere, question, spe1, spe2, etablissement, ville, note_jury: noteJury }),
    }).catch(()=>{});
  }, []);

  async function submit() {
    setSending(true);
    await fetch("/api/feedback", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ filiere, question, spe1, spe2, etablissement, ville, note_jury: noteJury, note_percue: notePercue, utilite, manque }),
    }).catch(()=>{});
    setSending(false); setSent(true);
  }

  return (
    <div style={{marginTop:24}}>
      {!sent ? (
        <div style={{background:colorLight,borderRadius:14,padding:"20px",marginBottom:20,border:`1px solid ${color}22`}}>
          <div style={{fontWeight:600,fontSize:14,color:"#1C1A2E",marginBottom:4}}>💬 30 secondes de feedback</div>
          <div style={{fontSize:12,color:"#666",marginBottom:16,lineHeight:1.5}}>Tes réponses aident à améliorer le simulateur pour tous les lycéens.</div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:500,color:"#1C1A2E",marginBottom:6}}>Quelle note tu penses avoir obtenu ?</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["<8","8","9","10","11","12","13","14","15","16","17","18","19","20"].map(n=>(
                <button key={n} onClick={()=>setNotePercue(n)}
                  style={{padding:"5px 12px",borderRadius:99,border:`1.5px solid ${notePercue===n?color:"#E8E7F0"}`,background:notePercue===n?color:"#fff",color:notePercue===n?"#fff":"#555",fontSize:12,cursor:"pointer",fontWeight:notePercue===n?600:400,transition:"all .15s"}}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:500,color:"#1C1A2E",marginBottom:6}}>✅ Ce qui t'a le plus aidé</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["Les questions du jury","Les évaluations après chaque réponse","Le bilan final","La note sur 20","Les axes d'amélioration","La dictée vocale"].map(u=>(
                <button key={u} onClick={()=>setUtilite(u===utilite?"":u)}
                  style={{padding:"5px 10px",borderRadius:99,border:`1.5px solid ${utilite===u?"#0B6B54":"#E8E7F0"}`,background:utilite===u?"#E1F5EE":"#fff",color:utilite===u?"#0B6B54":"#555",fontSize:11,cursor:"pointer",transition:"all .15s"}}>
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:500,color:"#1C1A2E",marginBottom:6}}>⚠️ Ce qui manque ou pourrait être amélioré</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["Plus de questions","Questions trop difficiles","Questions trop faciles","Manque de précision","Interface à améliorer","Autre"].map(m=>(
                <button key={m} onClick={()=>setManque(m===manque?"":m)}
                  style={{padding:"5px 10px",borderRadius:99,border:`1.5px solid ${manque===m?"#933020":"#E8E7F0"}`,background:manque===m?"#FAECE7":"#fff",color:manque===m?"#933020":"#555",fontSize:11,cursor:"pointer",transition:"all .15s"}}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <button onClick={submit} disabled={sending}
            style={{padding:"9px 20px",background:color,color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:500,cursor:"pointer",marginRight:10}}>
            {sending?"Envoi...":"Envoyer mon feedback"}
          </button>
          <button onClick={()=>setSent(true)}
            style={{padding:"9px 16px",background:"transparent",border:`1px solid #ccc`,color:"#888",borderRadius:10,fontSize:12,cursor:"pointer"}}>
            Passer
          </button>
        </div>
      ) : (
        <div style={{background:"#E1F5EE",borderLeft:"3px solid #0B6B54",padding:"12px 16px",borderRadius:"0 10px 10px 0",fontSize:13,color:"#062E22",marginBottom:20}}>
          ✅ Merci pour ton feedback ! Il aidera à améliorer l'outil pour tous les lycéens.
        </div>
      )}
      <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <button onClick={onRestart}
          style={{padding:"10px 20px",background:"transparent",border:`1.5px solid ${color}`,color:color,borderRadius:10,cursor:"pointer",fontSize:14,fontFamily:"inherit"}}>
          ↩ Recommencer
        </button>
        <span style={{fontSize:12,color:"#888"}}>💡 Recommencez pour améliorer vos réponses</span>
      </div>
    </div>
  );
}

// ── CHOIX FILIÈRE ─────────────────────────────────────────────────────────
function ChoixFiliere({onChoix}) {
  return <div>
    <div style={{textAlign:"center",marginBottom:32}}>
      <div style={{fontSize:32,marginBottom:12}}>🎓</div>
      <h2 style={{fontSize:22,fontWeight:700,color:"#1C1A2E",marginBottom:8}}>Simulateur Jury — Grand Oral</h2>
      <p style={{fontSize:14,color:"#666",lineHeight:1.6}}>Entraîne-toi aux questions du jury selon la grille officielle<br/>d'évaluation du Grand Oral — BO n°36 du 28 septembre 2023</p>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
      {[
        {id:"stmg",    icon:"📊",title:"STMG",          desc:"Sciences et Technologies du Management et de la Gestion",badge:"Question de gestion",   c:COLORS.stmg},
        {id:"general", icon:"📚",title:"Série Générale", desc:"Toutes spécialités — Question croisant 2 disciplines",   badge:"Question de recherche",c:COLORS.general},
      ].map(f=><button key={f.id} onClick={()=>onChoix(f.id)}
        style={{padding:"24px 16px",background:"#fff",border:"2px solid #E8E7F0",borderRadius:16,cursor:"pointer",textAlign:"center",transition:"all .2s",boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}
        onMouseOver={e=>{e.currentTarget.style.borderColor=f.c.primary;e.currentTarget.style.background=f.c.light;}}
        onMouseOut={e=>{e.currentTarget.style.borderColor="#E8E7F0";e.currentTarget.style.background="#fff";}}>
        <div style={{fontSize:28,marginBottom:8}}>{f.icon}</div>
        <div style={{fontWeight:700,fontSize:15,color:f.c.primary,marginBottom:4}}>{f.title}</div>
        <div style={{fontSize:12,color:"#666",lineHeight:1.5}}>{f.desc}</div>
        <div style={{marginTop:10,fontSize:11,color:f.c.primary,background:f.c.light,padding:"4px 10px",borderRadius:99,display:"inline-block"}}>{f.badge}</div>
      </button>)}
    </div>
    <div style={{background:"#F4F3F8",borderRadius:12,padding:"12px 16px",fontSize:12,color:"#666",lineHeight:1.9,textAlign:"center"}}>
      ⚖️ Jury bienveillant mais exigeant · 3 questions ciblées · Note sur 20 · 3 axes d'amélioration<br/>
      🎙️ <strong>Nouveau</strong> — Dictez votre présentation et vos réponses directement au micro
    </div>
  </div>;
}

// ── PAGE MENTIONS LÉGALES ─────────────────────────────────────────────────
function LegalPage({ onBack }) {
  return (
    <div style={{ maxWidth:680, margin:"0 auto", padding:"0 0 60px" }}>
      <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", color:"#888", fontSize:13, marginBottom:24, display:"flex", alignItems:"center", gap:6 }}>
        ← Retour
      </button>
      <h1 style={{ fontSize:22, fontWeight:700, color:"#1C1A2E", marginBottom:8 }}>Mentions légales & Confidentialité</h1>
      <p style={{ fontSize:12, color:"#888", marginBottom:32, fontFamily:"monospace" }}>Dernière mise à jour : mai 2026</p>
      {[
        { title: "1. Responsable du traitement", content: `Cette application est conçue et administrée par Jenny ESTORS, Professeur d'Économie-Gestion.\nElle est hébergée sur Vercel (vercel.com) et utilise l'API Anthropic pour générer les questions du jury.` },
        { title: "2. Données collectées", content: `L'application collecte les données suivantes :\n• Votre adresse email (pour gérer l'accès aux simulations)\n• La filière choisie (STMG ou Série Générale)\n• Le texte de votre question de gestion\n• La note indicative obtenue\n• Votre retour sur la simulation (boutons de feedback)\n• La date et l'heure de la simulation\n\nL'email est utilisé uniquement pour limiter les simulations gratuites et permettre l'accès payant multi-appareils.` },
        { title: "3. Données vocales", content: `La dictée vocale fonctionne entièrement via l'API Web Speech de votre navigateur.\n\n✅ Aucun audio n'est enregistré ni transmis à nos serveurs.\n✅ La reconnaissance vocale est effectuée localement par votre navigateur.\n✅ Seul le texte transcrit est utilisé pour la simulation.` },
        { title: "4. Finalité du traitement", content: `Les données collectées sont utilisées exclusivement pour :\n• Gérer l'accès aux simulations gratuites et payantes\n• Améliorer la qualité pédagogique de l'outil\n• Produire des statistiques anonymes d'utilisation\n• Aucune donnée n'est revendue ni partagée avec des tiers.` },
        { title: "5. Durée de conservation", content: `Les données sont conservées pour une durée maximale de 12 mois, puis supprimées automatiquement.` },
        { title: "6. Droits des utilisateurs (RGPD)", content: `Conformément au RGPD, vous disposez des droits d'accès, rectification, effacement et opposition.\n\nPour exercer ces droits, contactez : jestors12@gmail.com` },
        { title: "7. Cookies", content: `Cette application n'utilise pas de cookies de tracking ou publicitaires.\nVotre email est mémorisé via localStorage pour éviter de le ressaisir à chaque visite.` },
        { title: "8. Hébergement", content: `L'application est hébergée par Vercel Inc.\nLes données sont stockées dans Supabase (serveurs en Europe — Irlande).` },
      ].map((section, i) => (
        <div key={i} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize:15, fontWeight:700, color:"#3D2FA0", marginBottom:8 }}>{section.title}</h2>
          <p style={{ fontSize:13, color:"#333", lineHeight:1.8, whiteSpace:"pre-line" }}>{section.content}</p>
        </div>
      ))}
      <div style={{ background:"#EDE9FF", borderLeft:"3px solid #3D2FA0", padding:"12px 16px", borderRadius:"0 10px 10px 0", fontSize:13, color:"#2A1F7A" }}>
        📧 Pour toute question : <strong>jestors12@gmail.com</strong>
      </div>
    </div>
  );
}

// ── FOOTER ────────────────────────────────────────────────────────────────
function Footer({ onLegal }) {
  return (
    <div style={{ borderTop:"1px solid #E8E7F0", marginTop:40, padding:"16px 0", textAlign:"center" }}>
      <p style={{ fontSize:11, color:"#aaa", marginBottom:6 }}>
        Conçu par <strong style={{ color:"#3D2FA0" }}>Jenny ESTORS</strong> · Professeur d'Économie-Gestion · © 2026
      </p>
      <p style={{ fontSize:11, color:"#aaa" }}>
        🔒 Aucun audio enregistré · Email protégé (RGPD) ·{" "}
        <button onClick={onLegal} style={{ background:"none", border:"none", cursor:"pointer", color:"#3D2FA0", fontSize:11, textDecoration:"underline", padding:0 }}>
          Mentions légales & Confidentialité
        </button>
      </p>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────
export default function Home() {
  // ── Auth state ──────────────────────────────────────────────────────────
  const [userEmail, setUserEmail]   = useState(null);
  const [authReady, setAuthReady]   = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [pendingStart, setPendingStart]     = useState(null);

  // ── App state ───────────────────────────────────────────────────────────
  const [screen,setScreen]         = useState("choix");
  const [filiere,setFiliere]       = useState("");
  const [prevScreen,setPrevScreen] = useState("choix");
  const goLegal = () => { setPrevScreen(screen); setScreen("legal"); };
  const backFromLegal = () => setScreen(prevScreen);
  const [question,setQ]   = useState("");
  const [trans,setT]       = useState("");
  const [spe1,setS1]       = useState("");
  const [spe2,setS2]       = useState("");
  const [etablissement,setEtablissement] = useState("");
  const [ville,setVille]   = useState("");
  const [system,setSys]    = useState("");

  const { simCount, isPaid, totalRemaining, canSimulate, useOne, hydrate, markPaid } = useCredits(userEmail);

  // ── 1. Initialisation auth au chargement ────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Vérifier retour paiement Stripe AVANT d'afficher le modal
    const params    = new URLSearchParams(window.location.search);
    const payment   = params.get("payment");
    const sessionId = params.get("session_id");
    const savedEmail = localStorage.getItem("go_email");

    async function init() {
      // Cas : retour paiement Stripe
      if (payment === "success" && sessionId && savedEmail) {
        try {
          const res  = await fetch(`/api/verify-payment?session_id=${sessionId}&email=${encodeURIComponent(savedEmail)}`);
          const data = await res.json();
          if (data.paid) {
            markPaid();
            window.history.replaceState({}, "", "/");
          }
        } catch {}
      }

      // Cas : email déjà connu → vérifier statut côté serveur
      if (savedEmail) {
        try {
          const res  = await fetch("/api/check-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: savedEmail }),
          });
          if (res.ok) {
            const data = await res.json();
            hydrate(data);
            setUserEmail(savedEmail);
          } else {
            // Erreur serveur → on garde l'email mais on affiche quand même
            setUserEmail(savedEmail);
          }
        } catch {
          setUserEmail(savedEmail);
        }
      }

      setAuthReady(true);
    }

    init();
  }, []);

  // ── 2. Callback quand l'utilisateur confirme son email ──────────────────
  async function handleEmailConfirmed({ email, simulations_used, is_paid }) {
    hydrate({ simulations_used, is_paid });
    setUserEmail(email);
    setShowEmailModal(false);
    // Lancer la simulation en attente
    if (pendingStart) {
      const { q, t, s1, s2, sys, etab, vil } = pendingStart;
      setPendingStart(null);
      await launchSimulation(q, t, s1, s2, sys, etab, vil);
    }
  }

  // ── 3. Lancer une simulation ─────────────────────────────────────────────
  async function handleStart(q, t, s1, s2, sys, etab, vil) {
    // Si pas encore d'email → afficher le modal d'abord
    if (!userEmail) {
      setPendingStart({ q, t, s1, s2, sys, etab, vil });
      setShowEmailModal(true);
      return;
    }
    await launchSimulation(q, t, s1, s2, sys, etab, vil);
  }

  async function launchSimulation(q, t, s1, s2, sys, etab, vil) {
    // Vérif côté serveur (non contournable)
    const allowed = await useOne();
    if (!allowed) {
      setScreen("payment");
      return;
    }
    setQ(q); setT(t); setS1(s1||""); setS2(s2||"");
    setEtablissement(etab||""); setVille(vil||"");
    setSys(sys);
    setScreen("chat");
  }

  function restart() {
    setScreen("choix"); setFiliere(""); setQ(""); setT(""); setS1(""); setS2("");
    setEtablissement(""); setVille(""); setSys("");
  }

  const c = filiere ? COLORS[filiere] : COLORS.stmg;

  // ── Affichage ─────────────────────────────────────────────────────────────
  // Pendant la vérification initiale : loader léger
  if (!authReady) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#FDFCFF" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:36, marginBottom:12 }}>⚖️</div>
          <div style={{ fontSize:13, color:"#888", fontFamily:"monospace" }}>Chargement…</div>
        </div>
      </div>
    );
  }

  return <>
    <Head>
      <title>Simulateur Jury — Grand Oral · Jenny ESTORS</title>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
    </Head>
    <style>{`*{box-sizing:border-box;margin:0;padding:0}body{background:#FDFCFF;font-family:system-ui,-apple-system,sans-serif}@keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:.5}40%{transform:translateY(-6px);opacity:1}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}select{appearance:auto}textarea,input{box-sizing:border-box}`}</style>

    <div style={{background:"#1C1A2E",position:"sticky",top:0,zIndex:10,borderBottom:`2px solid ${c.primary}`,transition:"border-color .4s"}}>
      <div style={{padding:"10px 18px",display:"flex",alignItems:"center",gap:12}}>
        <div style={{background:c.primary,color:"#fff",fontSize:10,fontFamily:"monospace",letterSpacing:".1em",padding:"3px 10px",borderRadius:99,transition:"background .4s",flexShrink:0}}>
          {filiere==="stmg"?"GRAND ORAL STMG":filiere==="general"?"GRAND ORAL SÉRIE GÉNÉRALE":"GRAND ORAL"}
        </div>
        <div style={{flex:1,color:"#fff",fontSize:15,fontWeight:600}}>
          Simulateur <span style={{color:c.mid,fontStyle:"italic"}}>Jury</span>
          <span style={{fontSize:10,color:"#555",marginLeft:10,fontFamily:"monospace"}}>🎙️ avec dictée vocale</span>
        </div>
        <span style={{fontSize:10,color:c.mid,fontFamily:"monospace",flexShrink:0}}>Bloom · Évaluer ●</span>
      </div>
      <div style={{background:"rgba(255,255,255,.04)",borderTop:"1px solid rgba(255,255,255,.06)",padding:"5px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:11,color:"rgba(255,255,255,.35)",fontFamily:"monospace",letterSpacing:".04em"}}>Conçu par</span>
          <span style={{fontSize:12,fontWeight:600,color:c.mid,letterSpacing:".02em"}}>Jenny ESTORS</span>
          <span style={{width:3,height:3,borderRadius:"50%",background:"rgba(255,255,255,.2)",display:"inline-block"}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.4)",fontStyle:"italic"}}>Professeur d'Économie-Gestion</span>
        </div>
        <div style={{fontSize:10,color:"rgba(255,255,255,.2)",fontFamily:"monospace"}}>© 2026</div>
      </div>
    </div>

    <div style={{maxWidth:780,margin:"0 auto",padding:"22px 18px 60px"}}>
      {screen==="choix" && (
        <>
          <div style={{textAlign:"center",marginBottom:16}}>
            <span style={{fontSize:12,color:isPaid?"#0B6B54":"#6558D3",background:isPaid?"#E1F5EE":"#EDE9FF",padding:"4px 14px",borderRadius:99,fontFamily:"monospace"}}>
              {isPaid
                ? `⭐ Accès illimité jusqu'au 11 juillet`
                : simCount >= FREE_LIMIT
                  ? "🔒 Essai gratuit terminé"
                  : `✅ ${FREE_LIMIT - simCount} simulation${FREE_LIMIT - simCount > 1 ? "s" : ""} gratuite${FREE_LIMIT - simCount > 1 ? "s" : ""} restante${FREE_LIMIT - simCount > 1 ? "s" : ""}`
              }
            </span>
          </div>
          <ChoixFiliere onChoix={f=>{setFiliere(f);setScreen("setup");}}/>
        </>
      )}
      {screen==="setup"   && filiere==="stmg"    && <SetupSTMG    onStart={(q,t,lvl,etab,vil)=>handleStart(q,t,"","",buildPromptSTMG(q,t,lvl),etab,vil)} onBack={()=>setScreen("choix")}/>}
      {screen==="setup"   && filiere==="general" && <SetupGeneral onStart={(q,t,s1,s2,lvl,etab,vil)=>handleStart(q,t,s1,s2,buildPromptGeneral(q,t,s1,s2,lvl),etab,vil)} onBack={()=>setScreen("choix")}/>}
      {screen==="chat"    && <ChatScreen system={system} question={question} filiere={filiere} spe1={spe1} spe2={spe2} etablissement={etablissement} ville={ville} onRestart={restart}/>}
      {screen==="payment" && <PaymentWall onBack={()=>setScreen("choix")} email={userEmail}/>}
      {screen==="legal"   && <LegalPage onBack={backFromLegal}/>}
      {screen!=="legal"   && <Footer onLegal={goLegal}/>}
    </div>
    {showEmailModal && <EmailModal onConfirmed={handleEmailConfirmed} />}
  </>;
}
