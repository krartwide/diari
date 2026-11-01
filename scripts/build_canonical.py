#!/usr/bin/env python3
"""Build canonical public teams from scraped KBO official season lines."""

from __future__ import annotations

import json
import re
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

RAW = json.loads(Path("/tmp/kbo/raw-teams.json").read_text(encoding="utf-8"))
OUT = Path("/workspace/src/data/canonical-teams.json")
HANDS_CACHE = Path("/tmp/kbo/hands-cache.json")
UA = "Mozilla/5.0 (compatible; diari-roster/1.0)"

# Famous fastballs, km/h. Everyone else is estimated from era and strikeout rate.
VELO = {
    ("선동열", "P"): 151,
    ("오승환", "P"): 151,
    ("한기주", "P"): 153,
    ("류현진", "P"): 148,
    ("김광현", "P"): 148,
    ("봉중근", "P"): 145,
    ("윤석민", "P"): 147,
    ("장원삼", "P"): 142,
    ("권혁", "P"): 140,
    ("정대현", "P"): 128,
    ("송승준", "P"): 145,
    ("양현종", "P"): 146,
    ("헥터", "P"): 150,
    ("임기영", "P"): 143,
    ("임창용", "P"): 149,
    ("고영표", "P"): 141,
    ("데스파이네", "P"): 148,
    ("배제성", "P"): 144,
    ("쿠에바스", "P"): 145,
    ("소형준", "P"): 146,
    ("김재윤", "P"): 147,
    ("주권", "P"): 143,
    ("니퍼트", "P"): 147,
    ("보우덴", "P"): 146,
    ("장원준", "P"): 143,
    ("유희관", "P"): 132,
    ("이현승", "P"): 146,
    ("구창모", "P"): 148,
    ("루친스키", "P"): 147,
    ("원종현", "P"): 145,
    ("김진성", "P"): 146,
    ("폰트", "P"): 152,
    ("오원석", "P"): 145,
    ("서진용", "P"): 151,
    ("김택형", "P"): 146,
    ("밴헤켄", "P"): 149,
    ("밴덴헐크", "P"): 148,
    ("손승락", "P"): 145,
    ("한현희", "P"): 146,
    ("조상우", "P"): 150,
    ("안지만", "P"): 145,
    ("윤성환", "P"): 142,
    ("장명부", "P"): 136,
    ("이상훈", "P"): 145,
    ("김태원", "P"): 142,
    ("김용수", "P"): 143,
    ("송진우", "P"): 143,
    ("정민철", "P"): 144,
    ("정민태", "P"): 146,
    ("임선동", "P"): 145,
    ("위재영", "P"): 147,
    ("구대성", "P"): 145,
    ("염종석", "P"): 144,
    ("윤학길", "P"): 140,
    ("김상진", "P"): 141,
    ("조계현", "P"): 144,
    ("이강철", "P"): 143,
    ("이대진", "P"): 145,
    ("김광현", "P"): 148,
}


def clamp(n, lo, hi):
    return max(lo, min(hi, n))


def lg_woba(year: int) -> float:
    if year < 1990:
        return 0.325
    if year < 2000:
        return 0.340
    if year < 2010:
        return 0.338
    if year < 2016:
        return 0.345
    if year < 2020:
        return 0.350
    return 0.338


def lg_era(year: int) -> float:
    if year < 1989:
        return 3.50
    if year < 1995:
        return 3.70
    if year < 2000:
        return 4.10
    if year < 2010:
        return 4.20
    if year < 2014:
        return 4.30
    if year < 2020:
        return 4.80
    return 4.40


def round3(n):
    return round(float(n) + 1e-12, 3)


def round2(n):
    return round(float(n) + 1e-12, 2)


def fetch_hands(pid: str) -> dict:
    urls = [
        f"https://www.koreabaseball.com/Record/Player/HitterDetail/Basic.aspx?playerId={pid}",
        f"https://www.koreabaseball.com/Record/Player/PitcherDetail/Basic.aspx?playerId={pid}",
    ]
    text = ""
    for url in urls:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            html = urllib.request.urlopen(req, timeout=25).read().decode("utf-8", "replace")
            text = re.sub(r"<[^>]+>", " ", html)
            text = re.sub(r"\s+", " ", text)
            m = re.search(r"((?:좌|우)투(?:좌|우|양)타)", text)
            if m:
                token = m.group(1)
                throws = "L" if token.startswith("좌") else "R"
                if "양타" in token:
                    bats = "S"
                elif "좌타" in token:
                    bats = "L"
                else:
                    bats = "R"
                return {"bats": bats, "throws": throws, "ok": True}
        except Exception:
            continue
    return {"bats": "R", "throws": "R", "ok": False}


