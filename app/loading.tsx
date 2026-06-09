/** Skeleton global affiché pendant le chargement des pages. */
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <div className="mx-auto h-8 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="mx-auto h-4 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="h-40 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
    </div>
  );
}
