"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { login, type AuthState } from "@/app/auth/actions";

const inputCls =
  "min-h-tap w-full rounded-xl border border-neutral-300 bg-transparent px-4 dark:border-neutral-700";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-tap w-full cursor-pointer rounded-xl bg-cta font-semibold text-cta-fg transition hover:brightness-110 disabled:opacity-50"
    >
      {pending ? "Connexion…" : "Se connecter"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState<AuthState, FormData>(login, undefined);
  return (
    <form action={formAction} className="mx-auto flex max-w-sm flex-col gap-3 p-4">
      <h1 className="text-2xl font-bold">Connexion</h1>
      <label className="text-sm font-medium" htmlFor="email">
        Email
      </label>
      <input id="email" name="email" type="email" autoComplete="email" required className={inputCls} />
      <label className="text-sm font-medium" htmlFor="password">
        Mot de passe
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        className={inputCls}
      />
      <Link href="/mot-de-passe-oublie" className="self-end text-sm text-neutral-500 hover:text-accent">
        Mot de passe oublié ?
      </Link>
      {state?.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      <SubmitButton />
      <p className="text-center text-sm text-neutral-500">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-medium text-accent">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}
