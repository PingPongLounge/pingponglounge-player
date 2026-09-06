"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import StartMenu from "./StartMenu"
import NotificationBell from "./NotificationBell"

const HIDE=["/","/login","/onboarding","/spielen","/join","/auth","/liga","/match","/turniere","/training","/shop"]
const BLACK="#080808",OFF="#F4F1EB",V="#8C3DFF"

export default function AppHeader(){
 const path=usePathname()||"/";const[initialen,setInitialen]=useState("")
 useEffect(()=>{;(async()=>{const sb=createClient();const{data:{user}}=await sb.auth.getUser();if(!user)return;const{data:p}=await sb.from("profiles").select("name").eq("id",user.id).maybeSingle();const n=(p?.name||"").trim();if(n)setInitialen(n.split(/\s+/).map((w:string)=>w[0]).join("").slice(0,2).toUpperCase())})()},[])
 if(HIDE.some(h=>h===path||(h!=="/"&&path.startsWith(h))))return null
 return <header style={{position:"sticky",top:0,zIndex:50,background:BLACK,borderBottom:"1px solid rgba(244,241,235,.12)"}}><div style={{maxWidth:1100,margin:"0 auto",padding:"14px clamp(16px,4vw,32px)",display:"flex",alignItems:"center",justifyContent:"space-between"}}><Link href="/entdecken" aria-label="PPL Player Startseite" style={{display:"inline-flex",alignItems:"baseline",textDecoration:"none",fontWeight:900,letterSpacing:"-.035em",lineHeight:1,fontSize:21}}><span style={{color:OFF}}>PPL</span><span style={{color:V}}>.</span><span style={{color:V,marginLeft:6}}>PLAYER</span></Link><div style={{display:"flex",alignItems:"center",gap:9}}>{initialen&&<NotificationBell/>}{initialen&&<Link href="/profil" aria-label="Profil" style={{width:38,height:38,borderRadius:"50%",border:`1px solid ${V}`,background:"transparent",color:OFF,fontSize:12,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",textDecoration:"none",flexShrink:0}}>{initialen}</Link>}<StartMenu inline/></div></div></header>
}