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

const COLORS = {
  stmg:    { primary:"#3D2FA0", light:"#EDE9FF", mid:"#6558D3", dark:"#1C1A2E" },
  general: { primary:"#0B6B54", light:"#E1F5EE", mid:"#1D9E75", dark:"#062E22" },
};

const buildPromptSTMG = (q,t) => `Tu es un jury de grand oral STMG composé de deux examinateurs : un professeur d'économie-gestion et un jury naïf, bienveillants mais exigeants, conformément à la grille officielle de l'Académie de Bordeaux.
L'élève présente la question : ${q}
Transcription : ${t}
VERSION COMPACTE — 2 échanges max.
ÉCHANGE 1 — [Q1] remet en cause un argument P1 · [Q2] demande un exemple d'autre entreprise · [Q3] pousse sur la tension P1/P2 · Termine par "Prenez le temps de répondre à chacune."
ÉCHANGE 2 — Évalue chaque réponse (solide/à progresser) · Très insuffisant/Insuffisant/Satisfaisant/Très satisfaisant sur : Interaction, Connaissances, Argumentation · Note /20 · 3 axes d'amélioration.
FORMAT : [Q1] [Q2] [Q3] pour questions — [BILAN] pour bilan final.`;

const buildPromptGeneral = (q,t,s1,s2) => `Tu es un jury de grand oral Terminale Série Générale composé de deux examinateurs : un professeur de ${s1} et un jury naïf, bienveillants mais exigeants, conformément à la grille officielle de l'Académie de Bordeaux.
Spécialités : ${s1} × ${s2}. Question : ${q}. Présentation : ${t}
VERSION COMPACTE — 2 échanges max.
ÉCHANGE 1 — [Q1] remet en cause un argument via les savoirs de ${s1} · [Q2] demande l'articulation concrète entre ${s1} et ${s2} · [Q3] pousse sur tension théorie/réalité · Termine par "Prenez le temps de répondre à chacune."
ÉCHANGE 2 — Évalue chaque réponse (solide/à progresser) · Très insuffisant/Insuffisant/Satisfaisant/Très satisfaisant sur : Interaction, Connaissances, Argumentation · Note /20 · 3 axes d'amélioration.
FORMAT : [Q1] [Q2] [Q3] pour questions — [BILAN] pour bilan final.`;

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
  const recRef   = useRef(null);
  const finalRef = useRef("");
  const [active, setActive]    = useState(false);
  const [ok,     setOk]        = useState(false);

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
      onPartial(finalRef.current, interim);
    };
    r.onend = () => { setActive(false); onFinal(finalRef.current.trim()); finalRef.current = ""; };
    r.onerror = () => setActive(false);
    recRef.current = r;
  }, []);

  const toggle = useCallback(() => {
    if (!recRef.current) return;
    if (active) { recRef.current.stop(); }
    else { finalRef.current = ""; setActive(true); recRef.current.start(); }
  }, [active]);

  return { active, ok, toggle };
}

