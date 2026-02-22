import { useState, useEffect, useRef } from "react";
import { subscribeToData, saveData } from "./firebase.js";

// ── AI CONFIG ──
const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY || "";
async function askClaude(systemPrompt, userMessage) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": CLAUDE_API_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1500, system: systemPrompt, messages: [{ role: "user", content: userMessage }] }),
    });
    const data = await res.json();
    if (data.error) return { error: data.error.message };
    const text = data.content?.map(b => b.text || "").join("\n") || "";
    return { text };
  } catch (e) { return { error: e.message }; }
}

const makeDays = (start, end, cityMap) => {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const days = [];
  let i = 0;
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    days.push({
      day: i + 1,
      date: new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      isoDate: new Date(d).toISOString().split("T")[0],
      city: (cityMap && cityMap[i]) || "TBD",
      activities: [],
    });
    i++;
  }
  return days;
};

const DEFAULT_CITIES = ["Tokyo", "Osaka"];
const DEFAULT_START = "2026-03-07";
const DEFAULT_END = "2026-03-18";

const defaultCityMap = {};
for (let i = 0; i < 12; i++) defaultCityMap[i] = i < 7 ? "Tokyo" : "Osaka";

const SAMPLE_ACT = {
  0:[{id:"s1",time:"14:00",text:"Arrive at Narita Airport (NRT)"},{id:"s2",time:"16:30",text:"Check in at Hotel Gracery Shinjuku"},{id:"s3",time:"18:00",text:"Explore Shinjuku & dinner at Omoide Yokocho"},{id:"s4",time:"20:30",text:"Walk through Kabukicho & Golden Gai"}],
  1:[{id:"s5",time:"08:00",text:"Meiji Shrine morning visit"},{id:"s6",time:"10:30",text:"Harajuku & Takeshita Street"},{id:"s7",time:"12:00",text:"Lunch at Afuri Ramen (Harajuku)"},{id:"s8",time:"14:00",text:"Shibuya Crossing & Shibuya Sky"},{id:"s9",time:"18:00",text:"Dinner at Genki Sushi"}],
  2:[{id:"s10",time:"09:00",text:"teamLab Borderless (Azabudai Hills)"},{id:"s11",time:"12:00",text:"Lunch at Tsukiji Outer Market"},{id:"s12",time:"14:30",text:"Senso-ji Temple & Nakamise Street"},{id:"s13",time:"17:00",text:"Tokyo Skytree observation deck"},{id:"s14",time:"19:30",text:"Yakitori alley in Yurakucho"}],
  3:[{id:"s15",time:"10:00",text:"Akihabara electronics & anime shops"},{id:"s16",time:"13:00",text:"Lunch at a maid cafe"},{id:"s17",time:"15:00",text:"Ueno Park & National Museum"},{id:"s18",time:"19:00",text:"Dinner at Ichiran Ramen (Ueno)"}],
  4:[{id:"s19",time:"07:30",text:"Day trip to Kamakura — Great Buddha"},{id:"s20",time:"10:00",text:"Hike Daibutsu trail to Hasedera Temple"},{id:"s21",time:"12:30",text:"Fresh seafood lunch on Komachi Street"},{id:"s22",time:"15:00",text:"Beach walk at Yuigahama"},{id:"s23",time:"18:30",text:"Back to Tokyo — izakaya dinner in Ebisu"}],
  5:[{id:"s24",time:"10:00",text:"Shinjuku Gyoen National Garden"},{id:"s25",time:"12:30",text:"Conveyor belt sushi in Shinjuku"},{id:"s26",time:"14:00",text:"Shopping in Ginza / Uniqlo flagship"},{id:"s27",time:"17:00",text:"Free time — explore or rest"},{id:"s28",time:"19:30",text:"Farewell Tokyo dinner at Gonpachi"}],
  6:[{id:"s29",time:"09:00",text:"Check out hotel, luggage to station"},{id:"s30",time:"10:00",text:"Last Tokyo stop — Yanaka old town"},{id:"s31",time:"13:00",text:"Shinkansen to Osaka (~2.5hrs)"},{id:"s32",time:"16:00",text:"Check in at Cross Hotel Osaka (Namba)"},{id:"s33",time:"18:00",text:"Dotonbori night walk & street food"}],
  7:[{id:"s34",time:"09:00",text:"Osaka Castle & park"},{id:"s35",time:"12:00",text:"Takoyaki lunch at Wanaka (Namba)"},{id:"s36",time:"14:00",text:"Shinsekai district & Tsutenkaku Tower"},{id:"s37",time:"17:00",text:"Kuromon Market for snacks"},{id:"s38",time:"19:00",text:"Kushikatsu dinner in Shinsekai"}],
  8:[{id:"s39",time:"08:00",text:"Day trip to Nara — feed the deer"},{id:"s40",time:"10:00",text:"Todai-ji Temple (Great Buddha)"},{id:"s41",time:"12:30",text:"Lunch at Naramachi area"},{id:"s42",time:"14:30",text:"Kasuga Grand Shrine & lantern path"},{id:"s43",time:"17:30",text:"Return to Osaka — Shinsaibashi shopping"}],
  9:[{id:"s44",time:"10:00",text:"Umeda Sky Building observation"},{id:"s45",time:"12:00",text:"Okonomiyaki lunch at Kiji (Umeda)"},{id:"s46",time:"14:00",text:"Amerikamura & Orange Street"},{id:"s47",time:"17:00",text:"Explore Namba & Den Den Town"},{id:"s48",time:"20:00",text:"Late night ramen at Kamukura"}],
  10:[{id:"s49",time:"09:00",text:"Fushimi Inari Shrine (Kyoto trip)"},{id:"s50",time:"12:00",text:"Lunch near Kyoto Station"},{id:"s51",time:"14:00",text:"Kinkaku-ji (Golden Pavilion)"},{id:"s52",time:"17:00",text:"Back to Osaka — pack & prep"},{id:"s53",time:"19:30",text:"Final dinner at Harukoma sushi"}],
  11:[{id:"s54",time:"08:00",text:"Last morning — konbini breakfast"},{id:"s55",time:"09:00",text:"Check out, souvenirs at station"},{id:"s56",time:"11:00",text:"Head to Kansai International Airport"},{id:"s57",time:"14:00",text:"Flight home — sayonara Japan!"}],
};

const initDays = makeDays(DEFAULT_START, DEFAULT_END, defaultCityMap).map((d, i) => ({...d, activities: SAMPLE_ACT[i] || []}));

const INIT = {
  tripName: "Japan '26",
  startDate: DEFAULT_START,
  endDate: DEFAULT_END,
  cities: DEFAULT_CITIES,
  members: ["Alex","Jordan","Sam"],
  itinerary: initDays,
  hotels:[
    {id:"h1",city:"Tokyo",name:"Hotel Gracery Shinjuku",checkIn:"2026-03-07",checkOut:"2026-03-13",address:"1-19-1 Kabukicho, Shinjuku",conf:"GRC-20260307-4821",notes:"Godzilla head on the building!"},
    {id:"h2",city:"Osaka",name:"Cross Hotel Osaka",checkIn:"2026-03-13",checkOut:"2026-03-18",address:"2-5-15 Shinsaibashisuji, Chuo-ku",conf:"CRX-20260313-7193",notes:"Walking distance to Dotonbori."},
  ],
  flights:[
    {id:"f1",label:"Departure",airline:"ANA",flightNo:"NH 7",from:"SFO",to:"NRT",date:"2026-03-07",time:"11:15 AM",conf:"ANA-8K2M4X",member:"Alex"},
    {id:"f2",label:"Return",airline:"ANA",flightNo:"NH 178",from:"KIX",to:"SFO",date:"2026-03-18",time:"2:30 PM",conf:"ANA-8K2M4X",member:"Alex"},
    {id:"f3",label:"Departure",airline:"ANA",flightNo:"NH 7",from:"SFO",to:"NRT",date:"2026-03-07",time:"11:15 AM",conf:"ANA-7J3K9P",member:"Jordan"},
    {id:"f4",label:"Return",airline:"ANA",flightNo:"NH 178",from:"KIX",to:"SFO",date:"2026-03-18",time:"2:30 PM",conf:"ANA-7J3K9P",member:"Jordan"},
    {id:"f5",label:"Departure",airline:"United",flightNo:"UA 837",from:"LAX",to:"NRT",date:"2026-03-07",time:"1:40 PM",conf:"UA-5M2X8R",member:"Sam"},
    {id:"f6",label:"Return",airline:"ANA",flightNo:"NH 178",from:"KIX",to:"LAX",date:"2026-03-18",time:"2:30 PM",conf:"UA-5M2X8R",member:"Sam"},
  ],
  expenses:[
    {id:"e1",description:"Shinkansen Tokyo to Osaka",amount:390,paidBy:"Alex",splitBetween:["Alex","Jordan","Sam"],category:"Transport"},
    {id:"e2",description:"teamLab Borderless tickets",amount:99,paidBy:"Jordan",splitBetween:["Alex","Jordan","Sam"],category:"Activity"},
    {id:"e3",description:"Ichiran Ramen (Ueno)",amount:42,paidBy:"Sam",splitBetween:["Alex","Jordan","Sam"],category:"Food"},
    {id:"e4",description:"Hotel Gracery (6 nights)",amount:1080,paidBy:"Alex",splitBetween:["Alex","Jordan","Sam"],category:"Hotel"},
    {id:"e5",description:"Suica cards (3x)",amount:45,paidBy:"Jordan",splitBetween:["Alex","Jordan","Sam"],category:"Transport"},
    {id:"e6",description:"Gonpachi dinner",amount:135,paidBy:"Sam",splitBetween:["Alex","Jordan","Sam"],category:"Food"},
    {id:"e7",description:"Cross Hotel Osaka (5 nights)",amount:850,paidBy:"Alex",splitBetween:["Alex","Jordan","Sam"],category:"Hotel"},
    {id:"e8",description:"Dotonbori street food",amount:36,paidBy:"Jordan",splitBetween:["Alex","Jordan","Sam"],category:"Food"},
    {id:"e9",description:"Osaka Castle entry",amount:18,paidBy:"Sam",splitBetween:["Alex","Jordan","Sam"],category:"Activity"},
    {id:"e10",description:"Nara day trip train",amount:24,paidBy:"Alex",splitBetween:["Alex","Jordan","Sam"],category:"Transport"},
    {id:"e11",description:"Don Quijote souvenirs",amount:78,paidBy:"Jordan",splitBetween:["Jordan"],category:"Shopping"},
    {id:"e12",description:"Shibuya Sky tickets",amount:54,paidBy:"Sam",splitBetween:["Alex","Jordan","Sam"],category:"Activity"},
  ],
  restaurants:[
    {id:"r1",name:"Afuri Ramen",location:"Harajuku",cuisine:"Yuzu Shio Ramen",notes:"Light citrusy broth. Go early.",city:"Tokyo"},
    {id:"r2",name:"Gonpachi Nishi-Azabu",location:"Roppongi",cuisine:"Izakaya",notes:"The Kill Bill restaurant.",city:"Tokyo"},
    {id:"r3",name:"Genki Sushi",location:"Shibuya",cuisine:"Conveyor Belt Sushi",notes:"Order by tablet. Budget-friendly.",city:"Tokyo"},
    {id:"r4",name:"Kiji",location:"Umeda",cuisine:"Okonomiyaki",notes:"Famous okonomiyaki.",city:"Osaka"},
    {id:"r5",name:"Harukoma",location:"Tenma",cuisine:"Sushi",notes:"Best value sushi in Osaka.",city:"Osaka"},
  ],
  quickEats:[
    {id:"q1",name:"Takoyaki at Wanaka",location:"Namba",cuisine:"Takoyaki",notes:"Must-try in Osaka.",city:"Osaka"},
    {id:"q2",name:"7-Eleven Onigiri",location:"Everywhere",cuisine:"Convenience",notes:"Tuna mayo & salmon are GOATs.",city:"Tokyo"},
    {id:"q3",name:"Melon Pan from Asakusa",location:"Asakusa",cuisine:"Pastry",notes:"Giant crispy melon bread.",city:"Tokyo"},
    {id:"q4",name:"Kushikatsu Daruma",location:"Shinsekai",cuisine:"Fried Skewers",notes:"NO double-dipping!",city:"Osaka"},
  ],
  activities:[
    {id:"a1",name:"teamLab Borderless",city:"Tokyo",notes:"Book online. Wear white for photos.",cost:"33"},
    {id:"a2",name:"Shibuya Sky",city:"Tokyo",notes:"Sunset time slot is best.",cost:"18"},
    {id:"a3",name:"Purikura photo booth",city:"Tokyo",notes:"Harajuku has the best ones.",cost:"5"},
    {id:"a4",name:"Osaka Castle",city:"Osaka",notes:"Top floor has panoramic views.",cost:"6"},
    {id:"a5",name:"Fushimi Inari Shrine",city:"Osaka",notes:"Go early. Free entry.",cost:"0"},
    {id:"a6",name:"Nara Deer Park",city:"Osaka",notes:"They bow before eating!",cost:"2"},
  ],
};

const RATE = 149.5;
const catColor={Food:"#E07A5F",Transport:"#3D85C6",Hotel:"#81B29A",Activity:"#F2CC8F",Shopping:"#9B72CF",Other:"#9A958D"};
const cats=["Food","Transport","Hotel","Activity","Shopping","Other"];
const cityColors = {"Tokyo":["#E4F5EB","#1A7A52"],"Osaka":["#F0EAFF","#7B4FC4"],"Kyoto":["#FFF3E0","#D4850A"],"Nara":["#FFF8E1","#C49000"],"Hiroshima":["#E8F0FE","#3D85C6"],"Yokohama":["#FFF0EC","#C84B31"]};
const getCityColor = (city) => cityColors[city] || ["#EDEBE6","#605C55"];
const fmtTime=t=>{if(!t)return"";const[h,m]=t.split(":");const hr=parseInt(h);return`${hr===0?12:hr>12?hr-12:hr}:${m} ${hr>=12?"PM":"AM"}`};
const fmtDate=d=>{if(!d)return"";try{const dt=new Date(d+"T00:00:00");return dt.toLocaleDateString("en-US",{month:"short",day:"numeric"})}catch(e){return d}};

