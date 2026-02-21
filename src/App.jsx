import { useState, useEffect, useRef } from "react";
import { subscribeToData, saveData } from "./firebase.js";

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
    {id:"f1",label:"Departure",airline:"ANA",flightNo:"NH 7",from:"SFO",to:"NRT",date:"2026-03-07",time:"11:15 AM",conf:"ANA-8K2M4X"},
    {id:"f2",label:"Return",airline:"ANA",flightNo:"NH 178",from:"KIX",to:"SFO",date:"2026-03-18",time:"2:30 PM",conf:"ANA-8K2M4X"},
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

const ic={
  plus:<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  trash:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  edit:<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  chev:<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  back:<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  pin:<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
};

// ── ITINERARY ──
function ItineraryTab({data,save}){
  const[exp,setExp]=useState(0);const[showAdd,setShowAdd]=useState(false);const[addDay,setAddDay]=useState(null);const[na,setNa]=useState({time:"",text:""});
  const doAdd=()=>{if(!na.text.trim())return;const u=[...data.itinerary];u[addDay]={...u[addDay],activities:[...u[addDay].activities,{...na,id:Date.now()+""}]};save({...data,itinerary:u});setNa({time:"",text:""});setShowAdd(false)};
  const doRm=(di,aid)=>{const u=[...data.itinerary];u[di]={...u[di],activities:u[di].activities.filter(a=>a.id!==aid)};save({...data,itinerary:u})};
  const uniqueCities=[...new Set(data.itinerary.map(d=>d.city).filter(c=>c&&c!=="TBD"))];

  return(<div style={{padding:"12px 20px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700}}>Itinerary</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{uniqueCities.map(c=><Chip key={c} city={c}/>)}</div>
    </div>
    {data.itinerary.map((day,i)=>{
      const open=exp===i;const acts=[...day.activities].sort((a,b)=>(a.time||"").localeCompare(b.time||""));const[bg,fg]=getCityColor(day.city);
      return(<div key={i} style={{background:"#fff",borderRadius:16,border:"1px solid #DDD9D2",boxShadow:"0 1px 3px rgba(0,0,0,.04)",marginBottom:12,overflow:"hidden"}}>
        <div onClick={()=>setExp(open?-1:i)} style={{padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:16,fontFamily:"'Fraunces',serif",background:bg,color:fg}}>{day.day}</div>
            <div><div style={{fontSize:14.5,fontWeight:600}}>{day.date}</div><div style={{fontSize:12,color:"#9A958D",display:"flex",alignItems:"center",gap:4}}>{ic.pin} {day.city}{acts.length>0&&<span style={{marginLeft:4}}>· {acts.length} plans</span>}</div></div>
          </div>
          <div style={{color:"#9A958D",transform:open?"rotate(90deg)":"none",transition:"transform .2s"}}>{ic.chev}</div>
        </div>
        {open&&<div style={{padding:"0 16px 14px"}}>
          {acts.length>0?(<div style={{position:"relative",paddingLeft:20}}>
            <div style={{position:"absolute",left:4,top:6,bottom:6,width:1.5,background:"#DDD9D2"}}/>
            {acts.map((a,j)=>(<div key={a.id} style={{position:"relative",padding:"6px 0",display:"flex",gap:10,alignItems:"flex-start"}}>
              <div style={{position:"absolute",left:-20,top:11,width:9,height:9,borderRadius:"50%",background:j===0?"#C84B31":"#E0A090",border:"2px solid #fff",zIndex:1}}/>
              <div style={{fontSize:11.5,fontWeight:600,color:"#9A958D",minWidth:52,paddingTop:1}}>{a.time?fmtTime(a.time):"—"}</div>
              <div style={{flex:1,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontSize:13.5,lineHeight:1.4}}>{a.text}</div><IconBtn danger onClick={e=>{e.stopPropagation();doRm(i,a.id)}} style={{width:28,height:28,marginLeft:8}}>{ic.trash}</IconBtn></div>
            </div>))}
          </div>):<div style={{fontSize:13,color:"#9A958D",padding:"8px 0"}}>No plans yet.</div>}
          <Btn ghost sm full onClick={()=>{setAddDay(i);setShowAdd(true)}} style={{marginTop:10}}>{ic.plus} Add Activity</Btn>
        </div>}
      </div>);
    })}
    <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Add Activity">
      <Input label="Time (optional)" type="time" value={na.time} onChange={e=>setNa({...na,time:e.target.value})}/>
      <Input label="Activity" placeholder="e.g. Visit Meiji Shrine" value={na.text} onChange={e=>setNa({...na,text:e.target.value})}/>
      <Btn primary full onClick={doAdd}>Add Activity</Btn>
    </Modal>
  </div>);
}

// ── BUDGET ──
function BudgetTab({data,save}){
  const[showAdd,setShowAdd]=useState(false);const[tab,setTab]=useState("overview");
  const[ne,setNe]=useState({description:"",amount:"",paidBy:data.members[0],splitBetween:[...data.members],category:"Food"});
  const doAdd=()=>{if(!ne.description||!ne.amount)return;save({...data,expenses:[...data.expenses,{...ne,id:Date.now()+"",amount:parseFloat(ne.amount)}]});setNe({description:"",amount:"",paidBy:data.members[0],splitBetween:[...data.members],category:"Food"});setShowAdd(false)};
  const doRm=id=>save({...data,expenses:data.expenses.filter(e=>e.id!==id)});
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
      <div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:"4px 16px",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>{[...data.expenses].reverse().map(e=>(<div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 0",borderBottom:"1px solid #ECEAE5"}}><div><div style={{fontSize:14,fontWeight:500}}>{e.description}</div><div style={{fontSize:12,color:"#9A958D"}}><span style={{width:6,height:6,borderRadius:3,background:catColor[e.category],display:"inline-block",marginRight:4}}/>{e.category} · {e.paidBy}</div></div><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:600}}>${e.amount.toFixed(2)}</div><div style={{fontSize:11,color:"#9A958D"}}>¥{(e.amount*RATE).toLocaleString("en",{maximumFractionDigits:0})}</div></div><IconBtn danger onClick={()=>doRm(e.id)}>{ic.trash}</IconBtn></div></div>))}</div></>}
    {tab==="person"&&<div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:"4px 16px",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>{data.members.map(m=>(<div key={m} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:"1px solid #ECEAE5"}}><div><div style={{fontSize:14,fontWeight:600}}>{m}</div><div style={{fontSize:12,color:"#9A958D"}}>Paid ${data.expenses.filter(e=>e.paidBy===m).reduce((s,e)=>s+e.amount,0).toFixed(2)}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:600}}>${(pps[m]||0).toFixed(2)}</div><div style={{fontSize:12,fontWeight:500,color:bal[m]>.01?"#1A7A52":bal[m]<-.01?"#D44":"#9A958D"}}>{bal[m]>.01?`Owed $${bal[m].toFixed(2)}`:bal[m]<-.01?`Owes $${(-bal[m]).toFixed(2)}`:"Settled ✓"}</div></div></div>))}</div>}
    {tab==="settle"&&<div>{sett.length===0?<div style={{textAlign:"center",padding:32,color:"#9A958D"}}>All settled up!</div>:sett.map((s,i)=>(<div key={i} style={{background:"#FFF0EC",border:"1.5px solid #F0C4B6",borderRadius:16,padding:16,marginBottom:10}}><div style={{display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:500}}>{s.from}<span style={{color:"#C84B31",fontWeight:700,margin:"0 8px"}}>→</span>{s.to}</div><div style={{textAlign:"center",fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:700,marginTop:4,color:"#C84B31"}}>${s.amount.toFixed(2)}</div></div>))}</div>}
    <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Add Expense">
      <Input label="Description" placeholder="e.g. Ramen dinner" value={ne.description} onChange={e=>setNe({...ne,description:e.target.value})}/>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Input label="Amount (USD)" type="number" placeholder="0.00" value={ne.amount} onChange={e=>setNe({...ne,amount:e.target.value})}/></div><div style={{flex:1}}><Select label="Category" value={ne.category} onChange={e=>setNe({...ne,category:e.target.value})}>{cats.map(c=><option key={c}>{c}</option>)}</Select></div></div>
      <Select label="Paid By" value={ne.paidBy} onChange={e=>setNe({...ne,paidBy:e.target.value})}>{data.members.map(m=><option key={m}>{m}</option>)}</Select>
      <div style={{marginBottom:14}}><label style={{display:"block",fontSize:11.5,fontWeight:600,color:"#605C55",marginBottom:5,textTransform:"uppercase",letterSpacing:.6}}>Split Between</label><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{data.members.map(m=><Btn key={m} primary={ne.splitBetween.includes(m)} ghost={!ne.splitBetween.includes(m)} sm onClick={()=>toggleSplit(m)}>{m}</Btn>)}</div></div>
      <Btn primary full onClick={doAdd}>Add Expense</Btn>
    </Modal>
  </div>);
}

