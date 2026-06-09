export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="text-5xl" role="img" aria-label="Trophée">
        🏆
      </span>
      <h1 className="text-2xl font-bold sm:text-3xl">
        World Cup Fun — Coupe du Monde 2026
      </h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        Setup initial OK. Les fonctionnalités arrivent étape par étape. 🌴
      </p>
      <span className="rounded-full bg-accent-soft px-4 py-2 text-sm font-medium text-accent">
        Couleur d&apos;accent (variable CSS) opérationnelle
      </span>
    </main>
  );
}