def load_hands(ids: list[str]) -> dict:
    cache = {}
    if HANDS_CACHE.exists():
        cache = json.loads(HANDS_CACHE.read_text(encoding="utf-8"))
    missing = [i for i in ids if i not in cache]
    print(f"hands cache {len(cache)} missing {len(missing)}", flush=True)
    if missing:
        with ThreadPoolExecutor(max_workers=8) as pool:
            futs = {pool.submit(fetch_hands, pid): pid for pid in missing}
            done = 0
            for fut in as_completed(futs):
                pid = futs[fut]
                cache[pid] = fut.result()
                done += 1
                if done % 40 == 0:
                    print(f"  hands {done}/{len(missing)}", flush=True)
                    HANDS_CACHE.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
        HANDS_CACHE.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
    return cache


def find_hitter(keys, name):
    best = None
    for key in keys:
        for h in RAW[key]["hitters"]:
            if h["name"] == name and (h["pa"] or 0) >= 20:
                if best is None or h["pa"] > best["pa"]:
                    best = h
    if not best:
        raise SystemExit(f"hitter not found: {name} in {keys}")
    return best


def find_pitcher(keys, name):
    best = None
    for key in keys:
        for p in RAW[key]["pitchers"]:
            if p["name"] == name and (p["ipf"] or 0) >= 8:
                if best is None or p["ipf"] > best["ipf"]:
                    best = p
    if not best:
        raise SystemExit(f"pitcher not found: {name} in {keys}")
    return best


def batter_speed(h):
    pa = max(h["pa"] or 1, 1)
    sb = h["sb"] or 0
    cs = h["cs"] or 0
    spd = 40 + (sb / pa) * 520 + sb * 0.18 - cs * 0.12
    return int(round(clamp(spd, 30, 99)))


def pitcher_speed(name, year, p):
    if (name, "P") in VELO:
        return VELO[(name, "P")]
    ip = p["ipf"] or 1
    k9 = (p["so"] or 0) / ip * 9
    base = 136 if year < 1990 else 140 if year < 2000 else 143 if year < 2010 else 145 if year < 2020 else 146
    velo = base + (k9 - 6) * 0.65
    ipg = ip / max(p["g"] or 1, 1)
    if (p["sv"] or 0) >= 15 and ipg < 2.2:
        velo += 2
    return int(round(clamp(velo, 122, 156)))


POS_RUN = {"C": 12.5, "SS": 7.5, "2B": 2.5, "3B": 2.5, "CF": 2.5, "LF": -7.5, "RF": -7.5, "1B": -12.5, "DH": -17.5, "P": 0}


def build_batter(h, year, pos, hands):
    ab = h["ab"] or 0
    hits = h["h"] or 0
    d = h["d"] or 0
    t = h["t"] or 0
    hr = h["hr"] or 0
    bb = h["bb"] or 0
    hbp = h["hbp"] or 0
    sf = h["sf"] or 0
    pa = h["pa"] or (ab + bb + hbp + sf)
    singles = max(0, hits - d - t - hr)
    tb = h["tb"] or (singles + 2 * d + 3 * t + 4 * hr)
    avg = hits / ab if ab else 0
    slg = tb / ab if ab else 0
    den = ab + bb + hbp + sf
    obp = (hits + bb + hbp) / den if den else 0
    ops = obp + slg
    woba_den = den or 1
    woba = (0.69 * bb + 0.72 * hbp + 0.88 * singles + 1.24 * d + 1.56 * t + 1.95 * hr) / woba_den
    lg = lg_woba(year)
    scale = 1.15
    r_pa = 0.120
    wrc = 100 * (((woba - lg) / scale) + r_pa) / r_pa if pa else 100
    batting_runs = (woba - lg) / scale * pa
    bsr = (h["sb"] or 0) * 0.18 - (h["cs"] or 0) * 0.42
    pos_runs = POS_RUN.get(pos, 0) * pa / 600
    rep = 20 * pa / 600
    swar = (batting_runs + bsr + pos_runs + rep) / 10
    hand = hands.get(h["id"], {"bats": "R", "throws": "R"})
    return {
        "id": f"p{h['id']}",
        "sourceId": h["id"],
        "name": h["name"],
        "kind": "B",
        "bats": hand["bats"],
        "throws": hand["throws"],
        "positions": [pos],
        "batter": {
            "g": h["g"] or 0,
            "ab": ab,
            "h": hits,
            "doubles": d,
            "triples": t,
            "hr": hr,
            "rbi": h["rbi"] or 0,
            "r": h["r"] or 0,
            "sb": h["sb"] or 0,
            "bb": bb,
            "so": h["so"] or 0,
            "avg": round3(avg),
            "obp": round3(obp),
            "slg": round3(slg),
            "ops": round3(ops),
            "wrcPlus": int(round(wrc)),
            "swar": round2(swar),
            "speed": batter_speed(h),
            "pa": pa,
            "hbp": hbp,
            "sf": sf,
            "sac": h["sac"] or 0,
            "cs": h["cs"] or 0,
        },
    }


