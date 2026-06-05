"use client";

export function LoginForm({ next = "/wrapper", error = false }: { next?: string; error?: boolean }) {
  return (
    <form action="/login" method="post" className="mt-6 space-y-5">
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
      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
          We could not verify that account. Check the email and password, then try again.
        </p>
      ) : null}
      <button
        type="submit"
        className="inline-flex w-full items-center justify-center rounded-md bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        Sign in
      </button>
    </form>
  );
}

export function SignupForm() {
  const signupUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.1dentalai.com"}/api/onboarding/signup`;

  return (
    <form action={signupUrl} method="post" className="mt-6 grid gap-5">
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
        <span className="text-sm font-semibold text-neutral-700">Create password</span>
        <input name="password" type="password" required minLength={12} autoComplete="new-password" className="mt-2 w-full rounded-md border border-neutral-300 px-4 py-3 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
        <span className="mt-1 block text-xs text-neutral-500">Use at least 12 characters. This creates your app login so you can resume onboarding later.</span>
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
      <button
        type="submit"
        className="inline-flex w-full items-center justify-center rounded-md bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        Start onboarding
      </button>
    </form>
  );
}
