# 데모 금융사이트 URL 규격

## 1. 기본 원칙

- URL은 데모 금융사이트 내부 화면을 식별하며 실제 금융회사 도메인과 연결되지 않는다.
- 화면 ID 하나당 대표 URL 하나를 사용한다.
- 직접 접근이 허용되지 않는 화면은 앞 단계에서 필요한 선택 정보가 없으면 `HOME` 또는 해당 흐름의 첫 화면으로 안내한다.
- 보안 입력, 최종 확인과 완료 화면은 선행 단계의 데모 세션 상태가 있을 때만 접근한다.
- D3에서는 메인, 예금 상품 목록, 출금 계좌 선택의 정적 화면만 구현한다.
- 나머지 URL은 D6 이후에 구현한다.

## 2. URL 목록

| URL | 화면 ID | 설명 | 직접 URL 접근 허용 여부 | D3 구현 여부 | 이후 구현 일차 |
| --- | --- | --- | --- | --- | --- |
| `/` | `HOME` | 데모 메인과 업무 시작점 | 허용 | 예 | D3 |
| `/risk-warning` | `RISK_WARNING` | 위험 요청 차단과 안전 안내 | 허용 | 아니오 | D6 이후 |
| `/deposit/products` | `DEPOSIT_PRODUCT_LIST` | 예금 상품 후보 목록 | 허용 | 예 | D3 |
| `/deposit/products/:productId` | `DEPOSIT_PRODUCT_DETAIL` | 선택한 예금 상품 상세 | 유효한 `productId`에 한해 허용 | 아니오 | D6 이후 |
| `/deposit/conditions` | `DEPOSIT_CONDITIONS` | 가입 금액과 기간 설정의 개념 경로 | D7 구현은 유효한 `productId` 필요 | 아니오 | D7 |
| `/deposit/terms` | `DEPOSIT_TERMS` | 필수·선택 약관 개별 선택 | 불가: 가입 조건 필요 | 아니오 | D6 이후 |
| `/deposit/secure/password` | `DEPOSIT_PASSWORD` | 예금 가입용 계좌 비밀번호 직접 입력 | 불가: 약관 동의 필요 | 아니오 | D6 이후 |
| `/deposit/confirmation` | `DEPOSIT_CONFIRMATION` | 예금 가입 내용 최종 확인 | 불가: 보안 입력 완료 필요 | 아니오 | D6 이후 |
| `/deposit/completed` | `DEPOSIT_COMPLETED` | 예금 가입 시연 완료 | 불가: 최종 승인 결과 필요 | 아니오 | D6 이후 |
| `/transfer/accounts` | `TRANSFER_ACCOUNT_SELECTION` | 출금 계좌 후보 선택 | 허용 | 예 | D3 |
| `/transfer/recipients` | `TRANSFER_RECIPIENT_SELECTION` | 수취인 후보 선택 | 불가: 출금 계좌 선택 필요 | 아니오 | D6 이후 |
| `/transfer/amount` | `TRANSFER_AMOUNT` | 송금 금액 입력 | 불가: 수취인 선택 필요 | 아니오 | D6 이후 |
| `/transfer/secure/password` | `TRANSFER_PASSWORD` | 이체용 계좌 비밀번호 직접 입력 | 불가: 송금 정보 필요 | 아니오 | D6 이후 |
| `/transfer/secure/otp` | `TRANSFER_OTP` | OTP 직접 입력 | 불가: 비밀번호 입력 완료 필요 | 아니오 | D6 이후 |
| `/transfer/confirmation` | `TRANSFER_CONFIRMATION` | 송금 내용 최종 확인 | 불가: OTP 입력 완료 필요 | 아니오 | D6 이후 |
| `/transfer/completed` | `TRANSFER_COMPLETED` | 송금 시연 완료 | 불가: 최종 승인 결과 필요 | 아니오 | D6 이후 |

## 3. D3 구현 URL

D3 정적 화면 구현 범위는 다음 세 URL로 한정한다.

- `/`
- `/deposit/products`
- `/transfer/accounts`

이 단계에서는 URL 간 정적 이동만 제공하며 실제 예금 가입, 송금, 인증이나 외부 금융사이트 연결을 구현하지 않는다.

## 4. 화면 ID 연결 확인

| 구분 | 화면 수 | 연결 상태 |
| --- | ---: | --- |
| 공통 | 2 | `HOME`, `RISK_WARNING` 모두 URL 연결 |
| 예금 | 7 | `DEPOSIT_PRODUCT_LIST`부터 `DEPOSIT_COMPLETED`까지 모두 URL 연결 |
| 계좌이체 | 7 | `TRANSFER_ACCOUNT_SELECTION`부터 `TRANSFER_COMPLETED`까지 모두 URL 연결 |
| 합계 | 16 | 모든 예정 화면 ID에 대표 URL 존재 |

## 5. D7 예금 가입 금액 경로 구체화

D1의 `/deposit/conditions`는 예금 가입 조건 입력 단계를 나타내는 개념
경로로 유지한다. D7 구현에서는 별도 전역 상태나 저장소 없이 선택 상품
문맥을 안전하게 전달하기 위해 공개 Mock 상품 ID를 pathname에 추가한다.

- `/deposit/conditions/deposit-12m`
- `/deposit/conditions/deposit-preferred`
- 구현 형식: `/deposit/conditions/:productId`

가입 금액은 URL에 포함하지 않는다. query parameter, `localStorage`,
`sessionStorage`도 사용하지 않는다. 알려진 Mock 상품 ID에 한해서만 금액
입력 화면을 표시하며 `/deposit/conditions`, 잘못된 상품 ID와 예상하지
않은 추가 segment는 NotFound 화면으로 처리한다.
