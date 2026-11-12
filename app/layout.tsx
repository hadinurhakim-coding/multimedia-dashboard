import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const roboto = Roboto({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PLN Icon Plus — Multimedia Dashboard Studio",
  description: "Enterprise Multimedia & 3D Interactive Dashboard for PLN Icon Plus",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} ${roboto.className} h-full antialiased overflow-x-hidden`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900 font-sans overflow-x-hidden">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
