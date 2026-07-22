# 통합 체크리스트 (develop 병합 전)

## 공통

- [ ] contracts/api.ts 변경 여부 확인
- [ ] breaking change가 있으면 팀 채널 공지
- [ ] 테스트 또는 수동 검증 기록

## A. 프론트엔드 & 보이스 (개발자 A)

- [ ] URL 입력 -> 세션 생성 요청 연결
- [ ] 스트림 표시 및 오버레이 렌더링 확인
- [ ] 음성 안내 문구 표시/재생 확인

## B. 백엔드/자동화/보안 (개발자 B)

- [ ] session create/end API 정상
- [ ] DOM snapshot API 정상
- [ ] remote action API 정상
- [ ] 민감 입력 감지 결과 전달
- [ ] SECURITY_MODE 전환 규칙 동작
- [ ] 세션 TTL/만료 처리 확인

## C. AI 엔진 & 통합 (개발자 C)

- [ ] intent classify API 정상
- [ ] next-target 추론 API 정상
- [ ] guide-message 생성 API 정상
- [ ] structured output(JSON) 유효성 검증
- [ ] Webview 전환 인터페이스 연동 시나리오 점검
