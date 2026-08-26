# D27 예금 가입 최종 확인 계약

AI Engine은 `REQUEST_FINAL_CONFIRMATION`, `FINAL_CONFIRMATION_REQUIRED`,
`DEPOSIT_SUBSCRIPTION`, 현재 `sourceSnapshotId`, 현재 Snapshot의
`confirmationTargetElementId`를 반환한다. `elementId`를 포함한 일반 Action payload는 비운다.

Backend는 응답의 상태·type·snapshot·target 정책을 검증하고 `confirmationId`와 안전한
가입 요약을 생성한다. active confirmation에는 ID, type, pending target, source snapshot,
`sourceFrameId`, `sourceFrameSequence`, summary를 저장한다. 가입 요약은 상품명·가입 기간·금액이
모두 안전한 형식이어야 하며 민감정보가 감지되거나 필드가 누락되면 fail-closed한다.
HTML/script, 모든 ISO 제어문자, password/비밀번호, OTP/인증번호/PIN 및 금액 토큰 외의
구분자 없는 10~12자리 계좌번호를 허용하지 않는다. 세 필드 중 하나라도 위반하면 일부 필드만
제외해 이벤트를 만들지 않고 confirmation 전체 생성을 중단한다.

승인/거절 요청은 아래 필드를 모두 보낸다.

- `requestId`: 1~100자, 승인/거절 처리의 exactly-once key
- `confirmationId`: 현재 active confirmation ID
- `approved`: confirm endpoint는 `true`, reject endpoint는 `false`
- `expectedFrameId`: 사용자가 확인한 Viewer frame ID
- `expectedSequence`: 사용자가 확인한 Viewer frame sequence(1 이상)

Backend는 `expectedFrameId/expectedSequence`가 active confirmation의 source frame 및 요청
시점의 current frame과 모두 일치할 때만 처리한다. 어느 하나라도 다르면 승인과 거절을 모두
fail-closed하며 active confirmation은 유지한다. 같은 `requestId`는 재실행하지 않는다.
승인 API는 위 검증 후 pending final target을 한 번만 실행한다. 거절과 terminal 상태에서는
latch와 UI snapshot을 제거한다.

UI event는 `CONFIRMATION_REQUIRED`, `CONFIRMATION_RESOLVED`,
`CONFIRMATION_REJECTED`, `CONFIRMATION_CLEAR`를 사용하며 reconnect snapshot은 active
confirmation만 복원한다. C와 B가 공유할 canonical fixture는
`src/test/resources/contracts/d27-final-confirmation-*.json` 세트이다.