// ── CHAMP TEXTAREA + MICRO ────────────────────────────────────────────────
function FieldWithMic({ label, hint, value, onChange, placeholder, rows=9, color }) {
  const [interim, setInterim] = useState("");
  const { active, ok, toggle } = useMic({
    onPartial: (final, int) => { onChange(final); setInterim(int); },
    onFinal:   (final)      => { onChange(final); setInterim(""); },
  });

  return (
    <div style={{ marginBottom: 20 }}>
      {label && <div style={{ fontSize:10, fontWeight:600, letterSpacing:".1em", textTransform:"uppercase", color:"#888", fontFamily:"monospace", marginBottom:6 }}>{label}</div>}
      {hint  && <div style={{ fontSize:12, color:"#888", marginBottom:8, lineHeight:1.5 }}>{hint}</div>}

      <textarea value={value} onChange={e=>onChange(e.target.value)} rows={rows} placeholder={placeholder}
        style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${value.length>50?color:"#E8E7F0"}`, borderRadius:10, fontSize:13, fontFamily:"inherit", color:"#1C1A2E", resize:"vertical", outline:"none", lineHeight:1.6, transition:"border-color .2s" }}
      />

      {ok && (
        <div style={{ marginTop:8 }}>
          <button onClick={toggle} style={{
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

// ── SETUP STMG ────────────────────────────────────────────────────────────
function SetupSTMG({onStart,onBack}) {
  const [q,setQ]=useState(""), [t,setT]=useState("");
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
    <button onClick={()=>onStart(q.trim(),t.trim())} disabled={!can}
      style={{width:"100%",padding:"14px",background:can?c.primary:"#C8C7D4",color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:500,cursor:can?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all .2s"}}>
      <span>⚖️ Le jury prend la parole</span><span style={{fontSize:18}}>→</span>
    </button>
  </div>;
}

// ── SETUP SÉRIE GÉNÉRALE ──────────────────────────────────────────────────
function SetupGeneral({onStart,onBack}) {
  const [q,setQ]=useState(""), [t,setT]=useState(""), [s1,setS1]=useState(""), [s2,setS2]=useState("");
  const c=COLORS.general, can=q.trim().length>10&&t.trim().length>50&&s1&&s2&&s1!==s2;
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
            {SPECIALITES.filter(s=>s!==x.o).map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}
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
    <button onClick={()=>onStart(q.trim(),t.trim(),s1,s2)} disabled={!can}
      style={{width:"100%",padding:"14px",background:can?c.primary:"#C8C7D4",color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:500,cursor:can?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all .2s"}}>
      <span>⚖️ Le jury prend la parole</span><span style={{fontSize:18}}>→</span>
    </button>
  </div>;
}

// ── CHAT ──────────────────────────────────────────────────────────────────
function ChatScreen({system,question,filiere,spe1,spe2,onRestart}) {
  const [messages,setMessages]=useState([]), [history,setHistory]=useState([]);
  const [input,setInput]=useState(""), [waiting,setWaiting]=useState(false);
  const [done,setDone]=useState(false), [typing,setTyping]=useState(false), [step,setStep]=useState(1);
  const bottomRef=useRef(null);
  const c=COLORS[filiere];
  const [interim,setInterim]=useState("");

  const {active:micActive,ok:micOk,toggle:micToggle}=useMic({
    onPartial:(final,int)=>{setInput(final);setInterim(int);},
    onFinal:(final)=>{setInput(final);setInterim("");},
  });

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
        <div style={{fontSize:11,color:"#888",fontFamily:"monospace"}}>{filiere==="stmg"?"STMG · Économie-Gestion":`Série Générale · ${spe1} × ${spe2}`} · Académie de Bordeaux</div>
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
    {done&&<FeedbackForm filiere={filiere} question={question} spe1={spe1} spe2={spe2} bilanText={messages.find(m=>m.role==="jury"&&m.text.includes("[BILAN]"))?.text||""} onRestart={onRestart} color={c.primary} colorLight={c.light}/>}
  </div>;
}

// ── FORMULAIRE FEEDBACK ───────────────────────────────────────────────────
function FeedbackForm({filiere,question,spe1,spe2,bilanText,onRestart,color,colorLight}) {
  const [notePercue, setNotePercue] = useState("");
  const [utilite,    setUtilite]    = useState("");
  const [manque,     setManque]     = useState("");
  const [sent,       setSent]       = useState(false);
  const [sending,    setSending]    = useState(false);

  // Extraire la note jury automatiquement du bilan
  const noteJury = (() => {
    const m = bilanText.match(/(\d{1,2}(?:[.,]\d)?)\s*\/\s*20/);
    return m ? m[1].replace(",",".") : null;
  })();

  // Envoyer feedback + tracking automatique
  useEffect(() => {
    // On envoie un tracking minimal dès que le bilan apparaît
    fetch("/api/feedback", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ filiere, question, spe1, spe2, note_jury: noteJury }),
    }).catch(()=>{});
  }, []);

  async function submit() {
    setSending(true);
    await fetch("/api/feedback", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ filiere, question, spe1, spe2, note_jury: noteJury, note_percue: notePercue, utilite, manque }),
    }).catch(()=>{});
    setSending(false); setSent(true);
  }

  return (
    <div style={{marginTop:24}}>
      {/* Formulaire feedback */}
      {!sent ? (
        <div style={{background:colorLight,borderRadius:14,padding:"20px",marginBottom:20,border:`1px solid ${color}22`}}>
          <div style={{fontWeight:600,fontSize:14,color:"#1C1A2E",marginBottom:4}}>💬 30 secondes de feedback</div>
          <div style={{fontSize:12,color:"#666",marginBottom:16,lineHeight:1.5}}>Tes réponses aident à améliorer le simulateur pour tous les lycéens.</div>

          {/* Note perçue */}
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

          {/* Ce qui était utile */}
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

          {/* Ce qui manque */}
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

      {/* Bouton recommencer */}
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
      <p style={{fontSize:14,color:"#666",lineHeight:1.6}}>Entraîne-toi aux questions du jury selon la grille officielle<br/>de l'Académie de Bordeaux</p>
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

// ── APP ───────────────────────────────────────────────────────────────────
export default function Home() {
  const [screen,setScreen]=useState("choix"), [filiere,setFiliere]=useState("");
  const [question,setQ]=useState(""), [trans,setT]=useState("");
  const [spe1,setS1]=useState(""), [spe2,setS2]=useState(""), [system,setSys]=useState("");

  function restart() { setScreen("choix");setFiliere("");setQ("");setT("");setS1("");setS2("");setSys(""); }
  const c=filiere?COLORS[filiere]:COLORS.stmg;

  return <>
    <Head>
      <title>Simulateur Jury — Grand Oral · Jenny ESTORS</title>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
    </Head>
    <style>{`*{box-sizing:border-box;margin:0;padding:0}body{background:#FDFCFF;font-family:system-ui,-apple-system,sans-serif}@keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:.5}40%{transform:translateY(-6px);opacity:1}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}select{appearance:auto}textarea,input{box-sizing:border-box}`}</style>

    <div style={{background:"#1C1A2E",position:"sticky",top:0,zIndex:10,borderBottom:`2px solid ${c.primary}`,transition:"border-color .4s"}}>
      {/* Ligne principale */}
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
      {/* Bandeau signature */}
      <div style={{
        background:"rgba(255,255,255,.04)",
        borderTop:"1px solid rgba(255,255,255,.06)",
        padding:"5px 18px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        gap:8,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:11,color:"rgba(255,255,255,.35)",fontFamily:"monospace",letterSpacing:".04em"}}>Conçu par</span>
          <span style={{fontSize:12,fontWeight:600,color:c.mid,letterSpacing:".02em"}}>Jenny ESTORS</span>
          <span style={{width:3,height:3,borderRadius:"50%",background:"rgba(255,255,255,.2)",display:"inline-block"}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.4)",fontStyle:"italic"}}>Professeur d'Économie-Gestion</span>
        </div>
        <div style={{fontSize:10,color:"rgba(255,255,255,.2)",fontFamily:"monospace"}}>© 2025</div>
      </div>
    </div>

    <div style={{maxWidth:780,margin:"0 auto",padding:"22px 18px 60px"}}>
      {screen==="choix"   && <ChoixFiliere onChoix={f=>{setFiliere(f);setScreen("setup");}}/>}
      {screen==="setup"   && filiere==="stmg"    && <SetupSTMG    onStart={(q,t)=>{setQ(q);setT(t);setSys(buildPromptSTMG(q,t));setScreen("chat");}} onBack={()=>setScreen("choix")}/>}
      {screen==="setup"   && filiere==="general" && <SetupGeneral onStart={(q,t,s1,s2)=>{setQ(q);setT(t);setS1(s1);setS2(s2);setSys(buildPromptGeneral(q,t,s1,s2));setScreen("chat");}} onBack={()=>setScreen("choix")}/>}
      {screen==="chat"    && <ChatScreen system={system} question={question} filiere={filiere} spe1={spe1} spe2={spe2} onRestart={restart}/>}
    </div>
  </>;
}
