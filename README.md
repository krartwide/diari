# 다이아리

팀을 만들고, 그 팀으로 야구 경기를 치르는 시뮬레이션입니다. 공 하나의 구종·구속·스트라이크 판정과, 맞았을 때의 방향·비거리·타구 속도가 경기 글에 남습니다.

공개 역사 구단 23개는 한국시리즈·플레이오프 공식 엔트리(또는 해당 시즌 주전 깊이표)에 맞춥니다. 엔트리에 없는 선수로 채우지 않습니다. 불펜과 마무리는 따로 나뉘어 있고, 투수 구속은 최고 시속입니다(시뮬에서는 평소 그보다 낮게 나갑니다). 히어로즈는 2008 우리·2009 서울·2014 넥센으로 나뉩니다. 2008 대한민국 국가대표는 베이징 올림픽 최종 24인 엔트리이며, 능력치는 그해 소속 리그 정규시즌(이승엽만 요미우리)입니다. wRC+와 sWAR는 공식 기본 기록에 없는 값이라 카운팅 기록으로 추정했습니다.

경기는 로그인이 필요합니다. Google Cloud가 없어도 `AUTH_SITE_PASSWORD`로 들어오거나, GitHub OAuth를 쓸 수 있습니다. Google 키가 있으면 Google 로그인도 함께 켜집니다. 한 번 로그인하면 같은 기기에서 세션이 유지되고, 팀·경기·업적은 계정마다 따로 저장됩니다.

## 실행

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev
```

브라우저에서 http://127.0.0.1:43123 을 엽니다.

### 로그인

이메일만으로는 로그인되지 않습니다. 아래 중 하나를 쓰세요.

1. **사이트 비밀번호** (Google Cloud 불필요): `.env`에 `AUTH_SITE_PASSWORD`(8자 이상)를 넣고, 로그인 화면에서 이메일 + 그 비밀번호를 입력합니다. 운영자는 `kekekim75@gmail.com`으로 들어오면 공개 팀을 고칠 수 있습니다.
2. **GitHub** (선택): GitHub → Settings → Developer settings → OAuth Apps에서 앱을 만들고 콜백 `http://127.0.0.1:43123/api/auth/callback/github` 을 넣은 뒤 `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`을 설정합니다.
3. **Google** (선택): Google Cloud가 가능할 때 OAuth 클라이언트를 만들고 콜백 `http://127.0.0.1:43123/api/auth/callback/google` 과 `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`을 넣습니다.

```bash
AUTH_SECRET=긴-무작위-문자열
AUTH_SITE_PASSWORD=안전한-비밀번호
AUTH_TRUST_HOST=true
ADMIN_EMAILS=kekekim75@gmail.com
DATABASE_URL="file:../data/diari.db"
AUTH_URL="http://127.0.0.1:43123"
NEXTAUTH_URL="http://127.0.0.1:43123"
```

`ADMIN_EMAILS`(기본에 `kekekim75@gmail.com` 포함)의 계정은 사이트 운영자로, 공개 역사 구단을 직접 고칠 수 있습니다. 수정 내용은 DB에 덮어쓰기로 저장되며 모든 사용자에게 공개로 유지됩니다.

### 상시 배포 (Cursor를 꺼도 유지)

Cursor 클라우드 에이전트 안의 서버는 세션이 끝나면 함께 종료됩니다. 항상 켜 두려면 GitHub에 올린 뒤 **Railway** 또는 **Render**에 Docker로 배포하세요. 자세한 단계는 [DEPLOY.md](./DEPLOY.md)를 보면 됩니다.

```bash
npm run build
npm run start:prod
```

로컬·단일 서버는 SQLite(`DATABASE_URL=file:...`)를 씁니다. 배포 이미지 기본값은 `file:/data/diari.db`이며, 볼륨을 `/data`에 붙이면 재배포 후에도 기록이 남습니다.

## 기록 입력

팀이 비공개면 본인 계정에만 보입니다. 공개로 바꾸면 이 서버를 쓰는 다른 사람도 경기에 넣을 수 있습니다. 일반 사용자는 공개 역사 구단을 고치지 않고 복제해서 내 팀으로 만듭니다. 사이트 운영자(`ADMIN_EMAILS`)는 공개 역사 구단 원본을 편집할 수 있습니다.

비율 기록은 소수점을 찍지 않아도 됩니다. 타율·출루율·장타율·OPS는 `285`가 `0.285`, ERA·WHIP은 `325`가 `3.25`, sWAR는 `635`가 `6.35`입니다. 이닝은 `188.2` 또는 `188 2/3`로 적을 수 있습니다.
