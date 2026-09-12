// ── 효과음 (Web Audio API 합성, 외부 파일 없음) ─────────────────
// 브라우저 정책상 첫 사용자 클릭 이후에만 소리가 납니다. 입장 버튼 클릭 시 unlock() 호출.

let ctx = null;
let muted = (() => { try { return localStorage.getItem("wb_muted") === "1"; } catch { return false; } })();

function getCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function unlock() { getCtx(); }
export function isMuted() { return muted; }
export function setMuted(v) {
  muted = !!v;
  try { localStorage.setItem("wb_muted", muted ? "1" : "0"); } catch {}
}

// 단일 음: freq(Hz), 시작 지연 t(초), 길이 dur(초), 파형, 볼륨
function tone(freq, t = 0, dur = 0.15, type = "sine", vol = 0.25, slideTo = null) {
  const c = getCtx(); if (!c || muted) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  const t0 = c.currentTime + t;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

// 짧은 노이즈 (오답 버저용)
function buzz(t = 0, dur = 0.25, vol = 0.18) {
  const c = getCtx(); if (!c || muted) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sawtooth";
  const t0 = c.currentTime + t;
  o.frequency.setValueAtTime(160, t0);
  o.frequency.linearRampToValueAtTime(90, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

export const SFX = {
  // 누군가 입장
  join()    { tone(660, 0, 0.08, "triangle", 0.18); tone(880, 0.09, 0.12, "triangle", 0.18); },
  // 새 문제 시작
  start()   { tone(523, 0, 0.1, "square", 0.12); tone(659, 0.1, 0.1, "square", 0.12); tone(784, 0.2, 0.18, "square", 0.14); },
  // 내가 정답
  correct() { tone(784, 0, 0.12, "sine", 0.28); tone(988, 0.12, 0.12, "sine", 0.28); tone(1319, 0.24, 0.3, "sine", 0.3); },
  // 내가 오답
  wrong()   { buzz(0, 0.28); },
  // 다른 사람이 정답
  otherWin(){ tone(880, 0, 0.1, "triangle", 0.16); tone(1175, 0.1, 0.2, "triangle", 0.16); },
  // 시간 초과 (아무도 못 맞힘)
  timeout() { tone(440, 0, 0.18, "triangle", 0.2, 330); tone(330, 0.2, 0.3, "triangle", 0.2, 220); },
  // 마지막 10초 째깍
  tick()    { tone(1200, 0, 0.04, "square", 0.08); },
  // 마지막 3초 째깍 (조금 더 크게)
  tickHot() { tone(1500, 0, 0.05, "square", 0.14); },
  // 게임 종료 팡파르
  finish()  {
    const n=[523,659,784,1047,784,1047];
    n.forEach((f,i)=>tone(f, i*0.13, i===n.length-1?0.6:0.14, "triangle", 0.22));
  },
  // 버튼 클릭
  click()   { tone(900, 0, 0.05, "sine", 0.1); },
};
