# Sentry Analyzer

Sentry 에러를 Google Gemini AI가 자동으로 분석해서 GitHub Issue로 만드는 시스템

## 시스템 구조

```
[Sentry 에러 발생]
    ↓
[Sentry Webhook]
    ↓
[Vercel Function] ← 이 저장소
    ↓
[GitHub Actions 트리거]
    ↓
[Gemini AI 분석 + Issue 생성]
```

## 이 저장소의 역할

Sentry Webhook을 받아서 GitHub Actions를 트리거하는 중계 서버

## 설정 방법

### 1. Vercel 배포

1. [Vercel](https://vercel.com)에 로그인
2. "New Project" 클릭
3. 이 GitHub 저장소 (`sentry-analyzer`) 선택
4. 배포 (Deploy)

### 2. Vercel 환경변수 설정

Vercel 프로젝트 설정에서 다음 환경변수 추가:

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `GITHUB_TOKEN` | GitHub Personal Access Token | `ghp_xxxxxxxxxxxx` |
| `GITHUB_OWNER` | GitHub 사용자명/조직명 | `userjmmm` |
| `GITHUB_REPO` | GitHub 저장소명 | `inplace` |

#### GitHub Token 생성 방법

1. GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
2. "Generate new token (classic)" 클릭
3. 권한 선택:
   - `repo` (전체) - repository_dispatch를 위해 필요
4. 토큰 생성 후 복사

### 3. Webhook URL 확인

배포 완료 후 URL 확인:
```
https://your-project.vercel.app/api/sentry-webhook
```

### 4. Sentry 설정

#### 4.1 Internal Integration 생성

1. Sentry > Settings > Developer Settings > Internal Integrations
2. "New Internal Integration" 클릭
3. 설정:
   - **Name**: GitHub Issue Creator
   - **Webhook URL**: `https://your-project.vercel.app/api/sentry-webhook`
   - **Webhooks**: `error.created`, `issue.created` 체크
   - **Permissions**: 필요 없음 (읽기만 함)

#### 4.2 Alert Rule 생성

1. Sentry > Alerts > Create Alert
2. 조건 설정:
   - "When an event is first seen"
   - 또는 "When an error occurs"
3. Actions:
   - "Send a webhook" 선택
   - 위에서 만든 Integration 선택

## 테스트

### 로컬 테스트

```bash
npm install
npm run dev
```

### Webhook 테스트

```bash
curl -X POST https://your-project.vercel.app/api/sentry-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "action": "created",
    "data": {
      "issue": {
        "id": "123456",
        "title": "Test Error",
        "culprit": "test.js",
        "level": "error",
        "project": {"slug": "test-project"},
        "permalink": "https://sentry.io/issues/123456"
      }
    }
  }'
```

## 다음 단계

이 저장소 설정이 완료되면:

1. **inplace 저장소**에 GitHub Actions Workflow 추가
2. **inplace 저장소**에 Gemini AI 분석 스크립트 추가
3. GitHub Secrets 설정:
   - `GEMINI_API_KEY`: Google Gemini API 키
   - `SENTRY_AUTH_TOKEN`: Sentry API 토큰
   - `SENTRY_ORG`: Sentry 조직 slug

## 파일 구조

```
sentry-analyzer/
├── api/
│   └── sentry-webhook.js    # Vercel Serverless Function
├── package.json
├── vercel.json               # Vercel 설정
├── .gitignore
└── README.md
```

## 문제 해결

### Webhook이 트리거되지 않을 때

1. Vercel 로그 확인: Vercel Dashboard > Deployments > Functions
2. Sentry Integration 확인: Sentry > Settings > Integrations
3. GitHub Token 권한 확인: `repo` 권한 필요

### GitHub Actions가 실행되지 않을 때

1. GitHub 저장소 설정 확인: Settings > Actions (활성화 필요)
2. Workflow 파일 확인: `.github/workflows/sentry-analysis.yml` 존재 여부
3. repository_dispatch 이벤트 확인

## 라이선스

MIT
