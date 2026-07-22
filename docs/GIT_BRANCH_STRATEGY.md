# Git 브랜치 전략

## 목적

- 안정 배포 코드와 개발 통합 코드를 분리합니다.
- 기능 개발과 긴급 장애 대응 흐름을 표준화합니다.

## 브랜치 구성

- main: 언제든 배포 가능한 안정 코드
- master: main과 동일한 안정 코드 동기화 브랜치
- develop: 기능 통합 브랜치
- feature/*: 개별 기능 개발 브랜치
- hotfix/*: 운영 긴급 장애 수정 브랜치

## 기본 흐름

1. 기능 개발
- develop에서 feature/* 브랜치 생성
- 작업 후 feature/* -> develop PR

2. 배포 준비
- develop 검증 완료 후 develop -> main PR
- main 반영 후 master 동기화

3. 긴급 장애 대응
- main에서 hotfix/* 브랜치 생성
- 수정 후 hotfix/* -> main PR
- main 반영 후 develop, master에 역병합

## 네이밍 예시

- feature/로그인
- feature/issue-12
- hotfix/payment-timeout
