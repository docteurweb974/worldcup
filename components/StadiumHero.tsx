import Link from "next/link";
import { flagImageUrl, TEAM_BY_TLA } from "@/data/teams";

/** Drapeau rond (image flagcdn) avec repli emoji. */
export function FlagCircle({ tla, emoji }: { tla: string | null; emoji: string }) {
  const team = tla ? TEAM_BY_TLA[tla] : undefined;
  const url = team ? flagImageUrl(team) : null;
  return url ? (
    <div
      className="h-16 w-16 shrink-0 rounded-full bg-cover bg-center shadow-lg ring-2 ring-white/50"
      style={{ backgroundImage: `url(${url})` }}
      aria-hidden="true"
    />
  ) : (
    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white/10 text-4xl ring-2 ring-white/50">
      {emoji}
    </div>
  );
}

/**
 * Enveloppe « stade plein cadre + carte verre flottante » (DA premium).
 * `children` = contenu de la carte en verre.
 */
export function StadiumHero({
  stadium = "/stadium-1.jpg",
  backHref = "/calendrier",
  cardClassName = "border-white/20",
  children,
}: {
  stadium?: string;
  backHref?: string;
  /** Classes de bord/fond de la carte en verre (ex. bord vert quand enregistré). */
  cardClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Fond stade PLEIN CADRE */}
      <div aria-hidden="true" className="absolute inset-0 bg-neutral-950">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${stadium})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />
      </div>

      {/* Contenu flottant */}
      <div className="relative mx-auto max-w-xl px-4 pb-10 pt-4 text-white">
        <Link href={backHref} className="text-sm text-white/70 hover:text-white">
          ← Calendrier
        </Link>

        {/* Logo FIFA 26 */}
        <div className="mt-6 flex justify-center">
          <div
            className="h-16 w-16 rounded-2xl bg-cover bg-center drop-shadow-lg"
            style={{ backgroundImage: "url(/icon-512.png)" }}
            aria-hidden="true"
          />
        </div>

        {/* Carte VERRE */}
        <div
          className={`mt-4 rounded-3xl border bg-white/10 p-5 shadow-2xl backdrop-blur-xl transition-colors ${cardClassName}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
