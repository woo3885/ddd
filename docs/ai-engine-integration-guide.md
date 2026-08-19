# AI Engine 통합 가이드

> **담당:** 개발자 C — AI Engine & Integration  
> **프로젝트:** 금융길잡이 AI  
> **대상 범위:** D1 ~ D23  
> **문서 목적:** Frontend(A), Backend(B), AI Engine(C) 간 통합을 위해 C 파트의 역할, 구현 현황, 입출력 계약, 안전 원칙 및 연동 시 주의사항을 한 문서에서 확인할 수 있도록 정리한다.  
> **마지막 정리 기준일:** 2026-08-19 (D23 AI Engine 계약 안정화 반영)

---

## 1. 문서 목적

이 문서는 개발자 C가 담당하는 AI Engine의 전체 구조와 D1~D23까지의 주요 구현 내용을 정리한 통합 가이드이다.

Frontend(A)와 Backend(B) 작업자는 이 문서를 통해 다음 내용을 빠르게 확인할 수 있다.

- AI Engine이 어떤 역할을 담당하는지
- AI Engine이 어떤 데이터를 입력으로 받는지
- AI Engine이 어떤 형태의 결과를 반환하는지
- 사용자 요청이 어떤 처리 단계를 거치는지
- Target `elementId`가 어떤 기준으로 선택되는지
- Gemini API 장애나 잘못된 응답 발생 시 어떻게 처리되는지
- 민감정보, 최종 거래, 위험 행동을 어떤 원칙으로 제한하는지
- A/B/C 통합 시 각 파트의 책임 경계가 어디인지

이 문서는 일자별 개발 일지가 아니라 **현재 AI Engine을 연동하기 위한 기준 문서**를 목적으로 한다.

---

# 2. AI Engine 역할

AI Engine은 사용자의 자연어 요청과 현재 웹페이지 정보를 분석하여, 다음에 수행해야 할 안전한 행동을 결정하는 역할을 담당한다.

주요 책임은 다음과 같다.

1. 사용자 의도(Intent) 분석
2. 사용자 목표(UserGoal) 추출
3. 현재 Workflow 상태 확인
4. Sanitized DOM 분석
5. 다음 행동(Next Action) 결정
6. 실행 대상(Target) `elementId` 선택
7. AI Structured Output 생성
8. 응답 Schema 검증
9. Confidence 기반 실행 가능 여부 판단
10. 민감정보·최종 거래·위험 행동 안전 정책 적용
11. Gemini API 장애 시 Retry / Cache / Fallback 처리

AI Engine은 브라우저를 직접 클릭하거나 좌표를 임의로 생성하는 실행 계층이 아니다.

---

# 3. 전체 시스템에서 C의 위치

```text
사용자
  ↓
Frontend (A)
  ↓
Backend (B)
  ↓
AI Engine (C)
  ├─ Intent 분석
  ├─ UserGoal 추출
  ├─ WorkflowContext 확인
  ├─ Sanitized DOM 분석
  ├─ Safety / Risk Policy
  ├─ Next Action 선택
  ├─ Target elementId 선택
  ├─ Confidence 판단
  └─ Structured Output 생성
  ↓
Backend (B)
  ↓
Frontend (A)
  ↓
상태 / 안내 메시지 / Target 표시
  ↓
Backend Automation
  ↓
실제 Browser Action
```

핵심 원칙:

> **AI Engine은 "무엇을 해야 하는지"와 "어떤 elementId를 대상으로 해야 하는지"를 판단한다.**

> **실제 좌표 변환과 Browser Action 실행은 Frontend / Backend의 Viewer 및 Automation 계층이 담당한다.**

---

# 4. AI Engine 디렉터리 개요

```text
ai-engine/
├─ src/
│  ├─ actions/
│  ├─ agent/
│  ├─ api/
│  ├─ clients/
│  ├─ confidence/
│  ├─ config/
│  ├─ dom/
│  ├─ finalAction/
│  ├─ goals/
│  ├─ intents/
│  ├─ output/
│  ├─ policies/
│  ├─ prompts/
│  ├─ risk/
│  ├─ secure/
│  ├─ services/
│  ├─ terms/
│  ├─ tests/
│  └─ index.ts
├─ package.json
└─ package-lock.json
```