def build_pitcher(p, year, hands):
    ip = p["ipf"] or 0
    h = p["h"] or 0
    bb = p["bb"] or 0
    hr = p["hr"] or 0
    so = p["so"] or 0
    hbp = p["hbp"] or 0
    er = p["er"] or 0
    r = p["r"] or 0
    era = float(p["era"]) if p["era"] not in (None, "", "-") else (er / ip * 9 if ip else 0)
    whip_raw = float(p["whip"]) if p["whip"] not in (None, "", "-") else 0
    whip = whip_raw if whip_raw > 0 else ((h + bb) / ip if ip else 0)
    lg = lg_era(year)
    # League-average innings earn about two wins over replacement; the rest is run prevention.
    swar = (ip / 90) * (lg - era + 1) if ip else 0
    ipg = ip / max(p["g"] or 1, 1)
    if ipg < 2.4 and (p["sv"] or 0) + (p["hld"] or 0) >= 8:
        swar *= 1.25
    hand = hands.get(p["id"], {"bats": "R", "throws": "R"})
    return {
        "id": f"p{p['id']}",
        "sourceId": p["id"],
        "name": p["name"],
        "kind": "P",
        "bats": hand["bats"],
        "throws": hand["throws"],
        "positions": ["P"],
        "pitcher": {
            "g": p["g"] or 0,
            "w": p["w"] or 0,
            "l": p["l"] or 0,
            "sv": p["sv"] or 0,
            "hld": p["hld"] or 0,
            "ip": round2(ip),
            "era": round2(era),
            "h": h,
            "hr": hr,
            "bb": bb,
            "hbp": hbp,
            "so": so,
            "whip": round2(whip),
            "swar": round2(swar),
            "speed": pitcher_speed(p["name"], year, p),
            "er": er,
            "r": r,
        },
    }


LEE_2008 = {
    "id": "mlee2008",
    "name": "이승엽",
    "g": 45,
    "pa": 170,
    "ab": 153,
    "r": 21,
    "h": 38,
    "d": 4,
    "t": 0,
    "hr": 8,
    "tb": 66,
    "rbi": 27,
    "sac": 0,
    "sf": 0,
    "sb": 1,
    "cs": 0,
    "bb": 11,
    "hbp": 6,
    "so": 37,
}


