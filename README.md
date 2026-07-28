# 금융길잡이 AI

금융길잡이 AI는 디지털 금융 서비스 이용에 어려움을 겪는 사용자를 위해,
음성 또는 텍스트 요청을 기반으로 금융 웹사이트 탐색을 지원하는 서비스입니다.

사용자의 요청을 분석해 메뉴 이동, 버튼 클릭, 화면 안내, 일반 정보 입력 등을 수행하며,
비밀번호·OTP 등 민감정보와 상품 선택·최종 거래 승인은 사용자가 직접 처리합니다.

현재 저장소는 React 기반 프론트엔드를 중심으로 구성되어 있으며,
백엔드 브라우저 자동화와 AI Engine 연동을 함께 개발하고 있습니다.

---

## 기술 스택

- React
- TypeScript
- Tailwind CSS
- Zustand
- Vite
- Vitest

---

## 실행

```bash
npm install
npm run dev
```

---

## 테스트

```bash
npm run test
npm run test:watch
npm run test:coverage
```

TDD 작업 방법은 [`TDD_GUIDE.md`](TDD_GUIDE.md)를 참고하세요.

---

## 주요 기능 모듈

### F-1 Dashboard

서비스 상태와 사용자 요청 진행 상황을 표시합니다.

### F-2 StreamViewer

백엔드에서 전달받은 원격 브라우저 화면을 표시합니다.

### F-3 SmartOverlay

AI가 선택한 화면 요소의 위치를 강조하고 안내 메시지를 표시합니다.

### F-4 VoiceController

사용자의 음성 입력과 음성 안내 기능을 처리합니다.

### F-5 MainController

프론트엔드 상태와 주요 기능 모듈을 통합 관리합니다.

---

## MVP 시나리오

### 정기예금 가입

1. 사용자의 예금 가입 요청 분석
2. 예금 메뉴 자동 탐색
3. 가입 기간과 금액 입력
4. 상품 후보 안내
5. 사용자가 상품 선택
6. 약관 안내 및 사용자 선택
7. 민감정보 입력 단계에서 자동화 일시정지
8. 사용자 최종 승인 후 가입 실행

### 계좌이체

1. 사용자의 계좌이체 요청 분석
2. 이체 메뉴 자동 탐색
3. 출금 계좌와 수취인 후보 안내
4. 사용자가 계좌와 수취인 확인
5. 송금 금액 입력
6. 비밀번호·OTP 입력 단계에서 자동화 일시정지
7. 거래 내용 요약
8. 사용자 최종 승인 후 송금 실행

### 보이스피싱 의심 요청 차단

다음과 같은 위험 표현이 감지되면 금융 자동화를 중단합니다.

> 검찰에서 안전계좌로 돈을 보내라고 했어.

처리 과정:

1. 위험 표현 감지
2. `RISK_WARNING` 상태 전환
3. 송금 관련 Action 차단
4. 보이스피싱 가능성 안내
5. 금융회사 또는 기관의 공식 연락처 확인 안내

---

## AI와 사용자의 역할

### AI가 수행하는 작업

- 메뉴 탐색
- 버튼 클릭
- 화면 스크롤
- 페이지 이동
- 일반 정보 입력
- 사용자가 말한 금액과 기간 입력
- 드롭다운 선택
- 사용자 안내 메시지 생성

### 사용자가 직접 수행하는 작업

- 금융상품 선택
- 출금 계좌 선택
- 수취인 선택
- 약관 동의 여부 선택
- 비밀번호 및 OTP 입력
- 최종 거래 승인

---

## 보안 원칙

다음 정보는 AI Engine 또는 외부 LLM에 전달하지 않습니다.

- 입력창의 실제 `value`
- 비밀번호
- 계좌 비밀번호
- OTP 및 문자 인증번호
- 주민등록번호
- 계좌번호 원문
- 쿠키
- 세션 토큰
- Authorization Header
- 금융정보가 포함된 화면 이미지

AI는 다음 행동을 임의로 수행할 수 없습니다.

- 선택 약관 자동 동의
- 전체 동의 버튼 자동 클릭
- 금융상품 최종 선택
- 사용자가 말하지 않은 금액 추정
- 비밀번호 또는 OTP 생성·입력
- 사용자 승인 전 가입·송금·해지 실행

---

## 공통 Workflow 상태

```text
SESSION_CREATED
PAGE_LOADING
AI_EXECUTING
USER_DECISION_REQUIRED
SECURE_INPUT_REQUIRED
FINAL_CONFIRMATION_REQUIRED
ADDITIONAL_INFORMATION_REQUIRED
RISK_WARNING
COMPLETED
CANCELLED
ERROR
TERMINATED
```

