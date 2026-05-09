// pages/dashboard.js
// Tableau de bord privé — accessible via /dashboard?pwd=TON_MOT_DE_PASSE
// Configure DASHBOARD_PASSWORD dans Vercel Environment Variables

import { useState, useEffect } from "react";
import Head from "next/head";

function StatCard({ icon, label, value, sub, color="#3D2FA0" }) {
  return (
    <div style={{
      background:"#fff", border:"1.5px solid #E8E7F0", borderRadius:14,
      padding:"20px 24px", boxShadow:"0 2px 8px rgba(0,0,0,.05)",
      borderTop:`3px solid ${color}`,
    }}>
      <div style={{fontSize:24,marginBottom:8}}>{icon}</div>
      <div style={{fontSize:32,fontWeight:700,color,lineHeight:1}}>{value ?? "—"}</div>
      <div style={{fontSize:13,fontWeight:500,color:"#1C1A2E",marginTop:4}}>{label}</div>
      {sub && <div style={{fontSize:11,color:"#888",marginTop:3}}>{sub}</div>}
    </div>
  );
}

function FeedbackRow({ fb, i }) {
  const date = new Date(fb.created_at).toLocaleDateString("fr-FR", {day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
  return (
    <div style={{
      padding:"12px 16px", background: i%2===0?"#F9F8FF":"#fff",
      borderBottom:"1px solid #E8E7F0", fontSize:13,
    }}>
      <div style={{display:"flex",gap:10,alignItems:"flex-start",flexWrap:"wrap"}}>
        <span style={{
          fontSize:10, padding:"2px 8px", borderRadius:99, fontWeight:600,
          background: fb.filiere==="stmg"?"#EDE9FF":"#E1F5EE",
          color: fb.filiere==="stmg"?"#3D2FA0":"#0B6B54",
          flexShrink:0,
        }}>{fb.filiere?.toUpperCase()}</span>
        <span style={{flex:1,color:"#1C1A2E",fontStyle:"italic"}}>« {fb.question?.slice(0,80)}{fb.question?.length>80?"...":""} »</span>
        <span style={{fontSize:11,color:"#888",flexShrink:0,fontFamily:"monospace"}}>{date}</span>
      </div>
      <div style={{display:"flex",gap:16,marginTop:8,flexWrap:"wrap"}}>
        {fb.note_jury && <span style={{fontSize:12,color:"#3D2FA0",fontWeight:600}}>Note jury : {fb.note_jury}/20</span>}
        {fb.note_percue && <span style={{fontSize:12,color:"#0B6B54"}}>Note perçue : {fb.note_percue}/20</span>}
        {fb.utilite && <span style={{fontSize:12,color:"#555"}}>✅ {fb.utilite}</span>}
        {fb.manque && <span style={{fontSize:12,color:"#933"}}>⚠️ {fb.manque}</span>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [pwd, setPwd]   = useState("");
  const [auth, setAuth] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function load(p) {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/stats?pwd=${encodeURIComponent(p)}`);
      const json = await res.json();
      if (res.status === 401) { setError("Mot de passe incorrect"); setLoading(false); return; }
      setData(json); setAuth(true);
    } catch(e) { setError("Erreur de connexion"); }
    setLoading(false);
  }

  if (!auth) return (
    <>
      <Head><title>Dashboard — Jenny ESTORS</title></Head>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}body{background:#F4F3F8;font-family:system-ui,sans-serif}`}</style>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:"#fff",borderRadius:16,padding:"40px 36px",maxWidth:380,width:"100%",boxShadow:"0 4px 24px rgba(0,0,0,.08)"}}>
          <div style={{fontSize:28,textAlign:"center",marginBottom:8}}>📊</div>
          <h1 style={{fontSize:20,fontWeight:700,color:"#1C1A2E",textAlign:"center",marginBottom:4}}>Dashboard</h1>
          <p style={{fontSize:13,color:"#888",textAlign:"center",marginBottom:24}}>Jenny ESTORS · Simulateur Jury Grand Oral</p>
          <input type="password" value={pwd} onChange={e=>setPwd(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&load(pwd)}
            placeholder="Mot de passe..."
            style={{width:"100%",padding:"10px 14px",border:"1.5px solid #E8E7F0",borderRadius:10,fontSize:14,fontFamily:"inherit",outline:"none",marginBottom:12}}
          />
          {error && <div style={{color:"#933",fontSize:12,marginBottom:10,textAlign:"center"}}>{error}</div>}
          <button onClick={()=>load(pwd)} disabled={loading}
            style={{width:"100%",padding:"12px",background:"#3D2FA0",color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:500,cursor:"pointer"}}>
            {loading?"Chargement...":"Accéder"}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Head><title>Dashboard — Jenny ESTORS</title></Head>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}body{background:#F4F3F8;font-family:system-ui,sans-serif}`}</style>

      {/* Header */}
      <div style={{background:"#1C1A2E",padding:"14px 24px",display:"flex",alignItems:"center",gap:12,borderBottom:"2px solid #3D2FA0"}}>
        <div style={{flex:1}}>
          <div style={{color:"#fff",fontSize:15,fontWeight:600}}>📊 Dashboard · Simulateur Jury</div>
          <div style={{color:"#6558D3",fontSize:11,fontFamily:"monospace",marginTop:2}}>Jenny ESTORS · Professeur d'Économie-Gestion</div>
        </div>
        <button onClick={()=>setAuth(false)} style={{background:"transparent",border:"1px solid rgba(255,255,255,.2)",color:"rgba(255,255,255,.6)",padding:"5px 12px",borderRadius:8,cursor:"pointer",fontSize:12}}>
          Déconnexion
        </button>
      </div>

      <div style={{maxWidth:1000,margin:"0 auto",padding:"24px 20px 60px"}}>

        {data?.mode==="demo" && (
          <div style={{background:"#FFF3D6",borderLeft:"3px solid #C47B1A",padding:"10px 14px",borderRadius:"0 10px 10px 0",fontSize:13,color:"#7A4A00",marginBottom:20}}>
            ⚠️ Mode démo — Supabase non configuré. Les données ne sont pas encore enregistrées. Suivez le guide de configuration ci-dessous.
          </div>
        )}

        {/* Stats globales */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:16,marginBottom:28}}>
          <StatCard icon="🎓" label="Simulations totales" value={data?.total} sub="Depuis le lancement" color="#3D2FA0"/>
          <StatCard icon="📊" label="STMG" value={data?.stmg} sub={data?.total?`${Math.round((data.stmg/data.total)*100)}% du total`:null} color="#3D2FA0"/>
          <StatCard icon="📚" label="Série Générale" value={data?.general} sub={data?.total?`${Math.round((data.general/data.total)*100)}% du total`:null} color="#0B6B54"/>
          <StatCard icon="⭐" label="Note moyenne /20" value={data?.note_moyenne} sub="Toutes filières" color="#C47B1A"/>
        </div>

        {/* Feedbacks récents */}
        <div style={{background:"#fff",borderRadius:14,border:"1.5px solid #E8E7F0",overflow:"hidden",marginBottom:28}}>
          <div style={{padding:"14px 16px",borderBottom:"1px solid #E8E7F0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontWeight:600,fontSize:14,color:"#1C1A2E"}}>💬 Simulations récentes</div>
            <div style={{fontSize:11,color:"#888",fontFamily:"monospace"}}>20 dernières</div>
          </div>
          {data?.feedbacks_recents?.length > 0
            ? data.feedbacks_recents.map((fb,i) => <FeedbackRow key={i} fb={fb} i={i}/>)
            : <div style={{padding:"24px",textAlign:"center",color:"#aaa",fontSize:13}}>Aucune simulation enregistrée pour l'instant</div>
          }
        </div>

        {/* Guide de configuration Supabase */}
        {data?.mode==="demo" && (
          <div style={{background:"#fff",borderRadius:14,border:"1.5px solid #E8E7F0",padding:"20px 24px"}}>
            <div style={{fontWeight:600,fontSize:14,color:"#1C1A2E",marginBottom:16}}>🔧 Configurer Supabase (gratuit — 5 minutes)</div>

            {[
              ["1. Créer un compte Supabase", "Va sur supabase.com → New Project → nomme-le 'grand-oral'"],
              ["2. Créer la table", `Dans l'éditeur SQL de Supabase, colle et exécute :\n\nCREATE TABLE simulations (\n  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n  filiere text,\n  question text,\n  spe1 text,\n  spe2 text,\n  note_percue text,\n  note_jury text,\n  utilite text,\n  manque text,\n  created_at timestamptz DEFAULT now()\n);`],
              ["3. Récupérer les clés", "Settings → API → copie 'Project URL' et 'anon public key'"],
              ["4. Ajouter dans Vercel", "Settings → Environment Variables :\n• SUPABASE_URL = https://xxxx.supabase.co\n• SUPABASE_ANON_KEY = eyJ...\n• DASHBOARD_PASSWORD = ton mot de passe"],
            ].map(([title, content], i) => (
              <div key={i} style={{marginBottom:16}}>
                <div style={{fontWeight:500,fontSize:13,color:"#3D2FA0",marginBottom:4}}>{title}</div>
                <div style={{fontFamily:"monospace",fontSize:12,background:"#F4F3F8",padding:"8px 12px",borderRadius:8,whiteSpace:"pre-wrap",color:"#333"}}>{content}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