TEAMS = [
    {
        "id": "canon-2021-kt",
        "name": "2021 KT 위즈",
        "shortName": "KT",
        "year": 2021,
        "keys": ["2021-KT"],
        "primary": "#141414",
        "secondary": "#E10600",
        "blurb": "2021 정규시즌 76승 9무 59패, 공동 1위. 한국시리즈 우승. 감독 이강철. 선발진 다섯 명이 시즌을 끌고, 강백호가 타선을 열었다.",
        "lineup": [("조용호", "LF"), ("배정대", "CF"), ("강백호", "1B"), ("황재균", "3B"), ("장성우", "C"), ("유한준", "DH"), ("심우준", "SS"), ("호잉", "RF"), ("박경수", "2B")],
        "bench": ["김민혁", "알몬테", "신본기", "허도환", "오윤석"],
        "rotation": ["고영표", "데스파이네", "배제성", "쿠에바스", "소형준"],
        "bullpen": ["김재윤", "주권", "박시영", "김민수", "심재민", "안영명"],
    },
    {
        "id": "canon-2014-ss",
        "name": "2014 삼성 라이온즈",
        "shortName": "삼성",
        "year": 2014,
        "keys": ["2014-SS"],
        "primary": "#074CA1",
        "secondary": "#D5D8DC",
        "blurb": "2014 한국시리즈 우승팀. 최형우와 이승엽, 나바로가 한 시즌을 통째로 때려 냈고 밴덴헐크가 마운드를 잡았다.",
        "lineup": [("박해민", "CF"), ("김상수", "SS"), ("나바로", "2B"), ("최형우", "LF"), ("이승엽", "1B"), ("박석민", "3B"), ("채태인", "DH"), ("박한이", "RF"), ("이지영", "C")],
        "bench": ["김헌곤", "이흥련", "김태완", "조동찬"],
        "rotation": ["밴덴헐크", "윤성환", "장원삼", "마틴", "배영수"],
        "bullpen": ["임창용", "안지만", "차우찬", "심창민", "권혁"],
    },
    {
        "id": "canon-2017-ht",
        "name": "2017 KIA 타이거즈",
        "shortName": "KIA",
        "year": 2017,
        "keys": ["2017-HT"],
        "primary": "#EA0029",
        "secondary": "#141414",
        "blurb": "2017 정규시즌 87승 56패, 1위. 한국시리즈 우승. 양현종과 헥터가 20승씩 나란히 올렸고 최형우가 타선을 눌렀다.",
        "lineup": [("이명기", "RF"), ("김주찬", "1B"), ("버나디나", "CF"), ("최형우", "LF"), ("나지완", "DH"), ("안치홍", "2B"), ("이범호", "3B"), ("김민식", "C"), ("김선빈", "SS")],
        "bench": ["서동욱", "최원준", "한승택", "김호령"],
        "rotation": ["양현종", "헥터", "팻딘", "임기영"],
        "bullpen": ["김세현", "임창용", "심동섭", "김윤동", "고효준", "홍건희"],
    },
    {
        "id": "canon-1994-lg",
        "name": "1994 LG 트윈스",
        "shortName": "LG",
        "year": 1994,
        "keys": ["1994-LG"],
        "primary": "#C8102E",
        "secondary": "#1A1A1A",
        "blurb": "1994 한국시리즈 우승팀. 이상훈과 김태원이 원투펀치를 맡았고, 류지현이 1번에서 시즌을 열었다.",
        "lineup": [("류지현", "SS"), ("박준태", "CF"), ("김재현", "RF"), ("서용빈", "DH"), ("한대화", "1B"), ("김동수", "C"), ("박종호", "3B"), ("노찬엽", "LF"), ("이종열", "2B")],
        "bench": ["최훈재", "김영직", "김선진"],
        "rotation": ["이상훈", "김태원", "정삼흠", "인현배"],
        "bullpen": ["김용수", "차동철", "전일수", "강봉수", "차명석"],
    },
    {
        "id": "canon-2016-ob",
        "name": "2016 두산 베어스",
        "shortName": "두산",
        "year": 2016,
        "keys": ["2016-OB"],
        "primary": "#131230",
        "secondary": "#E31837",
        "blurb": "2016 한국시리즈 우승팀. 니퍼트가 22승, 김재환이 37홈런. 상위 타선이 거의 빠지지 않고 한 시즌을 소화했다.",
        "lineup": [("박건우", "CF"), ("허경민", "3B"), ("민병헌", "RF"), ("김재환", "LF"), ("에반스", "DH"), ("오재일", "1B"), ("양의지", "C"), ("오재원", "2B"), ("김재호", "SS")],
        "bench": ["정수빈", "박세혁", "최주환", "국해성"],
        "rotation": ["니퍼트", "보우덴", "장원준", "유희관", "허준혁"],
        "bullpen": ["이현승", "정재훈", "윤명준", "진야곱", "김강률", "김성배"],
    },
    {
        "id": "canon-2022-sk",
        "name": "2022 SSG 랜더스",
        "shortName": "SSG",
        "year": 2022,
        "keys": ["2022-SK"],
        "primary": "#CE0E2D",
        "secondary": "#F2C14E",
        "blurb": "2022 정규시즌 1위, 한국시리즈 우승. 김광현이 평균자책 2.13, 폰트가 13승. 최정의 26홈런이 중앙을 맡았다.",
        "lineup": [("추신수", "DH"), ("최지훈", "CF"), ("최정", "3B"), ("한유섬", "RF"), ("크론", "1B"), ("박성한", "SS"), ("오태곤", "LF"), ("이재원", "C"), ("김성현", "2B")],
        "bench": ["전의산", "최주환", "김민식", "김강민", "라가레스"],
        "rotation": ["김광현", "폰트", "오원석", "이태양", "모리만도"],
        "bullpen": ["서진용", "김택형", "노경은", "고효준", "장지훈", "최민준"],
    },
    {
        "id": "canon-1992-lt",
        "name": "1992 롯데 자이언츠",
        "shortName": "롯데",
        "year": 1992,
        "keys": ["1992-LT"],
        "primary": "#D31245",
        "secondary": "#111111",
        "blurb": "1992 한국시리즈 우승팀. 염종석과 윤학길이 200이닝을 넘겼고, 전준호와 김응국이 테이블세터를 섰다.",
        "lineup": [("전준호", "CF"), ("김응국", "SS"), ("박정태", "2B"), ("김민호", "DH"), ("이종운", "LF"), ("한영준", "1B"), ("박계원", "RF"), ("조성옥", "C"), ("공필성", "3B")],
        "bench": ["장효조", "김선일", "강성우"],
        "rotation": ["염종석", "윤학길", "박동희", "윤형배", "김상현"],
        "bullpen": ["이상번", "가득염", "김청수"],
    },
    {
        "id": "canon-2020-nc",
        "name": "2020 NC 다이노스",
        "shortName": "NC",
        "year": 2020,
        "keys": ["2020-NC"],
        "primary": "#315288",
        "secondary": "#C4A35A",
        "blurb": "2020 한국시리즈 우승팀. 양의지와 나성범이 30홈런, 루친스키가 19승. 구창모는 짧은 이닝을 1점대 평균자책으로 막았다.",
        "lineup": [("박민우", "2B"), ("이명기", "CF"), ("나성범", "RF"), ("양의지", "C"), ("알테어", "LF"), ("박석민", "3B"), ("노진혁", "SS"), ("권희동", "DH"), ("강진성", "1B")],
        "bench": ["김성욱", "모창민", "이원재", "김태군"],
        "rotation": ["루친스키", "라이트", "구창모", "송명기", "이재학"],
        "bullpen": ["원종현", "김진성", "임정호", "배재환", "문경찬"],
    },
    {
        "id": "canon-1999-hh",
        "name": "1999 한화 이글스",
        "shortName": "한화",
        "year": 1999,
        "keys": ["1999-HH"],
        "primary": "#FC4C02",
        "secondary": "#1A1A1A",
        "blurb": "1999 한국시리즈 우승팀. 장종훈의 마지막 전성기와 로마이어, 데이비스의 외국인 타선, 그리고 구대성의 마무리가 한 해였다.",
        "lineup": [("이영우", "CF"), ("강석천", "LF"), ("장종훈", "1B"), ("로마이어", "DH"), ("데이비스", "RF"), ("송지만", "3B"), ("임수민", "C"), ("백재호", "SS"), ("조경택", "2B")],
        "bench": ["최익성", "김충민"],
        "rotation": ["정민철", "송진우", "이상목", "한용덕"],
        "bullpen": ["구대성", "김해님", "이상열", "이상군"],
    },
    {
        "id": "canon-2014-wo",
        "name": "2014 키움 히어로즈",
        "shortName": "키움",
        "year": 2014,
        "keys": ["2014-WO"],
        "primary": "#570514",
        "secondary": "#C4A35A",
        "blurb": "2014년 구단명은 넥센 히어로즈였다. 같은 프랜차이즈의 그 시즌이다. 서건창이 타격왕, 박병호가 52홈런, 강정호가 40홈런을 쳤다.",
        "lineup": [("서건창", "2B"), ("이택근", "LF"), ("유한준", "RF"), ("박병호", "1B"), ("강정호", "SS"), ("김민성", "3B"), ("윤석민", "DH"), ("문우람", "CF"), ("허도환", "C")],
        "bench": ["이성열", "로티노", "박동원"],
        "rotation": ["밴헤켄", "소사", "오주원", "김대우", "하영민"],
        "bullpen": ["손승락", "한현희", "조상우", "마정길"],
    },
    {
        "id": "canon-1993-ht",
        "name": "1993 해태 타이거즈",
        "shortName": "해태",
        "year": 1993,
        "keys": ["1993-HT"],
        "primary": "#E10600",
        "secondary": "#111111",
        "blurb": "1993 한국시리즈 우승팀. 이종범이 73도루로 1번을 맡았고, 선동열은 49경기에 나와 평균자책 0.78, 31세이브를 기록했다.",
        "lineup": [("이종범", "SS"), ("이순철", "CF"), ("김성한", "1B"), ("한대화", "3B"), ("홍현우", "DH"), ("정성룡", "LF"), ("이호성", "RF"), ("장채근", "C"), ("이건열", "2B")],
        "bench": ["김훈", "정회열", "박철우"],
        "rotation": ["조계현", "이강철", "이대진", "김정수", "송유석"],
        "bullpen": ["선동열", "양승철", "문희수"],
    },
    {
        "id": "canon-1983-lg",
        "name": "1983 MBC 청룡",
        "shortName": "MBC",
        "year": 1983,
        "keys": ["1983-LG"],
        "primary": "#0B3D91",
        "secondary": "#F4F1EA",
        "blurb": "1983 MBC 청룡. 김재박이 테이블을 세우고 김인식이 포수 마스크를 썼다. 이길환, 하기룡, 오영일이 선발을 나눠 가졌다.",
        "lineup": [("김재박", "SS"), ("이해창", "CF"), ("이종도", "LF"), ("김인식", "C"), ("이광은", "1B"), ("신언호", "RF"), ("김정수", "3B"), ("유승안", "DH"), ("송영운", "2B")],
        "bench": ["김용운", "김바위", "차동열"],
        "rotation": ["이길환", "하기룡", "오영일", "유종겸", "이광권"],
        "bullpen": ["정순명", "이원국"],
    },
    {
        "id": "canon-1995-ob",
        "name": "1995 OB 베어스",
        "shortName": "OB",
        "year": 1995,
        "keys": ["1995-OB"],
        "primary": "#0C2340",
        "secondary": "#C8102E",
        "blurb": "1995 한국시리즈 우승팀. 김상진이 209이닝 평균자책 2.11, 김상호가 25홈런 101타점을 올렸다.",
        "lineup": [("김민호", "LF"), ("장원진", "2B"), ("김형석", "RF"), ("김상호", "DH"), ("심정수", "1B"), ("이도형", "3B"), ("이명수", "CF"), ("김태형", "C"), ("김종석", "SS")],
        "bench": ["안경현", "임형석", "정수근"],
        "rotation": ["김상진", "권명철", "진필중", "박철순", "강병규"],
        "bullpen": ["김경원", "이용호", "강길용", "송재용"],
    },
    {
        "id": "canon-2008-sk",
        "name": "2008 SK 와이번스",
        "shortName": "SK",
        "year": 2008,
        "keys": ["2008-SK"],
        "primary": "#FF6900",
        "secondary": "#1A1A1A",
        "blurb": "2008 한국시리즈 우승팀. 김광현이 16승 평균자책 2.39. 정근우가 40도루, 최정이 3번 옆에서 시즌을 보냈다.",
        "lineup": [("정근우", "2B"), ("최정", "3B"), ("박재홍", "CF"), ("김재현", "DH"), ("이진영", "LF"), ("박정권", "1B"), ("나주환", "SS"), ("박경완", "C"), ("박재상", "RF")],
        "bench": ["조동화", "김강민", "정상호", "이재원"],
        "rotation": ["김광현", "채병용", "레이번", "송은범"],
        "bullpen": ["정대현", "정우람", "윤길현", "가득염", "조웅천", "김원형"],
    },
    {
        "id": "canon-1992-hh",
        "name": "1992 빙그레 이글스",
        "shortName": "빙그레",
        "year": 1992,
        "keys": ["1992-HH"],
        "primary": "#E10600",
        "secondary": "#0E7A3D",
        "blurb": "1992 빙그레 이글스. 장종훈이 41홈런 119타점, 이정훈이 타율 0.360. 송진우와 정민철이 젊은 선발로 200이닝 안팎을 던졌다.",
        "lineup": [("이정훈", "CF"), ("양용모", "2B"), ("장종훈", "DH"), ("이강돈", "1B"), ("강정길", "LF"), ("강석천", "3B"), ("전대영", "C"), ("김상국", "RF"), ("지화동", "SS")],
        "bench": ["이중화", "임주택", "이종호"],
        "rotation": ["송진우", "정민철", "한용덕", "장정순", "이상군"],
        "bullpen": ["김인권", "한희민", "진정필"],
    },
    {
        "id": "canon-1983-hd",
        "name": "1983 삼미 슈퍼스타즈",
        "shortName": "삼미",
        "year": 1983,
        "keys": ["1983-HD"],
        "primary": "#7EB6D9",
        "secondary": "#F4E27A",
        "blurb": "1983 삼미 슈퍼스타즈. 팀은 리그 최하위권이었고, 장명부는 60경기에 나와 30승 16패, 427⅓이닝, 평균자책 2.36을 기록했다.",
        "lineup": [("이영구", "CF"), ("양승관", "RF"), ("김진우", "1B"), ("정구선", "DH"), ("김대진", "LF"), ("이선웅", "C"), ("조흥운", "3B"), ("최홍석", "2B"), ("금광옥", "SS")],
        "bench": ["박준영", "정구왕", "백인천"],
        "rotation": ["장명부", "임호균", "정성만", "김재현"],
        "bullpen": ["인호봉", "오문현", "김상기"],
    },
    {
        "id": "canon-1986-hd",
        "name": "1986 청보 핀토스",
        "shortName": "청보",
        "year": 1986,
        "keys": ["1986-HD"],
        "primary": "#1F4E79",
        "secondary": "#E8B84A",
        "blurb": "1986 청보 핀토스. 삼미의 뒤를 이은 시즌이다. 김신부와 김기태가 이닝을 먹었고, 타선은 정구선과 김진우가 중심이었다.",
        "lineup": [("김진우", "CF"), ("우경하", "2B"), ("정구선", "DH"), ("김바위", "1B"), ("김동기", "LF"), ("양승관", "RF"), ("김영균", "3B"), ("김경갑", "C"), ("정구왕", "SS")],
        "bench": ["김경남", "금광옥", "이선웅"],
        "rotation": ["김신부", "김기태", "최계훈", "정은배", "조병천"],
        "bullpen": ["김봉근", "정선두", "신태중"],
    },
    {
        "id": "canon-1989-hd",
        "name": "1989 태평양 돌핀스",
        "shortName": "태평양",
        "year": 1989,
        "keys": ["1989-HD"],
        "primary": "#1493B8",
        "secondary": "#0A2A43",
        "blurb": "1989 태평양 돌핀스. 김일권이 62도루로 1번을 뛰었고, 박정현과 최창호가 220이닝 이상을 던졌다.",
        "lineup": [("김일권", "CF"), ("이광길", "2B"), ("홍문종", "LF"), ("김동기", "DH"), ("원원근", "1B"), ("김윤환", "RF"), ("이선웅", "3B"), ("김한근", "C"), ("유동효", "SS")],
        "bench": ["김바위", "정영기", "여태구"],
        "rotation": ["박정현", "최창호", "정명원", "양상문", "김신부"],
        "bullpen": ["박은진", "신완근"],
    },
    {
        "id": "canon-2000-hd",
        "name": "2000 현대 유니콘스",
        "shortName": "현대",
        "year": 2000,
        "keys": ["2000-HD"],
        "primary": "#6B1D2A",
        "secondary": "#C4A35A",
        "blurb": "2000 한국시리즈 우승팀. 박경완 40홈런, 박재홍 32홈런. 정민태, 임선동, 김수경이 18승씩 나란히 올렸고 위재영이 39세이브로 문을 닫았다.",
        "lineup": [("전준호", "CF"), ("박종호", "2B"), ("박재홍", "LF"), ("박경완", "C"), ("퀸란", "DH"), ("심재학", "1B"), ("박진만", "SS"), ("이숭용", "RF"), ("김인호", "3B")],
        "bench": ["이명수", "윌리엄스", "카펜터"],
        "rotation": ["정민태", "임선동", "김수경", "박장희", "정명원"],
        "bullpen": ["위재영", "조웅천", "신철인", "마일영"],
    },
    {
        "id": "canon-1996-sb",
        "name": "1996 쌍방울 레이더스",
        "shortName": "쌍방울",
        "year": 1996,
        "keys": ["1996-SB"],
        "primary": "#C41E3A",
        "secondary": "#F2F2F2",
        "blurb": "1996 정규시즌 2위, 창단 첫 가을야구. 김성근 감독 첫해. 성영재·조규제와 박경완·김기태·김광림이 중심이었고, 플레이오프에서 현대에 2승 뒤 3연패로 꺾였다.",
        "lineup": [("김광림", "CF"), ("김실", "RF"), ("김기태", "1B"), ("심성보", "LF"), ("박경완", "C"), ("최태원", "2B"), ("석수철", "3B"), ("김호", "SS"), ("조원우", "DH")],
        "bench": ["박노준", "박철우", "김충민", "진상봉", "백인수"],
        "rotation": ["성영재", "오봉옥", "김원형", "박성기", "김기덕"],
        "bullpen": ["조규제", "김현욱", "최정환", "박주언", "박진석"],
    },
    {
        "id": "canon-2008-kor",
        "name": "2008 대한민국 국가대표",
        "shortName": "대표",
        "year": 2008,
        "keys": ["2008-SK", "2008-OB", "2008-LT", "2008-SS", "2008-HH", "2008-HT", "2008-WO", "2008-LG"],
        "primary": "#CD2E3A",
        "secondary": "#0A3161",
        "blurb": "2008 베이징 올림픽 금메달 최종 엔트리. 타격과 투구 능력치는 그해 소속 리그 정규시즌이다. 이승엽만 요미우리 45경기 기록이다. 개막 직전 임태훈 대신 윤석민이 합류했다. 감독 김경문, 주장 진갑용.",
        "olympic": True,
        "lineup": [("이용규", "LF"), ("정근우", "2B"), ("김현수", "RF"), ("이대호", "1B"), ("이승엽", "DH"), ("김동주", "3B"), ("이종욱", "CF"), ("강민호", "C"), ("박진만", "SS")],
        "bench": ["진갑용", "이진영", "이택근", "고영민", "김민재"],
        "rotation": ["류현진", "김광현", "봉중근", "송승준"],
        "bullpen": ["오승환", "한기주", "윤석민", "권혁", "정대현", "장원삼"],
    },
]


