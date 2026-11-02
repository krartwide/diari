# Classic KBO / Olympic roster verify

Checked current `TEAMS` in `/workspace/scripts/build_canonical.py` against namu/seore KS 엔트리, Wikipedia season depth charts, and `/tmp/kbo/raw-teams.json` (non-Olympic). Olympic stats cross-checked against namu `김경문호/2008년` game logs + existing `OLYMPIC_2008_*` dicts.

**Method:** KS membership must match published 엔트리. Non-PS teams use Wikipedia 선수단 + meaningful PA/IP. Every non-Olympic canonical name resolves in `raw-teams.json`.

---

## Summary

| ID | Verdict | Action |
|----|---------|--------|
| `canon-1992-lt` | **OK** | none |
| `canon-1992-hh` | **CHANGE** | REMOVE `진정필` |
| `canon-1993-ht` | **CHANGE** | FIX LF/DH/C; ADD `이경복`; blurb |
| `canon-1994-lg` | **OK** | none |
| `canon-1995-ob` | **OK** | note only: `강길용` = KS `강길룡` |
| `canon-1996-sb` | **OK** (mild note) | optional rotation shape |
| `canon-2008-wo` | **OK** | none material |
| `canon-2009-wo` | **OK** | none material |
| `canon-2008-kor` | **CHANGE** | FIX pitcher role split vs Olympic usage |

---

## 1. `canon-1992-lt` — 1992 롯데 자이언츠 (KS)

**Sources**
- https://namu.wiki/w/1992년_한국시리즈
- https://seore.org/w/1992년_한국시리즈
- https://ko.wikipedia.org/wiki/1992년_롯데_자이언츠_시즌
- raw key `1992-LT`

**KS 투수 9:** 윤학길, 이상번, 박동희, 김태형, 박동수, 김상현, 윤형배, 염종석, 김종석  
**KS 야수:** 포수 김선일·강성우·고정식 / 내야 박영태·김민호·한영준·공필성·박정태·박계원·김민재 / 외야 장효조·조성옥·최계영·김응국·이종운·김종헌·전준호

| | |
|---|---|
| **REMOVE** | — |
| **ADD** | — |
| **FIX** | — |

**KEEP:** Full KS membership. Rotation+bullpen = exact 9 KS pitchers. Typical KS batting pattern (전준호 CF … 김선일 C) matches namu games 2–4 style; GG positions (박정태 2B, 박계원 SS, 김응국 OF) match. All names in raw.

```python
# no change — current block is KS-accurate
```

---

## 2. `canon-1992-hh` — 1992 빙그레 이글스 (KS)

**Sources**
- https://namu.wiki/w/1992년_한국시리즈
- https://seore.org/w/1992년_한국시리즈
- raw key `1992-HH`

**KS 투수 9:** 한희민, 이상군, 송진우, 지연규, 김인권, 김홍명, 한용덕, 장정순, 정민철  
(진정필 **not** on KS; season-only arm, 40⅔ IP)

**KS lineup (1차전):** 이정훈 CF, 이중화 RF, 장종훈 1B, 강정길 DH, 이강돈 LF, 강석천 3B, 김상국 C, 전대영 2B, 지화동 SS — matches current lineup.

| | |
|---|---|
| **REMOVE** | **`진정필`** (bullpen) — not on KS 엔트리 |
| **ADD** | — (hitters already complete) |
| **FIX** | After remove: bullpen = `김인권`, `한희민`, `지연규` → staff = exact KS 9 with closer 송진우 |

```python
{
    "id": "canon-1992-hh",
    "name": "1992 빙그레 이글스",
    "shortName": "빙그레",
    "year": 1992,
    "keys": ["1992-HH"],
    "primary": "#E10600",
    "secondary": "#0E7A3D",
    "blurb": "1992 한국시리즈 진출 엔트리. 장종훈 41홈런, 정민철·한용덕 선발, 송진우가 선발·마무리를 오갔다.",
    "lineup": [("이정훈", "CF"), ("이중화", "RF"), ("장종훈", "1B"), ("강정길", "DH"), ("이강돈", "LF"), ("강석천", "3B"), ("김상국", "C"), ("전대영", "2B"), ("지화동", "SS")],
    "bench": ["양용모", "임주택", "이종호", "조양근", "진상봉", "성군철", "김용선"],
    "rotation": ["정민철", "한용덕", "장정순", "이상군", "김홍명"],
    "bullpen": ["김인권", "한희민", "지연규"],  # removed 진정필
    "closers": ["송진우"],
}
```

