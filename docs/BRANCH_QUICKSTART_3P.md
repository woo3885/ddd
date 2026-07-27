# 3인 브랜치 Quick Start

## 공통 설정 — 최초 1회

```bash
git config --global user.name "YOUR_NAME"
git config --global user.email "YOUR_EMAIL"
```

## 작업 시작 전 develop 최신화

모든 기능 브랜치는 최신 `develop`에서 생성합니다.

```bash
git switch develop
git pull origin develop
```

## 개발자 A — Frontend & Voice

```bash
git switch -c feature/frontend-f1-dashboard
```

## 개발자 B — Backend & Automation

```bash
git switch -c feature/backend-session-orchestrator
```

보안 기능을 별도 브랜치로 작업하는 경우:

```bash
git switch -c feature/security-sensitive-detection
```

## 개발자 C — AI Engine & Integration

```bash
git switch -c feature/ai-next-target
```

## 작업 완료 후

```bash
git add .
git commit -m "feat: 구현한 기능 설명"
git push -u origin 현재-브랜치명
```

GitHub에서 현재 브랜치에서 `develop` 브랜치로 Pull Request를 생성합니다.

PR 작성 시 `.github/PULL_REQUEST_TEMPLATE.md`의 체크리스트를 사용하세요.

## 긴급 장애 대응

Hotfix는 `main`에서 생성합니다.

```bash
git switch main
git pull origin main
git switch -c hotfix/login-timeout
```