| 경로 | 역할 |
|---|---|
| `clients/` | Gemini 등 외부 AI API Client |
| `config/` | 환경변수, 모델 설정 |
| `intents/` | 사용자 요청 Intent 분석 |
| `goals/` | 사용자 목표(UserGoal) 추출 |
| `dom/` | Sanitized DOM 변환 및 직렬화 |
| `actions/` | 다음 행동 및 Target 선택 관련 로직 |
| `agent/` | 내부 Agent Loop 및 상태 처리 |
| `api/` | Backend ↔ AI Engine HTTP Adapter |
| `prompts/` | Gemini에 전달할 System / Action Prompt |
| `policies/` | 안전, 위험, 실행 제한 정책 |
| `confidence/` | AI 판단 신뢰도 및 Fallback 기준 |
| `output/` | Structured Output Schema, Parser, Validator, Mapper, Fallback |
| `terms/` | 약관 관련 안전 판단 |
| `secure/` | 민감정보 입력 관련 안전 처리 |
| `finalAction/` | 최종 거래 확인 관련 처리 |
| `risk/` | 위험 탐지 및 경고 관련 처리 |
| `services/` | AI 호출 및 전체 처리 흐름 |
| `tests/` | 단위 / 계약 / 통합 / Gemini API 테스트 |

---

# 5. D1 ~ D23 주요 구현 이력

## D1 — 공통 규격 및 AI Engine 기반 정리
- 공통 API 계약 확인
- Session / DOM Snapshot / Remote Action 계약 확인
- A/B/C 책임 구분

## D2 — AI Engine 기본 골격 구축
- Gemini Client
- 환경 설정
- AI Service
- Engine 진입점 구성

## D3 — Intent 분석 1차 구현
대표 Intent:
`DEPOSIT`, `TRANSFER`, `INQUIRY`, `CHANGE`, `RISK`, `GENERAL`

## D4 — Prompt 및 Safety Policy 1차
- 위험 행동 제한
- 최종 거래 자동 실행 제한
- DOM에 없는 Target 생성 제한

## D5 — UserGoal 추출
Intent보다 구체적인 금액, 수취인, 조건 등의 목표 정보를 구조화.

## D6 — DOM 분석 및 Mapping
원본 HTML이 아닌 Sanitized DOM을 AI가 이해할 수 있는 형태로 변환.

## D7 — Next Action 및 Target 선택
UserGoal + Sanitized DOM 기준으로 `TYPE`, `CLICK` 등의 다음 행동과 `elementId`를 선택.

## D8 — Structured Output 기반 추가
Gemini 자연어 응답을 Backend가 처리할 수 있는 구조화 JSON으로 변환.

## D9 — 보안 강화
- 내부 IP / 비정상 Target 접근 제한
- 입력 Sanitization 강화

## D10 — WorkflowContext
현재 Workflow 상태를 AI 판단에 포함.

## D11 — 약관 관련 안전 처리
필수/선택 약관 구분 및 자동 동의 제한.

## D12 — 민감정보 처리
비밀번호·OTP 등은 일반 TYPE과 분리.

## D13 — 최종 거래 보호
최종 송금·가입·변경 확정 등은 사용자의 명시적 확인 필요.

## D14 — 위험 탐지
위험 감지 시 자동 Action보다 경고와 안전 안내를 우선.

## D15 — Confidence / Sanitized DOM / Target elementId 기준
AI는 Sanitized DOM에 실제 존재하는 `elementId`만 Target으로 사용.

## D16 — Gemini API 실제 연동
Gemini 호출, Cache 동작 및 실제 응답 확인.

## D17 — Retry / Cache / Timeout / Fallback
429, 503, Timeout 등 외부 API 장애를 재시도 후 Fallback 처리.

## D18 — Gemini Structured Output 통합
Parser → Schema Validator → 정상 응답 또는 Fallback 흐름 구성.

## D19 ~ D22 — 통합 준비 및 A/B 선행 작업 반영
D22에서는 Frontend Session Frame Viewer와 Backend Public Browser Action API 기반 사용자 CLICK/SCROLL 원격 조작이 연결되었다.

관련 문서:
`docs/frontend-d22-viewer-remote-actions.md`

---

## D23 — Backend 계약 정합성 및 Production Action 안정화

D23에서는 최신 Backend Production 계약에 맞춰 AI Engine의 실제 Action 출력 경로를 점검하고 안정화했다.

### 주요 목표

```text
C AI 판단
→ Backend가 실제 처리 가능한 Action만 반환
→ Backend Validator 통과
→ Production Target / 상태 이벤트 흐름과 연결
```

### Backend Production 응답 계약

현재 C → B `/api/ai/action` 응답은 다음 6개 필드 계약을 유지한다.

```text
actionType
elementId
value
scrollX
scrollY
waitMillis
```

D23에서는 Backend DTO를 확장하지 않고 현재 계약과의 정합성 확보를 우선했다.

### Production Action Allowlist