---

## 3. `canon-1993-ht` — 1993 해태 타이거즈 (KS)

**Sources**
- https://seore.org/w/1993년_한국시리즈
- https://namu.moe/w/1993년_한국시리즈 (1·3차전 라인업)
- https://ko.wikipedia.org/wiki/1993년_해태_타이거즈_시즌
- raw key `1993-HT`

**KS 투수 9:** 선동열, 김정수, 문희수, 조계현, 이강철, 신동수, 송유석, 이대진, 강태원 — current staff exact.

**KS 1차전:** 이종범 SS, 박철우 DH, 홍현우 2B, 이호성 RF, 한대화 3B, 김성한 1B, 이순철 CF, **정회열 C**, **이건열 LF**  
**KS 3차전:** … **정성룡 DH**, … **정회열 C**, **이건열 LF**

| | |
|---|---|
| **REMOVE** | — |
| **ADD** | **`이경복`** (bench IF) — on KS 내야 9, currently missing |
| **FIX** | **`이건열` → LF** (not DH); **`정성룡` → DH** (not LF); prefer **`정회열` C** in lineup, **`장채근`** to bench (KS games started 정회열; 장채근 was PH HR in 5차전). Blurb: 송유석은 선발축이라기보다 스윙맨/중계 (Wiki 구원·마무리 분류). |

```python
{
    "id": "canon-1993-ht",
    "name": "1993 해태 타이거즈",
    "shortName": "해태",
    "year": 1993,
    "keys": ["1993-HT"],
    "primary": "#E10600",
    "secondary": "#111111",
    "blurb": "1993 한국시리즈 우승 엔트리. 선동열 마무리, 조계현·이강철·이대진·김정수 선발, 송유석 스윙맨.",
    "lineup": [
        ("이종범", "SS"), ("이순철", "CF"), ("김성한", "1B"), ("한대화", "3B"),
        ("홍현우", "2B"), ("이건열", "LF"), ("이호성", "RF"), ("정회열", "C"), ("정성룡", "DH"),
    ],
    "bench": ["장채근", "김훈", "박철우", "이용석", "윤재호", "김병조", "이경복"],
    "rotation": ["조계현", "이강철", "이대진", "김정수"],
    "bullpen": ["송유석", "문희수", "강태원", "신동수"],
    "closers": ["선동열"],
}
```

---

## 4. `canon-1994-lg` — 1994 LG 트윈스 (KS)

**Sources**
- https://seore.org/w/1994년_한국시리즈
- raw key `1994-LG`

**KS 투수 10:** 김용수, 정삼흠, 김태원, 차동철, 김기범, 민원기, 이상훈, 강봉수, 인현배, 차명석 — exact.  
**KS 야수 16:** all present; positions 류지현 SS / 서용빈 1B / 한대화 3B / 박종호 2B match KS lineups.

| | |
|---|---|
| **REMOVE** | — |
| **ADD** | — |
| **FIX** | — |

```python
# no change
```

---

## 5. `canon-1995-ob` — 1995 OB 베어스 (KS)

**Sources**
- https://seore.org/w/1995년_한국시리즈
- https://ko.wikipedia.org/wiki/1995년_OB_베어스_시즌 (김민호 SS GG, 이명수 2B GG)
- raw key `1995-OB`

**KS 투수 9:** 박철순, 장호연, **강길룡**, 권명철, 김상진, 이용호, 홍길남, 김경원, 진필중  
**raw / TEAMS name:** `강길용` (id `91821`) — same pitcher; keep DB spelling so `find_pitcher` works.

