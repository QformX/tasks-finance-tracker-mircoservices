import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { getSessions, revokeSession, revokeAllSessionsExceptCurrent } from "@/lib/api";
import type { UserSession } from "@/types";
import { useLanguage } from "@/context/LanguageContext";

export function Profile() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (error) {
      console.error("Failed to load sessions", error);
    } finally {
      setLoadingSessions(false);
    }
  }

  async function handleRevokeSession(sessionId: string) {
    if (!confirm("Are you sure you want to revoke this session?")) return;
    try {
      await revokeSession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error("Failed to revoke session", error);
    }
  }

  async function handleRevokeAll() {
    if (!confirm("Are you sure you want to sign out all other devices?")) return;
    try {
      await revokeAllSessionsExceptCurrent();
      setSessions(sessions.filter(s => s.is_current));
    } catch (error) {
      console.error("Failed to revoke all sessions", error);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto w-full bg-background-dark">
      <div className="max-w-4xl mx-auto p-6 md:p-10 lg:p-12 pb-24">
        <header className="mb-10">
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">{t("profile")}</h1>
          <p className="text-text-secondary">{t("profile_desc")}</p>
        </header>

        <div className="space-y-8">
          {/* Personal Information */}
          <section className="bg-surface-dark border border-white/5 rounded-3xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-white mb-8">{t("personal_info")}</h2>
            <div className="flex flex-col md:flex-row gap-8">
              <div className="shrink-0 flex flex-col items-center md:items-start gap-4">
                <div className="relative group size-32">
                  <div className="w-full h-full rounded-full bg-cover bg-center border-4 border-surface-highlight bg-gray-700 flex items-center justify-center text-4xl font-bold text-white">
                    {user?.username?.substring(0, 2).toUpperCase() || "ME"}
                  </div>
                  <button className="absolute bottom-0 right-0 bg-white text-black p-2 rounded-full hover:bg-gray-200 transition-colors shadow-lg">
                    <span className="material-symbols-outlined text-[18px] block">edit</span>
                  </button>
                </div>
                <span className="text-xs font-semibold text-text-secondary">{t("allowed_formats")}</span>
              </div>
              <div className="flex-1 space-y-5 w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{t("display_name")}</label>
                    <input 
                      className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-gray-600" 
                      type="text" 
                      defaultValue={user?.username || ""}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{t("username")}</label>
                    <input 
                      className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-gray-600" 
                      type="text" 
                      defaultValue={user?.username || ""}
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{t("email_address")}</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-text-secondary material-symbols-outlined text-[20px]">mail</span>
                      <input 
                        className="w-full bg-background-dark border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-gray-600" 
                        type="email" 
                        defaultValue={user?.email || ""}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{t("bio")}</label>
                    <textarea 
                      className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none placeholder:text-gray-600" 
                      rows={3}
                      defaultValue="Product Manager based in San Francisco. Love building things."
                    ></textarea>
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <button className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors shadow-lg shadow-white/5 text-sm">{t("save_changes")}</button>
                </div>
              </div>
            </div>
          </section>

          {/* Active Sessions */}
          <section className="bg-surface-dark border border-white/5 rounded-3xl overflow-hidden">
            <div className="p-6 md:p-8 border-b border-white/5 flex flex-wrap gap-4 justify-between items-center bg-white/[0.02]">
              <div>
                <h2 className="text-xl font-bold text-white">{t("active_sessions")}</h2>
                <p className="text-text-secondary text-sm mt-1">{t("active_sessions_desc")}</p>
              </div>
              <button 
                onClick={handleRevokeAll}
                className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors border border-red-900/30 bg-red-900/10 px-4 py-2 rounded-lg"
              >
                {t("sign_out_all")}
              </button>
            </div>
            <div className="divide-y divide-white/5">
              {loadingSessions ? (
                <div className="p-6 text-center text-text-secondary text-sm">{t("loading_sessions")}</div>
              ) : sessions.length === 0 ? (
                <div className="p-6 text-center text-text-secondary text-sm">{t("no_sessions")}</div>
              ) : (
                sessions.map(session => (
                  <div key={session.id} className="p-6 flex items-center gap-4 hover:bg-white/[0.02] transition-colors group">
                    <div className="size-12 rounded-2xl bg-background-dark border border-white/10 flex items-center justify-center shrink-0 group-hover:border-white/20 transition-colors">
                      <span className="material-symbols-outlined text-text-secondary">
                        {session.user_agent?.toLowerCase().includes("mobile") ? "smartphone" : "desktop_windows"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-sm">
                          {session.user_agent ? (session.user_agent.length > 30 ? session.user_agent.substring(0, 30) + "..." : session.user_agent) : t("unknown_device")}
                        </span>
                        {session.is_current && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-green-500/10 text-green-400 border border-green-500/20 tracking-wide">{t("current_session").toUpperCase()}</span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary truncate">
                        {session.ip_address || t("unknown_ip")} • {t("active_date")} {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {!session.is_current && (
                      <button 
                        onClick={() => handleRevokeSession(session.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-white rounded-lg border border-transparent hover:border-white/10 hover:bg-background-dark transition-all"
                      >
                        {t("revoke")}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Preferences */}
          <section className="bg-surface-dark border border-white/5 rounded-3xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-white mb-8">{t("preferences")}</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="pr-8">
                  <p className="text-sm font-bold text-white">{t("email_notifications")}</p>
                  <p className="text-xs text-text-secondary mt-1">{t("email_notifications_desc")}</p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors focus:outline-none">
                  <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition-transform"></span>
                </button>
              </div>
              <div className="h-px bg-white/5 w-full"></div>
              <div className="flex items-center justify-between">
                <div className="pr-8">
                  <p className="text-sm font-bold text-white">{t("desktop_push")}</p>
                  <p className="text-xs text-text-secondary mt-1">{t("desktop_push_desc")}</p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-white/10 transition-colors focus:outline-none">
                  <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition-transform"></span>
                </button>
              </div>
              <div className="h-px bg-white/5 w-full"></div>
              <div className="flex items-center justify-between">
                <div className="pr-8">
                  <p className="text-sm font-bold text-white">{t("theme_sync")}</p>
                  <p className="text-xs text-text-secondary mt-1">{t("theme_sync_desc")}</p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors focus:outline-none">
                  <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition-transform"></span>
                </button>
              </div>
            </div>
          </section>

          {/* Delete Account */}
          <section className="rounded-3xl p-6 md:p-8 border border-red-500/20 bg-gradient-to-br from-red-950/10 to-transparent relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-xl font-bold text-red-500 mb-2">{t("delete_account")}</h2>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <p className="text-text-secondary text-sm max-w-xl leading-relaxed">
                  {t("delete_account_desc")}
                </p>
                <button className="bg-transparent border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white font-bold py-2.5 px-5 rounded-xl transition-all text-sm whitespace-nowrap shadow-sm">
                  {t("delete_account_btn")}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
