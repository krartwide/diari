# 다이아리 상시 배포 (Cursor 꺼도 유지)

저장소: https://github.com/krartwide/diari  

Cursor 에이전트 VM은 세션이 끝나면 꺼집니다. **항상 켜 두려면** 아래처럼 이 저장소의 Docker 이미지를 클라우드에 올리면 됩니다.

**중요:** GitHub 브라우저 로그인이 안 되면, 호스팅 사이트에서도 **GitHub 버튼은 누르지 마세요.**  
Google 또는 이메일로만 가입·로그인하세요.

---

## A. Railway (추천 · CLI 한 번에)

PC 또는 이 저장소를 clone한 환경에서:

```bash
git clone https://github.com/krartwide/diari.git
cd diari
npx railway login
# 브라우저에서 Google 또는 이메일로 승인 (GitHub 금지)
bash scripts/deploy-railway.sh
```

스크립트가 빌드·볼륨(`/data`)·환경 변수·도메인을 맞춥니다.

대시보드로 할 때:

1. https://railway.com → **Log in with Google**
2. New Project → Deploy from GitHub (`krartwide/diari`) 또는 empty + `railway up`
3. Volume mount: `/data`
4. Variables:

```bash
DATABASE_URL=file:/data/diari.db
AUTH_SECRET=여기에-긴-무작위-문자열
AUTH_SITE_PASSWORD=로그인에-쓸-비밀번호-8자이상
ADMIN_EMAILS=kekekim75@gmail.com
AUTH_TRUST_HOST=true
AUTH_URL=https://생성된-도메인.up.railway.app
NEXTAUTH_URL=https://생성된-도메인.up.railway.app
```

5. Networking → Generate Domain 후 `AUTH_URL` / `NEXTAUTH_URL`을 그 주소로 맞추고 재배포

로그인: `kekekim75@gmail.com` + `AUTH_SITE_PASSWORD`

---

## B. Docker 이미지 (GHCR) — 어떤 VPS든

`main` 푸시 시 GitHub Actions가 이미지를 올립니다.

```bash
docker run -d --name diari -p 8080:8080 \
  -v diari-data:/data \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e AUTH_SITE_PASSWORD="안전한-비밀번호" \
  -e ADMIN_EMAILS="kekekim75@gmail.com" \
  -e AUTH_TRUST_HOST=true \
  -e AUTH_URL="https://당신도메인" \
  -e NEXTAUTH_URL="https://당신도메인" \
  -e DATABASE_URL="file:/data/diari.db" \
  ghcr.io/krartwide/diari:latest
```

이미지가 private이면 GitHub Packages에서 공개로 바꾸거나 `docker login ghcr.io` 후 pull 하세요.

---

## C. Render

Blueprint(`select-repo?type=blueprint`)는 GitHub OAuth가 필요합니다. GitHub 로그인이 막히면 쓰지 마세요.

Google/이메일로 Render 가입 후 Web Service + Dockerfile(`./Dockerfile`), 디스크 `/data`, 환경 변수는 Railway와 동일(`AUTH_URL`만 onrender 주소).

무료 플랜은 유휴 시 잠들 수 있습니다.

---

## D. 환경 변수

| 변수 | 필수 | 설명 |
| --- | --- | --- |
| `AUTH_SECRET` | 예 | 세션 서명 키 |
| `AUTH_SITE_PASSWORD` | 권장 | 공유 부트스트랩 비밀번호 (8자+) |
| `ADMIN_EMAILS` | 권장 | `kekekim75@gmail.com` |
| `AUTH_URL` / `NEXTAUTH_URL` | 예 | 배포된 https 주소 |
| `DATABASE_URL` | 예 | `file:/data/diari.db` |
| `AUTH_TRUST_HOST` | 예 | `true` |
| `PORT` | 자동 | 클라우드가 주입 (이미지 기본 8080) |