**KS 야수:** membership complete (incl. 김광현·김정규; no 임형석). Lineup positions OK.

| | |
|---|---|
| **REMOVE** | — |
| **ADD** | — |
| **FIX** | Spelling note only — do **not** rename to 강길룡 (breaks raw lookup). |

```python
# no code change; document alias 강길용 == KS 표기 강길룡
```

---

## 6. `canon-1996-sb` — 1996 쌍방울 (PO, not KS)

**Sources**
- https://ko.wikipedia.org/wiki/1996년_쌍방울_레이더스_시즌
- https://namu.wiki/w/KBO_플레이오프/1996년
- https://readonly.wiki/w/KBO_플레이오프/1996년
- raw key `1996-SB`

No published full PO 28-man entry found; verify as **season depth + PO usage**.

**PO arms used:** 성영재, 김원형, 오봉옥, 김기덕, 조규제 (series).  
**Wiki 선발:** 성영재, 오봉옥, 박성기, 박진석, 김원형, 유현승… / **구원:** 김기덕… / **마무리:** 조규제

| | |
|---|---|
| **REMOVE** | — (no false outsiders) |
| **ADD** | — |
| **FIX** | Optional: Wiki lists **김기덕** as 구원 (43G, 112⅔ IP swing). Current rotation slot is PO-justified (started G2/G5). Prefer leave as-is for “첫 가을야구” framing; alt season-pure chart moves 김기덕 → bullpen and 박진석/유현승 up. Lineup matches Wiki positions (김광림 CF, 김실 RF, 김기태 1B, 심성보 LF, 박경완 C, …). |

```python
# optional season-pure pitch staff (only if locking to Wiki 선발/구원 labels):
# "rotation": ["성영재", "오봉옥", "김원형", "박성기", "박진석"],
# "bullpen": ["김기덕", "김현욱", "최정환", "박주언", "유현승"],
# "closers": ["조규제"],
# recommended: KEEP current (PO-shaped) — no required change
```

---

## 7. `canon-2008-wo` — 2008 우리 히어로즈 (no PS)

**Sources**
- https://ko.wikipedia.org/wiki/2008년_우리_히어로즈/히어로즈_시즌
- raw key `2008-WO`

Wiki 선발 lists 스코비; he was waived May (11G, ERA 6.95) — correctly **excluded**; **이현승** (120 IP) fills 4th starter. Closers **황두성·다카쓰** (8 SV each) match. Lineup matches season chart (이택근 CF, 정성훈 3B, 브룸바 DH, 전준호 LF, …). Dual name `전준호` OF (`91511`) / P (`94364`) both in raw — OK for builder.

| | |
|---|---|
| **REMOVE** | — (스코비 already out) |
| **ADD** | — |
| **FIX** | — |

```python
# no change
```

---

## 8. `canon-2009-wo` — 2009 서울 히어로즈 (no PS)

**Sources**
- https://ko.wikipedia.org/wiki/2009년_히어로즈/서울_히어로즈_시즌
- raw key `2009-WO`

Wiki 선발: 이현승, 장원삼, 마일영, 김수경 — matches. Closer 황두성 (9 SV) OK. **강윤구** (45G, 80 IP) is in raw and correctly in **bullpen** (Wikipedia 선수단 omits him — treat raw as authority). Lineup OK (클락 LF, 황재균 3B, …).

| | |
|---|---|
| **REMOVE** | — |
| **ADD** | — |
| **FIX** | — |

```python
# no change
```

---

## 9. `canon-2008-kor` — 2008 Olympic team (24-man)

**Sources**
- https://www.yna.co.kr/view/AKR20080714115651007 (initial 24; **임태훈** in)
- https://ko.wikipedia.org/wiki/2008년_하계_올림픽_야구_남자부_선수_명단 (final; **윤석민** replaces 임태훈)
- https://namu.wiki/w/김경문호/2008년 (game-by-game usage + cumulative leaders)
- `OLYMPIC_2008_HITTERS` / `OLYMPIC_2008_PITCHERS` in `build_canonical.py`

