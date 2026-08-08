import { useState, type FormEvent } from 'react';

type LoginPageProps = {
  error?: string;
  onSignIn: (email: string, password: string) => Promise<void>;
};

type LoginErrors = {
  email?: string;
  password?: string;
};

export function LoginPage({ error, onSignIn }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: LoginErrors = {
      email: email.trim() ? undefined : 'Email is required.',
      password: password ? undefined : 'Password is required.',
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;

    setIsSubmitting(true);
    try {
      await onSignIn(email.trim(), password);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
      <section
        aria-labelledby="login-title"
        className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="border-b border-slate-200 pb-5">
          <p className="text-sm font-semibold text-teal-700">QA Test Management</p>
          <h1 id="login-title" className="mt-1 text-3xl font-semibold text-slate-950">
            Sign in to TestNest
          </h1>
        </div>

        <form className="mt-6 space-y-5" noValidate onSubmit={handleSubmit}>
          {error ? (
            <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              {error}
            </p>
          ) : null}

          <div>
            <label htmlFor="login-email" className="text-sm font-medium text-slate-800">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              aria-invalid={Boolean(errors.email)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            {errors.email ? <p id="login-email-error" className="mt-1 text-sm text-rose-700">{errors.email}</p> : null}
          </div>

          <div>
            <label htmlFor="login-password" className="text-sm font-medium text-slate-800">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              aria-invalid={Boolean(errors.password)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {errors.password ? <p id="login-password-error" className="mt-1 text-sm text-rose-700">{errors.password}</p> : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </section>
    </main>
  );
}
