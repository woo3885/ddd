# 3인 브랜치 Quick Start

## 공통 (최초 1회)

```bash
git config --global user.name "YOUR_NAME"
git config --global user.email "YOUR_EMAIL"
```

## develop 최신화

```bash
git checkout develop
git pull origin develop
```

## 개발자 A (Frontend & Voice)

```bash
git checkout -b feature/frontend-f1-dashboard
```

## 개발자 B (Backend & Automation + Security)

```bash
git checkout -b feature/backend-session-orchestrator
# 또는
git checkout -b feature/security-sensitive-detection
```

## 개발자 C (AI Engine & Integration)

```bash
git checkout -b feature/ai-next-target
```

## 긴급 장애 대응 (Hotfix)

```bash
git checkout main
git pull origin main
git checkout -b hotfix/login-timeout
```

## 작업 후

```bash
git add .
git commit -m "feat: <what you implemented>"
git push -u origin <your-branch>
```

PR 생성 시 .github/PULL_REQUEST_TEMPLATE.md 체크리스트를 사용하세요.
