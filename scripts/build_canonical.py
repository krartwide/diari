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
    ("선동열", "P"): 154,
    ("오승환", "P"): 155,
    ("한기주", "P"): 156,
    ("류현진", "P"): 148,
    ("김광현", "P"): 148,
    ("봉중근", "P"): 145,
    ("윤석민", "P"): 147,
    ("장원삼", "P"): 142,
    ("권혁", "P"): 140,
    ("정대현", "P"): 132,
    ("송승준", "P"): 145,
    ("양현종", "P"): 146,
    ("헥터", "P"): 150,
    ("임기영", "P"): 143,
    ("임창용", "P"): 152,
    ("고영표", "P"): 141,
    ("데스파이네", "P"): 148,
    ("배제성", "P"): 144,
    ("쿠에바스", "P"): 145,
    ("소형준", "P"): 146,
    ("김재윤", "P"): 150,
    ("주권", "P"): 143,
    ("니퍼트", "P"): 147,
    ("보우덴", "P"): 146,
    ("장원준", "P"): 143,
    ("유희관", "P"): 132,
    ("이현승", "P"): 146,
    ("구창모", "P"): 148,
    ("루친스키", "P"): 147,
    ("원종현", "P"): 148,
    ("김진성", "P"): 146,
    ("폰트", "P"): 155,
    ("오원석", "P"): 145,
    ("서진용", "P"): 154,
    ("김택형", "P"): 146,
    ("밴헤켄", "P"): 149,
    ("밴덴헐크", "P"): 148,
    ("손승락", "P"): 145,
    ("한현희", "P"): 146,
    ("조상우", "P"): 155,
    ("마일영", "P"): 138,
    ("김수경", "P"): 145,
    ("황두성", "P"): 146,
    ("다카쓰", "P"): 148,
    ("스코비", "P"): 147,
    ("송신영", "P"): 144,
    ("강윤구", "P"): 148,
    ("안지만", "P"): 145,
    ("윤성환", "P"): 142,
    ("장명부", "P"): 136,
    ("이상훈", "P"): 145,
    ("김태원", "P"): 142,
    ("김용수", "P"): 146,
    ("송진우", "P"): 143,
    ("정민철", "P"): 144,
    ("정민태", "P"): 146,
    ("임선동", "P"): 145,
    ("위재영", "P"): 150,
    ("구대성", "P"): 148,
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
            # Postseason benches can have tiny regular-season PA.
            if h["name"] == name and (h["pa"] or 0) >= 1:
                if best is None or h["pa"] > best["pa"]:
                    best = h
    if not best:
        raise SystemExit(f"hitter not found: {name} in {keys}")
    return best


def find_pitcher(keys, name):
    best = None
    for key in keys:
        for p in RAW[key]["pitchers"]:
            if p["name"] == name and (p["ipf"] or 0) >= 1:
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
    """Return peak fastball velocity (km/h). The sim sits a few km/h below this most of the time."""
    if (name, "P") in VELO:
        return VELO[(name, "P")]
    ip = p["ipf"] or 1
    k9 = (p["so"] or 0) / ip * 9
    base = 136 if year < 1990 else 140 if year < 2000 else 143 if year < 2010 else 145 if year < 2020 else 146
    velo = base + (k9 - 6) * 0.65
    ipg = ip / max(p["g"] or 1, 1)
    if (p["sv"] or 0) >= 15 and ipg < 2.2:
        velo += 2
    return int(round(clamp(velo, 122, 158)))


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


def _pa(ab, bb=0, hbp=0, sf=0, sac=0):
    return ab + bb + hbp + sf + sac


def _hitter(pid, name, g, ab, r, h, d, t, hr, rbi, so, bb, sac=0, sf=0, hbp=0, sb=0, cs=0):
    singles = h - d - t - hr
    tb = singles + 2 * d + 3 * t + 4 * hr
    return {
        "id": pid,
        "name": name,
        "g": g,
        "pa": _pa(ab, bb, hbp, sf, sac),
        "ab": ab,
        "r": r,
        "h": h,
        "d": d,
        "t": t,
        "hr": hr,
        "tb": tb,
        "rbi": rbi,
        "sac": sac,
        "sf": sf,
        "sb": sb,
        "cs": cs,
        "bb": bb,
        "hbp": hbp,
        "so": so,
    }


def _pitcher(pid, name, g, w, l, sv, ipf, h, r, er, hr, bb, so, hbp=0, hld=0):
    era = round(er / ipf * 9, 2) if ipf else 0
    whip = round((h + bb) / ipf, 2) if ipf else 0
    return {
        "id": pid,
        "name": name,
        "era": f"{era:.2f}",
        "g": g,
        "w": w,
        "l": l,
        "sv": sv,
        "hld": hld,
        "ip": str(ipf),
        "ipf": ipf,
        "h": h,
        "hr": hr,
        "bb": bb,
        "hbp": hbp,
        "so": so,
        "r": r,
        "er": er,
        "whip": f"{whip:.2f}",
    }


