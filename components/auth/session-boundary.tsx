"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { LoginForm } from "./login-form";

export type PublicUser = { id: string; email: string; name: string };
const UserContext = createContext<PublicUser | null>(null);
export function useAppUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error("Application session is missing.");
  return user;
}
export function SessionBoundary({ user, children }: { user: PublicUser; children: ReactNode }) {
  const [failure, setFailure] = useState("");
  useEffect(() => {
    let live = true, pending = false, lastCheck = 0;
    const controller = new AbortController();
    const expire = () => setFailure("Sesi berakhir. Silakan masuk kembali.");
    const check = async () => {
      if (pending || document.visibilityState === "hidden" || Date.now() - lastCheck < 10_000) return;
      pending = true; lastCheck = Date.now();
      try {
        const response = await fetch("/api/session", { cache: "no-store", signal: controller.signal });
        if (live && [401, 403].includes(response.status)) setFailure((await response.json()).error ?? "Silakan masuk kembali.");
        else if (live && response.ok && (await response.json()).user?.id !== user.id) window.location.reload();
      } catch { /* API guards still deny data access when the network is unavailable. */ }
      finally { pending = false; }
    };
    window.addEventListener("app-session-expired", expire);
    window.addEventListener("focus", check);
    void check();
    const timer = window.setInterval(check, 60_000);
    return () => { live = false; controller.abort(); clearInterval(timer); window.removeEventListener("app-session-expired", expire); window.removeEventListener("focus", check); };
  }, [user.id]);
  return failure ? <LoginForm initialMessage={failure} /> : <UserContext value={user}>{children}</UserContext>;
}
