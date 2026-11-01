# 다이아리 상시 배포 (직접 따라하기)

저장소: https://github.com/krartwide/diari  

Cursor 에이전트 VM은 세션이 끝나면 꺼집니다. 항상 켜 두려면 아래 중 하나로 배포하세요.

**중요:** GitHub 브라우저 로그인이 안 되면, 호스팅 사이트에서도 **GitHub 버튼은 누르지 마세요.**  
Google 또는 이메일(인증 코드)로만 가입·로그인하세요.

---

## A. Railway (추천 · GitHub 불필요)

### 1) 계정

1. https://railway.com 접속
2. **Log in with Google** 또는 **Log in using email** 선택  
   (GitHub 버튼 금지)
3. 카드 등록이 나오면 Railway 유료 플랜 정책에 따라 진행

### 2) 프로젝트 만들기 (대시보드)

1. **New Project** → **Deploy from GitHub repo**  
   - 여기서 GitHub 연결이 막히면 → 아래 **CLI 방식**으로
2. 저장소 `krartwide/diari` 선택
3. 서비스 Settings → **Volume** 추가 → Mount path: `/data`
4. **Variables**에 아래 입력 후 재배포

```bash
DATABASE_URL=file:/data/diari.db
AUTH_SECRET=여기에-긴-무작위-문자열
AUTH_SITE_PASSWORD=로그인에-쓸-비밀번호-8자이상
ADMIN_EMAILS=kekekim75@gmail.com
AUTH_TRUST_HOST=true
AUTH_URL=https://생성된-도메인.up.railway.app
NEXTAUTH_URL=https://생성된-도메인.up.railway.app
```

5. Settings → Networking → **Generate Domain**  
   도메인이 나오면 `AUTH_URL` / `NEXTAUTH_URL`을 그 주소로 맞춘 뒤 다시 Deploy

### 3) GitHub 연결이 안 될 때 — CLI (로컬 PC)

PC에 Node가 있다면 저장소를 clone한 뒤:

```bash
git clone https://github.com/krartwide/diari.git
cd diari
npx railway login
# 브라우저에서 Google 또는 이메일로 승인 (GitHub 금지)

npx railway init
npx railway up
npx railway volume add --mount /data
npx railway domain
```

도메인을 확인한 뒤:

```bash
npx railway variables set \
  DATABASE_URL="file:/data/diari.db" \
  AUTH_SECRET="긴-무작위-문자열" \
  AUTH_SITE_PASSWORD="안전한-비밀번호" \
  ADMIN_EMAILS="kekekim75@gmail.com" \
  AUTH_TRUST_HOST="true" \
  AUTH_URL="https://당신의-도메인.up.railway.app" \
  NEXTAUTH_URL="https://당신의-도메인.up.railway.app"
```

그다음 `npx railway up`으로 한 번 더 배포합니다.

로그인: 이메일 `kekekim75@gmail.com` + `AUTH_SITE_PASSWORD`

---

## B. Render (Blueprint는 GitHub 연결 필요 → 피하기)

`select-repo?type=blueprint` 화면은 GitHub OAuth가 필요합니다.  
GitHub 로그인이 안 되면 **쓰지 마세요.**

대안:

1. Render에 **Google/이메일**로만 가입
2. **New → Web Service** → Git 제공자 연결 대신  
   - 저장소를 잠시 **Public**으로 바꾸거나  
   - Docker 이미지 배포를 쓰는 방식
3. Dockerfile 경로: `./Dockerfile`, 디스크 마운트 `/data`
4. 환경 변수는 위 Railway와 동일 (`AUTH_URL`만 `onrender.com` 주소로)

무료 플랜은 유휴 시 잠들 수 있습니다. 상시 가동은 Starter 이상.

---

## C. 환경 변수 요약

| 변수 | 필수 | 설명 |
| --- | --- | --- |
| `AUTH_SECRET` | 예 | 세션 서명 키 (긴 무작위) |
| `AUTH_SITE_PASSWORD` | 예 | 사이트 비밀번호 (8자+) |
| `ADMIN_EMAILS` | 권장 | `kekekim75@gmail.com` |
| `AUTH_URL` / `NEXTAUTH_URL` | 예 | 배포된 https 주소 |
| `DATABASE_URL` | 예 | `file:/data/diari.db` |
| `AUTH_TRUST_HOST` | 예 | `true` |

---

## D. 배포 후 확인

- 홈이 열리는지
- `/login`에서 사이트 비밀번호로 로그인되는지
- 관리자 계정으로 공개 팀을 수정할 수 있는지
