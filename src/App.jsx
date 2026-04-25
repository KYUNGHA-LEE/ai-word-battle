import { useState, useEffect, useRef, useCallback } from "react";

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
const ADV_DELAY = 2500;
const T_PASS = "123456";

const W50 = [
  "인공지능","머신러닝","딥러닝","신경망","자연어처리","챗GPT","알고리즘","데이터","자율주행","얼굴인식",
  "음성인식","번역","챗봇","강화학습","지도학습","비지도학습","과적합","알파고","생성형AI","이미지생성",
  "프롬프트","파라미터","트랜스포머","예측","분류","클러스터링","이상탐지","편향","딥페이크","핀테크",
  "스마트팜","바둑","의료AI","AI윤리","자동화","빅데이터","클라우드","사물인터넷","LLM","할루시네이션",
  "임베딩","API","멀티모달","로봇공학","스마트팩토리","개인정보","AI에이전트","브레인스토밍","튜링테스트","메타버스"
];

const DB = [
  {q:"사람처럼 학습하고 판단하는 컴퓨터 기술을 통틀어 뭐라고 하나요?",a:"인공지능"},
  {q:"데이터를 반복 학습해 스스로 규칙을 찾는 AI 핵심 기술은?",a:"머신러닝"},
  {q:"인간 뇌를 모방한 층층이 쌓인 신경망으로 학습하는 기술은?",a:"딥러닝"},
  {q:"딥러닝의 기반이 되는, 뇌의 뉴런을 모방한 구조는?",a:"신경망"},
  {q:"AI가 사람의 글과 말을 이해하고 생성하는 기술 분야는?",a:"자연어처리"},
  {q:"OpenAI가 2022년 공개한 대화형 AI 서비스의 이름은?",a:"챗GPT"},
  {q:"문제를 해결하기 위한 단계적 처리 절차나 규칙을 뭐라 하나요?",a:"알고리즘"},
  {q:"AI가 학습하기 위해 반드시 필요한 방대한 정보의 원료는?",a:"데이터"},
  {q:"AI가 사람 없이 스스로 운전하는 기술은?",a:"자율주행"},
  {q:"스마트폰 잠금 해제나 공항 출입에 쓰이는 AI 신원 확인 기술은?",a:"얼굴인식"},
  {q:"시리, 빅스비처럼 말소리를 텍스트로 변환하는 AI 기술은?",a:"음성인식"},
  {q:"파파고·구글이 AI로 언어를 자동으로 변환해주는 기능은?",a:"번역"},
  {q:"고객센터 대신 텍스트로 질문에 자동 답변해주는 AI 프로그램은?",a:"챗봇"},
  {q:"게임에서 보상을 받으며 최적의 전략을 스스로 익히는 AI 학습 방식은?",a:"강화학습"},
  {q:"정답이 달린 데이터로 AI를 훈련하는 방식은?",a:"지도학습"},
  {q:"정답 없이 데이터에서 패턴을 스스로 발견하는 학습 방식은?",a:"비지도학습"},
  {q:"AI가 학습 데이터에만 너무 최적화되어 새 데이터에서 틀리는 문제는?",a:"과적합"},
  {q:"2016년 이세돌 9단을 꺾어 세계를 놀라게 한 구글 딥마인드의 AI는?",a:"알파고"},
  {q:"텍스트·이미지·음악 등 새로운 콘텐츠를 스스로 만들어내는 AI는?",a:"생성형AI"},
  {q:"미드저니·DALL-E처럼 텍스트 설명만으로 그림을 만드는 AI 기능은?",a:"이미지생성"},
  {q:"AI에게 원하는 결과를 얻기 위해 입력하는 질문이나 명령문은?",a:"프롬프트"},
  {q:"AI 모델의 지식이 저장된 수십억 개의 수치값을 뭐라 하나요?",a:"파라미터"},
  {q:"ChatGPT·BERT 등 현대 언어 AI의 핵심이 된 딥러닝 구조는?",a:"트랜스포머"},
  {q:"AI가 과거 데이터를 분석해 미래 결과를 추론하는 것은?",a:"예측"},
  {q:"이메일을 스팸/정상으로, 사진을 고양이/개로 나누는 AI 작업은?",a:"분류"},
  {q:"정답 없이 비슷한 데이터를 자동으로 같은 그룹으로 묶는 기법은?",a:"클러스터링"},
  {q:"신용카드 사기나 공장 불량처럼 평소와 다른 패턴을 잡아내는 AI 기술은?",a:"이상탐지"},
  {q:"학습 데이터에 포함된 불공정한 선입견이 AI 결과에 영향을 주는 문제는?",a:"편향"},
  {q:"AI로 실제처럼 보이는 가짜 얼굴·영상을 만드는 기술은?",a:"딥페이크"},
  {q:"AI를 활용한 간편결제·인터넷 뱅킹 같은 금융 기술 산업은?",a:"핀테크"},
  {q:"AI·IoT로 온도·습도를 자동 관리하는 첨단 농장은?",a:"스마트팜"},
  {q:"알파고가 이세돌을 꺾은 경기 종목은?",a:"바둑"},
  {q:"AI가 CT·MRI를 분석해 암을 진단하거나 신약 개발을 돕는 분야는?",a:"의료AI"},
  {q:"AI 개발에서 공정성·투명성·책임을 다루는 분야는?",a:"AI윤리"},
  {q:"AI·로봇이 사람 대신 반복 작업을 처리하는 것은?",a:"자동화"},
  {q:"AI 학습에 필요한 수십억 건 이상의 방대한 데이터 집합은?",a:"빅데이터"},
  {q:"AI 서비스를 인터넷으로 어디서든 쓸 수 있게 하는 서버 인프라는?",a:"클라우드"},
  {q:"냉장고·전구 등 사물이 인터넷에 연결되어 AI와 소통하는 기술은?",a:"사물인터넷"},
  {q:"GPT-4·클로드처럼 대규모 텍스트로 학습된 거대 언어 모델의 약자는?",a:"LLM"},
  {q:"AI가 사실이 아닌 내용을 자신 있게 말하는 오류 현상은?",a:"할루시네이션"},
  {q:"단어나 문장을 AI가 이해할 수 있는 숫자 벡터로 변환하는 기법은?",a:"임베딩"},
  {q:"카카오·네이버 AI 기능을 내 앱에서 쓸 수 있게 연결해주는 인터페이스는?",a:"API"},
  {q:"텍스트·이미지·음성을 동시에 처리할 수 있는 AI 모델을 뭐라 하나요?",a:"멀티모달"},
  {q:"AI와 기계를 결합해 물리적 작업을 수행하는 로봇을 연구하는 분야는?",a:"로봇공학"},
  {q:"AI·로봇이 생산 전 과정을 자동화한 첨단 제조 공장은?",a:"스마트팩토리"},
  {q:"AI 학습 시 반드시 보호해야 하는 이름·주소·생체정보 등은?",a:"개인정보"},
  {q:"목표를 스스로 설정하고 계획·실행·수정을 반복하며 임무를 완수하는 AI는?",a:"AI에이전트"},
  {q:"AI와 함께 자유롭게 아이디어를 쏟아내며 창의적 발상을 이끄는 기법은?",a:"브레인스토밍"},
  {q:"1950년 앨런 튜링이 제안한, AI가 인간과 구별되지 않으면 지능이 있다고 보는 테스트는?",a:"튜링테스트"},
  {q:"AI·VR·AR이 결합해 현실과 가상이 융합된 3D 디지털 공간은?",a:"메타버스"},
];

