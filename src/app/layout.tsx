import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "HyperPulse NOC — Network Monitoring & Performance Analysis System",
  description:
    "CCS 234 Final Project: Python FastAPI + Next.js 16 Real-Time Network Discovery, Speed & Ping Diagnostics, Wireshark Packet Analysis, and Security Advisor.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full bg-[#F3F6FB] text-slate-900 selection:bg-blue-600 selection:text-white font-sans antialiased overflow-hidden">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
