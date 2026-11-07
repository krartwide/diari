"use client";

import { TeamEditor } from "@/components/team-editor";
import { LOCAL_OWNER_ID } from "@/lib/browser-data";
import { emptyTeam } from "@/lib/stats";

export default function NewTeamPage() {
  return (
    <main>
      <TeamEditor initial={emptyTeam(LOCAL_OWNER_ID)} />
    </main>
  );
}
