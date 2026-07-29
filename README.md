# 50개의 단어 속에 정답을 찾아라 🔎 (구 AI 워드 배틀)

AI 용어를 배우며 즐기는 **실시간 멀티플레이 단어 퀴즈 게임**입니다.
화면에 흩어진 50개의 AI 단어 중에서, 문제에 맞는 답을 가장 먼저 찾아 클릭하세요.
제한 시간 안에 더 많이 맞힌 사람이 승리합니다!

## 🎮 바로 해보기
https://ai-word-battle.vercel.app

## 게임 방법
- **학생**: 닉네임을 입력하고 입장 → 문제를 읽고 화면에서 정답 단어를 클릭
- **선생님**: 문제 수를 정하고 게임 시작 → 실시간으로 학생들의 점수·순위 확인
- 제한 시간(라운드당 60초) 동안 가장 많이 맞힌 사람이 승리!

## 선생님 모드 들어가는 법
- 주소 뒤에 `?mode=admin` 을 붙이세요 (예: `사이트주소/?mode=admin`)
- 예전 방식인 `#leethemom` 도 그대로 동작합니다
- 선생님 비밀번호를 입력하면 관리 화면이 나옵니다
- ⚠️ 포크해서 쓰실 분은 `src/App.jsx`의 `T_PASS` 값을 본인 비밀번호로 바꾸세요

## 기술 스택
- React + Vite
- Firebase Realtime Database (실시간 동기화)

## 실행 방법
```bash
npm install
npm run dev
```

## 포크해서 직접 쓰려면 (중요)
이 게임은 Firebase 데이터베이스를 사용합니다.
**본인 Firebase 프로젝트를 만들어 연결하지 않으면 원본과 데이터가 섞입니다.**

1. 이 저장소를 Fork
2. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트 생성 → Realtime Database 만들기
3. `src/App.jsx` 맨 위의 `FIREBASE_CONFIG` 를 본인 프로젝트 설정으로 교체
4. Authentication → 익명(Anonymous) 로그인 사용 설정
5. Realtime Database 규칙을 아래 보안 규칙으로 설정
6. Vercel 등에 배포

보안 규칙:
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

## 라이선스
자유롭게 수업에 활용하세요. 개선 제안(Pull Request) 환영합니다! 🙌
