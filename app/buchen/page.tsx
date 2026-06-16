"use client"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import BottomNav from "@/app/components/BottomNav"
import Link from "next/link"

const BG="#111214",C="#15161A",B="#26282E",M="#6B6E7A",G="#39FF14",W="#E8E6E1",PK="#FF00C8"

// ── Venues (v1: hardcoded; v2: aus Supabase venues Tabelle) ─────────────────
const VENUES = [
  { id:"oerlikon",    name:"Oerlikon",    city:"Zürich",     tables:7, priceH:25, priceHalf:15,
    resourceId:"142166", eversports:null, requiresPayment:false, teamOnly:false, tag:null, flagship:true,
    openHours:[{dow:2,o:"18:00",c:"22:00"},{dow:3,o:"18:00",c:"22:00"},{dow:4,o:"18:00",c:"22:00"},{dow:5,o:"18:00",c:"22:00"}] },
  { id:"langstrasse", name:"Langstrasse", city:"Zürich",     tables:5, priceH:25, priceHalf:15,
    resourceId:"206740", eversports:null, requiresPayment:false, teamOnly:false, tag:null, flagship:false,
    openHours:[{dow:3,o:"18:00",c:"22:00"},{dow:4,o:"18:00",c:"00:00"},{dow:5,o:"18:00",c:"21:00"},{dow:6,o:"18:00",c:"21:00"}] },
  { id:"glattbrugg",  name:"Glattbrugg",  city:"Opfikon",    tables:9, priceH:25, priceHalf:15,
    resourceId:"", eversports:"https://www.eversports.ch/widget/w/5a5zxf", requiresPayment:false, teamOnly:false, tag:"24/7", flagship:false,
    openHours:[] },
  { id:"basel",       name:"Basel",       city:"Basel",      tables:5, priceH:25, priceHalf:15,
    resourceId:"251796", eversports:null, requiresPayment:false, teamOnly:false, tag:null, flagship:false,
    openHours:[{dow:5,o:"18:00",c:"22:00"},{dow:6,o:"18:00",c:"22:00"}] },
  { id:"luzern",      name:"Luzern",      city:"Kriens",     tables:6, priceH:25, priceHalf:15,
    resourceId:"229327", eversports:null, requiresPayment:false, teamOnly:true, tag:"Teamevents", flagship:false,
    openHours:[] },
  { id:"stgallen",    name:"St. Gallen",  city:"St. Gallen", tables:4, priceH:20, priceHalf:10,
    resourceId:"251795", eversports:null, requiresPayment:true, teamOnly:false, tag:null, flagship:false,
    openHours:[{dow:0,o:"07:00",c:"00:00"},{dow:1,o:"07:00",c:"00:00"},{dow:2,o:"07:00",c:"00:00"},{dow:3,o:"07:00",c:"00:00"},{dow:4,o:"07:00",c:"00:00"},{dow:5,o:"07:00",c:"00:00"},{dow:6,o:"07:00",c:"00:00"}] },
]

type Venue = typeof VENUES[0]
type Slot = { hour:number; start:string; end:string; available:boolean; tablesBooked:number }
type Step = "location"|"calendar"|"slot"|"form"|"booking"|"done"

function isoDate(d:Date){ return d.toISOString().split("T")[0] }
function pad(n:number){ return String(n).padStart(2,"0") }
function isOpen(v:Venue,d:Date):boolean{
  if(v.openHours.length===0) return true // 24/7 oder teamOnly
  return v.openHours.some(h=>h.dow===d.getDay())
}
function formatDate(d:Date){ return d.toLocaleDateString("de-CH",{weekday:"long",day:"numeric",month:"long"}) }
function hourLabel(h:number){ return `${pad(h)}:00` }

