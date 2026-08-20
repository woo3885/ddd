# AI Engine

담당: 개발자 C — AI Engine & Integration

사용자의 요청과 웹사이트 정보를 분석하여 다음 행동을 결정하고, 사용자에게 안내 메시지를 생성하는 AI 모듈입니다.

## 주요 역할

* 사용자 의도 분류
* DOM Snapshot 분석
* 다음 클릭 대상 추론
* 사용자 안내 메시지 생성
* Backend Automation 모듈과의 연동
* 구조화된 AI 응답 생성

## 기술 스택

* Node.js
* TypeScript
* Google Gemini API
* Google Gen AI SDK
* dotenv

## 프로젝트 구조

```text
ai-engine/
├─ src/
│  ├─ clients/
│  │  └─ gemini.client.ts
│  ├─ config/
│  │  └─ env.ts
│  ├─ services/
│  │  └─ ai.service.ts
│  └─ index.ts
├─ .env.example
├─ .gitignore
├─ package.json
├─ package-lock.json
├─ tsconfig.json
└─ README.md
```

## 환경 요구사항

* Node.js 18 이상
* Gemini API Key

현재 개발 환경에서는 Node.js v24.15.0을 사용합니다.

## 설치

```bash
cd ai-engine
npm install
```

## 환경변수 설정

`.env.example` 파일을 복사하여 `.env` 파일을 생성합니다.

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash
```

실제 API 키가 포함된 `.env` 파일은 Git에 커밋하지 않습니다.

## 실행

AI Engine을 실행합니다.

```bash
npm start
```

개발 중 파일 변경을 감지하여 자동 재실행하려면 다음 명령을 사용합니다.

```bash
npm run dev
```

## 타입 검사

```bash
npm run check
```

## 빌드

```bash
npm run build
```

빌드가 완료되면 `dist` 폴더에 JavaScript 파일이 생성됩니다.

## 현재 구현 상태

* Gemini API 환경변수 설정
* 필수 환경변수 검증
* Gemini Client 생성
* 기본 AI Service 생성
* 텍스트 프롬프트 전송
* Gemini 응답 출력
* TypeScript 타입 검사
* TypeScript 빌드

현재 AI Engine의 기본 데이터 흐름은 다음과 같습니다.

```text
.env
  ↓
config/env.ts
  ↓
clients/gemini.client.ts
  ↓
services/ai.service.ts
  ↓
index.ts
  ↓
Gemini API
```

## 공통 계약

프론트엔드, 백엔드 및 AI Engine 사이의 공통 요청·응답 타입은 다음 파일을 기준으로 합니다.

```text
contracts/api.ts
```

주요 공통 타입:

* `SystemStatus`
* `CreateSession`
* `DomSnapshot`
* `ClickableElement`
* `RemoteAction`

AI Engine은 향후 `DomSnapshot`과 사용자 요청을 입력받아 다음 행동을 구조화된 형태로 반환합니다.

## 향후 구현 범위

* 사용자 요청 intent 분류
* `DomSnapshot` 입력 처리
* 클릭 가능한 요소 분석
* 다음 target 추론
* `CLICK`, `INPUT`, `SCROLL`, `BACK` 행동 결정
* guide message 생성
* JSON 기반 구조화 응답
* Backend Automation 모듈 연동
* 오류 및 재시도 처리

## 보안 주의사항

* `.env` 파일은 Git에 커밋하지 않습니다.
* Gemini API Key를 소스 코드에 직접 작성하지 않습니다.
* 로그에 API Key나 민감한 사용자 정보를 출력하지 않습니다.
* AI 응답을 바로 실행하지 않고 공통 계약에 따라 검증한 후 사용합니다.