def main():
    needed = []
    # collect ids first
    resolved = []
    for spec in TEAMS:
        keys = spec["keys"]
        hitters = []
        for name, pos in spec["lineup"] + [(n, "DH") for n in spec["bench"]]:
            if spec.get("olympic") and name == "이승엽":
                hitters.append(("manual", name, pos, LEE_2008))
                continue
            h = find_hitter(keys, name)
            hitters.append(("kbo", name, pos, h))
            needed.append(h["id"])
        pitchers = []
        for name in spec["rotation"] + spec["bullpen"]:
            p = find_pitcher(keys, name)
            pitchers.append(p)
            needed.append(p["id"])
        resolved.append((spec, hitters, pitchers))

    hands = load_hands(sorted(set(needed)))
    # 이승엽 is not on the KBO 2008 page.
    hands["mlee2008"] = {"bats": "L", "throws": "R", "ok": True}

    failed = [pid for pid, h in hands.items() if pid in set(needed) and not h.get("ok")]
    print("hands unresolved", len(failed))

    teams = []
    for spec, hitters, pitchers in resolved:
        year = spec["year"]
        players = []
        lineup = []
        bench = []
        for kind, name, pos, src in hitters:
            if kind == "manual":
                src = dict(src)
                src["id"] = "mlee2008"
                player = build_batter(src, year, pos, hands)
                player["throws"] = "R"
                player["bats"] = "L"
            else:
                player = build_batter(src, year, pos, hands)
            player["positions"] = [pos] if pos != "DH" else ["DH"]
            # bench entries were tagged DH as a placeholder position above; fix from the spec lists
            players.append(player)
        # reassign positions properly
        by_name = {}
        # rebuild cleanly to avoid the placeholder
        players = []
        for name, pos in spec["lineup"]:
            src = next(s for k, n, p, s in hitters if n == name)
            if name == "이승엽" and spec.get("olympic"):
                src = dict(LEE_2008)
                src["id"] = "mlee2008"
                player = build_batter(src, year, pos, {"mlee2008": {"bats": "L", "throws": "L"}})
            else:
                player = build_batter(src, year, pos, hands)
            player["positions"] = [pos]
            players.append(player)
            lineup.append({"playerId": player["id"], "position": pos})
            by_name[name] = player["id"]
        for name in spec["bench"]:
            src = next(s for k, n, p, s in hitters if n == name)
            player = build_batter(src, year, "DH", hands)
            # bench primary position guess: catchers we know, else DH/utility shown as their likely spot later
            player["positions"] = ["DH"]
            players.append(player)
            bench.append(player["id"])
        rotation = []
        bullpen = []
        for name in spec["rotation"]:
            src = next(p for p in pitchers if p["name"] == name and p["name"] not in [])
            # if two pitchers share a name, first match in list order is the one we appended once
            player = build_pitcher(src, year, hands)
            # avoid duplicate if name collision inside one staff
            if any(x["name"] == name and x["kind"] == "P" for x in players):
                continue
            players.append(player)
            rotation.append(player["id"])
        for name in spec["bullpen"]:
            src = next(p for p in pitchers if p["name"] == name)
            if any(x["sourceId"] == src["id"] for x in players):
                pid = next(x["id"] for x in players if x["sourceId"] == src["id"])
                bullpen.append(pid)
                continue
            player = build_pitcher(src, year, hands)
            players.append(player)
            bullpen.append(player["id"])
        # known bench positions
        bench_pos = {
            "김민혁": "LF", "알몬테": "LF", "신본기": "SS", "허도환": "C", "오윤석": "3B",
            "김헌곤": "RF", "이흥련": "C", "김태완": "1B", "조동찬": "SS",
            "김주찬": "1B", "서동욱": "2B", "최원준": "CF", "한승택": "C", "김호령": "CF",
            "최훈재": "1B", "김영직": "LF", "김선진": "RF",
            "정수빈": "CF", "박세혁": "C", "최주환": "2B", "국해성": "LF",
            "전의산": "1B", "김민식": "C", "김강민": "CF", "라가레스": "LF", "크론": "1B",
            "장효조": "DH", "김선일": "C", "강성우": "3B",
            "김성욱": "CF", "모창민": "1B", "이원재": "3B", "김태군": "C",
            "최익성": "RF", "김충민": "LF",
            "이성열": "LF", "로티노": "2B", "박동원": "C",
            "김훈": "LF", "정회열": "C", "박철우": "1B",
            "김용운": "RF", "김바위": "1B", "차동열": "LF",
            "안경현": "1B", "임형석": "LF", "정수근": "CF",
            "조동화": "CF", "정상호": "C", "이재원": "C",
            "이중화": "CF", "임주택": "2B", "이종호": "RF",
            "박준영": "LF", "정구왕": "SS", "백인천": "DH",
            "김경남": "C", "금광옥": "SS", "이선웅": "C",
            "정영기": "3B", "여태구": "LF",
            "이명수": "C", "윌리엄스": "RF", "카펜터": "LF",
            "박노준": "DH", "박철우": "DH", "김충민": "C", "진상봉": "CF", "백인수": "3B",
            "진갑용": "C", "이진영": "RF", "이택근": "LF", "고영민": "2B", "김민재": "SS",
        }
        for pl in players:
            if pl["id"] in bench and pl["name"] in bench_pos:
                pl["positions"] = [bench_pos[pl["name"]]]
                # Bench value should follow the position they actually play, not a DH penalty.
                if pl.get("batter"):
                    pl["batter"]["swar"] = round2(pl["batter"]["swar"] + (POS_RUN["DH"] - POS_RUN[bench_pos[pl["name"]]]) * -1 * (pl["batter"]["pa"] / 600) / 10)
        teams.append({
            "id": spec["id"],
            "name": spec["name"],
            "shortName": spec["shortName"],
            "year": year,
            "primary": spec["primary"],
            "secondary": spec["secondary"],
            "logo": None,
            "visibility": "public",
            "ownerId": None,
            "canonical": True,
            "blurb": spec["blurb"],
            "lineup": lineup,
            "rotation": rotation,
            "bullpen": bullpen,
            "bench": bench,
            "players": players,
            "createdAt": "2008-08-23T00:00:00.000Z" if spec["id"].endswith("kor") else f"{year}-10-01T00:00:00.000Z",
        })
        print(spec["name"], "players", len(players), "LHP", [p["name"] for p in players if p["kind"]=="P" and p["throws"]=="L"])

    for team in teams:
        idmap = {}
        for player in team["players"]:
            new_id = f"{team['id']}:{player['id']}"
            idmap[player["id"]] = new_id
            player["id"] = new_id
        for slot in team["lineup"]:
            slot["playerId"] = idmap[slot["playerId"]]
        team["rotation"] = [idmap[i] for i in team["rotation"]]
        team["bullpen"] = [idmap[i] for i in team["bullpen"]]
        team["bench"] = [idmap[i] for i in team["bench"]]

    OUT.write_text(json.dumps(teams, ensure_ascii=False, indent=1), encoding="utf-8")
    print("wrote", OUT, "bytes", OUT.stat().st_size)


if __name__ == "__main__":
    main()
