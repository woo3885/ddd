# D27 예금 가입 최종 확인 계약

AI Engine은 `REQUEST_FINAL_CONFIRMATION`, `FINAL_CONFIRMATION_REQUIRED`,
`DEPOSIT_SUBSCRIPTION`, 현재 `sourceSnapshotId`, 현재 Snapshot의
`confirmationTargetElementId`를 반환한다. `elementId`를 포함한 일반 Action payload는 비운다.

Backend는 응답의 상태·type·snapshot·target 정책을 검증하고 `confirmationId`와 안전한
가입 요약을 생성한다. active confirmation에는 ID, type, pending target, source snapshot,
summary만 저장한다. 승인 API는 active ID가 일치할 때 pending final target을 한 번만 실행한다.
중복·stale 승인은 차단한다. 거절과 terminal 상태에서는 latch와 UI snapshot을 제거한다.

UI event는 `CONFIRMATION_REQUIRED`, `CONFIRMATION_RESOLVED`,
`CONFIRMATION_REJECTED`, `CONFIRMATION_CLEAR`를 사용하며 reconnect snapshot은 active
confirmation만 복원한다. C와 B가 공유할 canonical fixture는
`src/test/resources/contracts/d27-final-confirmation-response.json`이다.