# 2008 Beijing Olympics — official cumulative stats (LA84 / IOC as of 23 Aug 2008).
OLYMPIC_2008_HITTERS = {
    "이용규": _hitter("o08-이용규", "이용규", 9, 27, 8, 13, 2, 0, 0, 4, 2, 4, sac=0, sf=1, sb=1, cs=1),
    "정근우": _hitter("o08-정근우", "정근우", 8, 29, 5, 9, 1, 0, 1, 1, 2, 0, sac=1, sb=1, cs=1),
    "김현수": _hitter("o08-김현수", "김현수", 8, 27, 3, 10, 2, 0, 0, 4, 5, 1, sb=2, cs=1),
    "이대호": _hitter("o08-이대호", "이대호", 9, 25, 5, 9, 1, 0, 3, 10, 3, 7, sac=1, hbp=1),
    "이승엽": _hitter("o08-이승엽", "이승엽", 8, 30, 4, 5, 1, 0, 2, 6, 9, 4),
    "김동주": _hitter("o08-김동주", "김동주", 6, 17, 4, 5, 0, 0, 0, 0, 3, 4),
    "이종욱": _hitter("o08-이종욱", "이종욱", 9, 34, 4, 10, 0, 0, 0, 3, 4, 3, sf=1, sb=2, cs=1),
    "강민호": _hitter("o08-강민호", "강민호", 6, 22, 3, 6, 2, 0, 0, 4, 10, 1),
    "박진만": _hitter("o08-박진만", "박진만", 7, 15, 1, 1, 0, 0, 0, 0, 1, 1),
    "진갑용": _hitter("o08-진갑용", "진갑용", 6, 10, 1, 1, 0, 0, 0, 0, 0, 1),
    "이진영": _hitter("o08-이진영", "이진영", 7, 18, 2, 6, 0, 0, 0, 4, 3, 2),
    "이택근": _hitter("o08-이택근", "이택근", 5, 16, 3, 3, 0, 0, 1, 3, 3, 0, sf=1),
    "고영민": _hitter("o08-고영민", "고영민", 8, 24, 6, 5, 0, 0, 1, 5, 9, 1, hbp=1, sb=1, cs=2),
    "김민재": _hitter("o08-김민재", "김민재", 5, 11, 1, 0, 0, 0, 0, 0, 4, 1, hbp=1),
}

OLYMPIC_2008_PITCHERS = {
    "류현진": _pitcher("o08-류현진", "류현진", 2, 2, 0, 0, 17 + 1 / 3, 10, 2, 2, 2, 5, 13),
    "김광현": _pitcher("o08-김광현", "김광현", 3, 1, 0, 0, 14 + 1 / 3, 10, 3, 2, 0, 3, 12),
    "봉중근": _pitcher("o08-봉중근", "봉중근", 2, 0, 0, 0, 8 + 2 / 3, 14, 9, 8, 0, 4, 6, hbp=1),
    "송승준": _pitcher("o08-송승준", "송승준", 2, 1, 0, 0, 12 + 1 / 3, 7, 3, 3, 0, 5, 12),
    "장원삼": _pitcher("o08-장원삼", "장원삼", 2, 1, 0, 0, 12 + 1 / 3, 6, 0, 0, 0, 0, 11),
    "한기주": _pitcher("o08-한기주", "한기주", 3, 1, 0, 0, 2 + 1 / 3, 7, 6, 5, 1, 2, 3),
    "윤석민": _pitcher("o08-윤석민", "윤석민", 5, 2, 0, 1, 7 + 2 / 3, 6, 2, 2, 1, 1, 6),
    "권혁": _pitcher("o08-권혁", "권혁", 3, 0, 0, 0, 1 + 1 / 3, 0, 0, 0, 0, 1, 2),
    "정대현": _pitcher("o08-정대현", "정대현", 3, 0, 0, 2, 4.0, 2, 1, 1, 1, 0, 7),
    "오승환": _pitcher("o08-오승환", "오승환", 2, 1, 0, 1, 1 + 2 / 3, 0, 0, 0, 0, 0, 1),
}

