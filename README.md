# 다이아리

팀을 만들고, 그 팀으로 야구 경기를 치르는 시뮬레이션입니다. 공 하나의 구종·구속·스트라이크 판정과, 맞았을 때의 방향·비거리·타구 속도가 경기 글에 남습니다.

공개 역사 구단 21개는 조사한 한국시리즈·가을야구 엔트리와 정규시즌 카운팅 기록입니다. 불펜과 마무리는 따로 나뉘어 있고, 투수 구속은 최고 시속입니다(시뮬에서는 평소 그보다 낮게 나갑니다). 2014 키움 히어로즈는 당시 구단명 넥센 히어로즈의 시즌입니다. 2008 대한민국 국가대표는 베이징 올림픽 최종 24인 엔트리이며, 능력치는 그해 소속 리그 정규시즌(이승엽만 요미우리)입니다. wRC+와 sWAR는 공식 기본 기록에 없는 값이라 카운팅 기록으로 추정했습니다.

경기는 로그인해야 시작할 수 있습니다. Google 계정으로 로그인하면 브라우저를 닫아도 같은 기기에서 세션이 유지되고, 팀·경기·업적은 계정마다 따로 저장됩니다.

## 실행

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev
```

브라우저에서 http://127.0.0.1:43123 을 엽니다.

### Google 로그인

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials)에서 OAuth 클라이언트를 만듭니다.
2. 승인된 리디렉션 URI에 `http://127.0.0.1:43123/api/auth/callback/google` 와 배포 도메인의 `/api/auth/callback/google` 을 넣습니다.
3. `.env`에 다음을 채웁니다.

```bash
AUTH_SECRET=긴-무작위-문자열
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
AUTH_TRUST_HOST=true
DATABASE_URL="file:../data/diari.db"
```

키가 없으면 개발 로그인으로 계정을 만들 수 있습니다. 배포 전에는 `ALLOW_DEV_LOGIN=false`로 끄는 것을 권장합니다.

### GitHub / Vercel에 올리기

이 저장소를 GitHub에 연결한 뒤 Vercel 등으로 배포하면, 이 클라우드 환경이 꺼져도 계정별 기록이 남습니다. SQLite는 로컬·단일 서버에 맞고, Vercel처럼 서버리스로 올릴 때는 `prisma/schema.prisma`의 `provider`를 `postgresql`로 바꾸고 `DATABASE_URL`에 Postgres 연결 문자열을 넣으면 됩니다.

```bash
npx prisma migrate deploy
npm run build
npm run start
```

## 기록 입력

팀이 비공개면 본인 계정에만 보입니다. 공개로 바꾸면 이 서버를 쓰는 다른 사람도 경기에 넣을 수 있습니다. 공개 역사 구단은 고치지 않고, 복제해서 내 팀으로 만듭니다.

비율 기록은 소수점을 찍지 않아도 됩니다. 타율·출루율·장타율·OPS는 `285`가 `0.285`, ERA·WHIP은 `325`가 `3.25`, sWAR는 `635`가 `6.35`입니다. 이닝은 `188.2` 또는 `188 2/3`로 적을 수 있습니다.
