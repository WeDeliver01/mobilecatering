"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";

function safeNext(next: string): string {
  return next.startsWith("/admin") ? next : "/admin";
}

export async function loginAdminAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/admin"));
  const expected = process.env.ADMIN_PASSWORD;
  const secret = process.env.SESSION_SECRET;

  if (!expected || !secret) {
    redirect(`/admin/login?error=config&next=${encodeURIComponent(next)}`);
  }
  if (password !== expected) {
    redirect(`/admin/login?error=invalid&next=${encodeURIComponent(next)}`);
  }

  const token = await createSessionToken(secret);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  redirect(next);
}

export async function logoutAdminAction() {
  cookies().set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  redirect("/admin/login");
}