허용:

```text
CLICK
TYPE
NONE
WAIT_FOR_USER
PAUSE_FOR_SECURE_INPUT
REQUEST_FINAL_CONFIRMATION
STOP
```

Production structured-output에서는 차단:

```text
SELECT
PRESS_KEY
GO_BACK
REFRESH
SCROLL
WAIT
```

SCROLL과 WAIT는 현재 C가 Backend가 요구하는 payload를 완전히 제공하지 못하므로 Prompt / Schema / Adapter에서 차단한다.

### STOP 의미 통일

```text
STOP
→ STOPPED
→ TERMINATED
```

C에서도 STOP을 정상 완료로 사용하지 않는다.

```text
STOP = 종료 / 중단
COMPLETED = Production wire와 분리된 내부 상태
NONE = 현재 실행할 Action 없음
```

Production LLM은 `COMPLETED` 상태를 반환하지 못하도록 제한한다.

### requestId 신뢰 처리

```text
C requestId 생성
→ Prompt 전달
→ LLM 응답
→ Parser / Schema 검증
→ LLM이 반환한 requestId 폐기
→ C-generated requestId 재바인딩
```

현재 Backend wire에는 requestId가 포함되지 않으므로 A/B/C 전체 correlation ID 계약은 후속 과제이다.

### Backend D23 Production Target 연동

Backend는 AI가 반환한 `elementId`를 현재 Snapshot / Frame과 다시 검증한 뒤 다음 Target 정보를 생성한다.

```text
elementId
label
x
y
width
height
frameId
frameSequence
snapshotId
```

Target label과 실제 좌표는 C가 임의 생성하지 않는다.

### D23 테스트 구조

```text
npm test
→ 오프라인 단위 / 계약 회귀 테스트

npm run test:d23
→ D23 Backend 계약 전용 테스트

npm run test:live
→ Gemini 실제 API 연동 테스트
```

검증 결과:

```text
npm run check
→ 성공

npm test
→ 16 tests / 16 pass

npm run test:d23
→ 6 tests / 6 pass
```

### D23 C 파트 현재 상태

```text
Backend 6필드 wire 계약 유지        완료
Production Action allowlist         완료
SCROLL / WAIT Production 차단       완료
STOP / TERMINATED 의미 정합화       완료
COMPLETED Production 반환 차단      완료
C-generated requestId 신뢰 처리     완료
오프라인 회귀 테스트                 완료
D23 계약 테스트                     완료
```

D23 전체 완료는 A/B/C 실제 Production E2E 성공을 기준으로 한다.

---

# 6. AI Engine 입력

## 6.1 Production B → C 계약

현재 `/api/ai/action`의 Backend 요청은 다음 두 필드가 기준이다.

```text
userRequest
snapshot
```

```json
{
  "userRequest": "금리가 높은 예금 상품을 찾고 싶어요",
  "snapshot": {
    "schemaVersion": "...",
    "snapshotId": "...",
    "page": {
      "url": "...",
      "title": "..."
    },
    "elements": []
  }
}
```

Snapshot element에는 다음과 같은 정보가 포함될 수 있다.

```text
elementId
tag
role
text
ariaLabel
placeholder
inputType
visible
enabled
boundingBox
securityPolicy
```

## 6.2 C 내부 변환

```text
requestId
UserGoal
DOM Snapshot
AI 판단 Context
```

현재 requestId는 C 내부 생성값이며 Backend가 전달하는 외부 correlation ID는 아니다.

---

# 7. AI Engine 출력

## 7.1 C 내부 Structured Output

```text
requestId
status
action
targetElementId
inputValue
message
confidence
requiresUserAction
decisionType
secureInputType
riskType
options
confirmationId
summary
```

이 정보 전체가 현재 Backend로 전달되는 것은 아니다.

## 7.2 Production C → B wire response

```text
actionType
elementId
value
scrollX
scrollY
waitMillis
```

예:

```json
{
  "actionType": "CLICK",
  "elementId": "el-a1b2c3d4-001",
  "value": null,
  "scrollX": null,
  "scrollY": null,
  "waitMillis": null
}
```

D23에서는 이 6필드 계약을 유지한다.

message, decision/options, secure/final/risk metadata 등의 확장 계약은 후속 일정에서 Backend와 함께 확장한다.

---

# 8. Target elementId 원칙

## 8.1 기본 원칙

```text
AI Engine은 Sanitized DOM에 존재하는 elementId만 선택한다.
```

AI는 임의 좌표나 임의 Target 이름을 실행 식별자로 만들지 않는다.

## 8.2 좌표 책임

