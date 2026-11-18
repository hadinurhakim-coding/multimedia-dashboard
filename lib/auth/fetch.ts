"use client";
export async function appFetch(input: string, options?: RequestInit) {
  const response = await fetch(input, { ...options, cache: "no-store" });
  if (response.status === 401) window.dispatchEvent(new Event("app-session-expired"));
  return response;
}
