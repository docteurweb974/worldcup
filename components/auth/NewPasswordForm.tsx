"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updatePassword, type AuthState } from "@/app/auth/actions";

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
      {pending ? "Enregistrement…" : "Définir le mot de passe"}
    </button>
  );
}

export function NewPasswordForm() {
  const [state, action] = useFormState<AuthState, FormData>(updatePassword, undefined);
  return (
    <form action={action} className="mx-auto flex max-w-sm flex-col gap-3 p-4">
      <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
      <input
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={6}
        required
        placeholder="Nouveau mot de passe (6 caractères min.)"
        className={inputCls}
      />
      {state?.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