```text
AI Engine
→ elementId 선택

Backend
→ 현재 Snapshot / Frame 기준 element 검증
→ 좌표 및 label 산출
→ Target 이벤트 생성
→ Browser Action 실행

Frontend
→ Viewer / Overlay 표시
```

## 8.3 존재하지 않는 Target

```text
Target elementId
↓
현재 DOM과 대조
↓
존재함 → 다음 처리
존재하지 않음 → 실행 금지 / Fallback / 재판단
```

---

# 9. Structured Output 검증

```text
Gemini Raw Response
↓
Parser
↓
Schema Validator
↓
Policy / Confidence
↓
사용 가능한 AI Response
```

실행 금지 조건:

- JSON 파싱 실패
- 필수 필드 누락
- 허용되지 않은 Action type
- Target 누락
- Schema와 다른 자료형
- 존재하지 않는 `elementId`
- Safety Policy 위반
- Production에서 허용되지 않는 `COMPLETED`
- Production 미지원 Action(SCROLL / WAIT 등)

---

# 10. Confidence 및 Fallback

낮은 Confidence나 불확실한 상황에서는 자동 실행보다 안전한 Fallback을 우선한다.

현재 Production C → B wire response는 6필드 Action 중심 계약이므로 C 내부의 풍부한 Fallback metadata가 모두 Backend로 전달되는 구조는 아니다.

---

# 11. Gemini 장애 처리

대응 대상:

```text
HTTP 429
HTTP 503
Timeout
일시적 네트워크 오류
비정상 응답
```

```text
요청
↓
Cache
↓
Gemini
↓
실패
↓
Retry
↓
재실패
↓
Fallback
```

---

# 12. Safety Policy

## 12.1 일반 탐색
메뉴 이동, 검색, 페이지 이동, 일반 정보 확인 등은 안전 조건을 만족하면 자동 안내 가능.

## 12.2 민감정보
비밀번호·OTP 등은 일반 TYPE과 분리.

## 12.3 약관
사용자가 확인해야 하는 약관은 AI가 임의 동의하지 않는다.

## 12.4 최종 거래
최종 송금·가입·변경 확정 등은 사용자의 명시적 확인 필요.

## 12.5 위험 상황
위험이 감지되면 Action보다 경고와 안전 안내를 우선한다.

---

# 13. A / B / C 역할 경계

## 개발자 A — Frontend
- 사용자 입력
- Viewer 표시
- 상태 표시
- 안내 message 표시
- Target 시각화
- Production UI event 수신
- 상태별 Panel 전환

## 개발자 B — Backend & Automation
- Session 관리
- AI Engine 호출
- AI 응답 검증
- Browser Action 실행
- Frame / sequence 관리
- 최종 WorkflowStatus 결정
- Production UI event 발행
- Target 좌표 / label / frame 관계 검증

## 개발자 C — AI Engine
- Intent
- UserGoal
- WorkflowContext 판단
- Sanitized DOM 분석
- Next Action
- Target elementId
- Safety Policy
- Confidence
- Structured Output
- Gemini
- Retry / Cache / Fallback
- Production Action allowlist
- Backend wire 계약 정합성

C는 최종 WorkflowStatus를 직접 확정하지 않는다.

---

# 14. C가 보장하는 것 / 보장하지 않는 것

## C가 보장해야 하는 것

- Schema에 맞는 AI 응답
- Parser / Validator 통과
- 실제 DOM `elementId` 기반 Target 선택
- 낮은 Confidence에서 자동 실행 억제
- 민감정보 / 최종 거래 / 위험 Safety Policy
- Retry 및 Fallback
- 미지원 Production Action 차단
- STOP을 종료 / 중단 의미로 처리
- Production LLM의 `COMPLETED` 반환 차단
- C-generated requestId를 내부 authoritative 값으로 유지

## C가 직접 보장하지 않는 것

- 실제 Browser 좌표 계산
- Viewer 좌표 변환
- Browser Action 실행
- 실제 DOM hit-test
- Backend Session / Frame sequence
- Frontend 상태 UI
- Backend 최종 보안 검증
- 최종 WorkflowStatus
- Target authoritative label
- A/B/C 전체 correlation ID

---

# 15. D22 Public Browser Action 계약 참고

```text
POST /api/v1/sessions/{sessionId}/actions
```

D22 Public API는 `source=USER_VIEWER` 기반 실제 Viewer 사용자 Action용이며 AI Action은 별도 경로를 사용한다.

---

# 16. 통합 시 권장 Golden Scenario

후보:

```text
금리가 높은 예금 상품을 찾고 싶어요
```

예상 흐름:

