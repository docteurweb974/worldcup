/** Lecteur intégré du résumé vidéo (beIN SPORTS), affiché sous un match terminé. */
export function MatchHighlights({ youtubeId, title }: { youtubeId: string; title: string }) {
  return (
    <section className="mx-auto max-w-2xl space-y-2 px-4 pb-6">
      <h2 className="font-bold">Résumé du match 🎬</h2>
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <p className="text-xs text-neutral-500">
        {title} — via beIN SPORTS.{" "}
        <a
          href={`https://www.youtube.com/watch?v=${youtubeId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          Voir sur YouTube
        </a>
        {" · "}Disponible en France et dans les DOM-TOM.
      </p>
    </section>
  );
}
