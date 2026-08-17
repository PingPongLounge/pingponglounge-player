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
} from "@/app/theme"

const C=CARD, B=CELL, M=SUB
const SHADOW="0 1px 4px rgba(0,0,0,.14)"
const HERO="#1C212B"

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
    <main style={{minHeight:"100vh",background:BG,paddingBottom:90}}>
      {/* Topbar — dunkel. Grün nur im Logo und im Zähler: eine grelle Leiste war
          das Lauteste auf dem Screen und sagte nichts. Ein Akzent pro Screen. */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 15px",background:"#1A1E25",borderBottom:`1px solid ${LINE}`,position:"sticky",top:0,zIndex:10}}>
        <Link href="/entdecken" style={{display:"flex",alignItems:"center",gap:8,textDecoration:"none"}}>
          <svg width="21" height="21" viewBox="0 0 80 80" fill="none">
            <defs><linearGradient id="plg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#57CF79"/><stop offset="1" stopColor="#1FD1C4"/></linearGradient></defs>
            <path d="M 20 60 L 20 10 L 44 10 C 56 10 64 18 64 30 C 64 42 56 50 44 50 L 36 50 L 36 60 Z" fill="none" stroke="url(#plg)" strokeWidth="3.6" strokeLinejoin="round"/>
            <circle cx="63" cy="58" r="6.5" fill="url(#plg)"/>
          </svg>
          <span style={{fontSize:12.5,fontWeight:900,letterSpacing:".20em",color:W}}>PLAYER</span>
        </Link>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {/* Umschalter nur, wenn es überhaupt etwas umzuschalten gibt — also
              wenn der Spieler zusätzlich in einer privaten Firmen-Liga ist.
              Die öffentliche Liga braucht keine Auswahl: es gibt nur eine. */}
          {seasons.length>1&&(
            <button onClick={()=>setShowCity(v=>!v)} style={{background:CELL,color:SUB,fontSize:12,fontWeight:700,cursor:"pointer",borderRadius:10,padding:"7px 10px",fontFamily:"inherit"}}>{sel?.name||"League"} ▾</button>
          )}
          <button onClick={()=>setChatOpen(true)} style={{position:"relative",display:"flex",alignItems:"center",gap:5,borderRadius:10,background:CELL,padding:"7px 10px",cursor:"pointer",fontFamily:"inherit"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SUB} strokeWidth="2"><path d="M4 5h16v11H9l-4 3v-3H4z"/></svg>
            <span style={{fontSize:12,fontWeight:700,color:SUB}}>Chat</span>
            {ungelesen>0&&(
              <span style={{position:"absolute",top:-5,right:-5,minWidth:17,height:17,borderRadius:999,background:GRAD,color:"#06210F",fontSize:10,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>{ungelesen>9?"9+":ungelesen}</span>
            )}
          </button>
          <NotificationBell/>
        </div>
      </div>

      {/* Liga-Umschalter: öffentliche Liga ↔ private Firmen-Ligen */}
      {showCity&&(
        <div onClick={()=>setShowCity(false)} style={{position:"fixed",inset:0,zIndex:20}}>
          <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:54,right:14,background:"#14171C",borderRadius:14,padding:6,minWidth:180}}>
            {seasons.map(s=>(
              <div key={s.id} onClick={()=>{setSeasonId(s.id);setCity(s.city);setShowCity(false)}} style={{padding:"11px 12px",borderRadius:9,fontSize:14,fontWeight:s.id===seasonId?600:400,color:s.id===seasonId?GREEN:W,cursor:"pointer"}}>
                {s.name}{s.is_private?" · privat":""}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{maxWidth:480,margin:"0 auto"}}>
        {/* Offene Bestätigungen zuoberst — direkt antippbar. */}
        <div style={{padding:"14px 15px 0"}}><PendingConfirmBanner/></div>
        {/* EIN Block: Bild, Position, Monatspflicht — durch Linien getrennt statt
            durch Lücken. Vorher schwebten zwei Kästchen mit Abstand übereinander,
            obwohl sie dasselbe erzählen: deine Liga. */}
        <div style={{margin:"14px 14px 0",borderRadius:22,overflow:"hidden",boxShadow:SHADOW,background:HERO}}>
          {/* Bild */}
          <div style={{position:"relative",height:132}}>
            <img src="/liga-hero.jpg" alt="" style={{width:"100%",height:132,objectFit:"cover",display:"block"}}/>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(20,23,30,.1) 0%,rgba(20,23,30,.55) 55%,rgba(20,23,30,.92) 100%)"}}/>
            <div style={{position:"absolute",left:20,right:20,bottom:13}}>
              <div style={{fontSize:34,fontWeight:900,lineHeight:.9,textTransform:"uppercase",letterSpacing:"-.02em",color:W}}>{sel?.is_private?sel.name:"Player League"}</div>
              {/* Öffentliche Liga = "Rangliste" (eine Liga, eine Rangliste — kein
                  Stadt-Zusatz mehr, "Weltweit" war verwirrend). Private Firmen-Liga
                  zeigt ihren eigenen Namen. Stufe + Spielerzahl als Untertitel. */}
              <div style={{fontSize:12,color:SUB,fontWeight:400,marginTop:5}}>
                {meineStufe?.name||"Ohne Stufe"}{count?` · ${count} Spieler`:""}{!sel?.is_private&&<>{" · "}<span onClick={()=>setSaison(v=>!v)} style={{fontWeight:700,color:"#57CF79",cursor:"pointer"}}>{saison?"weniger":"mehr"}</span></>}
              </div>
            </div>
          </div>

          {saison&&!sel?.is_private&&(
            <div style={{padding:"12px 18px 14px",borderTop:"1px solid rgba(255,255,255,.08)"}}>
              <p style={{fontSize:13,color:"rgba(255,255,255,.9)",fontWeight:300,lineHeight:1.5,margin:"0 0 6px"}}>Die Player League läuft über <b style={{color:W,fontWeight:700}}>eine Saison bis 1. Dezember 2026</b>.</p>
              <p style={{fontSize:13,color:"rgba(255,255,255,.9)",fontWeight:300,lineHeight:1.5,margin:"0 0 6px"}}>Die <b style={{color:W,fontWeight:700}}>besten 10 jeder League</b> qualifizieren sich automatisch fürs <b style={{color:W,fontWeight:700}}>Endjahresturnier</b>.</p>
              <p style={{fontSize:13,color:"rgba(255,255,255,.9)",fontWeight:300,lineHeight:1.5,margin:0}}>Ab <b style={{color:W,fontWeight:700}}>50 Spielern pro Kanton</b> wird interkantonal gespielt.</p>
            </div>
          )}

          {myReg&&myRow&&(<>
            {/* Deine Position — in DEINER Liga, nicht in der Gesamtliste. Sonst
                steht im Kopf "#7" und in der Tabelle daneben "3". */}
            <div style={{display:"flex",alignItems:"center",gap:16,padding:"16px 20px",borderTop:`1px solid ${LINE}`}}>
              <div style={{fontSize:44,fontWeight:900,lineHeight:.85,letterSpacing:"-.03em",...gt}}>#{meinRang}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13.5,fontWeight:800,color:W}}>Deine Position</div>
                <div style={{fontSize:15,color:SUB,fontWeight:500,marginTop:3}}>Rating {ratingLabel(myRow.elo)}</div>
              </div>
            </div>
            {/* Monatspflicht — bei erfülltem Soll ein Haken. "5/4" las sich wie ein Fehler. */}
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"13px 20px 15px",borderTop:`1px solid ${LINE}`}}>
              {monatOk?(
                <div style={{width:24,height:24,borderRadius:"50%",background:GRAD,color:"#06210F",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,flexShrink:0}}>✓</div>
              ):(
                <div style={{fontSize:20,fontWeight:900,lineHeight:1,flexShrink:0,color:W}}>
                  {monatCount}<span style={{fontSize:12,color:MUT,fontWeight:800}}>/{MIN_MATCHES_PER_MONTH}</span>
                </div>
              )}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:800,color:W}}>
                  {monatOk?`Soll erfüllt · ${monatCount} Matches diesen Monat`:"Liga-Matches diesen Monat"}
                </div>
                <div style={{fontSize:11,color:MUT,marginTop:2,lineHeight:1.4}}>
                  {monatOk
                    ? "Jedes weitere Spiel bringt Punkte."
                    : `Noch ${MIN_MATCHES_PER_MONTH-monatCount} bis Monatsende, sonst −${MONTHLY_PENALTY_ELO} Punkte.`}
                </div>
                {!monatOk&&(
                  <div style={{height:3,borderRadius:99,background:CELL,marginTop:7,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.min(100,(monatCount/MIN_MATCHES_PER_MONTH)*100)}%`,background:GRAD}}/>
                  </div>
                )}
              </div>
            </div>
            {/* Ergebnis eintragen — gehört in denselben Block, aber leise:
                eine Zeile, kein Werbeplakat. */}
            {rows.length>1&&(
              <button onClick={()=>setPickOpen(true)}
                style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:"none",borderTop:`1px solid ${LINE}`,padding:"13px 20px",cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                <span style={{fontSize:12.5,fontWeight:800,color:W}}>Ergebnis eintragen</span>
                <span style={{fontSize:15,fontWeight:800,color:GREEN}}>→</span>
              </button>
            )}
            {/* Liga-Chat als eigene Zeile — mit der letzten Nachricht als Köder.
                Ein Symbol oben rechts findet niemand. */}
            <button onClick={()=>setChatOpen(true)}
              style={{display:"flex",alignItems:"center",gap:11,width:"100%",background:"none",borderTop:`1px solid ${LINE}`,padding:"12px 20px",cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
              <span style={{width:30,height:30,borderRadius:9,flexShrink:0,background:CELL,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.2"><path d="M4 5h16v11H9l-4 3v-3H4z"/></svg>
              </span>
              <span style={{flex:1,minWidth:0}}>
                <span style={{display:"block",fontSize:12.5,fontWeight:800,color:W}}>Liga-Chat</span>
                <span style={{display:"block",fontSize:11,color:MUT,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{letzteNachricht}</span>
              </span>
              {ungelesen>0&&(
                <span style={{minWidth:19,height:19,borderRadius:999,background:GRAD,color:"#06210F",fontSize:10.5,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px",flexShrink:0}}>{ungelesen>9?"9+":ungelesen}</span>
              )}
              <span style={{fontSize:15,color:MUT,flexShrink:0}}>›</span>
            </button>
          </>)}
        </div>

        {loading?(
          <p style={{textAlign:"center",color:M,padding:"40px 0"}}>Lädt …</p>
        ):seasons.length===0?(
          <p style={{textAlign:"center",color:M,padding:"40px 16px"}}>Noch keine Liga aktiv.</p>
        ):(<>

          {/* Neu hier? — Erklärung (nur Nicht-Mitglieder) */}
          {!myReg&&(
            <div style={{padding:"4px 14px 0"}}>
              <div style={{borderRadius:24,padding:22,boxShadow:SHADOW,background:CARD}}>
                <div style={{fontSize:11,fontWeight:800,letterSpacing:".1em",textTransform:"uppercase",...gt}}>Neu hier?</div>
                <div style={{fontSize:22,fontWeight:900,color:W,margin:"6px 0 16px"}}>So funktioniert die Liga</div>
                {([
                  ["1","Du bist automatisch dabei","Eine Liga für alle — kein Beitreten, keine Klassen. Deine Stufe kommt aus deiner Elo."],
                  ["2","Spielen & fordern","Fordere jeden — auch den Tabellenersten. Jedes bestätigte Resultat zählt."],
                  ["3","Aufsteigen","Gewinnst du, steigst du. Filtere die Rangliste nach Stadt, Land oder Freunden."],
                ] as [string,string,string][]).map(([n,t,d])=>(
                  <div key={n} style={{display:"flex",gap:13,alignItems:"flex-start",marginBottom:14}}>
                    <span style={{width:27,height:27,borderRadius:"50%",background:GRAD,color:"#06210F",fontSize:13,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{n}</span>
                    <div><div style={{fontSize:14.5,fontWeight:800,color:W}}>{t}</div><div style={{fontSize:12.5,color:MUT,marginTop:2,lineHeight:1.4}}>{d}</div></div>
                  </div>
                ))}
                <button onClick={join} disabled={busy} style={{display:"block",width:"100%",textAlign:"center",marginTop:6,background:GRAD,color:"#06210F",borderRadius:14,padding:15,fontSize:15,fontWeight:800,textTransform:"uppercase",letterSpacing:".03em",cursor:busy?"not-allowed":"pointer",opacity:busy?.6:1}}>{busy?"…":"Los geht's"}</button>
              </div>
            </div>
          )}

          {/* Rangliste — EINE Liste, alle sichtbar, in Klassen-Bänder unterteilt.
              Die Tabs oben FILTERN NICHT, sie SPRINGEN zum Band. Darüber die
              Filterleiste (Geo · Freunde · Kategorie · Stil) — das Herzstück. */}
          <div style={{padding:"14px 14px 0"}}>
            <div style={{...card,borderRadius:24,padding:"16px 12px"}}>
              {/* Filter-Knopf + aktive Zusammenfassung */}
              <button onClick={()=>setFilterOpen(true)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:CELL,borderRadius:12,padding:"11px 13px",cursor:"pointer",fontFamily:"inherit",marginBottom:10}}>
                <span style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={filterAktiv?GREEN:SUB} strokeWidth="2"><path d="M4 5h16M7 12h10M10 19h4"/></svg>
                  <span style={{fontSize:13,fontWeight:700,color:filterAktiv?W:SUB,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{filterAktiv?filterLabel:"Rangliste filtern"}</span>
                </span>
                <span style={{fontSize:11,color:MUT,flexShrink:0}}>{filterAktiv?"ändern":"▾"}</span>
              </button>
              {/* Sprung-Tabs: tippen scrollt zum Band, blendet nichts aus */}
              <div style={{display:"flex",gap:4,background:CELL,borderRadius:14,padding:4}}>
                {TIERS.map(l=>{
                  const on=l.key===ligaTab
                  const meins=meineStufe?.key===l.key
                  const leer=!bands.some(b=>b.tier.key===l.key)
                  return(
                    <button key={l.key} onClick={()=>!leer&&springZu(l.key)} disabled={leer}
                      style={{flex:1,position:"relative",borderRadius:11,padding:"9px 3px",background:on?W:"none",color:leer?MUT:on?"#1C212B":SUB,opacity:leer?.4:1,fontFamily:"inherit",fontSize:11.5,fontWeight:800,cursor:leer?"default":"pointer"}}>
                      {l.name}
                      {meins&&<span style={{position:"absolute",top:5,right:6,width:5,height:5,borderRadius:"50%",background:on?"#1C212B":GREEN}}/>}
                    </button>
                  )
                })}
              </div>
              <div style={{textAlign:"center",fontSize:10.5,color:MUT,margin:"9px 0 10px"}}>
                Tippen springt zur Klasse{filterAktiv?" · Rang gilt im Filter":""}
              </div>
              <div>
                {bands.length===0&&(
                  <div style={{textAlign:"center",fontSize:12.5,color:MUT,padding:"26px 16px",lineHeight:1.6}}>
                    {filterAktiv?"Niemand passt zu diesem Filter.":"Noch niemand in der Rangliste."}
                  </div>
                )}
                {bands.map(b=>(
                <div key={b.tier.key} ref={el=>{tierRefs.current[b.tier.key]=el}}>
                  {/* Klassen-Kopf */}
                  <div style={{display:"flex",alignItems:"center",gap:7,margin:"12px 2px 4px"}}>
                    <span style={{fontSize:10.5,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase",color:b.tier.key===meineStufe?.key?GREEN:SUB}}>{b.tier.name}</span>
                    <span style={{fontSize:10.5,color:MUT}}>{tierRangeLabel(b.tier.key)} · {b.rows.length}{b.tier.key===meineStufe?.key?" · deine Stufe":""}</span>
                    <div style={{flex:1,height:1,background:b.tier.key===meineStufe?.key?"linear-gradient(90deg,rgba(57,255,20,.4),transparent)":LINE}}/>
                  </div>
                  {b.rows.map((r,i)=>{
                  const me=r.user_id===userId
                  const platz=r.platz   // Position in der (ggf. gefilterten) Rangliste
                  const initialen=r.name.split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase()
                  return(
                    <div key={r.user_id} ref={me?meRef:null} style={{display:"flex",alignItems:"center",gap:9,padding:"11px 6px",borderTop:i===0?"none":`1px solid ${LINE}`,...(me?{background:"rgba(255,255,255,.06)",borderRadius:12}:{})}}>
                      <span style={{width:24,textAlign:"center",fontSize:18,fontWeight:900,flexShrink:0,color:SUB}}>{platz}</span>
                      {/* Gesicht statt Textwüste */}
                      <div style={{width:34,height:34,borderRadius:"50%",flexShrink:0,overflow:"hidden",background:CELL,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {r.avatar
                          ? <img src={r.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                          : <span style={{fontSize:12.5,fontWeight:800,color:MUT}}>{initialen}</span>}
                      </div>
                      {/* Name antippen → Spielerprofil mit Bilanz und letzten Spielen.
                          Alles einzeilig mit Auslassungspunkten: lange Namen brachen
                          um, das Level-Badge rutschte über den Namen, und
                          "2/5 Liga-Matches" wuchs auf drei Zeilen. Dieser Zähler
                          steht jetzt im Spieler-Popup, wo Platz dafür ist. */}
                      <button onClick={()=>openPlayer(r.user_id)} style={{flex:1,minWidth:0,background:"none",padding:0,textAlign:"left",cursor:"pointer",fontFamily:"inherit",overflow:"hidden"}}>
                        <span style={{display:"block",fontSize:17.5,fontWeight:800,color:W,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                          {r.name}{me&&<span style={{fontSize:9.5,background:CELL,borderRadius:999,padding:"1px 5px",marginLeft:6,color:SUB}}>Du</span>}
                        </span>
                      </button>
                      {/* Nur die genaue Rating-Klasse — kein zweites Level-Badge daneben. */}
                      <span style={{fontSize:20,fontWeight:900,width:52,textAlign:"right",flexShrink:0,...(me?gt:{color:W})}}>{ratingLabel(r.elo)}</span>
                      {/* Eine Aktion, kurz und immer gleich breit. "SPIEL EINTRAGEN →"
                          und "ZURÜCKZIEHEN" sprengten die Zeile. */}
                      {!me&&myReg&&(()=>{
                        const om=openMatches[r.user_id]
                        const btnBase:React.CSSProperties={borderRadius:9,padding:"7px 0",width:74,textAlign:"center",fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".02em",color:SUB,background:CELL,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit",flexShrink:0,display:"inline-block",textDecoration:"none"}
                        const iconBtn:React.CSSProperties={background:CELL,borderRadius:9,width:30,height:30,fontSize:12,fontWeight:800,color:MUT,cursor:"pointer",fontFamily:"inherit",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}
                        if(!om) return <button onClick={()=>openForder(r)} style={{...btnBase,background:GRAD,color:"#06210F"}}>Fordern</button>
                        if(om.status==="challenge_sent"&&!om.iAmP1) return (
                          <span style={{display:"flex",gap:5,flexShrink:0}}>
                            <button onClick={()=>acceptChallenge(om.id)} style={{...btnBase,width:64,background:GRAD,color:"#06210F"}}>Annehmen</button>
                            <button onClick={()=>declineChallenge(om.id)} title="Ablehnen" style={iconBtn}>✕</button>
                          </span>
                        )
                        if(om.status==="challenge_sent"&&om.iAmP1) return (
                          <span style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                            <span style={{fontSize:10,fontWeight:700,color:MUT,textTransform:"uppercase",whiteSpace:"nowrap"}}>Offen</span>
                            <button onClick={()=>declineChallenge(om.id)} title="Zurückziehen" style={iconBtn}>✕</button>
                          </span>
                        )
                        if(om.status==="accepted"||om.status==="pending") return <Link href={`/liga/match/${om.id}`} style={btnBase}>Eintragen</Link>
                        // Bestätigen darf, wer NICHT eingetragen hat — egal ob p1 oder p2.
                        if(om.status==="p1_entered"&&om.enteredBy&&om.enteredBy!==userId) return <Link href={`/liga/match/${om.id}`} style={{...btnBase,background:GRAD,color:"#06210F"}}>Bestätigen</Link>
                        // Ich habe eingetragen → warte auf den Gegner (kein neues Fordern).
                        if(om.status==="p1_entered"&&om.enteredBy===userId) return <span style={{fontSize:10,fontWeight:700,color:MUT,textTransform:"uppercase",whiteSpace:"nowrap",width:74,textAlign:"center",flexShrink:0}}>Wartet</span>
                        return <button onClick={()=>openForder(r)} style={{...btnBase,background:GRAD,color:"#06210F"}}>Fordern</button>
                      })()}
                    </div>
                  )
                  })}
                </div>
                ))}
              </div>
            </div>
          </div>

          {/* Liga anfragen — gehört ans Ende. Es richtet sich an Leute OHNE Liga,
              stand aber ganz oben bei Leuten, die längst in einer sind. */}
          <div style={{padding:"18px 14px 6px",textAlign:"center"}}>
            {reqDone ? (
              <div style={{fontSize:12.5,color:SUB,lineHeight:1.5}}>
                {reqCount>1
                  ? `Danke — ${reqCount} Leute wollen eine Liga in ${reqCity}. Wir melden uns, sobald sie steht.`
                  : `Danke — wir melden uns, sobald sich genug Leute für ${reqCity} finden.`}
              </div>
            ) : reqOpen ? (
              <div style={{background:CARD,borderRadius:18,padding:"16px 16px",boxShadow:SHADOW,textAlign:"left"}}>
                <div style={{fontSize:13.5,fontWeight:800,color:W,marginBottom:10}}>In welcher Stadt fehlt dir eine Liga?</div>
                <input value={reqCity} onChange={e=>setReqCity(e.target.value)} placeholder="z.B. Winterthur" autoFocus
                  style={{width:"100%",boxSizing:"border-box",background:"#12151A",borderRadius:12,padding:"12px 14px",color:W,fontSize:14,outline:"none",fontFamily:"inherit",marginBottom:10}}/>
                <button onClick={sendLigaAnfrage} disabled={busy||!reqCity.trim()}
                  style={{display:"block",width:"100%",textAlign:"center",borderRadius:12,padding:12,fontSize:13,fontWeight:800,textTransform:"uppercase",letterSpacing:".03em",color:"#06210F",background:GRAD,cursor:(busy||!reqCity.trim())?"not-allowed":"pointer",opacity:(busy||!reqCity.trim())?.5:1,fontFamily:"inherit"}}>
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
                        <span style={{width:22,height:22,borderRadius:6,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,background:m.won?GRAD:"#12151A",color:m.won?"#06210F":MUT}}>{m.won?"S":"N"}</span>
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
                  style={{display:"block",width:"100%",textAlign:"center",marginTop:18,background:GRAD,color:"#06210F",borderRadius:14,padding:15,fontSize:15,fontWeight:800,textTransform:"uppercase",letterSpacing:".03em",cursor:"pointer",fontFamily:"inherit"}}>
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
                <button key={k} onClick={()=>setFilter(f=>({...f,scope:f.scope===k?"world":k}))} style={{flex:1,fontSize:12.5,fontWeight:700,padding:"9px 4px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",...(filter.scope===k?{background:GRAD,color:"#06210F"}:{background:CELL,color:SUB})}}>{l}</button>
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
              <span style={{width:20,height:20,borderRadius:6,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,...(filter.friends?{background:GRAD,color:"#06210F"}:{background:"#12151A",color:"transparent"})}}>✓</span>
              <span style={{flex:1,textAlign:"left",fontSize:14,fontWeight:600,color:W}}>Nur Freunde</span>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={SUB} strokeWidth="2"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><path d="M17 8v5M14.5 10.5h5"/></svg>
            </button>
            <button onClick={()=>setFilter(f=>({...f,category:f.category==="parkinson"?"":"parkinson"}))} style={{display:"flex",alignItems:"center",gap:10,width:"100%",background:CELL,borderRadius:12,padding:"12px 13px",cursor:"pointer",fontFamily:"inherit"}}>
              <span style={{width:20,height:20,borderRadius:6,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,...(filter.category==="parkinson"?{background:GRAD,color:"#06210F"}:{background:"#12151A",color:"transparent"})}}>✓</span>
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
                    <span style={{width:17,height:17,borderRadius:5,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,...(on?{background:GRAD,color:"#06210F"}:{background:"#12151A",color:"transparent"})}}>✓</span>
                    <span style={{fontSize:12.5,fontWeight:600,color:on?W:SUB}}>{label}</span>
                  </button>
                )
              })}
            </div>

            <button onClick={()=>setFilterOpen(false)} style={{width:"100%",background:GRAD,color:"#06210F",borderRadius:14,padding:15,fontSize:15,fontWeight:800,textTransform:"uppercase",letterSpacing:".03em",cursor:"pointer",fontFamily:"inherit",marginTop:18}}>Anzeigen</button>
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
                return <button key={t} onClick={()=>setFTab(t)} style={{flex:1,borderRadius:12,padding:"11px 8px",fontSize:12.5,fontWeight:800,textTransform:"uppercase",letterSpacing:".03em",cursor:"pointer",fontFamily:"inherit",color:on?"#06210F":W,background:on?GRAD:CELL}}>{t==="challenge"?"Herausfordern":"Ergebnis eintragen"}</button>
              })}
            </div>

            {fTab==="challenge"?(
              <>
                <div style={{fontSize:13,color:SUB,fontWeight:300,marginBottom:16}}>Schlag eine Zeit vor — {fTarget.name} bekommt die Anfrage.</div>
                <div style={{display:"flex",gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:600,color:MUT,letterSpacing:".04em",textTransform:"uppercase",marginBottom:7}}>Datum</div>
                    <input type="date" value={fDate} onChange={e=>setFDate(e.target.value)} style={{width:"100%",background:"#12151A",borderRadius:12,padding:"12px 14px",color:W,fontSize:15,outline:"none",fontFamily:"inherit"}}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:600,color:MUT,letterSpacing:".04em",textTransform:"uppercase",marginBottom:7}}>Zeit</div>
                    <input type="time" value={fTime} onChange={e=>setFTime(e.target.value)} style={{width:"100%",background:"#12151A",borderRadius:12,padding:"12px 14px",color:W,fontSize:15,outline:"none",fontFamily:"inherit"}}/>
                  </div>
                </div>
                <button onClick={sendChallenge} disabled={busy} style={{display:"block",width:"100%",textAlign:"center",marginTop:22,background:GRAD,color:"#06210F",borderRadius:14,padding:16,fontSize:16,fontWeight:800,textTransform:"uppercase",letterSpacing:".03em",cursor:busy?"wait":"pointer",opacity:busy?.7:1,fontFamily:"inherit"}}>{busy?"…":"Anfrage senden"}</button>
              </>
            ):(
              <>
                <div style={{fontSize:13,color:SUB,fontWeight:300,marginBottom:16}}>Schon gespielt? Trag die Sätze ein — {fTarget.name} bestätigt, dann zählt&apos;s für ELO &amp; Rangliste.</div>

                <div style={{marginBottom:18}}>
                  <div style={{fontSize:11,fontWeight:600,color:MUT,letterSpacing:".04em",textTransform:"uppercase",marginBottom:7}}>Wann gespielt?</div>
                  <input type="date" max={today()} value={fRDate} onChange={e=>setFRDate(e.target.value)} style={{width:"100%",background:"#12151A",borderRadius:12,padding:"12px 14px",color:W,fontSize:15,outline:"none",fontFamily:"inherit"}}/>
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
                          style={{flex:1,minWidth:0,background:"#12151A",borderRadius:12,padding:"11px 8px",color:W,fontSize:17,fontWeight:800,textAlign:"center",outline:"none",fontFamily:"inherit"}}/>
                        <span style={{width:10,textAlign:"center",color:MUT,fontWeight:800}}>:</span>
                        <input type="number" inputMode="numeric" min={0} max={30} value={s.p2}
                          onChange={e=>setFSets(v=>v.map((x,j)=>j===i?{...x,p2:e.target.value}:x))}
                          placeholder="7"
                          style={{flex:1,minWidth:0,background:"#12151A",borderRadius:12,padding:"11px 8px",color:W,fontSize:17,fontWeight:800,textAlign:"center",outline:"none",fontFamily:"inherit"}}/>
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
                  <span style={{width:20,height:20,borderRadius:6,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:fFriendly?GRAD:CELL,color:"#06210F",fontSize:13,fontWeight:900}}>{fFriendly?"✓":""}</span>
                  <span style={{flex:1}}>
                    <span style={{display:"block",fontSize:13.5,fontWeight:700,color:W}}>Freundschaftsspiel</span>
                    <span style={{display:"block",fontSize:11.5,color:MUT,marginTop:1}}>Zählt nicht für ELO und Rang — erscheint nur im Verlauf.</span>
                  </span>
                </button>

                {fNoteRanked&&(
                  <div style={{marginTop:12,background:CELL,borderRadius:12,padding:"11px 13px",fontSize:12,color:SUB,lineHeight:1.5}}>{fNoteRanked}</div>
                )}

                <button onClick={sendResult} disabled={busy} style={{display:"block",width:"100%",textAlign:"center",marginTop:18,background:GRAD,color:"#06210F",borderRadius:14,padding:16,fontSize:16,fontWeight:800,textTransform:"uppercase",letterSpacing:".03em",cursor:busy?"wait":"pointer",opacity:busy?.7:1,fontFamily:"inherit"}}>{busy?"…":fDone.length?"Weiteres Ergebnis absenden":"Ergebnis absenden"}</button>

                {fDone.length>0&&(
                  <div style={{marginTop:16,background:CELL,borderRadius:14,padding:"13px 14px"}}>
                    <div style={{fontSize:11,fontWeight:700,color:MUT,letterSpacing:".04em",textTransform:"uppercase",marginBottom:8}}>Eingetragen ({fDone.length})</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                      {fDone.map((s,i)=>(
                        <span key={i} style={{fontSize:13,fontWeight:800,color:W,background:"#12151A",borderRadius:8,padding:"5px 10px"}}>{s}</span>
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
          <div onClick={e=>e.stopPropagation()} style={{background:BG,borderLeft:`1px solid ${B}`,height:"100%",width:"83%",maxWidth:380,display:"flex",flexDirection:"column",boxShadow:"-22px 0 50px rgba(0,0,0,.55)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"15px 16px",borderBottom:`1px solid ${B}`}}>
              <span style={{fontSize:15,fontWeight:600,color:W}}>Liga-Chat</span>
              <button onClick={()=>setChatOpen(false)} style={{background:"none",color:M,fontSize:18,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
              {msgs.length===0?<p style={{textAlign:"center",color:MUT,fontSize:13,marginTop:20}}>Noch keine Nachrichten — schreib die erste 👋</p>:msgs.filter(m=>!m.parent_id).map(m=>{
                const kommentare=msgs.filter(k=>k.parent_id===m.id)
                if(m.kind==="match"){
                  let d:{winner:string,loser:string,wSets:number,lSets:number,detail:string,ranked?:boolean,pending?:boolean,enteredBy?:string}|null=null
                  try{d=JSON.parse(m.text)}catch{/**/}
                  const r=m.reactions
                  return(
                    <div key={m.id} style={{alignSelf:"stretch"}}>
                      <div style={{background:C,borderRadius:14,padding:"11px 14px"}}>
                        <div style={{fontSize:10,fontWeight:700,color:d?.pending?MUT:d?.ranked===false?MUT:"rgba(57,255,20,.7)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:5}}>
                          {d?.pending?"Neues Ergebnis · wartet auf Bestätigung":d?.ranked===false?"Match · zählt nicht":"Match bestätigt"}
                        </div>
                        {d&&<>
                          <div style={{fontSize:14,fontWeight:800,color:W,marginBottom:2}}>{d.winner} <span style={{color:d.pending?MUT:d.ranked===false?MUT:"rgba(57,255,20,.9)"}}>schlägt</span> {d.loser}</div>
                          <div style={{fontSize:12,color:MUT,marginBottom:8}}>
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
                              <button key={type} onClick={()=>react(m.id,type)} style={{display:"flex",alignItems:"center",gap:4,background:active?"rgba(255,255,255,.14)":"rgba(255,255,255,.06)",borderRadius:99,padding:"4px 10px",fontSize:13,cursor:"pointer",color:W,fontFamily:"inherit"}}>
                                <span>{emoji}</span>
                                {cnt>0&&<span style={{fontSize:11,fontWeight:700,color:active?"#57CF79":MUT}}>{cnt}</span>}
                              </button>
                            )
                          })}
                          {/* Kommentieren — das Spiel selbst ist der Gesprächsanlass */}
                          <button onClick={()=>setCmtOpen(o=>({...o,[m.id]:!o[m.id]}))}
                            style={{display:"flex",alignItems:"center",gap:5,marginLeft:"auto",background:"rgba(255,255,255,.06)",borderRadius:99,padding:"4px 10px",fontSize:11,fontWeight:700,color:kommentare.length?W:MUT,cursor:"pointer",fontFamily:"inherit"}}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M4 5h16v11H9l-4 3v-3H4z"/></svg>
                            {kommentare.length>0?kommentare.length:"Kommentieren"}
                          </button>
                        </div>

                        {/* Kommentare */}
                        {(kommentare.length>0||cmtOpen[m.id])&&(
                          <div style={{marginTop:11,paddingTop:10,borderTop:"1px solid rgba(255,255,255,.08)",display:"flex",flexDirection:"column",gap:7}}>
                            {kommentare.map(k=>(
                              <div key={k.id} style={{display:"flex",gap:7,alignItems:"baseline"}}>
                                <span style={{fontSize:11,fontWeight:800,color:k.user_id===userId?"rgba(57,255,20,.9)":SUB,flexShrink:0}}>{k.user_id===userId?"Du":k.name}</span>
                                <span style={{fontSize:12.5,color:W,fontWeight:500,lineHeight:1.45,wordBreak:"break-word"}}>{k.text}</span>
                              </div>
                            ))}
                            {myReg&&(
                              <div style={{display:"flex",gap:6,marginTop:3}}>
                                <input
                                  value={cmt[m.id]||""}
                                  onChange={e=>setCmt(c=>({...c,[m.id]:e.target.value}))}
                                  onKeyDown={e=>{if(e.key==="Enter")sendComment(m.id)}}
                                  placeholder="Kommentar zum Spiel …"
                                  style={{flex:1,minWidth:0,background:"rgba(0,0,0,.25)",borderRadius:999,padding:"9px 12px",color:W,fontSize:12.5,outline:"none",fontFamily:"inherit"}}/>
                                <button onClick={()=>sendComment(m.id)} aria-label="Kommentar senden"
                                  style={{width:36,flexShrink:0,borderRadius:999,background:GRAD,color:"#06210F",fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>→</button>
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
                    {!mine&&<div style={{fontSize:10,color:MUT,margin:"0 0 3px 4px"}}>{m.name}</div>}
                    <div style={{background:C,borderRadius:14,padding:"9px 12px",fontSize:13,fontWeight:500,color:W}}>{m.text}</div>
                  </div>
                )
              })}
            </div>
            {myReg?(
              <div style={{display:"flex",gap:8,padding:"12px 14px",borderTop:`1px solid ${B}`}}>
                <input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")send()}} placeholder="Nachricht an die Liga …" style={{flex:1,background:C,borderRadius:999,padding:"11px 14px",color:W,fontSize:13,outline:"none"}}/>
                <button onClick={send} style={{width:42,borderRadius:999,background:GRAD,color:"#06210F",fontWeight:800,cursor:"pointer"}}>→</button>
              </div>
            ):(
              <p style={{padding:"14px",textAlign:"center",color:M,fontSize:12}}>Tritt der Liga bei, um mitzuschreiben.</p>
            )}
          </div>
        </div>
      )}

      {toast&&<div style={{position:"fixed",bottom:84,left:0,right:0,display:"flex",justifyContent:"center",zIndex:120}}><div style={{background:CARD,color:W,borderRadius:999,padding:"10px 18px",fontSize:13}}>{toast}</div></div>}
      <BottomNav />
    </main>
  )
}