export default function BuchenPage(){
  const [step,setStep]=useState<Step>("location")
  const [venue,setVenue]=useState<Venue|null>(null)
  const [calMonth,setCalMonth]=useState<Date>(()=>{const d=new Date();d.setDate(1);return d})
  const [selectedDate,setSelectedDate]=useState<Date|null>(null)
  const [calDays,setCalDays]=useState<Record<string,{tablesBooked?:number}>>({})
  const [calLoading,setCalLoading]=useState(false)
  const [slots,setSlots]=useState<Slot[]>([])
  const [slotsLoading,setSlotsLoading]=useState(false)
  const [selectedSlot,setSelectedSlot]=useState<Slot|null>(null)
  const [duration,setDuration]=useState(1)   // Stunden
  const [tables,setTables]=useState(1)
  const [profile,setProfile]=useState<{name:string;email:string}|null>(null)
  const [form,setForm]=useState({firstName:"",lastName:"",email:"",phone:""})
  const [booking,setBooking]=useState(false)
  const [bookErr,setBookErr]=useState("")

  // Profile laden für pre-fill
  useEffect(()=>{
    const sb=createClient()
    sb.auth.getUser().then(({data:{user}})=>{
      if(!user) return
      sb.from("profiles").select("name").eq("id",user.id).single().then(({data})=>{
        const parts=(data?.name||"").split(" ")
        setProfile({name:data?.name||"",email:user.email||""})
        setForm(f=>({...f,firstName:parts[0]||"",lastName:parts.slice(1).join(" ")||"",email:user.email||""}))
      })
    })
  },[])

  // Kalender-Daten laden
  const loadCal=useCallback(async()=>{
    if(!venue?.resourceId||!venue.resourceId) return
    setCalLoading(true)
    try{
      const y=calMonth.getFullYear(),m=calMonth.getMonth()+1
      const r=await fetch(`/api/planyo?method=month_calendar&resource_id=${venue.resourceId}&year=${y}&month=${m}`)
      const d=await r.json()
      setCalDays(d.days||{})
    }catch{}
    setCalLoading(false)
  },[venue,calMonth])

  useEffect(()=>{if(step==="calendar")loadCal()},[step,loadCal])

  // Slots laden wenn Datum gewählt
  useEffect(()=>{
    if(!venue?.resourceId||!selectedDate) return
    setSlotsLoading(true)
    setSlots([])
    const d=isoDate(selectedDate)
    fetch(`/api/planyo?method=get_slots&resource_id=${venue.resourceId}&date=${d}&max_tables=${venue.tables}`)
      .then(r=>r.json()).then(r=>setSlots(r.slots||[])).catch(()=>{}).finally(()=>setSlotsLoading(false))
  },[venue,selectedDate])

  // Kalender
  function calDays_(){
    const first=new Date(calMonth.getFullYear(),calMonth.getMonth(),1)
    const last=new Date(calMonth.getFullYear(),calMonth.getMonth()+1,0)
    const offset=first.getDay()===0?6:first.getDay()-1
    const cells:Array<Date|null>=[...Array(offset).fill(null)]
    for(let d=1;d<=last.getDate();d++) cells.push(new Date(calMonth.getFullYear(),calMonth.getMonth(),d))
    return cells
  }

  // Preis berechnen
  function calcPrice():number{
    if(!venue) return 0
    if(duration===0.5) return venue.priceHalf*tables
    return venue.priceH*tables*duration
  }

  // Buchung abschicken
  async function book(){
    if(!venue||!selectedDate||!selectedSlot) return
    if(!form.firstName||!form.lastName||!form.email){setBookErr("Bitte alle Felder ausfüllen");return}
    setBooking(true);setBookErr("")
    const startH=selectedSlot.hour
    const endH=startH+duration
    const dateStr=isoDate(selectedDate)
    const start=`${dateStr} ${pad(startH)}:00`
    const end=`${dateStr} ${pad(endH)}:00`
    try{
      const res=await fetch("/api/planyo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        method:"make_reservation",resource_id:venue.resourceId,
        start_time:start,end_time:end,
        first_name:form.firstName,last_name:form.lastName,email:form.email,phone:form.phone,
        quantity:String(tables),
      })})
      const data=await res.json()
      if(!res.ok||data?.response_code!==0){setBookErr(data?.error||data?.error_message||"Buchungsfehler");setBooking(false);return}
      const reservationId=data?.data?.reservation_id
      if(!reservationId){setBookErr("Keine Reservations-ID erhalten");setBooking(false);return}
      if(venue.requiresPayment){
        // Stripe Checkout
        const pay=await fetch("/api/booking/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
          reservation_id:reservationId,location_name:venue.name,
          date_label:formatDate(selectedDate),
          time_label:`${hourLabel(startH)}–${hourLabel(endH)} · ${tables} Tisch${tables>1?"e":""}`,
          email:form.email,
        })})
        const payData=await pay.json()
        if(payData.url) window.location.href=payData.url
        else{setBookErr(payData.error||"Stripe Fehler");setBooking(false)}
      } else {
        setStep("done")
      }
    }catch(e){setBookErr("Netzwerkfehler");setBooking(false)}
  }

  // Paid callback
  useEffect(()=>{
    if(typeof window!=="undefined"&&window.location.search.includes("paid=1")) setStep("done")
  },[])

  const today=new Date();today.setHours(0,0,0,0)

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return(
    <main style={{minHeight:"100vh",background:BG,padding:"20px 16px 100px"}}>
      <div style={{maxWidth:480,margin:"0 auto"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
          {step!=="location"&&<button onClick={()=>{
            if(step==="calendar"){setStep("location");setSelectedDate(null)}
            else if(step==="slot"){setStep("calendar")}
            else if(step==="form"){setStep("slot")}
            else if(step==="booking"){setStep("form")}
          }} style={{background:"none",border:"none",color:M,fontSize:20,cursor:"pointer",padding:0}}>←</button>}
          <h1 style={{fontSize:22,fontWeight:900,color:W,textTransform:"uppercase",flex:1}}>
            {step==="location"?"Standort wählen":step==="calendar"?"Datum wählen":step==="slot"?"Zeit + Dauer":step==="form"?"Deine Angaben":step==="done"?"✓ Gebucht!":""}
            {venue&&step!=="location"&&step!=="done"&&<span style={{fontSize:13,fontWeight:400,color:M,display:"block",textTransform:"none"}}>{venue.name} · {venue.city}</span>}
          </h1>
        </div>

        {/* ── STEP: LOCATION ──────────────────────────────────────────────── */}
        {step==="location"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {VENUES.map(v=>(
              <button key={v.id} onClick={()=>{
                if(v.teamOnly) return
                if(v.eversports){ window.open(v.eversports,"_blank"); return }
                setVenue(v);setStep("calendar")
              }} style={{
                background:C,border:`1px solid ${B}`,borderRadius:14,padding:"16px",textAlign:"left",cursor:v.teamOnly?"not-allowed":"pointer",
                opacity:v.teamOnly?0.5:1,width:"100%"
              }}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:16,fontWeight:800,color:W}}>{v.name}</span>
                      {v.flagship&&<span style={{fontSize:9,fontWeight:700,color:G,background:`${G}18`,border:`1px solid ${G}30`,borderRadius:999,padding:"2px 6px"}}>FLAGSHIP</span>}
                      {v.tag&&<span style={{fontSize:9,fontWeight:700,color:PK,background:`${PK}18`,border:`1px solid ${PK}30`,borderRadius:999,padding:"2px 6px"}}>{v.tag}</span>}
                    </div>
                    <span style={{fontSize:12,color:M}}>{v.city} · {v.tables} Tische · CHF {v.priceH}/h</span>
                  </div>
                  <span style={{fontSize:13,color:v.teamOnly?M:v.eversports?PK:G,fontWeight:700}}>
                    {v.teamOnly?"Nur Events":v.eversports?"Extern →":"→"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── STEP: CALENDAR ──────────────────────────────────────────────── */}
        {step==="calendar"&&venue&&(
          <div>
            {/* Monats-Navigation */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <button onClick={()=>setCalMonth(m=>{const n=new Date(m);n.setMonth(n.getMonth()-1);return n})}
                style={{background:C,border:`1px solid ${B}`,borderRadius:8,padding:"8px 14px",color:W,cursor:"pointer",fontSize:16}}>‹</button>
              <span style={{fontSize:15,fontWeight:700,color:W}}>
                {calMonth.toLocaleDateString("de-CH",{month:"long",year:"numeric"})}
              </span>
              <button onClick={()=>setCalMonth(m=>{const n=new Date(m);n.setMonth(n.getMonth()+1);return n})}
                style={{background:C,border:`1px solid ${B}`,borderRadius:8,padding:"8px 14px",color:W,cursor:"pointer",fontSize:16}}>›</button>
            </div>
            {/* Wochentage */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:6}}>
              {["Mo","Di","Mi","Do","Fr","Sa","So"].map(d=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:M,padding:"4px 0"}}>{d}</div>)}
            </div>
            {/* Kalender-Grid */}
            {calLoading?<p style={{textAlign:"center",color:M,padding:20}}>Lädt...</p>:(
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
                {calDays_().map((d,i)=>{
                  if(!d) return <div key={i}/>
                  const iso=isoDate(d)
                  const isPast=d<today
                  const isSelected=selectedDate&&isoDate(selectedDate)===iso
                  const info=calDays[iso]
                  const isOpenDay=isOpen(venue,d)
                  const busy=(info?.tablesBooked||0)>=venue.tables
                  const disabled=isPast||!isOpenDay||busy
                  return(
                    <button key={i} onClick={()=>{if(!disabled){setSelectedDate(d);setSelectedSlot(null);setStep("slot")}}}
                      style={{
                        background:isSelected?G:C,border:`1px solid ${isSelected?G:disabled?"transparent":B}`,
                        borderRadius:8,padding:"10px 0",textAlign:"center",cursor:disabled?"not-allowed":"pointer",
                        opacity:disabled?0.3:1,
                      }}>
                      <span style={{fontSize:14,fontWeight:700,color:isSelected?"#0A0A0C":disabled?M:W}}>{d.getDate()}</span>
                      {info&&!busy&&<div style={{width:4,height:4,borderRadius:"50%",background:M,margin:"2px auto 0"}}/>}
                    </button>
                  )
                })}
              </div>
            )}
            {venue.openHours.length>0&&(
              <p style={{fontSize:11,color:M,marginTop:16,textAlign:"center"}}>
                Geöffnet: {venue.openHours.map(h=>{
                  const days=["So","Mo","Di","Mi","Do","Fr","Sa"]
                  return `${days[h.dow]} ${h.o}–${h.c}`
                }).join(" / ")}
              </p>
            )}
          </div>
        )}

        {/* ── STEP: SLOT ──────────────────────────────────────────────────── */}
        {step==="slot"&&venue&&selectedDate&&(
          <div>
            <p style={{fontSize:13,color:M,marginBottom:16}}>{formatDate(selectedDate)}</p>

            {/* Dauer */}
            <p style={{fontSize:11,fontWeight:700,color:M,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Dauer</p>
            <div style={{display:"flex",gap:8,marginBottom:20}}>
              {[0.5,1,1.5,2,3].map(h=>(
                <button key={h} onClick={()=>setDuration(h)} style={{
                  flex:1,background:duration===h?G:C,border:`1px solid ${duration===h?G:B}`,borderRadius:8,
                  padding:"10px 4px",fontSize:12,fontWeight:700,color:duration===h?"#0A0A0C":M,cursor:"pointer"
                }}>{h===0.5?"30'":`${h}h`}</button>
              ))}
            </div>

            {/* Tische */}
            <p style={{fontSize:11,fontWeight:700,color:M,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Tische</p>
            <div style={{display:"flex",gap:8,marginBottom:20}}>
              {[1,2,3,4].filter(n=>n<=venue.tables).map(n=>(
                <button key={n} onClick={()=>setTables(n)} style={{
                  flex:1,background:tables===n?G:C,border:`1px solid ${tables===n?G:B}`,borderRadius:8,
                  padding:"10px 4px",fontSize:14,fontWeight:800,color:tables===n?"#0A0A0C":M,cursor:"pointer"
                }}>{n}</button>
              ))}
            </div>

            {/* Slots */}
            <p style={{fontSize:11,fontWeight:700,color:M,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Startzeit</p>
            {slotsLoading?<p style={{color:M,textAlign:"center",padding:16}}>Prüfe Verfügbarkeit...</p>:(
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {slots.filter(s=>{
                  // Slot nur zeigen wenn Dauer in Öffnungszeiten passt und heute nicht in der Vergangenheit
                  if(!s.available) return false
                  const now=new Date()
                  if(isoDate(selectedDate)===isoDate(today)&&s.hour<=now.getHours()) return false
                  if(venue.openHours.length>0){
                    const oh=venue.openHours.find(h=>h.dow===selectedDate!.getDay())
                    if(!oh) return false
                    const openH=parseInt(oh.o.split(":")[0])
                    const closeH=oh.c==="00:00"?24:parseInt(oh.c.split(":")[0])
                    if(s.hour<openH||s.hour+duration>closeH) return false
                  }
                  return true
                }).map(s=>{
                  const isSelected=selectedSlot?.hour===s.hour
                  return(
                    <button key={s.hour} onClick={()=>setSelectedSlot(s)} style={{
                      background:isSelected?G:C,border:`1px solid ${isSelected?G:B}`,borderRadius:10,
                      padding:"12px 8px",textAlign:"center",cursor:"pointer"
                    }}>
                      <span style={{fontSize:15,fontWeight:800,color:isSelected?"#0A0A0C":W}}>{hourLabel(s.hour)}</span>
                      {s.tablesBooked>0&&<div style={{fontSize:10,color:isSelected?"#0A0A0C60":M,marginTop:2}}>{venue.tables-s.tablesBooked} frei</div>}
                    </button>
                  )
                })}
              </div>
            )}

            {selectedSlot&&(
              <div style={{marginTop:20,background:C,border:`1px solid ${B}`,borderRadius:12,padding:"14px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <p style={{fontSize:13,color:M}}>Zusammenfassung</p>
                    <p style={{fontSize:16,fontWeight:800,color:W}}>
                      {hourLabel(selectedSlot.hour)}–{hourLabel(selectedSlot.hour+duration)} · {tables} Tisch{tables>1?"e":""}
                    </p>
                  </div>
                  <p style={{fontSize:22,fontWeight:900,color:G}}>CHF {calcPrice()}</p>
                </div>
                <button onClick={()=>setStep("form")} style={{
                  marginTop:14,width:"100%",background:G,color:"#0A0A0C",border:"none",borderRadius:10,
                  padding:"14px",fontSize:14,fontWeight:800,cursor:"pointer",textTransform:"uppercase"
                }}>Weiter →</button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP: FORM ──────────────────────────────────────────────────── */}
        {step==="form"&&venue&&selectedDate&&selectedSlot&&(
          <div>
            <div style={{background:C,border:`1px solid ${B}`,borderRadius:12,padding:"14px 16px",marginBottom:20}}>
              <p style={{fontSize:13,color:M,marginBottom:4}}>{venue.name} · {formatDate(selectedDate)}</p>
              <p style={{fontSize:16,fontWeight:800,color:W}}>
                {hourLabel(selectedSlot.hour)}–{hourLabel(selectedSlot.hour+duration)} · {tables} Tisch{tables>1?"e":""}
              </p>
              <p style={{fontSize:20,fontWeight:900,color:G,marginTop:4}}>CHF {calcPrice()}</p>
            </div>

            {[
              {label:"Vorname",key:"firstName",placeholder:"Max"},
              {label:"Nachname",key:"lastName",placeholder:"Muster"},
              {label:"E-Mail",key:"email",placeholder:"max@beispiel.ch",type:"email"},
              {label:"Telefon (optional)",key:"phone",placeholder:"+41 79 123 45 67",type:"tel"},
            ].map(field=>(
              <div key={field.key} style={{marginBottom:14}}>
                <label style={{fontSize:11,fontWeight:700,color:M,textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:6}}>{field.label}</label>
                <input
                  type={field.type||"text"}
                  value={form[field.key as keyof typeof form]}
                  onChange={e=>setForm(f=>({...f,[field.key]:e.target.value}))}
                  placeholder={field.placeholder}
                  style={{width:"100%",background:C,border:`1px solid ${B}`,borderRadius:10,padding:"13px 14px",
                    fontSize:15,color:W,outline:"none",boxSizing:"border-box" as const}}
                />
              </div>
            ))}

            {bookErr&&<p style={{color:"#f87171",fontSize:13,marginBottom:12}}>{bookErr}</p>}

            <button onClick={book} disabled={booking} style={{
              width:"100%",background:G,color:"#0A0A0C",border:"none",borderRadius:12,
              padding:"16px",fontSize:15,fontWeight:800,cursor:booking?"wait":"pointer",textTransform:"uppercase"
            }}>
              {booking?"Buchung läuft...":venue.requiresPayment?`Jetzt buchen & bezahlen (CHF ${calcPrice()})`:
               `Gratis reservieren · CHF ${calcPrice()} vor Ort`}
            </button>
            <p style={{fontSize:11,color:M,textAlign:"center",marginTop:10}}>
              {venue.requiresPayment?"Bezahlung via Stripe Checkout":"Bezahlung direkt vor Ort"}
            </p>
          </div>
        )}

        {/* ── STEP: DONE ──────────────────────────────────────────────────── */}
        {step==="done"&&(
          <div style={{textAlign:"center",padding:"40px 0"}}>
            <div style={{fontSize:60,marginBottom:20}}>🏓</div>
            <h2 style={{fontSize:24,fontWeight:900,color:G,marginBottom:10}}>Buchung bestätigt!</h2>
            {venue&&selectedDate&&selectedSlot&&(
              <div style={{background:C,border:`1px solid ${G}30`,borderRadius:14,padding:"20px",marginBottom:24,textAlign:"left"}}>
                <p style={{fontSize:14,color:W,fontWeight:700,marginBottom:4}}>{venue.name} · {venue.city}</p>
                <p style={{fontSize:13,color:M,marginBottom:2}}>{formatDate(selectedDate)}</p>
                <p style={{fontSize:16,fontWeight:800,color:W}}>{hourLabel(selectedSlot.hour)}–{hourLabel(selectedSlot.hour+duration)}</p>
                <p style={{fontSize:13,color:M,marginTop:4}}>{tables} Tisch{tables>1?"e":""} · CHF {calcPrice()}</p>
              </div>
            )}
            <p style={{fontSize:13,color:M,marginBottom:24}}>Bestätigung wurde an {form.email} gesendet.</p>
            <button onClick={()=>{setStep("location");setVenue(null);setSelectedDate(null);setSelectedSlot(null);if(window.history.state)window.history.replaceState({},"","/buchen")}}
              style={{background:G,color:"#0A0A0C",border:"none",borderRadius:10,padding:"14px 28px",fontSize:14,fontWeight:800,cursor:"pointer"}}>
              Neue Buchung
            </button>
            <div style={{marginTop:16}}><Link href="/entdecken" style={{color:M,fontSize:13}}>← Dashboard</Link></div>
          </div>
        )}

      </div>
      <BottomNav/>
    </main>
  )
}