OLYMPIC_2008_HANDS = {
    "o08-이용규": {"bats": "L", "throws": "L", "ok": True},
    "o08-정근우": {"bats": "R", "throws": "R", "ok": True},
    "o08-김현수": {"bats": "L", "throws": "R", "ok": True},
    "o08-이대호": {"bats": "R", "throws": "R", "ok": True},
    "o08-이승엽": {"bats": "L", "throws": "L", "ok": True},
    "o08-김동주": {"bats": "R", "throws": "R", "ok": True},
    "o08-이종욱": {"bats": "L", "throws": "L", "ok": True},
    "o08-강민호": {"bats": "R", "throws": "R", "ok": True},
    "o08-박진만": {"bats": "R", "throws": "R", "ok": True},
    "o08-진갑용": {"bats": "R", "throws": "R", "ok": True},
    "o08-이진영": {"bats": "L", "throws": "L", "ok": True},
    "o08-이택근": {"bats": "R", "throws": "R", "ok": True},
    "o08-고영민": {"bats": "R", "throws": "R", "ok": True},
    "o08-김민재": {"bats": "R", "throws": "R", "ok": True},
    "o08-류현진": {"bats": "R", "throws": "L", "ok": True},
    "o08-김광현": {"bats": "L", "throws": "L", "ok": True},
    "o08-봉중근": {"bats": "L", "throws": "L", "ok": True},
    "o08-송승준": {"bats": "R", "throws": "R", "ok": True},
    "o08-장원삼": {"bats": "L", "throws": "L", "ok": True},
    "o08-한기주": {"bats": "R", "throws": "R", "ok": True},
    "o08-윤석민": {"bats": "R", "throws": "R", "ok": True},
    "o08-권혁": {"bats": "L", "throws": "L", "ok": True},
    "o08-정대현": {"bats": "R", "throws": "R", "ok": True},
    "o08-오승환": {"bats": "R", "throws": "R", "ok": True},
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
        "blurb": "2021 한국시리즈 우승 엔트리. 정규시즌 공동 1위. 한국시리즈에서 고영표는 불펜으로 썼고, 김재윤이 마무리를 맡았다.",
        "lineup": [("조용호", "LF"), ("배정대", "CF"), ("강백호", "1B"), ("황재균", "3B"), ("장성우", "C"), ("유한준", "DH"), ("심우준", "SS"), ("호잉", "RF"), ("박경수", "2B")],
        "bench": ["김민혁", "신본기", "허도환", "오윤석", "김준태", "권동진", "홍현빈", "송민섭"],
        "rotation": ["쿠에바스", "데스파이네", "소형준", "배제성", "엄상백"],
        "bullpen": ["고영표", "주권", "이대은", "김민수", "심재민", "박시영", "조현우"],
        "closers": ["김재윤"],
    },
    {
        "id": "canon-2014-ss",
        "name": "2014 삼성 라이온즈",
        "shortName": "삼성",
        "year": 2014,
        "keys": ["2014-SS"],
        "primary": "#074CA1",
        "secondary": "#D5D8DC",
        "blurb": "2014 한국시리즈 우승 엔트리. 통합 4연패. 임창용이 마무리를 닫고 안지만·차우찬이 앞에 섰다.",
        "lineup": [("박해민", "CF"), ("김상수", "SS"), ("나바로", "2B"), ("최형우", "LF"), ("채태인", "1B"), ("박석민", "3B"), ("이승엽", "DH"), ("박한이", "RF"), ("이지영", "C")],
        "bench": ["김헌곤", "이흥련", "김태완", "조동찬", "진갑용", "우동균"],
        "rotation": ["밴덴헐크", "윤성환", "장원삼", "마틴", "배영수"],
        "bullpen": ["안지만", "차우찬", "심창민", "권혁", "백정현", "김현우"],
        "closers": ["임창용"],
    },
    {
        "id": "canon-2017-ht",
        "name": "2017 KIA 타이거즈",
        "shortName": "KIA",
        "year": 2017,
        "keys": ["2017-HT"],
        "primary": "#EA0029",
        "secondary": "#141414",
        "blurb": "2017 한국시리즈 우승 30인 엔트리. 양현종·헥터 원투에 김세현이 마무리를 맡았다.",
        "lineup": [("이명기", "RF"), ("김주찬", "1B"), ("버나디나", "CF"), ("최형우", "LF"), ("나지완", "DH"), ("안치홍", "2B"), ("이범호", "3B"), ("김민식", "C"), ("김선빈", "SS")],
        "bench": ["서동욱", "최원준", "한승택", "김호령", "김주형", "고장혁", "신종길", "유재신", "이정훈"],
        "rotation": ["양현종", "헥터", "팻딘", "임기영"],
        "bullpen": ["임창용", "심동섭", "김윤동", "고효준", "홍건희", "임기준", "박진태"],
        "closers": ["김세현"],
    },
    {
        "id": "canon-1994-lg",
        "name": "1994 LG 트윈스",
        "shortName": "LG",
        "year": 1994,
        "keys": ["1994-LG"],
        "primary": "#C8102E",
        "secondary": "#1A1A1A",
        "blurb": "1994 한국시리즈 우승 엔트리. 이상훈·김태원·정삼흠 선발, 김용수 마무리·시리즈 MVP.",
        "lineup": [("류지현", "SS"), ("김재현", "LF"), ("서용빈", "1B"), ("한대화", "3B"), ("노찬엽", "CF"), ("김영직", "DH"), ("김동수", "C"), ("박준태", "RF"), ("박종호", "2B")],
        "bench": ["최훈재", "이종열", "김선진", "김정민", "허문회", "서효인", "윤찬"],
        "rotation": ["이상훈", "김태원", "정삼흠", "인현배"],
        "bullpen": ["김기범", "차동철", "강봉수", "차명석", "민원기"],
        "closers": ["김용수"],
    },
    {
        "id": "canon-2016-ob",
        "name": "2016 두산 베어스",
        "shortName": "두산",
        "year": 2016,
        "keys": ["2016-OB"],
        "primary": "#131230",
        "secondary": "#E31837",
        "blurb": "2016 한국시리즈 우승 28인 엔트리. 판타스틱4 선발에 이현승이 마무리를 맡았다.",
        "lineup": [("박건우", "CF"), ("허경민", "3B"), ("민병헌", "RF"), ("김재환", "LF"), ("에반스", "DH"), ("오재일", "1B"), ("양의지", "C"), ("오재원", "2B"), ("김재호", "SS")],
        "bench": ["정수빈", "박세혁", "최주환", "국해성", "최재훈", "이원석", "류지혁"],
        "rotation": ["니퍼트", "보우덴", "장원준", "유희관"],
        "bullpen": ["이용찬", "윤명준", "김강률", "김성배", "함덕주", "이현호", "홍상삼"],
        "closers": ["이현승"],
    },
    {
        "id": "canon-2022-sk",
        "name": "2022 SSG 랜더스",
        "shortName": "SSG",
        "year": 2022,
        "keys": ["2022-SK"],
        "primary": "#CE0E2D",
        "secondary": "#F2C14E",
        "blurb": "2022 한국시리즈 우승 30인 엔트리. 김광현·폰트 원투, 서진용이 마무리. 김택형은 셋업·세이브를 나눠 맡았다.",
        "lineup": [("추신수", "DH"), ("최지훈", "CF"), ("최정", "3B"), ("한유섬", "RF"), ("전의산", "1B"), ("박성한", "SS"), ("오태곤", "LF"), ("이재원", "C"), ("김성현", "2B")],
        "bench": ["최주환", "김민식", "김강민", "라가레스", "하재훈", "안상현", "최경모", "조형우"],
        "rotation": ["김광현", "폰트", "오원석", "이태양", "모리만도", "박종훈"],
        "bullpen": ["문승원", "김택형", "노경은", "고효준", "장지훈", "최민준"],
        "closers": ["서진용"],
    },
    {
        "id": "canon-1992-lt",
        "name": "1992 롯데 자이언츠",
        "shortName": "롯데",
        "year": 1992,
        "keys": ["1992-LT"],
        "primary": "#D31245",
        "secondary": "#111111",
        "blurb": "1992 한국시리즈 우승 엔트리. 염종석·윤학길이 선발, 박동희가 시리즈 MVP. 김선일이 안방, 박계원이 유격.",
        "lineup": [("전준호", "CF"), ("조성옥", "DH"), ("김응국", "LF"), ("김민호", "1B"), ("박정태", "2B"), ("이종운", "RF"), ("공필성", "3B"), ("박계원", "SS"), ("김선일", "C")],
        "bench": ["장효조", "한영준", "강성우", "김민재", "최계영", "박영태", "김종헌", "고정식"],
        "rotation": ["염종석", "윤학길", "박동희", "윤형배"],
        "bullpen": ["이상번", "김상현", "김태형", "김종석", "박동수"],
        "closers": [],
    },
    {
        "id": "canon-2020-nc",
        "name": "2020 NC 다이노스",
        "shortName": "NC",
        "year": 2020,
        "keys": ["2020-NC"],
        "primary": "#315288",
        "secondary": "#C4A35A",
        "blurb": "2020 한국시리즈 우승 30인 엔트리. 이재학은 제외됐고, 원종현이 마무리, 임창민·김진성·문경찬이 필승조였다.",
        "lineup": [("박민우", "2B"), ("이명기", "CF"), ("나성범", "RF"), ("양의지", "C"), ("알테어", "LF"), ("박석민", "3B"), ("노진혁", "SS"), ("권희동", "DH"), ("강진성", "1B")],
        "bench": ["김성욱", "모창민", "이원재", "김태군", "김형준", "김찬형", "지석훈", "이재율"],
        "rotation": ["루친스키", "라이트", "구창모", "송명기"],
        "bullpen": ["김진성", "임창민", "문경찬", "임정호", "손정욱", "홍성민", "김건태", "김영규"],
        "closers": ["원종현"],
    },
    {
        "id": "canon-1999-hh",
        "name": "1999 한화 이글스",
        "shortName": "한화",
        "year": 1999,
        "keys": ["1999-HH"],
        "primary": "#FC4C02",
        "secondary": "#1A1A1A",
        "blurb": "1999 한국시리즈 우승 엔트리. 구대성이 마무리 MVP, 정민철·송진우·이상목이 선발을 돌렸다.",
        "lineup": [("이영우", "LF"), ("임수민", "2B"), ("데이비스", "CF"), ("로마이어", "1B"), ("장종훈", "DH"), ("송지만", "RF"), ("백재호", "SS"), ("조경택", "C"), ("강석천", "3B")],
        "bench": ["최익성", "김충민", "허준", "김승권", "심재윤", "임주택"],
        "rotation": ["정민철", "송진우", "이상목", "한용덕"],
        "bullpen": ["김경원", "홍우태", "이상열", "이상군", "임창식"],
        "closers": ["구대성"],
    },
    {
        "id": "canon-2014-wo",
        "name": "2014 넥센 히어로즈",
        "shortName": "넥센",
        "year": 2014,
        "keys": ["2014-WO"],
        "primary": "#570514",
        "secondary": "#C4A35A",
        "blurb": "2014 한국시리즈 진출 엔트리. 밴헤켄·소사·오주원(옛 오재영) 선발, 손승락 마무리, 한현희·조상우 필승조. 하영민은 당시 김영민.",
        "lineup": [("서건창", "2B"), ("이택근", "LF"), ("유한준", "RF"), ("박병호", "1B"), ("강정호", "SS"), ("김민성", "3B"), ("윤석민", "DH"), ("문우람", "CF"), ("허도환", "C")],
        "bench": ["이성열", "로티노", "박동원", "서동욱", "김지수", "김하성", "박헌도", "유재신"],
        "rotation": ["밴헤켄", "소사", "오주원"],
        "bullpen": ["한현희", "조상우", "마정길", "김대우", "문성현", "하영민"],
        "closers": ["손승락"],
    },
    {
        "id": "canon-2008-wo",
        "name": "2008 우리 히어로즈",
        "shortName": "우리",
        "year": 2008,
        "keys": ["2008-WO"],
        "primary": "#0B5EA8",
        "secondary": "#E30613",
        "blurb": "현대 해체 뒤 첫 시즌. 정규 7위. 장원삼·마일영·김수경·이현승 선발축, 황두성·다카쓰가 마무리를 나눠 맡았다.",
        "lineup": [("이택근", "CF"), ("김일경", "2B"), ("정성훈", "3B"), ("브룸바", "DH"), ("송지만", "RF"), ("이숭용", "1B"), ("전준호", "LF"), ("강귀태", "C"), ("강정호", "SS")],
        "bench": ["황재균", "김동수", "강병식", "권도영", "정수성", "조재호", "유재신"],
        "rotation": ["장원삼", "마일영", "김수경", "이현승"],
        "bullpen": ["송신영", "조용훈", "박승민", "노환수", "전준호"],
        "closers": ["황두성", "다카쓰"],
    },
    {
        "id": "canon-2009-wo",
        "name": "2009 서울 히어로즈",
        "shortName": "서울",
        "year": 2009,
        "keys": ["2009-WO"],
        "primary": "#570514",
        "secondary": "#F2F2F2",
        "blurb": "스폰서 없이 서울 히어로즈로 치른 시즌. 정규 6위. 이택근 골든글러브, 이현승 13승, 황두성 마무리.",
        "lineup": [("이택근", "CF"), ("김일경", "2B"), ("황재균", "3B"), ("브룸바", "DH"), ("클락", "LF"), ("송지만", "RF"), ("이숭용", "1B"), ("강귀태", "C"), ("강정호", "SS")],
        "bench": ["김민우", "정수성", "강병식", "오재일", "김동수", "허준", "전준호"],
        "rotation": ["이현승", "김수경", "마일영", "장원삼"],
        "bullpen": ["이보근", "송신영", "신철인", "오주원", "강윤구", "배힘찬", "김성현"],
        "closers": ["황두성"],
    },
    {
        "id": "canon-1993-ht",
        "name": "1993 해태 타이거즈",
        "shortName": "해태",
        "year": 1993,
        "keys": ["1993-HT"],
        "primary": "#E10600",
        "secondary": "#111111",
        "blurb": "1993 한국시리즈 우승 엔트리. 선동열 마무리, 조계현·이강철·이대진·김정수 선발, 송유석 스윙맨.",
        "lineup": [("이종범", "SS"), ("이순철", "CF"), ("김성한", "1B"), ("한대화", "3B"), ("홍현우", "2B"), ("이건열", "LF"), ("이호성", "RF"), ("정회열", "C"), ("정성룡", "DH")],
        "bench": ["장채근", "김훈", "박철우", "이용석", "윤재호", "김병조", "이경복"],
        "rotation": ["조계현", "이강철", "이대진", "김정수"],
        "bullpen": ["송유석", "문희수", "강태원", "신동수"],
        "closers": ["선동열"],
    },
    {
        "id": "canon-1983-lg",
        "name": "1983 MBC 청룡",
        "shortName": "MBC",
        "year": 1983,
        "keys": ["1983-LG"],
        "primary": "#0B3D91",
        "secondary": "#F4F1EA",
        "blurb": "1983 MBC 청룡. 김재박 SS·김인식 2B, 이길환·이광권 등이 선발을 돌렸다.",
        "lineup": [("이해창", "CF"), ("김재박", "SS"), ("이종도", "1B"), ("이광은", "3B"), ("김정수", "LF"), ("신언호", "RF"), ("김인식", "2B"), ("김용운", "C"), ("송영운", "DH")],
        "bench": ["유승안", "김바위", "차동열", "김용달"],
        "rotation": ["이길환", "하기룡", "오영일", "유종겸", "이광권"],
        "bullpen": ["정순명", "이원국"],
        "closers": [],
    },
    {
        "id": "canon-1995-ob",
        "name": "1995 OB 베어스",
        "shortName": "OB",
        "year": 1995,
        "keys": ["1995-OB"],
        "primary": "#0C2340",
        "secondary": "#C8102E",
        "blurb": "1995 한국시리즈 우승 엔트리. 김상진 209이닝, 김경원 마무리, 김민호 시리즈 MVP.",
        "lineup": [("김민호", "SS"), ("이명수", "2B"), ("김상호", "LF"), ("김형석", "DH"), ("심정수", "RF"), ("장원진", "CF"), ("안경현", "3B"), ("김종석", "1B"), ("김태형", "C")],
        "bench": ["이도형", "박현영", "정수근", "소상영", "윤기수", "김광현", "김정규"],
        "rotation": ["김상진", "권명철", "진필중", "박철순"],
        "bullpen": ["장호연", "이용호", "강길용", "홍길남"],
        "closers": ["김경원"],
    },
    {
        "id": "canon-2008-sk",
        "name": "2008 SK 와이번스",
        "shortName": "SK",
        "year": 2008,
        "keys": ["2008-SK"],
        "primary": "#FF6900",
        "secondary": "#1A1A1A",
        "blurb": "2008 한국시리즈 우승 엔트리. 김광현·레이번·채병용 선발에 정대현이 마무리, 정우람이 셋업을 맡았다. 박정권은 시즌 중 부상으로 KS 엔트리 제외.",
        "lineup": [("정근우", "2B"), ("최정", "3B"), ("조동화", "CF"), ("김재현", "DH"), ("이진영", "1B"), ("박재상", "LF"), ("나주환", "SS"), ("박경완", "C"), ("박재홍", "RF")],
        "bench": ["김강민", "정상호", "이재원", "모창민", "박정환"],
        "rotation": ["김광현", "채병용", "레이번", "송은범", "김원형"],
        "bullpen": ["정우람", "윤길현", "가득염", "조웅천", "이승호", "이영욱"],
        "closers": ["정대현"],
    },
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
        "bullpen": ["김인권", "한희민", "지연규"],
        "closers": ["송진우"],
    },
    {
        "id": "canon-1983-hd",
        "name": "1983 삼미 슈퍼스타즈",
        "shortName": "삼미",
        "year": 1983,
        "keys": ["1983-HD"],
        "primary": "#7EB6D9",
        "secondary": "#F4E27A",
        "blurb": "1983 삼미 슈퍼스타즈. 장명부 427⅓이닝, 정구선 2B 골든글러브, 김진우가 안방을 지켰다.",
        "lineup": [("이영구", "SS"), ("정구선", "2B"), ("김진우", "C"), ("양승관", "CF"), ("김대진", "LF"), ("이선웅", "3B"), ("박준영", "RF"), ("김경남", "1B"), ("금광옥", "DH")],
        "bench": ["조흥운", "최홍석", "백인천", "정구왕"],
        "rotation": ["장명부", "임호균", "정성만", "김재현"],
        "bullpen": ["인호봉", "오문현", "김상기"],
        "closers": [],
    },
    {
        "id": "canon-1986-hd",
        "name": "1986 청보 핀토스",
        "shortName": "청보",
        "year": 1986,
        "keys": ["1986-HD"],
        "primary": "#1F4E79",
        "secondary": "#E8B84A",
        "blurb": "1986 청보 핀토스. 김신부가 선발 축, 김기태가 마무리·스윙, 정구선·김진우가 타선을 이끌었다.",
        "lineup": [("우경하", "LF"), ("정구선", "2B"), ("김진우", "C"), ("김바위", "1B"), ("권두조", "SS"), ("양승관", "CF"), ("김동기", "DH"), ("김경남", "RF"), ("이선웅", "3B")],
        "bench": ["금광옥", "정구왕", "김영균", "김경갑", "양후승"],
        "rotation": ["김신부", "최계훈", "정은배", "김봉근"],
        "bullpen": ["조병천", "정성만", "정선두", "신태중"],
        "closers": ["김기태"],
    },
    {
        "id": "canon-1989-hd",
        "name": "1989 태평양 돌핀스",
        "shortName": "태평양",
        "year": 1989,
        "keys": ["1989-HD"],
        "primary": "#1493B8",
        "secondary": "#0A2A43",
        "blurb": "1989 태평양 돌핀스. 김동기 120경기 포수, 김일권 62도루, 박정현·최창호 220이닝 이상.",
        "lineup": [("김일권", "CF"), ("이광길", "2B"), ("홍문종", "LF"), ("김동기", "C"), ("이선웅", "1B"), ("김윤환", "RF"), ("원원근", "SS"), ("유동효", "3B"), ("김한근", "DH")],
        "bench": ["김바위", "정영기", "여태구", "정진호", "이광근"],
        "rotation": ["박정현", "최창호", "양상문", "정명원"],
        "bullpen": ["김신부", "박은진", "신완근", "조병천"],
        "closers": [],
    },
    {
        "id": "canon-2000-hd",
        "name": "2000 현대 유니콘스",
        "shortName": "현대",
        "year": 2000,
        "keys": ["2000-HD"],
        "primary": "#6B1D2A",
        "secondary": "#C4A35A",
        "blurb": "2000 한국시리즈 우승 엔트리. 정민태·임선동·김수경 18승 트리오, 위재영 마무리, 퀸란 시리즈 MVP.",
        "lineup": [("전준호", "LF"), ("박종호", "2B"), ("박재홍", "CF"), ("박경완", "C"), ("심재학", "RF"), ("퀸란", "3B"), ("박진만", "SS"), ("이숭용", "1B"), ("카펜터", "DH")],
        "bench": ["이명수", "김인호", "이재주", "염경엽", "장교성", "전근표"],
        "rotation": ["정민태", "임선동", "김수경", "정명원"],
        "bullpen": ["조웅천", "신철인", "마일영", "조규제", "전준호"],
        "closers": ["위재영"],
    },
    {
        "id": "canon-1996-sb",
        "name": "1996 쌍방울 레이더스",
        "shortName": "쌍방울",
        "year": 1996,
        "keys": ["1996-SB"],
        "primary": "#C41E3A",
        "secondary": "#F2F2F2",
        "blurb": "1996 정규시즌 2위, 창단 첫 가을야구(PO). 조규제가 마무리.",
        "lineup": [("김광림", "CF"), ("김실", "RF"), ("김기태", "1B"), ("심성보", "LF"), ("박경완", "C"), ("최태원", "2B"), ("석수철", "3B"), ("김호", "SS"), ("조원우", "DH")],
        "bench": ["박노준", "박철우", "김충민", "진상봉", "백인수", "강종필", "김현민"],
        "rotation": ["성영재", "오봉옥", "김원형", "박성기", "김기덕"],
        "bullpen": ["김현욱", "최정환", "박주언", "박진석", "유현승"],
        "closers": ["조규제"],
    },
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
        # Typical Olympic batting order (gold-medal game core).
        "lineup": [("이종욱", "CF"), ("이용규", "RF"), ("김현수", "LF"), ("이승엽", "1B"), ("김동주", "3B"), ("이대호", "DH"), ("고영민", "2B"), ("강민호", "C"), ("박진만", "SS")],
        "bench": ["진갑용", "이진영", "이택근", "정근우", "김민재"],
        # Actual Olympic starters (planned 4 + 장원삼). Closers: 오승환 1 SV, 정대현 2 SV(결승 포함).
        "rotation": ["류현진", "김광현", "봉중근", "송승준", "장원삼"],
        "bullpen": ["윤석민", "한기주", "권혁"],
        "closers": ["오승환", "정대현"],
    },
]