### 24-man roster
14 hitters + 10 pitchers = **24**. Matches final Beijing roster (윤석민 in, 임태훈 out). Names OK.

### Cumulative stats
Dict values match namu leaders / game-log sums (e.g. 류현진 17⅓ IP 2 ER; 이용규 13 H / .481; 이대호 3 HR 10 RBI; 정대현 2 SV; 장원삼 12⅓ IP 0 ER). **KEEP stats.**

### Pitcher role split vs Olympic usage

| Pitcher | Olympic starts / role | Current slot |
|---------|----------------------|--------------|
| 류현진 | SP Canada, SP Final | rotation ✓ |
| 김광현 | SP Japan, SP SF Japan (+1 IP US) | rotation ✓ |
| 송승준 | SP Cuba group | rotation ✓ |
| 장원삼 | SP China (susp.) / SP Netherlands CGSHO | rotation ✓ |
| **봉중근** | **SP US, SP Taiwan** (planned 4-man SP) | **bullpen — wrong** |
| 윤석민 | RP/CL swing, 5 G, 1 SV | bullpen ✓ |
| 정대현 | RP; **2 SV incl. gold-medal game** | bullpen |
| 한기주 / 권혁 | RP | bullpen ✓ |
| 오승환 | CL (1 SV Cuba group) | closers ✓ |

Planned SP set (Kim Kyung-moon): 류현진·김광현·**봉중근**·송승준. 장원삼 also started twice. Gold-medal save: **정대현** (not 오승환).

| | |
|---|---|
| **REMOVE** | — |
| **ADD** | — |
| **FIX** | Put **봉중근 in rotation** (5-man Olympic SP pool). Keep 오승환 as primary closer; optionally list **정대현** as co-closer / note gold-medal SV in blurb. |

```python
{
    "id": "canon-2008-kor",
    "name": "2008 대한민국 국가대표",
    "shortName": "대표",
    "year": 2008,
    "keys": [],
    "primary": "#CD2E3A",
    "secondary": "#0A3161",
    "blurb": "2008 베이징 올림픽 금메달 최종 24인. 능력치는 올림픽 본선 9경기 공식 누적 기록. 류현진 2승·ERA 1.04, 이용규 타율 .481. 선발 류현진·김광현·봉중근·송승준·장원삼, 오승환·정대현이 마무리를 나눠 닫았다.",
    "olympic": True,
    "lineup": [("이종욱", "CF"), ("이용규", "RF"), ("김현수", "LF"), ("이승엽", "1B"), ("김동주", "3B"), ("이대호", "DH"), ("고영민", "2B"), ("강민호", "C"), ("박진만", "SS")],
    "bench": ["진갑용", "이진영", "이택근", "정근우", "김민재"],
    # Actual Olympic starters (5): planned 4 + 장원삼
    "rotation": ["류현진", "김광현", "봉중근", "송승준", "장원삼"],
    "bullpen": ["윤석민", "한기주", "권혁"],
    "closers": ["오승환", "정대현"],  # 정대현 2 SV (incl. gold); 오승환 1 SV
}
# OLYMPIC_2008_* dicts: no stat changes
```

---

## raw-teams.json cross-check (non-Olympic)

All canonical display names for teams 1–8 resolve in the matching `YYYY-CODE` raw bucket (hitters for lineup/bench, pitchers for staff).  

Notable dual / alias:
- `2008-WO` `전준호` OF vs P — distinct ids, OK
- `1995-OB` `강길용` ↔ KS spelling `강길룡`
- `2009-WO` `강윤구` present in raw (80 IP) despite Wiki omission

---

## Priority apply order

1. **`canon-1992-hh`** — REMOVE `진정필` (hard KS membership error)
2. **`canon-1993-ht`** — FIX 이건열 LF / 정성룡 DH / 정회열 C; ADD `이경복`
3. **`canon-2008-kor`** — FIX rotation/closer split to Olympic usage
4. Others — keep as verified OK