// ── Reusable Components ──
function Modal({open,onClose,title,children}){if(!open)return null;return(<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.35)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"22px 22px 0 0",maxWidth:430,width:"100%",maxHeight:"85vh",overflowY:"auto",padding:"20px 20px calc(20px + env(safe-area-inset-bottom))"}}><div style={{width:36,height:4,background:"#DDD9D2",borderRadius:4,margin:"0 auto 16px"}}/><div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:700,marginBottom:18}}>{title}</div>{children}</div></div>)}
function Chip({city}){const[bg,fg]=getCityColor(city);return<span style={{display:"inline-flex",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,letterSpacing:.3,background:bg,color:fg}}>{city}</span>}
function Btn({primary,ghost,danger,sm,full,children,style:s,...p}){const base={display:"inline-flex",alignItems:"center",gap:6,padding:sm?"7px 12px":"10px 18px",borderRadius:sm?10:12,border:"none",fontSize:sm?12.5:13.5,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",width:full?"100%":undefined,justifyContent:full?"center":undefined,...s};return<button style={primary?{...base,background:"#C84B31",color:"#fff"}:danger?{...base,background:"#FEE",color:"#D44"}:{...base,background:"#EDEBE6",color:"#605C55"}} {...p}>{children}</button>}
function Input({label,...p}){return<div style={{marginBottom:14}}>{label&&<label style={{display:"block",fontSize:11.5,fontWeight:600,color:"#605C55",marginBottom:5,textTransform:"uppercase",letterSpacing:.6}}>{label}</label>}<input style={{width:"100%",padding:"11px 14px",border:"1.5px solid #DDD9D2",borderRadius:12,fontSize:14.5,fontFamily:"inherit",color:"#17150F",background:"#fff",outline:"none"}} {...p}/></div>}
function Select({label,children,...p}){return<div style={{marginBottom:14}}>{label&&<label style={{display:"block",fontSize:11.5,fontWeight:600,color:"#605C55",marginBottom:5,textTransform:"uppercase",letterSpacing:.6}}>{label}</label>}<select style={{width:"100%",padding:"11px 14px",border:"1.5px solid #DDD9D2",borderRadius:12,fontSize:14.5,fontFamily:"inherit",color:"#17150F",background:"#fff",outline:"none",appearance:"none"}} {...p}>{children}</select></div>}
function IconBtn({danger,style:s,children,...p}){return<button style={{width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",border:"none",background:danger?"#FEE":"#EDEBE6",borderRadius:10,cursor:"pointer",color:danger?"#D44":"#605C55",flexShrink:0,...s}} {...p}>{children}</button>}

function CommentThread({comments=[],onAdd,onDelete,members}){
  const[show,setShow]=useState(false);const[text,setText]=useState("");const[author,setAuthor]=useState(members?.[0]||"");
  const doAdd=()=>{if(!text.trim()||!author)return;onAdd({id:Date.now()+"",author,text:text.trim(),ts:new Date().toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})});setText("")};
  return(<div style={{marginTop:8}}>
    <button onClick={()=>setShow(!show)} style={{background:"none",border:"none",fontSize:12,color:"#9A958D",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4,padding:"2px 0"}}>
      💬 {comments.length>0?comments.length+" comment"+(comments.length>1?"s":""):"Add comment"}
      <span style={{fontSize:10,transform:show?"rotate(90deg)":"none",transition:"transform .15s"}}>›</span>
    </button>
    {show&&<div style={{marginTop:6,paddingLeft:2}}>
      {comments.map(c=>(<div key={c.id} style={{padding:"8px 0",borderBottom:"1px solid #F0EEE9",display:"flex",gap:8,alignItems:"flex-start"}}>
        <div style={{width:24,height:24,borderRadius:12,background:"#EDEBE6",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#605C55",flexShrink:0}}>{c.author?.[0]?.toUpperCase()||"?"}</div>
        <div style={{flex:1}}><div style={{display:"flex",alignItems:"baseline",gap:6}}><span style={{fontSize:12,fontWeight:600}}>{c.author}</span><span style={{fontSize:10.5,color:"#B0ADA6"}}>{c.ts}</span></div><div style={{fontSize:13,color:"#605C55",marginTop:1,lineHeight:1.4}}>{c.text}</div></div>
        {onDelete&&<button onClick={()=>onDelete(c.id)} style={{background:"none",border:"none",color:"#D44",cursor:"pointer",fontSize:12,padding:"2px",flexShrink:0}}>×</button>}
      </div>))}
      <div style={{display:"flex",gap:6,marginTop:8}}>
        <select value={author} onChange={e=>setAuthor(e.target.value)} style={{padding:"7px 8px",borderRadius:8,border:"1.5px solid #DDD9D2",fontSize:12,fontFamily:"inherit",color:"#17150F",background:"#fff",minWidth:70}}>
          {(members||[]).map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doAdd()} placeholder="Write a comment..." style={{flex:1,padding:"7px 10px",borderRadius:8,border:"1.5px solid #DDD9D2",fontSize:13,fontFamily:"inherit",outline:"none"}}/>
        <button onClick={doAdd} style={{background:"#C84B31",color:"#fff",border:"none",borderRadius:8,padding:"0 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Post</button>
      </div>
    </div>}
  </div>);
}

const ic={
  plus:<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  trash:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  edit:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  chev:<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  back:<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  pin:<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  cal:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
};

// ── ITINERARY ──
function ItineraryTab({data,save}){
  const today=new Date();today.setHours(0,0,0,0);
  const todayIdx=data.itinerary.findIndex(d=>d.isoDate&&new Date(d.isoDate+"T00:00:00").getTime()===today.getTime());
  const[exp,setExp]=useState(todayIdx>=0?todayIdx:0);
  const[showAdd,setShowAdd]=useState(false);const[addDay,setAddDay]=useState(null);
  const[na,setNa]=useState({time:"",endTime:"",text:"",location:""});
  const[editAct,setEditAct]=useState(null);// {dayIdx, activity}
  const todayRef=useRef(null);
  const scrolledRef=useRef(false);

  useEffect(()=>{
    if(todayIdx>=0&&todayRef.current&&!scrolledRef.current){
      setTimeout(()=>{todayRef.current.scrollIntoView({behavior:"smooth",block:"start"})},300);
      scrolledRef.current=true;
    }
  },[todayIdx]);

  const mapsUrl=(loc)=>loc?"https://www.google.com/maps/search/"+encodeURIComponent(loc):"";
  const doAdd=()=>{if(!na.text.trim())return;const u=[...data.itinerary];u[addDay]={...u[addDay],activities:[...u[addDay].activities,{...na,id:Date.now()+"",mapsLink:mapsUrl(na.location)}]};save({...data,itinerary:u});setNa({time:"",endTime:"",text:"",location:""});setShowAdd(false)};
  const doRm=(di,aid)=>{const u=[...data.itinerary];u[di]={...u[di],activities:u[di].activities.filter(a=>a.id!==aid)};save({...data,itinerary:u})};
  const doEdit=()=>{if(!editAct)return;const u=[...data.itinerary];const di=editAct.dayIdx;u[di]={...u[di],activities:u[di].activities.map(a=>a.id===editAct.id?{...editAct,mapsLink:mapsUrl(editAct.location)}:a)};save({...data,itinerary:u});setEditAct(null)};
  const addBreak=(dayIdx)=>{const u=[...data.itinerary];u[dayIdx]={...u[dayIdx],activities:[...u[dayIdx].activities,{id:Date.now()+"",text:"🏠 Break at Airbnb",time:"",endTime:"",location:""}]};save({...data,itinerary:u})};
  const uniqueCities=[...new Set(data.itinerary.map(d=>d.city).filter(c=>c&&c!=="TBD"))];

  return(<div style={{padding:"12px 20px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700}}>Itinerary</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{uniqueCities.map(c=><Chip key={c} city={c}/>)}</div>
    </div>
    {data.itinerary.map((day,i)=>{
      const open=exp===i;const acts=[...day.activities].sort((a,b)=>(a.time||"").localeCompare(b.time||""));const[bg,fg]=getCityColor(day.city);
      const dayDate=day.isoDate?new Date(day.isoDate+"T00:00:00"):null;
      const isPast=dayDate&&dayDate<today;
      const isToday=dayDate&&dayDate.getTime()===today.getTime();
      return(<div key={i} ref={isToday?todayRef:null} style={{background:isPast?"#F9F8F6":"#fff",borderRadius:16,border:isToday?"2px solid #C84B31":"1px solid #DDD9D2",boxShadow:isToday?"0 2px 8px rgba(200,75,49,.15)":"0 1px 3px rgba(0,0,0,.04)",marginBottom:12,overflow:"hidden",opacity:isPast?.65:1,transition:"opacity .3s"}}>
        <div onClick={()=>setExp(open?-1:i)} style={{padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:16,fontFamily:"'Fraunces',serif",background:isToday?"#C84B31":bg,color:isToday?"#fff":fg}}>{day.day}</div>
            <div><div style={{fontSize:14.5,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>{day.date}{isToday&&<span style={{fontSize:10.5,fontWeight:700,color:"#C84B31",background:"#FFF0EC",padding:"2px 8px",borderRadius:10,textTransform:"uppercase",letterSpacing:.5}}>Today</span>}{isPast&&<span style={{fontSize:10.5,fontWeight:600,color:"#9A958D",background:"#EDEBE6",padding:"2px 8px",borderRadius:10}}>Done</span>}</div><div style={{fontSize:12,color:"#9A958D",display:"flex",alignItems:"center",gap:4}}>{ic.pin} {day.city}{acts.length>0&&<span style={{marginLeft:4}}>· {acts.length} plans</span>}</div></div>
          </div>
          <div style={{color:"#9A958D",transform:open?"rotate(90deg)":"none",transition:"transform .2s"}}>{ic.chev}</div>
        </div>
        {open&&<div style={{padding:"0 16px 14px"}}>
          {acts.length>0?(<div style={{position:"relative",paddingLeft:20}}>
            <div style={{position:"absolute",left:4,top:6,bottom:6,width:1.5,background:"#DDD9D2"}}/>
            {acts.map((a,j)=>(<div key={a.id} style={{position:"relative",padding:"6px 0",display:"flex",gap:10,alignItems:"flex-start"}}>
              <div style={{position:"absolute",left:-20,top:11,width:9,height:9,borderRadius:"50%",background:j===0?"#C84B31":"#E0A090",border:"2px solid #fff",zIndex:1}}/>
              <div style={{fontSize:11.5,fontWeight:600,color:"#9A958D",minWidth:52,paddingTop:1}}>{a.time?fmtTime(a.time):"—"}{a.time&&a.endTime?<div style={{fontSize:10,fontWeight:400,color:"#B0ADA6"}}>to {fmtTime(a.endTime)}</div>:null}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:13.5,lineHeight:1.4}}>{a.text}</div>
                  <div style={{display:"flex",gap:4,flexShrink:0,marginLeft:8}}>
                    <IconBtn onClick={e=>{e.stopPropagation();setEditAct({...a,dayIdx:i})}} style={{width:28,height:28}}>{ic.edit}</IconBtn>
                    <IconBtn danger onClick={e=>{e.stopPropagation();doRm(i,a.id)}} style={{width:28,height:28}}>{ic.trash}</IconBtn>
                  </div>
                </div>
                {a.location&&<div style={{fontSize:12,marginTop:3}}>
                  <a href={a.mapsLink||mapsUrl(a.location)} target="_blank" rel="noopener" style={{color:"#C84B31",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:3}}>
                    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {a.location} →
                  </a>
                </div>}
                <CommentThread comments={a.comments||[]} members={data.members} onAdd={(c)=>{const u=[...data.itinerary];u[i]={...u[i],activities:u[i].activities.map(act=>act.id===a.id?{...act,comments:[...(act.comments||[]),c]}:act)};save({...data,itinerary:u})}} onDelete={(cid)=>{const u=[...data.itinerary];u[i]={...u[i],activities:u[i].activities.map(act=>act.id===a.id?{...act,comments:(act.comments||[]).filter(c=>c.id!==cid)}:act)};save({...data,itinerary:u})}}/>
              </div>
            </div>))}
          </div>):<div style={{fontSize:13,color:"#9A958D",padding:"8px 0"}}>No plans yet.</div>}
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <Btn ghost sm style={{flex:1}} onClick={()=>{setAddDay(i);setShowAdd(true)}}>{ic.plus} Add Activity</Btn>
            <Btn ghost sm onClick={()=>addBreak(i)} style={{color:"#7B4FC4",background:"#F0EAFF"}}>🏠 Break</Btn>
          </div>
        </div>}
      </div>);
    })}
    <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Add Activity">
      <Input label="Activity" placeholder="e.g. Visit Meiji Shrine" value={na.text} onChange={e=>setNa({...na,text:e.target.value})}/>
      <Input label="Location (optional)" placeholder="e.g. Senso-ji Temple, Tokyo" value={na.location} onChange={e=>setNa({...na,location:e.target.value})}/>
      {na.location&&<p style={{fontSize:12,color:"#9A958D",marginTop:-8,marginBottom:14}}>📍 Will create a Google Maps link for "{na.location}"</p>}
      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1}}><Input label="Start Time (optional)" type="time" value={na.time} onChange={e=>setNa({...na,time:e.target.value})}/></div>
        <div style={{flex:1}}><Input label="End Time (optional)" type="time" value={na.endTime} onChange={e=>setNa({...na,endTime:e.target.value})}/></div>
      </div>
      <Btn primary full onClick={doAdd}>Add Activity</Btn>
    </Modal>
    <Modal open={!!editAct} onClose={()=>setEditAct(null)} title="Edit Activity">
      {editAct&&<><Input label="Activity" value={editAct.text} onChange={e=>setEditAct({...editAct,text:e.target.value})}/>
      <Input label="Location (optional)" placeholder="e.g. Senso-ji Temple, Tokyo" value={editAct.location||""} onChange={e=>setEditAct({...editAct,location:e.target.value})}/>
      {editAct.location&&<p style={{fontSize:12,color:"#9A958D",marginTop:-8,marginBottom:14}}>📍 Opens in Google Maps: "{editAct.location}"</p>}
      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1}}><Input label="Start Time (optional)" type="time" value={editAct.time||""} onChange={e=>setEditAct({...editAct,time:e.target.value})}/></div>
        <div style={{flex:1}}><Input label="End Time (optional)" type="time" value={editAct.endTime||""} onChange={e=>setEditAct({...editAct,endTime:e.target.value})}/></div>
      </div>
      <Btn primary full onClick={doEdit}>Save Changes</Btn></>}
    </Modal>
  </div>);
}

// ── BUDGET ──
function BudgetTab({data,save}){
  const[showAdd,setShowAdd]=useState(false);const[tab,setTab]=useState("overview");
  const[ne,setNe]=useState({description:"",amount:"",paidBy:data.members[0],splitBetween:[...data.members],category:"Food"});
  const[editExp,setEditExp]=useState(null);
  const doAdd=()=>{if(!ne.description||!ne.amount)return;save({...data,expenses:[...data.expenses,{...ne,id:Date.now()+"",amount:parseFloat(ne.amount)}]});setNe({description:"",amount:"",paidBy:data.members[0],splitBetween:[...data.members],category:"Food"});setShowAdd(false)};
  const doRm=id=>save({...data,expenses:data.expenses.filter(e=>e.id!==id)});
  const doEditExp=()=>{if(!editExp)return;save({...data,expenses:data.expenses.map(e=>e.id===editExp.id?{...editExp,amount:parseFloat(editExp.amount)||0}:e)});setEditExp(null)};
  const toggleSplitEdit=(m)=>{if(!editExp)return;const c=editExp.splitBetween;if(c.includes(m)){if(c.length>1)setEditExp({...editExp,splitBetween:c.filter(x=>x!==m)})}else setEditExp({...editExp,splitBetween:[...c,m]})}
  const tot=data.expenses.reduce((s,e)=>s+e.amount,0);
  const bal={};data.members.forEach(m=>{bal[m]=0});data.expenses.forEach(e=>{const sp=e.amount/e.splitBetween.length;bal[e.paidBy]+=e.amount;e.splitBetween.forEach(m=>{bal[m]-=sp})});
  const pps={};data.members.forEach(m=>{pps[m]=0});data.expenses.forEach(e=>{const sp=e.amount/e.splitBetween.length;e.splitBetween.forEach(m=>{pps[m]+=sp})});
  const byCat={};data.expenses.forEach(e=>{byCat[e.category]=(byCat[e.category]||0)+e.amount});
  const debts=[],creds=[];data.members.forEach(m=>{if(bal[m]<-.01)debts.push({n:m,a:-bal[m]});if(bal[m]>.01)creds.push({n:m,a:bal[m]})});
  const sett=[];const dd=[...debts],cc=[...creds];while(dd.length&&cc.length){const a=Math.min(dd[0].a,cc[0].a);sett.push({from:dd[0].n,to:cc[0].n,amount:a});dd[0].a-=a;cc[0].a-=a;if(dd[0].a<.01)dd.shift();if(cc[0].a<.01)cc.shift()}
  const toggleSplit=m=>{const c=ne.splitBetween;if(c.includes(m)){if(c.length>1)setNe({...ne,splitBetween:c.filter(x=>x!==m)})}else setNe({...ne,splitBetween:[...c,m]})};
  const Tab=({id,children})=><button onClick={()=>setTab(id)} style={{padding:"7px 14px",borderRadius:20,fontSize:13,fontWeight:500,border:"none",cursor:"pointer",fontFamily:"inherit",background:tab===id?"#17150F":"#EDEBE6",color:tab===id?"#fff":"#605C55"}}>{children}</button>;

  return(<div style={{padding:"12px 20px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700}}>Budget</div><Btn primary sm onClick={()=>setShowAdd(true)}>{ic.plus} Expense</Btn></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
      {[["Total Spent",`$${tot.toLocaleString("en",{maximumFractionDigits:0})}`,`¥${(tot*RATE).toLocaleString("en",{maximumFractionDigits:0})}`],["Per Person",`$${(tot/(data.members.length||1)).toLocaleString("en",{maximumFractionDigits:0})}`,`${data.expenses.length} expenses`]].map(([l,v,s],i)=>(<div key={i} style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}><div style={{fontSize:11,textTransform:"uppercase",letterSpacing:.5,color:"#9A958D",fontWeight:600}}>{l}</div><div style={{fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:700,marginTop:3}}>{v}</div><div style={{fontSize:11.5,color:"#9A958D",marginTop:1}}>{s}</div></div>))}
    </div>
    <div style={{display:"flex",gap:6,marginBottom:14}}><Tab id="overview">Overview</Tab><Tab id="person">Per Person</Tab><Tab id="settle">Settlements</Tab></div>
    {tab==="overview"&&<>{Object.keys(byCat).length>0&&<div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:16,marginBottom:12,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}><div style={{fontSize:13,fontWeight:600,marginBottom:12}}>By Category</div>{Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,a])=>(<div key={c} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:2}}><span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:8,height:8,borderRadius:4,background:catColor[c],display:"inline-block"}}/>{c}</span><span style={{fontWeight:600}}>${a.toFixed(0)}</span></div><div style={{height:6,background:"#EDEBE6",borderRadius:6,overflow:"hidden"}}><div style={{height:"100%",borderRadius:6,width:`${(a/tot)*100}%`,background:catColor[c]}}/></div></div>))}</div>}
      <div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:"4px 16px",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>{[...data.expenses].reverse().map(e=>(<div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 0",borderBottom:"1px solid #ECEAE5"}}><div><div style={{fontSize:14,fontWeight:500}}>{e.description}</div><div style={{fontSize:12,color:"#9A958D"}}><span style={{width:6,height:6,borderRadius:3,background:catColor[e.category],display:"inline-block",marginRight:4}}/>{e.category} · {e.paidBy}</div></div><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:600}}>${e.amount.toFixed(2)}</div><div style={{fontSize:11,color:"#9A958D"}}>¥{(e.amount*RATE).toLocaleString("en",{maximumFractionDigits:0})}</div></div><IconBtn onClick={()=>setEditExp({...e,amount:e.amount+""})}>{ic.edit}</IconBtn><IconBtn danger onClick={()=>doRm(e.id)}>{ic.trash}</IconBtn></div></div>))}</div></>}
    {tab==="person"&&<div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:"4px 16px",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>{data.members.map(m=>(<div key={m} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:"1px solid #ECEAE5"}}><div><div style={{fontSize:14,fontWeight:600}}>{m}</div><div style={{fontSize:12,color:"#9A958D"}}>Paid ${data.expenses.filter(e=>e.paidBy===m).reduce((s,e)=>s+e.amount,0).toFixed(2)}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:600}}>${(pps[m]||0).toFixed(2)}</div><div style={{fontSize:12,fontWeight:500,color:bal[m]>.01?"#1A7A52":bal[m]<-.01?"#D44":"#9A958D"}}>{bal[m]>.01?`Owed $${bal[m].toFixed(2)}`:bal[m]<-.01?`Owes $${(-bal[m]).toFixed(2)}`:"Settled ✓"}</div></div></div>))}</div>}
    {tab==="settle"&&<div>{sett.length===0?<div style={{textAlign:"center",padding:32,color:"#9A958D"}}>All settled up!</div>:sett.map((s,i)=>(<div key={i} style={{background:"#FFF0EC",border:"1.5px solid #F0C4B6",borderRadius:16,padding:16,marginBottom:10}}><div style={{display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:500}}>{s.from}<span style={{color:"#C84B31",fontWeight:700,margin:"0 8px"}}>→</span>{s.to}</div><div style={{textAlign:"center",fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:700,marginTop:4,color:"#C84B31"}}>${s.amount.toFixed(2)}</div></div>))}</div>}
    <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Add Expense">
      <Input label="Description" placeholder="e.g. Ramen dinner" value={ne.description} onChange={e=>setNe({...ne,description:e.target.value})}/>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Input label="Amount (USD)" type="number" placeholder="0.00" value={ne.amount} onChange={e=>setNe({...ne,amount:e.target.value})}/></div><div style={{flex:1}}><Select label="Category" value={ne.category} onChange={e=>setNe({...ne,category:e.target.value})}>{cats.map(c=><option key={c}>{c}</option>)}</Select></div></div>
      <Select label="Paid By" value={ne.paidBy} onChange={e=>setNe({...ne,paidBy:e.target.value})}>{data.members.map(m=><option key={m}>{m}</option>)}</Select>
      <div style={{marginBottom:14}}><label style={{display:"block",fontSize:11.5,fontWeight:600,color:"#605C55",marginBottom:5,textTransform:"uppercase",letterSpacing:.6}}>Split Between</label><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{data.members.map(m=><Btn key={m} primary={ne.splitBetween.includes(m)} ghost={!ne.splitBetween.includes(m)} sm onClick={()=>toggleSplit(m)}>{m}</Btn>)}</div></div>
      <Btn primary full onClick={doAdd}>Add Expense</Btn>
    </Modal>
    <Modal open={!!editExp} onClose={()=>setEditExp(null)} title="Edit Expense">
      {editExp&&<><Input label="Description" value={editExp.description} onChange={e=>setEditExp({...editExp,description:e.target.value})}/>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Input label="Amount (USD)" type="number" value={editExp.amount} onChange={e=>setEditExp({...editExp,amount:e.target.value})}/></div><div style={{flex:1}}><Select label="Category" value={editExp.category} onChange={e=>setEditExp({...editExp,category:e.target.value})}>{cats.map(c=><option key={c}>{c}</option>)}</Select></div></div>
      <Select label="Paid By" value={editExp.paidBy} onChange={e=>setEditExp({...editExp,paidBy:e.target.value})}>{data.members.map(m=><option key={m}>{m}</option>)}</Select>
      <div style={{marginBottom:14}}><label style={{display:"block",fontSize:11.5,fontWeight:600,color:"#605C55",marginBottom:5,textTransform:"uppercase",letterSpacing:.6}}>Split Between</label><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{data.members.map(m=><Btn key={m} primary={editExp.splitBetween.includes(m)} ghost={!editExp.splitBetween.includes(m)} sm onClick={()=>toggleSplitEdit(m)}>{m}</Btn>)}</div></div>
      <Btn primary full onClick={doEditExp}>Save Changes</Btn></>}
    </Modal>
  </div>);
}

