import { Suspense } from "react";
import { connection } from "next/server";
import { currentPageUser } from "@/lib/auth/access";
import { AppError } from "@/lib/security/http";
import { LoginForm } from "@/components/auth/login-form";
import { SessionBoundary } from "@/components/auth/session-boundary";
import DashboardShell from "@/components/dashboard-shell";

async function Workspace() {
  await connection();
  let user;
  try { user = await currentPageUser(); }
  catch (error) { return <LoginForm initialMessage={error instanceof AppError && error.status !== 401 ? error.message : ""} />; }
  const profile = { id: user.id, name: user.name || "Pengguna", email: user.email };
  return <SessionBoundary key={user.id} user={profile}><DashboardShell /></SessionBoundary>;
}
export default function Page() {
  return <Suspense fallback={<main className="flex min-h-svh items-center justify-center bg-pln-ice text-sm text-pln-navy" role="status">Memeriksa sesi…</main>}><Workspace /></Suspense>;
}
