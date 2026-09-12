import { useState, useEffect, useRef, useCallback } from "react";
import { QUESTION_SETS, DEFAULT_SET_ID, getSet, wordsOf } from "./questionSets.js";
import { SFX, unlock as unlockAudio, isMuted, setMuted as persistMuted } from "./sounds.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDn7u-BWzOLhM_8Ku8KiPH11TeMhQlC1lI",
  authDomain: "ai-word-battle.firebaseapp.com",
  databaseURL: "https://ai-word-battle-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ai-word-battle",
  storageBucket: "ai-word-battle.firebasestorage.app",
  messagingSenderId: "954562084878",
  appId: "1:954562084878:web:2e79dc23b3e8a46938fc5f"
};

const ROOM = "default";
const ROUND_SEC = 60;
const ADV_DELAY = 3000;
// 선생님 비밀번호 (여러 개 허용)
const T_PASSES = ["123123", "911280"];

// ── 점수 규칙 ─────────────────────────────────────────────
// 가장 먼저 정답을 클릭한 1명만 점수를 얻는다.
// 100점에서 시작해 1초에 1점씩 줄고, 최소 40점. 오답은 그 문제에서 잠김.
const MAX_PT = 100, MIN_PT = 40;
const pointsAt = elapsedMs => Math.max(MIN_PT, MAX_PT - Math.floor(elapsedMs / 1000));

// 생존 신호: 이 시간 안에 신호가 없으면 "나감"으로 표시
const HEARTBEAT_MS = 10000;
const ONLINE_MS = 30000;

