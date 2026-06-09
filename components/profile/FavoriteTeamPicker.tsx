"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { updateFavoriteTeam } from "@/app/profil/actions";
import { TEAMS } from "@/data/teams";

const normalize = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function FavoriteTeamPicker({ current }: { current: string | null }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(current);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return q ? TEAMS.filter((t) => normalize(t.nameFr).includes(q)) : TEAMS;
  }, [query]);

  const pick = async (tla: string | null) => {
    setSelected(tla);
    setSaving(true);
    await updateFavoriteTeam(tla);
    setSaving(false);
    router.refresh(); // met à jour le fond d'écran de la home
  };

  const baseCls =
    "flex min-h-tap items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors";
  const selCls = "border-accent bg-accent-soft font-semibold";
  const offCls = "border-neutral-200 hover:border-neutral-400 dark:border-neutral-800";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une équipe…"
          aria-label="Rechercher une équipe"
          className="min-h-tap w-full rounded-xl border border-neutral-300 bg-transparent px-4 dark:border-neutral-700"
        />
        {saving && <span className="shrink-0 text-xs text-neutral-500">…</span>}
      </div>

      <button
        type="button"
        onClick={() => pick(null)}
        className={`${baseCls} w-full justify-center ${selected === null ? selCls : offCls}`}
      >
        Aucune (fond neutre)
      </button>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {filtered.map((t) => {
          const sel = selected === t.tla;
          return (
            <button
              key={t.tla}
              type="button"
              aria-pressed={sel}
              onClick={() => pick(t.tla)}
              className={`${baseCls} ${sel ? selCls : offCls}`}
            >
              <span aria-hidden="true" className="text-xl">{t.flag}</span>
              <span className="flex-1 leading-tight">{t.nameFr}</span>
              {sel && <span aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
