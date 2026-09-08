"use client"
import{useEffect,useState}from"react"
import Link from"next/link"
import ProfilAvatar from "@/app/components/ProfilAvatar"
import HeroKopf from "@/app/components/HeroKopf"
import {
  Hero, Inhalt, AbschnittKopf, Feld, StatsReihe, ListenZeile, AktionsZeile, Symbol, Pille, Pfeil,
  knopfPrimaer, knopfOutlineHell, TEXT_LEISE, FLAECHE,
} from "@/app/components/V2"
import BottomNav from"@/app/components/BottomNav"
import LogoutButton from"@/app/components/LogoutButton"
import{createClient}from"@/lib/supabase/client"
const V="#8C3DFF",B="#080808",P="#F4F1EB",M="#8e8b87",L="#292929"
type RecentMatch={id:string;sets:Array<{p1:number,p2:number}>|null;winner_id:string|null;confirmed_at:string;p1_id:string;p2_id:string;p1:{name:string}|null;p2:{name:string}|null;season:{name:string,city:string}|null};type Profile={id:string;name:string;real_name?:string|null;elo:number;level:string;matches_played:number;matches_won:number;canton:string|null;avatar_url?:string|null;allow_challenges?:boolean|null;allow_friend_requests?:boolean|null;visible_in_ranking?:boolean|null}
const CM:Record<string,string>={"Aargau":"AG","Appenzell Ausserrhoden":"AR","Appenzell Innerrhoden":"AI","Basel-Landschaft":"BL","Basel-Stadt":"BS","Bern":"BE","Freiburg":"FR","Genf":"GE","Glarus":"GL","Graubünden":"GR","Jura":"JU","Luzern":"LU","Neuenburg":"NE","Nidwalden":"NW","Obwalden":"OW","Schaffhausen":"SH","Schwyz":"SZ","Solothurn":"SO","St. Gallen":"SG","Tessin":"TI","Thurgau":"TG","Uri":"UR","Waadt":"VD","Wallis":"VS","Zug":"ZG","Zürich":"ZH"},CANTONS=Object.keys(CM)
function ago(d:string){const n=Math.floor((Date.now()-new Date(d).getTime())/86400000);return n<1?"heute":n===1?"gestern":n<7?`vor ${n}d`:new Date(d).toLocaleDateString("de-CH",{day:"numeric",month:"short"})}
export default function ProfilPage(){const[profile,setProfile]=useState<Profile|null>(null),[matches,setMatches]=useState<RecentMatch[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[pp,setPp]=useState(0),[earned,setEarned]=useState(0),[lastDelta,setLastDelta]=useState<number|null>(null),[name,setName]=useState(""),[canton,setCanton]=useState(""),[saving,setSaving]=useState(false),[done,setDone]=useState(false),[ruhe,setRuhe]=useState<{c:boolean;f:boolean;r:boolean}|null>(null),[ruheSaving,setRuheSaving]=useState(false);async function load(){setError("");try{const[a,p,r]=await Promise.all([fetch("/api/achievements"),fetch("/api/pingpoints"),fetch("/api/profil")]);const aa=await a.json(),px=await p.json(),rr=await r.json();setEarned(aa.earned||0);setPp(px.balance||0);setProfile(rr.profile);setMatches(rr.recentMatches||[]);const h=rr.eloHistory||[];setLastDelta(h.length?h[h.length-1].delta:null);setRuhe({c:rr.profile?.allow_challenges!==false,f:rr.profile?.allow_friend_requests!==false,r:rr.profile?.visible_in_ranking!==false})}catch{setError("Profil konnte nicht geladen werden")}finally{setLoading(false)}}useEffect(()=>{load()},[]);async function complete(){setSaving(true);const sb=createClient();const{data:{user}}=await sb.auth.getUser();if(user){const patch:Record<string,string>={};if(name.trim())patch.real_name=name.trim();if(canton)patch.canton=CM[canton]||canton;const{error}=await sb.from("profiles").update(patch).eq("id",user.id);if(!error){setDone(true);await load()}}setSaving(false)}async function toggle(f:"allow_challenges"|"allow_friend_requests"|"visible_in_ranking",v:boolean){setRuheSaving(true);const sb=createClient();const{data:{user}}=await sb.auth.getUser();if(user)await sb.from("profiles").update({[f]:v}).eq("id",user.id);setRuhe(x=>{const z=x||{c:true,f:true,r:true};return f==="allow_challenges"?{...z,c:v}:f==="allow_friend_requests"?{...z,f:v}:{...z,r:v}});setRuheSaving(false)}if(loading)return <main style={{minHeight:"100vh",background:FLAECHE,color:M,display:"grid",placeItems:"center"}}>Profil wird geladen …<BottomNav/></main>
if(error||!profile)return <main style={{minHeight:"100vh",background:FLAECHE,color:B,display:"grid",placeItems:"center",padding:20}}>{error||"Nicht eingeloggt."}<BottomNav/></main>

const played=profile.matches_played||0, won=profile.matches_won||0, wr=played?Math.round(won/played*100):0

return <>
  <main style={{minHeight:"100vh",background:FLAECHE,color:B}}>

    {/* Kein weiteres Actionbild: PROFIL bekommt das ruhige Still-Life. */}
    <Hero
      bild="/ppl-equipment.jpg" pos="50% 52%"
      kopf={<HeroKopf rechts={<Link href="#einstellungen" aria-label="Einstellungen" style={{display:"inline-flex",width:38,height:38,borderRadius:"50%",border:"1px solid rgba(244,241,235,.22)",alignItems:"center",justifyContent:"center",color:P,textDecoration:"none"}}><Symbol art="zahnrad" groesse={18}/></Link>}/>}
      etikett="Player"
      titel={<>This<br/>is you.</>}
      subline="Dein Profil. Deine Stats. Deine Story."
    />

    <Inhalt>
      {/* ── Wer bin ich ── */}
      <Feld padding="18px 16px">
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <ProfilAvatar src={profile.avatar_url} name={profile.name} groesse={64} editierbar/>
          <div style={{flex:1,minWidth:0}}>
            <strong style={{display:"block",fontFamily:"var(--font-anton), Impact, sans-serif",fontWeight:400,fontSize:"clamp(24px,6.5vw,32px)",lineHeight:1,textTransform:"uppercase",color:B}}>{profile.name}</strong>
            <span style={{display:"block",fontSize:14.5,color:TEXT_LEISE,marginTop:5}}>Level {profile.level}{profile.canton?` · ${profile.canton}`:""}</span>
          </div>
          <Link href="/profil/avatar" aria-label="Profilbild ändern" style={{color:TEXT_LEISE,flexShrink:0,display:"inline-flex"}}>
            <Symbol art="spieler" groesse={20}/>
          </Link>
        </div>
        <div style={{borderTop:"1px solid rgba(8,8,8,.10)",marginTop:16}}>
          <StatsReihe werte={[
            {wert:profile.elo??1000,label:"Rating"},
            {wert:played,label:"Matches"},
            {wert:won,label:"Siege"},
            {wert:wr+"%",label:"Win Rate",akzent:true},
          ]}/>
        </div>
      </Feld>

      {lastDelta!==null&&(
        <p style={{fontSize:13.5,color:TEXT_LEISE,margin:"10px 2px 0"}}>
          Letzte Wertung <b style={{color:lastDelta>=0?"#12764B":"#C0353A"}}>{lastDelta>=0?"+":""}{lastDelta}</b> · Guthaben <b style={{color:B}}>{pp} PP</b>
        </p>
      )}

      {/* ── Profil vervollstaendigen ── */}
      {(!profile.real_name||!profile.canton)&&!done&&(
        <div style={{marginTop:24}}>
          <AbschnittKopf titel="Profil vervollständigen"/>
          <Feld padding={16}>
            <p style={{color:TEXT_LEISE,fontSize:14,margin:"0 0 12px"}}>Name und Kanton helfen bei Liga und Zuordnung.</p>
            {!profile.real_name&&<input value={name} onChange={e=>setName(e.target.value)} placeholder="Vor- und Nachname" style={{width:"100%",boxSizing:"border-box",background:"rgba(8,8,8,.05)",border:"1px solid rgba(8,8,8,.14)",borderRadius:10,padding:12,color:B,marginBottom:8,fontFamily:"inherit",fontSize:15}}/>}
            {!profile.canton&&<select value={canton} onChange={e=>setCanton(e.target.value)} style={{width:"100%",background:"rgba(8,8,8,.05)",border:"1px solid rgba(8,8,8,.14)",borderRadius:10,padding:12,color:B,marginBottom:12,fontFamily:"inherit",fontSize:15}}><option value="">Kanton wählen…</option>{CANTONS.map(c=><option key={c}>{c}</option>)}</select>}
            <button onClick={complete} disabled={saving||(!name.trim()&&!canton)} style={{...knopfPrimaer,opacity:saving?.6:1}}>{saving?"Speichert …":"Speichern"}</button>
          </Feld>
        </div>
      )}

      {/* ── Letzte Matches ── */}
      <div style={{marginTop:24}}>
        <AbschnittKopf titel="Letzte Matches" mehr={matches.length?"Alle":undefined} href={matches.length?"/matchhistorie":undefined}/>
        <Feld>
          {matches.length===0
            ? <div style={{padding:16,color:TEXT_LEISE,fontSize:15}}>Noch keine Matches gespielt.</div>
            : matches.slice(0,5).map((m,i)=>{
                const p1=m.p1_id===profile.id, opp=p1?m.p2?.name:m.p1?.name, w=m.winner_id===profile.id
                const sets=m.sets?.map(x=>p1?`${x.p1}:${x.p2}`:`${x.p2}:${x.p1}`).join(" ")||""
                return <ListenZeile key={m.id} erste={i===0}
                  titel={`vs. ${opp||"?"}`}
                  unter={`${m.season?.city||"Match"}${sets?` · ${sets}`:""} · ${ago(m.confirmed_at)}`}
                  rechts={<Pille text={w?"Sieg":"Niederlage"} ton={w?"gut":"warn"}/>}/>
              })}
        </Feld>
      </div>

      {/* ── Navigation: was frueher im Hamburger-Menue stand ── */}
      <div style={{marginTop:24}}>
        <AbschnittKopf titel="Dein Player"/>
        <Feld>
          <Link href="/matchhistorie" style={{textDecoration:"none",display:"block"}}>
            <AktionsZeile erste symbol={<Symbol art="verlauf"/>} titel="Match-History" unter={`${played} Matches gespielt`}/>
          </Link>
          <Link href="/achievements" style={{textDecoration:"none",display:"block"}}>
            <AktionsZeile symbol={<Symbol art="pokal"/>} titel="Achievements" unter={`${earned} verdient`}/>
          </Link>
          <Link href="/pingpoints" style={{textDecoration:"none",display:"block"}}>
            <AktionsZeile symbol={<Symbol art="blitz"/>} titel="PingPoints" unter={`${pp} PP Guthaben`}/>
          </Link>
          <Link href="/freunde" style={{textDecoration:"none",display:"block"}}>
            <AktionsZeile symbol={<Symbol art="freunde"/>} titel="Freunde" unter="Spieler finden und folgen"/>
          </Link>
          <Link href="/shop" style={{textDecoration:"none",display:"block"}}>
            <AktionsZeile symbol={<Symbol art="kalender"/>} titel="Shop" unter="PingPoints einlösen"/>
          </Link>
        </Feld>
      </div>

      {/* ── Einstellungen ── */}
      <div id="einstellungen" style={{marginTop:24,scrollMarginTop:16}}>
        <AbschnittKopf titel="Einstellungen"/>
        <Feld>
          <div style={{padding:"14px 16px 4px"}}>
            <p style={{fontSize:13.5,color:TEXT_LEISE,margin:0,lineHeight:1.5}}>Du entscheidest, wer dich erreichen darf. Spiele und Rating bleiben erhalten.</p>
          </div>
          {([["allow_challenges","Herausforderungen",ruhe?.c??true],["allow_friend_requests","Freundschaftsanfragen",ruhe?.f??true],["visible_in_ranking","In Rangliste anzeigen",ruhe?.r??true]] as [string,string,boolean][]).map(([f,t,on])=>(
            <div key={f} style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid rgba(8,8,8,.10)",padding:"14px 16px"}}>
              <strong style={{fontSize:14.5,fontWeight:700}}>{t}</strong>
              <button disabled={ruheSaving} onClick={()=>toggle(f as "allow_challenges"|"allow_friend_requests"|"visible_in_ranking",!on)} aria-pressed={on}
                style={{width:46,height:26,border:0,borderRadius:20,background:on?V:"rgba(8,8,8,.18)",position:"relative",cursor:"pointer",flexShrink:0}}>
                <span style={{position:"absolute",top:3,left:on?23:3,width:20,height:20,borderRadius:"50%",background:"#FFFFFF",transition:"left .15s"}}/>
              </button>
            </div>
          ))}
          <Link href="/auth/reset-password" style={{textDecoration:"none",display:"block"}}>
            <AktionsZeile symbol={<Symbol art="zahnrad"/>} titel="Passwort ändern" unter="Neues Passwort setzen"/>
          </Link>
          <a href="https://pingponglounge.ch/buchen" target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:15,padding:"17px 16px",borderTop:"1px solid rgba(8,8,8,.10)",textDecoration:"none"}}>
            <span aria-hidden style={{width:34,height:34,flexShrink:0,display:"grid",placeItems:"center",color:B}}><Symbol art="kalender"/></span>
            <span style={{flex:1,minWidth:0}}>
              <b style={{display:"block",fontSize:14.5,fontWeight:900,letterSpacing:".05em",textTransform:"uppercase",color:B}}>Tisch buchen</b>
              <span style={{display:"block",fontSize:13.5,color:TEXT_LEISE,marginTop:3}}>Auf pingponglounge.ch</span>
            </span>
            <span style={{color:TEXT_LEISE,fontSize:15}}>↗</span>
          </a>
        </Feld>

        <div style={{marginTop:18}}><LogoutButton/></div>
      </div>
    </Inhalt>
  </main>
  <BottomNav/>
</>
}
