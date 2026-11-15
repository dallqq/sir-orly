"use client";

import { EmailAlertLog, netpulseApi } from "@/lib/api";
import { useNetPulseStore } from "@/store/useNetPulseStore";
import React, { useEffect, useState } from "react";

const CATEGORIES = [
  { id: "ALL", label: "All Categories" },
  { id: "CONNECTIVITY", label: "1. Weak Connectivity Alerts" },
  { id: "AVAILABILITY", label: "2. Unreachable Hosts" },
  { id: "FIREWALL", label: "3. Basic Firewall Recommendations" },
  { id: "AUTHENTICATION", label: "4. Password Security Reminders" },
] as const;

export default function SecurityAdvisorPage() {
  const {
    securityScore,
    securityGrade,
    securityAlerts,
    health,
    refreshAllNetworkData,
  } = useNetPulseStore();

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string>("");

  // Bonus Feature 4: Email Alert Notification & Local Outbox state
  const [recipientEmail, setRecipientEmail] = useState<string>("instructor@wvsu.edu.ph");
  const [emailSubject, setEmailSubject] = useState<string>(
    "[NetPulse NOC Alert] Subnet Security & QoS Diagnostic Summary"
  );
  const [customNote, setCustomNote] = useState<string>(
    "Automated security & connectivity report dispatched from NetPulse NOC."
  );
  const [smtpHost, setSmtpHost] = useState<string>("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState<number>(587);
  const [smtpUser, setSmtpUser] = useState<string>("");
  const [smtpPass, setSmtpPass] = useState<string>("");
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);
  const [emailStatus, setEmailStatus] = useState<string>("");
  const [outbox, setOutbox] = useState<EmailAlertLog[]>([]);

  // Bonus Feature 8: Cloud Database Mode state
  const [dbMode, setDbMode] = useState<string>("SQLITE_LOCAL");
  const [cloudUrl, setCloudUrl] = useState<string>("");
  const [dbMessage, setDbMessage] = useState<string>("");

  useEffect(() => {
    netpulseApi
      .getEmailOutbox()
      .then((res) => setOutbox(res.outbox))
      .catch(() => {});
  }, []);

  const handleReEvaluate = async () => {
    setEvaluating(true);
    try {
      await netpulseApi.evaluateSecurity();
      await refreshAllNetworkData();
    } finally {
      setEvaluating(false);
    }
  };

  const handleSendAlertEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingEmail(true);
    setEmailStatus("Dispatching alert email and archiving in Local Outbox...");
    try {
      const res = await netpulseApi.sendAlertEmail({
        recipient_email: recipientEmail,
        subject: emailSubject,
        custom_message: customNote,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_username: smtpUser || undefined,
        smtp_password: smtpPass || undefined,
      });
      setEmailStatus(res.message);
      const outRes = await netpulseApi.getEmailOutbox();
      setOutbox(outRes.outbox);
    } catch (err) {
      setEmailStatus(`Error: ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSwitchDatabase = async () => {
    try {
      const res = await netpulseApi.setDatabaseMode(dbMode, cloudUrl || undefined);
      setDbMessage(res.message);
      await refreshAllNetworkData();
    } catch (err) {
      setDbMessage(`Database error: ${err instanceof Error ? err.message : "Failed"}`);
    }
  };

  const filteredAlerts =
    selectedCategory === "ALL"
      ? securityAlerts
      : securityAlerts.filter((a) => a.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Feature 5 Security Posture Banner */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
            FEATURE 5 + BONUS FEATURES 4 &amp; 8 — SECURITY ADVISOR, EMAIL ALERTS &amp; HYBRID CLOUD DB
          </div>
          <h1 className="text-xl font-bold text-white mt-0.5">
            Automated Network Security Recommendations &amp; Alert Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Evaluates Weak Connectivity Alerts, Unreachable Hosts, Basic Firewall Rules, and Password Security Reminders.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-right font-mono">
            <div className="text-[10px] text-slate-400">POSTURE SCORE</div>
            <div className="text-xl font-bold text-cyan-400">
              {securityScore}/100{" "}
              <span className="text-emerald-400">(Grade {securityGrade})</span>
            </div>
          </div>

          <button
            type="button"
            disabled={evaluating}
            onClick={handleReEvaluate}
            className="px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs font-mono cursor-pointer"
          >
            {evaluating ? "Evaluating..." : "🛡️ Re-Evaluate Rules"}
          </button>
        </div>
      </div>

      {/* Category Filter Tabs (All 4 Required PDF Categories) */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const count =
            cat.id === "ALL"
              ? securityAlerts.length
              : securityAlerts.filter((a) => a.category === cat.id).length;
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-mono transition cursor-pointer ${
                active
                  ? "bg-cyan-500 text-slate-950 font-bold"
                  : "bg-[#0F172A] text-slate-300 hover:bg-slate-800 border border-slate-800"
              }`}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Categorized Security Recommendation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAlerts.map((alert, idx) => {
          const key = `${alert.category}-${alert.target_ip}-${idx}`;
          const sevBadge =
            alert.severity === "CRITICAL"
              ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
              : alert.severity === "HIGH"
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
              : alert.severity === "MEDIUM"
              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";

          return (
            <div
              key={key}
              className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 font-mono text-xs">
                  <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${sevBadge}`}>
                    {alert.severity} · {alert.category}
                  </span>
                  <span className="text-cyan-300">
                    Target: {alert.target_ip} ({alert.hostname})
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white">{alert.title}</h3>
                <p className="text-xs text-slate-400">{alert.description}</p>

                <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800/90 space-y-1">
                  <div className="text-[11px] font-mono text-emerald-400 font-semibold">
                    Recommended Remediation:
                  </div>
                  <p className="text-xs text-slate-200 whitespace-pre-line">
                    {alert.recommendation}
                  </p>
                </div>
              </div>

              {alert.remediation_command && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <code className="text-[11px] font-mono text-amber-300 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 truncate flex-1">
                    {alert.remediation_command}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(alert.remediation_command);
                      setCopiedId(key);
                      setTimeout(() => setCopiedId(""), 1800);
                    }}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 shrink-0 cursor-pointer"
                  >
                    {copiedId === key ? "✓ Copied" : "Copy CLI"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Split: Bonus Feature 4 (Email Notification + Local Outbox) & Bonus Feature 8 (Cloud DB Mode) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Email Alert Dispatcher & Outbox Preview */}
        <div className="lg:col-span-2 bg-[#0F172A] border border-slate-800 rounded-xl p-5 space-y-4">
          <div>
            <div className="text-xs font-mono text-cyan-400 uppercase">
              BONUS FEATURE 4 — SMTP EMAIL NOTIFICATION &amp; OFFLINE OUTBOX PREVIEW
            </div>
            <h2 className="text-base font-bold text-white mt-0.5">
              Dispatch Security &amp; Connectivity Alert Email
            </h2>
          </div>

          <form onSubmit={handleSendAlertEmail} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-mono text-slate-400 mb-1">Recipient Email:</label>
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-cyan-300"
              />
            </div>

            <div>
              <label className="block font-mono text-slate-400 mb-1">Alert Subject:</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-white"
              />
            </div>

            <div>
              <label className="block font-mono text-slate-400 mb-1">
                Optional SMTP Server &amp; Port:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-200"
                />
                <input
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 font-mono text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-slate-400 mb-1">
                Optional SMTP User / App Password:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="Optional SMTP User"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-200"
                />
                <input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder="App Password"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-200"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-mono text-slate-400 mb-1">Operator Note:</label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-200"
              />
            </div>

            <div className="sm:col-span-2 flex items-center justify-between gap-3">
              <button
                type="submit"
                disabled={sendingEmail}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono cursor-pointer"
              >
                {sendingEmail ? "Sending Alert..." : "✉️ Send Security & Connectivity Alert Email"}
              </button>
              {emailStatus && (
                <span className="font-mono text-emerald-400 text-xs">{emailStatus}</span>
              )}
            </div>
          </form>

          {/* Local Outbox Preview Table */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="text-xs font-mono text-slate-300 font-bold">
              Sent &amp; Simulated Alert Outbox ({outbox.length} messages)
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {outbox.map((mail) => (
                <div
                  key={mail.id}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono space-y-1"
                >
                  <div className="flex justify-between text-[11px]">
                    <span className="text-cyan-300 font-bold">To: {mail.recipient_email}</span>
                    <span className="text-emerald-400">{mail.delivery_mode}</span>
                  </div>
                  <div className="text-white font-semibold">{mail.subject}</div>
                  <pre className="text-[11px] text-slate-400 whitespace-pre-wrap font-mono">
                    {mail.body_preview}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bonus Feature 8: Hybrid Local SQLite WAL + Cloud PostgreSQL Storage Manager */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 space-y-4">
          <div>
            <div className="text-xs font-mono text-cyan-400 uppercase">
              BONUS FEATURE 8 — CLOUD DATABASE STORAGE
            </div>
            <h2 className="text-base font-bold text-white mt-0.5">
              Hybrid SQLModel Persistence Engine
            </h2>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Active Engine:</span>
              <span className="text-emerald-400 font-bold">
                {health?.database?.provider || "Local SQLite WAL (netpulse.db)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Connection:</span>
              <span className="text-cyan-300">
                {health?.database?.database_url_masked || "sqlite:///./netpulse.db"}
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div>
              <label className="block text-slate-400 mb-1">Database Mode:</label>
              <select
                aria-label="Database Mode"
                value={dbMode}
                onChange={(e) => setDbMode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="SQLITE_LOCAL">Local SQLite WAL (100% Offline Ready)</option>
                <option value="CLOUD_POSTGRESQL">Cloud PostgreSQL (Supabase / Neon)</option>
              </select>
            </div>

            {dbMode === "CLOUD_POSTGRESQL" && (
              <div>
                <label className="block text-slate-400 mb-1">
                  PostgreSQL Connection URI (DATABASE_URL):
                </label>
                <input
                  type="text"
                  value={cloudUrl}
                  onChange={(e) => setCloudUrl(e.target.value)}
                  placeholder="postgresql://user:pass@ep-xyz.neon.tech/neondb"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleSwitchDatabase}
              className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 text-cyan-300 font-bold cursor-pointer"
            >
              🔄 Test &amp; Apply Database Storage Mode
            </button>

            {dbMessage && (
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                {dbMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

