# 3인 역할 분담 개발 가이드 — A/B/C

## 목표

세 명의 개발자가 담당 경로를 기준으로 충돌 없이 병렬 개발하고,
공통 계약을 기반으로 `develop` 브랜치에서 빠르게 통합합니다.

---

## 1. 개발자 A — Frontend & Voice

### 담당 범위

- F-1 Dashboard
- F-2 StreamViewer
- F-3 SmartOverlay
- F-4 VoiceController
- F-5 MainController

### 작업 경로

```text
src/**
```

### 상세 업무

- 메인 Dashboard와 URL 입력 UI
- 서비스 상태 및 진행 과정 표시
- 브라우저 스트림 렌더링
- Target Highlight 및 보안 블러 오버레이
- Web Speech API 기반 STT/TTS
- 사용자 상품·계좌·수취인·약관 선택 UI
- 민감정보 입력 안내 화면
- 최종 승인 및 위험 경고 화면
- 프론트엔드 상태 관리와 테스트

### 산출물

- 사용자 상호작용 UI
- Workflow 상태별 화면
- WebSocket 이벤트 처리
- 사용자 결정 및 승인 인터페이스
- 프론트엔드 테스트

---

## 2. 개발자 B — Backend & Automation

### 담당 범위

- 브라우저 세션 관리
- Playwright 자동화
- REST API 및 WebSocket
- DOM 추출과 정제
- AI Action 검증
- 민감정보 감지
- 세션 보안과 데이터 삭제

### 작업 경로

```text
backend/**
security-session/**
```

### 상세 업무

- Playwright 기반 브라우저 세션과 클러스터 관리
- 브라우저 화면 스트리밍
- DOM 요소 추출 및 AI 전달용 정제
- 좌표 또는 Element ID 기반 클릭·입력·스크롤 실행
- Workflow 상태 관리
- AI 요청 생성
- AI 응답 Action 검증
- 민감정보 영역 감지
- 보안 입력 중 AI·캡처 일시정지
- 최종 승인 Gate
- Redis 기반 세션 TTL 및 삭제 처리

### 보안 책임 경계

개발자 B는 민감정보 감지와 자동화 중단을 실제로 수행합니다.

- 민감정보 필드 감지
- 실제 input `value` 제거
- 민감정보 마스킹
- `SECURE_INPUT_REQUIRED` 상태 전환
- 사용자 승인 전 최종 버튼 실행 차단
- 세션 종료 시 임시 데이터 삭제

### 산출물

- REST API 서버
- WebSocket 스트리밍 서버
- 브라우저 자동화 런타임
- DOM 정제 모듈
- AI Action 검증 모듈
- 보안 및 세션 서비스

---

## 3. 개발자 C — AI Engine & Integration

### 담당 범위

- 사용자 Intent 분류
- 다음 Action 및 Target 추론
- 안내 메시지 생성
- Structured Output 관리
- 위험 요청 감지
- Backend와 AI Engine 통합
- E2E 통합 테스트 주도

### 작업 경로

```text
ai-engine/**
contracts/**
docs/**
```

`contracts/**`와 `docs/**`는 공통 영역이므로 변경 전에 팀원과 협의합니다.

### 상세 업무

- LLM API 연동 및 Provider Adapter 구현
- 사용자 Intent 목록과 추출 필드 정의
- 정제된 DOM 기반 다음 Target 추론
- 허용된 Browser Action 생성
- AI 요청·응답 JSON Schema 관리
- 한 문장 사용자 안내 생성
- 상품·약관·계좌·수취인 선택 단계 판단
- 민감정보 입력 단계 판단
- 최종 승인 필요 단계 판단
- 보이스피싱 의심 표현 감지
- Backend가 전달한 보안 상태를 AI Workflow에 반영
- Mock DOM 기반 응답 테스트
- 프론트·백엔드·AI Engine 통합 테스트

### 보안 책임 경계

개발자 C는 민감정보를 직접 처리하지 않습니다.

- 정제된 DOM만 입력받음
- 비밀번호·OTP 등 민감정보 추론 금지
- 민감정보 필드에서 `PAUSE_FOR_SECURE_INPUT` 반환
- 사용자 결정이 필요한 단계에서 `WAIT_FOR_USER` 반환
- 최종 거래 단계에서 `REQUEST_FINAL_CONFIRMATION` 반환
- 위험 요청에서 `STOP` 반환

### 산출물

- AI 추론 서비스
- AI 요청·응답 Schema
- Intent 및 위험 판단 규칙
- Prompt 정책
- Mock DOM 테스트
- 통합 명세와 E2E 테스트 결과

---

## 4. 공통 규칙

- 공통 계약은 `contracts/api.ts`를 기준으로 합니다.
- 각 담당자는 자신의 담당 경로 밖의 수정을 최소화합니다.
- `contracts/api.ts` 변경 전 팀원과 협의합니다.
- 계약 변경 후 같은 날 모든 브랜치를 동기화합니다.
- `main`과 `develop`에 직접 push하지 않습니다.
- 모든 기능은 Pull Request를 통해 병합합니다.
- 하나의 PR에는 하나의 기능 또는 수정만 포함합니다.
- 통합 전 로컬 테스트 또는 수동 검증을 수행합니다.
- Breaking Change는 PR 설명과 팀 채널에 기록합니다.

---

## 5. 브랜치 규칙

### 공통 브랜치

- `main`: 배포 가능한 안정 코드
- `develop`: 기능 통합 코드

### 기능 브랜치

- 개발자 A: `feature/frontend-<task>`
- 개발자 B: `feature/backend-<task>`
- 보안 기능: `feature/security-<task>`
- 개발자 C: `feature/ai-<task>`
- 긴급 수정: `hotfix/<task>`

### 예시

```text
feature/frontend-f1-dashboard
feature/backend-session-orchestrator
feature/security-sensitive-detection
feature/ai-next-target
hotfix/session-timeout
```

---

## 6. 권장 통합 순서

1. `contracts/api.ts` 공통 상태값과 API 계약 확정
2. Backend와 Security Session 최소 API 구현
3. AI Engine Mock 응답 및 Schema 검증
4. Backend와 AI Engine 연동
5. Frontend를 실제 REST API와 WebSocket에 연결
6. 정기예금 가입 시나리오 E2E 테스트
7. 계좌이체 시나리오 E2E 테스트
8. 보이스피싱 의심 요청 차단 테스트