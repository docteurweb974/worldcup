"use client";

import { useState } from "react";
import { usePreferences } from "./PreferencesProvider";
import { formatDateLong } from "@/lib/timezone";

export interface ResumeItem {
  matchId: number;
  youtubeId: string;
  title: string;
  homeFlag: string;
  homeFr: string;
  awayFlag: string;
  awayFr: string;
  score: string | null;
  utcDate: string;
}

export interface ResumeSection {
  key: string;
  label: string;
  items: ResumeItem[];
}

/** Galerie des résumés, regroupés par journée/tour, en carrousels horizontaux. */
export function ResumesGallery({ sections }: { sections: ResumeSection[] }) {
  const [playing, setPlaying] = useState<number | null>(null);
  const { timezone } = usePreferences();

  if (sections.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-neutral-500">
        Aucun résumé disponible pour le moment. 🎬
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.key} className="space-y-2">
          <h2 className="font-bold">{section.label}</h2>
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
            {section.items.map((it) => (
              <div key={it.matchId} className="w-72 shrink-0 snap-start space-y-1">
                <div className="aspect-video w-full overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                  {playing === it.matchId ? (
                    <iframe
                      className="h-full w-full"
                      src={`https://www.youtube-nocookie.com/embed/${it.youtubeId}?autoplay=1`}
                      title={it.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPlaying(it.matchId)}
                      className="group relative block h-full w-full"
                      aria-label={`Lire le résumé ${it.homeFr} - ${it.awayFr}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://i.ytimg.com/vi/${it.youtubeId}/hqdefault.jpg`}
                        alt=""
                        className="h-full w-full object-cover transition group-hover:brightness-90"
                        loading="lazy"
                      />
                      <span className="absolute inset-0 grid place-items-center">
                        <span className="grid h-14 w-14 place-items-center rounded-full bg-black/60 text-2xl text-white transition group-hover:scale-110">
                          ▶
                        </span>
                      </span>
                    </button>
                  )}
                </div>
                <p className="text-sm font-medium">
                  {it.homeFlag} {it.homeFr}{" "}
                  {it.score && <span className="tabular-nums">{it.score}</span>} {it.awayFr}{" "}
                  {it.awayFlag}
                </p>
                <p className="text-xs text-neutral-500">{formatDateLong(it.utcDate, timezone)}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
