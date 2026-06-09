"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateUsername } from "@/app/profil/actions";
import type { AuthState } from "@/app/auth/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-tap cursor-pointer rounded-xl bg-cta px-5 font-semibold text-cta-fg transition hover:brightness-110 disabled:opacity-50"
    >
      {pending ? "Enregistrement…" : "Enregistrer"}
    </button>
  );
}

export function UsernameForm({ current }: { current: string }) {
  const [state, action] = useFormState<AuthState, FormData>(updateUsername, undefined);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input
        name="username"
        defaultValue={current}
        minLength={2}
        maxLength={24}
        required
        aria-label="Pseudo"
        className="min-h-tap w-full rounded-xl border border-neutral-300 bg-transparent px-4 dark:border-neutral-700"
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
      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
