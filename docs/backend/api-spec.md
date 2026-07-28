# 금융길잡이 AI Backend API 명세

## 1. 기본 정보

- Base URL: `/api/v1`
- Content-Type: `application/json`
- 문자 인코딩: `UTF-8`

## 2. 공통 응답 형식

### 성공 응답

```json
{
  "success": true,
  "data": {},
  "message": null
}
```

### 실패 응답

```json
{
  "success": false,
  "data": null,
  "message": "오류 메시지"
}
```

## 3. 상태 확인 API

### 백엔드 서버 상태 확인

- Method: `GET`
- URL: `/api/v1/hello`

#### 응답 예시

```json
{
  "success": true,
  "data": {
    "service": "finance-guide-backend",
    "message": "백엔드 서버가 정상 실행 중입니다."
  },
  "message": null
}
```

## 4. 자동화 세션 API

### 4.1 자동화 세션 생성

사용자의 금융 업무 요청을 기반으로 새로운 자동화 세션을 생성한다.

- Method: `POST`
- URL: `/api/v1/sessions`
- Content-Type: `application/json`
- 성공 상태 코드: `201 Created`

#### 요청

```json
{
  "userRequest": "적금 상품을 비교해 줘"
}
```

#### 요청 필드

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| `userRequest` | String | O | 사용자가 요청한 금융 업무 |

#### 성공 응답

```json
{
  "success": true,
  "data": {
    "sessionId": "a5181e9f-2627-4bab-bf1e-347fccbf3e17",
    "userRequest": "적금 상품을 비교해 줘",
    "status": "SESSION_CREATED",
    "createdAt": "2026-07-28T08:24:18.022376Z",
    "updatedAt": "2026-07-28T08:24:18.022376Z"
  },
  "message": "자동화 세션이 생성되었습니다."
}
```

#### 요청값 검증 실패

- 상태 코드: `400 Bad Request`

```json
{
  "success": false,
  "data": null,
  "message": "사용자 요청은 비어 있을 수 없습니다."
}
```

---

### 4.2 자동화 세션 조회

세션 ID를 기준으로 현재 자동화 세션의 상태를 조회한다.

- Method: `GET`
- URL: `/api/v1/sessions/{sessionId}`
- 성공 상태 코드: `200 OK`

#### 성공 응답

```json
{
  "success": true,
  "data": {
    "sessionId": "a5181e9f-2627-4bab-bf1e-347fccbf3e17",
    "userRequest": "적금 상품을 비교해 줘",
    "status": "SESSION_CREATED",
    "createdAt": "2026-07-28T08:24:18.022376Z",
    "updatedAt": "2026-07-28T08:24:18.022376Z"
  },
  "message": null
}
```

#### 세션이 존재하지 않는 경우

- 상태 코드: `404 Not Found`

```json
{
  "success": false,
  "data": null,
  "message": "자동화 세션을 찾을 수 없습니다. sessionId=not-found-session"
}
```

---

### 4.3 자동화 세션 취소

진행 중인 자동화 세션을 취소한다.

- Method: `POST`
- URL: `/api/v1/sessions/{sessionId}/cancel`
- 성공 상태 코드: `200 OK`

#### 성공 응답

```json
{
  "success": true,
  "data": {
    "sessionId": "a5181e9f-2627-4bab-bf1e-347fccbf3e17",
    "userRequest": "적금 상품을 비교해 줘",
    "status": "CANCELLED",
    "createdAt": "2026-07-28T08:24:18.022376Z",
    "updatedAt": "2026-07-28T08:26:07.369907Z"
  },
  "message": "자동화 세션이 취소되었습니다."
}
```

#### 이미 종료된 세션을 취소하는 경우

- 상태 코드: `409 Conflict`

```json
{
  "success": false,
  "data": null,
  "message": "현재 상태에서는 세션을 취소할 수 없습니다."
}
```

## 5. 현재 저장 방식

현재 자동화 세션은 서버 메모리의 `ConcurrentHashMap`에 임시 저장한다.

- 서버를 재시작하면 기존 세션은 삭제된다.
- 이후 Redis 기반 저장소로 교체할 예정이다.
- 도메인 계층은 저장 방식과 분리하기 위해 `AutomationSessionRepository` 인터페이스를 사용한다.

## 6. 사용자 결정 API 예정 명세

> 아래 API는 향후 구현 예정이며, 현재 버전에서는 제공하지 않는다.

### 6.1 사용자 선택 전달

- Method: `POST`
- URL: `/api/v1/sessions/{sessionId}/decisions`
- 구현 상태: 예정

### 6.2 최종 실행 확인

- Method: `POST`
- URL: `/api/v1/sessions/{sessionId}/confirm`
- 구현 상태: 예정

### 6.3 최종 실행 거절

- Method: `POST`
- URL: `/api/v1/sessions/{sessionId}/reject`
- 구현 상태: 예정

## 7. 주요 워크플로 상태

- `SESSION_CREATED`
- `PAGE_LOADING`
- `AI_EXECUTING`
- `USER_DECISION_REQUIRED`
- `SECURE_INPUT_REQUIRED`
- `FINAL_CONFIRMATION_REQUIRED`
- `ADDITIONAL_INFORMATION_REQUIRED`
- `RISK_WARNING`
- `COMPLETED`
- `CANCELLED`
- `ERROR`
- `TERMINATED`