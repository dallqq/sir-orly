"use client";

import { SegmentedPillControl } from "@/components/ui/HyperComponents";
import { EmailAlertLog, netpulseApi } from "@/lib/api";
import { useNetPulseStore } from "@/store/useNetPulseStore";
import React, { useEffect, useState } from "react";

const CATEGORIES = [
  { id: "ALL", label: "All Categories" },
  { id: "CONNECTIVITY", label: "1. Weak Connectivity" },
  { id: "AVAILABILITY", label: "2. Unreachable Hosts" },
  { id: "FIREWALL", label: "3. Firewall Rules" },
  { id: "AUTHENTICATION", label: "4. Password Security" },
] as const;

export default function SecurityAdvisorPage() {
  const {
    securityScore,
    securityGrade,
    securityAlerts,
    health,
    refreshAllNetworkData,
    postStatusNotice,
  } = useNetPulseStore();

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string>("");

  // Bonus Feature 4: Email Alert Notification & Local Outbox state
  const [recipientEmail, setRecipientEmail] = useState<string>("");
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
      .then((res) => {
        if (res.outbox.length > 0) setOutbox(res.outbox);
      })
      .catch(() => { });
  }, []);

  const handleReEvaluate = async () => {
    setEvaluating(true);
    try {
      await netpulseApi.evaluateSecurity();
      await refreshAllNetworkData();
      postStatusNotice(
        "success",
        "Security Rules Re-Evaluated",
        "Audited all discovered hosts, QoS thresholds, and open socket ports."
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to evaluate security rules.";
      postStatusNotice("error", "Security Evaluation Failed", msg);
    } finally {
      setEvaluating(false);
    }
  };

  const handleSendAlertEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail.trim()) {
      postStatusNotice("info", "No Recipient Email", "Please enter a recipient email address.");
      return;
    }
    setSendingEmail(true);
    setEmailStatus("Dispatching alert email and archiving in Outbox...");
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
      postStatusNotice("success", "Alert Email Dispatched", res.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to dispatch alert email.";
      setEmailStatus(msg);
      postStatusNotice("error", "Email Dispatch Failed", msg);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSwitchDatabase = async () => {
    try {
      const res = await netpulseApi.setDatabaseMode(
        dbMode,
        cloudUrl || undefined
      );
      setDbMessage(res.message);
      await refreshAllNetworkData();
      postStatusNotice("success", "Database Mode Updated", res.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to switch database mode.";
      setDbMessage(msg);
    }
  };

  const activeAlerts = securityAlerts;

  const filteredAlerts =
    selectedCategory === "ALL"
      ? activeAlerts
      : activeAlerts.filter((a) => a.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Feature 5 Security Posture Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[11px] font-typewriter font-medium uppercase tracking-wider mb-2">
            <span>FEATURE 5 + BONUS FEATURES 4 &amp; 8 · SECURITY ADVISOR</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-semibold text-slate-900 tracking-tight leading-tight">
            Automated Network Security Recommendations &amp; Alert Center
          </h1>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Deterministic audit of Weak Connectivity Alerts, Unreachable Hosts, Basic Firewall Rules &amp; Password Reminders
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 text-right">
            <div className="text-[10px] font-heading font-medium text-slate-400 uppercase tracking-wider">
              Posture Score
            </div>
            <div className="text-2xl font-semibold text-blue-600 font-typewriter">
              {securityScore > 0 ? (
                <>
                  {securityScore}/100{" "}
                  <span className="text-emerald-600 font-typewriter font-medium text-base">
                    (Grade {securityGrade})
                  </span>
                </>
              ) : (
                "--/100 (Grade --)"
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={evaluating}
            onClick={handleReEvaluate}
            className="px-5 py-3 rounded-full hyper-hero-gradient hover:brightness-105 disabled:opacity-50 text-white font-heading font-semibold text-xs tracking-wide transition-all duration-200 ease-out cursor-pointer"
          >
            {evaluating ? "Evaluating..." : "Re-Evaluate Rules"}
          </button>
        </div>
      </div>

      {/* Category Filter Pill Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedPillControl
          size="sm"
          options={CATEGORIES.map((cat) => ({
            id: cat.id,
            label: cat.label,
            count:
              cat.id === "ALL"
                ? activeAlerts.length
                : activeAlerts.filter((a) => a.category === cat.id).length,
          }))}
          value={selectedCategory}
          onChange={(v) => setSelectedCategory(v)}
        />
      </div>

      {/* Categorized Security Recommendation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredAlerts.length === 0 ? (
          <div className="col-span-1 md:col-span-2 bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-2">
            <div className="text-base font-extrabold text-slate-900">
              No Security Advisories Recorded
            </div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Audited security rules across Connectivity, Availability, Firewall, and Authentication. Click &ldquo;Re-Evaluate Rules&rdquo; after scanning the LAN to generate insights.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert, idx) => {
            const key = `${alert.category}-${alert.target_ip}-${idx}`;
            const sevBadge =
              alert.severity === "CRITICAL"
                ? "bg-rose-50 text-rose-600 border-rose-200"
                : alert.severity === "HIGH"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : alert.severity === "MEDIUM"
                    ? "bg-blue-50 text-blue-600 border-blue-200"
                    : "bg-emerald-50 text-emerald-600 border-emerald-200";

            return (
              <div
                key={key}
                className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 font-mono text-xs">
                    <span
                      className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${sevBadge}`}
                    >
                      {alert.severity} · {alert.category}
                    </span>
                    <span className="font-bold text-blue-600">
                      {alert.target_ip || "--"}{alert.hostname ? ` (${alert.hostname})` : ""}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900">
                    {alert.title || "--"}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {alert.description || "--"}
                  </p>

                  <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-1">
                    <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                      Recommended Remediation
                    </div>
                    <p className="text-xs text-slate-700 whitespace-pre-line">
                      {alert.recommendation || "--"}
                    </p>
                  </div>
                </div>

                {alert.remediation_command && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <code className="text-[11px] font-mono text-slate-800 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/80 truncate flex-1">
                      {alert.remediation_command}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          navigator.clipboard?.writeText(
                            alert.remediation_command
                          );
                        } catch {
                          // ignore
                        }
                        setCopiedId(key);
                        setTimeout(() => setCopiedId(""), 1800);
                      }}
                      className="px-3.5 py-1.5 rounded-full bg-[#141B2D] hover:bg-slate-800 text-xs font-bold text-white shrink-0 cursor-pointer inline-flex items-center gap-1.5 transition-colors duration-200"
                    >
                      {copiedId === key ? (
                        <>
                          <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Copied</span>
                        </>
                      ) : (
                        <span>Copy CLI</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Split: Bonus Feature 4 (Email Notification + Local Outbox) & Bonus Feature 8 (Cloud DB Mode) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Email Alert Dispatcher & Outbox Preview (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5">
          <div>
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              BONUS FEATURE 4 — SMTP EMAIL NOTIFICATION &amp; OUTBOX ARCHIVE
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">
              Dispatch Security &amp; Connectivity Alert Email
            </h2>
          </div>

          <form
            onSubmit={handleSendAlertEmail}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs"
          >
            <div>
              <label className="block font-bold text-slate-500 mb-1">
                Recipient Email:
              </label>
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="e.g. admin@organization.com"
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-2xl px-4 py-2.5 font-mono font-bold text-blue-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-500 mb-1">
                Alert Subject:
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-2xl px-4 py-2.5 font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-500 mb-1">
                Optional SMTP Server &amp; Port:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="flex-1 bg-[#F8FAFC] border border-slate-200 rounded-2xl px-4 py-2 font-mono text-slate-700"
                />
                <input
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  className="w-20 bg-[#F8FAFC] border border-slate-200 rounded-2xl px-3 py-2 font-mono text-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-500 mb-1">
                Optional SMTP User / App Password:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="Optional SMTP User"
                  className="flex-1 bg-[#F8FAFC] border border-slate-200 rounded-2xl px-3.5 py-2 font-mono text-slate-700"
                />
                <input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder="App Password"
                  className="flex-1 bg-[#F8FAFC] border border-slate-200 rounded-2xl px-3.5 py-2 font-mono text-slate-700"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-500 mb-1">
                Operator Note:
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-700"
              />
            </div>

            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="submit"
                disabled={sendingEmail}
                className="px-6 py-3 rounded-full hyper-hero-gradient hover:brightness-105 text-white font-bold transition-all duration-200 ease-out cursor-pointer"
              >
                {sendingEmail
                  ? "Sending Alert..."
                  : "Dispatch Security & Connectivity Email"}
              </button>
              {emailStatus && (
                <span className="font-mono text-emerald-600 font-bold text-xs">
                  {emailStatus}
                </span>
              )}
            </div>
          </form>

          {/* Local Outbox Preview Table */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="text-xs font-extrabold text-slate-700">
              Dispatched Email Alert Outbox ({outbox.length} messages)
            </div>
            <div className="space-y-2.5 max-h-52 overflow-y-auto">
              {outbox.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No dispatched or archived email alerts in outbox.
                </div>
              ) : (
                outbox.map((mail) => (
                  <div
                    key={mail.id}
                    className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 text-xs space-y-1"
                  >
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-blue-600 font-bold">
                        To: {mail.recipient_email}
                      </span>
                      <span className="text-emerald-600 font-bold">
                        {mail.delivery_mode}
                      </span>
                    </div>
                    <div className="text-slate-900 font-bold">{mail.subject}</div>
                    <pre className="text-[11px] text-slate-500 whitespace-pre-wrap font-mono">
                      {mail.body_preview}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bonus Feature 8: Hybrid Local SQLite WAL + Cloud PostgreSQL Storage Manager (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4">
          <div>
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              BONUS FEATURE 8 — CLOUD DATABASE
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">
              Hybrid SQLModel Persistence
            </h2>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Active Engine:</span>
              <span className="text-emerald-600 font-bold">
                {health?.database?.provider || "Local SQLite WAL"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Connection:</span>
              <span className="text-blue-600 font-bold truncate max-w-[180px]">
                {health?.database?.database_url_masked ||
                  "sqlite:///./netpulse.db"}
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-500 mb-1">
                Database Mode:
              </label>
              <select
                aria-label="Database Mode"
                value={dbMode}
                onChange={(e) => setDbMode(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-2xl px-3.5 py-2.5 font-bold text-slate-800"
              >
                <option value="SQLITE_LOCAL">
                  Local SQLite WAL (100% Offline Ready)
                </option>
                <option value="CLOUD_POSTGRESQL">
                  Cloud PostgreSQL (Supabase / Neon)
                </option>
              </select>
            </div>

            {dbMode === "CLOUD_POSTGRESQL" && (
              <div>
                <label className="block font-bold text-slate-500 mb-1">
                  PostgreSQL Connection URI (DATABASE_URL):
                </label>
                <input
                  type="text"
                  value={cloudUrl}
                  onChange={(e) => setCloudUrl(e.target.value)}
                  placeholder="postgresql://user:pass@ep-xyz.neon.tech/neondb"
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-2xl px-3.5 py-2.5 font-mono text-blue-600"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleSwitchDatabase}
              className="w-full py-3 rounded-full bg-[#141B2D] hover:bg-slate-800 text-white font-bold cursor-pointer transition-colors duration-200"
            >
              Test &amp; Apply Storage Mode
            </button>

            {dbMessage && (
              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-[11px] font-medium text-blue-900">
                {dbMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