// ── FOOD ──
function FoodTab({data,save}){
  const[tab,setTab]=useState("restaurants");const[showAdd,setShowAdd]=useState(false);
  const allCities=data.cities||DEFAULT_CITIES;
  const[ni,setNi]=useState({name:"",location:"",cuisine:"",notes:"",city:allCities[0]||"Tokyo"});
  const[editItem,setEditItem]=useState(null);
  const[addToDay,setAddToDay]=useState(null);const[addDayIdx,setAddDayIdx]=useState(null);const[addTime,setAddTime]=useState("");
  const doAdd=()=>{if(!ni.name.trim())return;const item={...ni,id:Date.now()+""};if(tab==="restaurants")save({...data,restaurants:[...data.restaurants,item]});else save({...data,quickEats:[...data.quickEats,item]});setNi({name:"",location:"",cuisine:"",notes:"",city:allCities[0]||"Tokyo"});setShowAdd(false)};
  const doRm=id=>{if(tab==="restaurants")save({...data,restaurants:data.restaurants.filter(r=>r.id!==id)});else save({...data,quickEats:data.quickEats.filter(r=>r.id!==id)})};
  const doEditItem=()=>{if(!editItem)return;if(tab==="restaurants")save({...data,restaurants:data.restaurants.map(r=>r.id===editItem.id?editItem:r)});else save({...data,quickEats:data.quickEats.map(r=>r.id===editItem.id?editItem:r)});setEditItem(null)};
  const doAddToItinerary=()=>{if(!addToDay||addDayIdx===null)return;const mapsUrl=addToDay.location?"https://www.google.com/maps/search/"+encodeURIComponent(addToDay.name+(addToDay.location?" "+addToDay.location:"")):"";const act={id:Date.now()+"",time:addTime,text:addToDay.name+(addToDay.cuisine?" ("+addToDay.cuisine+")":""),location:addToDay.location||addToDay.name,mapsLink:mapsUrl};const u=[...data.itinerary];u[addDayIdx]={...u[addDayIdx],activities:[...u[addDayIdx].activities,act]};save({...data,itinerary:u});setAddToDay(null);setAddDayIdx(null);setAddTime("")};
  const items=tab==="restaurants"?data.restaurants:data.quickEats;
  const Tab2=({id,count,children})=><button onClick={()=>setTab(id)} style={{padding:"7px 14px",borderRadius:20,fontSize:13,fontWeight:500,border:"none",cursor:"pointer",fontFamily:"inherit",background:tab===id?"#17150F":"#EDEBE6",color:tab===id?"#fff":"#605C55"}}>{children}{count>0&&<span style={{marginLeft:4,fontSize:11,fontWeight:600,padding:"2px 6px",borderRadius:10,background:tab===id?"rgba(255,255,255,.2)":"#DDD9D2"}}>{count}</span>}</button>;

  return(<div style={{padding:"12px 20px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700}}>Food & Dining</div><Btn primary sm onClick={()=>setShowAdd(true)}>{ic.plus} Add</Btn></div>
    <div style={{display:"flex",gap:6,marginBottom:14}}><Tab2 id="restaurants" count={data.restaurants.length}>Restaurants</Tab2><Tab2 id="quickeats" count={data.quickEats.length}>Quick Eats</Tab2></div>
    <div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:"4px 16px",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>{items.length===0?<div style={{textAlign:"center",padding:32,color:"#9A958D"}}>No items saved.</div>:items.map(item=>(<div key={item.id} style={{padding:"14px 0",borderBottom:"1px solid #ECEAE5"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><span style={{fontSize:14,fontWeight:600}}>{item.name}</span><Chip city={item.city}/></div><div style={{fontSize:12.5,color:"#9A958D"}}>{[item.cuisine,item.location].filter(Boolean).join(" · ")}</div>{item.notes&&<div style={{fontSize:12.5,color:"#605C55",marginTop:3}}>{item.notes}</div>}</div><div style={{display:"flex",gap:4,flexShrink:0,marginLeft:8}}><IconBtn onClick={()=>setAddToDay(item)} style={{background:"#E4F5EB",color:"#1A7A52"}}>{ic.cal}</IconBtn><IconBtn onClick={()=>setEditItem({...item})}>{ic.edit}</IconBtn><IconBtn danger onClick={()=>doRm(item.id)}>{ic.trash}</IconBtn></div></div>
        <CommentThread comments={item.comments||[]} members={data.members} onAdd={(c)=>{const key=tab==="restaurants"?"restaurants":"quickEats";save({...data,[key]:data[key].map(r=>r.id===item.id?{...r,comments:[...(r.comments||[]),c]}:r)})}} onDelete={(cid)=>{const key=tab==="restaurants"?"restaurants":"quickEats";save({...data,[key]:data[key].map(r=>r.id===item.id?{...r,comments:(r.comments||[]).filter(c=>c.id!==cid)}:r)})}}/>
      </div>))}</div>
    <Modal open={showAdd} onClose={()=>setShowAdd(false)} title={tab==="restaurants"?"Add Restaurant":"Add Quick Eat"}>
      <Input label="Name" placeholder="e.g. Ichiran Ramen" value={ni.name} onChange={e=>setNi({...ni,name:e.target.value})}/>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Input label="Cuisine" placeholder="e.g. Ramen" value={ni.cuisine} onChange={e=>setNi({...ni,cuisine:e.target.value})}/></div><div style={{flex:1}}><Select label="City" value={ni.city} onChange={e=>setNi({...ni,city:e.target.value})}>{allCities.map(c=><option key={c}>{c}</option>)}</Select></div></div>
      <Input label="Location" placeholder="e.g. Shibuya" value={ni.location} onChange={e=>setNi({...ni,location:e.target.value})}/>
      <Input label="Notes" placeholder="Reservation needed?" value={ni.notes} onChange={e=>setNi({...ni,notes:e.target.value})}/>
      <Btn primary full onClick={doAdd}>Save</Btn>
    </Modal>
    <Modal open={!!editItem} onClose={()=>setEditItem(null)} title="Edit Item">
      {editItem&&<><Input label="Name" value={editItem.name} onChange={e=>setEditItem({...editItem,name:e.target.value})}/>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Input label="Cuisine" value={editItem.cuisine||""} onChange={e=>setEditItem({...editItem,cuisine:e.target.value})}/></div><div style={{flex:1}}><Select label="City" value={editItem.city} onChange={e=>setEditItem({...editItem,city:e.target.value})}>{allCities.map(c=><option key={c}>{c}</option>)}</Select></div></div>
      <Input label="Location" value={editItem.location||""} onChange={e=>setEditItem({...editItem,location:e.target.value})}/>
      <Input label="Notes" value={editItem.notes||""} onChange={e=>setEditItem({...editItem,notes:e.target.value})}/>
      <Btn primary full onClick={doEditItem}>Save Changes</Btn></>}
    </Modal>
    <Modal open={!!addToDay} onClose={()=>{setAddToDay(null);setAddDayIdx(null);setAddTime("")}} title={addToDay?"Add \""+addToDay.name+"\" to Itinerary":""}>
      {addToDay&&<>{addDayIdx===null?<><p style={{fontSize:13.5,color:"#605C55",marginBottom:14}}>Which day?</p>
      <div style={{maxHeight:300,overflowY:"auto"}}>{data.itinerary.map((day,i)=>{const[bg2,fg2]=getCityColor(day.city);return(<div key={i} onClick={()=>setAddDayIdx(i)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",border:"1px solid #DDD9D2",borderRadius:12,marginBottom:8,cursor:"pointer",background:"#fff"}}>
        <div style={{width:36,height:36,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,fontFamily:"'Fraunces',serif",background:bg2,color:fg2}}>{day.day}</div>
        <div><div style={{fontSize:13.5,fontWeight:600}}>{day.date}</div><div style={{fontSize:12,color:"#9A958D"}}>{day.city} · {day.activities.length} plans</div></div>
      </div>)})}</div></>
      :<><div style={{background:"#F5F4F0",borderRadius:12,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
        <Chip city={data.itinerary[addDayIdx].city}/><span style={{fontSize:13.5,fontWeight:600}}>Day {data.itinerary[addDayIdx].day} — {data.itinerary[addDayIdx].date}</span>
        <button onClick={()=>setAddDayIdx(null)} style={{marginLeft:"auto",background:"none",border:"none",color:"#C84B31",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>Change</button>
      </div>
      <Input label="Time (optional)" type="time" value={addTime} onChange={e=>setAddTime(e.target.value)}/>
      <Btn primary full onClick={doAddToItinerary}>Add to Day {data.itinerary[addDayIdx].day}</Btn></>}</>}
    </Modal>
  </div>);
}
function HotelsTab({data,save}){  const[showAdd,setShowAdd]=useState(false);
  const allCities=data.cities||DEFAULT_CITIES;
  const[nh,setNh]=useState({city:allCities[0],name:"",checkIn:"",checkOut:"",address:"",conf:"",notes:""});
  const upd=(id,f,v)=>save({...data,hotels:data.hotels.map(h=>h.id===id?{...h,[f]:v}:h)});
  const doAdd=()=>{if(!nh.name.trim())return;save({...data,hotels:[...data.hotels,{...nh,id:Date.now()+""}]});setNh({city:allCities[0],name:"",checkIn:"",checkOut:"",address:"",conf:"",notes:""});setShowAdd(false)};
  const doRm=id=>save({...data,hotels:data.hotels.filter(h=>h.id!==id)});

  return(<div style={{padding:"12px 20px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700}}>Hotels</div><Btn primary sm onClick={()=>setShowAdd(true)}>{ic.plus} Add</Btn></div>
    {data.hotels.map(h=>(<div key={h.id} style={{background:"#fff",borderRadius:16,border:"1px solid #DDD9D2",padding:16,marginBottom:12,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><Chip city={h.city}/><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:12,color:"#9A958D"}}>{fmtDate(h.checkIn)} → {fmtDate(h.checkOut)}</span><IconBtn danger onClick={()=>doRm(h.id)} style={{width:28,height:28}}>{ic.trash}</IconBtn></div></div>
      <Input label="Hotel Name" value={h.name} onChange={e=>upd(h.id,"name",e.target.value)}/>
      <Input label="Address" value={h.address} onChange={e=>upd(h.id,"address",e.target.value)}/>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Input label="Check-in" type="date" value={h.checkIn} onChange={e=>upd(h.id,"checkIn",e.target.value)}/></div><div style={{flex:1}}><Input label="Check-out" type="date" value={h.checkOut} onChange={e=>upd(h.id,"checkOut",e.target.value)}/></div></div>
      <Input label="Confirmation #" value={h.conf} onChange={e=>upd(h.id,"conf",e.target.value)}/>
      <Input label="Notes" value={h.notes} onChange={e=>upd(h.id,"notes",e.target.value)}/>
    </div>))}
    <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Add Hotel">
      <Select label="City" value={nh.city} onChange={e=>setNh({...nh,city:e.target.value})}>{allCities.map(c=><option key={c}>{c}</option>)}</Select>
      <Input label="Hotel Name" placeholder="e.g. Park Hyatt" value={nh.name} onChange={e=>setNh({...nh,name:e.target.value})}/>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Input label="Check-in" type="date" value={nh.checkIn} onChange={e=>setNh({...nh,checkIn:e.target.value})}/></div><div style={{flex:1}}><Input label="Check-out" type="date" value={nh.checkOut} onChange={e=>setNh({...nh,checkOut:e.target.value})}/></div></div>
      <Input label="Address" value={nh.address} onChange={e=>setNh({...nh,address:e.target.value})}/>
      <Btn primary full onClick={doAdd}>Add Hotel</Btn>
    </Modal>
  </div>);
}

// ── FLIGHTS ──
function FlightsTab({data,save}){
  const[tab,setTab]=useState(data.members[0]||"");
  const[showAdd,setShowAdd]=useState(false);
  const[nf,setNf]=useState({label:"",airline:"",flightNo:"",from:"",to:"",date:"",time:"",conf:"",member:data.members[0]||""});
  const upd=(id,f,v)=>save({...data,flights:data.flights.map(fl=>fl.id===id?{...fl,[f]:v}:fl)});
  const doAdd=()=>{if(!nf.label.trim())return;save({...data,flights:[...data.flights,{...nf,id:Date.now()+"",member:tab}]});setNf({label:"",airline:"",flightNo:"",from:"",to:"",date:"",time:"",conf:"",member:tab});setShowAdd(false)};
  const doRm=id=>save({...data,flights:data.flights.filter(f=>f.id!==id)});
  const myFlights=(data.flights||[]).filter(f=>(f.member||"")===(tab||""));
  const colors3=["#E4F5EB","#F0EAFF","#FFF0EC","#FFF3E0","#E8F0FE","#FFF8E1"];
  const tc3=["#1A7A52","#7B4FC4","#C84B31","#D4850A","#3D85C6","#C49000"];
  const Tab2=({id,idx})=><button onClick={()=>setTab(id)} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:20,fontSize:13,fontWeight:tab===id?600:500,border:"none",cursor:"pointer",fontFamily:"inherit",background:tab===id?"#17150F":"#EDEBE6",color:tab===id?"#fff":"#605C55"}}><div style={{width:22,height:22,borderRadius:11,background:tab===id?"rgba(255,255,255,.2)":colors3[idx%6],display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:tab===id?"#fff":tc3[idx%6]}}>{id.charAt(0)}</div>{id}</button>;

  return(<div style={{padding:"12px 20px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700}}>Flights</div><Btn primary sm onClick={()=>setShowAdd(true)}>{ic.plus} Add</Btn></div>
    <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>{data.members.map((m,i)=><Tab2 key={m} id={m} idx={i}/>)}</div>
    {myFlights.length===0?<div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:"32px 16px",boxShadow:"0 1px 3px rgba(0,0,0,.04)",textAlign:"center",color:"#9A958D",fontSize:13.5}}>No flights added for {tab} yet.</div>
    :myFlights.map(f=>(<div key={f.id} style={{background:"#fff",borderRadius:16,border:"1px solid #DDD9D2",padding:16,marginBottom:12,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div style={{fontSize:12,fontWeight:700,color:"#C84B31",textTransform:"uppercase",letterSpacing:.8}}>{f.label} — {fmtDate(f.date)}</div><IconBtn danger onClick={()=>doRm(f.id)} style={{width:28,height:28}}>{ic.trash}</IconBtn></div>
      <Input label="Label" placeholder="e.g. Departure" value={f.label} onChange={e=>upd(f.id,"label",e.target.value)}/>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Input label="Airline" value={f.airline} onChange={e=>upd(f.id,"airline",e.target.value)}/></div><div style={{flex:1}}><Input label="Flight #" value={f.flightNo} onChange={e=>upd(f.id,"flightNo",e.target.value)}/></div></div>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Input label="From" value={f.from} onChange={e=>upd(f.id,"from",e.target.value)}/></div><div style={{flex:1}}><Input label="To" value={f.to} onChange={e=>upd(f.id,"to",e.target.value)}/></div></div>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Input label="Date" type="date" value={f.date} onChange={e=>upd(f.id,"date",e.target.value)}/></div><div style={{flex:1}}><Input label="Time" value={f.time} onChange={e=>upd(f.id,"time",e.target.value)}/></div></div>
      <Input label="Confirmation" value={f.conf} onChange={e=>upd(f.id,"conf",e.target.value)}/>
    </div>))}
    <Modal open={showAdd} onClose={()=>setShowAdd(false)} title={"Add Flight for "+tab}>
      <Input label="Label" placeholder="e.g. Departure, Layover, Return" value={nf.label} onChange={e=>setNf({...nf,label:e.target.value})}/>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Input label="Airline" value={nf.airline} onChange={e=>setNf({...nf,airline:e.target.value})}/></div><div style={{flex:1}}><Input label="Flight #" value={nf.flightNo} onChange={e=>setNf({...nf,flightNo:e.target.value})}/></div></div>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Input label="From" value={nf.from} onChange={e=>setNf({...nf,from:e.target.value})}/></div><div style={{flex:1}}><Input label="To" value={nf.to} onChange={e=>setNf({...nf,to:e.target.value})}/></div></div>
      <Input label="Date" type="date" value={nf.date} onChange={e=>setNf({...nf,date:e.target.value})}/>
      <Input label="Time" placeholder="e.g. 11:15 AM" value={nf.time} onChange={e=>setNf({...nf,time:e.target.value})}/>
      <Input label="Confirmation #" placeholder="Optional" value={nf.conf} onChange={e=>setNf({...nf,conf:e.target.value})}/>
      <Btn primary full onClick={doAdd}>Add Flight</Btn>
    </Modal>
  </div>);
}

// ── ACTIVITIES ──
function ActivitiesTab({data,save}){
  const[showAdd,setShowAdd]=useState(false);const allCities=data.cities||DEFAULT_CITIES;
  const[na,setNa]=useState({name:"",city:allCities[0]||"Tokyo",notes:"",cost:""});
  const[editAct,setEditAct]=useState(null);
  const[addToDay,setAddToDay]=useState(null);const[addDayIdx,setAddDayIdx]=useState(null);const[addTime,setAddTime]=useState("");
  const doAdd=()=>{if(!na.name.trim())return;save({...data,activities:[...data.activities,{...na,id:Date.now()+""}]});setNa({name:"",city:allCities[0]||"Tokyo",notes:"",cost:""});setShowAdd(false)};
  const doRm=id=>save({...data,activities:data.activities.filter(a=>a.id!==id)});
  const doEditAct=()=>{if(!editAct)return;save({...data,activities:data.activities.map(a=>a.id===editAct.id?editAct:a)});setEditAct(null)};
  const doAddToItinerary=()=>{if(!addToDay||addDayIdx===null)return;const mapsUrl=addToDay.name?"https://www.google.com/maps/search/"+encodeURIComponent(addToDay.name):"";const act={id:Date.now()+"",time:addTime,text:addToDay.name+(addToDay.cost&&addToDay.cost!=="0"?" (~$"+addToDay.cost+")":""),location:addToDay.name,mapsLink:mapsUrl};const u=[...data.itinerary];u[addDayIdx]={...u[addDayIdx],activities:[...u[addDayIdx].activities,act]};save({...data,itinerary:u});setAddToDay(null);setAddDayIdx(null);setAddTime("")};
  return(<div style={{padding:"12px 20px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700}}>Activities</div><Btn primary sm onClick={()=>setShowAdd(true)}>{ic.plus} Add</Btn></div>
    <div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:"4px 16px",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>{data.activities.length===0?<div style={{textAlign:"center",padding:32,color:"#9A958D"}}>No activities.</div>:data.activities.map(a=>(<div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:"1px solid #ECEAE5"}}><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><span style={{fontSize:14,fontWeight:600}}>{a.name}</span><Chip city={a.city}/></div><div style={{fontSize:12.5,color:"#9A958D"}}>{a.cost&&a.cost!=="0"?`~$${a.cost}/person`:"Free"}</div>{a.notes&&<div style={{fontSize:12.5,color:"#605C55",marginTop:3}}>{a.notes}</div>}</div><div style={{display:"flex",gap:4,flexShrink:0,marginLeft:8}}><IconBtn onClick={()=>setAddToDay(a)} style={{background:"#E4F5EB",color:"#1A7A52"}}>{ic.cal}</IconBtn><IconBtn onClick={()=>setEditAct({...a})}>{ic.edit}</IconBtn><IconBtn danger onClick={()=>doRm(a.id)}>{ic.trash}</IconBtn></div></div>))}</div>
    <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Add Activity">
      <Input label="Activity Name" placeholder="e.g. teamLab Borderless" value={na.name} onChange={e=>setNa({...na,name:e.target.value})}/>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Select label="City" value={na.city} onChange={e=>setNa({...na,city:e.target.value})}>{allCities.map(c=><option key={c}>{c}</option>)}</Select></div><div style={{flex:1}}><Input label="Est. Cost (USD)" type="number" placeholder="—" value={na.cost} onChange={e=>setNa({...na,cost:e.target.value})}/></div></div>
      <Input label="Notes" placeholder="Tips, booking info..." value={na.notes} onChange={e=>setNa({...na,notes:e.target.value})}/>
      <Btn primary full onClick={doAdd}>Save</Btn>
    </Modal>
    <Modal open={!!editAct} onClose={()=>setEditAct(null)} title="Edit Activity">
      {editAct&&<><Input label="Activity Name" value={editAct.name} onChange={e=>setEditAct({...editAct,name:e.target.value})}/>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Select label="City" value={editAct.city} onChange={e=>setEditAct({...editAct,city:e.target.value})}>{allCities.map(c=><option key={c}>{c}</option>)}</Select></div><div style={{flex:1}}><Input label="Est. Cost (USD)" type="number" value={editAct.cost||""} onChange={e=>setEditAct({...editAct,cost:e.target.value})}/></div></div>
      <Input label="Notes" value={editAct.notes||""} onChange={e=>setEditAct({...editAct,notes:e.target.value})}/>
      <Btn primary full onClick={doEditAct}>Save Changes</Btn></>}
    </Modal>
    <Modal open={!!addToDay} onClose={()=>{setAddToDay(null);setAddDayIdx(null);setAddTime("")}} title={addToDay?"Add \""+addToDay.name+"\" to Itinerary":""}>
      {addToDay&&<>{addDayIdx===null?<><p style={{fontSize:13.5,color:"#605C55",marginBottom:14}}>Which day?</p>
      <div style={{maxHeight:300,overflowY:"auto"}}>{data.itinerary.map((day,i)=>{const[bg2,fg2]=getCityColor(day.city);return(<div key={i} onClick={()=>setAddDayIdx(i)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",border:"1px solid #DDD9D2",borderRadius:12,marginBottom:8,cursor:"pointer",background:"#fff"}}>
        <div style={{width:36,height:36,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,fontFamily:"'Fraunces',serif",background:bg2,color:fg2}}>{day.day}</div>
        <div><div style={{fontSize:13.5,fontWeight:600}}>{day.date}</div><div style={{fontSize:12,color:"#9A958D"}}>{day.city} · {day.activities.length} plans</div></div>
      </div>)})}</div></>
      :<><div style={{background:"#F5F4F0",borderRadius:12,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
        <Chip city={data.itinerary[addDayIdx].city}/><span style={{fontSize:13.5,fontWeight:600}}>Day {data.itinerary[addDayIdx].day} — {data.itinerary[addDayIdx].date}</span>
        <button onClick={()=>setAddDayIdx(null)} style={{marginLeft:"auto",background:"none",border:"none",color:"#C84B31",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>Change</button>
      </div>
      <Input label="Time (optional)" type="time" value={addTime} onChange={e=>setAddTime(e.target.value)}/>
      <Btn primary full onClick={doAddToItinerary}>Add to Day {data.itinerary[addDayIdx].day}</Btn></>}</>}
    </Modal>
  </div>);
}

// ── PHOTOS ──
function PhotosTab({data,save}){
  const[showAdd,setShowAdd]=useState(false);
  const albums=data.albums||[];
  const mainAlbum=data.mainAlbumUrl||"";
  const[na,setNa]=useState({title:"",url:""});
  const[editMain,setEditMain]=useState(false);
  const[mainUrl,setMainUrl]=useState(mainAlbum);

  const doAddAlbum=()=>{if(!na.title.trim()||!na.url.trim())return;save({...data,albums:[...albums,{...na,id:Date.now()+""}]});setNa({title:"",url:""});setShowAdd(false)};
  const doRmAlbum=id=>save({...data,albums:albums.filter(a=>a.id!==id)});
  const saveMain=()=>{save({...data,mainAlbumUrl:mainUrl});setEditMain(false)};

  return(<div style={{padding:"12px 20px"}}>
    <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700,marginBottom:16}}>Photos</div>

    {/* Main shared album */}
    <div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:16,marginBottom:14,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
        <div style={{width:40,height:40,borderRadius:12,background:"#FFF0EC",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>📸</div>
        <div><div style={{fontSize:15,fontWeight:600}}>Shared Album</div><div style={{fontSize:12.5,color:"#9A958D"}}>One album for everyone to upload to</div></div>
      </div>
      {mainAlbum?(<div>
        <a href={mainAlbum} target="_blank" rel="noopener" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"12px 18px",background:"#C84B31",color:"#fff",borderRadius:12,fontSize:14,fontWeight:600,textDecoration:"none",marginBottom:10}}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Open Shared Album
        </a>
        <Btn ghost sm full onClick={()=>{setMainUrl(mainAlbum);setEditMain(true)}}>Edit Link</Btn>
      </div>):(
        <Btn primary full onClick={()=>{setMainUrl("");setEditMain(true)}}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Shared Album Link
        </Btn>
      )}
    </div>

    {/* How-to tip */}
    {!mainAlbum&&<div style={{background:"#FFF8E1",border:"1px solid #F5E6B8",borderRadius:16,padding:14,marginBottom:14}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>💡 How to set up a shared album</div>
      <div style={{fontSize:12.5,color:"#605C55",lineHeight:1.5}}>
        1. Open Google Photos on your phone{"\n"}
        2. Tap Library → New Album → name it{"\n"}
        3. Tap Share → Copy link{"\n"}
        4. Paste the link here!{"\n"}
        Everyone can then open it and add their own photos.
      </div>
    </div>}

    {/* Additional albums */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,marginTop:8}}>
      <div style={{fontSize:14,fontWeight:600}}>Additional Albums</div>
      <Btn ghost sm onClick={()=>setShowAdd(true)}>{ic.plus} Add</Btn>
    </div>

    {albums.length===0?<div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:"28px 16px",textAlign:"center",color:"#9A958D",fontSize:13.5,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>No additional albums yet. Add albums for specific days, events, or vibes!</div>
    :albums.map(a=>(<div key={a.id} style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:14,marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,.04)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <a href={a.url} target="_blank" rel="noopener" style={{flex:1,textDecoration:"none"}}>
        <div style={{fontSize:14,fontWeight:600,color:"#17150F"}}>{a.title}</div>
        <div style={{fontSize:12,color:"#C84B31",marginTop:2}}>Open album →</div>
      </a>
      <IconBtn danger onClick={()=>doRmAlbum(a.id)}>{ic.trash}</IconBtn>
    </div>))}

    {/* Edit main album modal */}
    <Modal open={editMain} onClose={()=>setEditMain(false)} title="Shared Album Link">
      <Input label="Google Photos Link" placeholder="https://photos.app.goo.gl/..." value={mainUrl} onChange={e=>setMainUrl(e.target.value)}/>
      <p style={{fontSize:12.5,color:"#9A958D",marginBottom:14}}>Paste the share link from Google Photos. Everyone in the group can open this to view and add photos.</p>
      <Btn primary full onClick={saveMain}>Save</Btn>
    </Modal>

    {/* Add album modal */}
    <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Add Album">
      <Input label="Album Name" placeholder="e.g. Day 3 — Asakusa, Food Highlights" value={na.title} onChange={e=>setNa({...na,title:e.target.value})}/>
      <Input label="Link" placeholder="https://photos.app.goo.gl/..." value={na.url} onChange={e=>setNa({...na,url:e.target.value})}/>
      <Btn primary full onClick={doAddAlbum}>Add Album</Btn>
    </Modal>
  </div>);
}

// ── AI ASSISTANT ──
function AITab({data,save}){
  const[mode,setMode]=useState("chat");// chat | food | activities | optimize | briefing
  const[loading,setLoading]=useState(false);
  const[result,setResult]=useState(null);
  const[chatInput,setChatInput]=useState("");
  const[chatHistory,setChatHistory]=useState([]);
  const[suggestCity,setSuggestCity]=useState((data.cities||["Tokyo"])[0]);
  const allCities=data.cities||["Tokyo"];
  // Food preferences
  const[foodVibe,setFoodVibe]=useState(null);// quick | casual | high-end | michelin
  const[foodCuisine,setFoodCuisine]=useState(null);// sushi | ramen | izakaya | etc
  const[foodBudget,setFoodBudget]=useState(null);// $ | $$ | $$$ | $$$$
  const[foodStep,setFoodStep]=useState(0);// 0=prefs, 1=results
  // Activity preferences
  const[actType,setActType]=useState(null);// cultural | nature | shopping | nightlife | unique
  const[actPace,setActPace]=useState(null);// chill | moderate | packed
  const[actBudget,setActBudget]=useState(null);// free | budget | splurge
  const[actStep,setActStep]=useState(0);

  const tripContext=()=>{
    const itin=data.itinerary.map(d=>`Day ${d.day} (${d.date}, ${d.city}): ${d.activities.length>0?d.activities.map(a=>`${a.time||"?"} ${a.text}`).join("; "):"no plans"}`).join("\n");
    const foods=[...(data.restaurants||[]).map(r=>`Restaurant: ${r.name} (${r.cuisine||"?"}, ${r.city})`),...(data.quickEats||[]).map(r=>`Quick eat: ${r.name} (${r.city})`)].join("\n");
    const acts=(data.activities||[]).map(a=>`Activity: ${a.name} (${a.city}, ~$${a.cost||0})`).join("\n");
    return`Trip: ${data.tripName||"Japan Trip"}\nDates: ${data.startDate} to ${data.endDate}\nTravelers: ${data.members.join(", ")}\nCities: ${allCities.join(", ")}\n\nItinerary:\n${itin}\n\nSaved restaurants/food:\n${foods||"None"}\n\nSaved activities:\n${acts||"None"}`;
  };

  const doAI=async(sysPrompt,userMsg)=>{
    setLoading(true);setResult(null);
    const r=await askClaude(sysPrompt,userMsg);
    setLoading(false);
    if(r.error){setResult("❌ Error: "+r.error);return null}
    setResult(r.text);return r.text;
  };

  const suggestFood=async()=>{
    const prefs=[];
    if(foodVibe)prefs.push(`Vibe: ${foodVibe}`);
    if(foodCuisine)prefs.push(`Cuisine: ${foodCuisine}`);
    if(foodBudget)prefs.push(`Budget: ${foodBudget}`);
    await doAI(
      "You are a Japan food expert. Respond ONLY with a JSON array of 5 objects with fields: name, cuisine, area, priceRange, whyGo. No markdown, no backticks, just the JSON array.",
      `Suggest 5 restaurants or food spots in ${suggestCity}, Japan for ${data.members.length} travelers in March 2026.\n\nPreferences:\n${prefs.join("\n")}\n\nAlready saved:\n${(data.restaurants||[]).filter(r=>r.city===suggestCity).map(r=>r.name).join(", ")||"nothing yet"}\n\nGive unique suggestions they don't already have. Match their preferences closely.`
    );
    setFoodStep(1);
  };

  const suggestActivities=async()=>{
    const prefs=[];
    if(actType)prefs.push(`Type: ${actType}`);
    if(actPace)prefs.push(`Pace: ${actPace}`);
    if(actBudget)prefs.push(`Budget: ${actBudget}`);
    await doAI(
      "You are a Japan travel expert. Respond ONLY with a JSON array of 5 objects with fields: name, description, estimatedCost, duration, bestTimeOfDay. No markdown, no backticks, just the JSON array.",
      `Suggest 5 activities in ${suggestCity}, Japan for ${data.members.length} travelers in March 2026.\n\nPreferences:\n${prefs.join("\n")}\n\nAlready planned:\n${(data.activities||[]).filter(a=>a.city===suggestCity).map(a=>a.name).join(", ")||"nothing yet"}\n\nMatch their preferences. Give unique suggestions they haven't planned.`
    );
    setActStep(1);
  };

  const optimizeItinerary=async()=>{
    await doAI(
      "You are a Japan travel logistics expert. Analyze this itinerary and suggest specific improvements. Be concise and actionable. Format your response with clear numbered suggestions. Focus on: geographic grouping (things near each other on the same day), time-of-day logic, balanced days, and practical tips.",
      `Here is our current trip plan. Please analyze and suggest how to better organize it:\n\n${tripContext()}`
    );
  };

  const dailyBriefing=async(dayIdx)=>{
    const day=data.itinerary[dayIdx];
    if(!day)return;
    await doAI(
      "You are a friendly, knowledgeable Japan travel concierge. Give a brief, practical daily briefing for this day of the trip. Include: summary of plans, walking/transit tips between locations, meal suggestions for gaps, weather expectations for March in this city, and any practical tips. Keep it conversational and concise — about 150 words.",
      `Generate a daily briefing for:\n\nDay ${day.day} - ${day.date} in ${day.city}\nActivities: ${day.activities.length>0?day.activities.map(a=>`${a.time||"TBD"}: ${a.text}${a.location?" ("+a.location+")":""}`).join("\n"):"No plans yet"}\n\nOther context:\n${tripContext()}`
    );
  };

  const doChat=async()=>{
    if(!chatInput.trim())return;
    const msg=chatInput.trim();setChatInput("");
    const newHistory=[...chatHistory,{role:"user",text:msg}];
    setChatHistory(newHistory);setLoading(true);setResult(null);
    const sysPrompt=`You are a helpful Japan travel assistant for a group trip. Here is their trip context:\n\n${tripContext()}\n\nAnswer questions helpfully and concisely. If they ask for suggestions, be specific with names and locations.`;
    const r=await askClaude(sysPrompt,newHistory.map(h=>`${h.role==="user"?"Human":"Assistant"}: ${h.text}`).join("\n")+"\n\nHuman: "+msg);
    setLoading(false);
    if(r.error){setChatHistory([...newHistory,{role:"ai",text:"❌ "+r.error}]);}
    else{setChatHistory([...newHistory,{role:"ai",text:r.text}]);}
  };

  const addFoodFromSuggestion=(item)=>{
    const newItem={id:Date.now()+"",name:item.name,cuisine:item.cuisine||"",city:suggestCity,location:item.area||"",notes:item.whyGo||item.priceRange||""};
    save({...data,restaurants:[...data.restaurants,newItem]});
  };

  const addActivityFromSuggestion=(item)=>{
    const newItem={id:Date.now()+"",name:item.name,city:suggestCity,cost:item.estimatedCost?String(item.estimatedCost).replace(/[^0-9]/g,""):"0",notes:item.description||""};
    save({...data,activities:[...data.activities,newItem]});
  };

  const parseSuggestions=(text)=>{
    try{const clean=text.replace(/```json\s*/g,"").replace(/```/g,"").trim();return JSON.parse(clean);}
    catch(e){return null;}
  };

  const ModeBtn=({id,icon,label})=>(
    <button onClick={()=>{setMode(id);setResult(null);setFoodStep(0);setActStep(0)}} style={{flex:1,padding:"10px 6px",borderRadius:14,border:mode===id?"2px solid #C84B31":"1.5px solid #DDD9D2",background:mode===id?"#FFF0EC":"#fff",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>
      <div style={{fontSize:18}}>{icon}</div>
      <div style={{fontSize:11,fontWeight:600,color:mode===id?"#C84B31":"#605C55",marginTop:2}}>{label}</div>
    </button>
  );

  const suggestions=result?parseSuggestions(result):null;

  return(<div style={{padding:"12px 20px"}}>
    <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700,marginBottom:4}}>AI Assistant <span style={{fontSize:14,fontWeight:400,color:"#C84B31"}}>✨</span></div>
    <p style={{fontSize:12.5,color:"#9A958D",marginBottom:14}}>Powered by Claude · Knows your full trip plan</p>

    <div style={{display:"flex",gap:6,marginBottom:16}}>
      <ModeBtn id="chat" icon="💬" label="Chat"/>
      <ModeBtn id="food" icon="🍜" label="Food"/>
      <ModeBtn id="activities" icon="🎯" label="Activities"/>
      <ModeBtn id="optimize" icon="🧠" label="Optimize"/>
      <ModeBtn id="briefing" icon="📋" label="Briefing"/>
    </div>

    {/* ── CHAT MODE ── */}
    {mode==="chat"&&<div>
      <div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:16,minHeight:200,maxHeight:400,overflowY:"auto",marginBottom:12}}>
        {chatHistory.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:"#9A958D"}}><div style={{fontSize:28,marginBottom:8}}>💬</div><div style={{fontSize:13.5}}>Ask anything about your Japan trip!</div><div style={{fontSize:12,marginTop:4}}>"Do we need to book teamLab in advance?"<br/>"What's the best way to get from Tokyo to Osaka?"<br/>"Suggest a dinner spot near Shinjuku"</div></div>}
        {chatHistory.map((m,i)=><div key={i} style={{marginBottom:12,display:"flex",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start"}}>
          <div style={{maxWidth:"85%",padding:"10px 14px",borderRadius:14,fontSize:13.5,lineHeight:1.5,whiteSpace:"pre-wrap",background:m.role==="user"?"#C84B31":"#F5F4F0",color:m.role==="user"?"#fff":"#1A1816"}}>{m.text}</div>
        </div>)}
        {loading&&<div style={{display:"flex",gap:4,padding:8}}><div style={{width:8,height:8,borderRadius:4,background:"#C84B31",animation:"pulse 1s infinite"}}/>
          <div style={{width:8,height:8,borderRadius:4,background:"#C84B31",animation:"pulse 1s infinite .2s"}}/>
          <div style={{width:8,height:8,borderRadius:4,background:"#C84B31",animation:"pulse 1s infinite .4s"}}/></div>}
      </div>
      <div style={{display:"flex",gap:8}}>
        <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!loading&&doChat()} placeholder="Ask about your trip..." style={{flex:1,padding:"11px 14px",border:"1.5px solid #DDD9D2",borderRadius:12,fontSize:14,fontFamily:"inherit",outline:"none"}}/>
        <button onClick={doChat} disabled={loading} style={{background:"#C84B31",color:"#fff",border:"none",borderRadius:12,padding:"0 18px",fontSize:13.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:loading?.6:1}}>Send</button>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
    </div>}

    {/* ── FOOD SUGGESTIONS ── */}
    {mode==="food"&&<div>
      {/* City picker */}
      <div style={{marginBottom:14}}>
        <select value={suggestCity} onChange={e=>{setSuggestCity(e.target.value);setFoodStep(0);setResult(null)}} style={{width:"100%",padding:"9px 12px",borderRadius:10,border:"1.5px solid #DDD9D2",fontSize:13.5,fontFamily:"inherit"}}>
          {allCities.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>

      {foodStep===0&&<>
        {/* Vibe */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:600,color:"#605C55",marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>What kind of experience?</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {[{id:"quick-bite",label:"🍙 Quick Bite",desc:"Grab and go"},{id:"casual",label:"🍜 Casual",desc:"Relaxed sit-down"},{id:"high-end",label:"🍷 High-End",desc:"Special occasion"},{id:"michelin",label:"⭐ Michelin",desc:"Star-rated"},{id:"street-food",label:"🏮 Street Food",desc:"Market stalls"},{id:"surprise-me",label:"🎲 Surprise Me",desc:"Dealer's choice"}].map(v=>(
              <button key={v.id} onClick={()=>setFoodVibe(foodVibe===v.id?null:v.id)} style={{padding:"8px 14px",borderRadius:12,border:foodVibe===v.id?"2px solid #C84B31":"1.5px solid #DDD9D2",background:foodVibe===v.id?"#FFF0EC":"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:12.5,fontWeight:500,color:foodVibe===v.id?"#C84B31":"#605C55"}}>{v.label}</button>
            ))}
          </div>
        </div>

        {/* Cuisine */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:600,color:"#605C55",marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>Cuisine preference?</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {[{id:"sushi",label:"🍣 Sushi"},{id:"ramen",label:"🍜 Ramen"},{id:"izakaya",label:"🍶 Izakaya"},{id:"tempura",label:"🍤 Tempura"},{id:"yakitori",label:"🍗 Yakitori"},{id:"wagyu-beef",label:"🥩 Wagyu/BBQ"},{id:"udon-soba",label:"🥢 Udon/Soba"},{id:"curry",label:"🍛 Japanese Curry"},{id:"kaiseki",label:"🎎 Kaiseki"},{id:"anything",label:"🌟 Open to Anything"}].map(c=>(
              <button key={c.id} onClick={()=>setFoodCuisine(foodCuisine===c.id?null:c.id)} style={{padding:"8px 14px",borderRadius:12,border:foodCuisine===c.id?"2px solid #C84B31":"1.5px solid #DDD9D2",background:foodCuisine===c.id?"#FFF0EC":"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:12.5,fontWeight:500,color:foodCuisine===c.id?"#C84B31":"#605C55"}}>{c.label}</button>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:600,color:"#605C55",marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>Budget per person?</div>
          <div style={{display:"flex",gap:6}}>
            {[{id:"$",label:"$ Under ¥1,000",desc:"~$7"},{id:"$$",label:"$$ ¥1,000–3,000",desc:"~$7–20"},{id:"$$$",label:"$$$ ¥3,000–8,000",desc:"~$20–55"},{id:"$$$$",label:"$$$$ ¥8,000+",desc:"~$55+"}].map(b=>(
              <button key={b.id} onClick={()=>setFoodBudget(foodBudget===b.id?null:b.id)} style={{flex:1,padding:"10px 6px",borderRadius:12,border:foodBudget===b.id?"2px solid #C84B31":"1.5px solid #DDD9D2",background:foodBudget===b.id?"#FFF0EC":"#fff",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>
                <div style={{fontSize:13,fontWeight:600,color:foodBudget===b.id?"#C84B31":"#1A1816"}}>{b.id}</div>
                <div style={{fontSize:10,color:"#9A958D",marginTop:2}}>{b.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button onClick={suggestFood} disabled={loading} style={{background:"#C84B31",color:"#fff",border:"none",borderRadius:12,padding:"12px 18px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",width:"100%",opacity:loading?.6:1}}>{loading?"✨ Finding the best spots...":"✨ Get Recommendations"}</button>
      </>}

      {foodStep===1&&<>
        <button onClick={()=>{setFoodStep(0);setResult(null)}} style={{background:"#EDEBE6",color:"#605C55",border:"none",borderRadius:10,padding:"7px 14px",fontSize:12.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginBottom:12}}>← Change preferences</button>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
          {foodVibe&&<span style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:"#FFF0EC",color:"#C84B31",fontWeight:500}}>{foodVibe}</span>}
          {foodCuisine&&<span style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:"#FFF0EC",color:"#C84B31",fontWeight:500}}>{foodCuisine}</span>}
          {foodBudget&&<span style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:"#FFF0EC",color:"#C84B31",fontWeight:500}}>{foodBudget}</span>}
          <span style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:"#EDEBE6",color:"#605C55",fontWeight:500}}>{suggestCity}</span>
        </div>
        {loading&&<div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:24,textAlign:"center",color:"#9A958D"}}><div style={{fontSize:24,marginBottom:8}}>🍜</div>Finding the best spots...</div>}
        {suggestions&&Array.isArray(suggestions)?<div>{suggestions.map((s,i)=>(
          <div key={i} style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:14,padding:14,marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><div style={{fontSize:14,fontWeight:600}}>{s.name}</div>
              <div style={{fontSize:12,color:"#9A958D"}}>{[s.cuisine,s.area,s.priceRange].filter(Boolean).join(" · ")}</div>
              {s.whyGo&&<div style={{fontSize:12.5,color:"#605C55",marginTop:4}}>{s.whyGo}</div>}</div>
              <button onClick={()=>addFoodFromSuggestion(s)} style={{background:"#E4F5EB",color:"#1A7A52",border:"none",borderRadius:10,padding:"7px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0,marginLeft:8}}>+ Add</button>
            </div>
          </div>
        ))}</div>:result&&!loading?<div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:16,fontSize:13.5,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{result}</div>:null}
        {suggestions&&!loading&&<button onClick={()=>{setResult(null);suggestFood()}} style={{background:"#EDEBE6",color:"#605C55",border:"none",borderRadius:12,padding:"10px 18px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",width:"100%",marginTop:8}}>🔄 Get More Suggestions</button>}
      </>}
    </div>}

    {/* ── ACTIVITY SUGGESTIONS ── */}
    {mode==="activities"&&<div>
      <div style={{marginBottom:14}}>
        <select value={suggestCity} onChange={e=>{setSuggestCity(e.target.value);setActStep(0);setResult(null)}} style={{width:"100%",padding:"9px 12px",borderRadius:10,border:"1.5px solid #DDD9D2",fontSize:13.5,fontFamily:"inherit"}}>
          {allCities.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>

      {actStep===0&&<>
        {/* Type */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:600,color:"#605C55",marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>What are you in the mood for?</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {[{id:"cultural",label:"⛩️ Cultural",desc:"Temples, shrines, museums"},{id:"nature",label:"🌸 Nature",desc:"Parks, gardens, views"},{id:"shopping",label:"🛍️ Shopping",desc:"Markets, districts, vintage"},{id:"nightlife",label:"🌃 Nightlife",desc:"Bars, entertainment"},{id:"unique",label:"🎌 Unique to Japan",desc:"Only-in-Japan experiences"},{id:"food-tour",label:"🍱 Food Tour",desc:"Eating-focused activities"},{id:"relaxation",label:"♨️ Relaxation",desc:"Onsen, spas, tea"},{id:"surprise-me",label:"🎲 Surprise Me",desc:"Dealer's choice"}].map(t=>(
              <button key={t.id} onClick={()=>setActType(actType===t.id?null:t.id)} style={{padding:"8px 14px",borderRadius:12,border:actType===t.id?"2px solid #C84B31":"1.5px solid #DDD9D2",background:actType===t.id?"#FFF0EC":"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:12.5,fontWeight:500,color:actType===t.id?"#C84B31":"#605C55"}}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Pace */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:600,color:"#605C55",marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>How's your energy?</div>
          <div style={{display:"flex",gap:6}}>
            {[{id:"chill",label:"😌 Chill",desc:"Take it easy"},{id:"moderate",label:"🚶 Moderate",desc:"Balanced pace"},{id:"packed",label:"⚡ Go-getter",desc:"See it all"}].map(p=>(
              <button key={p.id} onClick={()=>setActPace(actPace===p.id?null:p.id)} style={{flex:1,padding:"10px 8px",borderRadius:12,border:actPace===p.id?"2px solid #C84B31":"1.5px solid #DDD9D2",background:actPace===p.id?"#FFF0EC":"#fff",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>
                <div style={{fontSize:13,fontWeight:600,color:actPace===p.id?"#C84B31":"#1A1816"}}>{p.label}</div>
                <div style={{fontSize:10,color:"#9A958D",marginTop:2}}>{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:600,color:"#605C55",marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>Budget?</div>
          <div style={{display:"flex",gap:6}}>
            {[{id:"free",label:"🆓 Free",desc:"No-cost activities"},{id:"budget",label:"💴 Budget",desc:"Under ¥2,000"},{id:"mid",label:"💰 Mid-Range",desc:"¥2,000–5,000"},{id:"splurge",label:"💎 Splurge",desc:"Worth every yen"}].map(b=>(
              <button key={b.id} onClick={()=>setActBudget(actBudget===b.id?null:b.id)} style={{flex:1,padding:"10px 6px",borderRadius:12,border:actBudget===b.id?"2px solid #C84B31":"1.5px solid #DDD9D2",background:actBudget===b.id?"#FFF0EC":"#fff",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>
                <div style={{fontSize:12,fontWeight:600,color:actBudget===b.id?"#C84B31":"#1A1816"}}>{b.label}</div>
                <div style={{fontSize:9.5,color:"#9A958D",marginTop:2}}>{b.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button onClick={suggestActivities} disabled={loading} style={{background:"#C84B31",color:"#fff",border:"none",borderRadius:12,padding:"12px 18px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",width:"100%",opacity:loading?.6:1}}>{loading?"✨ Finding activities...":"✨ Get Recommendations"}</button>
      </>}

      {actStep===1&&<>
        <button onClick={()=>{setActStep(0);setResult(null)}} style={{background:"#EDEBE6",color:"#605C55",border:"none",borderRadius:10,padding:"7px 14px",fontSize:12.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginBottom:12}}>← Change preferences</button>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
          {actType&&<span style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:"#FFF0EC",color:"#C84B31",fontWeight:500}}>{actType}</span>}
          {actPace&&<span style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:"#FFF0EC",color:"#C84B31",fontWeight:500}}>{actPace}</span>}
          {actBudget&&<span style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:"#FFF0EC",color:"#C84B31",fontWeight:500}}>{actBudget}</span>}
          <span style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:"#EDEBE6",color:"#605C55",fontWeight:500}}>{suggestCity}</span>
        </div>
        {loading&&<div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:24,textAlign:"center",color:"#9A958D"}}><div style={{fontSize:24,marginBottom:8}}>🎯</div>Finding activities...</div>}
        {suggestions&&Array.isArray(suggestions)?<div>{suggestions.map((s,i)=>(
          <div key={i} style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:14,padding:14,marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><div style={{fontSize:14,fontWeight:600}}>{s.name}</div>
              <div style={{fontSize:12,color:"#9A958D"}}>{[s.estimatedCost,s.duration,s.bestTimeOfDay].filter(Boolean).join(" · ")}</div>
              {s.description&&<div style={{fontSize:12.5,color:"#605C55",marginTop:4}}>{s.description}</div>}</div>
              <button onClick={()=>addActivityFromSuggestion(s)} style={{background:"#E4F5EB",color:"#1A7A52",border:"none",borderRadius:10,padding:"7px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0,marginLeft:8}}>+ Add</button>
            </div>
          </div>
        ))}</div>:result&&!loading?<div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:16,fontSize:13.5,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{result}</div>:null}
        {suggestions&&!loading&&<button onClick={()=>{setResult(null);suggestActivities()}} style={{background:"#EDEBE6",color:"#605C55",border:"none",borderRadius:12,padding:"10px 18px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",width:"100%",marginTop:8}}>🔄 Get More Suggestions</button>}
      </>}
    </div>}

    {/* ── OPTIMIZE ── */}
    {mode==="optimize"&&<div>
      <div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:16,marginBottom:14}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>🧠 Smart Itinerary Optimizer</div>
        <p style={{fontSize:13,color:"#605C55",lineHeight:1.5,marginBottom:14}}>Claude will analyze your full itinerary and suggest improvements — better grouping by location, smarter scheduling, and balanced days.</p>
        <button onClick={optimizeItinerary} disabled={loading} style={{background:"#C84B31",color:"#fff",border:"none",borderRadius:12,padding:"10px 18px",fontSize:13.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit",width:"100%",opacity:loading?.6:1}}>{loading?"Analyzing your trip...":"✨ Optimize My Itinerary"}</button>
      </div>
      {result&&!loading&&<div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:16,fontSize:13.5,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{result}</div>}
    </div>}

    {/* ── DAILY BRIEFING ── */}
    {mode==="briefing"&&<div>
      <p style={{fontSize:13,color:"#605C55",marginBottom:14}}>Tap a day to get an AI-generated briefing with tips, logistics, and meal suggestions.</p>
      <div style={{maxHeight:300,overflowY:"auto",marginBottom:14}}>{data.itinerary.map((day,i)=>{
        const[bg,fg]=getCityColor(day.city);
        return(<div key={i} onClick={()=>dailyBriefing(i)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",border:"1px solid #DDD9D2",borderRadius:12,marginBottom:8,cursor:"pointer",background:"#fff"}}>
          <div style={{width:36,height:36,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,fontFamily:"'Fraunces',serif",background:bg,color:fg}}>{day.day}</div>
          <div><div style={{fontSize:13.5,fontWeight:600}}>{day.date}</div><div style={{fontSize:12,color:"#9A958D"}}>{day.city} · {day.activities.length} plans</div></div>
        </div>);
      })}</div>
      {loading&&<div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:20,textAlign:"center",color:"#9A958D"}}>
        <div style={{fontSize:24,marginBottom:8}}>📋</div>Generating briefing...</div>}
      {result&&!loading&&<div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:16,fontSize:13.5,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{result}</div>}
    </div>}
  </div>);
}

// ── TRANSPORT ──
// ── CALENDAR ──
function CalendarTab({data,save,setTab:switchTab,setSub}){
  const today=new Date();today.setHours(0,0,0,0);
  const tripStart=data.startDate?new Date(data.startDate+"T00:00:00"):null;
  const startMonth=tripStart?new Date(tripStart.getFullYear(),tripStart.getMonth(),1):new Date(today.getFullYear(),today.getMonth(),1);
  const[viewMonth,setViewMonth]=useState(startMonth);
  const[selDate,setSelDate]=useState(null);
  const[editAct,setEditAct]=useState(null);// {dayIdx, ...activity}
  const mapsUrl=(loc)=>loc?"https://www.google.com/maps/search/"+encodeURIComponent(loc):"";

  const dayLookup={};data.itinerary.forEach((d,idx)=>{if(d.isoDate)dayLookup[d.isoDate]={...d,idx}});

  const yr=viewMonth.getFullYear();const mo=viewMonth.getMonth();
  const firstDay=new Date(yr,mo,1).getDay();
  const daysInMonth=new Date(yr,mo+1,0).getDate();
  const monthLabel=viewMonth.toLocaleDateString("en-US",{month:"long",year:"numeric"});
  const prevMonth=()=>setViewMonth(new Date(yr,mo-1,1));
  const nextMonth=()=>setViewMonth(new Date(yr,mo+1,1));
  const cells=[];for(let i=0;i<firstDay;i++)cells.push(null);for(let d=1;d<=daysInMonth;d++)cells.push(d);

  const selDay=selDate?dayLookup[selDate]:null;
  const fmtTime2=(t)=>{if(!t)return"";const p=t.split(":");const h=parseInt(p[0]);return(h===0?12:h>12?h-12:h)+":"+p[1]+" "+(h>=12?"PM":"AM")};

  const doEdit=()=>{if(!editAct)return;const di=editAct.dayIdx;const u=[...data.itinerary];u[di]={...u[di],activities:u[di].activities.map(a=>a.id===editAct.id?{id:editAct.id,time:editAct.time,text:editAct.text,location:editAct.location,mapsLink:mapsUrl(editAct.location),comments:editAct.comments}:a)};save({...data,itinerary:u});setEditAct(null)};
  const doRm=(di,aid)=>{const u=[...data.itinerary];u[di]={...u[di],activities:u[di].activities.filter(a=>a.id!==aid)};save({...data,itinerary:u})};

  return(<div style={{padding:"12px 20px"}}>
    <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700,marginBottom:16}}>Calendar</div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <button onClick={prevMonth} style={{background:"#EDEBE6",border:"none",borderRadius:10,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#605C55",fontSize:18}}>‹</button>
      <div style={{fontSize:16,fontWeight:600,fontFamily:"'Fraunces',serif"}}>{monthLabel}</div>
      <button onClick={nextMonth} style={{background:"#EDEBE6",border:"none",borderRadius:10,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#605C55",fontSize:18}}>›</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
      {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:600,color:"#9A958D",padding:"6px 0"}}>{d}</div>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:16}}>
      {cells.map((day,i)=>{
        if(!day)return<div key={i}/>;
        const iso=`${yr}-${String(mo+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
        const tripDay=dayLookup[iso];const isT=new Date(iso+"T00:00:00").getTime()===today.getTime();
        const isTripDay=!!tripDay;const actCount=tripDay?tripDay.activities.length:0;
        const[bg,fg]=tripDay?getCityColor(tripDay.city):["transparent","#17150F"];const isSelected=selDate===iso;
        return(<div key={i} onClick={()=>setSelDate(iso===selDate?null:iso)} style={{
          textAlign:"center",padding:"8px 2px",borderRadius:12,cursor:isTripDay?"pointer":"default",
          background:isSelected?"#17150F":isTripDay?bg:"transparent",color:isSelected?"#fff":isTripDay?fg:"#9A958D",
          border:isT?"2px solid #C84B31":"2px solid transparent",position:"relative",transition:"all .15s",
        }}><div style={{fontSize:14,fontWeight:isTripDay?700:400}}>{day}</div>
          {actCount>0&&<div style={{display:"flex",justifyContent:"center",gap:2,marginTop:3}}>{Array.from({length:Math.min(actCount,4)}).map((_,j)=><div key={j} style={{width:4,height:4,borderRadius:2,background:isSelected?"rgba(255,255,255,.6)":fg}}/>)}</div>}
        </div>);
      })}
    </div>
    <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:16}}>
      {[...new Set(data.itinerary.map(d=>d.city).filter(c=>c&&c!=="TBD"))].map(c=>{const[bg2,fg2]=getCityColor(c);return<div key={c} style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:"#605C55"}}><div style={{width:10,height:10,borderRadius:3,background:bg2,border:`1px solid ${fg2}33`}}/>{c}</div>})}
      <div style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:"#605C55"}}><div style={{width:10,height:10,borderRadius:5,border:"2px solid #C84B31"}}/> Today</div>
    </div>
    {selDate&&<div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
      {selDay?(<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div><div style={{fontFamily:"'Fraunces',serif",fontSize:17,fontWeight:700}}>Day {selDay.day} — {selDay.date}</div><div style={{display:"flex",alignItems:"center",gap:4,fontSize:12.5,color:"#9A958D",marginTop:2}}><Chip city={selDay.city}/></div></div>
        </div>
        {selDay.activities.length>0?selDay.activities.sort((a,b)=>(a.time||"").localeCompare(b.time||"")).map(a=>(
          <div key={a.id} onClick={()=>setEditAct({...a,dayIdx:selDay.idx})} style={{display:"flex",gap:10,padding:"10px 0",borderTop:"1px solid #ECEAE5",cursor:"pointer",alignItems:"center"}}>
            <div style={{fontSize:11.5,fontWeight:600,color:"#9A958D",minWidth:52}}>{a.time?fmtTime2(a.time):"—"}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13.5}}>{a.text}</div>
              {a.location&&<div style={{fontSize:12,color:"#C84B31",marginTop:2}}>📍 {a.location}</div>}
              {a.comments&&a.comments.length>0&&<div style={{fontSize:11,color:"#9A958D",marginTop:2}}>💬 {a.comments.length} comment{a.comments.length>1?"s":""}</div>}
            </div>
            <div style={{color:"#9A958D",flexShrink:0}}>{ic.edit}</div>
          </div>
        )):<div style={{fontSize:13,color:"#9A958D"}}>No plans yet for this day.</div>}
      </>):(<div style={{textAlign:"center",color:"#9A958D",fontSize:13.5,padding:8}}>
        {new Date(selDate+"T00:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})} — not a trip day
      </div>)}
    </div>}
    <Modal open={!!editAct} onClose={()=>setEditAct(null)} title="Edit Activity">
      {editAct&&<><Input label="Activity" value={editAct.text} onChange={e=>setEditAct({...editAct,text:e.target.value})}/>
      <Input label="Location" placeholder="e.g. Senso-ji Temple" value={editAct.location||""} onChange={e=>setEditAct({...editAct,location:e.target.value})}/>
      <Input label="Time" type="time" value={editAct.time||""} onChange={e=>setEditAct({...editAct,time:e.target.value})}/>
      <div style={{display:"flex",gap:8,marginTop:4}}>
        <Btn primary full onClick={doEdit}>Save Changes</Btn>
        <Btn danger onClick={()=>{doRm(editAct.dayIdx,editAct.id);setEditAct(null)}}>{ic.trash}</Btn>
      </div></>}
    </Modal>
  </div>);
}

function TransportTab(){
  const tips=[{t:"🚄 Shinkansen",d:"Tokyo → Osaka ~2.5hrs on Nozomi. Reserve seats in advance."},{t:"🚇 IC Cards (Suica/ICOCA)",d:"Get Suica at airport or JR station. Works on trains, buses, konbini."},{t:"📱 Google Maps",d:"Best transit nav for Japan. Download offline maps as backup."},{t:"🚕 Taxis",d:"Clean, safe, expensive. Doors open automatically!"},{t:"🚶 Walking",d:"Expect 15,000–25,000 steps/day. Comfy shoes are essential."}];
  return(<div style={{padding:"12px 20px"}}><div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700,marginBottom:16}}>Getting Around</div>{tips.map((tip,i)=>(<div key={i} style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:16,marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}><div style={{fontWeight:600,fontSize:14,marginBottom:5}}>{tip.t}</div><p style={{fontSize:13,color:"#605C55",lineHeight:1.6}}>{tip.d}</p></div>))}</div>);
}

// ── WEATHER ──
function WeatherTab(){return(<div style={{padding:"12px 20px"}}><div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700,marginBottom:16}}>Weather</div><div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}><div style={{fontSize:15,fontWeight:600,marginBottom:8}}>March in Japan</div><p style={{fontSize:13.5,color:"#605C55",lineHeight:1.65,marginBottom:18}}>Late winter/early spring. 40–55°F (5–13°C). Layers recommended!</p><div style={{display:"flex",flexDirection:"column",gap:10}}><a href="https://weather.com/weather/tenday/l/Tokyo+Japan" target="_blank" rel="noopener" style={{fontSize:14,color:"#C84B31",textDecoration:"none",fontWeight:500}}>🗼 Tokyo Forecast →</a><a href="https://weather.com/weather/tenday/l/Osaka+Japan" target="_blank" rel="noopener" style={{fontSize:14,color:"#C84B31",textDecoration:"none",fontWeight:500}}>⛩️ Osaka Forecast →</a></div></div></div>)}

// ── SETTINGS (with trip editing) ──
function SettingsTab({data,save}){
  const[em,setEm]=useState(null);const[mn,setMn]=useState("");
  const[showTrip,setShowTrip]=useState(false);
  const[showCities,setShowCities]=useState(false);
  const[showAddMember,setShowAddMember]=useState(false);
  const[newMember,setNewMember]=useState("");
  const[tripEdit,setTripEdit]=useState({name:data.tripName||"",start:data.startDate||"",end:data.endDate||""});
  const[newCity,setNewCity]=useState("");

  const startEdit=i=>{setEm(i);setMn(data.members[i])};
  const doSave=()=>{if(!mn.trim())return;const old=data.members[em];const nw=mn.trim();const mems=[...data.members];mems[em]=nw;const exps=data.expenses.map(e=>({...e,paidBy:e.paidBy===old?nw:e.paidBy,splitBetween:e.splitBetween.map(m=>m===old?nw:m)}));save({...data,members:mems,expenses:exps});setEm(null)};
  const addMember=()=>{if(!newMember.trim())return;save({...data,members:[...data.members,newMember.trim()]});setNewMember("");setShowAddMember(false)};
  const rmMember=i=>{if(data.members.length<=1)return;const name=data.members[i];const mems=data.members.filter((_,j)=>j!==i);const exps=data.expenses.map(e=>({...e,splitBetween:e.splitBetween.filter(m=>m!==name)})).filter(e=>e.splitBetween.length>0);save({...data,members:mems,expenses:exps})};

  const saveTripDates=()=>{
    if(!tripEdit.start||!tripEdit.end)return;
    const oldDays=data.itinerary;
    const newDays=makeDays(tripEdit.start,tripEdit.end,{});
    // Preserve activities for matching day indices
    const merged=newDays.map((nd,i)=>{
      const old=oldDays[i];
      return {...nd, city:old?old.city:((data.cities||DEFAULT_CITIES)[0]||"TBD"), activities:old?old.activities:[]};
    });
    save({...data,tripName:tripEdit.name,startDate:tripEdit.start,endDate:tripEdit.end,itinerary:merged});
    setShowTrip(false);
  };

  const updateDayCity=(dayIdx,city)=>{
    const u=[...data.itinerary];u[dayIdx]={...u[dayIdx],city};save({...data,itinerary:u});
  };

  const addCity=()=>{if(!newCity.trim())return;const cities=[...(data.cities||DEFAULT_CITIES),newCity.trim()];save({...data,cities});setNewCity("")};
  const rmCity=c=>{const cities=(data.cities||DEFAULT_CITIES).filter(x=>x!==c);save({...data,cities})};

  const allCities=data.cities||DEFAULT_CITIES;
  const colors2=["#E4F5EB","#F0EAFF","#FFF0EC","#FFF3E0","#E8F0FE","#FFF8E1"];
  const tc2=["#1A7A52","#7B4FC4","#C84B31","#D4850A","#3D85C6","#C49000"];

  return(<div style={{padding:"12px 20px"}}>
    <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700,marginBottom:16}}>Settings</div>

    {/* Trip Details */}
    <div style={{fontSize:14,fontWeight:600,marginBottom:10,color:"#605C55",textTransform:"uppercase",letterSpacing:.5,fontSize:11.5}}>Trip Details</div>
    <div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:"4px 16px",marginBottom:20,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
      <div onClick={()=>{setTripEdit({name:data.tripName||"",start:data.startDate||"",end:data.endDate||""});setShowTrip(true)}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:"1px solid #ECEAE5",cursor:"pointer"}}>
        <div><div style={{fontSize:14,fontWeight:600}}>Dates & Name</div><div style={{fontSize:12.5,color:"#9A958D"}}>{data.tripName} · {fmtDate(data.startDate)} – {fmtDate(data.endDate)} · {data.itinerary.length} days</div></div>
        <div style={{color:"#9A958D"}}>{ic.chev}</div>
      </div>
      <div onClick={()=>setShowCities(true)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",cursor:"pointer"}}>
        <div><div style={{fontSize:14,fontWeight:600}}>Cities & Day Assignments</div><div style={{fontSize:12.5,color:"#9A958D"}}>{allCities.join(", ")}</div></div>
        <div style={{color:"#9A958D"}}>{ic.chev}</div>
      </div>
    </div>

    {/* Group Members */}
    <div style={{fontSize:11.5,fontWeight:600,marginBottom:10,color:"#605C55",textTransform:"uppercase",letterSpacing:.5}}>Group Members</div>
    <div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:"4px 16px",marginBottom:8,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
      {data.members.map((m,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:"1px solid #ECEAE5"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:18,background:colors2[i%6],display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:tc2[i%6]}}>{m.charAt(0)}</div>
          <div style={{fontSize:14,fontWeight:500}}>{m}</div>
        </div>
        <div style={{display:"flex",gap:6}}><IconBtn onClick={()=>startEdit(i)}>{ic.edit}</IconBtn>{data.members.length>1&&<IconBtn danger onClick={()=>rmMember(i)}>{ic.trash}</IconBtn>}</div>
      </div>))}
    </div>
    <Btn ghost sm full onClick={()=>setShowAddMember(true)} style={{marginBottom:20}}>{ic.plus} Add Member</Btn>

    {/* Danger Zone */}
    <div style={{fontSize:11.5,fontWeight:600,marginBottom:10,color:"#605C55",textTransform:"uppercase",letterSpacing:.5}}>Danger Zone</div>
    <Btn danger full onClick={()=>save(INIT)}>Reset All Data</Btn>
    <p style={{fontSize:12,color:"#9A958D",textAlign:"center",marginTop:8}}>Resets to sample data.</p>

    {/* Edit Trip Modal */}
    <Modal open={showTrip} onClose={()=>setShowTrip(false)} title="Edit Trip Details">
      <Input label="Trip Name" value={tripEdit.name} onChange={e=>setTripEdit({...tripEdit,name:e.target.value})}/>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Input label="Start Date" type="date" value={tripEdit.start} onChange={e=>setTripEdit({...tripEdit,start:e.target.value})}/></div><div style={{flex:1}}><Input label="End Date" type="date" value={tripEdit.end} onChange={e=>setTripEdit({...tripEdit,end:e.target.value})}/></div></div>
      {tripEdit.start&&tripEdit.end&&<p style={{fontSize:13,color:"#605C55",marginBottom:14}}>This will create {Math.max(0,Math.round((new Date(tripEdit.end+"T00:00:00")-new Date(tripEdit.start+"T00:00:00"))/86400000)+1)} days. Existing activities will be preserved for overlapping days.</p>}
      <Btn primary full onClick={saveTripDates}>Save Changes</Btn>
    </Modal>

    {/* Cities & Day Assignment Modal */}
    <Modal open={showCities} onClose={()=>setShowCities(false)} title="Cities & Day Assignments">
      <div style={{fontSize:11.5,fontWeight:600,color:"#605C55",textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Your Cities</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {allCities.map(c=>(<div key={c} style={{display:"flex",alignItems:"center",gap:4}}><Chip city={c}/>{allCities.length>1&&<button onClick={()=>rmCity(c)} style={{background:"none",border:"none",color:"#D44",cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>}</div>))}
        <div style={{display:"flex",gap:4,alignItems:"center"}}><input value={newCity} onChange={e=>setNewCity(e.target.value)} placeholder="Add city..." style={{padding:"4px 10px",border:"1.5px solid #DDD9D2",borderRadius:8,fontSize:13,width:100,fontFamily:"inherit",outline:"none"}} onKeyDown={e=>{if(e.key==="Enter")addCity()}}/><Btn primary sm onClick={addCity} style={{padding:"5px 10px"}}>+</Btn></div>
      </div>
      <div style={{fontSize:11.5,fontWeight:600,color:"#605C55",textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Assign City Per Day</div>
      <div style={{maxHeight:350,overflowY:"auto"}}>
        {data.itinerary.map((day,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #ECEAE5"}}>
          <div style={{fontSize:13}}><span style={{fontWeight:600}}>Day {day.day}</span> <span style={{color:"#9A958D"}}>{day.date}</span></div>
          <select value={day.city} onChange={e=>updateDayCity(i,e.target.value)} style={{padding:"6px 10px",border:"1.5px solid #DDD9D2",borderRadius:8,fontSize:13,fontFamily:"inherit",background:"#fff",outline:"none"}}>
            {allCities.map(c=><option key={c}>{c}</option>)}
            <option value="TBD">TBD</option>
          </select>
        </div>))}
      </div>
      <Btn primary full onClick={()=>setShowCities(false)} style={{marginTop:14}}>Done</Btn>
    </Modal>

    {/* Edit Member Modal */}
    <Modal open={em!==null} onClose={()=>setEm(null)} title="Edit Member Name"><Input label="Name" value={mn} onChange={e=>setMn(e.target.value)}/><Btn primary full onClick={doSave}>Save</Btn></Modal>
    <Modal open={showAddMember} onClose={()=>setShowAddMember(false)} title="Add Member"><Input label="Name" placeholder="e.g. Taylor" value={newMember} onChange={e=>setNewMember(e.target.value)}/><Btn primary full onClick={addMember}>Add Member</Btn></Modal>
  </div>);
}

// ── MORE MENU ──
const moreItems=[
  {id:"budget",label:"Budget",desc:"Expenses & splitting",bg:"#E8F0FE",ic2:"#3D85C6",icon:<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="16" cy="14" r="1" fill="currentColor"/></svg>},
  {id:"hotels",label:"Hotels",desc:"Accommodation details",bg:"#E4F5EB",ic2:"#1A7A52",icon:<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21V7a2 2 0 012-2h14a2 2 0 012 2v14"/><path d="M9 21V13h6v8M3 21h18"/></svg>},
  {id:"flights",label:"Flights",desc:"Flight information",bg:"#E8F0FE",ic2:"#3D85C6",icon:<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>},
  {id:"activities",label:"Activities",desc:"Things to do",bg:"#FFF3E0",ic2:"#D4850A",icon:<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>},
  {id:"photos",label:"Photos",desc:"Shared albums & memories",bg:"#FFF0EC",ic2:"#C84B31",icon:<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>},
  {id:"transport",label:"Transport",desc:"Getting around",bg:"#F0EAFF",ic2:"#7B4FC4",icon:<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16M12 3v8"/><circle cx="8" cy="15" r="1" fill="currentColor"/><circle cx="16" cy="15" r="1" fill="currentColor"/><path d="M8 19l-2 3M16 19l2 3"/></svg>},
  {id:"weather",label:"Weather",desc:"Forecasts & tips",bg:"#FFF8E1",ic2:"#C49000",icon:<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>},
  {id:"settings",label:"Settings",desc:"Trip details, members, data",bg:"#EDEBE6",ic2:"#605C55",icon:<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>},
];

const navSvg={
  days:<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" strokeWidth="2"/></svg>,
  budget:<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="16" cy="14" r="1" fill="currentColor"/></svg>,
  food:<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>,
  more:<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" opacity=".12" stroke="currentColor"/></svg>,
};

// ══════════════════════════════
export default function App(){
  const[data,setData]=useState(INIT);
  const[tab,setTab]=useState("itinerary");
  const[sub,setSub]=useState(null);
  const[loaded,setLoaded]=useState(false);

  const loadedRef=useRef(false);
  useEffect(()=>{const unsub=subscribeToData(val=>{if(val){const safe={...val,expenses:val.expenses||[],restaurants:val.restaurants||[],quickEats:val.quickEats||[],activities:val.activities||[],hotels:val.hotels||[],flights:val.flights||[],members:val.members||["Member 1"],cities:val.cities||["Tokyo","Osaka"],itinerary:(val.itinerary||[]).map(d=>({...d,activities:d.activities||[]}))};setData(safe);loadedRef.current=true;setLoaded(true)}});const t=setTimeout(()=>{if(!loadedRef.current){saveData(INIT);setData(INIT);loadedRef.current=true;setLoaded(true)}},4000);return()=>{unsub();clearTimeout(t)}},[]);

  const save=nd=>{const cleaned={...nd,expenses:nd.expenses||[],restaurants:nd.restaurants||[],quickEats:nd.quickEats||[],activities:nd.activities||[],hotels:nd.hotels||[],flights:nd.flights||[],itinerary:(nd.itinerary||[]).map(d=>({...d,activities:d.activities||[]}))};setData(cleaned);saveData(cleaned)};
  const active=sub||tab;

  // Dynamic header info
  const tripName=data.tripName||"Japan '26";
  const uniqueCities=[...new Set((data.itinerary||[]).map(d=>d.city).filter(c=>c&&c!=="TBD"))];
  const headerSub=`${fmtDate(data.startDate)} – ${fmtDate(data.endDate)} · ${uniqueCities.join(" & ")} · ${data.members.length} travelers`;

  const render=()=>{
    switch(active){
      case"itinerary":return<ItineraryTab data={data} save={save}/>;
      case"calendar":return<CalendarTab data={data} save={save} setTab={setTab} setSub={setSub}/>;
      case"budget":return<BudgetTab data={data} save={save}/>;
      case"food":return<FoodTab data={data} save={save}/>;
      case"hotels":return<HotelsTab data={data} save={save}/>;
      case"flights":return<FlightsTab data={data} save={save}/>;
      case"activities":return<ActivitiesTab data={data} save={save}/>;
      case"photos":return<PhotosTab data={data} save={save}/>;
      case"transport":return<TransportTab/>;
      case"weather":return<WeatherTab/>;
      case"ai":return<AITab data={data} save={save}/>;
      case"settings":return<SettingsTab data={data} save={save}/>;
      case"more":return(<div style={{padding:"12px 20px"}}><div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700,marginBottom:16}}>More</div>{moreItems.map(m=>(<div key={m.id} onClick={()=>setSub(m.id)} style={{display:"flex",alignItems:"center",gap:14,cursor:"pointer",padding:"14px 16px",background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}><div style={{width:42,height:42,borderRadius:13,background:m.bg,display:"flex",alignItems:"center",justifyContent:"center",color:m.ic2,flexShrink:0}}>{m.icon}</div><div style={{flex:1}}><div style={{fontSize:14.5,fontWeight:600}}>{m.label}</div><div style={{fontSize:12.5,color:"#9A958D"}}>{m.desc}</div></div><div style={{color:"#9A958D"}}>{ic.chev}</div></div>))}</div>);
      default:return null;
    }
  };

  const navItems=[{id:"itinerary",label:"Days",icon:navSvg.days},{id:"calendar",label:"Calendar",icon:<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" strokeWidth="2"/></svg>},{id:"ai",label:"AI",icon:<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>},{id:"food",label:"Food",icon:navSvg.food},{id:"more",label:"More",icon:navSvg.more}];

  return(<>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap');*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}body,html{font-family:'DM Sans',-apple-system,sans-serif;background:#F5F4F0;color:#17150F;font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased;overflow-x:hidden}`}</style>
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",position:"relative",paddingBottom:90}}>
      <div style={{padding:"14px 20px 12px",position:"sticky",top:0,background:"rgba(245,244,240,.88)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",zIndex:100,borderBottom:"1px solid rgba(221,217,210,.5)"}}>
        {sub?<button onClick={()=>setSub(null)} style={{display:"flex",alignItems:"center",gap:2,background:"none",border:"none",color:"#C84B31",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{ic.back} Back</button>
        :<><div style={{fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:700,letterSpacing:-.4}}>{tripName}</div><div style={{fontSize:12.5,color:"#9A958D",marginTop:1}}>{headerSub}</div></>}
      </div>
      {loaded?render():<div style={{textAlign:"center",padding:60,color:"#9A958D"}}>Loading trip data...</div>}
      <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",maxWidth:430,width:"100%",background:"rgba(255,255,255,.96)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",borderTop:"1px solid rgba(221,217,210,.35)",display:"flex",justifyContent:"space-around",padding:"6px 12px calc(8px + env(safe-area-inset-bottom))",zIndex:100}}>
        {navItems.map(n=>{const isA=(tab===n.id&&!sub)||(sub&&n.id==="more");return(<button key={n.id} onClick={()=>{setTab(n.id);setSub(null)}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",padding:"8px 14px",cursor:"pointer",color:isA?"#C84B31":"#9A958D",fontSize:10.5,fontWeight:500,fontFamily:"inherit",borderRadius:12,position:"relative"}}>{isA&&<div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:20,height:2.5,background:"#C84B31",borderRadius:"0 0 4px 4px"}}/>}{n.icon}{n.label}</button>)})}
      </nav>
    </div>
  </>);
}
