# Verify: Diari 1980s canonical teams (regular-season depth charts)

Scope: `canon-1983-lg`, `canon-1983-hd`, `canon-1986-hd`, `canon-1989-hd` in `/workspace/scripts/build_canonical.py`.  
These are **not** Korean Series entry locks — verify **regular-season primary depth charts** (positions, meaningful PA/IP, no fake fillers, sensible rotation/bullpen split).

**Stats:** `/tmp/kbo/raw-teams.json` keys `1983-LG`, `1983-HD`, `1986-HD`, `1989-HD`.  
**Position / role sources:** Korean Wikipedia 포지션별 주전 + season 선수단; namu.wiki / namu.moe season batting/pitching tables (position-group headers + 선발등판).

**Name check:** every current roster name exists in raw for that team-year. **No invented fillers.** Errors are almost all **wrong positions / wrong pitcher buckets**, plus a few low-IP bullpen pads.

---

## Summary

| id | Team | Verdict |
|---|---|---|
| `canon-1983-lg` | 1983 MBC 청룡 | **FAIL positions** (C/2B/3B/1B/DH scrambled). Pitchers mostly OK; promote 이광권 (20 GS), drop 박석채 (11 IP). |
| `canon-1983-hd` | 1983 삼미 슈퍼스타즈 | **FAIL positions** (김진우 is C not 1B; 이영구 is IF/SS not CF; 정구선 is 2B not DH; 이선웅 is 3B not C). Staff OK (장명부 era). |
| `canon-1986-hd` | 1986 청보 핀토스 | **FAIL positions** (김진우 CF, 김경갑 C, 권두조 LF, 정구선 DH, etc.). 김동기 (253 PA) underused. 김기태 is swing/마무리 not pure SP. |
| `canon-1989-hd` | 1989 태평양 돌핀스 | **FAIL C/IF/DH** (김동기 is C not DH; 이선웅 1B; 원원근 SS; 유동효 3B; 김한근 DH). OF + top-4 IP rotation OK. |

---

## canon-1983-lg — 1983 MBC 청룡