```text
사용자 입력
↓
Intent = DEPOSIT
↓
UserGoal
↓
현재 DOM
↓
TYPE
↓
새 DOM / Frame
↓
CLICK
↓
검색 결과
```

> **주의:** 실제 E2E 시나리오는 Demo Bank의 최신 Sanitized DOM에 해당 요소가 실제 존재하는지 확인한 뒤 최종 확정한다.

---

# 17. 통합 시 확인해야 할 실패 시나리오

- Gemini Timeout
- Gemini 429 / 503
- 잘못된 JSON
- Schema 불일치
- 존재하지 않는 Target
- 낮은 Confidence
- 최종 금융거래
- Production 미지원 Action
- `COMPLETED + NONE` 생성 시도

`COMPLETED + NONE`은 Production Schema에서 거부되고 Fallback 처리된다.

---

# 18. 개발 및 검증 명령

```powershell
cd C:\2026finance\ddd\ai-engine

npm.cmd run check
npm.cmd test
npm.cmd run test:d23
npm.cmd run test:live
```

D23 기준:

```text
npm.cmd run check
→ 성공

npm.cmd test
→ 16 tests / 16 pass

npm.cmd run test:d23
→ 6 tests / 6 pass
```

`test:live`는 Gemini API Key 및 네트워크가 필요하므로 기본 회귀 테스트와 분리한다.

---

# 19. Git / Branch 기준

C 작업 브랜치:

```text
feature/ai-schema-and-policy
```

공통 통합 브랜치:

```text
develop
```

작업 완료 후:

```powershell
git add ai-engine docs/ai-engine-integration-guide.md
git status
git commit -m "<작업 내용>"
git push origin feature/ai-schema-and-policy
```

이후 `develop` 대상 Pull Request 생성.

---

# 20. A/B 작업자가 C와 연동할 때 반드시 알아야 할 핵심

1. AI Engine Target은 `elementId` 기반이다.
2. AI Engine은 임의 x/y 좌표를 생성하지 않는다.
3. Gemini Raw Response를 직접 실행하지 않는다.
4. Parser / Validator / Safety / Confidence 검증 후 사용한다.
5. Gemini 장애 시 Retry / Fallback을 지원한다.
6. 민감정보 입력은 일반 TYPE과 분리한다.
7. 최종 금융거래는 명시적 사용자 확인이 필요하다.
8. Target은 현재 DOM에 존재하는지 Backend에서 다시 검증한다.
9. Backend의 보안 검증이 최종 우선권을 가진다.
10. 현재 requestId는 C 내부 추적용이며 A/B/C 전체 correlation ID는 후속 계약이다.
11. USER_VIEWER Action과 AI Production Action은 별도 계약이다.
12. D23 Production Action은 allowlist 기반으로 제한한다.
13. STOP은 정상 완료가 아니라 종료 / 중단 의미이다.
14. 최종 WorkflowStatus는 Backend가 결정한다.

---

# 21. D23 이후 문서 갱신 원칙

다음 변경 시 본 문서를 함께 갱신한다.

```text
AI Response Schema 변경
Target 계약 변경
WorkflowStatus 변경
Action Type 추가
Production Action allowlist 변경
Fallback 정책 변경
Safety Policy 변경
Gemini 모델 / Client 구조 변경
A/B/C API 계약 변경
requestId / correlation ID 계약 변경
정상 완료 wire 계약 추가
상태별 payload 확장
```

---

# 22. 현재 상태 요약

D23 C 파트에서는 최신 Backend Production 계약에 맞춰 Action 출력 경로를 안정화했다.

```text
Production Action allowlist
+
STOP / TERMINATED 의미 통일
+
COMPLETED Production 차단
+
requestId 신뢰 경계 강화
+
D23 계약 회귀 테스트
```

Backend D23에서는 Production UI event envelope와 Target / Target Clear 흐름이 추가되었다.

현재 남은 최종 단계:

```text
A Production live event 연결
→ A/B/C 동일 시나리오 E2E
→ 상태 / message / Target / Frame 전체 확인
```

D23 최종 완료 기준:

> **A·B·C 세 팀이 동일한 시나리오에서 상태·메시지·Target 흐름을 끝까지 성공시키는 것**

---

## 관련 문서

```text
docs/D15_Sanitized_DOM_Target_elementId_통합규격_v1.0.md
docs/frontend-d22-viewer-remote-actions.md
```

본 문서는 위 세부 문서를 대체하지 않으며, AI Engine 전체 구조와 A/B/C 통합 관점을 빠르게 파악하기 위한 상위 가이드 역할을 한다.
