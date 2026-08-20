# 데모 금융사이트 요소 ID 규격

## 1. 목적

이 문서는 Playwright 테스트와 AI 자동화가 DOM 순서, 화면 좌표, CSS 클래스와 표시 문구 변경에 의존하지 않고 데모 금융사이트의 요소를 안정적으로 식별하기 위한 규칙을 정의한다.

## 2. 기본 규칙

- ID에는 영문 소문자, 숫자와 하이픈만 사용한다.
- 단어 구분은 kebab-case를 사용한다.
- 화면 순서나 DOM 순서에 의존하는 이름을 사용하지 않는다.
- 좌표를 ID에 포함하지 않는다.
- 사용자에게 보이는 문구를 그대로 ID로 사용하지 않는다.
- 동적으로 변하는 배열 인덱스를 ID로 사용하지 않는다.
- 한 페이지 안에서 ID를 중복하지 않는다.
- AI와 Playwright가 조작할 요소는 의미가 바뀌지 않는 고정 ID를 가진다.
- 가능하면 `data-testid`에도 ID와 동일한 값을 사용한다.
- 입력과 조작 요소에는 ID 외에 연결된 label 또는 명확한 accessible name을 제공한다.
- 동적 데이터는 배열 인덱스 대신 변경되지 않는 업무 키를 ID에 사용한다.

허용 형식은 다음 정규식으로 표현한다.

```text
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

## 3. 접두사 규칙

| 요소 종류 | 접두사 | 예시 |
| --- | --- | --- |
| 페이지 루트 | `page-` | `page-home` |
| 이동 메뉴 | `nav-` | `nav-deposit` |
| 버튼 | `btn-` | `btn-start-deposit` |
| 입력창 | `input-` | `input-transfer-amount` |
| 선택창 | `select-` | `select-deposit-period` |
| 체크박스 | `checkbox-` | `checkbox-final-confirmation` |
| 라디오 버튼 | `radio-` | `radio-deposit-period-12m` |
| 상품 카드 | `product-` | `product-deposit-12m` |
| 계좌 카드 | `account-` | `account-living-expense` |
| 수취인 카드 | `recipient-` | `recipient-hong-gildong` |
| 약관 항목 | `term-` | `term-service-required` |
| 요약 정보 | `summary-` | `summary-amount` |
| 상태 메시지 | `status-` | `status-risk-warning` |
| 오류 메시지 | `error-` | `error-transfer-amount` |

## 4. 고정 ID 예시

다음 ID는 D3 이후의 화면 구현과 Playwright 시나리오에서 우선 사용하는 고정 계약이다.

### 메인

| ID | 대상 |
| --- | --- |
| `page-home` | 메인 페이지 루트 |
| `nav-deposit` | 예금 영역 이동 메뉴 |
| `nav-transfer` | 계좌이체 영역 이동 메뉴 |
| `btn-start-deposit` | 예금 가입 시작 버튼 |
| `btn-start-transfer` | 계좌이체 시작 버튼 |

### 예금 상품

| ID | 대상 |
| --- | --- |
| `page-deposit-products` | 예금 상품 목록 페이지 루트 |
| `product-deposit-12m` | 12개월 정기예금 카드 |
| `product-deposit-preferred` | 우대금리 정기예금 카드 |
| `btn-select-deposit-12m` | 12개월 정기예금 선택 버튼 |

### 예금 조건과 약관

| ID | 대상 |
| --- | --- |
| `input-deposit-amount` | 예금 가입 금액 입력 |
| `select-deposit-period` | 가입 기간 선택 |
| `checkbox-term-service-required` | 필수 서비스 약관 체크박스 |
| `checkbox-term-privacy-required` | 필수 개인정보 약관 체크박스 |
| `checkbox-term-marketing-optional` | 선택 마케팅 약관 체크박스 |
| `btn-deposit-terms-next` | 약관 확인 후 다음 버튼 |

### 계좌이체

| ID | 대상 |
| --- | --- |
| `page-transfer-accounts` | 출금 계좌 선택 페이지 루트 |
| `account-living-expense` | 생활비 계좌 카드 |
| `recipient-hong-gildong` | 홍길동 수취인 카드 |
| `input-transfer-amount` | 송금 금액 입력 |

### 보안 입력

| ID | 대상 |
| --- | --- |
| `input-account-password` | 계좌 비밀번호 직접 입력 |
| `input-otp` | OTP 직접 입력 |
| `btn-secure-input-complete` | 현재 보안 입력 완료 버튼 |

`btn-secure-input-complete`는 동시에 렌더링되지 않는 개별 보안 입력 페이지에서 공통 의미로 사용할 수 있다. 한 페이지에 여러 보안 입력 완료 버튼을 만들지 않는다.

### 최종 승인

| ID | 대상 |
| --- | --- |
| `summary-transaction-type` | 거래 유형 요약 |
| `summary-recipient` | 수취인 요약 |
| `summary-amount` | 금액 요약 |
| `checkbox-final-confirmation` | 사용자 최종 승인 체크박스 |
| `btn-final-approve` | 최종 승인 실행 버튼 |
| `btn-final-edit` | 입력 내용 수정 버튼 |
| `btn-final-cancel` | 최종 처리 취소 버튼 |

### 위험 경고

| ID | 대상 |
| --- | --- |
| `page-risk-warning` | 위험 경고 페이지 루트 |
| `status-risk-warning` | 금융 자동화 중단 상태 메시지 |
| `btn-risk-return-home` | 메인으로 돌아가기 버튼 |
| `btn-risk-end-session` | 세션 종료 버튼 |

## 5. DOM 및 접근성 규칙

- 비밀번호나 OTP 값은 DOM 속성, `data-*` 속성, React 상태, 분석 이벤트와 로그에 복사하지 않는다.
- 계좌번호는 마스킹된 값만 화면에 표시하고 원문을 DOM에 렌더링하지 않는다.
- CSS로 숨긴 중복 버튼이나 중복 ID를 만들지 않는다.
- 동작 요소는 `div` 클릭 이벤트가 아니라 실제 `button` 요소를 사용한다.
- 입력 요소는 `label[for]`와 `input[id]`를 연결하거나 동등한 accessible name을 제공한다.
- 비활성화 상태는 CSS 모양만 바꾸지 않고 실제 `disabled` 속성을 사용한다.
- 장식 요소는 자동화 대상 ID를 갖지 않으며 필요하면 `aria-hidden="true"`를 사용한다.
- Playwright는 표시 텍스트 위치나 CSS 클래스보다 고정 ID, role과 accessible name을 우선 사용한다.
- `data-testid`를 제공할 때는 해당 요소의 ID와 같은 값을 사용한다.

권장 구조:

```html
<label for="input-transfer-amount">송금 금액</label>
<input
  id="input-transfer-amount"
  data-testid="input-transfer-amount"
  inputmode="numeric"
/>

<button
  id="btn-final-approve"
  data-testid="btn-final-approve"
  type="button"
  disabled
>
  최종 승인
</button>
```

보안 입력의 실제 값은 자동화 스냅샷이나 테스트 로그에 기록하지 않는다. 보안 입력 테스트는 값 자체가 아니라 보호 모드, 입력 요소 존재, 캡처 중단 상태와 완료 이벤트만 검증한다.
