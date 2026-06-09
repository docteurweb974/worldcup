"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { signup, type AuthState } from "@/app/auth/actions";

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
      {pending ? "Création…" : "Créer mon compte"}
    </button>
  );
}

export function SignupForm() {
  const [state, formAction] = useFormState<AuthState, FormData>(signup, undefined);
  return (
    <form action={formAction} className="mx-auto flex max-w-sm flex-col gap-3 p-4">
      <h1 className="text-2xl font-bold">Créer un compte</h1>
      <label className="text-sm font-medium" htmlFor="username">
        Pseudo <span className="text-neutral-400">(affiché au classement)</span>
      </label>
      <input
        id="username"
        name="username"
        type="text"
        autoComplete="username"
        minLength={2}
        maxLength={24}
        required
        className={inputCls}
      />
      <label className="text-sm font-medium" htmlFor="email">
        Email
      </label>
      <input id="email" name="email" type="email" autoComplete="email" required className={inputCls} />
      <label className="text-sm font-medium" htmlFor="password">
        Mot de passe <span className="text-neutral-400">(6 caractères min.)</span>
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={6}
        required
        className={inputCls}
      />
      {state?.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p role="status" className="text-sm text-green-600 dark:text-green-400">
          {state.message}
        </p>
      )}
      <SubmitButton />
      <p className="text-center text-sm text-neutral-500">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-medium text-accent">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
