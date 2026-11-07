# 다이아리 상시 배포

저장소: https://github.com/krartwide/diari  

로그인은 없습니다. 경기·팀 기록은 **브라우저 IndexedDB**에 남습니다.

## 추천: GitHub Pages (virtual-uno형)

서버 없이 정적 페이지만 올립니다. `main`에 푸시하면 Actions가 `https://krartwide.github.io/diari/` 로 배포합니다.

1. 저장소 Settings → Pages → Source: **GitHub Actions**
2. `main` 푸시 또는 Actions에서 “Deploy GitHub Pages” 수동 실행
3. 같은 브라우저로 그 주소를 계속 쓰면 기록이 유지됩니다

로컬에서 정적 산출물만 보려면:

```bash
npm run build:pages
mkdir -p /tmp/diari-pages/diari && rm -rf /tmp/diari-pages/diari/* && cp -a out/. /tmp/diari-pages/diari/
npx --yes serve /tmp/diari-pages -l 43124
# http://127.0.0.1:43124/diari/
```

---

## 선택: Railway / Docker 서버

서버 SQLite는 보조입니다. UI는 브라우저 저장을 씁니다.

### A. Railway

```bash
git clone https://github.com/krartwide/diari.git
cd diari
npx railway login   # Google/이메일
bash scripts/deploy-railway.sh
```

또는 대시보드에서 `krartwide/diari` 연결 → Volume `/data` → Variables:

```bash
DATABASE_URL=file:/data/diari.db
AUTH_SECRET=긴-무작위-문자열
AUTH_TRUST_HOST=true
AUTH_URL=https://생성된-도메인.up.railway.app
NEXTAUTH_URL=https://생성된-도메인.up.railway.app
```

---

## B. Docker (GHCR)

```bash
docker run -d --name diari -p 8080:8080 \
  -v diari-data:/data \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e AUTH_TRUST_HOST=true \
  -e AUTH_URL="https://당신도메인" \
  -e NEXTAUTH_URL="https://당신도메인" \
  -e DATABASE_URL="file:/data/diari.db" \
  ghcr.io/krartwide/diari:latest
```

---

## C. 환경 변수

| 변수 | 필수 | 설명 |
| --- | --- | --- |
| `DATABASE_URL` | 예 | `file:/data/diari.db` |
| `AUTH_SECRET` | 예 | 아무 긴 문자열 |
| `AUTH_TRUST_HOST` | 예 | `true` |
| `AUTH_URL` / `NEXTAUTH_URL` | 권장 | 배포 https 주소 |
| `PORT` | 자동 | 클라우드 주입 (기본 8080) |
