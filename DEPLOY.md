# 다이아리 상시 배포

Cursor 클라우드 에이전트는 세션이 끝나면 VM과 함께 사이트가 꺼집니다.  
항상 켜 두려면 Railway 또는 Render에 배포하세요.

## GitHub 로그인이 안 될 때 (추천)

GitHub 없이도 Railway CLI로 바로 올릴 수 있습니다.

1. [railway.app](https://railway.app)에서 계정만 만듭니다. (Google/이메일 가입 가능, GitHub 불필요)
2. 이 프로젝트에서:

```bash
npx railway login --browserless
```

브라우저에서 나오는 링크·코드를 확인한 뒤 승인합니다.

3. 배포:

```bash
npx railway up --new --name diari -y
npx railway volume add --mount /data
```

4. Variables에 아래를 넣습니다 (`npx railway variables` 또는 대시보드).

```bash
DATABASE_URL=file:/data/diari.db
AUTH_SECRET=긴-무작위-문자열
AUTH_SITE_PASSWORD=안전한-비밀번호
ADMIN_EMAILS=kekekim75@gmail.com
AUTH_TRUST_HOST=true
AUTH_URL=https://당신의-railway-도메인.up.railway.app
NEXTAUTH_URL=https://당신의-railway-도메인.up.railway.app
```

5. 공개 주소:

```bash
npx railway domain
```

## 0. GitHub 저장소가 될 때 (선택)

1. Cursor에서 **Create repo**로 GitHub 저장소를 만듭니다.
2. 로컬/에이전트에서 `main`이 그 GitHub remote로 푸시되게 합니다.

## 1. Railway + GitHub (선택)

1. [railway.app](https://railway.app)에 로그인한 뒤 **New Project → Deploy from GitHub repo**로 이 저장소를 고릅니다.
2. 볼륨을 추가하고 마운트 경로를 `/data`로 둡니다.
3. Variables에 아래를 넣습니다.

```bash
DATABASE_URL=file:/data/diari.db
AUTH_SECRET=긴-무작위-문자열
AUTH_SITE_PASSWORD=안전한-비밀번호
ADMIN_EMAILS=kekekim75@gmail.com
AUTH_TRUST_HOST=true
AUTH_URL=https://당신의-railway-도메인.up.railway.app
NEXTAUTH_URL=https://당신의-railway-도메인.up.railway.app
```

4. 배포가 끝나면 공개 URL로 접속합니다. 로그인: `kekekim75@gmail.com` + `AUTH_SITE_PASSWORD`.
5. 도메인이 확정되면 `AUTH_URL` / `NEXTAUTH_URL`을 그 주소로 맞춘 뒤 한 번 재배포합니다.

이 저장소의 `Dockerfile`과 `railway.toml`을 그대로 씁니다.

## 2. Render (GitHub 대시보드 로그인이 될 때만)

Render Blueprint(`select-repo?type=blueprint`)는 **GitHub로 저장소를 연결**해야 합니다.  
GitHub/Render 쪽 로그인이 안 되면 이 경로는 쓰지 말고 위의 **Railway CLI**를 쓰세요.

가능하면:

1. [render.com](https://render.com) → **New → Blueprint** → GitHub 저장소 `krartwide/diari` 연결 → `render.yaml` 적용.
2. `AUTH_SITE_PASSWORD`, `AUTH_URL`, `NEXTAUTH_URL`을 배포 URL에 맞게 직접 입력합니다.
3. 디스크 `/data`에 SQLite가 저장됩니다.

참고: Render 무료 웹 서비스는 한동안 접속이 없으면 잠들 수 있습니다. 항상 켜 두려면 Starter 이상 플랜을 쓰세요.

## 3. 환경 변수 요약

| 변수 | 필수 | 설명 |
| --- | --- | --- |
| `AUTH_SECRET` | 예 | 세션 서명 키 |
| `AUTH_SITE_PASSWORD` | 예(로컬 로그인) | 8자 이상 사이트 비밀번호 |
| `ADMIN_EMAILS` | 권장 | `kekekim75@gmail.com` |
| `AUTH_URL` / `NEXTAUTH_URL` | 예 | 배포된 https 주소 |
| `DATABASE_URL` | 예 | 기본 `file:/data/diari.db` |
| `AUTH_GITHUB_ID` / `SECRET` | 선택 | GitHub OAuth |
| `AUTH_GOOGLE_ID` / `SECRET` | 선택 | Google OAuth |

OAuth를 쓸 경우 콜백에  
`https://당신의도메인/api/auth/callback/github`  
`https://당신의도메인/api/auth/callback/google`  
을 등록하세요.

## 4. 배포 후 확인

- 홈이 열리는지
- `/login`에서 사이트 비밀번호로 로그인되는지
- 공개 팀을 관리자 계정으로 고칠 수 있는지
