import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "NetPulse NOC — Network Monitoring & Performance Analysis System",
  description:
    "CCS 234 Final Project: Python FastAPI + Next.js 16 Real-Time Network Discovery, Connectivity Testing, Wireshark Packet Analysis, and Security Advisor.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full bg-[#090D16] text-slate-100">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