**Sources**
- [MBC 청룡의 선수 목록 — 포지션별 주전](https://ko.wikipedia.org/wiki/MBC_%EC%B2%AD%EB%A3%A1%EC%9D%98_%EC%84%A0%EC%88%98_%EB%AA%A9%EB%A1%9D) (1983: C 김용운, 1B 이종도, 2B 김인식, 3B 이광은, SS 김재박, RF 신언호, CF 이해창, LF 김정수, DH 송영운)
- [1982–89 MBC 시즌 / 1983 선수단](https://ko.wikipedia.org/wiki/1982%EB%85%84~1989%EB%85%84_MBC_%EC%B2%AD%EB%A3%A1_%EC%8B%9C%EC%A6%8C) (김인식 2B Best10; 김재박 SS GG; 이광은 3B AS)
- [namu MBC 청룡/1983년](https://namu.wiki/w/MBC%20%EC%B2%AD%EB%A3%A1/1983%EB%85%84) — 타자 포수=김용운·유승안·차동열; 내야=김재박·**김인식**·이광은·김정수…; 외야=이해창·이종도·신언호·송영운; 투수 선발등판: 이길환 20 / **이광권 20** / 하기룡 16 / 유종겸 14 / 오영일 13
- raw `1983-LG` PA/IP

**Current problems**
- 김인식 listed **C** → he was everyday **2B** (416 PA, Best10 2B).
- 이광은 listed **1B** → **3B**.
- 김정수 listed **3B** → IF/1B–OF (포지션별 **LF**; season page often 1B).
- 유승안 listed **DH** → **C** (backup).
- 송영운 listed **2B** → **DH** (포지션별) / OF group on namu.
- 김용운 (194 PA, 포지션별 starting C) stuck on **bench**.
- 이종도: namu OF / 포지션별 **1B** — either 1B or LF is defensible; not the issue vs C/2B/DH errors.
- Bullpen **박석채** 11 IP / 2 GS — not a meaningful contributor.

| | |
|---|---|
| **REMOVE** | **박석채** (bullpen; 11 IP) |
| **ADD** | **이광권** → rotation (20 GS, 100⅓ IP) — currently bullpen-only despite tying 이길환 for team lead in starts |
| **FIX positions** | **김용운 C**; **김인식 2B**; **이광은 3B**; **김재박 SS**; **이해창 CF**; **신언호 RF**; **송영운 DH**; 이종도 **1B** (포지션별) *or* **LF** (namu OF) with 김정수 the other corner OF/1B. **유승안 → bench C**. |

**Proposed snippet**

```python
"lineup": [("이해창", "CF"), ("김재박", "SS"), ("이종도", "1B"), ("이광은", "3B"), ("김정수", "LF"), ("신언호", "RF"), ("김인식", "2B"), ("김용운", "C"), ("송영운", "DH")],
"bench": ["유승안", "김바위", "차동열", "김용달"],
"rotation": ["이길환", "하기룡", "오영일", "유종겸", "이광권"],
"bullpen": ["정순명", "이원국"],
"closers": [],
```

Alt if locking 포지션별 LF=김정수 / 1B=이종도 exactly as above. If preferring namu OF label for 이종도: swap to `이종도 LF`, `김정수 1B`.

---

## canon-1983-hd — 1983 삼미 슈퍼스타즈

**Sources**
- [삼미 선수 목록 — 포지션별](https://ko.wikipedia.org/wiki/%EC%82%BC%EB%AF%B8_%EC%8A%88%ED%8D%BC%EC%8A%A4%ED%83%80%EC%A6%88%EC%9D%98_%EC%84%A0%EC%88%98_%EB%AA%A9%EB%A1%9D) (1983: C **김진우**, 1B 김경남, 2B **정구선**, 3B **이선웅**, SS **이영구**, RF 박준영, CF 양승관, LF 김대진, DH 금광옥)
- [1982–85 삼미 시즌](https://ko.wikipedia.org/wiki/1982%EB%85%84%E2%80%931985%EB%85%84_%EC%82%BC%EB%AF%B8_%EC%8A%88%ED%8D%BC%EC%8A%A4%ED%83%80%EC%A6%88_%EC%8B%9C%EC%A6%8C) — 정구선 2B GG; 김진우 C AS; 장명부 427⅓ IP
- [namu 삼미/1983](https://namu.wiki/w/%EC%82%BC%EB%AF%B8%20%EC%8A%88%ED%8D%BC%EC%8A%A4%ED%83%80%EC%A6%88/1983%EB%85%84) — 포수 **김진우**/금광옥; 내야 이영구·정구선·이선웅·조흥운…
- raw `1983-HD`

**Current problems**
- **김진우 → 1B** but he was the **starting catcher** (424 PA, AS C).
- **이선웅 → C** but he was **3B**.
- **이영구 → CF** but he was primary **SS/IF** (418 PA; 포지션별 SS).
- **정구선 → DH** but he was **2B** (404 PA, GG).
- **금광옥 → SS** but backup C / 포지션별 **DH**.
- **정구왕 → 2B** (167 PA) — LF utility on season lists; not the 2B.
- **박준영** (187 PA, 포지션별 RF) on bench while thinner 정구왕 starts.
- OF column conflict: 포지션별 CF 양승관 / RF 박준영 vs season 선수단 CF 박준영 / RF 양승관 — either OF split OK; **do not** put 이영구 in CF.

| | |
|---|---|
| **REMOVE** | **정구왕** from lineup (→ bench OF). Optional: **유종천** from bullpen (17 IP). |
| **ADD** | **박준영** to lineup OF; **김경남** as 1B if following 포지션별 (156 PA — thin but “most games at 1B”). Prefer **최홍석** (177 PA) or **금광옥** at DH over inventing PA. |
| **FIX positions** | **김진우 C**; **정구선 2B**; **이선웅 3B**; **이영구 SS**; **김대진 LF**; **양승관 CF/RF**; **박준영 RF/CF**; **금광옥 DH** (or 최홍석 DH); 1B **김경남** *or* platoon with DH. **조흥운 → bench** IF. |

**Proposed snippet**

```python
"lineup": [("이영구", "SS"), ("정구선", "2B"), ("김진우", "C"), ("양승관", "CF"), ("김대진", "LF"), ("이선웅", "3B"), ("박준영", "RF"), ("김경남", "1B"), ("금광옥", "DH")],
"bench": ["조흥운", "최홍석", "백인천", "정구왕"],
"rotation": ["장명부", "임호균", "정성만", "김재현"],
"bullpen": ["인호봉", "오문현", "김상기"],
"closers": [],
```

Pitching split is historically top-heavy (장명부 427⅓ + 임호균 234⅔); 3rd/4th starters with ~50–60 IP are correct for this roster, not fake.

---

## canon-1986-hd — 1986 청보 핀토스

**Sources**
- [청보 선수 목록 — 포지션별 주전](https://ko.wikipedia.org/wiki/%EC%B2%AD%EB%B3%B4_%ED%95%80%ED%86%A0%EC%8A%A4%EC%9D%98_%EC%84%A0%EC%88%98_%EB%AA%A9%EB%A1%9D) (1986: C **김진우**, 1B **권두조**, 2B **정구선**, SS **권두조**, RF 김경남, CF **양승관**, LF **우경하**; 3B/DH blank)
- [1985–87 청보 시즌 / 1986 선수단](https://ko.wikipedia.org/wiki/1985%EB%85%84%E2%80%931987%EB%85%84_%EC%B2%AD%EB%B3%B4_%ED%95%80%ED%86%A0%EC%8A%A4_%EC%8B%9C%EC%A6%8C) — SP 김신부·최계훈·정은배…; **마무리 김기태** (first foreign closer note); C 김동기·금광옥; 2B 김바위; 3B 우경하; RF 정구선 on that page’s bucket list (conflicts with 포지션별 — prefer 포지션별 + namu groups)
- [namu 청보/1986](https://namu.wiki/w/%EC%B2%AD%EB%B3%B4%20%ED%95%80%ED%86%A0%EC%8A%A4/1986%EB%85%84) — 포수 **김진우**·김동기; 내야 정구선·권두조·김바위…; 외야 **우경하**·양승관…; 김신부 28 GS / 김기태 **12 GS + 5 SV** / 최계훈 18 GS
- namu month lineups (김진우 almost always cleanup) — consistent with C/DH bat, not CF
- raw `1986-HD`

**Current problems**
- **김진우 → CF** → **C** (353 PA; namu 포수 #1).
- **정구선 → DH** → **2B** (443 PA, franchise bat).
- **권두조 → LF** → primary **IF (SS/1B)** (358 PA; career SS; 포지션별 1B+SS).
- **우경하 → 2B** → **OF/LF** (337 PA; namu 외야).
- **김경갑 → C** → IF/SS utility (152 PA) — **not a catcher**.
- **정구왕 → SS** → OF (170 PA).
- **김영균 → 3B** → OF/DH (151 PA) — weak starter vs **김동기 253 PA** on bench.
- **김기태** in rotation only: 175⅓ IP but wiki **마무리** + 5 SV + only 12 GS — treat as **closer/swing**, not 4th starter slot ahead of 김봉근 (9 GS).

| | |
|---|---|
| **REMOVE** | Lineup roles for **김경갑 C**, **정구왕 SS**, **김영균 3B** as everyday starters (demote to bench). Optional: **정선두·신태중** if trimming &lt;30 IP pads. |
| **ADD** | **김동기** to lineup (DH or backup C bat — 253 PA). Keep 권두조 in lineup (already present) but at **SS/1B**, not LF. |
| **FIX positions** | **김진우 C**; **정구선 2B**; **권두조 SS** (or 1B); **김바위 1B** (or 2B backup); **우경하 LF**; **양승관 CF**; RF **김경남** or **정구왕**; DH **김동기**; 3B **이선웅** (139 PA) / **오덕환** utility — 포지션별 3B blank, so avoid inventing a star 3B. |
| **FIX staff** | rotation: **김신부, 최계훈, 정은배, 조병천/김봉근**; **closers: ["김기태"]** (or bullpen lead); bullpen: 정성만, 김봉근, … |

**Proposed snippet**

```python
"lineup": [("우경하", "LF"), ("정구선", "2B"), ("김진우", "C"), ("김바위", "1B"), ("권두조", "SS"), ("양승관", "CF"), ("김동기", "DH"), ("김경남", "RF"), ("이선웅", "3B")],
"bench": ["금광옥", "정구왕", "김영균", "김경갑", "양후승"],
"rotation": ["김신부", "최계훈", "정은배", "김봉근"],
"bullpen": ["조병천", "정성만", "정선두", "신태중"],
"closers": ["김기태"],
```

Note: 권두조 .162 / WAR disaster is historically correct — he still belongs in the primary IF for PA/games, not buried or miscued as LF.

---

## canon-1989-hd — 1989 태평양 돌핀스

**Sources**
- [1989 태평양 시즌 선수단](https://ko.wikipedia.org/wiki/1989%EB%85%84_%ED%83%9C%ED%8F%89%EC%96%91_%EB%8F%8C%ED%95%80%EC%8A%A4_%EC%8B%9C%EC%A6%8C) — C **김동기**; 1B **이선웅**; 2B **이광길**; SS **원원근**; 3B **유동효**; LF 홍문종; CF 김일권; RF 김윤환; DH **김한근**; SP 박정현·최창호·…; 마무리 양상문·정명원…
- [namu 태평양/1989](https://namu.wiki/w/%ED%83%9C%ED%8F%89%EC%96%91%20%EB%8F%8C%ED%95%80%EC%8A%A4/1989%EB%85%84) — 포수 **김동기만** 주전급; 내야 이광길·이선웅·원원근·유동효·**김한근**…; 외야 김일권·홍문종·김윤환; GS: 최창호 29 / 박정현 25 / **정명원 18** / 김신부 16 / 양상문 15
- Awards: 김일권 OF GG + 62 SB; 이광길 2B AS; 박정현 ROY / 15 선발승
- raw `1989-HD`

**Current problems**
- **김동기 → DH** → he caught **all 120 games** (first catcher to play every game) — must be **C**.
- **김한근 → C** → namu lists him under **내야**; wiki **DH** (200 PA).
- **원원근 → 1B** → **SS**.
- **이선웅 → 3B** → **1B**.
- **유동효 → SS** → **3B**.
- OF (김일권 CF, 홍문종 LF, 김윤환 RF) and 이광길 2B: **OK**.
- Rotation 박정현·최창호·양상문·정명원 matches GS/IP well (wiki’s “마무리” label for 양상문/정명원 is role-tag noise — both had 15–18 starts). Optional: mark 정명원 as swing/closer (6 SV) *in addition*, not instead of starts.
- **조병천** 28⅔ IP — mild pad; keep or trim.

| | |
|---|---|
| **REMOVE** | None required for fakes. Optional: **조병천** if de-padding &lt;30 IP. |
| **ADD** | Optional bench: **김진규** (153 PA OF) if room. |
| **FIX positions** | **김동기 C**; **이선웅 1B**; **이광길 2B**; **유동효 3B**; **원원근 SS**; **홍문종 LF**; **김일권 CF**; **김윤환 RF**; **김한근 DH**. Move misplaced starters on bench accordingly (**김바위** stays bench IF). |

**Proposed snippet**

```python
"lineup": [("김일권", "CF"), ("이광길", "2B"), ("홍문종", "LF"), ("김동기", "C"), ("이선웅", "1B"), ("김윤환", "RF"), ("원원근", "SS"), ("유동효", "3B"), ("김한근", "DH")],
"bench": ["김바위", "정영기", "여태구", "정진호", "이광근"],
"rotation": ["박정현", "최창호", "양상문", "정명원"],
"bullpen": ["김신부", "박은진", "신완근", "조병천"],
"closers": [],
```

Alt staff: `"closers": ["정명원"]` and drop him from rotation only if forcing a modern closer slot — **not** recommended vs 18 GS / 139⅓ IP.

---

## Cross-checks vs raw counting stats

| Team | Lineup PA floor (proposed) | Notes |
|---|---|---|
| 1983 MBC | 송영운 DH 154 / 김용운 C 194 are the thin everyday bats — historical, not fillers |
| 1983 삼미 | 김경남 1B 156 / 박준영 187 thinner than 조흥운 280 — 조흥운 is IF bench behind 이영구; OK |
| 1986 청보 | Dropping 김영균·김경갑·정구왕 as starters raises lineup PA quality; 김동기 253 enters |
| 1989 태평양 | 유동효 240 / 원원근 257 / 김한근 200 are real primary IF/DH by wiki+namu |

**Fake fillers:** none of the four TEAMS entries invent names absent from raw.  
**Bullpen/rotation:** biggest staff fixes are MBC **이광권→rotation / 박석채→out**, 청보 **김기태→closer/swing**, 삼미/태평양 top IP already sensible.

---

*Generated for Diari 1980s regular-season canonical verify. Stats: `/tmp/kbo/raw-teams.json`. Positions: ko.wikipedia 포지션별 주전 + namu season pages.*
