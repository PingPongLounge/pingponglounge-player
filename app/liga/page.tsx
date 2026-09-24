"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import PendingConfirmBanner from "@/app/components/PendingConfirmBanner"
import NotificationBell from "@/app/components/NotificationBell"
import { MAX_RANKED_PER_OPPONENT, RANKED_WINDOW_MONTHS, MIN_MATCHES_PER_MONTH, MONTHLY_PENALTY_ELO, TIERS, tierForElo, tierRangeLabel, type TierKey } from "@/lib/rewards"
import {
  ratingLabel, ANTON, INTER,
} from "@/app/theme"
import PlayerKopf from "@/app/components/PlayerKopf"
import OffenFuerDich from "@/app/components/OffenFuerDich"
import {
  IconLiga, IconRangliste, IconSpieler, IconStatistiken,
} from "@/app/components/Icons"
/* 24.09.2026: Die Liga bezieht ihr Aussehen nicht mehr aus V2, sondern aus
   denselben Klassen wie die Startseite (.p-hero, .p-karte, .p-kopf,
   .p-zeile) und denselben Knopf-Stilen aus app/design.ts. Daten, Filter,
   Saison-, Challenge- und Chatlogik sind unveraendert. */
import {
  TEXT as P_TEXT, LEISE as P_LEISE, BG as P_BG, AKZENT as P_AKZENT, KANTE as P_KANTE,
  DUNKEL as P_DUNKEL, DUNKEL_LEISE as P_D_LEISE, DUNKEL_KANTE as P_D_KANTE,
  ANTON_ZEILEN as P_ANTON_ZEILEN,
  knopf as knopfPrimaer, knopfUmriss as knopfOutlineHell, knopfHell,
} from "@/app/design"
/* Umriss auf dunklem Grund — dieselbe Form, nur helle Kante und Schrift. */
const knopfDunkelUmriss: React.CSSProperties = {
  ...knopfHell, background: "transparent", color: "#FFFFFF",
  border: "1px solid rgba(255,255,255,.28)",
}

/* ══ OVERLAYS ══════════════════════════════════════════════════════════
   24.09.2026: Die fuenf Overlays der Liga — Gegnerwahl, Spielerkarte,
   Filter, Forderungsdialog und Chat — liefen innen noch auf den alten
   V2-Mitteln: Inter 800/900 als normale Schrift, #101316 als Fuellung
   statt einer Kante, das Off-White #F4F1EB neben reinem Weiss und im
   Chat sogar Neon auf heller Flaeche. Ab hier dieselben Tokens wie der
   Rest von PLAYER. Rein visuell — kein Zustand, keine Logik angefasst. */
const O_HUELLE: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(8,11,13,.72)", zIndex: 200,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
}
const O_BLATT: React.CSSProperties = {
  width: "100%", maxWidth: 420, background: P_DUNKEL,
  border: `1px solid ${P_D_KANTE}`, padding: "22px 18px",
  maxHeight: "88vh", overflowY: "auto", fontFamily: INTER,
}
/** Ueberschrift eines Overlays — ein Moment, also Anton. */
const O_TITEL: React.CSSProperties = {
  fontFamily: ANTON, fontWeight: 400, fontSize: 26, lineHeight: P_ANTON_ZEILEN,
  letterSpacing: "-.01em", textTransform: "uppercase", color: "#FFFFFF",
  overflowWrap: "anywhere",
}
/** Schliessen — 38px Tippflaeche, dieselbe Kante wie alles andere. */
const O_ZU: React.CSSProperties = {
  width: 38, height: 38, flexShrink: 0, background: "transparent",
  border: `1px solid ${P_D_KANTE}`, borderRadius: 0, color: "#FFFFFF",
  fontSize: 14, cursor: "pointer", display: "inline-flex",
  alignItems: "center", justifyContent: "center", fontFamily: INTER,
}
/** Abschnittsmarke im Overlay. */
const O_LABEL: React.CSSProperties = {
  display: "block", fontFamily: INTER, fontSize: 11, fontWeight: 600,
  letterSpacing: ".12em", textTransform: "uppercase", color: P_D_LEISE,
  margin: "18px 0 8px",
}
/** Fliesstext im Overlay. Gewicht 400 — nicht 300, nicht 700. */
const O_TEXT: React.CSSProperties = {
  fontFamily: INTER, fontSize: 13.5, fontWeight: 400, lineHeight: 1.55, color: P_D_LEISE,
}
const O_FELD: React.CSSProperties = {
  width: "100%", background: "transparent", border: `1px solid ${P_D_KANTE}`,
  borderRadius: 0, padding: "12px 13px", color: "#FFFFFF", fontSize: 15,
  fontFamily: INTER, outline: "none", minHeight: 46,
}
/** Auswaehlbare Flaeche: Kante im Ruhezustand, Weiss wenn gewaehlt. */
const o_wahl = (on: boolean): React.CSSProperties => ({
  background: on ? "#FFFFFF" : "transparent",
  border: `1px solid ${on ? "#FFFFFF" : P_D_KANTE}`, borderRadius: 0,
  color: on ? P_DUNKEL : "#FFFFFF", fontFamily: INTER, cursor: "pointer",
})
const o_haken = (on: boolean): React.CSSProperties => ({
  width: 18, height: 18, flexShrink: 0, display: "flex", alignItems: "center",
  justifyContent: "center", fontSize: 11, fontWeight: 600, borderRadius: 0,
  border: `1px solid ${on ? "#FFFFFF" : P_D_KANTE}`,
  background: on ? "#FFFFFF" : "transparent", color: on ? P_DUNKEL : "transparent",
})
/** Sportzahl im Overlay — Anton, wie ueberall sonst. */
const O_ZAHL: React.CSSProperties = {
  fontFamily: ANTON, fontWeight: 400, lineHeight: 1, color: "#FFFFFF",
  fontVariantNumeric: "tabular-nums",
}



type Season={id:string,name:string,city:string,skill_class:string,status:string,max_players:number,is_global?:boolean,is_private?:boolean}
type Row={user_id:string,name:string,elo:number,level:string,real?:string|null,avatar?:string|null}
// Zeile aus /api/rangliste (gefiltert): trägt Rang + Geo/Stil mit.
type RankRow={user_id:string,name:string,elo:number,level:string,avatar?:string|null,tier:string,rank_global:number,rank_filtered:number,city?:string|null,canton?:string|null}
type OpenMatch={id:string,status:string,iAmP1:boolean,enteredBy:string|null}
type PlayerInfo={
  player:{id:string,name:string,real_short?:string|null,level:string,elo:number,matches_played:number,matches_won:number,lost:number,winRate:number|null,canton?:string|null},
  recent:Array<{id:string,opponent:string,won:boolean,score:string,date:string|null,ranked:boolean}>,
  head:{played:number,myWins:number,theirWins:number,rankedLeft:number}|null,
  maxRanked:number,
}
type Reactions={heart:number,fire:number,laugh:number,myReacts:string[]}
type Msg={id:string,user_id:string|null,name:string,text:string,kind?:string,match_id?:string,parent_id?:string|null,created_at?:string,reactions:Reactions}

/* ── DIE AKTION JE ZUSTAND ────────────────────────────────────────────
   Eine Stelle, sechs Zustaende. Sie wird in der Ranglistenzeile, in
   "Offen fuer dich" und in "Who's next?" benutzt — damit keine Ansicht
   je wieder einen Zustand verschluckt.

     kein Spiel                      → Fordern
     gefordert worden                → Annehmen + ✕ (ablehnen)
     selbst gefordert                → Offen + ✕ (zurueckziehen)
     vereinbart (accepted/pending)   → Eintragen
     Gegner hat eingetragen          → Bestaetigen
     ich habe eingetragen            → Wartet                            */
function Tat({ om, userId, onFordern, onAnnehmen, onAblehnen, breit=false }:{
  om?: OpenMatch|null
  userId: string|null
  onFordern: ()=>void
  onAnnehmen: (id:string)=>void
  onAblehnen: (id:string)=>void
  /** true in "Offen fuer dich": dort ist Platz fuer die lange Beschriftung. */
  breit?: boolean
}){
  const H = breit ? "p-aktion" : "p-tat-haupt"
  if(!om) return <span className="p-tat"><button onClick={onFordern} className={H}>Fordern</button></span>

  if(om.status==="challenge_sent"&&!om.iAmP1) return (
    <span className="p-tat">
      <button onClick={()=>onAnnehmen(om.id)} className={H}>Annehmen</button>
      <button onClick={()=>onAblehnen(om.id)} className="p-tat-zweit" title="Ablehnen" aria-label="Forderung ablehnen">✕</button>
    </span>
  )
  if(om.status==="challenge_sent"&&om.iAmP1) return (
    <span className="p-tat">
      <span className="p-tat-status">Offen</span>
      <button onClick={()=>onAblehnen(om.id)} className="p-tat-zweit" title="Zurückziehen" aria-label="Forderung zurückziehen">✕</button>
    </span>
  )
  if(om.status==="accepted"||om.status==="pending") return (
    <span className="p-tat"><Link href={`/liga/match/${om.id}`} className={H}>Eintragen</Link></span>
  )
  if(om.status==="p1_entered"&&om.enteredBy&&om.enteredBy!==userId) return (
    <span className="p-tat"><Link href={`/liga/match/${om.id}`} className={H}>Bestätigen</Link></span>
  )
  if(om.status==="p1_entered") return <span className="p-tat"><span className="p-tat-status">Wartet</span></span>
  return <span className="p-tat"><button onClick={onFordern} className={H}>Fordern</button></span>
}

