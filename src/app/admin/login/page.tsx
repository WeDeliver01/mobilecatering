import { loginAdminAction } from "./actions";

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const next = searchParams?.next ?? "/admin";
  const error = searchParams?.error;

  return (
    <div className="max-w-md mx-auto w-full px-container-padding py-stack-lg">
      <div className="bg-surface-container-lowest rounded-xl custom-shadow p-8 space-y-6">
        <div>
          <p className="font-label-md text-primary uppercase tracking-widest text-xs">Restricted</p>
          <h1 className="font-headline-lg text-headline-lg">Admin sign in</h1>
          <p className="text-on-surface-variant">Enter the admin password to continue.</p>
        </div>

        {error === "config" && (
          <p className="text-red-600 font-label-md text-sm">
            Admin login is not configured on this server (missing ADMIN_PASSWORD / SESSION_SECRET).
          </p>
        )}
        {error === "invalid" && (
          <p className="text-red-600 font-label-md text-sm">Incorrect password.</p>
        )}

        <form action={loginAdminAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="password" className="block font-label-md text-label-md mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              className="w-full rounded border border-outline-variant px-3 py-2 bg-background"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-white px-4 py-2 rounded font-label-md text-label-md hover:bg-primary-container transition-all"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
