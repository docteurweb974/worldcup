import Link from "next/link";
import { logout } from "@/app/auth/actions";
import type { AccountSummary } from "@/lib/account";

/** Indicateur d'authentification dans l'en-tête (état calculé côté serveur). */
export function AuthButton({ account }: { account: AccountSummary | null }) {
  if (!account) {
    return (
      <Link
        href="/connexion"
        className="grid min-h-tap place-items-center rounded-full bg-accent px-4 text-sm font-semibold text-white"
      >
        Connexion
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/pronos" className="text-right leading-tight">
        <span className="block max-w-[9rem] truncate text-sm font-semibold sm:max-w-[14rem]" title={account.username}>
          {account.username}
        </span>
        <span className="block text-xs font-semibold text-accent">{account.points} pts</span>
      </Link>
      <form action={logout}>
        <button
          type="submit"
          aria-label="Se déconnecter"
          title="Se déconnecter"
          className="grid h-tap w-tap cursor-pointer place-items-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-800"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="m16 17 5-5-5-5M21 12H9" />
          </svg>
        </button>
      </form>
    </div>
  );
}
