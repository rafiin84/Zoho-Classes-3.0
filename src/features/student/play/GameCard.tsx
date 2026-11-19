"use client";
import Link from "next/link";
import { Badge, Card, Cover, Icon } from "@/components/ui";
import type { Game } from "./games";

export function GameCard({ g }: { g: Game }) {
  return (
    <Link href={g.href} className="block h-full rounded-[1.25rem] focus-visible:outline-2" aria-label={`Play ${g.title}`}>
      <Card className="h-full overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-card">
        <Cover from={g.from} to={g.to} className="h-28" rounded="rounded-none" icon={<Icon name={g.icon} size={46} weight="duotone" />}>
          {g.teacherHosted && <span className="absolute left-3 top-3 rounded-full bg-black/35 px-2.5 py-0.5 text-xs font-semibold text-white">Teacher-hosted</span>}
        </Cover>
        <div className="space-y-2 p-4">
          <h3 className="font-semibold">{g.title}</h3>
          <p className="line-clamp-2 text-sm text-text-2">{g.blurb}</p>
          <div className="flex flex-wrap gap-1.5"><Badge tone="primary">{g.subject}</Badge><Badge>{g.topic}</Badge><Badge>{g.mode === "solo" ? "Solo" : "Multiplayer"}</Badge><Badge>{g.competition === "team" ? "Team" : "Individual"}</Badge><Badge className="tnum">{g.minutes} min</Badge></div>
        </div>
      </Card>
    </Link>
  );
}
