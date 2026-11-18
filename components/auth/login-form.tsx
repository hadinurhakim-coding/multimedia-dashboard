"use client";
import { useState } from "react";
import Image from "next/image";
import { LockKeyhole, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";

export function LoginForm({ initialMessage = "" }: { initialMessage?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  return <main className="flex min-h-svh items-center justify-center bg-pln-ice px-5 py-10">
    <section className="w-full max-w-md rounded-xl border bg-white p-7 shadow-xs" aria-label="Login aplikasi">
      <div className="mb-8 flex items-center gap-3"><Image src="/images/pln-logo.png" alt="Logo PLN Icon Plus" width={40} height={40} /><div><p className="font-semibold text-pln-charcoal">PLN Icon Plus</p><p className="text-sm text-zinc-500">Multimedia Studio</p></div></div>
      <LockKeyhole className="mb-3 size-6 text-pln-navy" /><h1 className="text-2xl font-semibold text-pln-navy">Masuk ke workspace</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">Gunakan akun internal yang telah mendapat izin untuk mengakses aplikasi.</p>
      <form className="mt-6 space-y-4" onSubmit={async event => {
        event.preventDefault(); if (busy) return; setBusy(true); setMessage("");
        try {
          const result = await authClient.signIn.email({ email: email.trim(), password });
          setPassword("");
          if (result.error) throw new Error(result.error.status === 429 ? "Terlalu banyak percobaan login. Tunggu beberapa menit lalu coba lagi." : "Login gagal. Periksa akun dan kata sandi, atau hubungi administrator.");
          const response = await fetch("/api/session", { cache: "no-store" });
          if (!response.ok) { const body = await response.json(); throw new Error(body.error ?? "Akses belum tersedia."); }
          // Clear the previous account's in-memory workspace and Next router cache.
          window.location.reload();
        } catch (error) { setMessage(error instanceof Error ? error.message : "Login belum tersedia. Coba kembali."); setBusy(false); }
      }}>
        <label className="block space-y-1.5 text-sm font-medium">Email internal<Input type="email" autoComplete="username" required maxLength={254} value={email} disabled={busy} onChange={event => setEmail(event.target.value)} /></label>
        <label className="block space-y-1.5 text-sm font-medium">Kata sandi<Input type="password" autoComplete="current-password" required maxLength={256} value={password} disabled={busy} onChange={event => setPassword(event.target.value)} /></label>
        {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
        <Button type="submit" disabled={busy} className="w-full bg-pln-navy text-white hover:bg-pln-navy/90"><LogIn className="size-4" />{busy ? "Memeriksa akun…" : "Masuk"}</Button>
      </form>
    </section>
  </main>;
}