def main():
    needed = []
    resolved = []
    for spec in TEAMS:
        keys = spec["keys"]
        hitters = []
        for name, pos in spec["lineup"] + [(n, "DH") for n in spec["bench"]]:
            if spec.get("olympic"):
                if name not in OLYMPIC_2008_HITTERS:
                    raise SystemExit(f"olympic hitter missing: {name}")
                h = OLYMPIC_2008_HITTERS[name]
                hitters.append(("olympic", name, pos, h))
                needed.append(h["id"])
                continue
            h = find_hitter(keys, name)
            hitters.append(("kbo", name, pos, h))
            needed.append(h["id"])
        pitchers = []
        staff = list(spec["rotation"]) + list(spec["bullpen"]) + list(spec.get("closers", []))
        # Keep order but allow same display name twice (e.g. 전준호 OF/P) via separate finds.
        for name in staff:
            if spec.get("olympic"):
                if name not in OLYMPIC_2008_PITCHERS:
                    raise SystemExit(f"olympic pitcher missing: {name}")
                p = OLYMPIC_2008_PITCHERS[name]
            else:
                p = find_pitcher(keys, name)
            pitchers.append(p)
            needed.append(p["id"])
        resolved.append((spec, hitters, pitchers))

    hands = load_hands(sorted(i for i in set(needed) if not str(i).startswith("o08-")))
    hands.update(OLYMPIC_2008_HANDS)

    failed = [pid for pid, h in hands.items() if pid in set(needed) and not h.get("ok")]
    print("hands unresolved", len(failed))

    teams = []
    for spec, hitters, pitchers in resolved:
        year = spec["year"]
        players = []
        lineup = []
        bench = []
        by_name = {}
        for name, pos in spec["lineup"]:
            src = next(s for k, n, p, s in hitters if n == name)
            player = build_batter(src, year, pos, hands)
            player["positions"] = [pos]
            players.append(player)
            lineup.append({"playerId": player["id"], "position": pos})
            by_name[name] = player["id"]
        for name in spec["bench"]:
            src = next(s for k, n, p, s in hitters if n == name)
            player = build_batter(src, year, "DH", hands)
            player["positions"] = ["DH"]
            players.append(player)
            bench.append(player["id"])
            by_name[name] = player["id"]

        rotation = []
        bullpen = []
        closers = []
        used_pitcher_ids = set()

        def take_pitcher(name, target):
            # Prefer unused pitcher rows with this name (handles 전준호 OF/P).
            src = next((p for p in pitchers if p["name"] == name and p["id"] not in used_pitcher_ids), None)
            if src is None:
                src = next(p for p in pitchers if p["name"] == name)
            if src["id"] in used_pitcher_ids:
                # Already built — reuse id into the requested list.
                pid = next(x["id"] for x in players if x.get("sourceId") == src["id"] and x["kind"] == "P")
                target.append(pid)
                return
            # Avoid colliding with a batter that shares the display name.
            player = build_pitcher(src, year, hands)
            players.append(player)
            used_pitcher_ids.add(src["id"])
            target.append(player["id"])

        for name in spec["rotation"]:
            take_pitcher(name, rotation)
        for name in spec["bullpen"]:
            take_pitcher(name, bullpen)
        for name in spec.get("closers", []):
            take_pitcher(name, closers)

        bench_pos = {
            "김민혁": "LF", "신본기": "SS", "허도환": "C", "오윤석": "3B", "김준태": "C", "권동진": "2B", "홍현빈": "CF", "송민섭": "CF",
            "김헌곤": "RF", "이흥련": "C", "김태완": "1B", "조동찬": "SS", "진갑용": "C", "우동균": "LF",
            "서동욱": "2B", "최원준": "CF", "한승택": "C", "김호령": "CF", "김주형": "1B", "고장혁": "SS", "신종길": "RF", "유재신": "CF", "이정훈": "C",
            "최훈재": "1B", "김영직": "LF", "김선진": "RF", "김정민": "C", "허문회": "SS",
            "정수빈": "CF", "박세혁": "C", "최주환": "2B", "국해성": "LF", "최재훈": "C", "이원석": "3B", "류지혁": "SS",
            "김민식": "C", "김강민": "CF", "라가레스": "LF", "하재훈": "LF", "안상현": "2B", "최경모": "SS", "조형우": "C", "전의산": "1B",
            "장효조": "DH", "김선일": "C", "강성우": "3B", "김민재": "SS", "최계영": "LF",
            "김성욱": "CF", "모창민": "1B", "이원재": "3B", "김태군": "C", "김형준": "C", "김찬형": "SS", "지석훈": "3B", "이재율": "CF",
            "최익성": "RF", "김충민": "C", "허준": "SS", "김승권": "2B", "심재윤": "CF", "임주택": "LF",
            "이성열": "LF", "로티노": "2B", "박동원": "C", "김지수": "3B", "김하성": "SS", "박헌도": "LF",
            "김훈": "LF", "정회열": "C", "박철우": "1B", "이용석": "2B",
            "김용운": "RF", "김바위": "1B", "차동열": "LF", "김용달": "C",
            "안경현": "1B", "임형석": "LF", "정수근": "CF", "박현영": "C",
            "조동화": "CF", "정상호": "C", "이재원": "C", "박정환": "SS",
            "이중화": "CF", "이종호": "RF", "조양근": "C", "진상봉": "CF",
            "박준영": "LF", "정구왕": "SS", "백인천": "DH", "김경남": "C",
            "금광옥": "SS", "이선웅": "C", "권두조": "1B", "양후승": "LF",
            "정영기": "3B", "여태구": "LF", "정진호": "RF", "이광근": "C",
            "이명수": "C", "카펜터": "LF", "이재주": "C", "염경엽": "2B", "장교성": "SS", "전근표": "1B",
            "박노준": "DH", "백인수": "3B", "강종필": "C", "김현민": "LF",
            "진갑용": "C", "이진영": "RF", "이택근": "LF", "고영민": "2B",
        }
        for pl in players:
            if pl["id"] in bench and pl["name"] in bench_pos:
                pl["positions"] = [bench_pos[pl["name"]]]
                if pl.get("batter"):
                    pl["batter"]["swar"] = round2(
                        pl["batter"]["swar"]
                        + (POS_RUN["DH"] - POS_RUN[bench_pos[pl["name"]]]) * -1 * (pl["batter"]["pa"] / 600) / 10
                    )
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
            "closers": closers,
            "bench": bench,
            "players": players,
            "createdAt": "2008-08-23T00:00:00.000Z" if spec["id"].endswith("kor") else f"{year}-10-01T00:00:00.000Z",
        })
        print(
            spec["name"],
            "players", len(players),
            "R", len(rotation), "BP", len(bullpen), "CL", len(closers), "B", len(bench),
            "LHP", [p["name"] for p in players if p["kind"] == "P" and p["throws"] == "L"],
        )

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
        team["closers"] = [idmap[i] for i in team["closers"]]
        team["bench"] = [idmap[i] for i in team["bench"]]

    OUT.write_text(json.dumps(teams, ensure_ascii=False, indent=1), encoding="utf-8")
    print("wrote", OUT, "bytes", OUT.stat().st_size)


if __name__ == "__main__":
    main()
