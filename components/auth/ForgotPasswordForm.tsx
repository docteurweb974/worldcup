"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { requestPasswordReset, type AuthState } from "@/app/auth/actions";

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
      {pending ? "Envoi…" : "Envoyer le lien"}
    </button>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useFormState<AuthState, FormData>(requestPasswordReset, undefined);
  return (
    <form action={action} className="mx-auto flex max-w-sm flex-col gap-3 p-4">
      <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
      <p className="text-sm text-neutral-500">
        Entre ton email : on t&apos;envoie un lien pour choisir un nouveau mot de passe.
      </p>
      <input name="email" type="email" autoComplete="email" required placeholder="Email" className={inputCls} />
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
        <Link href="/connexion" className="font-medium text-accent">
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}
