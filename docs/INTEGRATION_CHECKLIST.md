# 통합 체크리스트 — develop 병합 전

## 1. 공통 계약

- [ ] `contracts/api.ts` 변경 여부 확인
- [ ] `WorkflowStatus` 값이 공통 계약과 일치
- [ ] `BrowserActionType` 값이 공통 계약과 일치
- [ ] REST API 요청·응답 타입 일치
- [ ] WebSocket 이벤트 타입 일치
- [ ] AI 요청·응답 JSON 타입 일치
- [ ] Breaking Change 발생 시 팀 전체 공지
- [ ] 관련 Mock 데이터와 테스트 코드 수정
- [ ] 테스트 또는 수동 검증 결과를 PR에 기록

## 2. Frontend & Voice — 개발자 A

### 세션 및 화면

- [ ] URL 입력 후 브라우저 세션 생성 요청 연결
- [ ] 브라우저 스트림 표시 정상
- [ ] Target Highlight 오버레이 좌표 정상
- [ ] 화면 기준 좌표와 실제 렌더링 크기 변환 정상
- [ ] 현재 Workflow 상태와 안내 문구 표시

### 사용자 상호작용

- [ ] 음성 또는 텍스트 요청 전달
- [ ] `USER_DECISION_REQUIRED` 화면 표시
- [ ] 상품·계좌·수취인·약관 선택 결과 전달
- [ ] `SECURE_INPUT_REQUIRED` 화면 표시
- [ ] 보안 입력 중 AI 자동화 정지 안내
- [ ] 보안 입력 완료 신호 전달
- [ ] `FINAL_CONFIRMATION_REQUIRED` 거래 요약 표시
- [ ] 승인 또는 거절 결과 전달
- [ ] `RISK_WARNING` 경고 화면 표시
- [ ] 업무 취소 및 일시정지 요청 정상

## 3. Backend & Automation — 개발자 B

### 세션 및 통신

- [ ] 브라우저 세션 생성 API 정상
- [ ] URL 이동 API 정상
- [ ] 사용자 선택 전달 API 정상
- [ ] 최종 승인 API 정상
- [ ] 보안 입력 완료 API 정상
- [ ] 세션 종료 API 정상
- [ ] WebSocket 연결 및 재연결 처리 정상
- [ ] Binary 브라우저 프레임 전송 정상
- [ ] 세션 TTL 및 만료 처리 정상

### DOM 정제 및 보안

- [ ] 현재 DOM에서 AI 판단에 필요한 요소만 추출
- [ ] 실제 input `value`를 AI 요청에서 제거
- [ ] 비밀번호·OTP·주민등록번호 필드 제거 또는 마스킹
- [ ] 계좌번호 원문을 AI에 전달하지 않음
- [ ] 쿠키·세션 토큰·Authorization Header를 전달하지 않음
- [ ] 민감정보 포함 화면 전체 캡처를 AI에 전달하지 않음
- [ ] 민감정보 화면 감지 시 `SECURE_INPUT_REQUIRED` 전환
- [ ] 보안 입력 중 AI 요청과 화면 캡처 중단
- [ ] 세션 종료 시 임시 데이터 삭제

### AI Action 검증

- [ ] AI가 반환한 Action이 허용 목록에 존재
- [ ] 현재 Workflow 상태에서 실행 가능한 Action인지 검증
- [ ] `targetElementId`가 현재 DOM에 존재
- [ ] 대상 요소가 visible 상태
- [ ] 대상 요소가 enabled 상태
- [ ] 민감정보 입력 요소가 아닌지 검증
- [ ] 사용자 선택이 필요한 약관 요소가 아닌지 검증
- [ ] 최종 거래 버튼인지 검증
- [ ] 최종 버튼 실행 전 사용자 승인 존재 여부 검증
- [ ] AI 응답의 `requestId`가 현재 요청과 일치

## 4. AI Engine & Integration — 개발자 C

### Intent 및 Action 판단

- [ ] 사용자 Intent 분류 정상
- [ ] 금액·기간 등 명시된 정보 추출 정상
- [ ] 사용자가 말하지 않은 금액이나 조건을 임의 추정하지 않음
- [ ] 현재 페이지에서 다음 Target 추론 정상
- [ ] 허용된 `BrowserActionType`만 반환
- [ ] 존재하는 `targetElementId` 형식만 반환
- [ ] Structured Output JSON Schema 검증 통과
- [ ] 모든 응답에 `requestId` 포함
- [ ] 사용자 안내 문장이 한 문장 원칙을 준수

### 사용자 결정 및 보안

- [ ] 상품 선택 시 `USER_DECISION_REQUIRED` 반환
- [ ] 약관 선택 시 `USER_DECISION_REQUIRED` 반환
- [ ] 선택 약관을 임의 동의하지 않음
- [ ] 전체 동의 버튼을 자동 선택하지 않음
- [ ] 민감정보 필드에서 `PAUSE_FOR_SECURE_INPUT` 반환
- [ ] 최종 거래 단계에서 `REQUEST_FINAL_CONFIRMATION` 반환
- [ ] 사용자 승인 전 최종 실행 Action을 반환하지 않음

### 위험 요청

- [ ] 안전계좌·기관 사칭 등 위험 표현 감지
- [ ] 위험 요청 감지 시 `RISK_WARNING` 반환
- [ ] 위험 요청 감지 시 `STOP` 반환
- [ ] 송금 관련 추가 Action을 생성하지 않음
- [ ] 공식 기관 또는 금융회사 확인 안내 생성

## 5. E2E 시나리오

### 정기예금 가입

- [ ] 사용자 요청에서 금액과 기간 추출
- [ ] 예금 메뉴 이동
- [ ] 상품 선택 단계에서 사용자 결정 요청
- [ ] 약관 단계에서 사용자 결정 요청
- [ ] 비밀번호 단계에서 보안 입력 모드 전환
- [ ] 최종 가입 내용 표시
- [ ] 사용자 승인 후에만 가입 버튼 실행

### 계좌이체

- [ ] 송금 금액 추출
- [ ] 출금 계좌를 사용자가 확인
- [ ] 수취인을 사용자가 확인
- [ ] 비밀번호·OTP 단계에서 자동화 중단
- [ ] 계좌·수취인·금액 최종 요약
- [ ] 사용자 승인 후에만 송금 버튼 실행

### 보이스피싱 의심 요청

- [ ] 위험 표현 감지
- [ ] 자동화 즉시 중단
- [ ] `RISK_WARNING` 상태 표시
- [ ] 송금 Action 실행 차단
- [ ] 사용자에게 위험 안내 표시