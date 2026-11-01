"use client";

import { useState } from "react";
import { CountField, RateField } from "@/components/rate-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { POSITIONS, POSITION_LABEL, recomputeBatterRates, recomputePitcherRates } from "@/lib/stats";
import type { Bats, Player, Position, Throws } from "@/lib/types";

export function PlayerDialog({
  player,
  onClose,
  onSave,
}: {
  player: Player;
  onClose: () => void;
  onSave: (player: Player) => void;
}) {
  const [draft, setDraft] = useState(player);
  const batter = draft.batter;
  const pitcher = draft.pitcher;

  function patchBatter(partial: Partial<NonNullable<Player["batter"]>>) {
    setDraft((current) => ({ ...current, batter: { ...current.batter!, ...partial } }));
  }

  function patchPitcher(partial: Partial<NonNullable<Player["pitcher"]>>) {
    setDraft((current) => ({ ...current, pitcher: { ...current.pitcher!, ...partial } }));
  }

  function fillFromCounting() {
    setDraft((current) => {
      if (current.kind === "B" && current.batter) {
        const next = recomputeBatterRates(current.batter);
        return { ...current, batter: { ...current.batter, avg: next.avg, obp: next.obp, slg: next.slg, ops: next.ops } };
      }
      if (current.kind === "P" && current.pitcher) {
        const next = recomputePitcherRates(current.pitcher);
        return {
          ...current,
          pitcher: {
            ...current.pitcher,
            whip: next.whip,
            era: current.pitcher.er != null ? next.era : current.pitcher.era,
          },
        };
      }
      return current;
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{draft.kind === "B" ? "타자" : "투수"} 기록</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="grid gap-1 text-xs sm:col-span-2">
            <span className="text-muted-foreground">이름</span>
            <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">투구</span>
            <select
              className="field-select"
              value={draft.throws}
              onChange={(event) => setDraft({ ...draft, throws: event.target.value as Throws })}
            >
              <option value="R">우투</option>
              <option value="L">좌투</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">타격</span>
            <select
              className="field-select"
              value={draft.bats}
              onChange={(event) => setDraft({ ...draft, bats: event.target.value as Bats })}
            >
              <option value="R">우타</option>
              <option value="L">좌타</option>
              <option value="S">양타</option>
            </select>
          </label>
          {draft.kind === "B" && (
            <label className="grid gap-1 text-xs sm:col-span-2">
              <span className="text-muted-foreground">포지션</span>
              <select
                className="field-select"
                value={draft.positions[0] ?? "DH"}
                onChange={(event) => setDraft({ ...draft, positions: [event.target.value as Position] })}
              >
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {POSITION_LABEL[pos]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {draft.kind === "B" && batter && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <CountField label="경기" value={batter.g} onChange={(g) => patchBatter({ g })} />
              <CountField label="타수" value={batter.ab} onChange={(ab) => patchBatter({ ab })} />
              <CountField label="안타" value={batter.h} onChange={(h) => patchBatter({ h })} />
              <CountField label="2루타" value={batter.doubles} onChange={(doubles) => patchBatter({ doubles })} />
              <CountField label="3루타" value={batter.triples} onChange={(triples) => patchBatter({ triples })} />
              <CountField label="홈런" value={batter.hr} onChange={(hr) => patchBatter({ hr })} />
              <CountField label="타점" value={batter.rbi} onChange={(rbi) => patchBatter({ rbi })} />
              <CountField label="득점" value={batter.r} onChange={(r) => patchBatter({ r })} />
              <CountField label="도루" value={batter.sb} onChange={(sb) => patchBatter({ sb })} />
              <CountField label="볼넷" value={batter.bb} onChange={(bb) => patchBatter({ bb })} />
              <CountField label="삼진" value={batter.so} onChange={(so) => patchBatter({ so })} />
              <CountField label="사구" value={batter.hbp ?? 0} onChange={(hbp) => patchBatter({ hbp })} />
              <CountField label="희생플라이" value={batter.sf ?? 0} onChange={(sf) => patchBatter({ sf })} />
              <CountField label="속도 1–99" value={batter.speed} onChange={(speed) => patchBatter({ speed: Math.min(99, Math.max(1, speed)) })} />
              <CountField label="wRC+" value={batter.wrcPlus} onChange={(wrcPlus) => patchBatter({ wrcPlus })} />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <RateField key={`avg-${batter.avg}`} label="타율" kind="avg" value={batter.avg} onChange={(avg) => patchBatter({ avg })} />
              <RateField key={`obp-${batter.obp}`} label="출루율" kind="avg" value={batter.obp} onChange={(obp) => patchBatter({ obp })} />
              <RateField key={`slg-${batter.slg}`} label="장타율" kind="avg" value={batter.slg} onChange={(slg) => patchBatter({ slg })} />
              <RateField key={`ops-${batter.ops}`} label="OPS" kind="avg" value={batter.ops} onChange={(ops) => patchBatter({ ops })} />
              <RateField key={`bswar-${batter.swar}`} label="sWAR" kind="swar" value={batter.swar} onChange={(swar) => patchBatter({ swar })} />
            </div>
          </>
        )}

        {draft.kind === "P" && pitcher && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <CountField label="출장" value={pitcher.g} onChange={(g) => patchPitcher({ g })} />
              <CountField label="승" value={pitcher.w} onChange={(w) => patchPitcher({ w })} />
              <CountField label="패" value={pitcher.l} onChange={(l) => patchPitcher({ l })} />
              <CountField label="세이브" value={pitcher.sv} onChange={(sv) => patchPitcher({ sv })} />
              <CountField label="홀드" value={pitcher.hld} onChange={(hld) => patchPitcher({ hld })} />
              <RateField key={`ip-${pitcher.ip}`} label="이닝" kind="ip" value={pitcher.ip} onChange={(ip) => patchPitcher({ ip })} />
              <CountField label="피안타" value={pitcher.h} onChange={(h) => patchPitcher({ h })} />
              <CountField label="피홈런" value={pitcher.hr} onChange={(hr) => patchPitcher({ hr })} />
              <CountField label="볼넷" value={pitcher.bb} onChange={(bb) => patchPitcher({ bb })} />
              <CountField label="사구" value={pitcher.hbp} onChange={(hbp) => patchPitcher({ hbp })} />
              <CountField label="탈삼진" value={pitcher.so} onChange={(so) => patchPitcher({ so })} />
              <CountField label="자책" value={pitcher.er ?? 0} onChange={(er) => patchPitcher({ er })} />
              <CountField label="최고구속 km/h" value={pitcher.speed} onChange={(speed) => patchPitcher({ speed })} />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <RateField key={`era-${pitcher.era}`} label="ERA" kind="rate" value={pitcher.era} onChange={(era) => patchPitcher({ era })} />
              <RateField key={`whip-${pitcher.whip}`} label="WHIP" kind="rate" value={pitcher.whip} onChange={(whip) => patchPitcher({ whip })} />
              <RateField key={`pswar-${pitcher.swar}`} label="sWAR" kind="swar" value={pitcher.swar} onChange={(swar) => patchPitcher({ swar })} />
            </div>
          </>
        )}

        <p className="text-xs leading-5 text-muted-foreground">
          타율·출루율·장타율·OPS는 285를 넣으면 0.285가 됩니다. ERA·WHIP은 325가 3.25, sWAR는 635가 6.35입니다. 소수점을 직접 찍어도 됩니다.
          이닝은 188.2 또는 188 2/3처럼 적어도 됩니다. 타자 속도는 주루 등급, 투수 구속은 최고 시속입니다. 시뮬은 평소 그보다 조금 낮게 던지고, 가끔만 최고에 닿습니다.
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={fillFromCounting}>
            카운팅 기록으로 비율 채우기
          </Button>
          <Button type="button" onClick={() => draft.name.trim() && onSave({ ...draft, name: draft.name.trim() })} disabled={!draft.name.trim()}>
            선수 저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