function place(W,H){
  const items=[];const CH=13,PX=13,PY=7,G=9;
  for(const word of W50){
    const w=word.length*(CH*0.78)+PX*2,h=CH+PY*2;let p=null;
    for(let i=0;i<500;i++){
      const x=G+Math.random()*(W-w-G*2),y=G+Math.random()*(H-h-G*2);
      if(!items.some(it=>x<it.x+it.w+G&&x+w+G>it.x&&y<it.y+it.h+G&&y+h+G>it.y)){p={x,y,w,h};break;}
    }
    if(p)items.push({word,...p});
  }
  return items;
}

const FB_URL = `${FIREBASE_CONFIG.databaseURL}/rooms/${ROOM}.json`;
async function fbGet(){
  try{const r=await fetch(FB_URL);if(!r.ok)return null;const d=await r.json();return d;}catch{return null;}
}
async function fbPut(data){
  try{const r=await fetch(FB_URL,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});return r.ok;}catch{return false;}
}
async function fbPatch(updates){
  try{const r=await fetch(FB_URL,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(updates)});return r.ok;}catch{return false;}
}

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
  const [err,setErr]=useState("");
  const [timeLeft,setTimeLeft]=useState(ROUND_SEC);
  const [advCnt,setAdvCnt]=useState(null);
  const [teacherTaken,setTeacherTaken]=useState(false);
  const [connStatus,setConnStatus]=useState("connecting");

  const areaRef=useRef(null);
  const myRef=useRef("");
  const pollRef=useRef(null);
  const timerRef=useRef(null);
  const advRef=useRef(null);
  const numQRef=useRef(10);
  useEffect(()=>{numQRef.current=numQ;},[numQ]);

  useEffect(()=>{
    (async()=>{
      const s=await fbGet();
      if(s){setConnStatus("connected");if(s.teacherName)setTeacherTaken(true);}
      else setConnStatus("connected");
    })();
  },[]);

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

  // 화면 크기 자동 맞춤: 각 클라이언트가 자기 화면 크기에 맞춰 단어 배치 + 창 크기 변경 시 자동 재배치
  useEffect(()=>{
    if(page!=="game")return;
    const el=areaRef.current;if(!el)return;
    let raf=null;
    const update=()=>{
      const{width:W,height:H}=el.getBoundingClientRect();
      if(W>0&&H>0)setItems(place(W,H));
    };
    update();
    const onResize=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(update);};
    const ro=new ResizeObserver(onResize);
    ro.observe(el);
    window.addEventListener("resize",onResize);
    return()=>{ro.disconnect();window.removeEventListener("resize",onResize);cancelAnimationFrame(raf);};
  },[page]);

  const startSession=useCallback(async(name,teacher)=>{
    myRef.current=name;setMyName(name);setIsTeacher(teacher);
    let s=await fbGet();
    if(!s)s={words:[],questions:[],currentIdx:-1,phase:"waiting",players:{},clicks:{},locked:{},winner:null,round:0,startTime:null,autoAdvAt:null,teacherName:null};
    if(!s.players)s.players={};
    const color=teacher?"#f59e0b":`hsl(${Math.random()*360|0},70%,60%)`;
    s.players[name]=s.players[name]||{score:0,color};
    if(teacher)s.teacherName=name;
    await wr(s);setPage("game");
    pollRef.current=setInterval(async()=>{
      const l=await fbGet();
      if(l){setGs(l);setConnStatus("connected");}
      else setConnStatus("error");
    },800);
  },[wr]);

  const joinTeacher=useCallback(async()=>{
    if(passIn!==T_PASS){setErr("선생님 비밀번호가 틀렸습니다");return;}
    await startSession("선생님",true);
  },[startSession,passIn]);

  const handleTeacherClick=useCallback(()=>{
    setErr("");
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
    if(name==="선생님"){setErr('"선생님"은 사용할 수 없는 닉네임입니다');return;}
    await startSession(name,false);
  },[nameIn,startSession]);

  useEffect(()=>()=>{clearInterval(pollRef.current);clearInterval(timerRef.current);clearInterval(advRef.current);},[]);

  const startGame=async()=>{
    const cur=await fbGet();if(!cur)return;
    const qs=[...DB].sort(()=>Math.random()-0.5).slice(0,numQRef.current);
    await wr({...cur,questions:qs,currentIdx:0,phase:"active",clicks:{},locked:{},winner:null,round:(cur.round||0)+1,startTime:Date.now(),autoAdvAt:null});
  };
  const doReveal=async()=>{const cur=await fbGet();if(cur)await wr({...cur,phase:"revealed",winner:null,autoAdvAt:null});};
  const manualNext=async()=>{
    const cur=await fbGet();if(!cur)return;
    const next=cur.currentIdx+1;
    if(next>=cur.questions.length){await wr({...cur,phase:"finished",autoAdvAt:null});return;}
    await wr({...cur,currentIdx:next,phase:"active",clicks:{},locked:{},winner:null,startTime:Date.now(),autoAdvAt:null});
  };
  const restart=async()=>{
    const cur=await fbGet();if(!cur)return;
    const qs=[...DB].sort(()=>Math.random()-0.5).slice(0,numQRef.current);
    const players={};Object.entries(cur.players||{}).forEach(([n,d])=>{players[n]={...d,score:0};});
    await wr({...cur,questions:qs,currentIdx:0,phase:"active",players,clicks:{},locked:{},winner:null,round:(cur.round||0)+1,startTime:Date.now(),autoAdvAt:null});
  };
  const resetAll=async()=>{
    if(!window.confirm("정말 전체 초기화할까요?\n모든 플레이어와 점수가 삭제됩니다.\n선생님도 다시 입장해야 합니다."))return;
    const fresh={words:[],questions:[],currentIdx:-1,phase:"waiting",players:{},clicks:{},locked:{},winner:null,round:0,startTime:null,autoAdvAt:null,teacherName:null};
    await wr(fresh);
    clearInterval(pollRef.current);
    setPage("login");setMyName("");setNameIn("");setIsTeacher(false);setTeacherTaken(false);
  };

  const clickWord=async word=>{
    const cur=await fbGet();
    if(!cur||cur.phase!=="active")return;
    const me=myRef.current;
    if(cur.clicks?.[me]||cur.locked?.[me])return;
    if(Date.now()-cur.startTime>ROUND_SEC*1000)return;
    const ans=cur.questions?.[cur.currentIdx]?.a;
    const ok=word===ans;
    setFeedback(ok?"✅":"❌");setTimeout(()=>setFeedback(null),ok?ADV_DELAY:1000);
    cur.clicks=cur.clicks||{};cur.clicks[me]=word;
    if(ok){
      const bonus=Math.max(10,100-Math.floor((Date.now()-cur.startTime)/1000)*1.5|0);
      const snapIdx=cur.currentIdx;
      cur.winner=me;cur.phase="revealed";cur.autoAdvAt=Date.now()+ADV_DELAY;
      cur.players=cur.players||{};
      cur.players[me]=cur.players[me]||{score:0,color:"#fff"};
      cur.players[me].score=(cur.players[me].score||0)+bonus;
      await wr(cur);
      setTimeout(async()=>{
        const latest=await fbGet();
        if(!latest||latest.currentIdx!==snapIdx||latest.phase!=="revealed")return;
        const next=snapIdx+1;
        if(next>=latest.questions.length){await wr({...latest,phase:"finished",autoAdvAt:null});return;}
        await wr({...latest,currentIdx:next,phase:"active",clicks:{},locked:{},winner:null,startTime:Date.now(),autoAdvAt:null});
      },ADV_DELAY);
    } else {
      cur.locked=cur.locked||{};cur.locked[me]=true;
      await wr(cur);
    }
  };

  if(page==="login")return(
    <div style={{height:"100vh",background:"linear-gradient(135deg,#0f172a,#1e1b4b)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif"}}>
      <div style={{background:"rgba(255,255,255,0.05)",backdropFilter:"blur(12px)",borderRadius:"24px",padding:"40px",width:"380px",border:"1px solid rgba(255,255,255,0.1)",textAlign:"center"}}>
        <div style={{fontSize:"52px",marginBottom:"8px"}}>🧠</div>
        <h1 style={{color:"#fff",margin:"0 0 4px",fontSize:"24px",fontWeight:"900"}}>AI 워드 배틀</h1>
        <p style={{color:"#64748b",margin:"0 0 8px",fontSize:"13px"}}>AI와 함께하는 단어 퀴즈 게임!</p>
        <div style={{display:"inline-flex",gap:"6px",alignItems:"center",background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:"6px",padding:"3px 10px",marginBottom:"22px"}}>
          <span style={{width:"7px",height:"7px",borderRadius:"50%",background:connStatus==="connected"?"#22c55e":connStatus==="error"?"#ef4444":"#f59e0b",display:"inline-block"}}/>
          <span style={{color:connStatus==="connected"?"#22c55e":connStatus==="error"?"#ef4444":"#f59e0b",fontSize:"11px",fontWeight:"700"}}>
            {connStatus==="connected"?"실시간 서버 연결됨":connStatus==="error"?"연결 오류":"연결 중..."}
          </span>
        </div>

        <button onClick={handleTeacherClick}
          style={{width:"100%",padding:"16px",borderRadius:"14px",marginBottom:"6px",background:teacherTaken?"rgba(245,158,11,0.08)":"linear-gradient(135deg,#f59e0b,#ef4444)",border:teacherTaken?"2px solid rgba(245,158,11,0.3)":"none",color:teacherTaken?"#78716c":"#fff",fontWeight:"900",cursor:"pointer",fontSize:"16px",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"}}>
          <span style={{fontSize:"22px"}}>👩‍🏫</span>
          <span>{teacherTaken?"선생님 (입장 중)":showPassInput?"비밀번호 확인 후 입장":"선생님으로 입장"}</span>
        </button>
        {showPassInput&&!teacherTaken&&(
          <input type="password" autoFocus placeholder="선생님 비밀번호" value={passIn}
            onChange={e=>{setPassIn(e.target.value);setErr("");}}
            onKeyDown={e=>e.key==="Enter"&&joinTeacher()}
            style={{width:"100%",padding:"12px 14px",borderRadius:"10px",border:"1px solid rgba(245,158,11,0.4)",background:"rgba(245,158,11,0.05)",color:"#fff",fontSize:"15px",boxSizing:"border-box",marginTop:"6px",outline:"none"}}/>
        )}
        {teacherTaken?(
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px",padding:"0 4px"}}>
            <p style={{color:"#57534e",fontSize:"11px",margin:0,textAlign:"left"}}>※ 클릭하면 권한을 이어받습니다</p>
            <button onClick={releaseTeacher}
              style={{background:"none",border:"none",color:"#78716c",fontSize:"11px",cursor:"pointer",textDecoration:"underline",padding:"2px 4px"}}>
              슬롯 해제
            </button>
          </div>
        ):<div style={{height:"14px"}}/>}

        <div style={{display:"flex",alignItems:"center",gap:"10px",margin:"4px 0 16px"}}>
          <div style={{flex:1,height:"1px",background:"rgba(255,255,255,0.08)"}}/>
          <span style={{color:"#334155",fontSize:"12px"}}>또는</span>
          <div style={{flex:1,height:"1px",background:"rgba(255,255,255,0.08)"}}/>
        </div>

        <input type="text" placeholder="닉네임을 입력하세요" value={nameIn}
          onChange={e=>{setNameIn(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&joinPlayer()}
          style={{width:"100%",padding:"13px 14px",borderRadius:"10px",border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.05)",color:"#fff",fontSize:"15px",boxSizing:"border-box",marginBottom:"10px",outline:"none"}}/>
        {err&&<p style={{color:"#f87171",fontSize:"12px",margin:"0 0 8px",textAlign:"left"}}>{err}</p>}
        <button onClick={joinPlayer}
          style={{width:"100%",padding:"14px",borderRadius:"12px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"#fff",fontSize:"16px",fontWeight:"900",cursor:"pointer"}}>
          🎮 플레이어로 입장 →
        </button>
        <p style={{color:"#1e293b",marginTop:"16px",fontSize:"11px"}}>💡 누구나 링크로 접속해서 함께 플레이!</p>
      </div>
    </div>
  );

  const players=gs?.players||{};
  const sorted=Object.entries(players).sort(([,a],[,b])=>b.score-a.score);
  const phase=gs?.phase||"waiting";
  const qi=gs?.currentIdx??-1;
  const curQ=gs?.questions?.[qi];
  const totalQ=gs?.questions?.length||0;
  const myClicked=gs?.clicks?.[myName];
  const isLocked=gs?.locked?.[myName];
  const winner=gs?.winner;
  const timeExpired=phase==="active"&&timeLeft<=0;
  const tc=timeLeft>30?"#22c55e":timeLeft>10?"#f59e0b":"#ef4444";
  const canClick=phase==="active"&&!myClicked&&!isLocked&&!timeExpired;

  return(
    <div style={{height:"100vh",background:"linear-gradient(135deg,#0f172a,#1e1b4b)",display:"flex",flexDirection:"column",fontFamily:"sans-serif",overflow:"hidden"}}>
      <div style={{padding:"10px 16px",background:"rgba(0,0,0,0.5)",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",gap:"10px"}}>
        <span style={{color:"#fff",fontWeight:"900",fontSize:"17px",whiteSpace:"nowrap"}}>🧠 AI배틀</span>
        {phase==="active"&&(
          <div style={{display:"flex",alignItems:"center",gap:"5px",background:"rgba(0,0,0,0.35)",borderRadius:"10px",padding:"6px 12px",border:`1px solid ${tc}55`,flexShrink:0}}>
            <span style={{fontSize:"13px"}}>{timeExpired?"⌛":"⏱"}</span>
            <span style={{color:tc,fontWeight:"900",fontSize:"22px",minWidth:"30px",textAlign:"center",lineHeight:1}}>{timeExpired?"0":timeLeft}</span>
          </div>
        )}
        <div style={{flex:1,background:"rgba(255,255,255,0.04)",borderRadius:"10px",padding:"8px 14px",display:"flex",alignItems:"center",gap:"10px",overflow:"hidden",minHeight:"36px"}}>
          {phase==="waiting"&&<span style={{color:"#475569",fontSize:"13px"}}>🕐 선생님이 게임을 시작하기를 기다리는 중...</span>}
          {(phase==="active"||phase==="revealed")&&curQ&&<>
            <span style={{color:"#6366f1",fontSize:"12px",fontWeight:"800",whiteSpace:"nowrap",flexShrink:0}}>{qi+1}/{totalQ}</span>
            <span style={{color:"#fbbf24",fontWeight:"800",fontSize:"14px"}}>{curQ.q}</span>
            {phase==="revealed"&&<span style={{color:"#34d399",fontWeight:"900",fontSize:"14px",marginLeft:"auto",whiteSpace:"nowrap"}}>✅ {curQ.a}</span>}
          </>}
          {phase==="finished"&&<span style={{color:"#f59e0b",fontWeight:"900",fontSize:"15px"}}>🏁 게임 종료!</span>}
        </div>
        <div style={{display:"flex",gap:"5px",flexShrink:0}}>
          {sorted.slice(0,6).map(([n,d],ri)=>(
            <div key={n} style={{background:"rgba(255,255,255,0.05)",borderRadius:"8px",padding:"3px 9px",border:`1px solid ${d.color}55`,display:"flex",gap:"5px",alignItems:"center"}}>
              {ri===0&&<span style={{fontSize:"10px"}}>👑</span>}
              <span style={{color:"#e2e8f0",fontSize:"11px",maxWidth:"52px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n}</span>
              <span style={{color:d.color,fontWeight:"900",fontSize:"12px"}}>{d.score}</span>
            </div>
          ))}
        </div>
        {isTeacher&&<span style={{background:"rgba(245,158,11,0.15)",border:"1px solid #f59e0b44",color:"#f59e0b",fontSize:"11px",fontWeight:"800",padding:"3px 9px",borderRadius:"6px",whiteSpace:"nowrap",flexShrink:0}}>👩‍🏫 선생님</span>}
      </div>

      <div ref={areaRef} style={{flex:1,position:"relative",overflow:"hidden"}}>
        {feedback&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:"80px",zIndex:60,animation:"pop 1.3s forwards",pointerEvents:"none"}}>{feedback}</div>}

        {phase==="revealed"&&winner&&(
          <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:40,background:"rgba(0,0,0,0.88)",borderRadius:"20px",padding:"24px 44px",textAlign:"center",border:"2px solid #22c55e55",boxShadow:"0 0 40px rgba(34,197,94,0.3)"}}>
            <div style={{fontSize:"40px",marginBottom:"8px"}}>🎉</div>
            <div style={{color:"#94a3b8",fontSize:"13px",marginBottom:"4px"}}>정답!</div>
            <div style={{color:"#fff",fontWeight:"900",fontSize:"22px",marginBottom:"8px"}}>{winner}</div>
            <div style={{background:"rgba(34,197,94,0.2)",border:"1px solid #22c55e",borderRadius:"10px",padding:"8px 20px",marginBottom:"12px"}}>
              <span style={{color:"#34d399",fontWeight:"900",fontSize:"24px"}}>{curQ?.a}</span>
            </div>
            {advCnt>0&&<div style={{color:"#475569",fontSize:"12px"}}>{advCnt}초 후 다음 문제...</div>}
          </div>
        )}

        {phase==="revealed"&&!winner&&(
          <div style={{position:"absolute",top:"16px",left:"50%",transform:"translateX(-50%)",zIndex:40,background:"rgba(0,0,0,0.8)",borderRadius:"14px",padding:"12px 28px",border:"1px solid #ef444455",textAlign:"center"}}>
            <div style={{color:"#f87171",fontWeight:"900",fontSize:"15px",marginBottom:"4px"}}>⌛ 시간 초과!</div>
            <div style={{color:"#94a3b8",fontSize:"13px"}}>정답: <strong style={{color:"#fff",fontSize:"16px"}}>{curQ?.a}</strong></div>
          </div>
        )}

        {phase==="finished"&&(
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:30,background:"rgba(0,0,0,0.78)",flexDirection:"column",gap:"10px"}}>
            <div style={{fontSize:"44px"}}>🏆</div>
            <h2 style={{color:"#f59e0b",fontSize:"22px",fontWeight:"900",margin:"0 0 8px"}}>최종 순위</h2>
            {sorted.slice(0,8).map(([n,d],i)=>(
              <div key={n} style={{display:"flex",gap:"14px",alignItems:"center",background:"rgba(255,255,255,0.05)",borderRadius:"10px",padding:"8px 24px",minWidth:"230px",border:`1px solid ${d.color}44`}}>
                <span style={{fontSize:"16px"}}>{["🥇","🥈","🥉"][i]||`${i+1}.`}</span>
                <span style={{color:"#fff",fontWeight:"700",flex:1}}>{n}</span>
                <span style={{color:d.color,fontWeight:"900",fontSize:"18px"}}>{d.score}점</span>
              </div>
            ))}
          </div>
        )}

        {items.map((it,idx)=>{
          const showDots=phase==="revealed"||phase==="finished";
          const clickers=showDots?Object.entries(gs?.clicks||{}).filter(([,w])=>w===it.word):[];
          const isMine=myClicked===it.word;
          const myWrong=isMine&&isLocked;
          const isAns=curQ&&it.word===curQ.a;
          const revealed=phase==="revealed";
          let bg="rgba(15,23,42,0.9)",brd="1px solid rgba(99,102,241,0.2)",col="#94a3b8",glow="none",sc="1";
          if(myWrong){bg="rgba(239,68,68,0.2)";brd="1.5px solid #ef4444";col="#fca5a5";}
          if(revealed&&isAns){bg="rgba(34,197,94,0.35)";brd="2px solid #22c55e";col="#fff";glow="0 0 20px rgba(34,197,94,0.5)";sc="1.1";}
          return(
            <div key={idx} onClick={()=>canClick&&clickWord(it.word)}
              style={{position:"absolute",left:it.x,top:it.y,background:bg,border:brd,color:col,borderRadius:"8px",padding:"6px 12px",fontSize:"13px",fontWeight:"700",userSelect:"none",whiteSpace:"nowrap",cursor:canClick?"pointer":"default",transition:"all 0.2s",boxShadow:glow,transform:`scale(${sc})`,display:"flex",alignItems:"center",gap:"4px"}}>
              {it.word}
              {showDots&&clickers.length>0&&(
                <span style={{display:"flex",gap:"2px",marginLeft:"3px"}}>
                  {clickers.map(([p])=><span key={p} title={p} style={{width:"7px",height:"7px",borderRadius:"50%",background:players[p]?.color||"#6366f1",display:"inline-block"}}/>)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {isTeacher?(
        <div style={{padding:"12px 16px",background:"rgba(0,0,0,0.65)",borderTop:"2px solid rgba(245,158,11,0.25)"}}>
          {curQ&&(phase==="active"||phase==="revealed")&&(
            <div style={{background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.28)",borderRadius:"10px",padding:"9px 16px",marginBottom:"10px",display:"flex",alignItems:"center",gap:"14px",flexWrap:"wrap"}}>
              <span style={{color:"#f59e0b",fontSize:"11px",fontWeight:"900",whiteSpace:"nowrap"}}>👩‍🏫 선생님 전용</span>
              <span style={{color:"#fde68a",fontSize:"14px",flex:1}}>{curQ.q}</span>
              <span style={{color:"#34d399",fontWeight:"900",fontSize:"16px",whiteSpace:"nowrap"}}>✅ {curQ.a}</span>
            </div>
          )}
          <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",background:"rgba(255,255,255,0.04)",borderRadius:"8px",padding:"8px 14px",border:"1px solid rgba(255,255,255,0.1)"}}>
              <span style={{color:"#94a3b8",fontSize:"13px",whiteSpace:"nowrap"}}>문제 수:</span>
              <input type="number" min="1" max="50" value={numQ} onChange={e=>setNumQ(Math.min(50,Math.max(1,+e.target.value||1)))}
                style={{width:"52px",padding:"4px 8px",borderRadius:"6px",border:"1px solid rgba(99,102,241,0.4)",background:"rgba(99,102,241,0.1)",color:"#a5b4fc",fontSize:"15px",fontWeight:"900",outline:"none",textAlign:"center"}}/>
              <span style={{color:"#475569",fontSize:"12px"}}>/ 50</span>
            </div>
            {(phase==="waiting"||phase==="finished")&&(
              <button onClick={phase==="finished"?restart:startGame}
                style={{padding:"10px 22px",borderRadius:"8px",background:"linear-gradient(135deg,#f59e0b,#ef4444)",border:"none",color:"#fff",fontWeight:"900",cursor:"pointer",fontSize:"14px",whiteSpace:"nowrap"}}>
                {phase==="finished"?"🔄 재시작":"▶ 게임 시작!"}
              </button>
            )}
            {phase==="active"&&timeExpired&&(
              <button onClick={doReveal}
                style={{padding:"10px 18px",borderRadius:"8px",background:"rgba(239,68,68,0.2)",border:"1px solid #ef4444",color:"#fca5a5",fontWeight:"900",cursor:"pointer",fontSize:"13px",whiteSpace:"nowrap"}}>
                ⌛ 시간 초과 — 정답 공개
              </button>
            )}
            {phase==="revealed"&&!winner&&(
              <button onClick={manualNext}
                style={{padding:"10px 18px",borderRadius:"8px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"#fff",fontWeight:"900",cursor:"pointer",fontSize:"13px",whiteSpace:"nowrap"}}>
                ➡ 다음 문제 {qi+1<totalQ?`(${qi+2}/${totalQ})`:"(마지막)"}
              </button>
            )}
            {(phase==="active"||phase==="revealed")&&(
              <button onClick={restart}
                style={{padding:"10px 16px",borderRadius:"8px",background:"rgba(239,68,68,0.08)",border:"1px solid #ef444430",color:"#ef4444",fontWeight:"900",cursor:"pointer",fontSize:"13px",whiteSpace:"nowrap"}}>
                🔄 재시작
              </button>
            )}
            <button onClick={resetAll}
              style={{padding:"10px 14px",borderRadius:"8px",background:"rgba(120,113,108,0.08)",border:"1px solid rgba(120,113,108,0.3)",color:"#a8a29e",fontWeight:"900",cursor:"pointer",fontSize:"13px",whiteSpace:"nowrap",marginLeft:"auto"}}>
              🗑 전체 초기화
            </button>
          </div>
        </div>
      ):(
        <div style={{padding:"10px 16px",background:"rgba(0,0,0,0.5)",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",gap:"10px",minHeight:"46px"}}>
          <span style={{background:"rgba(99,102,241,0.15)",border:"1px solid #6366f144",color:"#a5b4fc",fontSize:"11px",fontWeight:"900",padding:"3px 10px",borderRadius:"6px",flexShrink:0}}>🎮 플레이어</span>
          {phase==="waiting"&&<span style={{color:"#475569",fontSize:"13px"}}>선생님이 게임을 시작하기를 기다리는 중...</span>}
          {phase==="active"&&!myClicked&&!isLocked&&!timeExpired&&<span style={{color:"#fbbf24",fontSize:"13px",fontWeight:"700"}}>👆 정답이라고 생각하는 단어를 클릭하세요!</span>}
          {phase==="active"&&isLocked&&<span style={{color:"#f87171",fontSize:"13px",fontWeight:"700"}}>🚫 오답! 이번 문제 참여 불가</span>}
          {phase==="active"&&myClicked&&!isLocked&&<span style={{color:"#94a3b8",fontSize:"13px"}}>⏳ 다른 플레이어를 기다리는 중...</span>}
          {phase==="active"&&timeExpired&&!isLocked&&!myClicked&&<span style={{color:"#94a3b8",fontSize:"13px"}}>⌛ 시간 초과! 선생님이 정답을 공개합니다...</span>}
          {phase==="revealed"&&winner===myName&&<span style={{color:"#34d399",fontSize:"14px",fontWeight:"900"}}>🎉 정답! 1등!</span>}
          {phase==="revealed"&&winner&&winner!==myName&&<span style={{color:"#94a3b8",fontSize:"13px"}}>👏 {winner}님이 정답!</span>}
          {phase==="revealed"&&!winner&&<span style={{color:"#94a3b8",fontSize:"13px"}}>⌛ 시간 초과! 정답을 확인하세요.</span>}
          {phase==="finished"&&<span style={{color:"#f59e0b",fontSize:"13px",fontWeight:"700"}}>🏁 게임 종료! 최종 순위를 확인하세요!</span>}
          <span style={{color:"#334155",fontSize:"12px",marginLeft:"auto",whiteSpace:"nowrap"}}>{myName}</span>
        </div>
      )}

      <style>{`
        @keyframes pop{0%{opacity:1;transform:translate(-50%,-50%) scale(0.3);}55%{opacity:1;transform:translate(-50%,-50%) scale(1.5);}100%{opacity:0;transform:translate(-50%,-50%) scale(1.7);}}
      `}</style>
    </div>
  );
}