// ── FOOD ──
function FoodTab({data,save}){
  const[tab,setTab]=useState("restaurants");const[showAdd,setShowAdd]=useState(false);
  const allCities=data.cities||DEFAULT_CITIES;
  const[ni,setNi]=useState({name:"",location:"",cuisine:"",notes:"",city:allCities[0]||"Tokyo"});
  const doAdd=()=>{if(!ni.name.trim())return;const item={...ni,id:Date.now()+""};if(tab==="restaurants")save({...data,restaurants:[...data.restaurants,item]});else save({...data,quickEats:[...data.quickEats,item]});setNi({name:"",location:"",cuisine:"",notes:"",city:allCities[0]||"Tokyo"});setShowAdd(false)};
  const doRm=id=>{if(tab==="restaurants")save({...data,restaurants:data.restaurants.filter(r=>r.id!==id)});else save({...data,quickEats:data.quickEats.filter(r=>r.id!==id)})};
  const items=tab==="restaurants"?data.restaurants:data.quickEats;
  const Tab2=({id,count,children})=><button onClick={()=>setTab(id)} style={{padding:"7px 14px",borderRadius:20,fontSize:13,fontWeight:500,border:"none",cursor:"pointer",fontFamily:"inherit",background:tab===id?"#17150F":"#EDEBE6",color:tab===id?"#fff":"#605C55"}}>{children}{count>0&&<span style={{marginLeft:4,fontSize:11,fontWeight:600,padding:"2px 6px",borderRadius:10,background:tab===id?"rgba(255,255,255,.2)":"#DDD9D2"}}>{count}</span>}</button>;

  return(<div style={{padding:"12px 20px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700}}>Food & Dining</div><Btn primary sm onClick={()=>setShowAdd(true)}>{ic.plus} Add</Btn></div>
    <div style={{display:"flex",gap:6,marginBottom:14}}><Tab2 id="restaurants" count={data.restaurants.length}>Restaurants</Tab2><Tab2 id="quickeats" count={data.quickEats.length}>Quick Eats</Tab2></div>
    <div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:"4px 16px",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>{items.length===0?<div style={{textAlign:"center",padding:32,color:"#9A958D"}}>No items saved.</div>:items.map(item=>(<div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:"1px solid #ECEAE5"}}><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><span style={{fontSize:14,fontWeight:600}}>{item.name}</span><Chip city={item.city}/></div><div style={{fontSize:12.5,color:"#9A958D"}}>{[item.cuisine,item.location].filter(Boolean).join(" · ")}</div>{item.notes&&<div style={{fontSize:12.5,color:"#605C55",marginTop:3}}>{item.notes}</div>}</div><IconBtn danger onClick={()=>doRm(item.id)} style={{marginLeft:8}}>{ic.trash}</IconBtn></div>))}</div>
    <Modal open={showAdd} onClose={()=>setShowAdd(false)} title={tab==="restaurants"?"Add Restaurant":"Add Quick Eat"}>
      <Input label="Name" placeholder="e.g. Ichiran Ramen" value={ni.name} onChange={e=>setNi({...ni,name:e.target.value})}/>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Input label="Cuisine" placeholder="e.g. Ramen" value={ni.cuisine} onChange={e=>setNi({...ni,cuisine:e.target.value})}/></div><div style={{flex:1}}><Select label="City" value={ni.city} onChange={e=>setNi({...ni,city:e.target.value})}>{allCities.map(c=><option key={c}>{c}</option>)}</Select></div></div>
      <Input label="Location" placeholder="e.g. Shibuya" value={ni.location} onChange={e=>setNi({...ni,location:e.target.value})}/>
      <Input label="Notes" placeholder="Reservation needed?" value={ni.notes} onChange={e=>setNi({...ni,notes:e.target.value})}/>
      <Btn primary full onClick={doAdd}>Save</Btn>
    </Modal>
  </div>);
}