export default function LigaPage(){
  const [userId,setUserId]=useState<string|null>(null)
  const [myLevel,setMyLevel]=useState<string|null>(null)
  const [seasons,setSeasons]=useState<Season[]>([])
  const [city,setCity]=useState<string>("")
  const [seasonId,setSeasonId]=useState<string>("")
  const [rows,setRows]=useState<Row[]>([])
  const [count,setCount]=useState(0)
  const [myReg,setMyReg]=useState(false)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [toast,setToast]=useState("")
  const [showCity,setShowCity]=useState(false)
  const [ligaTab,setLigaTab]=useState<TierKey|null>(null)   // welche Stufe ist im Tab angesteuert (Sprung, nicht Filter)
  const [saison,setSaison]=useState(false)                  // Saison-Infos (mehr) auf-/zugeklappt
  const [openMatches,setOpenMatches]=useState<Record<string,OpenMatch>>({})
  /* 24.09.2026: Die eigene Zeile wurde bisher ausschliesslich in `rows`
     gesucht. `rows` ist die OEFFENTLICHE Liste — wer dort fehlt (Filter,
     Sichtbarkeit, unvollstaendiges Profil), verlor damit Rangkarte, Chat
     und "Ergebnis eintragen", obwohl er laengst in der Liga ist.
     Mitgliedschaft haengt jetzt an `myReg` (league_registrations), die
     eigenen Zahlen an diesem separaten Eintrag. */
  const [meinEintrag,setMeinEintrag]=useState<Row|null>(null)
  /* Alle offenen Forderungen und Matches MIT Gegnernamen — unabhaengig
     davon, ob der Gegner gerade in der Liste steht. Grundlage fuer die
     Uebersicht "Offen fuer dich" und fuer die Aktion in jeder Zeile. */
  const [offene,setOffene]=useState<Array<OpenMatch&{oppId:string,oppName:string}>>([])
  // ─── FILTER (das Herzstück) ───────────────────────────────────────────────
  // scope: Reichweite · plus Freunde / Kategorie / Spielstil. Alle kombinierbar.
  const [filter,setFilter]=useState<{scope:string,canton:string,city:string,friends:boolean,category:string,hand:string,pips:string,anti:boolean}>({scope:"world",canton:"",city:"",friends:false,category:"",hand:"",pips:"",anti:false})
  const [filterOpen,setFilterOpen]=useState(false)
  const [apiRows,setApiRows]=useState<RankRow[]|null>(null)   // null = kein Filter aktiv → lokale rows
  const tierRefs=useRef<Record<string,HTMLDivElement|null>>({})
  // chat
  const [chatOpen,setChatOpen]=useState(false)
  const [msgs,setMsgs]=useState<Msg[]>([])
  const [msg,setMsg]=useState("")
  const [cmt,setCmt]=useState<Record<string,string>>({})      // Kommentar-Entwurf je Spiel
  const [cmtOpen,setCmtOpen]=useState<Record<string,boolean>>({}) // welcher Thread ist offen?
  const meRef=useRef<HTMLDivElement|null>(null)
  // Fordern-Popup
  const [fTarget,setFTarget]=useState<{id:string,name:string}|null>(null)
  const [fTab,setFTab]=useState<"challenge"|"result">("challenge")
  const [fDate,setFDate]=useState("")
  const [fTime,setFTime]=useState("")
  const [fMy,setFMy]=useState(0)
  const [fOpp,setFOpp]=useState(0)
  const [fRDate,setFRDate]=useState("")        // Wann wurde gespielt?
  const [fDone,setFDone]=useState<string[]>([]) // in dieser Session eingetragene Ergebnisse
  const [fFriendly,setFFriendly]=useState(false) // Freundschaftsspiel: ohne Liga-Punkte
  // Zählt das nächste Spiel gegen diesen Gegner für die ELO? Wird beim Öffnen
  // des Popups geladen und VOR der Partie angezeigt.
  const [fWertung,setFWertung]=useState<{ranked:boolean,bisher:number,limit:number}|null>(null)
  const [fDetail,setFDetail]=useState(false)     // Sätze genau eintragen statt nur zählen
  const [fSets,setFSets]=useState<Array<{p1:string,p2:string}>>([{p1:"",p2:""},{p1:"",p2:""},{p1:"",p2:""}])
  const [fNoteRanked,setFNoteRanked]=useState<string|null>(null) // Hinweis, wenn das Gegner-Limit greift
  const [rankedVs,setRankedVs]=useState<Record<string,number>>({}) // gewertete Spiele je Gegner
  const [monatCount,setMonatCount]=useState(0)   // gewertete Liga-Matches diesen Monat
  const [reqCity,setReqCity]=useState("")              // Liga-Anfrage: welche Stadt?
  const [reqOpen,setReqOpen]=useState(false)
  const [reqDone,setReqDone]=useState(false)
  const [reqCount,setReqCount]=useState(0)

  async function sendLigaAnfrage(){
    if(!reqCity.trim()) return
    setBusy(true)
    try{
      const r=await fetch("/api/liga/anfrage",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({city:reqCity.trim()})})
      if(!checkAuth(r)){ setBusy(false); return }
      const j=await r.json().catch(()=>({}))
      if(r.ok){ setReqDone(true); setReqCount(j.count||1) }
      else flash(j.error||"Anfrage fehlgeschlagen")
    }catch{ flash("Anfrage fehlgeschlagen") }
    setBusy(false)
  }

  const [pickOpen,setPickOpen]=useState(false)         // "Gegen wen hast du gespielt?"-Auswahl
  const [pOpen,setPOpen]=useState<string|null>(null)   // Spieler-Popup: wessen Profil?
  const [pData,setPData]=useState<PlayerInfo|null>(null)
  const [pLoading,setPLoading]=useState(false)

  async function openPlayer(id:string){
    setPOpen(id); setPData(null); setPLoading(true)
    try{
      const r=await fetch(`/api/liga/player?id=${id}&season_id=${seasonId}`)
      const j=await r.json()
      if(r.ok) setPData(j)
    }catch{ /* Popup zeigt dann nur den Namen */ }
    setPLoading(false)
  }

  const flash=(t:string)=>{setToast(t);setTimeout(()=>setToast(""),2500)}
  const monatOk=monatCount>=MIN_MATCHES_PER_MONTH

  // DIE EINE LIGA laden. Keine Auswahl nach Stadt oder Stärkeklasse mehr:
  // es gibt genau eine öffentliche Liga (is_global) — dazu ggf. private
  // Firmen-Ligen, in denen der Spieler Mitglied ist.
  useEffect(()=>{(async()=>{
    const sb=createClient()
    const [{data:{user}},{data}]=await Promise.all([
      sb.auth.getUser(),
      sb.from("league_seasons").select("id,name,city,skill_class,status,max_players,is_global,is_private").in("status",["open","running"]),
    ])
    const alle=(data||[]) as Season[]
    setUserId(user?.id||null)
    if(user){ const {data:pf}=await sb.from("profiles").select("level").eq("id",user.id).maybeSingle(); setMyLevel(pf?.level||null) }

    const global=alle.find(s=>s.is_global)
    let meine:string[]=[]
    if(user){
      // Kein Beitreten mehr: wer ein fertiges Profil hat, wird automatisch
      // eingetragen. Der Aufruf ist idempotent.
      await fetch("/api/liga/register",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}).catch(()=>{})
      const {data:myRegs}=await sb.from("league_registrations").select("season_id").eq("player_id",user.id)
      meine=(myRegs||[]).map(r=>r.season_id)
    }
    // Private Ligen nur zeigen, wenn man drin ist — sonst sind sie unsichtbar.
    const sichtbar=alle.filter(s=>s.is_global||(s.is_private&&meine.includes(s.id)))
    setSeasons(sichtbar)
    setCity(global?.city||""); setSeasonId(global?.id||sichtbar[0]?.id||""); setLoading(false)
  })()},[])

  const loadStandings=useCallback(async(sid:string)=>{
    if(!sid) return
    const sb=createClient()
    const {data:regs}=await sb.from("league_registrations").select("player_id").eq("season_id",sid)
    const ids=(regs||[]).map(r=>r.player_id)
    setCount(ids.length)
    const isReg=!!userId&&ids.includes(userId)
    setMyReg(isReg)
    if(ids.length===0){setRows([]);return}
    const {data:profs}=await sb.from("public_profiles").select("id,name,elo,level,real_short,avatar_url").in("id",ids)
    const list=(profs||[]).map(p=>({user_id:p.id,name:p.name,elo:p.elo??1000,level:p.level||"",real:(p as {real_short?:string|null}).real_short,avatar:(p as {avatar_url?:string|null}).avatar_url})).sort((a,b)=>b.elo-a.elo)
    setRows(list)

    /* Die eigene Zeile IMMER separat holen. RLS gibt jedem seine eigene
       Profilzeile heraus — auch wenn er in der oeffentlichen Liste fehlt. */
    if(userId&&isReg){
      const gefunden=list.find(r=>r.user_id===userId)
      if(gefunden) setMeinEintrag(gefunden)
      else{
        const {data:mp}=await sb.from("profiles").select("id,name,elo,level,avatar_url").eq("id",userId).maybeSingle()
        setMeinEintrag(mp?{user_id:mp.id,name:mp.name,elo:mp.elo??1000,level:mp.level||"",real:null,avatar:(mp as {avatar_url?:string|null}).avatar_url}:null)
      }
    } else setMeinEintrag(null)
    // Offene Matches des eingeloggten Spielers laden
    if(userId&&isReg){
      const {data:myMs}=await sb.from("league_matches")
        .select("id,p1_id,p2_id,status,entered_by")
        .eq("season_id",sid)
        .in("status",["challenge_sent","accepted","pending","p1_entered"])
        .or(`p1_id.eq.${userId},p2_id.eq.${userId}`)
      const map:Record<string,OpenMatch>={}
      for(const m of myMs||[]){
        const oppId=m.p1_id===userId?m.p2_id:m.p1_id
        map[oppId]={id:m.id,status:m.status,iAmP1:m.p1_id===userId,enteredBy:(m as {entered_by?:string|null}).entered_by??null}
      }
      setOpenMatches(map)

      /* Gegnernamen fuer die Uebersicht — auch fuer Gegner, die gerade
         nicht in der Liste stehen. Ohne das waere eine Forderung von
         jemandem ausserhalb der vier Nachbarn wieder unsichtbar. */
      const oppIds=Object.keys(map)
      let namen=new Map<string,string>()
      if(oppIds.length){
        const {data:op}=await sb.from("public_profiles").select("id,name").in("id",oppIds)
        namen=new Map((op||[]).map(p=>[p.id as string,p.name as string]))
      }
      setOffene(oppIds.map(oid=>({...map[oid],oppId:oid,oppName:namen.get(oid)||"Spieler"})))

      // Wie viele GEWERTETE Spiele habe ich gegen wen schon? → "noch X×"
      const {data:rk}=await sb.from("league_matches")
        .select("p1_id,p2_id")
        .eq("season_id",sid)
        .eq("ranked",true)
        .in("status",["p1_entered","confirmed"])
        .or(`p1_id.eq.${userId},p2_id.eq.${userId}`)
      const cnt:Record<string,number>={}
      for(const m of rk||[]){
        const oppId=m.p1_id===userId?m.p2_id:m.p1_id
        cnt[oppId]=(cnt[oppId]||0)+1
      }
      setRankedVs(cnt)

      // Wie viele gewertete Liga-Matches habe ich DIESEN Monat gespielt?
      const jetzt=new Date()
      const von=new Date(jetzt.getFullYear(),jetzt.getMonth(),1).toISOString()
      const {count:mc}=await sb.from("league_matches")
        .select("id",{count:"exact",head:true})
        .eq("season_id",sid).eq("ranked",true).eq("status","confirmed")
        .gte("confirmed_at",von)
        .or(`p1_id.eq.${userId},p2_id.eq.${userId}`)
      setMonatCount(mc??0)
    } else {
      setOpenMatches({})
      setOffene([])
      setRankedVs({})
      setMonatCount(0)
    }
  },[userId])

  useEffect(()=>{ if(seasonId) loadStandings(seasonId) },[seasonId,loadStandings])

  // Überfällige Ergebnisse (24h ohne Reaktion) bestätigen — der Hobby-Plan erlaubt
  // nur EINEN täglichen Cron, deshalb prüfen wir zusätzlich beim Öffnen der Liga.
  useEffect(()=>{
    if(!seasonId) return
    ;(async()=>{
      try{
        const r=await fetch("/api/liga/tick",{method:"POST"})
        const j=await r.json().catch(()=>({}))
        if(j?.confirmed>0) loadStandings(seasonId)
      }catch{ /* egal — nur eine Aufräum-Aktion */ }
    })()
  },[seasonId,loadStandings])
  // zu meinem Rang scrollen
  useEffect(()=>{ if(rows.length&&meRef.current){ meRef.current.scrollIntoView({block:"center",behavior:"smooth"}) } },[rows])

  // Chat laden + Poll. Läuft AUCH bei geschlossenem Chat, sonst wüsste niemand,
  // dass etwas Neues drinsteht — und ungelesene Nachrichten sind der halbe Grund,
  // die App zu öffnen.
  const loadChat=useCallback(async(sid:string)=>{
    const r=await fetch(`/api/liga/chat?season_id=${sid}`); if(r.ok){const j=await r.json();setMsgs(j.messages||[])}
  },[])
  useEffect(()=>{
    if(!seasonId) return
    loadChat(seasonId)
    const t=setInterval(()=>loadChat(seasonId),chatOpen?5000:25000)
    return ()=>clearInterval(t)
  },[chatOpen,seasonId,loadChat])

  // Gelesen-Stand pro Saison
  const [gesehen,setGesehen]=useState(0)
  useEffect(()=>{
    if(!seasonId) return
    const v=parseInt(localStorage.getItem(`liga-gesehen-${seasonId}`)||"0")
    setGesehen(Number.isFinite(v)?v:0)
  },[seasonId])
  const ungelesen=Math.max(0,msgs.length-gesehen)
  useEffect(()=>{
    if(!chatOpen||!seasonId||msgs.length===0) return
    localStorage.setItem(`liga-gesehen-${seasonId}`,String(msgs.length))
    setGesehen(msgs.length)
  },[chatOpen,seasonId,msgs.length])

  // Direkt aus der Bestätigung heraus: /liga?chat=1 öffnet den Chat
  useEffect(()=>{
    if(new URLSearchParams(window.location.search).get("chat")==="1") setChatOpen(true)
  },[])

  // Wertungs-Status laden, sobald ein Gegner gewählt ist.
  useEffect(()=>{
    if(!fTarget){setFWertung(null);return}
    let weg=false
    ;(async()=>{
      try{
        const r=await fetch(`/api/liga/gewertet?opponent=${fTarget.id}`)
        if(r.ok&&!weg) setFWertung(await r.json())
      }catch{ /* Anzeige ist optional */ }
    })()
    return()=>{weg=true}
  },[fTarget])

  async function join(){
    // Ohne Konto gar nicht erst anfragen: sonst antwortet die Middleware mit
    // 401 und der Besucher liest "Unauthorized".
    if(!userId){ zumLogin(); return }
    setBusy(true)
    // season_id wird serverseitig gesetzt — es gibt nur eine öffentliche Liga.
    const r=await fetch("/api/liga/register",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"})
    if(!checkAuth(r)){ setBusy(false); return }
    const j=await r.json().catch(()=>({}))
    if(r.ok){flash("✓ Du bist dabei!");loadStandings(seasonId)} else flash(j.error||"Fehler")
    setBusy(false)
  }
  async function challenge(pid:string){
    if(!userId){ zumLogin(); return }
    const r=await fetch("/api/liga/challenge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({season_id:seasonId,challenged_id:pid})})
    if(!checkAuth(r)) return
    const j=await r.json().catch(()=>({}))
    if(r.ok){flash("⚔️ Herausforderung gesendet!");loadStandings(seasonId)}
    else flash(j.error||"Fehler")
  }
  function today(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }
  function openForder(r:{user_id:string,name:string},tab:"challenge"|"result"="challenge"){ setFTarget({id:r.user_id,name:r.name}); setFTab(tab); setFDate(""); setFTime(""); setFMy(0); setFOpp(0); setFRDate(today()); setFDone([]); setFFriendly(false); setFNoteRanked(null); setFDetail(false); setFSets([{p1:"",p2:""},{p1:"",p2:""},{p1:"",p2:""}]) }

  // Genaue Sätze → gewonnene Sätze je Seite. Leere Zeilen zählen nicht.
  function satzBilanz(){
    const parsed=fSets.map(s=>({p1:parseInt(s.p1),p2:parseInt(s.p2)})).filter(s=>Number.isFinite(s.p1)&&Number.isFinite(s.p2)&&(s.p1>0||s.p2>0))
    return {
      parsed,
      my:parsed.filter(s=>s.p1>s.p2).length,
      opp:parsed.filter(s=>s.p2>s.p1).length,
    }
  }
  async function sendChallenge(){
    if(!fTarget) return
    setBusy(true)
    const when=[fDate,fTime].filter(Boolean).join(" ")
    const r=await fetch("/api/liga/challenge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({season_id:seasonId,challenged_id:fTarget.id,when})})
    if(!checkAuth(r)){ setBusy(false); return }
    const j=await r.json().catch(()=>({}))
    if(r.ok){
      if(fDate||fTime){
        const when=[fDate,fTime].filter(Boolean).join(" ")
        await fetch("/api/liga/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({season_id:seasonId,text:`⚔️ Herausforderung an ${fTarget.name} — Vorschlag: ${when}`})})
      }
      flash("⚔️ Herausforderung gesendet!"); setFTarget(null); loadStandings(seasonId)
    } else flash(j.error||"Fehler")
    setBusy(false)
  }
  /* 401 heisst: keine (oder abgelaufene) Session. Bis zum 24.09.2026 haben
     mehrere Aufrufer diesen Fall gar nicht geprueft und stattdessen die
     Fehlermeldung der Middleware angezeigt — woertlich "Unauthorized".
     Genau das sah, wer aus der Forderungs-Mail kam und "Los geht's" drueckte.
     Jetzt geht es zum Login und danach GENAU HIERHIN zurueck, samt
     Suchparametern (z.B. ?annehmen=<id>). */
  function zumLogin(){
    const zurueck=window.location.pathname+window.location.search
    window.location.href="/login?returnTo="+encodeURIComponent(zurueck)
  }
  function checkAuth(r:Response){
    if(r.status===401){ zumLogin(); return false }
    return true
  }

  async function sendResult(){
    if(!fTarget||!userId) return

    // Zwei Wege: Sätze zählen (schnell) oder Sätze genau eintragen (ehrlich).
    const det=satzBilanz()
    const my=fDetail?det.my:fMy
    const opp=fDetail?det.opp:fOpp
    if(fDetail&&det.parsed.length===0){ flash("Trag mindestens einen Satz ein"); return }
    if(my===opp){ flash("Kein Unentschieden möglich"); return }
    setBusy(true)
    const dm=await fetch("/api/liga/direct-match",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({season_id:seasonId,opponent_id:fTarget.id,friendly:fFriendly})})
    if(!checkAuth(dm)){ setBusy(false); return }
    const dj=await dm.json().catch(()=>({}))
    const matchId=dm.ok?dj.id:dj.existing_id
    if(!matchId){ flash(dj.error||"Fehler beim Anlegen"); setBusy(false); return }
    // Limit gewerteter Spiele gegen denselben Gegner erreicht → zählt nicht mehr
    if(dm.ok&&dj.limitReached&&!fFriendly) setFNoteRanked(`Ihr habt schon ${MAX_RANKED_PER_OPPONENT} gewertete Spiele in den letzten 12 Monaten — dieses zählt nicht für ELO und Rang.`)
    // Genaue Sätze, wenn eingetragen. Sonst Platzhalter aus der Satzzahl —
    // fürs ELO gleichwertig, in der Historie steht dann aber 11:7.
    const sets=fDetail
      ? det.parsed
      : [...Array(my)].map(()=>({p1:11,p2:7})).concat([...Array(opp)].map(()=>({p1:7,p2:11})))
    const winner_id=my>opp?userId:fTarget.id
    const played_at=fRDate?new Date(`${fRDate}T20:00:00`).toISOString():undefined
    const rr=await fetch("/api/liga/result",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({match_id:matchId,sets,winner_id,played_at})})
    if(!checkAuth(rr)){ setBusy(false); return }
    const rj=await rr.json().catch(()=>({}))
    if(rr.ok){
      // Popup bleibt offen → direkt das nächste Ergebnis eintragen
      setFDone(d=>[...d,`${my}:${opp}`])
      setFMy(0); setFOpp(0)
      setFSets([{p1:"",p2:""},{p1:"",p2:""},{p1:"",p2:""}])
      flash("✓ Eingetragen — warte auf Bestätigung")
      loadStandings(seasonId)
    }
    else flash(rj.error||"Fehler")
    setBusy(false)
  }
  async function declineChallenge(matchId:string){
    const r=await fetch("/api/liga/challenge/decline",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({match_id:matchId})})
    if(!checkAuth(r)) return
    const j=await r.json().catch(()=>({}))
    if(r.ok){flash("Forderung abgesagt");loadStandings(seasonId)}
    else flash(j.error||"Fehler")
  }
  async function acceptChallenge(matchId:string){
    const r=await fetch("/api/liga/challenge/accept",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({match_id:matchId})})
    if(!checkAuth(r)) return
    const j=await r.json().catch(()=>({}))
    if(r.ok){flash("✓ Angenommen — jetzt Spiel eintragen");loadStandings(seasonId)}
    else flash(j.error||"Fehler")
  }
  async function react(messageId:string,type:string){
    const r=await fetch("/api/liga/message-react",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message_id:messageId,type})})
    if(!checkAuth(r)) return
    loadChat(seasonId)
  }
  async function send(){
    const t=msg.trim(); if(!t) return
    setMsg("")
    const r=await fetch("/api/liga/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({season_id:seasonId,text:t})})
    if(!checkAuth(r)) return
    loadChat(seasonId)
  }
  // Kommentar zu EINEM Spiel — hängt als Antwort unter dem Match-Post.
  async function sendComment(parentId:string){
    const t=(cmt[parentId]||"").trim(); if(!t) return
    setCmt(c=>({...c,[parentId]:""}))
    const r=await fetch("/api/liga/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({season_id:seasonId,text:t,parent_id:parentId})})
    if(!checkAuth(r)) return
    loadChat(seasonId)
  }

  /* ── Aus der Forderungs-Mail: /liga?annehmen=<match_id> ──────────────
     Bis zum 24.09.2026 zeigte der Knopf "Annehmen" in der Mail einfach auf
     /liga — ohne Match und ohne Rueckweg. Wer auf diesem Geraet keine
     Session hatte (Mail am Handy, App am Rechner), landete auf der
     oeffentlichen Liga-Seite, sah dort die Beitrittskarte mit "Los geht's"
     und bekam beim Druecken die Fehlermeldung der Middleware zu lesen.
     Jetzt traegt der Link das Match, und ohne Session geht es zuerst zum
     Login und danach genau hierher zurueck. */
  const annahmeLaeuft=useRef(false)
  useEffect(()=>{
    if(loading||annahmeLaeuft.current) return
    const id=new URLSearchParams(window.location.search).get("annehmen")
    if(!id) return
    annahmeLaeuft.current=true
    if(!userId){ zumLogin(); return }
    window.history.replaceState({},"",window.location.pathname)
    acceptChallenge(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[loading,userId])

  // Keine Stadt-/Klassen-Auswahl mehr (cities/citySeasons/isPro sind entfallen):
  // es gibt genau eine öffentliche Liga. `sel` ist die gerade gezeigte.
  const sel=seasons.find(s=>s.id===seasonId)
  /* myRow ist die eigene Zeile — aus der Liste, wenn sie dort steht, sonst
     aus dem separat geladenen Eintrag. Sie entscheidet ueber NICHTS mehr
     ausser der Anzeige der eigenen Zahlen; Mitgliedschaft ist `myReg`. */
  const myRow=rows.find(r=>r.user_id===userId)??meinEintrag

  // Die Liga ist ein PLATZ in der Tabelle, kein Level-Etikett:
  // Stufen kommen aus der ELO, NICHT mehr aus dem Tabellenplatz. Damit hat ein
  // Spieler überall dieselbe Stufe — egal wie viele Leute gerade angezeigt
  // werden oder wie gefiltert wird. Die Stufe ist ein Etikett, keine Liga.
  /* Rang = wie viele stehen besser. Das funktioniert auch dann, wenn die
     eigene Zeile nicht in der oeffentlichen Liste auftaucht. */
  const meinRang=myRow?rows.filter(r=>r.user_id!==userId&&r.elo>myRow.elo).length+1:0
  const meineStufe=myRow?tierForElo(myRow.elo):null

  // Ist irgendein Filter aktiv? (world ohne Zusätze = kein Filter)
  const filterAktiv=filter.scope!=="world"||filter.friends||!!filter.category||!!filter.hand||!!filter.pips||filter.anti
  // Filter serverseitig auswerten (Rang gilt innerhalb der Auswahl).
  useEffect(()=>{
    if(!filterAktiv){setApiRows(null);return}
    const q=new URLSearchParams()
    q.set("scope",filter.scope)
    if(filter.scope==="country") q.set("country","CH")
    if(filter.scope==="canton"&&filter.canton) q.set("canton",filter.canton)
    if(filter.scope==="city"&&filter.city) q.set("city",filter.city)
    if(filter.friends) q.set("friends","1")
    if(filter.category) q.set("category",filter.category)
    if(filter.hand) q.set("hand",filter.hand)
    if(filter.pips) q.set("pips",filter.pips)
    if(filter.anti) q.set("anti","1")
    let weg=false
    ;(async()=>{ try{ const r=await fetch(`/api/rangliste?${q}`); if(r.ok&&!weg){const j=await r.json(); setApiRows(j.players||[])} }catch{ /* Anzeige optional */ } })()
    return()=>{weg=true}
  },[filterAktiv,filter])

  // Anzeigezeilen normalisieren: entweder gefilterte API-Daten oder lokale rows.
  type Disp={user_id:string,name:string,elo:number,avatar?:string|null,platz:number}
  const displayRows:Disp[]=filterAktiv&&apiRows
    ? apiRows.map(r=>({user_id:r.user_id,name:r.name,elo:r.elo,avatar:r.avatar,platz:r.rank_filtered}))
    : rows.map((r,i)=>({user_id:r.user_id,name:r.name,elo:r.elo,avatar:r.avatar,platz:i+1}))

  // Nach Stufe in Bänder gruppieren, stärkste zuerst (Elite → Rookie).
  const bands=[...TIERS].reverse().map(t=>({
    tier:t,
    rows:displayRows.filter(r=>tierForElo(r.elo).key===t.key),
  })).filter(b=>b.rows.length>0)

  // Zusammenfassung der aktiven Filter für die Leiste.
  const filterLabel=(()=>{
    const teile:string[]=[]
    if(filter.scope==="europe") teile.push("Europa")
    else if(filter.scope==="country") teile.push("Schweiz")
    else if(filter.scope==="canton") teile.push(filter.canton?`Kanton ${filter.canton}`:"Kanton")
    else if(filter.scope==="city") teile.push(filter.city||"Stadt")
    else teile.push("Weltweit")
    if(filter.friends) teile.push("Freunde")
    if(filter.category==="parkinson") teile.push("Parkinson")
    if(filter.hand) teile.push(filter.hand==="left"?"Links":"Rechts")
    if(filter.pips==="short") teile.push("Kurze Noppen")
    if(filter.pips==="long") teile.push("Lange Noppen")
    if(filter.anti) teile.push("Anti")
    return teile.join(" · ")
  })()

  function springZu(key:string){
    setLigaTab(key as TierKey)
    tierRefs.current[key]?.scrollIntoView({behavior:"smooth",block:"start"})
  }
  // Gefordert wird innerhalb der Tabelle — also gegen jeden in dieser Saison.
  const imPaar=(_r:Row)=>true

  // Vorschau der letzten Nachricht für die Chat-Zeile
  const letzte=msgs[msgs.length-1]
  const letzteNachricht=(()=>{
    if(!letzte) return "Noch nichts geschrieben — mach den Anfang."
    if(letzte.kind==="match"){
      try{
        const d=JSON.parse(letzte.text) as {winner:string,loser:string,wSets:number,lSets:number}
        return `${d.winner} schlägt ${d.loser} ${d.wSets}:${d.lSets}`
      }catch{ return "Neues Ergebnis" }
    }
    const wer=letzte.user_id===userId?"Du":letzte.name
    return `${wer}: ${letzte.text}`
  })()

  // 24.09.2026 (Oliver): Auf der Liga liegt hinter den Kaestchen die dunkle
  // Flaeche statt Off-White. Die Karten selbst bleiben weiss — Ranking ist
  // Information und wird gelesen.
  return (
    <main className="p-dunkel" style={{minHeight:"100dvh",fontFamily:INTER,paddingBottom:90}}>
      {/* Topbar — dunkel. Grün nur im Logo und im Zähler: eine grelle Leiste war
          das Lauteste auf dem Screen und sagte nichts. Ein Akzent pro Screen. */}
      {/* 07.09.2026: Der eigene Kopfbalken ist weg — PPL., Glocke und Menue
         sitzen jetzt in HeroKopf ueber dem Foto, der Liga-Chat als Knopf im
         Hero. Vorher standen hier zwei Koepfe uebereinander. */}

      {/* Liga-Umschalter: öffentliche Liga ↔ private Firmen-Ligen */}
      {showCity&&(
        <div onClick={()=>setShowCity(false)} style={{position:"fixed",inset:0,zIndex:20}}>
          <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:74,right:14,background:P_DUNKEL,border:`1px solid ${P_D_KANTE}`,padding:6,minWidth:180,fontFamily:INTER}}>
            {seasons.map(s=>(
              <div key={s.id} onClick={()=>{setSeasonId(s.id);setCity(s.city);setShowCity(false)}} style={{minHeight:44,display:"flex",alignItems:"center",padding:"0 12px",borderRadius:0,fontSize:14,fontWeight:s.id===seasonId?600:400,color:s.id===seasonId?"#FFFFFF":P_D_LEISE,cursor:"pointer"}}>
                {s.name}{s.is_private?" · privat":""}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        {/* ══ KOPF — derselbe Aufbau wie auf der Startseite ══════════ */}
        <header className="p-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/liga-hero.jpg" alt="" aria-hidden className="p-foto" style={{objectPosition:"50% 45%"}}/>
          <div aria-hidden className="p-hero-schleier"/>
          <PlayerKopf/>
          <div className="p-spalte p-hero-inhalt">
            <h1 className="p-h1">{sel?.is_private?sel.name:"Liga"}</h1>
            <p className="p-eyebrow">Steig im Ranking auf und fordere<br/>Spieler auf deinem Niveau heraus.</p>
            <div className="p-streifen">
              <div>
                <span className="zahl">{rows.length||"—"}</span>
                <span className="was">Spieler</span>
              </div>
              {myReg&&myRow?(
                <>
                  <div>
                    <span className="zahl">#{meinRang}</span>
                    <span className="was">Dein Rang</span>
                  </div>
                  <div>
                    <span className="zahl">{ratingLabel(myRow.elo)}</span>
                    <span className="was">Dein Rating</span>
                  </div>
                </>
              ):(
                <div>
                  <span className="zahl">{rows[0]?ratingLabel(rows[0].elo):"—"}</span>
                  <span className="was">Top-Rating</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ══ DEIN RANG — die Zahl gehoert auf die helle Flaeche ══ */}
        <div className="p-lese" style={{paddingTop:18}}>
          {seasons.length>1&&(
            <div style={{marginBottom:14}}>
              <button onClick={()=>setShowCity(v=>!v)} className="p-pille" style={{cursor:"pointer",minHeight:36}}>{sel?.name||"League"} ▾</button>
            </div>
          )}

          {/* Mitgliedschaft haengt an `myReg`, NICHT an der eigenen Zeile in der
              oeffentlichen Liste. Vorher stand hier `myReg&&myRow`: wer aus der
              Liste fiel, bekam trotz Mitgliedschaft die Beitrittskarte
              "Los geht's" — und verlor Chat und "Ergebnis eintragen" gleich mit. */}
          {myReg?(
            <>
              <section className="p-karte">
                <div className="p-kopf">
                  <h2><IconRangliste size={22}/>Dein Rang</h2>
                  <span className="p-mehr">{sel?.city||city||"Schweiz"}</span>
                </div>
                <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:16,padding:"16px 18px"}}>
                  <span style={{fontFamily:ANTON,fontWeight:400,fontSize:56,lineHeight:.9,letterSpacing:"-.01em"}}>{meinRang?`#${meinRang}`:"—"}</span>
                  <span style={{textAlign:"right",fontSize:13,lineHeight:1.5,color:P_LEISE}}>
                    {meineStufe?<b style={{display:"block",fontSize:15,fontWeight:600,color:P_TEXT}}>{meineStufe.name}</b>:null}
                    Rating {myRow?ratingLabel(myRow.elo):"—"}
                  </span>
                </div>

                {/* ── MONATSSOLL ───────────────────────────────────────────
                    Bis zum 24.09.2026 stand das Soll nur als "2/4 im Monat"
                    in einer Nebenzeile. Der Fortschritt und die Bestaetigung
                    "Soll erfuellt" waren im Redesign verloren gegangen —
                    genau die zwei Dinge, die man auf einen Blick sucht. */}
                <div style={{padding:"0 18px 16px"}}>
                  <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:12,fontSize:13}}>
                    <span style={{color:P_LEISE}}>Monatssoll · {monatCount}/{MIN_MATCHES_PER_MONTH} gewertete Spiele</span>
                    <span style={{fontWeight:600,whiteSpace:"nowrap",color:monatOk?P_AKZENT:P_TEXT}}>
                      {monatOk?"Soll erfüllt ✓":`noch ${MIN_MATCHES_PER_MONTH-monatCount}`}
                    </span>
                  </div>
                  <div className="p-fortschritt" role="progressbar" aria-valuemin={0} aria-valuemax={MIN_MATCHES_PER_MONTH} aria-valuenow={Math.min(monatCount,MIN_MATCHES_PER_MONTH)} aria-label="Monatssoll">
                    <span style={{width:`${Math.min(100,Math.round(monatCount/MIN_MATCHES_PER_MONTH*100))}%`}}/>
                  </div>
                </div>
              </section>

              {!monatOk&&(
                <p className="p-hinweis" style={{fontSize:13,margin:"10px 2px 0",lineHeight:1.5}}>
                  Noch {MIN_MATCHES_PER_MONTH-monatCount} gewertete Spiele bis Monatsende, sonst −{MONTHLY_PENALTY_ELO} Punkte.
                </p>
              )}

              <div className="p-knopfreihe">
                {rows.length>1&&(
                  <button onClick={()=>setPickOpen(true)} style={knopfHell}>Ergebnis eintragen</button>
                )}
                <button onClick={()=>setChatOpen(true)} style={{...knopfDunkelUmriss,position:"relative"}}>
                  Liga-Chat
                  {ungelesen>0&&(
                    <span style={{marginLeft:9,minWidth:20,height:20,background:"#FFFFFF",color:P_TEXT,fontSize:11,fontWeight:600,display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"0 6px"}}>{ungelesen>9?"9+":ungelesen}</span>
                  )}
                </button>
              </div>
              {letzteNachricht&&(
                <div className="p-hinweis" style={{fontSize:13,marginTop:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{letzteNachricht}</div>
              )}
            </>
          ):(
            <section className="p-karte">
              <div style={{padding:18}}>
                <p style={{fontSize:15,color:P_LEISE,lineHeight:1.55,margin:"0 0 18px",maxWidth:"46ch"}}>
                  Eine Liga für alle — kein Beitreten in Klassen. Deine Stufe kommt aus deinem Rating. Fordere jeden, auch die Nummer eins.
                </p>
                <button onClick={join} disabled={busy} style={{...knopfPrimaer,width:"100%",opacity:busy?.6:1}}>
                  {busy?"…":userId?"Los geht's":"Anmelden und mitmachen"}
                </button>
              </div>
            </section>
          )}

          <div style={{marginTop:18}}><PendingConfirmBanner/></div>

          {/* ══ OFFEN FÜR DICH ═══════════════════════════════════════════════
              Eine Komponente fuer Liga, Profil und Startseite. Sie laedt ihre
              Daten selbst und haengt nicht an der Rangliste: ein Gegner, der
              durch einen Filter herausfaellt, bleibt hier sichtbar. Annehmen,
              Ablehnen, Zurueckziehen, Satzstand eintragen und Bestaetigen
              passieren an Ort und Stelle. */}
          <OffenFuerDich onChange={()=>loadStandings(seasonId)}/>

        </div>

        {loading?(
          <p style={{textAlign:"center",color:P_D_LEISE,fontFamily:INTER,padding:"40px 0"}}>Lädt …</p>
        ):seasons.length===0?(
          <p style={{textAlign:"center",color:P_D_LEISE,fontFamily:INTER,padding:"40px 16px"}}>Noch keine Liga aktiv.</p>
        ):(<>

          {/* Neu hier? — Erklärung (nur Nicht-Mitglieder) */}
          {!myReg&&(
            <div className="p-lese p-abschnitt">
              <div className="p-karte">
                <div className="p-kopf"><h2><IconLiga size={22}/>So funktioniert die Liga</h2></div>
                <div style={{padding:18}}>
                {([
                  ["1","Du bist automatisch dabei","Eine Liga für alle — kein Beitreten, keine Klassen. Deine Stufe kommt aus deiner Elo."],
                  ["2","Spielen & fordern","Fordere jeden — auch den Tabellenersten. Jedes bestätigte Resultat zählt."],
                  ["3","Aufsteigen","Gewinnst du, steigst du. Filtere die Rangliste nach Stadt, Land oder Freunden."],
                ] as [string,string,string][]).map(([n,t,d])=>(
                  <div key={n} style={{display:"flex",gap:13,alignItems:"flex-start",marginBottom:14}}>
                    <span style={{width:26,flexShrink:0,fontFamily:ANTON,fontWeight:400,fontSize:22,lineHeight:1,color:P_AKZENT}}>{n}</span>
                    <div><div style={{fontSize:15,fontWeight:600,color:P_TEXT}}>{t}</div><div style={{fontSize:13,color:P_LEISE,marginTop:3,lineHeight:1.45}}>{d}</div></div>
                  </div>
                ))}
                <button onClick={join} disabled={busy} style={{...knopfOutlineHell,width:"100%",marginTop:6,cursor:busy?"not-allowed":"pointer",opacity:busy?.6:1}}>{busy?"…":userId?"Los geht's":"Anmelden und mitmachen"}</button>
                </div>
              </div>
            </div>
          )}

          {/* Rangliste — EINE Liste, alle sichtbar, in Klassen-Bänder unterteilt.
              Die Tabs oben FILTERN NICHT, sie SPRINGEN zum Band. Darüber die
              Filterleiste (Geo · Freunde · Kategorie · Stil) — das Herzstück. */}
          {/* ══ OFF-WHITE: RANKING ═══════════════════════════════════════
              Ranking ist Information und gehoert deshalb auf die helle
              Flaeche — dunkle Schrift, hoher Kontrast, keine dunkle Tabelle.
              Filter, Sprung-Tabs und die Aktionen pro Zeile sind unveraendert,
              nur neu gesetzt. */}
          <section className="p-lese p-abschnitt">
            <div className="p-karte">
              <div className="p-kopf">
                <h2><IconRangliste size={22}/>{`Ranking · ${sel?.city||city||"Schweiz"}`}</h2>
                <button onClick={()=>setFilterOpen(true)} className="p-mehr" style={{cursor:"pointer",background:"none"}}>
                  {filterAktiv?"Filter ändern":"Filtern"} →
                </button>
              </div>

              {filterAktiv&&(
                <div style={{padding:"12px 18px",borderBottom:"1px solid var(--p-kante)",fontSize:13,color:P_TEXT}}>
                  {filterLabel}
                </div>
              )}

              {/* Sprung-Tabs zu den Stufen */}
              <div style={{display:"flex",gap:6,overflowX:"auto",padding:"14px 18px",borderBottom:"1px solid var(--p-kante)"}}>
                {TIERS.map(l=>{
                  const on=l.key===ligaTab, meins=meineStufe?.key===l.key
                  const leer=!bands.some(b=>b.tier.key===l.key)
                  return(
                    <button key={l.key} onClick={()=>!leer&&springZu(l.key)} disabled={leer}
                      style={{flex:"0 0 auto",minHeight:36,padding:"0 13px",background:on?P_TEXT:"transparent",border:`1px solid ${on?P_TEXT:"var(--p-kante)"}`,color:leer?"#B8B8B4":on?"#FFFFFF":P_LEISE,fontFamily:INTER,fontSize:11,fontWeight:600,letterSpacing:".12em",textTransform:"uppercase",cursor:leer?"default":"pointer",whiteSpace:"nowrap"}}>
                      {l.name}{meins?" ·":""}
                    </button>
                  )
                })}
              </div>

              {bands.length===0&&(
                <p className="p-leer">
                  {filterAktiv?"Niemand passt zu diesem Filter.":"Noch niemand in der Rangliste."}
                </p>
              )}

              {bands.map(b=>(
                <div key={b.tier.key} ref={el=>{tierRefs.current[b.tier.key]=el}}>
                  <div style={{display:"flex",alignItems:"center",gap:9,padding:"14px 18px 8px",borderTop:"1px solid var(--p-kante)"}}>
                    <span style={{fontFamily:INTER,fontSize:11,fontWeight:600,letterSpacing:".12em",textTransform:"uppercase",color:b.tier.key===meineStufe?.key?P_AKZENT:P_LEISE}}>{b.tier.name}</span>
                    <span style={{fontFamily:INTER,fontSize:12,color:P_LEISE}}>{tierRangeLabel(b.tier.key)} · {b.rows.length}</span>
                  </div>
                  {b.rows.map(r=>{
                    const me=r.user_id===userId
                    const ini=r.name.split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase()
                    /* Die zwei Zustaende mit Zweitknopf (Annehmen ✕ / Offen ✕)
                       brauchen 120px. Auf 375px blieben dem Namen dann 49px
                       ("QA Clau…"). Diese — seltenen — Zeilen legen die Aktion
                       darum auf eine eigene Zeile; alle anderen bleiben einzeilig. */
                    const zweiKnoepfe=!me&&myReg&&openMatches[r.user_id]?.status==="challenge_sent"
                    return(
                      <div key={r.user_id} ref={me?meRef:null} className={zweiKnoepfe?"p-zeile kompakt tat-zwei":"p-zeile kompakt"} style={me?{background:"#FAFAF8"}:undefined}>
                        <span style={{width:20,textAlign:"center",flexShrink:0,fontFamily:ANTON,fontWeight:400,fontSize:18,lineHeight:1,color:me?P_AKZENT:P_LEISE,fontVariantNumeric:"tabular-nums"}}>{r.platz}</span>
                        <span style={{width:32,height:32,borderRadius:"50%",flexShrink:0,overflow:"hidden",background:"#FFFFFF",border:"1px solid var(--p-kante)",display:"grid",placeItems:"center"}}>
                          {r.avatar
                            /* eslint-disable-next-line @next/next/no-img-element */
                            ? <img src={r.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                            : <span style={{fontSize:12.5,fontWeight:600,color:P_LEISE}}>{ini}</span>}
                        </span>
                        <button onClick={()=>openPlayer(r.user_id)} style={{flex:1,minWidth:0,background:"none",border:"none",padding:0,textAlign:"left",cursor:"pointer",fontFamily:INTER}}>
                          <b className="name" style={{fontSize:15.5,fontWeight:600,lineHeight:1.3,color:P_TEXT}}>{r.name}</b>
                          <span className="name unter" style={{fontSize:13,fontWeight:400,color:P_LEISE,marginTop:3}}>{me?"Du · ":""}{tierForElo(r.elo)?.name||"Ohne Stufe"}</span>
                        </button>
                        <span style={{fontFamily:ANTON,fontWeight:400,fontSize:20,lineHeight:1,minWidth:40,textAlign:"right",flexShrink:0,color:me?P_AKZENT:P_TEXT,fontVariantNumeric:"tabular-nums"}}>{ratingLabel(r.elo)}</span>
                        {/* Die Rangliste ist wieder die Handlungsflaeche: jede fremde
                            Zeile zeigt genau den Schritt, der gerade dran ist. */}
                        {!me&&myReg&&(
                          <Tat om={openMatches[r.user_id]} userId={userId}
                            onFordern={()=>openForder(r)} onAnnehmen={acceptChallenge} onAblehnen={declineChallenge}/>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}

            </div>

            {/* ── Liga verstehen — die ECHTE Logik, keine erfundene ── */}
            <div className="p-karte p-abschnitt">
              <div className="p-kopf"><h2><IconStatistiken size={22}/>Wie steige ich auf?</h2></div>
              <div style={{padding:18}}>
                <p style={{fontSize:15,lineHeight:1.55,color:P_TEXT,margin:"0 0 10px",maxWidth:"52ch"}}>
                  Fordere Spieler rund um deinen Rang heraus. Jedes bestätigte Spiel verschiebt dein Rating — ein Sieg gegen jemand Stärkeren bringt am meisten, gegen jemand Schwächeren am wenigsten.
                </p>
                <p style={{fontSize:14,lineHeight:1.55,color:P_LEISE,margin:0,maxWidth:"52ch"}}>
                  Gegen denselben Gegner zählen höchstens {MAX_RANKED_PER_OPPONENT} Spiele pro Jahr für die Wertung. Und wer weniger als {MIN_MATCHES_PER_MONTH} gewertete Spiele im Monat hat, verliert {MONTHLY_PENALTY_ELO} Punkte. Die Stufe ist kein eigener Aufstieg, sondern ein Etikett für deinen Rating-Bereich.
                </p>
              </div>
            </div>
          </section>

          {/* ══ SCHWARZ: NÄCHSTE GEGNER ═══════════════════════════════════
              Nicht die ganze Tabelle, sondern die Leute direkt um dich herum —
              gegen die lohnt sich das Fordern. Aktionen wie in der Rangliste. */}
          {myReg&&myRow&&(()=>{
            const idx=displayRows.findIndex(r=>r.user_id===userId)
            const nah=idx<0?[]:displayRows.slice(Math.max(0,idx-2),idx+3).filter(r=>r.user_id!==userId).slice(0,4)
            if(!nah.length) return null
            return (
              <section className="p-lese p-abschnitt">
                <div className="p-karte">
                  <div className="p-kopf"><h2><IconSpieler size={22}/>Who&apos;s next?</h2></div>
                  {nah.map(r=>{
                    const ini=r.name.split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase()
                    const om=openMatches[r.user_id]
                    return (
                      <div key={r.user_id} className="p-zeile hat-cta">
                        <span style={{width:36,height:36,borderRadius:"50%",flexShrink:0,overflow:"hidden",background:"#FFFFFF",border:"1px solid var(--p-kante)",display:"grid",placeItems:"center"}}>
                          {r.avatar
                            /* eslint-disable-next-line @next/next/no-img-element */
                            ? <img src={r.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                            : <span style={{fontSize:12.5,fontWeight:600,color:P_LEISE}}>{ini}</span>}
                        </span>
                        <span style={{flex:1,minWidth:0}}>
                          <b style={{display:"block",fontSize:15.5,fontWeight:600,lineHeight:1.3,overflowWrap:"anywhere"}}>{r.name}</b>
                          <span style={{display:"block",marginTop:3,fontSize:13,fontWeight:400,color:P_LEISE}}>#{r.platz} · {ratingLabel(r.elo)} Rating</span>
                        </span>
                        <span className="cta">
                          <Tat om={om} userId={userId} breit
                            onFordern={()=>openForder(r)} onAnnehmen={acceptChallenge} onAblehnen={declineChallenge}/>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })()}

          {/* Liga anfragen — gehört ans Ende. Es richtet sich an Leute OHNE Liga,
              stand aber ganz oben bei Leuten, die längst in einer sind. */}
          <div className="p-lese p-abschnitt" style={{paddingBottom:6,textAlign:"center"}}>
            {reqDone ? (
              <div className="p-hinweis" style={{fontSize:13,lineHeight:1.5}}>
                {reqCount>1
                  ? `Danke — ${reqCount} Leute wollen eine Liga in ${reqCity}. Wir melden uns, sobald sie steht.`
                  : `Danke — wir melden uns, sobald sich genug Leute für ${reqCity} finden.`}
              </div>
            ) : reqOpen ? (
              <div className="p-karte" style={{padding:18,textAlign:"left"}}>
                <span className="p-label" style={{marginBottom:8}}>In welcher Stadt fehlt dir eine Liga?</span>
                <input value={reqCity} onChange={e=>setReqCity(e.target.value)} placeholder="z.B. Winterthur" autoFocus
                  className="p-feld" style={{marginBottom:10}}/>
                <button onClick={sendLigaAnfrage} disabled={busy||!reqCity.trim()}
                  style={{...knopfPrimaer,width:"100%",cursor:(busy||!reqCity.trim())?"not-allowed":"pointer",opacity:(busy||!reqCity.trim())?.5:1}}>
                  {busy?"…":"Anfrage senden"}
                </button>
              </div>
            ) : (
              <button onClick={()=>setReqOpen(true)} className="p-textlink" style={{minHeight:44,marginTop:0}}>
                Keine Liga in deiner Stadt? Anfragen →
              </button>
            )}
          </div>
        </>)}
      </div>

      {/* Gegner-Auswahl: "Gegen wen hast du gespielt?" → direkt ins Ergebnis-Formular */}
      {pickOpen&&(
        <div onClick={()=>setPickOpen(false)} style={O_HUELLE}>
          <div onClick={e=>e.stopPropagation()} style={{...O_BLATT,maxHeight:"84vh"}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:14}}>
              <h2 style={O_TITEL}>Gegen wen hast du gespielt?</h2>
              <button onClick={()=>setPickOpen(false)} style={O_ZU} aria-label="Schliessen">✕</button>
            </div>
            <p style={{...O_TEXT,margin:"12px 0 18px",maxWidth:"42ch"}}>Wähl deinen Gegner — danach trägst du das Resultat ein.</p>
            <div style={{border:`1px solid ${P_D_KANTE}`}}>
              {/* Nur Gegner aus dem eigenen Paar — sonst trägt ein Rookie ein
                  gewertetes Ergebnis gegen einen Elite-Spieler ein. */}
              {rows.filter(r=>r.user_id!==userId&&imPaar(r)).map((r,i)=>(
                <button key={r.user_id} onClick={()=>{setPickOpen(false); openForder(r,"result")}}
                  style={{display:"flex",alignItems:"center",gap:12,width:"100%",minHeight:52,padding:"12px 14px",background:"none",border:"none",borderTop:i===0?"none":`1px solid ${P_D_KANTE}`,cursor:"pointer",fontFamily:INTER,textAlign:"left"}}>
                  <span style={{flex:1,minWidth:0,fontSize:15,fontWeight:600,color:"#FFFFFF",overflowWrap:"anywhere"}}>{r.name}</span>
                  <span style={{...O_ZAHL,fontSize:19,flexShrink:0}}>{ratingLabel(r.elo)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Spieler-Popup: Bilanz, Siegquote, letzte Spiele, direkter Vergleich */}
      {pOpen&&(
        <div onClick={()=>setPOpen(null)} style={O_HUELLE}>
          <div onClick={e=>e.stopPropagation()} style={O_BLATT}>
            {pLoading&&<p style={{...O_TEXT,textAlign:"center",padding:"30px 0"}}>Lädt …</p>}

            {!pLoading&&pData&&(<>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:14}}>
                <div style={{minWidth:0}}>
                  <h2 style={O_TITEL}>{pData.player.name}</h2>
                  {pData.player.real_short&&<p style={{...O_TEXT,fontSize:13,margin:"6px 0 0"}}>{pData.player.real_short}</p>}
                  <p style={{...O_TEXT,fontSize:13,margin:"6px 0 0",color:"#FFFFFF"}}>Rating {ratingLabel(pData.player.elo)}</p>
                </div>
                <button onClick={()=>setPOpen(null)} style={O_ZU} aria-label="Schliessen">✕</button>
              </div>

              {/* Bilanz */}
              <div style={{display:"flex",marginTop:18,border:`1px solid ${P_D_KANTE}`}}>
                {[
                  {v:String(pData.player.matches_won), l:"Siege"},
                  {v:String(pData.player.lost),        l:"Niederlagen"},
                  {v:pData.player.winRate!==null?`${pData.player.winRate}%`:"—", l:"Siegquote"},
                ].map((s,i)=>(
                  <div key={s.l} style={{flex:1,padding:"14px 8px",textAlign:"center",borderLeft:i===0?"none":`1px solid ${P_D_KANTE}`}}>
                    <div style={{...O_ZAHL,fontSize:26}}>{s.v}</div>
                    <div style={{fontFamily:INTER,fontSize:10,color:P_D_LEISE,fontWeight:600,textTransform:"uppercase",letterSpacing:".12em",marginTop:6}}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Direkter Vergleich */}
              {pData.head&&(
                <div style={{border:`1px solid ${P_D_KANTE}`,padding:"14px 15px",marginTop:14}}>
                  <span style={{...O_LABEL,margin:"0 0 9px"}}>Ihr beide</span>
                  {pData.head.played===0
                    ? <p style={{...O_TEXT,margin:0}}>Ihr habt diese Saison noch nicht gegeneinander gespielt.</p>
                    : <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                        <span style={{...O_ZAHL,fontSize:30}}>{pData.head.myWins}</span>
                        <span style={{...O_ZAHL,fontSize:20,color:P_D_LEISE}}>:</span>
                        <span style={{...O_ZAHL,fontSize:30}}>{pData.head.theirWins}</span>
                        <span style={{...O_TEXT,fontSize:12.5,marginLeft:6}}>aus {pData.head.played} Spielen</span>
                      </div>}
                  <p style={{...O_TEXT,fontSize:12.5,margin:"10px 0 0"}}>
                    {pData.head.rankedLeft<=0
                      ? `Limit erreicht — weitere Spiele gegen ${pData.player.name} zählen nicht mehr für ELO und Rang.`
                      : `Noch ${pData.head.rankedLeft} von ${pData.maxRanked} gewerteten Spielen diese Saison.`}
                  </p>
                </div>
              )}

              {/* Letzte Spiele */}
              <span style={O_LABEL}>Letzte Spiele</span>
              {pData.recent.length===0
                ? <p style={{...O_TEXT,border:`1px solid ${P_D_KANTE}`,padding:"16px 15px",margin:0}}>Noch keine bestätigten Spiele.</p>
                : <div style={{border:`1px solid ${P_D_KANTE}`}}>
                    {pData.recent.map((m,i)=>(
                      <div key={m.id} style={{display:"flex",alignItems:"center",gap:11,padding:"11px 14px",borderTop:i===0?"none":`1px solid ${P_D_KANTE}`}}>
                        <span style={{width:22,height:22,borderRadius:0,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:INTER,fontSize:11,fontWeight:600,border:`1px solid ${m.won?"#FFFFFF":P_D_KANTE}`,background:m.won?"#FFFFFF":"transparent",color:m.won?P_DUNKEL:P_D_LEISE}}>{m.won?"S":"N"}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontFamily:INTER,fontSize:13.5,fontWeight:600,color:"#FFFFFF",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.opponent}</div>
                          {(m.date||!m.ranked)&&<div style={{...O_TEXT,fontSize:12,marginTop:2}}>
                            {m.date?new Date(m.date).toLocaleDateString("de-CH",{day:"2-digit",month:"2-digit",year:"2-digit"}):""}
                            {!m.ranked?(m.date?" · ":"")+"ohne Punkte":""}
                          </div>}
                        </div>
                        <span style={{...O_ZAHL,fontSize:18,color:m.won?"#FFFFFF":P_D_LEISE}}>{m.score}</span>
                      </div>
                    ))}
                  </div>}

              {/* Direkt fordern — auch hier nur im eigenen Paar */}
              {pOpen!==userId&&myReg&&(()=>{const row=rows.find(r=>r.user_id===pOpen); return !!row&&imPaar(row)})()&&(
                <button onClick={()=>{const row=rows.find(r=>r.user_id===pOpen); setPOpen(null); if(row) openForder(row)}}
                  style={{...knopfHell,width:"100%",marginTop:18}}>
                  Fordern
                </button>
              )}
            </>)}
          </div>
        </div>
      )}

      {/* Fordern-Popup */}
      {/* ─── FILTER-SHEET ─────────────────────────────────────────────────── */}
      {filterOpen&&(
        <div onClick={()=>setFilterOpen(false)} style={{...O_HUELLE,alignItems:"flex-end",padding:0}}>
          <div onClick={e=>e.stopPropagation()} style={{...O_BLATT,maxWidth:480,border:"none",borderTop:`1px solid ${P_D_KANTE}`,padding:"20px 18px 28px"}}>
            <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:14}}>
              <h2 style={O_TITEL}>Rangliste filtern</h2>
              <button onClick={()=>setFilter({scope:"world",canton:"",city:"",friends:false,category:"",hand:"",pips:"",anti:false})}
                style={{background:"none",border:"none",color:"#FFFFFF",fontFamily:INTER,fontSize:11,fontWeight:600,letterSpacing:".12em",textTransform:"uppercase",cursor:"pointer",flexShrink:0,minHeight:38,textDecoration:"underline",textUnderlineOffset:4}}>Zurücksetzen</button>
            </div>

            {/* Reichweite — Land / Kanton / Stadt. "Weltweit" bewusst weggelassen
                (kommt später, wenn gebraucht). Nochmal Tippen schaltet wieder ab. */}
            <span style={O_LABEL}>Reichweite</span>
            <div style={{display:"flex",gap:8}}>
              {[["country","Land"],["canton","Kanton"],["city","Stadt"]].map(([k,l])=>(
                <button key={k} onClick={()=>setFilter(f=>({...f,scope:f.scope===k?"world":k}))}
                  style={{...o_wahl(filter.scope===k),flex:1,minHeight:44,fontSize:11,fontWeight:600,letterSpacing:".12em",textTransform:"uppercase"}}>{l}</button>
              ))}
            </div>
            {filter.scope==="canton"&&(
              <select value={filter.canton} onChange={e=>setFilter(f=>({...f,canton:e.target.value}))} style={{...O_FELD,fontSize:14,marginTop:8}}>
                <option value="">Alle Kantone</option>
                {["ZH","SG","BS","LU","BE","AG"].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            )}
            {filter.scope==="city"&&(
              <select value={filter.city} onChange={e=>setFilter(f=>({...f,city:e.target.value}))} style={{...O_FELD,fontSize:14,marginTop:8}}>
                <option value="">Alle Städte</option>
                {["Glattbrugg","Zürich","St. Gallen","Basel","Luzern"].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            )}

            {/* Freunde + Kategorie */}
            <span style={O_LABEL}>Gruppen</span>
            <button onClick={()=>setFilter(f=>({...f,friends:!f.friends}))} aria-pressed={filter.friends}
              style={{...o_wahl(false),display:"flex",alignItems:"center",gap:11,width:"100%",minHeight:48,padding:"0 13px",marginBottom:8}}>
              <span style={o_haken(filter.friends)}>✓</span>
              <span style={{flex:1,textAlign:"left",fontSize:14.5,fontWeight:600,color:"#FFFFFF"}}>Nur Freunde</span>
              <IconSpieler size={17} style={{ color: P_D_LEISE }} />
            </button>
            <button onClick={()=>setFilter(f=>({...f,category:f.category==="parkinson"?"":"parkinson"}))} aria-pressed={filter.category==="parkinson"}
              style={{...o_wahl(false),display:"flex",alignItems:"center",gap:11,width:"100%",minHeight:48,padding:"0 13px"}}>
              <span style={o_haken(filter.category==="parkinson")}>✓</span>
              <span style={{flex:1,textAlign:"left",fontSize:14.5,fontWeight:600,color:"#FFFFFF"}}>Parkinson-Liga</span>
            </button>

            {/* Spielstil — kleine gleich große Ja/Nein-Haken. "Beläge" entfällt;
                Hand und Noppen sind je für sich exklusiv, Anti ist unabhängig. */}
            <span style={O_LABEL}>Spielstil</span>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {([
                ["hand","left","Links"],["hand","right","Rechts"],
                ["pips","short","Kurze Noppen"],["pips","long","Lange Noppen"],
                ["anti","1","Anti"],
              ] as [("hand"|"pips"|"anti"),string,string][]).map(([feld,wert,label])=>{
                const on = feld==="anti" ? filter.anti : filter[feld]===wert
                const toggle=()=>setFilter(f=>{
                  if(feld==="anti") return {...f,anti:!f.anti}
                  return {...f,[feld]:f[feld]===wert?"":wert}
                })
                return (
                  <button key={label} onClick={toggle} aria-pressed={on}
                    style={{...o_wahl(false),flex:"1 1 45%",display:"flex",alignItems:"center",gap:9,minHeight:44,padding:"0 11px"}}>
                    <span style={o_haken(on)}>✓</span>
                    <span style={{fontSize:13,fontWeight:600,color:on?"#FFFFFF":P_D_LEISE,textAlign:"left"}}>{label}</span>
                  </button>
                )
              })}
            </div>

            <button onClick={()=>setFilterOpen(false)} style={{...knopfHell,width:"100%",marginTop:20}}>Anzeigen</button>
          </div>
        </div>
      )}

      {fTarget&&(
        <div onClick={()=>setFTarget(null)} style={O_HUELLE}>
          <div onClick={e=>e.stopPropagation()} style={O_BLATT}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:14}}>
              <h2 style={O_TITEL}>vs {fTarget.name}</h2>
              <button onClick={()=>setFTarget(null)} style={O_ZU} aria-label="Schliessen">✕</button>
            </div>

            {/* Zählt dieses Spiel? Steht VOR der Partie da — nicht erst danach.
                Sonst wirkt ein nicht gewertetes Spiel wie ein Fehler der App. */}
            {fWertung&&(
              <p style={{...O_TEXT,fontSize:12.5,margin:"12px 0 0",maxWidth:"46ch"}}>
                {fWertung.ranked
                  ? `Zählt für ELO & Rang · ${fWertung.bisher} von ${fWertung.limit} gewerteten Spielen gegen ${fTarget.name} in den letzten 12 Monaten`
                  : `Freundschaftsspiel — ${fWertung.limit} gewertete Spiele gegen ${fTarget.name} in den letzten 12 Monaten erreicht. Das Ergebnis wird gespeichert, ändert aber ELO und Rang nicht.`}
              </p>
            )}

            {/* 24.09.2026: Der AKTIVE Reiter stand weiss auf weiss — die
                Beschriftung war unsichtbar. Aufgefallen ist es nie, weil der
                Dialog bis heute nur ueber die vier Nachbarn erreichbar war. */}
            <div style={{display:"flex",gap:8,margin:"18px 0"}}>
              {(["challenge","result"] as const).map(t=>{
                const on=fTab===t
                return <button key={t} onClick={()=>setFTab(t)} aria-pressed={on}
                  style={{...o_wahl(on),flex:1,minHeight:44,padding:"0 8px",fontSize:10.5,fontWeight:600,letterSpacing:".1em",textTransform:"uppercase"}}>{t==="challenge"?"Herausfordern":"Ergebnis eintragen"}</button>
              })}
            </div>

            {fTab==="challenge"?(
              <>
                <p style={{...O_TEXT,margin:"0 0 16px",maxWidth:"44ch"}}>Schlag eine Zeit vor — {fTarget.name} bekommt die Anfrage.</p>
                <div style={{display:"flex",gap:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <span style={{...O_LABEL,margin:"0 0 8px"}}>Datum</span>
                    <input type="date" value={fDate} onChange={e=>setFDate(e.target.value)} style={O_FELD}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <span style={{...O_LABEL,margin:"0 0 8px"}}>Zeit</span>
                    <input type="time" value={fTime} onChange={e=>setFTime(e.target.value)} style={O_FELD}/>
                  </div>
                </div>
                <button onClick={sendChallenge} disabled={busy} style={{...knopfHell,width:"100%",marginTop:22,cursor:busy?"wait":"pointer",opacity:busy?.7:1}}>{busy?"…":"Anfrage senden"}</button>
              </>
            ):(
              <>
                <p style={{...O_TEXT,margin:"0 0 16px",maxWidth:"46ch"}}>Schon gespielt? Trag die Sätze ein — {fTarget.name} bestätigt, dann zählt&apos;s für ELO &amp; Rangliste.</p>

                <div style={{marginBottom:18}}>
                  <span style={{...O_LABEL,margin:"0 0 8px"}}>Wann gespielt?</span>
                  <input type="date" max={today()} value={fRDate} onChange={e=>setFRDate(e.target.value)} style={O_FELD}/>
                </div>

                {!fDetail?(
                  <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:14}}>
                    {([["Du",fMy,setFMy],[fTarget.name,fOpp,setFOpp]] as [string,number,(n:number)=>void][]).map(([lab,val,set],idx)=>(
                      <>
                        {idx===1&&<span style={{...O_ZAHL,fontSize:30,color:P_D_LEISE,paddingBottom:4}}>:</span>}
                        <div key={idx} style={{textAlign:"center"}}>
                          <div style={{fontFamily:INTER,fontSize:10.5,color:P_D_LEISE,fontWeight:600,letterSpacing:".12em",textTransform:"uppercase",marginBottom:10,maxWidth:110,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lab}</div>
                          <div style={{display:"flex",alignItems:"center",gap:9}}>
                            <button onClick={()=>set(Math.max(0,val-1))} aria-label="weniger" style={{width:38,height:38,borderRadius:0,background:"transparent",border:`1px solid ${P_D_KANTE}`,color:"#FFFFFF",fontSize:18,cursor:"pointer",fontFamily:INTER}}>−</button>
                            <span style={{...O_ZAHL,fontSize:40,width:36,textAlign:"center"}}>{val}</span>
                            <button onClick={()=>set(Math.min(7,val+1))} aria-label="mehr" style={{width:38,height:38,borderRadius:0,background:"transparent",border:`1px solid ${P_D_KANTE}`,color:"#FFFFFF",fontSize:18,cursor:"pointer",fontFamily:INTER}}>+</button>
                          </div>
                        </div>
                      </>
                    ))}
                  </div>
                ):(
                  /* Genaue Sätze — dann steht in der Historie, was wirklich gespielt wurde */
                  <div>
                    <div style={{display:"flex",gap:10,marginBottom:10,paddingLeft:52}}>
                      <div style={{flex:1,fontFamily:INTER,fontSize:10.5,color:P_D_LEISE,fontWeight:600,letterSpacing:".12em",textTransform:"uppercase",textAlign:"center"}}>Du</div>
                      <div style={{width:10}}/>
                      <div style={{flex:1,fontFamily:INTER,fontSize:10.5,color:P_D_LEISE,fontWeight:600,letterSpacing:".12em",textTransform:"uppercase",textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fTarget.name}</div>
                    </div>
                    {fSets.map((s,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                        <span style={{width:42,flexShrink:0,fontFamily:INTER,fontSize:10.5,color:P_D_LEISE,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase"}}>Satz {i+1}</span>
                        <input type="number" inputMode="numeric" min={0} max={30} value={s.p1}
                          onChange={e=>setFSets(v=>v.map((x,j)=>j===i?{...x,p1:e.target.value}:x))}
                          placeholder="11"
                          style={{...O_FELD,flex:1,minWidth:0,width:"auto",padding:"10px 6px",fontSize:17,fontWeight:600,textAlign:"center",minHeight:44}}/>
                        <span style={{width:10,textAlign:"center",color:P_D_LEISE,fontFamily:INTER}}>:</span>
                        <input type="number" inputMode="numeric" min={0} max={30} value={s.p2}
                          onChange={e=>setFSets(v=>v.map((x,j)=>j===i?{...x,p2:e.target.value}:x))}
                          placeholder="7"
                          style={{...O_FELD,flex:1,minWidth:0,width:"auto",padding:"10px 6px",fontSize:17,fontWeight:600,textAlign:"center",minHeight:44}}/>
                        {i>=3&&(
                          <button onClick={()=>setFSets(v=>v.filter((_,j)=>j!==i))} aria-label={`Satz ${i+1} entfernen`} style={{background:"none",border:"none",color:P_D_LEISE,fontSize:15,cursor:"pointer",flexShrink:0,width:24,fontFamily:INTER}}>✕</button>
                        )}
                      </div>
                    ))}
                    {fSets.length<7&&(
                      <button onClick={()=>setFSets(v=>[...v,{p1:"",p2:""}])}
                        style={{...o_wahl(false),width:"100%",minHeight:44,color:P_D_LEISE,fontSize:11,fontWeight:600,letterSpacing:".12em",textTransform:"uppercase"}}>+ Satz</button>
                    )}
                    <div style={{textAlign:"center",marginTop:13}}>
                      <span style={{...O_ZAHL,fontSize:22}}>{satzBilanz().my} : {satzBilanz().opp}</span>
                      <span style={{...O_TEXT,fontSize:12.5,marginLeft:8}}>Sätze</span>
                    </div>
                  </div>
                )}

                {/* Umschalter: schnell zählen oder genau eintragen */}
                <button onClick={()=>setFDetail(v=>!v)}
                  style={{display:"block",width:"100%",marginTop:16,minHeight:44,background:"none",border:"none",color:P_D_LEISE,fontFamily:INTER,fontSize:11,fontWeight:600,letterSpacing:".12em",textTransform:"uppercase",cursor:"pointer",textDecoration:"underline",textUnderlineOffset:4}}>
                  {fDetail?"Nur Sätze zählen":"Satzergebnisse genau eintragen"}
                </button>
                {/* Freundschaftsspiel: Ergebnis wird gespeichert und im Chat gezeigt, zählt aber nicht */}
                <button onClick={()=>setFFriendly(v=>!v)} aria-pressed={fFriendly}
                  style={{...o_wahl(false),display:"flex",alignItems:"center",gap:11,width:"100%",marginTop:20,padding:"13px 14px",textAlign:"left"}}>
                  <span style={o_haken(fFriendly)}>✓</span>
                  <span style={{flex:1,minWidth:0}}>
                    <span style={{display:"block",fontFamily:INTER,fontSize:14,fontWeight:600,color:"#FFFFFF"}}>Freundschaftsspiel</span>
                    <span style={{...O_TEXT,display:"block",fontSize:12.5,marginTop:3}}>Zählt nicht für ELO und Rang — erscheint nur im Verlauf.</span>
                  </span>
                </button>

                {fNoteRanked&&(
                  <p style={{...O_TEXT,fontSize:12.5,border:`1px solid ${P_D_KANTE}`,padding:"11px 13px",margin:"12px 0 0"}}>{fNoteRanked}</p>
                )}

                <button onClick={sendResult} disabled={busy} style={{...knopfHell,width:"100%",marginTop:18,cursor:busy?"wait":"pointer",opacity:busy?.7:1}}>{busy?"…":fDone.length?"Weiteres Ergebnis absenden":"Ergebnis absenden"}</button>

                {fDone.length>0&&(
                  <div style={{marginTop:16,border:`1px solid ${P_D_KANTE}`,padding:"13px 14px"}}>
                    <span style={{...O_LABEL,margin:"0 0 9px"}}>Eingetragen ({fDone.length})</span>
                    <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                      {fDone.map((s,i)=>(
                        <span key={i} style={{fontFamily:INTER,fontSize:12.5,fontWeight:600,color:"#FFFFFF",border:`1px solid ${P_D_KANTE}`,padding:"5px 10px"}}>{s}</span>
                      ))}
                    </div>
                    <p style={{...O_TEXT,fontSize:12.5,margin:"11px 0 0"}}>{fTarget.name} bekommt eine E-Mail und hat 24 Std. Zeit zu bestätigen — danach zählt das Ergebnis automatisch. Du kannst gleich den nächsten Match eintragen.</p>
                    <button onClick={()=>setFTarget(null)} style={{...knopfDunkelUmriss,width:"100%",marginTop:12,minHeight:44}}>Fertig</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Chat — z-index 130: die Bottom-Nav liegt auf 100 und hat das Schreibfeld
          bisher komplett verdeckt. Man sah es schlicht nicht. */}
      {chatOpen&&(
        <div onClick={()=>setChatOpen(false)} style={{position:"fixed",inset:0,background:"rgba(8,11,13,.55)",zIndex:130,display:"flex",justifyContent:"flex-end"}}>
          {/* Der Chat ist die EINZIGE helle Flaeche unter den Overlays — hier
              gelten die hellen Tokens: Weiss, Kante #DDDDDA, Text #111111,
              Gruen #078A3B. Vorher stand hier Neon (#39FF14) auf Weiss. */}
          <div onClick={e=>e.stopPropagation()} style={{background:P_BG,borderLeft:`1px solid ${P_KANTE}`,height:"100%",width:"83%",maxWidth:380,display:"flex",flexDirection:"column",fontFamily:INTER}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderBottom:`1px solid ${P_KANTE}`,background:"#FFFFFF"}}>
              <span style={{fontFamily:INTER,fontSize:11,fontWeight:600,letterSpacing:".12em",textTransform:"uppercase",color:P_TEXT}}>Liga-Chat</span>
              <button onClick={()=>setChatOpen(false)} aria-label="Schliessen" style={{width:38,height:38,flexShrink:0,background:"none",border:"none",borderRadius:0,color:P_LEISE,fontSize:14,cursor:"pointer",fontFamily:INTER}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
              {msgs.length===0?<p style={{textAlign:"center",color:P_LEISE,fontSize:13.5,marginTop:20}}>Noch keine Nachrichten — schreib die erste.</p>:msgs.filter(m=>!m.parent_id).map(m=>{
                const kommentare=msgs.filter(k=>k.parent_id===m.id)
                if(m.kind==="match"){
                  let d:{winner:string,loser:string,wSets:number,lSets:number,detail:string,ranked?:boolean,pending?:boolean,enteredBy?:string}|null=null
                  try{d=JSON.parse(m.text)}catch{/**/}
                  const r=m.reactions
                  return(
                    <div key={m.id} style={{alignSelf:"stretch"}}>
                      <div style={{background:"#FFFFFF",border:`1px solid ${P_KANTE}`,borderRadius:0,padding:"11px 14px"}}>
                        <div style={{fontSize:10.5,fontWeight:600,color:d?.pending?P_LEISE:d?.ranked===false?P_LEISE:P_AKZENT,letterSpacing:".12em",textTransform:"uppercase",marginBottom:6}}>
                          {d?.pending?"Neues Ergebnis · wartet auf Bestätigung":d?.ranked===false?"Match · zählt nicht":"Match bestätigt"}
                        </div>
                        {d&&<>
                          <div style={{fontSize:14.5,fontWeight:600,color:P_TEXT,marginBottom:3}}>{d.winner} <span style={{color:d.pending?P_LEISE:d.ranked===false?P_LEISE:P_AKZENT}}>schlägt</span> {d.loser}</div>
                          <div style={{fontSize:12.5,color:P_LEISE,marginBottom:9}}>
                            {d.wSets}:{d.lSets} Sätze{d.detail?` · ${d.detail}`:""}{d.ranked===false?" · ohne Liga-Punkte":""}
                            {d.pending&&d.enteredBy?` · eingetragen von ${d.enteredBy}`:""}
                          </div>
                        </>}
                        <div style={{display:"flex",gap:6}}>
                          {(["heart","fire","laugh"] as const).map(type=>{
                            const emoji=type==="heart"?"❤️":type==="fire"?"🔥":"😄"
                            const cnt=r[type]
                            const active=r.myReacts.includes(type)
                            return(
                              <button key={type} onClick={()=>react(m.id,type)} aria-pressed={active} style={{display:"flex",alignItems:"center",gap:5,background:"transparent",border:`1px solid ${active?P_AKZENT:P_KANTE}`,borderRadius:0,minHeight:30,padding:"0 9px",fontSize:13,cursor:"pointer",color:P_TEXT,fontFamily:INTER}}>
                                <span>{emoji}</span>
                                {cnt>0&&<span style={{fontSize:11.5,fontWeight:600,color:active?P_AKZENT:P_LEISE}}>{cnt}</span>}
                              </button>
                            )
                          })}
                          {/* Kommentieren — das Spiel selbst ist der Gesprächsanlass */}
                          <button onClick={()=>setCmtOpen(o=>({...o,[m.id]:!o[m.id]}))}
                            style={{display:"flex",alignItems:"center",gap:6,marginLeft:"auto",background:"transparent",border:`1px solid ${P_KANTE}`,borderRadius:0,minHeight:30,padding:"0 9px",fontSize:11.5,fontWeight:600,color:kommentare.length?P_TEXT:P_LEISE,cursor:"pointer",fontFamily:INTER}}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M4 5h16v11H9l-4 3v-3H4z"/></svg>
                            {kommentare.length>0?kommentare.length:"Kommentieren"}
                          </button>
                        </div>

                        {/* Kommentare */}
                        {(kommentare.length>0||cmtOpen[m.id])&&(
                          <div style={{marginTop:11,paddingTop:11,borderTop:`1px solid ${P_KANTE}`,display:"flex",flexDirection:"column",gap:7}}>
                            {kommentare.map(k=>(
                              <div key={k.id} style={{display:"flex",gap:7,alignItems:"baseline"}}>
                                <span style={{fontSize:11.5,fontWeight:600,color:k.user_id===userId?P_AKZENT:P_LEISE,flexShrink:0}}>{k.user_id===userId?"Du":k.name}</span>
                                <span style={{fontSize:12.5,color:P_TEXT,fontWeight:400,lineHeight:1.45,wordBreak:"break-word"}}>{k.text}</span>
                              </div>
                            ))}
                            {myReg&&(
                              <div style={{display:"flex",gap:6,marginTop:3}}>
                                <input
                                  value={cmt[m.id]||""}
                                  onChange={e=>setCmt(c=>({...c,[m.id]:e.target.value}))}
                                  onKeyDown={e=>{if(e.key==="Enter")sendComment(m.id)}}
                                  placeholder="Kommentar zum Spiel …"
                                  style={{flex:1,minWidth:0,background:"#FFFFFF",border:`1px solid ${P_KANTE}`,borderRadius:0,minHeight:40,padding:"9px 12px",color:P_TEXT,fontSize:12.5,outline:"none",fontFamily:INTER}}/>
                                <button onClick={()=>sendComment(m.id)} aria-label="Kommentar senden"
                                  style={{width:40,minHeight:40,flexShrink:0,borderRadius:0,border:"none",background:P_DUNKEL,color:"#FFFFFF",fontSize:15,cursor:"pointer",fontFamily:INTER}}>→</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }
                const mine=m.user_id===userId
                return(
                  <div key={m.id} style={{maxWidth:"80%",alignSelf:mine?"flex-end":"flex-start"}}>
                    {!mine&&<div style={{fontSize:11.5,color:P_LEISE,margin:"0 0 4px 2px"}}>{m.name}</div>}
                    <div style={{background:mine?P_DUNKEL:"#FFFFFF",border:`1px solid ${mine?P_DUNKEL:P_KANTE}`,borderRadius:0,padding:"9px 12px",fontSize:13.5,fontWeight:400,lineHeight:1.5,color:mine?"#FFFFFF":P_TEXT,wordBreak:"break-word"}}>{m.text}</div>
                  </div>
                )
              })}
            </div>
            {myReg?(
              <div style={{display:"flex",gap:8,padding:"12px 14px",borderTop:`1px solid ${P_KANTE}`,background:"#FFFFFF"}}>
                <input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")send()}} placeholder="Nachricht an die Liga …" style={{flex:1,minWidth:0,background:"#FFFFFF",border:`1px solid ${P_KANTE}`,borderRadius:0,minHeight:46,padding:"11px 14px",color:P_TEXT,fontSize:13.5,outline:"none",fontFamily:INTER}}/>
                <button onClick={send} aria-label="Nachricht senden" style={{width:46,minHeight:46,flexShrink:0,borderRadius:0,border:"none",background:P_DUNKEL,color:"#FFFFFF",fontSize:16,cursor:"pointer",fontFamily:INTER}}>→</button>
              </div>
            ):(
              <p style={{padding:"14px",textAlign:"center",color:P_LEISE,fontSize:13}}>Tritt der Liga bei, um mitzuschreiben.</p>
            )}
          </div>
        </div>
      )}

      {toast&&<div style={{position:"fixed",bottom:84,left:0,right:0,display:"flex",justifyContent:"center",zIndex:120,padding:"0 20px"}}><div style={{background:P_DUNKEL,border:`1px solid ${P_D_KANTE}`,color:"#FFFFFF",borderRadius:0,padding:"11px 18px",fontFamily:INTER,fontSize:13,textAlign:"center"}}>{toast}</div></div>}
      <BottomNav />
    </main>
  )
}
