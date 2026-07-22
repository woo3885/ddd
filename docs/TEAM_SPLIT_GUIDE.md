# 3인 역할 분담 개발 가이드 (A/B/C)

목표: 3명이 충돌 없이 병렬 개발하고, develop 브랜치에서 빠르게 통합합니다.

## 담당 영역

1. 개발자 A (Frontend & Voice)
- 담당 범위: F-1, F-2, F-3, F-4, F-5
- 작업 경로: src/**
- 상세 모듈:
	- F-1/F-5: 메인 Dashboard, URL 입력기, 대형 컨트롤러
	- F-2/F-3: Canvas/WebRTC 스트리밍 렌더링, 블러/하이라이트 오버레이
	- F-4: Web Speech API 기반 STT/TTS
- 산출물: 사용자 상호작용 UI + 상태 관리 + 프론트 테스트

2. 개발자 B (Backend & Automation)
- 담당 범위: B-1, B-2, B-3, B-4, S-1, S-2, S-3
- 작업 경로: backend/**, security-session/**
- 상세 모듈:
	- B-1/B-3: Playwright 기반 브라우저 세션/클러스터, 스트리밍 엔진
	- B-2/B-4: DOM 파싱/정제, 터치 좌표 기반 클릭/스크롤 실행
	- S-1~S-3: 보안 영역 감지, Redis 세션 관리, 완전 삭제 로직
- 산출물: REST/WebSocket 서버 + 자동화 런타임 + 보안/세션 서비스

3. 개발자 C (AI Engine & Integration)
- 담당 범위: A-1, A-2, A-3, A-4, S-2 연동
- 작업 경로: ai-engine/**, contracts/**, docs/**(통합 문서)
- 상세 모듈:
	- A-1~A-4: Gemini API 연동, Intent/Target 추론, 안내 멘트 생성
	- Structured Output(JSON) 포맷 제어
	- 프론트-백엔드 Webview 전환 인터페이스 설계 및 통합 테스트 주도
- 산출물: AI 추론 서비스 + 프롬프트 정책 + 통합 명세

## 공통 규칙

- 공통 계약 파일 공유 수정: contracts/api.ts
- 각 담당자는 자신의 경로 외 파일 수정 최소화
- contracts/api.ts 변경 시 팀 전체 공지 후 같은 날 동기화
- develop 직접 push 금지, 반드시 PR
- PR 1개는 기능 1개 원칙
- 통합 전 로컬 테스트 필수

## 브랜치 규칙

- 공통 안정 브랜치:
	- main: 배포 가능한 안정 코드
	- master: main과 동일한 안정 코드 동기화 브랜치
	- develop: 기능 통합 브랜치
- 기능 브랜치 규칙:
	- 개발자 A: feature/frontend-<task>
	- 개발자 B(백엔드): feature/backend-<task>
	- 개발자 B(보안): feature/security-<task>
	- 개발자 C: feature/ai-<task>
- 긴급 수정 브랜치 규칙:
	- hotfix/<task>

예시
- feature/frontend-f1-dashboard
- feature/backend-session-orchestrator
- feature/ai-next-target
- feature/security-sensitive-detection
- hotfix/login-timeout

## 통합 순서 (권장)

1. contracts/api.ts 확정
2. backend/security-session 최소 API 구현
3. ai-engine mock 포함 연동
4. frontend 실제 엔드포인트 연결
5. C 주도 통합 테스트 및 E2E 시나리오 점검