const BAD_NAME = /[.#$\[\]\/]/;

function place(words, W, H){
  const items=[];const CH=13,PX=13,PY=7,G=9;
  for(const word of words){
    const w=word.length*(CH*0.78)+PX*2,h=CH+PY*2;let p=null;
    for(let i=0;i<500;i++){
      const x=G+Math.random()*(W-w-G*2),y=G+Math.random()*(H-h-G*2);
      if(!items.some(it=>x<it.x+it.w+G&&x+w+G>it.x&&y<it.y+it.h+G&&y+h+G>it.y)){p={x,y,w,h};break;}
    }
    if(p)items.push({word,...p});
  }
  return items;
}

// ── 익명 인증 (REST) ──────────────────────────────────────────────
let _idToken = null;
async function getAuthToken(){
  if(_idToken) return _idToken;
  try{
    const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_CONFIG.apiKey}`,{
      method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({returnSecureToken:true})
    });
    if(!r.ok) return null;
    const d=await r.json();
    _idToken=d.idToken;
    return _idToken;
  }catch{return null;}
}
const FB_BASE = `${FIREBASE_CONFIG.databaseURL}/rooms/${ROOM}.json`;
async function fbUrl(){ const t=await getAuthToken(); return t ? `${FB_BASE}?auth=${t}` : FB_BASE; }
async function fbGet(){
  try{const r=await fetch(await fbUrl());if(!r.ok){if(r.status===401)_idToken=null;return null;}const d=await r.json();return d;}catch{return null;}
}
async function fbPut(data){
  try{const r=await fetch(await fbUrl(),{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});if(r.status===401)_idToken=null;return r.ok;}catch{return false;}
}
async function fbPatch(updates){
  try{const r=await fetch(await fbUrl(),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(updates)});if(r.status===401)_idToken=null;return r.ok;}catch{return false;}
}

const freshState=()=>({words:[],questions:[],currentIdx:-1,phase:"waiting",players:{},clicks:{},locked:{},winner:null,round:0,startTime:null,autoAdvAt:null,teacherName:null,setId:DEFAULT_SET_ID,lastBonus:null,winSec:null});

export default function App(){
  const [page,setPage]=useState("login");
  const [nameIn,setNameIn]=useState("");
  const [passIn,setPassIn]=useState("");
  const [showPassInput,setShowPassInput]=useState(false);
  const [myName,setMyName]=useState("");
  const [isTeacher,setIsTeacher]=useState(false);
  const [gs,setGs]=useState(null);
  const [items,setItems]=useState([]);
  const [feedback,setFeedback]=useState(null);
  const [numQ,setNumQ]=useState(10);
  const [setId,setSetId]=useState(DEFAULT_SET_ID);
  const [err,setErr]=useState("");
  const [timeLeft,setTimeLeft]=useState(ROUND_SEC);
  const [advCnt,setAdvCnt]=useState(null);
  const [teacherTaken,setTeacherTaken]=useState(false);
  const [connStatus,setConnStatus]=useState("connecting");
  const [muted,setMutedState]=useState(isMuted());
  const [showPlayers,setShowPlayers]=useState(false);
  const [now,setNow]=useState(Date.now());

  const checkTeacherUrl=()=>typeof window!=="undefined"&&(new URLSearchParams(window.location.search).get("mode")==="admin"||window.location.hash==="#leethemom");
  const [isTeacherUrl,setIsTeacherUrl]=useState(checkTeacherUrl);
  useEffect(()=>{
    const onUrl=()=>setIsTeacherUrl(checkTeacherUrl());
    window.addEventListener("hashchange",onUrl);
    window.addEventListener("popstate",onUrl);
    return()=>{window.removeEventListener("hashchange",onUrl);window.removeEventListener("popstate",onUrl);};
  },[]);

  const toggleMute=()=>{const v=!muted;persistMuted(v);setMutedState(v);if(!v){unlockAudio();SFX.click();}};

  const copyStudentUrl=async()=>{
    const url=window.location.origin+window.location.pathname;
    try{
      if(navigator.clipboard&&window.isSecureContext){
        await navigator.clipboard.writeText(url);
      }else{
        const ta=document.createElement("textarea");
        ta.value=url;ta.style.position="fixed";ta.style.left="-9999px";
        document.body.appendChild(ta);ta.focus();ta.select();
        document.execCommand("copy");document.body.removeChild(ta);
      }
      alert("학생 입장 링크가 복사되었습니다!\n\n"+url+"\n\n패들렛이나 채팅에 붙여넣어 학생들에게 공유하세요.");
    }catch(err){
      prompt("아래 링크를 직접 복사하세요:",url);
    }
  };

  const areaRef=useRef(null);
  const myRef=useRef("");
  const pollRef=useRef(null);
  const hbRef=useRef(null);
  const timerRef=useRef(null);
  const advRef=useRef(null);
  const numQRef=useRef(10);
  const setIdRef=useRef(DEFAULT_SET_ID);
  const prevRef=useRef({phase:null,idx:null,round:null,players:null,winner:null});
  useEffect(()=>{numQRef.current=numQ;},[numQ]);
  useEffect(()=>{setIdRef.current=setId;},[setId]);

  useEffect(()=>{
    (async()=>{
      const s=await fbGet();
      if(s){setConnStatus("connected");if(s.teacherName)setTeacherTaken(true);}
      else setConnStatus("connected");
    })();
  },[]);

  // 접속 상태 표시용 현재 시각 (5초마다 갱신)
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),5000);return()=>clearInterval(t);},[]);

  const wr=useCallback(async s=>{
    const ok=await fbPut(s);
    if(ok){setGs(s);}
    return ok;
  },[]);

  useEffect(()=>{
    clearInterval(timerRef.current);
    if(!gs?.startTime||gs.phase!=="active"){setTimeLeft(ROUND_SEC);return;}
    const tick=()=>setTimeLeft(Math.max(0,ROUND_SEC-Math.floor((Date.now()-gs.startTime)/1000)));
    tick();timerRef.current=setInterval(tick,400);
    return()=>clearInterval(timerRef.current);
  },[gs?.startTime,gs?.phase]);

  useEffect(()=>{
    clearInterval(advRef.current);setAdvCnt(null);
    if(!gs?.autoAdvAt||gs.phase!=="revealed"||!gs.winner)return;
    const advAt=gs.autoAdvAt;
    const tick=()=>setAdvCnt(Math.max(0,Math.ceil((advAt-Date.now())/1000)));
    tick();advRef.current=setInterval(tick,400);
    return()=>clearInterval(advRef.current);
  },[gs?.autoAdvAt,gs?.winner,gs?.currentIdx,gs?.phase]);

  // ── 효과음 트리거: 게임 상태 변화 감지 ──
  useEffect(()=>{
    if(page!=="game"||!gs)return;
    const p=prevRef.current;
    const me=myRef.current;
    const phase=gs.phase, idx=gs.currentIdx, round=gs.round||0;
    const cnt=Object.keys(gs.players||{}).length;

    if(p.players!==null&&cnt>p.players)SFX.join();

    const newQuestion=phase==="active"&&(p.phase!=="active"||p.idx!==idx||p.round!==round);
    if(newQuestion&&p.phase!==null)SFX.start();

    if(phase==="revealed"&&p.phase!=="revealed"){
      if(gs.winner&&gs.winner!==me)SFX.otherWin();
      if(!gs.winner)SFX.timeout();
    }
    if(phase==="finished"&&p.phase!=="finished"&&p.phase!==null)SFX.finish();

    prevRef.current={phase,idx,round,players:cnt,winner:gs.winner};
  },[gs,page]);

  // 마지막 10초 째깍
  useEffect(()=>{
    if(page!=="game"||gs?.phase!=="active")return;
    if(timeLeft<=0||timeLeft>10)return;
    if(timeLeft<=3)SFX.tickHot();else SFX.tick();
  },[timeLeft,gs?.phase,page]);

  // 단어 배치 (세트가 바뀌면 다시 배치)
  const curSetId=gs?.setId||DEFAULT_SET_ID;
  useEffect(()=>{
    if(page!=="game")return;
    const el=areaRef.current;if(!el)return;
    let raf=null;
    const words=wordsOf(curSetId);
    const update=()=>{
      const{width:W,height:H}=el.getBoundingClientRect();
      if(W>0&&H>0)setItems(place(words,W,H));
    };
    update();
    const onResize=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(update);};
    const ro=new ResizeObserver(onResize);
    ro.observe(el);
    window.addEventListener("resize",onResize);
    return()=>{ro.disconnect();window.removeEventListener("resize",onResize);cancelAnimationFrame(raf);};
  },[page,curSetId]);

  const startSession=useCallback(async(name,teacher)=>{
    unlockAudio();
    myRef.current=name;setMyName(name);setIsTeacher(teacher);
    let s=await fbGet();
    if(!s)s=freshState();
    if(!s.players)s.players={};
    const color=teacher?"#f59e0b":`hsl(${Math.random()*360|0},70%,60%)`;
    s.players[name]=s.players[name]||{score:0,color};
    s.players[name].lastSeen=Date.now();
    if(teacher)s.teacherName=name;
    if(s.setId){setSetId(s.setId);setIdRef.current=s.setId;}
    await wr(s);setPage("game");
    prevRef.current={phase:s.phase,idx:s.currentIdx,round:s.round||0,players:Object.keys(s.players).length,winner:s.winner};
    clearInterval(pollRef.current);
    pollRef.current=setInterval(async()=>{
      const l=await fbGet();
      if(l){setGs(l);setConnStatus("connected");}
      else setConnStatus("error");
    },800);
    // 생존 신호
    clearInterval(hbRef.current);
    const beat=()=>fbPatch({[`players/${name}/lastSeen`]:Date.now()});
    hbRef.current=setInterval(beat,HEARTBEAT_MS);
  },[wr]);

  const joinTeacher=useCallback(async()=>{
    if(!T_PASSES.includes(passIn.trim())){setErr("선생님 비밀번호가 틀렸습니다");return;}
    await startSession("선생님",true);
  },[startSession,passIn]);

  const handleTeacherClick=useCallback(()=>{
    setErr("");unlockAudio();
    if(!showPassInput){setShowPassInput(true);return;}
    joinTeacher();
  },[showPassInput,joinTeacher]);

  const releaseTeacher=useCallback(async()=>{
    if(!window.confirm("선생님 슬롯을 해제할까요?\n다른 사람이 선생님으로 입장할 수 있게 됩니다."))return;
    const cur=await fbGet();
    if(cur){
      const players={...(cur.players||{})};delete players["선생님"];
      await fbPatch({teacherName:null,players});
    }
    setTeacherTaken(false);
  },[]);

  const joinPlayer=useCallback(async()=>{
    const name=nameIn.trim();
    if(!name){setErr("닉네임을 입력해주세요");return;}
    if(name.length>12){setErr("닉네임은 12자 이내로 입력해주세요");return;}
    if(BAD_NAME.test(name)){setErr("닉네임에 . # $ [ ] / 기호는 쓸 수 없습니다");return;}
    if(name==="선생님"){setErr('"선생님"은 사용할 수 없는 닉네임입니다');return;}
    await startSession(name,false);
  },[nameIn,startSession]);

  useEffect(()=>()=>{clearInterval(pollRef.current);clearInterval(hbRef.current);clearInterval(timerRef.current);clearInterval(advRef.current);},[]);

  const pickQuestions=()=>[...getSet(setIdRef.current).questions].sort(()=>Math.random()-0.5).slice(0,numQRef.current);

  const startGame=async()=>{
    SFX.click();
    const cur=await fbGet();if(!cur)return;
    await wr({...cur,setId:setIdRef.current,questions:pickQuestions(),currentIdx:0,phase:"active",clicks:{},locked:{},winner:null,round:(cur.round||0)+1,startTime:Date.now(),autoAdvAt:null,lastBonus:null,winSec:null});
  };
  const doReveal=async()=>{const cur=await fbGet();if(cur)await wr({...cur,phase:"revealed",winner:null,autoAdvAt:null});};
  const manualNext=async()=>{
    const cur=await fbGet();if(!cur)return;
    const next=cur.currentIdx+1;
    if(next>=cur.questions.length){await wr({...cur,phase:"finished",autoAdvAt:null});return;}
    await wr({...cur,currentIdx:next,phase:"active",clicks:{},locked:{},winner:null,startTime:Date.now(),autoAdvAt:null,lastBonus:null,winSec:null});
  };
  const restart=async()=>{
    SFX.click();
    const cur=await fbGet();if(!cur)return;
    const players={};Object.entries(cur.players||{}).forEach(([n,d])=>{players[n]={...d,score:0};});
    await wr({...cur,setId:setIdRef.current,questions:pickQuestions(),currentIdx:0,phase:"active",players,clicks:{},locked:{},winner:null,round:(cur.round||0)+1,startTime:Date.now(),autoAdvAt:null,lastBonus:null,winSec:null});
  };
  const backToLobby=async()=>{
    const cur=await fbGet();if(!cur)return;
    const players={};Object.entries(cur.players||{}).forEach(([n,d])=>{players[n]={...d,score:0};});
    await wr({...cur,questions:[],currentIdx:-1,phase:"waiting",players,clicks:{},locked:{},winner:null,startTime:null,autoAdvAt:null,lastBonus:null,winSec:null});
  };
  const resetAll=async()=>{
    if(!window.confirm("정말 전체 초기화할까요?\n모든 플레이어와 점수가 삭제됩니다.\n선생님도 다시 입장해야 합니다."))return;
    await wr(freshState());
    clearInterval(pollRef.current);clearInterval(hbRef.current);
    setPage("login");setMyName("");setNameIn("");setIsTeacher(false);setTeacherTaken(false);
  };
  const clearOffline=async()=>{
    const cur=await fbGet();if(!cur)return;
    const nowMs=Date.now();
    const gone=Object.entries(cur.players||{}).filter(([n,d])=>n!=="선생님"&&n!==cur.teacherName&&!(d?.lastSeen&&nowMs-d.lastSeen<ONLINE_MS)).map(([n])=>n);
    if(gone.length===0){alert("정리할 사람이 없어요. 모두 접속 중입니다.");return;}
    if(!window.confirm(`접속이 끊긴 ${gone.length}명을 목록에서 제거할까요?
(${gone.slice(0,8).join(", ")}${gone.length>8?" 외":""})`))return;
    const players={...(cur.players||{})};gone.forEach(n=>delete players[n]);
    await wr({...cur,players});
  };
  const kickPlayer=async name=>{
    if(!window.confirm(`"${name}" 님을 목록에서 제거할까요?`))return;
    const cur=await fbGet();if(!cur)return;
    const players={...(cur.players||{})};delete players[name];
    await wr({...cur,players});
  };

  const clickWord=async word=>{
    const cur=await fbGet();
    if(!cur||cur.phase!=="active")return;
    const me=myRef.current;
    if(cur.clicks?.[me]||cur.locked?.[me])return;
    const elapsed=Date.now()-cur.startTime;
    if(elapsed>ROUND_SEC*1000)return;
    const ans=cur.questions?.[cur.currentIdx]?.a;
    const ok=word===ans;
    setFeedback(ok?"✅":"❌");setTimeout(()=>setFeedback(null),ok?ADV_DELAY:1000);
    cur.clicks=cur.clicks||{};cur.clicks[me]=word;
    if(ok){
      SFX.correct();
      const bonus=pointsAt(elapsed);
      const snapIdx=cur.currentIdx;
      cur.winner=me;cur.phase="revealed";cur.autoAdvAt=Date.now()+ADV_DELAY;
      cur.lastBonus=bonus;cur.winSec=Math.round(elapsed/100)/10;
      cur.players=cur.players||{};
      cur.players[me]=cur.players[me]||{score:0,color:"#fff"};
      cur.players[me].score=(cur.players[me].score||0)+bonus;
      await wr(cur);
      setTimeout(async()=>{
        const latest=await fbGet();
        if(!latest||latest.currentIdx!==snapIdx||latest.phase!=="revealed")return;
        const next=snapIdx+1;
        if(next>=latest.questions.length){await wr({...latest,phase:"finished",autoAdvAt:null});return;}
        await wr({...latest,currentIdx:next,phase:"active",clicks:{},locked:{},winner:null,startTime:Date.now(),autoAdvAt:null,lastBonus:null,winSec:null});
      },ADV_DELAY);
    } else {
      SFX.wrong();
      cur.locked=cur.locked||{};cur.locked[me]=true;
      const tName=cur.teacherName;
      // 접속 중(최근 생존 신호)인 학생만 참가자로 센다 — 나간 사람 때문에 공개가 안 되는 문제 방지
      const nowMs=Date.now();
      const participants=Object.entries(cur.players||{}).filter(([p,d])=>p!==tName&&p!=="선생님"&&d?.lastSeen&&nowMs-d.lastSeen<ONLINE_MS).map(([p])=>p);
      const lockedStudents=participants.filter(p=>cur.locked[p]);
      if(participants.length>0&&lockedStudents.length>=participants.length){
        cur.phase="revealed";cur.winner=null;cur.autoAdvAt=null;
      }
      await wr(cur);
    }
  };

  // ── 공통 파생값 ──
  const players=gs?.players||{};
  const teacherName=gs?.teacherName;
  const isTeacherName=n=>n==="선생님"||n===teacherName;
  const isOnline=d=>!!d?.lastSeen&&now-d.lastSeen<ONLINE_MS;
  const studentEntries=Object.entries(players).filter(([n])=>!isTeacherName(n));
  const onlineStudents=studentEntries.filter(([,d])=>isOnline(d)).length;
  const sorted=[...studentEntries].sort(([,a],[,b])=>(b.score||0)-(a.score||0));
  const curSet=getSet(curSetId);

  // ── 테마 (플랫 인포그래픽) ──
  const C={yellow:"#F4B942",teal:"#2FA79C",red:"#E0524D",dark:"#3B3F45",gray:"#8A9096",light:"#F4F5F2",line:"#E4E6E1",white:"#fff"};
  const SET_COLOR={ai:C.teal,capital:C.yellow,proverb:C.red,idiom:C.dark,science:"#5B8DEF"};
  const setColor=SET_COLOR[curSetId]||C.teal;
  const FONT='"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Segoe UI",sans-serif';
  const card={background:C.white,borderRadius:"18px",boxShadow:"0 10px 30px rgba(59,63,69,0.08)",border:`1px solid ${C.line}`};
  const stripe=<div style={{display:"flex",height:"6px",borderRadius:"6px",overflow:"hidden"}}>{[C.yellow,C.teal,C.red,C.dark].map(c=><div key={c} style={{flex:1,background:c}}/>)}</div>;

  const RulesBox=({compact})=>{
    const rows=[
      [C.yellow,"1",<>가장 <b>먼저</b> 정답을 클릭한 <b>1명만</b> 점수를 얻어요</>],
      [C.teal,"2",<><b>{MAX_PT}점</b>에서 시작해 1초에 1점씩 줄어요 (최소 <b>{MIN_PT}점</b>)</>],
      [C.red,"3",<>오답을 누르면 이번 문제는 끝. 다음 문제에서 다시!</>],
      [C.dark,"4",<>{ROUND_SEC}초 안에 아무도 못 맞히면 정답만 공개돼요</>],
    ];
    return(
      <div style={{textAlign:"left"}}>
        <div style={{color:C.gray,fontWeight:"800",fontSize:"11px",letterSpacing:"0.12em",marginBottom:compact?"6px":"10px"}}>SCORING RULES · 점수 규칙</div>
        <div style={{display:"grid",gap:compact?"5px":"8px"}}>
          {rows.map(([c,n,t])=>(
            <div key={n} style={{display:"flex",alignItems:"center",gap:"10px",background:C.light,borderRadius:"10px",padding:compact?"6px 10px":"9px 12px"}}>
              <span style={{width:compact?"20px":"24px",height:compact?"20px":"24px",borderRadius:"50%",background:c,color:"#fff",fontWeight:"900",fontSize:compact?"11px":"12px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{n}</span>
              <span style={{color:C.dark,fontSize:compact?"12px":"13px",lineHeight:1.4}}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const dotBg={backgroundColor:C.light,backgroundImage:`radial-gradient(${C.line} 1.2px, transparent 1.2px)`,backgroundSize:"22px 22px"};

  if(page==="login")return(
    <div style={{minHeight:"100vh",...dotBg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT,padding:"16px",boxSizing:"border-box"}}>
      <div style={{...card,padding:"30px 32px 26px",width:"420px",maxWidth:"100%",textAlign:"center",boxSizing:"border-box"}}>
        {stripe}
        <div style={{display:"flex",justifyContent:"center",gap:"8px",margin:"22px 0 14px"}}>
          {[[C.yellow,"🔎"],[C.teal,"💡"],[C.red,"🏆"]].map(([c,e],i)=>(
            <div key={i} style={{width:"46px",height:"46px",borderRadius:"14px",background:c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"22px",transform:i===1?"translateY(-6px)":"none",boxShadow:`0 8px 18px ${c}55`}}>{e}</div>
          ))}
        </div>
        <h1 style={{color:C.dark,margin:"0 0 6px",fontSize:"23px",fontWeight:"900",letterSpacing:"-0.02em"}}>50개의 단어 속에 정답을 찾아라</h1>
        <p style={{color:C.gray,margin:"0 0 10px",fontSize:"13px"}}>{QUESTION_SETS.length}가지 주제 · 실시간 단어 퀴즈</p>
        <div style={{display:"flex",justifyContent:"center",gap:"6px",flexWrap:"wrap",marginBottom:"14px"}}>
          {QUESTION_SETS.map(s=><span key={s.id} style={{fontSize:"11px",fontWeight:"700",color:"#fff",background:SET_COLOR[s.id],borderRadius:"999px",padding:"3px 9px"}}>{s.emoji} {s.name}</span>)}
        </div>
        <div style={{display:"inline-flex",gap:"6px",alignItems:"center",borderRadius:"999px",padding:"3px 10px",marginBottom:"20px",background:C.light}}>
          <span style={{width:"7px",height:"7px",borderRadius:"50%",background:connStatus==="connected"?C.teal:connStatus==="error"?C.red:C.yellow,display:"inline-block"}}/>
          <span style={{color:connStatus==="connected"?C.teal:connStatus==="error"?C.red:"#b8860b",fontSize:"11px",fontWeight:"800"}}>
            {connStatus==="connected"?"실시간 서버 연결됨":connStatus==="error"?"연결 오류":"연결 중..."}
          </span>
        </div>

        {isTeacherUrl&&(
          <>
            <button onClick={handleTeacherClick}
              style={{width:"100%",padding:"15px",borderRadius:"14px",marginBottom:"6px",background:teacherTaken&&!showPassInput?C.light:C.yellow,border:teacherTaken&&!showPassInput?`2px dashed ${C.yellow}`:"none",color:teacherTaken&&!showPassInput?"#a07a1a":"#3b2f00",fontWeight:"900",cursor:"pointer",fontSize:"16px",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px",boxShadow:teacherTaken&&!showPassInput?"none":`0 8px 18px ${C.yellow}55`}}>
              <span style={{fontSize:"22px"}}>👩‍🏫</span>
              <span>{showPassInput?"비밀번호 확인 후 입장":teacherTaken?"선생님 (입장 중) — 권한 이어받기":"선생님으로 입장"}</span>
            </button>
            {showPassInput&&(
              <input type="password" autoFocus placeholder="선생님 비밀번호" value={passIn}
                onChange={e=>{setPassIn(e.target.value);setErr("");}}
                onKeyDown={e=>e.key==="Enter"&&joinTeacher()}
                style={{width:"100%",padding:"12px 14px",borderRadius:"10px",border:`2px solid ${C.yellow}`,background:"#fff",color:C.dark,fontSize:"15px",boxSizing:"border-box",marginTop:"6px",outline:"none",fontFamily:FONT}}/>
            )}
            {teacherTaken?(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px",padding:"0 4px"}}>
                <p style={{color:C.gray,fontSize:"11px",margin:0,textAlign:"left"}}>※ 이미 선생님이 있어요. 비밀번호를 넣으면 권한을 이어받습니다</p>
                <button onClick={releaseTeacher}
                  style={{background:"none",border:"none",color:C.gray,fontSize:"11px",cursor:"pointer",textDecoration:"underline",padding:"2px 4px"}}>
                  슬롯 해제
                </button>
              </div>
            ):<div style={{height:"12px"}}/>}
            <div style={{display:"flex",alignItems:"center",gap:"10px",margin:"2px 0 14px"}}>
              <div style={{flex:1,height:"1px",background:C.line}}/>
              <span style={{color:C.gray,fontSize:"12px"}}>또는</span>
              <div style={{flex:1,height:"1px",background:C.line}}/>
            </div>
          </>
        )}

        <input type="text" placeholder="닉네임을 입력하세요" value={nameIn} maxLength={12}
          onChange={e=>{setNameIn(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&joinPlayer()}
          style={{width:"100%",padding:"13px 14px",borderRadius:"10px",border:`2px solid ${C.line}`,background:"#fff",color:C.dark,fontSize:"15px",boxSizing:"border-box",marginBottom:"10px",outline:"none",fontFamily:FONT}}/>
        {err&&<p style={{color:C.red,fontSize:"12px",margin:"0 0 8px",textAlign:"left",fontWeight:"700"}}>⚠ {err}</p>}
        <button onClick={joinPlayer}
          style={{width:"100%",padding:"14px",borderRadius:"12px",background:C.teal,border:"none",color:"#fff",fontSize:"16px",fontWeight:"900",cursor:"pointer",boxShadow:`0 8px 18px ${C.teal}55`}}>
          🎮 플레이어로 입장 →
        </button>
        <div style={{marginTop:"18px"}}><RulesBox compact/></div>
        <p style={{color:C.gray,fontSize:"11px",margin:"12px 0 0"}}>💡 누구나 링크로 접속해서 함께 플레이 · 🔊 입장하면 효과음이 나요</p>
      </div>
    </div>
  );

  const phase=gs?.phase||"waiting";
  const qi=gs?.currentIdx??-1;
  const curQ=gs?.questions?.[qi];
  const totalQ=gs?.questions?.length||0;
  const myClicked=gs?.clicks?.[myName];
  const isLocked=gs?.locked?.[myName];
  const winner=gs?.winner;
  const timeExpired=phase==="active"&&timeLeft<=0;
  const tc=timeLeft>30?C.teal:timeLeft>10?C.yellow:C.red;
  const canClick=phase==="active"&&!myClicked&&!isLocked&&!timeExpired;
  const nowPts=phase==="active"?pointsAt((ROUND_SEC-timeLeft)*1000):null;
  const rankOf=name=>sorted.findIndex(([n])=>n===name);
  const medal=i=>i===0?C.yellow:i===1?C.teal:i===2?C.red:C.gray;

  const btn=(extra={})=>({padding:"10px 16px",borderRadius:"10px",border:"none",color:"#fff",fontWeight:"900",cursor:"pointer",fontSize:"13px",whiteSpace:"nowrap",fontFamily:FONT,...extra});
  const ghost=(extra={})=>btn({background:"#fff",border:`1.5px solid ${C.line}`,color:C.dark,...extra});
  const chip=(color)=>({background:"#fff",borderRadius:"999px",padding:"4px 10px 4px 6px",border:`1px solid ${C.line}`,display:"flex",gap:"6px",alignItems:"center"});

  return(
    <div style={{height:"100vh",...dotBg,display:"flex",flexDirection:"column",fontFamily:FONT,overflow:"hidden"}}>
      {/* ── 상단 바 ── */}
      <div style={{padding:"10px 16px",background:"#fff",borderBottom:`1px solid ${C.line}`,display:"flex",alignItems:"center",gap:"10px",boxShadow:"0 2px 10px rgba(0,0,0,0.03)"}}>
        <span style={{display:"flex",alignItems:"center",gap:"8px",whiteSpace:"nowrap"}}>
          <span style={{width:"32px",height:"32px",borderRadius:"10px",background:setColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"17px"}}>{curSet.emoji}</span>
          <span style={{color:C.dark,fontWeight:"900",fontSize:"15px"}}>{curSet.name}</span>
        </span>
        {phase==="active"&&(
          <div style={{display:"flex",alignItems:"center",gap:"10px",background:tc,borderRadius:"12px",padding:"5px 14px",flexShrink:0,color:"#fff",boxShadow:`0 6px 14px ${tc}55`}}>
            <span style={{fontWeight:"900",fontSize:"22px",minWidth:"30px",textAlign:"center",lineHeight:1}}>{timeExpired?"0":timeLeft}</span>
            {!timeExpired&&<span style={{fontSize:"11px",fontWeight:"800",whiteSpace:"nowrap",borderLeft:"1px solid rgba(255,255,255,0.4)",paddingLeft:"10px",opacity:0.95}}>지금 맞히면 <b style={{fontSize:"15px"}}>+{nowPts}</b>점</span>}
          </div>
        )}
        <div style={{flex:1,background:C.light,borderRadius:"12px",padding:"8px 14px",display:"flex",alignItems:"center",gap:"10px",overflow:"hidden",minHeight:"36px"}}>
          {phase==="waiting"&&<span style={{color:C.gray,fontSize:"13px"}}>🕐 선생님이 게임을 시작하기를 기다리는 중...</span>}
          {(phase==="active"||phase==="revealed")&&curQ&&<>
            <span style={{color:"#fff",background:setColor,borderRadius:"6px",padding:"2px 7px",fontSize:"11px",fontWeight:"900",whiteSpace:"nowrap",flexShrink:0}}>{qi+1}/{totalQ}</span>
            <span style={{color:C.dark,fontWeight:"800",fontSize:"14px"}}>{curQ.q}</span>
            {phase==="revealed"&&<span style={{color:C.teal,fontWeight:"900",fontSize:"14px",marginLeft:"auto",whiteSpace:"nowrap"}}>✅ {curQ.a}</span>}
          </>}
          {phase==="finished"&&<span style={{color:C.red,fontWeight:"900",fontSize:"15px"}}>🏁 게임 종료!</span>}
        </div>
        <div style={{display:"flex",gap:"6px",flexShrink:0,alignItems:"center"}}>
          {sorted.slice(0,3).map(([n,d],ri)=>(
            <div key={n} style={chip()}>
              <span style={{width:"20px",height:"20px",borderRadius:"50%",background:medal(ri),color:"#fff",fontSize:"10px",fontWeight:"900",display:"flex",alignItems:"center",justifyContent:"center"}}>{ri+1}</span>
              <span style={{color:C.dark,fontSize:"11px",maxWidth:"60px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:"700"}}>{n}</span>
              <span style={{color:medal(ri),fontWeight:"900",fontSize:"12px"}}>{d.score||0}</span>
            </div>
          ))}
          <button onClick={()=>{setShowPlayers(v=>!v);SFX.click();}} title="참가자 전체 보기"
            style={{background:showPlayers?C.dark:C.teal,border:"none",color:"#fff",fontSize:"12px",fontWeight:"900",padding:"7px 12px",borderRadius:"10px",cursor:"pointer",whiteSpace:"nowrap",display:"flex",gap:"6px",alignItems:"center",fontFamily:FONT}}>
            👥 <span style={{fontSize:"14px"}}>{onlineStudents}</span>명
            {studentEntries.length>onlineStudents&&<span style={{opacity:0.7,fontWeight:"600"}}>/{studentEntries.length}</span>}
          </button>
          <button onClick={toggleMute} title={muted?"소리 켜기":"소리 끄기"}
            style={{background:"#fff",border:`1.5px solid ${C.line}`,color:C.dark,fontSize:"15px",padding:"4px 9px",borderRadius:"10px",cursor:"pointer",lineHeight:1.4}}>
            {muted?"🔇":"🔊"}
          </button>
        </div>
        {isTeacher&&<span style={{background:C.yellow,color:"#3b2f00",fontSize:"11px",fontWeight:"900",padding:"5px 10px",borderRadius:"8px",whiteSpace:"nowrap",flexShrink:0}}>👩‍🏫 선생님</span>}
      </div>

      {/* ── 단어 영역 ── */}
      <div ref={areaRef} style={{flex:1,position:"relative",overflow:"hidden"}}>
        {feedback&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:"80px",zIndex:60,animation:"pop 1.3s forwards",pointerEvents:"none"}}>{feedback}</div>}

        {/* 대기실 */}
        {phase==="waiting"&&(
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:35,background:"rgba(244,245,242,0.7)",backdropFilter:"blur(2px)",padding:"16px",boxSizing:"border-box"}}>
            <div style={{...card,padding:"22px 26px",width:"640px",maxWidth:"100%",maxHeight:"100%",overflow:"auto",boxSizing:"border-box"}}>
              {stripe}
              <div style={{display:"flex",alignItems:"center",gap:"14px",margin:"16px 0 14px",flexWrap:"wrap"}}>
                <div style={{width:"46px",height:"46px",borderRadius:"14px",background:setColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px"}}>{curSet.emoji}</div>
                <div style={{flex:1,minWidth:"180px"}}>
                  <div style={{color:C.gray,fontSize:"11px",fontWeight:"800",letterSpacing:"0.12em"}}>WAITING ROOM · 대기실</div>
                  <div style={{color:C.dark,fontWeight:"900",fontSize:"18px"}}>{curSet.name} <span style={{color:C.gray,fontSize:"12px",fontWeight:"600"}}>· {curSet.desc}</span></div>
                </div>
                <div style={{background:C.yellow,borderRadius:"14px",padding:"8px 18px",textAlign:"center",color:"#3b2f00"}}>
                  <div style={{fontWeight:"900",fontSize:"26px",lineHeight:1}}>{onlineStudents}</div>
                  <div style={{fontSize:"11px",fontWeight:"800"}}>명 접속 중</div>
                </div>
              </div>
              {studentEntries.length===0?(
                <div style={{color:C.gray,fontSize:"13px",textAlign:"center",padding:"18px 0",background:C.light,borderRadius:"12px",marginBottom:"14px"}}>아직 입장한 학생이 없어요. 학생 입장 링크를 공유해 주세요.</div>
              ):(
                <div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginBottom:"16px"}}>
                  {studentEntries.map(([n,d])=>{
                    const on=isOnline(d);
                    return(
                      <div key={n} style={{display:"flex",alignItems:"center",gap:"6px",background:on?"#fff":C.light,border:`1.5px solid ${on?d.color:C.line}`,borderRadius:"999px",padding:"5px 12px 5px 8px",opacity:on?1:0.55}}>
                        <span style={{width:"10px",height:"10px",borderRadius:"50%",background:on?d.color:C.gray,display:"inline-block"}}/>
                        <span style={{color:C.dark,fontWeight:n===myName?"900":"600",fontSize:"13px"}}>{n}{n===myName&&" (나)"}</span>
                        {!on&&<span style={{color:C.gray,fontSize:"10px"}}>나감?</span>}
                        {isTeacher&&<button onClick={()=>kickPlayer(n)} title="제거" style={{background:"none",border:"none",color:C.gray,cursor:"pointer",fontSize:"12px",padding:"0 2px",lineHeight:1}}>✕</button>}
                      </div>
                    );
                  })}
                </div>
              )}
              <RulesBox/>
              <div style={{display:"flex",alignItems:"center",marginTop:"12px",gap:"8px"}}>
                {isTeacher&&studentEntries.length>onlineStudents&&(
                  <button onClick={clearOffline} style={ghost({color:C.red,border:`1.5px solid ${C.red}66`,fontSize:"11px",padding:"6px 10px"})}>
                    🧹 나간 사람 {studentEntries.length-onlineStudents}명 정리
                  </button>
                )}
                {teacherName&&<span style={{color:C.gray,fontSize:"11px",marginLeft:"auto"}}>👩‍🏫 선생님 입장 완료</span>}
              </div>
            </div>
          </div>
        )}

        {phase==="revealed"&&winner&&(
          <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:40,...card,padding:"0 0 22px",textAlign:"center",minWidth:"280px",boxShadow:"0 20px 50px rgba(59,63,69,0.18)",overflow:"hidden"}}>
            <div style={{background:C.teal,color:"#fff",padding:"12px",fontWeight:"900",fontSize:"13px",letterSpacing:"0.08em"}}>🎉 가장 먼저 정답!</div>
            <div style={{color:C.dark,fontWeight:"900",fontSize:"24px",margin:"16px 0 8px"}}>{winner}</div>
            <div style={{display:"inline-block",background:C.light,border:`2px solid ${C.teal}`,borderRadius:"12px",padding:"8px 22px",marginBottom:"10px"}}>
              <span style={{color:C.teal,fontWeight:"900",fontSize:"24px"}}>{curQ?.a}</span>
            </div>
            {gs?.lastBonus!=null&&(
              <div style={{color:C.red,fontWeight:"900",fontSize:"22px",marginBottom:"6px"}}>
                +{gs.lastBonus}점 <span style={{color:C.gray,fontSize:"12px",fontWeight:"600"}}>({gs.winSec}초 만에!)</span>
              </div>
            )}
            {advCnt>0&&<div style={{color:C.gray,fontSize:"12px"}}>{advCnt}초 후 다음 문제...</div>}
          </div>
        )}

        {phase==="revealed"&&!winner&&(
          <div style={{position:"absolute",top:"16px",left:"50%",transform:"translateX(-50%)",zIndex:40,...card,padding:"12px 24px",textAlign:"center",borderTop:`5px solid ${C.red}`}}>
            <div style={{color:C.red,fontWeight:"900",fontSize:"15px",marginBottom:"4px"}}>⌛ 아무도 못 맞혔어요!</div>
            <div style={{color:C.gray,fontSize:"13px"}}>정답: <strong style={{color:C.dark,fontSize:"16px"}}>{curQ?.a}</strong> · 이번 문제는 점수 없음</div>
          </div>
        )}

        {phase==="finished"&&(
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:30,background:"rgba(244,245,242,0.75)",backdropFilter:"blur(2px)",padding:"16px",boxSizing:"border-box"}}>
            <div style={{...card,display:"flex",flexDirection:"column",alignItems:"center",gap:"8px",maxHeight:"100%",width:"400px",maxWidth:"100%",padding:"22px 22px 18px",boxSizing:"border-box"}}>
              {stripe}
              <div style={{fontSize:"40px",marginTop:"8px"}}>🏆</div>
              <div style={{color:C.gray,fontSize:"11px",fontWeight:"800",letterSpacing:"0.12em"}}>FINAL RANKING</div>
              <h2 style={{color:C.dark,fontSize:"22px",fontWeight:"900",margin:"0"}}>최종 순위</h2>
              <div style={{color:C.gray,fontSize:"12px",marginBottom:"6px"}}>{curSet.emoji} {curSet.name} · {totalQ}문제 · 참가 {studentEntries.length}명</div>
              <div style={{overflow:"auto",width:"100%",display:"flex",flexDirection:"column",gap:"6px",padding:"2px"}}>
                {sorted.map(([n,d],i)=>(
                  <div key={n} style={{display:"flex",gap:"12px",alignItems:"center",background:n===myName?"#FFF7E0":C.light,borderRadius:"12px",padding:"8px 14px",borderLeft:`5px solid ${medal(i)}`}}>
                    <span style={{width:"26px",height:"26px",borderRadius:"50%",background:medal(i),color:"#fff",fontWeight:"900",fontSize:"12px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                    <span style={{color:C.dark,fontWeight:"800",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n}{n===myName&&" (나)"}</span>
                    <span style={{color:medal(i),fontWeight:"900",fontSize:"18px"}}>{d.score||0}<span style={{fontSize:"11px",color:C.gray}}>점</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 참가자 전체 패널 */}
        {showPlayers&&(
          <div style={{position:"absolute",top:0,right:0,bottom:0,width:"270px",maxWidth:"80%",zIndex:50,background:"#fff",borderLeft:`1px solid ${C.line}`,display:"flex",flexDirection:"column",boxShadow:"-12px 0 30px rgba(59,63,69,0.1)"}}>
            <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.line}`,display:"flex",alignItems:"center",gap:"8px"}}>
              <span style={{color:C.dark,fontWeight:"900",fontSize:"14px",flex:1}}>👥 참가자 {studentEntries.length}명</span>
              <span style={{color:C.teal,fontSize:"11px",fontWeight:"800"}}>● {onlineStudents} 접속</span>
              <button onClick={()=>setShowPlayers(false)} style={{background:"none",border:"none",color:C.gray,cursor:"pointer",fontSize:"16px",padding:"0 2px"}}>✕</button>
            </div>
            <div style={{flex:1,overflow:"auto",padding:"8px"}}>
              {sorted.length===0&&<div style={{color:C.gray,fontSize:"12px",textAlign:"center",padding:"20px 0"}}>아직 참가자가 없어요</div>}
              {sorted.map(([n,d],i)=>{
                const on=isOnline(d);
                return(
                  <div key={n} style={{display:"flex",alignItems:"center",gap:"8px",padding:"7px 8px",borderRadius:"10px",background:n===myName?"#FFF7E0":"transparent",opacity:on?1:0.5,marginBottom:"2px"}}>
                    <span style={{width:"20px",height:"20px",borderRadius:"50%",background:i<3?medal(i):C.light,color:i<3?"#fff":C.gray,fontSize:"10px",fontWeight:"900",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                    <span style={{width:"8px",height:"8px",borderRadius:"50%",background:on?d.color:C.gray,display:"inline-block",flexShrink:0}}/>
                    <span style={{color:C.dark,fontSize:"13px",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:n===myName?"900":"600"}}>{n}{n===myName&&" (나)"}</span>
                    {!on&&<span style={{color:C.gray,fontSize:"10px"}}>나감?</span>}
                    <span style={{color:C.dark,fontWeight:"900",fontSize:"13px"}}>{d.score||0}</span>
                    {isTeacher&&<button onClick={()=>kickPlayer(n)} title="제거" style={{background:"none",border:"none",color:C.gray,cursor:"pointer",fontSize:"12px",padding:"0 2px"}}>✕</button>}
                  </div>
                );
              })}
            </div>
            <div style={{padding:"8px 12px",borderTop:`1px solid ${C.line}`,color:C.gray,fontSize:"10.5px",lineHeight:1.5,background:C.light}}>
              ● 최근 30초 안에 신호가 온 사람 · 회색은 창을 닫았거나 연결이 끊긴 사람
            </div>
          </div>
        )}

        {items.map(it=>{
          const showDots=phase==="revealed"||phase==="finished";
          const clickers=showDots?Object.entries(gs?.clicks||{}).filter(([,w])=>w===it.word):[];
          const isMine=myClicked===it.word;
          const myWrong=isMine&&isLocked;
          const isAns=curQ&&it.word===curQ.a;
          const revealed=phase==="revealed";
          let bg="#fff",brd=`1.5px solid ${C.line}`,col=C.dark,glow="0 2px 6px rgba(59,63,69,0.06)",sc="1";
          if(myWrong){bg="#FDECEB";brd=`1.5px solid ${C.red}`;col=C.red;}
          if(revealed&&isAns){bg=C.teal;brd=`1.5px solid ${C.teal}`;col="#fff";glow=`0 8px 22px ${C.teal}66`;sc="1.12";}
          return(
            <div key={it.word} onClick={()=>canClick&&clickWord(it.word)} className={canClick?"wd":""}
              style={{position:"absolute",left:it.x,top:it.y,background:bg,border:brd,color:col,borderRadius:"10px",padding:"6px 12px",fontSize:"13px",fontWeight:"800",userSelect:"none",whiteSpace:"nowrap",cursor:canClick?"pointer":"default",transition:"all 0.2s",boxShadow:glow,transform:`scale(${sc})`,display:"flex",alignItems:"center",gap:"4px"}}>
              {it.word}
              {showDots&&clickers.length>0&&(
                <span style={{display:"flex",gap:"2px",marginLeft:"3px"}}>
                  {clickers.map(([p])=><span key={p} title={p} style={{width:"7px",height:"7px",borderRadius:"50%",background:players[p]?.color||C.gray,display:"inline-block",border:"1px solid #fff"}}/>)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 하단 바 ── */}
      {isTeacher?(
        <div style={{padding:"12px 16px",background:"#fff",borderTop:`4px solid ${C.yellow}`}}>
          {curQ&&(phase==="active"||phase==="revealed")&&(
            <div style={{background:"#FFF7E0",borderRadius:"12px",padding:"9px 16px",marginBottom:"10px",display:"flex",alignItems:"center",gap:"14px",flexWrap:"wrap"}}>
              <span style={{color:"#3b2f00",background:C.yellow,borderRadius:"6px",padding:"2px 8px",fontSize:"11px",fontWeight:"900",whiteSpace:"nowrap"}}>👩‍🏫 선생님 전용</span>
              <span style={{color:C.dark,fontSize:"14px",flex:1}}>{curQ.q}</span>
              <span style={{color:C.teal,fontWeight:"900",fontSize:"16px",whiteSpace:"nowrap"}}>✅ {curQ.a}</span>
            </div>
          )}
          {(phase==="waiting"||phase==="finished")&&(
            <div style={{display:"flex",gap:"6px",alignItems:"center",flexWrap:"wrap",marginBottom:"10px"}}>
              <span style={{color:C.gray,fontSize:"12px",fontWeight:"800",marginRight:"4px"}}>문제 세트</span>
              {QUESTION_SETS.map(s=>{
                const on=s.id===setId;const c=SET_COLOR[s.id];
                return(
                  <button key={s.id} onClick={()=>{setSetId(s.id);SFX.click();}} title={s.desc}
                    style={{padding:"7px 13px",borderRadius:"999px",border:`1.5px solid ${on?c:C.line}`,background:on?c:"#fff",color:on?"#fff":C.dark,fontWeight:"800",fontSize:"12.5px",cursor:"pointer",whiteSpace:"nowrap",fontFamily:FONT,boxShadow:on?`0 6px 14px ${c}55`:"none"}}>
                    {s.emoji} {s.name}
                  </button>
                );
              })}
              <span style={{color:C.gray,fontSize:"11px",marginLeft:"6px"}}>{getSet(setId).desc}</span>
            </div>
          )}
          <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",background:C.light,borderRadius:"10px",padding:"7px 12px"}}>
              <span style={{color:C.gray,fontSize:"12px",fontWeight:"800",whiteSpace:"nowrap"}}>문제 수</span>
              <input type="number" min="1" max="50" value={numQ} onChange={e=>setNumQ(Math.min(50,Math.max(1,+e.target.value||1)))}
                style={{width:"52px",padding:"4px 8px",borderRadius:"8px",border:`1.5px solid ${C.line}`,background:"#fff",color:C.dark,fontSize:"15px",fontWeight:"900",outline:"none",textAlign:"center",fontFamily:FONT}}/>
              <span style={{color:C.gray,fontSize:"12px"}}>/ 50</span>
            </div>
            {(phase==="waiting"||phase==="finished")&&(
              <button onClick={phase==="finished"?restart:startGame}
                style={btn({padding:"11px 24px",background:C.red,fontSize:"14px",boxShadow:`0 8px 18px ${C.red}55`})}>
                {phase==="finished"?"🔄 같은 멤버로 다시 시작":"▶ 게임 시작!"}
              </button>
            )}
            {phase==="finished"&&(
              <button onClick={backToLobby} style={ghost()}>🚪 대기실로</button>
            )}
            {phase==="active"&&timeExpired&&(
              <button onClick={doReveal} style={btn({background:C.red})}>⌛ 시간 초과 — 정답 공개</button>
            )}
            {phase==="revealed"&&!winner&&(
              <button onClick={manualNext} style={btn({background:C.teal})}>
                ➡ 다음 문제 {qi+1<totalQ?`(${qi+2}/${totalQ})`:"(마지막)"}
              </button>
            )}
            {(phase==="active"||phase==="revealed")&&(
              <button onClick={restart} style={ghost({color:C.red,border:`1.5px solid ${C.red}66`})}>🔄 재시작</button>
            )}
            <button onClick={copyStudentUrl} style={btn({background:C.dark,marginLeft:"auto"})}>📋 학생 입장 링크 복사</button>
            <button onClick={resetAll} style={ghost({color:C.gray})}>🗑 전체 초기화</button>
          </div>
        </div>
      ):(
        <div style={{padding:"10px 16px",background:"#fff",borderTop:`4px solid ${C.teal}`,display:"flex",alignItems:"center",gap:"10px",minHeight:"46px"}}>
          <span style={{background:C.teal,color:"#fff",fontSize:"11px",fontWeight:"900",padding:"4px 10px",borderRadius:"8px",flexShrink:0}}>🎮 플레이어</span>
          {phase==="waiting"&&<span style={{color:C.gray,fontSize:"13px"}}>선생님이 게임을 시작하기를 기다리는 중...</span>}
          {phase==="active"&&!myClicked&&!isLocked&&!timeExpired&&<span style={{color:C.dark,fontSize:"13px",fontWeight:"800"}}>👆 정답이라고 생각하는 단어를 클릭하세요! <span style={{color:C.gray,fontWeight:"600"}}>(빠를수록 높은 점수)</span></span>}
          {phase==="active"&&isLocked&&<span style={{color:C.red,fontSize:"13px",fontWeight:"800"}}>🚫 오답! 이번 문제 참여 불가 · 다음 문제에서 만회하세요</span>}
          {phase==="active"&&myClicked&&!isLocked&&<span style={{color:C.gray,fontSize:"13px"}}>⏳ 다른 플레이어를 기다리는 중...</span>}
          {phase==="active"&&timeExpired&&!isLocked&&!myClicked&&<span style={{color:C.gray,fontSize:"13px"}}>⌛ 시간 초과! 선생님이 정답을 공개합니다...</span>}
          {phase==="revealed"&&winner===myName&&<span style={{color:C.teal,fontSize:"14px",fontWeight:"900"}}>🎉 정답! +{gs?.lastBonus}점 획득!</span>}
          {phase==="revealed"&&winner&&winner!==myName&&<span style={{color:C.gray,fontSize:"13px"}}>👏 {winner}님이 먼저 맞혔어요 (+{gs?.lastBonus}점)</span>}
          {phase==="revealed"&&!winner&&<span style={{color:C.gray,fontSize:"13px"}}>⌛ 아무도 못 맞혔어요. 정답을 확인하세요.</span>}
          {phase==="finished"&&<span style={{color:C.red,fontSize:"13px",fontWeight:"800"}}>🏁 게임 종료! 최종 순위를 확인하세요!</span>}
          <span style={{marginLeft:"auto",display:"flex",gap:"10px",alignItems:"center",whiteSpace:"nowrap"}}>
            {players[myName]&&<span style={{background:C.light,borderRadius:"999px",padding:"4px 12px",color:C.dark,fontSize:"12px",fontWeight:"800"}}>내 점수 <b style={{color:C.red,fontSize:"14px"}}>{players[myName].score||0}</b>점{rankOf(myName)>=0&&<span style={{color:C.gray,fontWeight:"600"}}> · {rankOf(myName)+1}위</span>}</span>}
            <span style={{color:C.gray,fontSize:"12px"}}>{myName}</span>
          </span>
        </div>
      )}

      <style>{`
        @keyframes pop{0%{opacity:1;transform:translate(-50%,-50%) scale(0.3);}55%{opacity:1;transform:translate(-50%,-50%) scale(1.5);}100%{opacity:0;transform:translate(-50%,-50%) scale(1.7);}}
        .wd:hover{transform:translateY(-2px) scale(1.04)!important;box-shadow:0 8px 18px rgba(59,63,69,0.14)!important;border-color:${C.teal}!important;}
        input::placeholder{color:#b0b5ba;}
      `}</style>
    </div>
  );
}
