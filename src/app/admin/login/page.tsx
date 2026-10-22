import { loginAdminAction } from "./actions";

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const next = searchParams?.next ?? "/admin";
  const error = searchParams?.error;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-container-padding py-stack-lg">
      <div className="w-full max-w-sm bg-surface-container-lowest rounded-xl border border-outline-variant p-8 space-y-6">
        <div className="flex flex-col gap-2 items-start">
          <span className="w-8 h-8 rounded-lg bg-primary text-on-primary grid place-items-center text-sm font-extrabold">M</span>
          <p className="font-label-md text-on-surface-variant uppercase tracking-widest text-xs mt-1">Restricted</p>
          <h1 className="font-headline-lg text-headline-lg">Admin sign in</h1>
          <p className="text-on-surface-variant text-sm">Enter the admin password to continue.</p>
        </div>

        {error === "config" && (
          <p className="text-error font-label-md text-sm">
            Admin login is not configured on this server (missing ADMIN_PASSWORD / SESSION_SECRET).
          </p>
        )}
        {error === "invalid" && (
          <p className="text-error font-label-md text-sm">Incorrect password.</p>
        )}

        <form action={loginAdminAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div className="space-y-1.5">
            <label htmlFor="password" className="block font-label-md text-label-md text-on-surface-variant">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              className="w-full rounded-lg border border-outline px-3 py-3 bg-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-on-primary px-4 py-3 rounded-lg font-bold text-sm hover:opacity-90 transition-all"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