// ── HOTELS ──
function HotelsTab({data,save}){
  const[showAdd,setShowAdd]=useState(false);
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
  const[showAdd,setShowAdd]=useState(false);
  const[nf,setNf]=useState({label:"",airline:"",flightNo:"",from:"",to:"",date:"",time:"",conf:""});
  const upd=(id,f,v)=>save({...data,flights:data.flights.map(fl=>fl.id===id?{...fl,[f]:v}:fl)});
  const doAdd=()=>{if(!nf.label.trim())return;save({...data,flights:[...data.flights,{...nf,id:Date.now()+""}]});setNf({label:"",airline:"",flightNo:"",from:"",to:"",date:"",time:"",conf:""});setShowAdd(false)};
  const doRm=id=>save({...data,flights:data.flights.filter(f=>f.id!==id)});

  return(<div style={{padding:"12px 20px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700}}>Flights</div><Btn primary sm onClick={()=>setShowAdd(true)}>{ic.plus} Add</Btn></div>
    {data.flights.map(f=>(<div key={f.id} style={{background:"#fff",borderRadius:16,border:"1px solid #DDD9D2",padding:16,marginBottom:12,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div style={{fontSize:12,fontWeight:700,color:"#C84B31",textTransform:"uppercase",letterSpacing:.8}}>{f.label} — {fmtDate(f.date)}</div><IconBtn danger onClick={()=>doRm(f.id)} style={{width:28,height:28}}>{ic.trash}</IconBtn></div>
      <Input label="Label" placeholder="e.g. Departure" value={f.label} onChange={e=>upd(f.id,"label",e.target.value)}/>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Input label="Airline" value={f.airline} onChange={e=>upd(f.id,"airline",e.target.value)}/></div><div style={{flex:1}}><Input label="Flight #" value={f.flightNo} onChange={e=>upd(f.id,"flightNo",e.target.value)}/></div></div>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Input label="From" value={f.from} onChange={e=>upd(f.id,"from",e.target.value)}/></div><div style={{flex:1}}><Input label="To" value={f.to} onChange={e=>upd(f.id,"to",e.target.value)}/></div></div>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Input label="Date" type="date" value={f.date} onChange={e=>upd(f.id,"date",e.target.value)}/></div><div style={{flex:1}}><Input label="Time" value={f.time} onChange={e=>upd(f.id,"time",e.target.value)}/></div></div>
      <Input label="Confirmation" value={f.conf} onChange={e=>upd(f.id,"conf",e.target.value)}/>
    </div>))}
    <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Add Flight">
      <Input label="Label" placeholder="e.g. Layover, Return" value={nf.label} onChange={e=>setNf({...nf,label:e.target.value})}/>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Input label="Airline" value={nf.airline} onChange={e=>setNf({...nf,airline:e.target.value})}/></div><div style={{flex:1}}><Input label="Flight #" value={nf.flightNo} onChange={e=>setNf({...nf,flightNo:e.target.value})}/></div></div>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Input label="From" value={nf.from} onChange={e=>setNf({...nf,from:e.target.value})}/></div><div style={{flex:1}}><Input label="To" value={nf.to} onChange={e=>setNf({...nf,to:e.target.value})}/></div></div>
      <Input label="Date" type="date" value={nf.date} onChange={e=>setNf({...nf,date:e.target.value})}/>
      <Btn primary full onClick={doAdd}>Add Flight</Btn>
    </Modal>
  </div>);
}

// ── ACTIVITIES ──
function ActivitiesTab({data,save}){
  const[showAdd,setShowAdd]=useState(false);const allCities=data.cities||DEFAULT_CITIES;
  const[na,setNa]=useState({name:"",city:allCities[0]||"Tokyo",notes:"",cost:""});
  const doAdd=()=>{if(!na.name.trim())return;save({...data,activities:[...data.activities,{...na,id:Date.now()+""}]});setNa({name:"",city:allCities[0]||"Tokyo",notes:"",cost:""});setShowAdd(false)};
  const doRm=id=>save({...data,activities:data.activities.filter(a=>a.id!==id)});
  return(<div style={{padding:"12px 20px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700}}>Activities</div><Btn primary sm onClick={()=>setShowAdd(true)}>{ic.plus} Add</Btn></div>
    <div style={{background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,padding:"4px 16px",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>{data.activities.length===0?<div style={{textAlign:"center",padding:32,color:"#9A958D"}}>No activities.</div>:data.activities.map(a=>(<div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:"1px solid #ECEAE5"}}><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><span style={{fontSize:14,fontWeight:600}}>{a.name}</span><Chip city={a.city}/></div><div style={{fontSize:12.5,color:"#9A958D"}}>{a.cost&&a.cost!=="0"?`~$${a.cost}/person`:"Free"}</div>{a.notes&&<div style={{fontSize:12.5,color:"#605C55",marginTop:3}}>{a.notes}</div>}</div><IconBtn danger onClick={()=>doRm(a.id)} style={{marginLeft:8}}>{ic.trash}</IconBtn></div>))}</div>
    <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Add Activity">
      <Input label="Activity Name" placeholder="e.g. teamLab Borderless" value={na.name} onChange={e=>setNa({...na,name:e.target.value})}/>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Select label="City" value={na.city} onChange={e=>setNa({...na,city:e.target.value})}>{allCities.map(c=><option key={c}>{c}</option>)}</Select></div><div style={{flex:1}}><Input label="Est. Cost (USD)" type="number" placeholder="—" value={na.cost} onChange={e=>setNa({...na,cost:e.target.value})}/></div></div>
      <Input label="Notes" placeholder="Tips, booking info..." value={na.notes} onChange={e=>setNa({...na,notes:e.target.value})}/>
      <Btn primary full onClick={doAdd}>Save</Btn>
    </Modal>
  </div>);
}

// ── TRANSPORT ──
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
  {id:"hotels",label:"Hotels",desc:"Accommodation details",bg:"#E4F5EB",ic2:"#1A7A52",icon:<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21V7a2 2 0 012-2h14a2 2 0 012 2v14"/><path d="M9 21V13h6v8M3 21h18"/></svg>},
  {id:"flights",label:"Flights",desc:"Flight information",bg:"#E8F0FE",ic2:"#3D85C6",icon:<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>},
  {id:"activities",label:"Activities",desc:"Things to do",bg:"#FFF3E0",ic2:"#D4850A",icon:<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>},
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
      case"budget":return<BudgetTab data={data} save={save}/>;
      case"food":return<FoodTab data={data} save={save}/>;
      case"hotels":return<HotelsTab data={data} save={save}/>;
      case"flights":return<FlightsTab data={data} save={save}/>;
      case"activities":return<ActivitiesTab data={data} save={save}/>;
      case"transport":return<TransportTab/>;
      case"weather":return<WeatherTab/>;
      case"settings":return<SettingsTab data={data} save={save}/>;
      case"more":return(<div style={{padding:"12px 20px"}}><div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700,marginBottom:16}}>More</div>{moreItems.map(m=>(<div key={m.id} onClick={()=>setSub(m.id)} style={{display:"flex",alignItems:"center",gap:14,cursor:"pointer",padding:"14px 16px",background:"#fff",border:"1px solid #DDD9D2",borderRadius:16,marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}><div style={{width:42,height:42,borderRadius:13,background:m.bg,display:"flex",alignItems:"center",justifyContent:"center",color:m.ic2,flexShrink:0}}>{m.icon}</div><div style={{flex:1}}><div style={{fontSize:14.5,fontWeight:600}}>{m.label}</div><div style={{fontSize:12.5,color:"#9A958D"}}>{m.desc}</div></div><div style={{color:"#9A958D"}}>{ic.chev}</div></div>))}</div>);
      default:return null;
    }
  };

  const navItems=[{id:"itinerary",label:"Days",icon:navSvg.days},{id:"budget",label:"Budget",icon:navSvg.budget},{id:"food",label:"Food",icon:navSvg.food},{id:"more",label:"More",icon:navSvg.more}];

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
