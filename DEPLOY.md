# 다이아리 상시 배포 (Cursor 꺼도 유지)

저장소: https://github.com/krartwide/diari  

로그인은 없습니다. 배포만 되면 바로 팀을 만들고 경기를 치를 수 있습니다.

Cursor 에이전트 VM은 세션이 끝나면 꺼집니다. **항상 켜 두려면** Docker로 클라우드에 올리세요.

**중요:** GitHub 브라우저 로그인이 안 되면, 호스팅 사이트에서도 **GitHub 버튼은 누르지 마세요.** Google 또는 이메일로만 가입하세요.

---

## A. Railway (추천)

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
