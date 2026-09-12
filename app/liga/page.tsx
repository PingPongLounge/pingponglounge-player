"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import BottomNav from "@/app/components/BottomNav"
import PendingConfirmBanner from "@/app/components/PendingConfirmBanner"
import NotificationBell from "@/app/components/NotificationBell"
import { MAX_RANKED_PER_OPPONENT, RANKED_WINDOW_MONTHS, MIN_MATCHES_PER_MONTH, MONTHLY_PENALTY_ELO, TIERS, tierForElo, tierRangeLabel, type TierKey } from "@/lib/rewards"
import {
  BG, CARD, CELL, W, SUB, MUT, GREEN, LINE,
  gt, GRAD, card, ratingLabel,
  SCHWARZ, CREME, VIOLETT, ANTON, INTER,
} from "@/app/theme"
import HeroKopf from "@/app/components/HeroKopf"
import {
  Hero, Inhalt, AbschnittKopf, Feld, StatsReihe, GrosseZahl, ListenZeile, Pille,
  knopfPrimaer, knopfKlein, knopfOutlineHell, TEXT_LEISE, FLAECHE,
} from "@/app/components/V2"

const C=CARD, B=CELL, M=SUB
const SHADOW="0 1px 4px rgba(0,0,0,.14)"

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
      if(r.status===401){ window.location.href="/login"; return }
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
    setBusy(true)
    // season_id wird serverseitig gesetzt — es gibt nur eine öffentliche Liga.
    const r=await fetch("/api/liga/register",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"})
    const j=await r.json().catch(()=>({}))
    if(r.ok){flash("✓ Du bist dabei!");loadStandings(seasonId)} else flash(j.error||"Fehler")
    setBusy(false)
  }
  async function challenge(pid:string){
    const r=await fetch("/api/liga/challenge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({season_id:seasonId,challenged_id:pid})})
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
  // Session abgelaufen → sauber zum Login statt "Fehler" anzuzeigen
  function checkAuth(r:Response){
    if(r.status===401){ window.location.href="/login"; return false }
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
    const j=await r.json().catch(()=>({}))
    if(r.ok){flash("✓ Angenommen — jetzt Spiel eintragen");loadStandings(seasonId)}
    else flash(j.error||"Fehler")
  }
  async function react(messageId:string,type:string){
    await fetch("/api/liga/message-react",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message_id:messageId,type})})
    loadChat(seasonId)
  }
  async function send(){
    const t=msg.trim(); if(!t) return
    setMsg("")
    await fetch("/api/liga/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({season_id:seasonId,text:t})})
    loadChat(seasonId)
  }
  // Kommentar zu EINEM Spiel — hängt als Antwort unter dem Match-Post.
  async function sendComment(parentId:string){
    const t=(cmt[parentId]||"").trim(); if(!t) return
    setCmt(c=>({...c,[parentId]:""}))
    await fetch("/api/liga/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({season_id:seasonId,text:t,parent_id:parentId})})
    loadChat(seasonId)
  }

  // Keine Stadt-/Klassen-Auswahl mehr (cities/citySeasons/isPro sind entfallen):
  // es gibt genau eine öffentliche Liga. `sel` ist die gerade gezeigte.
  const sel=seasons.find(s=>s.id===seasonId)
  const myIndex=rows.findIndex(r=>r.user_id===userId)
  const myRow=myIndex>=0?rows[myIndex]:null

  // Die Liga ist ein PLATZ in der Tabelle, kein Level-Etikett:
  // Stufen kommen aus der ELO, NICHT mehr aus dem Tabellenplatz. Damit hat ein
  // Spieler überall dieselbe Stufe — egal wie viele Leute gerade angezeigt
  // werden oder wie gefiltert wird. Die Stufe ist ein Etikett, keine Liga.
  const meinRang=myIndex>=0?myIndex+1:0
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

  return (
    <main style={{minHeight:"100vh",background:FLAECHE,paddingBottom:90}}>
      {/* Topbar — dunkel. Grün nur im Logo und im Zähler: eine grelle Leiste war
          das Lauteste auf dem Screen und sagte nichts. Ein Akzent pro Screen. */}
      {/* 07.09.2026: Der eigene Kopfbalken ist weg — PPL., Glocke und Menue
         sitzen jetzt in HeroKopf ueber dem Foto, der Liga-Chat als Knopf im
         Hero. Vorher standen hier zwei Koepfe uebereinander. */}

      {/* Liga-Umschalter: öffentliche Liga ↔ private Firmen-Ligen */}
      {showCity&&(
        <div onClick={()=>setShowCity(false)} style={{position:"fixed",inset:0,zIndex:20}}>
          <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:74,right:14,background:"#121214",borderRadius:14,padding:6,minWidth:180}}>
            {seasons.map(s=>(
              <div key={s.id} onClick={()=>{setSeasonId(s.id);setCity(s.city);setShowCity(false)}} style={{padding:"11px 12px",borderRadius:9,fontSize:14,fontWeight:s.id===seasonId?600:400,color:s.id===seasonId?GREEN:W,cursor:"pointer"}}>
                {s.name}{s.is_private?" · privat":""}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ppl-huelle">
        {/* ══ HERO nach Referenz-Mockup ══════════════════════════════ */}
        <Hero
          bild="/hero-pokal.jpg" pos="58% 42%"
          kopf={<HeroKopf/>}
          etikett="PPL League"
          titel={sel?.is_private?sel.name:<>Die Ping Pong<br/>Liga der Schweiz.</>}
          subline={<>Steig im Ranking auf und fordere<br/>Spieler auf deinem Niveau heraus.</>}
        />

        {/* ══ DEIN RANG — die Zahl gehoert auf die helle Flaeche ══ */}
        <Inhalt unten={6}>
          {seasons.length>1&&(
            <div style={{marginBottom:16}}>
              <button onClick={()=>setShowCity(v=>!v)} style={{background:"rgba(8,8,8,.06)",color:SCHWARZ,fontSize:12.5,fontWeight:800,cursor:"pointer",borderRadius:100,padding:"8px 14px",fontFamily:INTER}}>{sel?.name||"League"} ▾</button>
            </div>
          )}

          {myReg&&myRow?(
            <>
              <AbschnittKopf titel="Dein Rang"/>
              <Feld padding="18px 16px 0">
                <GrosseZahl
                  wert={`#${meinRang}`}
                  rechts={
                    <span style={{fontFamily:INTER,fontSize:14,color:TEXT_LEISE,lineHeight:1.5}}>
                      {meineStufe?<b style={{display:"block",color:SCHWARZ,fontSize:15}}>{meineStufe.name}</b>:null}
                      {sel?.city||city||"Schweiz"}
                    </span>
                  }
                />
                <div style={{borderTop:"1px solid rgba(8,8,8,.10)",marginTop:16}}>
                  <StatsReihe werte={[
                    {wert:ratingLabel(myRow.elo),label:"Rating"},
                    {wert:monatCount,label:"Diesen Monat"},
                    {wert:`${monatCount}/${MIN_MATCHES_PER_MONTH}`,label:"Monatssoll",akzent:!monatOk},
                  ]}/>
                </div>
              </Feld>

              {!monatOk&&(
                <p style={{fontFamily:INTER,fontSize:13.5,color:TEXT_LEISE,margin:"10px 2px 0"}}>
                  Noch {MIN_MATCHES_PER_MONTH-monatCount} gewertete Spiele bis Monatsende, sonst −{MONTHLY_PENALTY_ELO} Punkte.
                </p>
              )}

              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:18,maxWidth:480}}>
                {rows.length>1&&(
                  <button onClick={()=>setPickOpen(true)} style={{...knopfPrimaer,flex:"1 1 170px"}}>Ergebnis eintragen</button>
                )}
                <button onClick={()=>setChatOpen(true)} style={{...knopfOutlineHell,flex:"1 1 130px",position:"relative"}}>
                  Liga-Chat
                  {ungelesen>0&&(
                    <span style={{marginLeft:9,minWidth:20,height:20,borderRadius:100,background:VIOLETT,color:"#FFFFFF",fontSize:11,fontWeight:900,display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"0 6px"}}>{ungelesen>9?"9+":ungelesen}</span>
                  )}
                </button>
              </div>
              {letzteNachricht&&(
                <div style={{fontFamily:INTER,fontSize:13.5,color:TEXT_LEISE,marginTop:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{letzteNachricht}</div>
              )}
            </>
          ):(
            <Feld padding={20}>
              <p style={{fontFamily:INTER,fontSize:15.5,color:TEXT_LEISE,lineHeight:1.55,margin:"0 0 18px",maxWidth:"46ch"}}>
                Eine Liga für alle — kein Beitreten in Klassen. Deine Stufe kommt aus deinem Rating. Fordere jeden, auch die Nummer eins.
              </p>
              <button onClick={join} disabled={busy} style={{...knopfPrimaer,width:"100%",maxWidth:360,opacity:busy?.6:1}}>
                {busy?"…":"Los geht's"}
              </button>
            </Feld>
          )}

          <div style={{marginTop:18}}><PendingConfirmBanner/></div>
        </Inhalt>

        {loading?(
          <p style={{textAlign:"center",color:M,padding:"40px 0"}}>Lädt …</p>
        ):seasons.length===0?(
          <p style={{textAlign:"center",color:M,padding:"40px 16px"}}>Noch keine Liga aktiv.</p>
        ):(<>

          {/* Neu hier? — Erklärung (nur Nicht-Mitglieder) */}
          {!myReg&&(
            <div style={{padding:"4px 14px 0"}}>
              <div style={{borderRadius:16,padding:20,background:"#FFFFFF"}}>
                <div style={{fontSize:11.5,fontWeight:900,letterSpacing:".14em",textTransform:"uppercase",color:VIOLETT}}>Neu hier?</div>
                <div style={{fontFamily:ANTON,fontWeight:400,fontSize:26,textTransform:"uppercase",color:SCHWARZ,margin:"8px 0 16px"}}>So funktioniert die Liga</div>
                {([
                  ["1","Du bist automatisch dabei","Eine Liga für alle — kein Beitreten, keine Klassen. Deine Stufe kommt aus deiner Elo."],
                  ["2","Spielen & fordern","Fordere jeden — auch den Tabellenersten. Jedes bestätigte Resultat zählt."],
                  ["3","Aufsteigen","Gewinnst du, steigst du. Filtere die Rangliste nach Stadt, Land oder Freunden."],
                ] as [string,string,string][]).map(([n,t,d])=>(
                  <div key={n} style={{display:"flex",gap:13,alignItems:"flex-start",marginBottom:14}}>
                    <span style={{width:27,height:27,borderRadius:"50%",background:GRAD,color:"#FFFFFF",fontSize:13,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{n}</span>
                    <div><div style={{fontSize:14.5,fontWeight:800,color:SCHWARZ}}>{t}</div><div style={{fontSize:13,color:TEXT_LEISE,marginTop:2,lineHeight:1.4}}>{d}</div></div>
                  </div>
                ))}
                <button onClick={join} disabled={busy} style={{...knopfPrimaer,display:"flex",width:"100%",marginTop:6,cursor:busy?"not-allowed":"pointer",opacity:busy?.6:1}}>{busy?"…":"Los geht's"}</button>
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
          <section style={{background:FLAECHE,color:SCHWARZ}}>
            <div className="ppl-breit" style={{paddingTop:26,paddingBottom:30}}>
              <AbschnittKopf titel={`Ranking · ${sel?.city||city||"Schweiz"}`}/>

              {/* Filter */}
              <button onClick={()=>setFilterOpen(true)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:"rgba(8,8,8,.05)",border:"1px solid rgba(8,8,8,.14)",borderRadius:100,padding:"11px 16px",cursor:"pointer",fontFamily:INTER,marginBottom:12}}>
                <span style={{display:"flex",alignItems:"center",gap:9,minWidth:0}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={filterAktiv?VIOLETT:"rgba(8,8,8,.6)"} strokeWidth="2"><path d="M4 5h16M7 12h10M10 19h4"/></svg>
                  <span style={{fontSize:14,fontWeight:700,color:filterAktiv?SCHWARZ:"rgba(8,8,8,.66)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{filterAktiv?filterLabel:"Rangliste filtern"}</span>
                </span>
                <span style={{fontSize:12,color:"rgba(8,8,8,.5)",flexShrink:0}}>{filterAktiv?"ändern":"▾"}</span>
              </button>

              {/* Sprung-Tabs zu den Stufen */}
              <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,marginBottom:14}}>
                {TIERS.map(l=>{
                  const on=l.key===ligaTab, meins=meineStufe?.key===l.key
                  const leer=!bands.some(b=>b.tier.key===l.key)
                  return(
                    <button key={l.key} onClick={()=>!leer&&springZu(l.key)} disabled={leer}
                      style={{flex:"0 0 auto",borderRadius:100,padding:"8px 14px",background:on?SCHWARZ:"transparent",border:`1px solid ${on?SCHWARZ:"rgba(8,8,8,.2)"}`,color:leer?"rgba(8,8,8,.32)":on?CREME:"rgba(8,8,8,.7)",fontFamily:INTER,fontSize:12,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase",cursor:leer?"default":"pointer",whiteSpace:"nowrap"}}>
                      {l.name}{meins?" ·":""}
                    </button>
                  )
                })}
              </div>

              {bands.length===0&&(
                <div style={{fontSize:16,color:"rgba(8,8,8,.6)",padding:"24px 0",lineHeight:1.6}}>
                  {filterAktiv?"Niemand passt zu diesem Filter.":"Noch niemand in der Rangliste."}
                </div>
              )}

              {bands.map(b=>(
                <div key={b.tier.key} ref={el=>{tierRefs.current[b.tier.key]=el}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,margin:"18px 0 2px"}}>
                    <span style={{fontFamily:INTER,fontSize:12,fontWeight:900,letterSpacing:".13em",textTransform:"uppercase",color:b.tier.key===meineStufe?.key?VIOLETT:"rgba(8,8,8,.55)"}}>{b.tier.name}</span>
                    <span style={{fontFamily:INTER,fontSize:13,color:"rgba(8,8,8,.45)"}}>{tierRangeLabel(b.tier.key)} · {b.rows.length}</span>
                    <div style={{flex:1,height:1,background:"rgba(8,8,8,.16)"}}/>
                  </div>
                  {b.rows.map(r=>{
                    const me=r.user_id===userId
                    const ini=r.name.split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase()
                    return(
                      <div key={r.user_id} ref={me?meRef:null} style={{display:"flex",alignItems:"center",gap:11,padding:"12px 10px",marginLeft:me?-10:0,marginRight:me?-10:0,borderTop:"1px solid rgba(8,8,8,.12)",...(me?{background:"rgba(140,61,255,.13)",borderRadius:10,borderTop:"1px solid rgba(140,61,255,.28)"}:{})}}>
                        <span style={{width:28,textAlign:"center",flexShrink:0,fontFamily:ANTON,fontSize:20,color:me?VIOLETT:"rgba(8,8,8,.45)",fontVariantNumeric:"tabular-nums"}}>{r.platz}</span>
                        <div style={{width:38,height:38,borderRadius:"50%",flexShrink:0,overflow:"hidden",background:"rgba(8,8,8,.10)",display:"grid",placeItems:"center"}}>
                          {r.avatar
                            /* eslint-disable-next-line @next/next/no-img-element */
                            ? <img src={r.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                            : <span style={{fontFamily:INTER,fontSize:13,fontWeight:800,color:"rgba(8,8,8,.5)"}}>{ini}</span>}
                        </div>
                        <button onClick={()=>openPlayer(r.user_id)} style={{flex:1,minWidth:0,background:"none",border:"none",padding:0,textAlign:"left",cursor:"pointer",fontFamily:INTER,overflow:"hidden"}}>
                          <span style={{display:"block",fontSize:17,fontWeight:700,color:SCHWARZ,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.name}</span>
                          <span style={{display:"block",fontSize:13,color:"rgba(8,8,8,.55)",marginTop:2}}>{me?"Du · ":""}{tierForElo(r.elo)?.name||"Ohne Stufe"}</span>
                        </button>
                        <span style={{fontFamily:ANTON,fontSize:22,minWidth:56,textAlign:"right",flexShrink:0,color:me?VIOLETT:SCHWARZ,fontVariantNumeric:"tabular-nums"}}>{ratingLabel(r.elo)}</span>
                      </div>
                    )
                  })}
                </div>
              ))}

              {/* ── Liga verstehen — die ECHTE Logik, keine erfundene ── */}
              <div style={{marginTop:30,borderTop:"1px solid rgba(8,8,8,.18)",paddingTop:22}}>
                <AbschnittKopf titel="Liga verstehen"/>
                <h3 style={{fontFamily:ANTON,fontWeight:400,fontSize:"clamp(24px,6.5vw,32px)",lineHeight:.98,textTransform:"uppercase",margin:"8px 0 12px",color:SCHWARZ}}>Wie steige ich auf?</h3>
                <p style={{fontFamily:INTER,fontSize:16,lineHeight:1.55,color:"rgba(8,8,8,.72)",margin:"0 0 10px",maxWidth:"52ch"}}>
                  Fordere Spieler rund um deinen Rang heraus. Jedes bestätigte Spiel verschiebt dein Rating — ein Sieg gegen jemand Stärkeren bringt am meisten, gegen jemand Schwächeren am wenigsten.
                </p>
                <p style={{fontFamily:INTER,fontSize:15,lineHeight:1.55,color:"rgba(8,8,8,.58)",margin:0,maxWidth:"52ch"}}>
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
              <section style={{background:FLAECHE}}>
                <div className="ppl-breit" style={{paddingTop:4,paddingBottom:34}}>
                <AbschnittKopf titel="Who's next?"/>
                <Feld>
                  {nah.map(r=>{
                    const ini=r.name.split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase()
                    const om=openMatches[r.user_id]
                    return (
                      <ListenZeile
                        key={r.user_id}
                        erste={nah[0].user_id===r.user_id}
                        links={
                          <div style={{width:40,height:40,borderRadius:"50%",flexShrink:0,overflow:"hidden",background:"rgba(8,8,8,.08)",display:"grid",placeItems:"center"}}>
                            {r.avatar
                              /* eslint-disable-next-line @next/next/no-img-element */
                              ? <img src={r.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                              : <span style={{fontFamily:INTER,fontSize:13,fontWeight:800,color:TEXT_LEISE}}>{ini}</span>}
                          </div>
                        }
                        titel={r.name}
                        unter={`#${r.platz} · ${ratingLabel(r.elo)} Rating`}
                        rechts={
                          !om
                            ? <button onClick={()=>openForder(r)} style={knopfKlein}>Herausfordern</button>
                            : om.status==="challenge_sent"&&!om.iAmP1
                              ? <button onClick={()=>acceptChallenge(om.id)} style={knopfKlein}>Annehmen</button>
                              : <button onClick={()=>openPlayer(r.user_id)} style={{background:"none",border:"none",padding:0,cursor:"pointer"}}><Pille text="Profil"/></button>}
                      />
                    )
                  })}
                </Feld>
                </div>
              </section>
            )
          })()}

          {/* Liga anfragen — gehört ans Ende. Es richtet sich an Leute OHNE Liga,
              stand aber ganz oben bei Leuten, die längst in einer sind. */}
          <div style={{padding:"18px 14px 6px",textAlign:"center"}}>
            {reqDone ? (
              <div style={{fontSize:13,color:TEXT_LEISE,lineHeight:1.5}}>
                {reqCount>1
                  ? `Danke — ${reqCount} Leute wollen eine Liga in ${reqCity}. Wir melden uns, sobald sie steht.`
                  : `Danke — wir melden uns, sobald sich genug Leute für ${reqCity} finden.`}
              </div>
            ) : reqOpen ? (
              <div style={{background:"#FFFFFF",borderRadius:16,padding:16,textAlign:"left"}}>
                <div style={{fontSize:14,fontWeight:800,color:SCHWARZ,marginBottom:10}}>In welcher Stadt fehlt dir eine Liga?</div>
                <input value={reqCity} onChange={e=>setReqCity(e.target.value)} placeholder="z.B. Winterthur" autoFocus
                  style={{width:"100%",boxSizing:"border-box",background:"rgba(8,8,8,.05)",border:"1px solid rgba(8,8,8,.14)",borderRadius:12,padding:"12px 14px",color:SCHWARZ,fontSize:14,outline:"none",fontFamily:"inherit",marginBottom:10}}/>
                <button onClick={sendLigaAnfrage} disabled={busy||!reqCity.trim()}
                  style={{...knopfPrimaer,display:"flex",width:"100%",cursor:(busy||!reqCity.trim())?"not-allowed":"pointer",opacity:(busy||!reqCity.trim())?.5:1}}>
                  {busy?"…":"Anfrage senden"}
                </button>
              </div>
            ) : (
              <button onClick={()=>setReqOpen(true)}
                style={{background:"none",color:MUT,fontSize:12.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit",padding:6}}>
                Keine Liga in deiner Stadt? Anfragen →
              </button>
            )}
          </div>
        </>)}
      </div>

      {/* Gegner-Auswahl: "Gegen wen hast du gespielt?" → direkt ins Ergebnis-Formular */}
      {pickOpen&&(
        <div onClick={()=>setPickOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:420,background:CARD,borderRadius:24,padding:"24px 20px",maxHeight:"84vh",overflowY:"auto",boxShadow:"0 30px 80px rgba(0,0,0,.6)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
              <div style={{fontSize:20,fontWeight:900,color:W}}>Gegen wen hast du gespielt?</div>
              <button onClick={()=>setPickOpen(false)} style={{background:"none",color:MUT,fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{fontSize:13,color:SUB,fontWeight:300,marginBottom:16}}>Wähl deinen Gegner — danach trägst du das Resultat ein.</div>
            <div style={{background:CELL,borderRadius:14,overflow:"hidden"}}>
              {/* Nur Gegner aus dem eigenen Paar — sonst trägt ein Rookie ein
                  gewertetes Ergebnis gegen einen Elite-Spieler ein. */}
              {rows.filter(r=>r.user_id!==userId&&imPaar(r)).map((r,i)=>(
                <button key={r.user_id} onClick={()=>{setPickOpen(false); openForder(r,"result")}}
                  style={{display:"flex",alignItems:"center",gap:11,width:"100%",padding:"13px 14px",background:"none",borderTop:i===0?"none":`1px solid ${LINE}`,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14.5,fontWeight:800,color:W}}>{r.name}</div>
                  </div>
                  <span style={{fontSize:14,fontWeight:800,color:SUB}}>{ratingLabel(r.elo)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Spieler-Popup: Bilanz, Siegquote, letzte Spiele, direkter Vergleich */}
      {pOpen&&(
        <div onClick={()=>setPOpen(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:420,background:CARD,borderRadius:24,padding:"24px 20px",maxHeight:"88vh",overflowY:"auto",boxShadow:"0 30px 80px rgba(0,0,0,.6)"}}>
            {pLoading&&<div style={{textAlign:"center",color:MUT,fontSize:13,padding:"30px 0"}}>lädt…</div>}

            {!pLoading&&pData&&(<>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:18}}>
                <div>
                  <div style={{fontSize:22,fontWeight:900,color:W}}>{pData.player.name}</div>
                  {pData.player.real_short&&<div style={{fontSize:12.5,color:MUT,marginTop:2}}>{pData.player.real_short}</div>}
                  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
                    <span style={{fontSize:14,fontWeight:800,...gt}}>Rating {ratingLabel(pData.player.elo)}</span>
                  </div>
                </div>
                <button onClick={()=>setPOpen(null)} style={{background:"none",color:MUT,fontSize:20,cursor:"pointer"}}>✕</button>
              </div>

              {/* Bilanz */}
              <div style={{display:"flex",gap:8,marginBottom:16}}>
                {[
                  {v:String(pData.player.matches_won), l:"Siege"},
                  {v:String(pData.player.lost),        l:"Niederlagen"},
                  {v:pData.player.winRate!==null?`${pData.player.winRate}%`:"—", l:"Siegquote"},
                ].map(s=>(
                  <div key={s.l} style={{flex:1,background:CELL,borderRadius:14,padding:"13px 8px",textAlign:"center"}}>
                    <div style={{fontSize:20,fontWeight:900,color:W}}>{s.v}</div>
                    <div style={{fontSize:10,color:MUT,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em",marginTop:2}}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Direkter Vergleich */}
              {pData.head&&(
                <div style={{background:CELL,borderRadius:14,padding:"14px 15px",marginBottom:16}}>
                  <div style={{fontSize:10.5,fontWeight:700,color:MUT,textTransform:"uppercase",letterSpacing:".08em",marginBottom:9}}>Ihr beide</div>
                  {pData.head.played===0
                    ? <div style={{fontSize:13,color:SUB,fontWeight:300}}>Ihr habt diese Saison noch nicht gegeneinander gespielt.</div>
                    : <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                        <span style={{fontSize:24,fontWeight:900,...gt}}>{pData.head.myWins}</span>
                        <span style={{fontSize:16,fontWeight:900,color:MUT}}>:</span>
                        <span style={{fontSize:24,fontWeight:900,color:W}}>{pData.head.theirWins}</span>
                        <span style={{fontSize:12,color:MUT,marginLeft:6}}>aus {pData.head.played} Spielen</span>
                      </div>}
                  <div style={{fontSize:11.5,color:pData.head.rankedLeft<=0?MUT:SUB,marginTop:9,lineHeight:1.5}}>
                    {pData.head.rankedLeft<=0
                      ? `Limit erreicht — weitere Spiele gegen ${pData.player.name} zählen nicht mehr für ELO und Rang.`
                      : `Noch ${pData.head.rankedLeft} von ${pData.maxRanked} gewerteten Spielen diese Saison.`}
                  </div>
                </div>
              )}

              {/* Letzte Spiele */}
              <div style={{fontSize:10.5,fontWeight:700,color:MUT,textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>Letzte Spiele</div>
              {pData.recent.length===0
                ? <div style={{background:CELL,borderRadius:14,padding:"16px 15px",fontSize:13,color:SUB,fontWeight:300}}>Noch keine bestätigten Spiele.</div>
                : <div style={{background:CELL,borderRadius:14,overflow:"hidden"}}>
                    {pData.recent.map((m,i)=>(
                      <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",borderTop:i===0?"none":`1px solid ${LINE}`}}>
                        <span style={{width:22,height:22,borderRadius:6,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,background:m.won?GRAD:"#0E0E10",color:m.won?"#FFFFFF":MUT}}>{m.won?"S":"N"}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:700,color:W,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.opponent}</div>
                          {(m.date||!m.ranked)&&<div style={{fontSize:10.5,color:MUT,marginTop:1}}>
                            {m.date?new Date(m.date).toLocaleDateString("de-CH",{day:"2-digit",month:"2-digit",year:"2-digit"}):""}
                            {!m.ranked?(m.date?" · ":"")+"ohne Punkte":""}
                          </div>}
                        </div>
                        <span style={{fontSize:14,fontWeight:900,color:m.won?W:MUT}}>{m.score}</span>
                      </div>
                    ))}
                  </div>}

              {/* Direkt fordern — auch hier nur im eigenen Paar */}
              {pOpen!==userId&&myReg&&(()=>{const row=rows.find(r=>r.user_id===pOpen); return !!row&&imPaar(row)})()&&(
                <button onClick={()=>{const row=rows.find(r=>r.user_id===pOpen); setPOpen(null); if(row) openForder(row)}}
                  style={{display:"block",width:"100%",textAlign:"center",marginTop:18,background:GRAD,color:"#FFFFFF",borderRadius:14,padding:15,fontSize:15,fontWeight:800,textTransform:"uppercase",letterSpacing:".03em",cursor:"pointer",fontFamily:"inherit"}}>
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
        <div onClick={()=>setFilterOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:480,background:CARD,borderTopLeftRadius:24,borderTopRightRadius:24,padding:"20px 18px 28px",maxHeight:"88vh",overflowY:"auto"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div style={{fontSize:19,fontWeight:900,color:W}}>Rangliste filtern</div>
              <button onClick={()=>setFilter({scope:"world",canton:"",city:"",friends:false,category:"",hand:"",pips:"",anti:false})} style={{background:"none",color:GREEN,fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Zurücksetzen</button>
            </div>

            {/* Reichweite — Land / Kanton / Stadt. "Weltweit" bewusst weggelassen
                (kommt später, wenn gebraucht). Nochmal Tippen schaltet wieder ab. */}
            <div style={{fontSize:10.5,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase",color:MUT,margin:"4px 2px 8px"}}>Reichweite</div>
            <div style={{display:"flex",gap:7,marginBottom:6}}>
              {[["country","Land"],["canton","Kanton"],["city","Stadt"]].map(([k,l])=>(
                <button key={k} onClick={()=>setFilter(f=>({...f,scope:f.scope===k?"world":k}))} style={{flex:1,fontSize:12.5,fontWeight:700,padding:"9px 4px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",...(filter.scope===k?{background:GRAD,color:"#FFFFFF"}:{background:CELL,color:SUB})}}>{l}</button>
              ))}
            </div>
            {filter.scope==="canton"&&(
              <select value={filter.canton} onChange={e=>setFilter(f=>({...f,canton:e.target.value}))} style={{width:"100%",background:CELL,borderRadius:12,padding:"12px 13px",color:W,fontSize:14,fontFamily:"inherit",marginTop:6}}>
                <option value="">Alle Kantone</option>
                {["ZH","SG","BS","LU","BE","AG"].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            )}
            {filter.scope==="city"&&(
              <select value={filter.city} onChange={e=>setFilter(f=>({...f,city:e.target.value}))} style={{width:"100%",background:CELL,borderRadius:12,padding:"12px 13px",color:W,fontSize:14,fontFamily:"inherit",marginTop:6}}>
                <option value="">Alle Städte</option>
                {["Glattbrugg","Zürich","St. Gallen","Basel","Luzern"].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            )}

            {/* Freunde + Kategorie */}
            <div style={{fontSize:10.5,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase",color:MUT,margin:"16px 2px 8px"}}>Gruppen</div>
            <button onClick={()=>setFilter(f=>({...f,friends:!f.friends}))} style={{display:"flex",alignItems:"center",gap:10,width:"100%",background:CELL,borderRadius:12,padding:"12px 13px",cursor:"pointer",fontFamily:"inherit",marginBottom:8}}>
              <span style={{width:20,height:20,borderRadius:6,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,...(filter.friends?{background:GRAD,color:"#FFFFFF"}:{background:"#0E0E10",color:"transparent"})}}>✓</span>
              <span style={{flex:1,textAlign:"left",fontSize:14,fontWeight:600,color:W}}>Nur Freunde</span>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={SUB} strokeWidth="2"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><path d="M17 8v5M14.5 10.5h5"/></svg>
            </button>
            <button onClick={()=>setFilter(f=>({...f,category:f.category==="parkinson"?"":"parkinson"}))} style={{display:"flex",alignItems:"center",gap:10,width:"100%",background:CELL,borderRadius:12,padding:"12px 13px",cursor:"pointer",fontFamily:"inherit"}}>
              <span style={{width:20,height:20,borderRadius:6,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,...(filter.category==="parkinson"?{background:GRAD,color:"#FFFFFF"}:{background:"#0E0E10",color:"transparent"})}}>✓</span>
              <span style={{flex:1,textAlign:"left",fontSize:14,fontWeight:600,color:W}}>Parkinson-Liga</span>
            </button>

            {/* Spielstil — kleine gleich große Ja/Nein-Haken. "Beläge" entfällt;
                Hand und Noppen sind je für sich exklusiv, Anti ist unabhängig. */}
            <div style={{fontSize:10.5,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase",color:MUT,margin:"16px 2px 8px"}}>Spielstil</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
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
                  <button key={label} onClick={toggle} style={{flex:"1 1 45%",display:"flex",alignItems:"center",gap:8,background:CELL,borderRadius:10,padding:"10px 11px",cursor:"pointer",fontFamily:"inherit"}}>
                    <span style={{width:17,height:17,borderRadius:5,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,...(on?{background:GRAD,color:"#FFFFFF"}:{background:"#0E0E10",color:"transparent"})}}>✓</span>
                    <span style={{fontSize:12.5,fontWeight:600,color:on?W:SUB}}>{label}</span>
                  </button>
                )
              })}
            </div>

            <button onClick={()=>setFilterOpen(false)} style={{width:"100%",background:GRAD,color:"#FFFFFF",borderRadius:14,padding:15,fontSize:15,fontWeight:800,textTransform:"uppercase",letterSpacing:".03em",cursor:"pointer",fontFamily:"inherit",marginTop:18}}>Anzeigen</button>
          </div>
        </div>
      )}

      {fTarget&&(
        <div onClick={()=>setFTarget(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:420,background:CARD,borderRadius:24,padding:"24px 20px",maxHeight:"88vh",overflowY:"auto",boxShadow:"0 30px 80px rgba(0,0,0,.6)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontSize:20,fontWeight:900,color:W}}>vs {fTarget.name}</div>
              <button onClick={()=>setFTarget(null)} style={{background:"none",color:MUT,fontSize:20,cursor:"pointer"}}>✕</button>
            </div>

            {/* Zählt dieses Spiel? Steht VOR der Partie da — nicht erst danach.
                Sonst wirkt ein nicht gewertetes Spiel wie ein Fehler der App. */}
            {fWertung&&(
              <div style={{marginTop:10,fontSize:12.5,fontWeight:600,color:fWertung.ranked?SUB:MUT,lineHeight:1.5}}>
                {fWertung.ranked
                  ? `Zählt für ELO & Rang · ${fWertung.bisher} von ${fWertung.limit} gewerteten Spielen gegen ${fTarget.name} in den letzten 12 Monaten`
                  : `Freundschaftsspiel — ${fWertung.limit} gewertete Spiele gegen ${fTarget.name} in den letzten 12 Monaten erreicht. Das Ergebnis wird gespeichert, ändert aber ELO und Rang nicht.`}
              </div>
            )}

            <div style={{display:"flex",gap:8,margin:"16px 0 18px"}}>
              {(["challenge","result"] as const).map(t=>{
                const on=fTab===t
                return <button key={t} onClick={()=>setFTab(t)} style={{flex:1,borderRadius:12,padding:"11px 8px",fontSize:12.5,fontWeight:800,textTransform:"uppercase",letterSpacing:".03em",cursor:"pointer",fontFamily:"inherit",color:on?"#FFFFFF":W,background:on?GRAD:CELL}}>{t==="challenge"?"Herausfordern":"Ergebnis eintragen"}</button>
              })}
            </div>

            {fTab==="challenge"?(
              <>
                <div style={{fontSize:13,color:SUB,fontWeight:300,marginBottom:16}}>Schlag eine Zeit vor — {fTarget.name} bekommt die Anfrage.</div>
                <div style={{display:"flex",gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:600,color:MUT,letterSpacing:".04em",textTransform:"uppercase",marginBottom:7}}>Datum</div>
                    <input type="date" value={fDate} onChange={e=>setFDate(e.target.value)} style={{width:"100%",background:"#0E0E10",borderRadius:12,padding:"12px 14px",color:W,fontSize:15,outline:"none",fontFamily:"inherit"}}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:600,color:MUT,letterSpacing:".04em",textTransform:"uppercase",marginBottom:7}}>Zeit</div>
                    <input type="time" value={fTime} onChange={e=>setFTime(e.target.value)} style={{width:"100%",background:"#0E0E10",borderRadius:12,padding:"12px 14px",color:W,fontSize:15,outline:"none",fontFamily:"inherit"}}/>
                  </div>
                </div>
                <button onClick={sendChallenge} disabled={busy} style={{display:"block",width:"100%",textAlign:"center",marginTop:22,background:GRAD,color:"#FFFFFF",borderRadius:14,padding:16,fontSize:16,fontWeight:800,textTransform:"uppercase",letterSpacing:".03em",cursor:busy?"wait":"pointer",opacity:busy?.7:1,fontFamily:"inherit"}}>{busy?"…":"Anfrage senden"}</button>
              </>
            ):(
              <>
                <div style={{fontSize:13,color:SUB,fontWeight:300,marginBottom:16}}>Schon gespielt? Trag die Sätze ein — {fTarget.name} bestätigt, dann zählt&apos;s für ELO &amp; Rangliste.</div>

                <div style={{marginBottom:18}}>
                  <div style={{fontSize:11,fontWeight:600,color:MUT,letterSpacing:".04em",textTransform:"uppercase",marginBottom:7}}>Wann gespielt?</div>
                  <input type="date" max={today()} value={fRDate} onChange={e=>setFRDate(e.target.value)} style={{width:"100%",background:"#0E0E10",borderRadius:12,padding:"12px 14px",color:W,fontSize:15,outline:"none",fontFamily:"inherit"}}/>
                </div>

                {!fDetail?(
                  <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:14}}>
                    {([["Du",fMy,setFMy],[fTarget.name,fOpp,setFOpp]] as [string,number,(n:number)=>void][]).map(([lab,val,set],idx)=>(
                      <>
                        {idx===1&&<span style={{fontSize:30,fontWeight:900,color:MUT,paddingBottom:4}}>:</span>}
                        <div key={idx} style={{textAlign:"center"}}>
                          <div style={{fontSize:11,color:MUT,fontWeight:700,textTransform:"uppercase",marginBottom:9,maxWidth:110,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lab}</div>
                          <div style={{display:"flex",alignItems:"center",gap:9}}>
                            <button onClick={()=>set(Math.max(0,val-1))} style={{width:34,height:34,borderRadius:"50%",background:CELL,color:W,fontSize:20,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>−</button>
                            <span style={{fontSize:36,fontWeight:900,width:34,textAlign:"center",...gt}}>{val}</span>
                            <button onClick={()=>set(Math.min(7,val+1))} style={{width:34,height:34,borderRadius:"50%",background:CELL,color:W,fontSize:20,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>+</button>
                          </div>
                        </div>
                      </>
                    ))}
                  </div>
                ):(
                  /* Genaue Sätze — dann steht in der Historie, was wirklich gespielt wurde */
                  <div>
                    <div style={{display:"flex",gap:10,marginBottom:9,paddingLeft:52}}>
                      <div style={{flex:1,fontSize:10.5,color:MUT,fontWeight:700,textTransform:"uppercase",textAlign:"center"}}>Du</div>
                      <div style={{width:10}}/>
                      <div style={{flex:1,fontSize:10.5,color:MUT,fontWeight:700,textTransform:"uppercase",textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fTarget.name}</div>
                    </div>
                    {fSets.map((s,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                        <span style={{width:42,flexShrink:0,fontSize:11,color:MUT,fontWeight:700}}>Satz {i+1}</span>
                        <input type="number" inputMode="numeric" min={0} max={30} value={s.p1}
                          onChange={e=>setFSets(v=>v.map((x,j)=>j===i?{...x,p1:e.target.value}:x))}
                          placeholder="11"
                          style={{flex:1,minWidth:0,background:"#0E0E10",borderRadius:12,padding:"11px 8px",color:W,fontSize:17,fontWeight:800,textAlign:"center",outline:"none",fontFamily:"inherit"}}/>
                        <span style={{width:10,textAlign:"center",color:MUT,fontWeight:800}}>:</span>
                        <input type="number" inputMode="numeric" min={0} max={30} value={s.p2}
                          onChange={e=>setFSets(v=>v.map((x,j)=>j===i?{...x,p2:e.target.value}:x))}
                          placeholder="7"
                          style={{flex:1,minWidth:0,background:"#0E0E10",borderRadius:12,padding:"11px 8px",color:W,fontSize:17,fontWeight:800,textAlign:"center",outline:"none",fontFamily:"inherit"}}/>
                        {i>=3&&(
                          <button onClick={()=>setFSets(v=>v.filter((_,j)=>j!==i))} style={{background:"none",color:MUT,fontSize:16,cursor:"pointer",flexShrink:0}}>×</button>
                        )}
                      </div>
                    ))}
                    {fSets.length<7&&(
                      <button onClick={()=>setFSets(v=>[...v,{p1:"",p2:""}])}
                        style={{width:"100%",background:CELL,borderRadius:12,padding:10,color:MUT,fontSize:12.5,cursor:"pointer",fontFamily:"inherit"}}>+ Satz</button>
                    )}
                    <div style={{textAlign:"center",fontSize:13,fontWeight:800,marginTop:11,...gt}}>
                      {satzBilanz().my} : {satzBilanz().opp} Sätze
                    </div>
                  </div>
                )}

                {/* Umschalter: schnell zählen oder genau eintragen */}
                <button onClick={()=>setFDetail(v=>!v)}
                  style={{display:"block",width:"100%",marginTop:14,background:"none",color:MUT,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",padding:6,textDecoration:"underline"}}>
                  {fDetail?"Nur Sätze zählen":"Satzergebnisse genau eintragen"}
                </button>
                {/* Freundschaftsspiel: Ergebnis wird gespeichert und im Chat gezeigt, zählt aber nicht */}
                <button onClick={()=>setFFriendly(v=>!v)} style={{display:"flex",alignItems:"center",gap:11,width:"100%",marginTop:20,background:CELL,borderRadius:14,padding:"13px 14px",cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                  <span style={{width:20,height:20,borderRadius:6,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:fFriendly?GRAD:CELL,color:"#FFFFFF",fontSize:13,fontWeight:900}}>{fFriendly?"✓":""}</span>
                  <span style={{flex:1}}>
                    <span style={{display:"block",fontSize:13.5,fontWeight:700,color:W}}>Freundschaftsspiel</span>
                    <span style={{display:"block",fontSize:11.5,color:MUT,marginTop:1}}>Zählt nicht für ELO und Rang — erscheint nur im Verlauf.</span>
                  </span>
                </button>

                {fNoteRanked&&(
                  <div style={{marginTop:12,background:CELL,borderRadius:12,padding:"11px 13px",fontSize:12,color:SUB,lineHeight:1.5}}>{fNoteRanked}</div>
                )}

                <button onClick={sendResult} disabled={busy} style={{display:"block",width:"100%",textAlign:"center",marginTop:18,background:GRAD,color:"#FFFFFF",borderRadius:14,padding:16,fontSize:16,fontWeight:800,textTransform:"uppercase",letterSpacing:".03em",cursor:busy?"wait":"pointer",opacity:busy?.7:1,fontFamily:"inherit"}}>{busy?"…":fDone.length?"Weiteres Ergebnis absenden":"Ergebnis absenden"}</button>

                {fDone.length>0&&(
                  <div style={{marginTop:16,background:CELL,borderRadius:14,padding:"13px 14px"}}>
                    <div style={{fontSize:11,fontWeight:700,color:MUT,letterSpacing:".04em",textTransform:"uppercase",marginBottom:8}}>Eingetragen ({fDone.length})</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                      {fDone.map((s,i)=>(
                        <span key={i} style={{fontSize:13,fontWeight:800,color:W,background:"#0E0E10",borderRadius:8,padding:"5px 10px"}}>{s}</span>
                      ))}
                    </div>
                    <div style={{fontSize:11.5,color:SUB,fontWeight:300,marginTop:9,lineHeight:1.5}}>{fTarget.name} bekommt eine E-Mail und hat 24 Std. Zeit zu bestätigen — danach zählt das Ergebnis automatisch. Du kannst gleich den nächsten Match eintragen.</div>
                    <button onClick={()=>setFTarget(null)} style={{display:"block",width:"100%",textAlign:"center",marginTop:11,background:CELL,borderRadius:12,padding:11,fontSize:13,fontWeight:800,color:W,textTransform:"uppercase",letterSpacing:".03em",cursor:"pointer",fontFamily:"inherit"}}>Fertig</button>
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
        <div onClick={()=>setChatOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:130,display:"flex",justifyContent:"flex-end"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:FLAECHE,borderLeft:"1px solid rgba(8,8,8,.10)",height:"100%",width:"83%",maxWidth:380,display:"flex",flexDirection:"column",boxShadow:"-22px 0 50px rgba(0,0,0,.35)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"15px 16px",borderBottom:"1px solid rgba(8,8,8,.10)",background:"#FFFFFF"}}>
              <span style={{fontFamily:INTER,fontSize:12.5,fontWeight:900,letterSpacing:".14em",textTransform:"uppercase",color:SCHWARZ}}>Liga-Chat</span>
              <button onClick={()=>setChatOpen(false)} style={{background:"none",color:TEXT_LEISE,fontSize:18,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
              {msgs.length===0?<p style={{textAlign:"center",color:TEXT_LEISE,fontSize:13.5,marginTop:20}}>Noch keine Nachrichten — schreib die erste 👋</p>:msgs.filter(m=>!m.parent_id).map(m=>{
                const kommentare=msgs.filter(k=>k.parent_id===m.id)
                if(m.kind==="match"){
                  let d:{winner:string,loser:string,wSets:number,lSets:number,detail:string,ranked?:boolean,pending?:boolean,enteredBy?:string}|null=null
                  try{d=JSON.parse(m.text)}catch{/**/}
                  const r=m.reactions
                  return(
                    <div key={m.id} style={{alignSelf:"stretch"}}>
                      <div style={{background:"#FFFFFF",borderRadius:14,padding:"11px 14px"}}>
                        <div style={{fontSize:10,fontWeight:700,color:d?.pending?TEXT_LEISE:d?.ranked===false?TEXT_LEISE:VIOLETT,letterSpacing:".08em",textTransform:"uppercase",marginBottom:5}}>
                          {d?.pending?"Neues Ergebnis · wartet auf Bestätigung":d?.ranked===false?"Match · zählt nicht":"Match bestätigt"}
                        </div>
                        {d&&<>
                          <div style={{fontSize:14,fontWeight:800,color:SCHWARZ,marginBottom:2}}>{d.winner} <span style={{color:d.pending?TEXT_LEISE:d.ranked===false?TEXT_LEISE:VIOLETT}}>schlägt</span> {d.loser}</div>
                          <div style={{fontSize:12,color:TEXT_LEISE,marginBottom:8}}>
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
                              <button key={type} onClick={()=>react(m.id,type)} style={{display:"flex",alignItems:"center",gap:4,background:active?"rgba(140,61,255,.14)":"rgba(8,8,8,.05)",borderRadius:99,padding:"4px 10px",fontSize:13,cursor:"pointer",color:SCHWARZ,fontFamily:"inherit"}}>
                                <span>{emoji}</span>
                                {cnt>0&&<span style={{fontSize:11,fontWeight:700,color:active?VIOLETT:TEXT_LEISE}}>{cnt}</span>}
                              </button>
                            )
                          })}
                          {/* Kommentieren — das Spiel selbst ist der Gesprächsanlass */}
                          <button onClick={()=>setCmtOpen(o=>({...o,[m.id]:!o[m.id]}))}
                            style={{display:"flex",alignItems:"center",gap:5,marginLeft:"auto",background:"rgba(8,8,8,.05)",borderRadius:99,padding:"4px 10px",fontSize:11,fontWeight:700,color:kommentare.length?SCHWARZ:TEXT_LEISE,cursor:"pointer",fontFamily:"inherit"}}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M4 5h16v11H9l-4 3v-3H4z"/></svg>
                            {kommentare.length>0?kommentare.length:"Kommentieren"}
                          </button>
                        </div>

                        {/* Kommentare */}
                        {(kommentare.length>0||cmtOpen[m.id])&&(
                          <div style={{marginTop:11,paddingTop:10,borderTop:"1px solid rgba(8,8,8,.10)",display:"flex",flexDirection:"column",gap:7}}>
                            {kommentare.map(k=>(
                              <div key={k.id} style={{display:"flex",gap:7,alignItems:"baseline"}}>
                                <span style={{fontSize:11,fontWeight:800,color:k.user_id===userId?VIOLETT:TEXT_LEISE,flexShrink:0}}>{k.user_id===userId?"Du":k.name}</span>
                                <span style={{fontSize:12.5,color:SCHWARZ,fontWeight:500,lineHeight:1.45,wordBreak:"break-word"}}>{k.text}</span>
                              </div>
                            ))}
                            {myReg&&(
                              <div style={{display:"flex",gap:6,marginTop:3}}>
                                <input
                                  value={cmt[m.id]||""}
                                  onChange={e=>setCmt(c=>({...c,[m.id]:e.target.value}))}
                                  onKeyDown={e=>{if(e.key==="Enter")sendComment(m.id)}}
                                  placeholder="Kommentar zum Spiel …"
                                  style={{flex:1,minWidth:0,background:"rgba(8,8,8,.05)",border:"1px solid rgba(8,8,8,.12)",borderRadius:999,padding:"9px 12px",color:SCHWARZ,fontSize:12.5,outline:"none",fontFamily:"inherit"}}/>
                                <button onClick={()=>sendComment(m.id)} aria-label="Kommentar senden"
                                  style={{width:36,flexShrink:0,borderRadius:999,background:VIOLETT,color:"#FFFFFF",fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>→</button>
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
                    {!mine&&<div style={{fontSize:10.5,color:TEXT_LEISE,margin:"0 0 3px 4px"}}>{m.name}</div>}
                    <div style={{background:mine?VIOLETT:"#FFFFFF",borderRadius:14,padding:"9px 12px",fontSize:13.5,fontWeight:500,color:mine?"#FFFFFF":SCHWARZ}}>{m.text}</div>
                  </div>
                )
              })}
            </div>
            {myReg?(
              <div style={{display:"flex",gap:8,padding:"12px 14px",borderTop:"1px solid rgba(8,8,8,.10)",background:"#FFFFFF"}}>
                <input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")send()}} placeholder="Nachricht an die Liga …" style={{flex:1,background:"rgba(8,8,8,.05)",border:"1px solid rgba(8,8,8,.12)",borderRadius:999,padding:"11px 14px",color:SCHWARZ,fontSize:13.5,outline:"none",fontFamily:"inherit"}}/>
                <button onClick={send} style={{width:42,borderRadius:999,background:VIOLETT,color:"#FFFFFF",fontWeight:800,cursor:"pointer"}}>→</button>
              </div>
            ):(
              <p style={{padding:"14px",textAlign:"center",color:TEXT_LEISE,fontSize:13}}>Tritt der Liga bei, um mitzuschreiben.</p>
            )}
          </div>
        </div>
      )}

      {toast&&<div style={{position:"fixed",bottom:84,left:0,right:0,display:"flex",justifyContent:"center",zIndex:120}}><div style={{background:CARD,color:W,borderRadius:999,padding:"10px 18px",fontSize:13}}>{toast}</div></div>}
      <BottomNav />
    </main>
  )
}
