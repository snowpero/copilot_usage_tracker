# Copilot Usage Tracker — Chrome Extension

GitHub Copilot Premium Request 사용량을 브라우저 툴바에서 바로 확인하는 크롬 확장입니다.

## 설치 방법

### 1. 크롬 확장 관리 페이지 열기
```
chrome://extensions
```

### 2. 개발자 모드 활성화
우측 상단 **"개발자 모드"** 토글 ON

### 3. 확장 로드
**"압축해제된 확장 프로그램을 로드합니다"** 클릭
→ 이 폴더(`copilot-extension/`) 선택

### 4. 토큰 설정
툴바의 🤖 아이콘 클릭 → **설정 탭** → Token/Username 입력 → 저장

---

## GitHub Token 발급

1. https://github.com/settings/tokens?type=beta 접속
2. **"Generate new token (Fine-grained)"** 선택
3. 설정:
   - Resource owner: 본인 계정
   - Permissions → Account permissions → **Plan: Read-only**
4. 토큰 복사 (`github_pat_` 으로 시작)

---

## 주요 기능

- 📊 이번 달 Premium Request 사용량
- 📅 7일 추정 사용량 (일평균 기반)
- 🍩 모델별 사용량 도넛 차트
- 📈 진행 바 (70% 노란색, 90% 빨간색 경고)
- 🔔 한도 80/90/100% 도달 시 데스크탑 알림
- 🔄 1시간마다 백그라운드 자동 갱신

---

## 프로젝트 구조

```
copilot-extension/
├── manifest.json      ← 확장 설정 (Manifest V3)
├── popup.html         ← 팝업 UI
├── popup.js           ← 팝업 로직
├── background.js      ← 백그라운드 서비스 워커
├── core/
│   ├── api.js         ← GitHub API 호출
│   ├── parser.js      ← 데이터 파싱 (웹 버전과 동일)
│   └── storage.js     ← chrome.storage.local 관리
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 아이콘 출처

Robot icon by [Oksana Latysheva](https://thenounproject.com/creator/latyshevaoksana/) from [Noun Project](https://thenounproject.com/icon/robot-933476/) (CC BY 3.0)

---

## 웹 버전과의 차이

| 항목 | 웹 버전 | 크롬 확장 |
|---|---|---|
| 토큰 관리 | .env 파일 | chrome.storage.local |
| API 호출 | Node.js 서버 경유 | 브라우저 직접 호출 |
| 알림 | 없음 | 데스크탑 알림 |
| 자동 갱신 | 없음 | 1시간마다 백그라운드 |
