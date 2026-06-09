/** Placeholder temporaire pour les pages à venir (étapes 4-5). */
export function PagePlaceholder({ title, step }: { title: string; step: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-sm text-neutral-500">À venir — {step}.</p>
    </div>
  );
}
