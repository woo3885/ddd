# Git 브랜치 전략

## 목적

- 배포 가능한 안정 코드와 개발 중인 통합 코드를 분리합니다.
- 세 명의 개발자가 담당 영역별로 충돌 없이 병렬 개발합니다.
- 모든 변경 사항은 Pull Request를 통해 검토한 후 병합합니다.

## 브랜치 구성

- `main`: 배포 가능한 안정 브랜치
- `develop`: 기능 통합 및 공동 검증 브랜치
- `feature/*`: 개별 기능 개발 브랜치
- `hotfix/*`: 긴급 오류 수정 브랜치

## 기본 흐름

### 1. 기능 개발

1. 최신 `develop`을 내려받습니다.
2. `develop`에서 `feature/*` 브랜치를 생성합니다.
3. 기능 구현과 테스트를 진행합니다.
4. `feature/*`에서 `develop`으로 Pull Request를 생성합니다.
5. 검토와 테스트가 완료되면 병합합니다.

### 2. 배포 준비

1. `develop`에서 통합 테스트를 수행합니다.
2. 검증 완료 후 `develop`에서 `main`으로 Pull Request를 생성합니다.
3. `main` 병합 후 배포 가능한 버전으로 관리합니다.

### 3. 긴급 오류 수정

1. `main`에서 `hotfix/*` 브랜치를 생성합니다.
2. 수정과 테스트를 완료합니다.
3. `hotfix/*`에서 `main`으로 Pull Request를 생성합니다.
4. 병합된 수정 사항을 `develop`에도 반영합니다.

## 브랜치 네이밍

### 개발자 A — Frontend & Voice

```text
feature/frontend-<task>
```

예시:

```text
feature/frontend-f1-dashboard
feature/frontend-voice-controller
```

### 개발자 B — Backend & Automation

```text
feature/backend-<task>
feature/security-<task>
```

예시:

```text
feature/backend-session-orchestrator
feature/backend-websocket-stream
feature/security-sensitive-detection
```

### 개발자 C — AI Engine & Integration

```text
feature/ai-<task>
```

예시:

```text
feature/ai-intent-classifier
feature/ai-next-target
feature/ai-risk-detection
```

### 긴급 수정

```text
hotfix/<task>
```

예시:

```text
hotfix/session-timeout
```

## 공통 규칙

- `main`과 `develop`에는 직접 push하지 않습니다.
- 모든 변경은 Pull Request로 병합합니다.
- 한 PR에는 하나의 기능 또는 하나의 수정만 포함합니다.
- 브랜치 이름은 영문 소문자와 하이픈을 사용합니다.
- 병합 전 테스트 또는 수동 검증 결과를 PR에 작성합니다.