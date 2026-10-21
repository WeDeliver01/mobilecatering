import { logoutAdminAction } from "@/app/admin/login/actions";

export function AdminLogoutButton() {
  return (
    <form action={logoutAdminAction}>
      <button
        type="submit"
        className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
      >
        Log out
      </button>
    </form>
  );
}