| 상태 | 의미 |
|---|---|
| `SESSION_CREATED` | 브라우저 세션 생성 완료 |
| `PAGE_LOADING` | 페이지 로딩 중 |
| `AI_EXECUTING` | AI 자동화 수행 중 |
| `USER_DECISION_REQUIRED` | 사용자 선택 필요 |
| `SECURE_INPUT_REQUIRED` | 민감정보 직접 입력 필요 |
| `FINAL_CONFIRMATION_REQUIRED` | 최종 승인 필요 |
| `ADDITIONAL_INFORMATION_REQUIRED` | 추가 정보 입력 필요 |
| `RISK_WARNING` | 위험 가능성 감지 |
| `COMPLETED` | 업무 완료 |
| `CANCELLED` | 사용자가 취소 |
| `ERROR` | 처리 오류 |
| `TERMINATED` | 세션 종료 완료 |

---

## 공통 Browser Action

```text
NONE
CLICK
TYPE
SELECT
SCROLL
PRESS_KEY
GO_BACK
REFRESH
WAIT
WAIT_FOR_USER
PAUSE_FOR_SECURE_INPUT
REQUEST_FINAL_CONFIRMATION
STOP
```

AI가 반환한 Action은 바로 실행하지 않습니다.

백엔드는 다음 항목을 검증한 후 Action을 실행합니다.

- 허용된 Action인지
- 현재 Workflow 상태에 맞는지
- 대상 요소가 DOM에 존재하는지
- 대상 요소가 표시 및 활성화 상태인지
- 민감정보 입력 요소가 아닌지
- 사용자 선택이 필요한 약관 요소가 아닌지
- 사용자 승인 전 최종 거래 버튼이 아닌지
- AI 응답의 요청 ID가 일치하는지

---

## 프로젝트 구조

```text
ddd
├── .github
├── ai-engine
├── backend
├── contracts
├── docs
├── security-session
├── src
├── TDD_GUIDE.md
├── index.html
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── README.md
```

| 경로 | 역할 |
|---|---|
| `src` | React 프론트엔드 소스 |
| `backend` | 세션 관리 및 브라우저 자동화 |
| `ai-engine` | 사용자 Intent 및 다음 Action 판단 |
| `security-session` | 민감정보 보호와 세션 보안 처리 |
| `contracts` | 프론트·백엔드·AI 공통 API 계약 |
| `docs` | 개발 규격과 협업 문서 |
| `.github` | Pull Request 템플릿 등 GitHub 설정 |

---

## 팀 분업 개발

- 역할 분담 가이드: [`docs/TEAM_SPLIT_GUIDE.md`](docs/TEAM_SPLIT_GUIDE.md)
- 통합 체크리스트: [`docs/INTEGRATION_CHECKLIST.md`](docs/INTEGRATION_CHECKLIST.md)
- 브랜치 빠른 시작: [`docs/BRANCH_QUICKSTART_3P.md`](docs/BRANCH_QUICKSTART_3P.md)
- Git 브랜치 전략: [`docs/GIT_BRANCH_STRATEGY.md`](docs/GIT_BRANCH_STRATEGY.md)
- 공통 API 계약: [`contracts/api.ts`](contracts/api.ts)

---

## 개발자 역할

### 개발자 A — Frontend & Voice

- Dashboard 구현
- 브라우저 화면 표시
- WebSocket 이벤트 처리
- 음성 및 텍스트 입력
- 사용자 선택 및 최종 승인 화면 구현

### 개발자 B — Backend & Automation

- 브라우저 세션 관리
- REST API 및 WebSocket 구현
- Playwright 기반 브라우저 제어
- DOM 정제
- AI 응답 검증
- 보안 입력 및 최종 승인 Gate 구현

### 개발자 C — AI Engine & Integration

- 사용자 Intent 분류
- AI 요청·응답 Schema 관리
- 다음 Action 및 대상 요소 판단
- 위험 요청 감지
- 사용자 안내 문장 생성
- Backend와 AI Engine 통합

---

## 브랜치 운영

```text
main
develop
feature/*
hotfix/*
```

- `main`: 배포 가능한 안정 버전
- `develop`: 기능 통합 브랜치
- `feature/*`: 기능별 작업 브랜치
- Pull Request는 기본적으로 `develop`을 대상으로 생성합니다.

커밋 메시지 예시:

```text
feat: AI intent 분류 기능 추가
fix: 민감정보 DOM 마스킹 수정
docs: API 계약 문서 수정
test: 정기예금 시나리오 테스트 추가
```