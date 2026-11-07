# 다이아리 배포

저장소: https://github.com/krartwide/diari

로그인은 없습니다. 경기·팀 기록은 **브라우저 IndexedDB**에만 남습니다.

## GitHub Pages (권장)

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
