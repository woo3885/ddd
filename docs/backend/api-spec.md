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

### 세션 생성

- Method: `POST`
- URL: `/api/v1/sessions`

#### 요청 예시

```json
{
  "userRequest": "적금 상품을 비교해줘"
}
```

### 세션 조회

- Method: `GET`
- URL: `/api/v1/sessions/{sessionId}`

### 세션 취소

- Method: `POST`
- URL: `/api/v1/sessions/{sessionId}/cancel`

## 5. 사용자 결정 API

### 사용자 선택 전달

- Method: `POST`
- URL: `/api/v1/sessions/{sessionId}/decisions`

### 최종 실행 확인

- Method: `POST`
- URL: `/api/v1/sessions/{sessionId}/confirm`

### 최종 실행 거절

- Method: `POST`
- URL: `/api/v1/sessions/{sessionId}/reject`

## 6. 주요 워크플로 상태

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