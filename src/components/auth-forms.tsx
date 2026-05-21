"use client";

import { useActionState } from "react";
import { loginFormAction, signupFormAction } from "@/lib/auth-actions";

const initialState = { ok: false, message: "" };

export function LoginForm({ next = "/app/overview" }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginFormAction, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="text-sm font-semibold text-neutral-700">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@practice.com"
          required
          className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-4 py-3 text-base outline-none transition placeholder:text-neutral-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-neutral-700">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter password"
          required
          className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-4 py-3 text-base outline-none transition placeholder:text-neutral-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
        />
      </label>
      {state.message ? (
        <p className={`rounded-md px-3 py-2 text-sm font-semibold ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-md bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {pending ? "Verifying..." : "Sign in"}
      </button>
    </form>
  );
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupFormAction, initialState);

  return (
    <form action={formAction} className="mt-6 grid gap-5">
      <label className="block">
        <span className="text-sm font-semibold text-neutral-700">Practice name</span>
        <input name="practiceName" required className="mt-2 w-full rounded-md border border-neutral-300 px-4 py-3 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-neutral-700">Your name</span>
        <input name="contactName" required autoComplete="name" className="mt-2 w-full rounded-md border border-neutral-300 px-4 py-3 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-neutral-700">Work email</span>
        <input name="email" type="email" required autoComplete="email" className="mt-2 w-full rounded-md border border-neutral-300 px-4 py-3 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-neutral-700">Phone</span>
        <input name="phone" type="tel" autoComplete="tel" className="mt-2 w-full rounded-md border border-neutral-300 px-4 py-3 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-neutral-700">Requested role</span>
        <select name="roleRequested" required className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100">
          <option value="owner_dentist">Owner dentist</option>
          <option value="practice_manager">Practice manager</option>
          <option value="front_desk">Front desk</option>
          <option value="billing_rcm">Billing and RCM</option>
          <option value="marketing_growth">Marketing and reputation</option>
        </select>
      </label>
      {state.message ? (
        <p className={`rounded-md px-3 py-2 text-sm font-semibold ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-md bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {pending ? "Submitting..." : "Request access"}
      </button>
    </form>
  );
}
