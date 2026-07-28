# 금융길잡이 데모뱅크

## 프로젝트 목적

금융길잡이 데모뱅크는 금융 자동화의 화면 이동, 사용자 직접 선택과 보안 중단 지점을 시연하기 위한 독립 프론트엔드 프로젝트다. 실제 금융회사 시스템과 연결하지 않으며 실제 예금 가입이나 송금을 수행하지 않는다.

## 설치

```bash
cd demo/demo-bank
npm install
```

## 개발 서버 실행

```bash
npm run dev
```

기본 개발 서버 주소는 Vite가 출력하는 로컬 URL을 사용한다.

## 프로덕션 빌드

```bash
npm run build
```

TypeScript 검사가 통과하면 Vite가 `dist/`에 정적 빌드 결과를 생성한다.

## 프로덕션 빌드 미리보기

```bash
npm run preview
```

## D1 규격 문서

D1에서 확정한 화면 흐름, URL과 요소 ID 규격은 상위 `demo/docs`에 있다.

- `../docs/demo-bank-screen-flow.md`
- `../docs/demo-bank-url-spec.md`
- `../docs/demo-bank-element-id-spec.md`

## D3 구현 URL

- `/`
- `/deposit/products`
- `/transfer/accounts`

개발 서버 실행 후 주소창에 각 URL을 직접 입력하거나 상단 개발용 링크로 이동할 수 있다. 경로 끝의 `/` 유무는 같은 화면으로 처리한다.

상단 링크는 세 정적 화면을 개발 중 확인하기 위한 이동 수단이다. 메인 화면의 예금·이체 시작 버튼과 상품·계좌 선택 버튼은 D3에서 비활성화된 정적 버튼이며, 실제 업무 흐름 이동은 D4에서 연결할 예정이다.

## D3 Mock 데이터

- 예금 상품: 12개월 정기예금, 우대금리 정기예금
- 출금 계좌: 생활비 계좌, 저축 계좌
- 계좌번호는 마스킹된 예시만 사용
- 금액은 `ko-KR` 형식으로 표시

Mock 데이터는 `src/data/demo-data.ts`에서 관리한다.

## 요소 ID 규격

페이지, 개발용 링크, 상품·계좌 카드와 정적 버튼에는 `../docs/demo-bank-element-id-spec.md`의 고정 ID 규칙을 적용한다. 자동화 대상 요소는 `id`와 동일한 `data-testid`를 사용한다.

## 구현 범위

D3는 정적 화면과 직접 URL 확인만 제공한다. 실제 금융 입력, 예금 가입, 계좌 선택, 송금, 인증과 외부 금융사이트 연결은 구현하지 않는다.
