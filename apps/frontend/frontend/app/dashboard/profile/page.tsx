"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  User, Shield, Camera, X, MoreHorizontal, Plus,
  Monitor, Smartphone, Loader2, Eye, EyeOff, LogOut
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  provider?: string | null;
}

interface KeycloakSession {
  id:         string;
  ipAddress:  string;
  start:      number;
  lastAccess: number;
  browser?:   string;
  os?:        string;
  userAgent?: string;   // ✅ enrichi par les events LOGIN Keycloak
}

// ─── User-Agent parsers ───────────────────────────────────────────────────────
// Utilisés pour afficher le vrai OS et browser depuis le userAgent

function parseOS(ua: string): string {
  if (!ua) return "Unknown";
  if (/windows nt 10/i.test(ua))      return "Windows 10";
  if (/windows nt 11/i.test(ua))      return "Windows 11";
  if (/windows/i.test(ua))            return "Windows";
  if (/macintosh|mac os x/i.test(ua)) return "macOS";
  if (/android/i.test(ua))            return "Android";
  if (/iphone/i.test(ua))             return "iPhone";
  if (/ipad/i.test(ua))               return "iPad";
  if (/linux/i.test(ua))              return "Linux";
  if (/chromeos/i.test(ua))           return "ChromeOS";
  return "Unknown";
}

function parseBrowser(ua: string): string {
  if (!ua) return "Browser";
  // Ordre important : tester les plus spécifiques d'abord
  if (/opr\/[\d.]+/i.test(ua))        return "Opera";
  if (/edg\/[\d.]+/i.test(ua))        return "Edge";
  if (/yabrowser/i.test(ua))          return "Yandex";
  if (/samsungbrowser/i.test(ua))     return "Samsung Browser";
  if (/chrome\/[\d.]+/i.test(ua))     return "Chrome";
  if (/firefox\/[\d.]+/i.test(ua))    return "Firefox";
  if (/safari\/[\d.]+/i.test(ua))     return "Safari";
  if (/msie|trident/i.test(ua))       return "Internet Explorer";
  return "Browser";
}

function isMobileUA(ua: string): boolean {
  return /android|iphone|ipad|mobile/i.test(ua);
}

function formatDate(ms: number): string {
  const d     = new Date(ms);
  const now   = new Date();
  const diffH = Math.floor((now.getTime() - d.getTime()) / 3600000);
  const diffD = Math.floor((now.getTime() - d.getTime()) / 86400000);
  const time  = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  if (diffH < 1)   return "Just now";
  if (diffH < 24)  return `${diffH}h ago`;
  if (diffD === 1) return `Yesterday at ${time}`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ` at ${time}`;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useProfile() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    if (!session?.accessToken) return;
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${session.accessToken}` } })
      .then(r => r.json()).then(setProfile).catch(console.error)
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

  return { profile, setProfile, loading };
}

function useSaveProfile() {
  const { data: session, update } = useSession();
  const [saving, setSaving] = useState(false);

  const save = async (
    payload: Partial<{ firstName: string; lastName: string; avatarUrl: string | null }>,
    onSuccess: (updated: UserProfile) => void
  ) => {
    if (!session?.accessToken) return;
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? "Erreur sauvegarde");
      const updated: UserProfile = await res.json();
      await update({ user: { firstName: updated.firstName, lastName: updated.lastName, name: `${updated.firstName} ${updated.lastName}`.trim(), image: updated.avatarUrl ?? undefined } });
      onSuccess(updated);
    } catch (err) { alert(err instanceof Error ? err.message : "Erreur inconnue"); }
    finally       { setSaving(false); }
  };

  return { save, saving };
}

function useSessions() {
  const { data: session } = useSession();
  const [sessions, setSessions] = useState<KeycloakSession[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) return;
    fetch("/api/users/me/sessions", { headers: { Authorization: `Bearer ${session.accessToken}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setSessions(Array.isArray(data) ? data : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

  const revokeSession = async (sessionId: string, isCurrent: boolean) => {
    if (!session?.accessToken) return;
    setRevoking(sessionId);
    try {
      await fetch(`/api/users/me/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (isCurrent) { await signOut({ callbackUrl: "/login" }); }
      else           { setSessions(prev => prev.filter(s => s.id !== sessionId)); }
    } catch (err) { console.error(err); }
    finally       { setRevoking(null); }
  };

  return { sessions, loading, revoking, revokeSession };
}

function useChangePassword() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  const changePassword = async (newPassword: string) => {
    if (!session?.accessToken) return;
    setLoading(true); setError(""); setSuccess(false);
    try {
      const res = await fetch("/api/users/me/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) setError((await res.json()).message ?? "Erreur");
      else         setSuccess(true);
    } catch { setError("Erreur réseau"); }
    finally  { setLoading(false); }
  };

  return { changePassword, loading, error, success, setError };
}

// ─── UI Atoms ─────────────────────────────────────────────────────────────────
function Divider() { return <div className="border-t border-zinc-100 my-6" />; }

function AvatarCircle({ src, size = "sm" }: { src?: string | null; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "w-14 h-14" : "w-11 h-11";
  const sz  = size === "lg" ? 22 : 20;
  return (
    <div className={`${cls} rounded-full overflow-hidden bg-zinc-100 border border-zinc-200 shrink-0`}>
      {src
        ? <img src={src} alt="avatar" className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center text-zinc-400"><User size={sz} /></div>}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// ─── Password Form ────────────────────────────────────────────────────────────
function PasswordForm({ onClose }: { onClose: () => void }) {
  const { changePassword, loading, error, success, setError } = useChangePassword();
  const [newPwd,   setNewPwd]   = useState("");
  const [confPwd,  setConfPwd]  = useState("");
  const [showNew,  setShowNew]  = useState(false);
  const [showConf, setShowConf] = useState(false);

  const submit = async () => {
    setError("");
    if (newPwd.length < 8)  { setError("Min 8 characters"); return; }
    if (newPwd !== confPwd) { setError("Passwords don't match"); return; }
    await changePassword(newPwd);
  };

  if (success) return (
    <div className="border border-zinc-200 rounded-xl bg-white p-5 max-w-sm">
      <p className="text-sm font-medium text-emerald-600 mb-3">✅ Password updated successfully</p>
      <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-600">Close</button>
    </div>
  );

  return (
    <div className="border border-zinc-200 rounded-xl bg-white shadow-sm p-5 max-w-sm w-full">
      <p className="text-sm font-semibold text-zinc-800 mb-4">Set new password</p>
      {error && <p className="text-xs text-red-500 mb-3 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{error}</p>}
      <div className="space-y-3 mb-4">
        {[
          { label: "New password",     val: newPwd,  set: setNewPwd,  show: showNew,  toggle: () => setShowNew(v  => !v) },
          { label: "Confirm password", val: confPwd, set: setConfPwd, show: showConf, toggle: () => setShowConf(v => !v) },
        ].map(({ label, val, set, show, toggle }) => (
          <div key={label}>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">{label}</label>
            <div className="relative">
              <input type={show ? "text" : "password"} value={val} onChange={e => set(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
              <button type="button" onClick={toggle} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} disabled={loading} className="text-sm px-4 py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-600 disabled:opacity-50">Cancel</button>
        <button onClick={submit}  disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-900 text-white font-medium flex items-center gap-1.5 disabled:opacity-60">
          {loading && <Loader2 size={13} className="animate-spin" />} Save
        </button>
      </div>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl border border-zinc-200 p-6 w-full max-w-sm mx-4">
        <h4 className="text-base font-semibold text-zinc-900 mb-1">Delete account</h4>
        <p className="text-sm text-zinc-500 mb-5">This action is permanent and cannot be undone. All your data will be lost.</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-600 font-medium">Cancel</button>
          <button className="text-sm px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium">Delete account</button>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab() {
  const { profile, setProfile, loading } = useProfile();
  const { save, saving } = useSaveProfile();
  const [editing,     setEditing]     = useState(false);
  const [tempFirst,   setTempFirst]   = useState("");
  const [tempLast,    setTempLast]    = useState("");
  const [tempAvatar,  setTempAvatar]  = useState<string | null>(null);
  const [emails,      setEmails]      = useState<{ address: string; primary: boolean }[]>([]);
  const [addingEmail, setAddingEmail] = useState(false);
  const [newEmail,    setNewEmail]    = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.email) setEmails([{ address: profile.email, primary: true }]);
  }, [profile]);

  const openEdit = () => { setTempFirst(profile?.firstName ?? ""); setTempLast(profile?.lastName ?? ""); setTempAvatar(profile?.avatarUrl ?? null); setEditing(true); };
  const handleSave = () => save({ firstName: tempFirst, lastName: tempLast, avatarUrl: tempAvatar }, updated => { setProfile(updated); setEditing(false); });
  const addEmail = () => { if (!newEmail.trim()) return; setEmails(prev => [...prev, { address: newEmail.trim(), primary: false }]); setNewEmail(""); setAddingEmail(false); };

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 bg-zinc-100 rounded w-32" /><div className="h-px bg-zinc-100" />
      <div className="flex gap-10"><div className="w-36 h-4 bg-zinc-100 rounded" /><div className="flex items-center gap-4 flex-1"><div className="w-11 h-11 rounded-full bg-zinc-100" /><div className="h-4 bg-zinc-100 rounded w-32" /></div></div>
    </div>
  );

  return (
    <>
      <h3 className="text-base font-semibold text-zinc-900 mb-1">Profile details</h3>
      <div className="border-t border-zinc-100 mt-3 mb-6" />

      <div className="flex gap-10">
        <span className="text-sm text-zinc-500 w-36 shrink-0 pt-1">Profile</span>
        <div className="flex-1">
          {editing ? (
            <div className="border border-zinc-200 rounded-xl bg-white shadow-sm p-5 w-full">
              <p className="text-sm font-semibold text-zinc-800 mb-4">Update profile</p>
              <div className="flex items-start gap-4 mb-5">
                <AvatarCircle src={tempAvatar} size="lg" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <button onClick={() => inputRef.current?.click()} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-medium"><Camera size={13} /> Upload</button>
                    <button onClick={() => setTempAvatar(null)} className="text-sm px-3 py-1.5 rounded-md border border-red-100 hover:bg-red-50 text-red-500 font-medium">Remove</button>
                    <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setTempAvatar(URL.createObjectURL(f)); }} />
                  </div>
                  <p className="text-xs text-zinc-400">Recommended size 1:1, up to 10MB.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[{ label: "First name", val: tempFirst, set: setTempFirst }, { label: "Last name", val: tempLast, set: setTempLast }].map(({ label, val, set }) => (
                  <div key={label}><label className="block text-xs font-medium text-zinc-600 mb-1.5">{label}</label><input value={val} onChange={e => set(e.target.value)} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" /></div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditing(false)} disabled={saving} className="text-sm px-4 py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-600 disabled:opacity-50">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="text-sm px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-800 text-white font-medium flex items-center gap-1.5 disabled:opacity-60">{saving && <Loader2 size={13} className="animate-spin" />}Save</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <AvatarCircle src={profile?.avatarUrl} />
              <span className="text-sm font-medium text-zinc-800 flex-1">{profile?.firstName} {profile?.lastName}</span>
              <button onClick={openEdit} className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">Update profile</button>
            </div>
          )}
        </div>
      </div>

      <Divider />

      <div className="flex gap-10">
        <span className="text-sm text-zinc-500 w-36 shrink-0 pt-0.5">Email addresses</span>
        <div className="flex-1 space-y-2.5">
          {emails.map((e, i) => (
            <div key={i} className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-700">{e.address}</span>
                {e.primary && <span className="text-[11px] bg-zinc-100 text-zinc-500 border border-zinc-200 px-2 py-0.5 rounded-full font-medium">Primary</span>}
              </div>
              <button className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-600"><MoreHorizontal size={15} /></button>
            </div>
          ))}
          {addingEmail ? (
            <div className="flex items-center gap-2">
              <input autoFocus value={newEmail} onChange={e => setNewEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && addEmail()} placeholder="new@email.com" className="flex-1 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
              <button onClick={addEmail} className="text-sm px-3 py-1.5 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700">Add</button>
              <button onClick={() => setAddingEmail(false)} className="text-zinc-400 hover:text-zinc-600"><X size={15} /></button>
            </div>
          ) : (
            <button onClick={() => setAddingEmail(true)} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 font-medium"><Plus size={14} /> Add email address</button>
          )}
        </div>
      </div>

      <Divider />

      <div className="flex gap-10">
        <span className="text-sm text-zinc-500 w-36 shrink-0 pt-0.5">Connected accounts</span>
        <div className="flex-1 space-y-2.5">
          {(profile?.provider === "keycloak" || profile?.provider === "google") && (
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-2"><GoogleIcon /><span className="text-sm font-medium text-zinc-800">Google</span><span className="text-zinc-300 text-sm">•</span><span className="text-sm text-zinc-500">{profile.email}</span></div>
              <button className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-600"><MoreHorizontal size={15} /></button>
            </div>
          )}
          <button className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 font-medium"><Plus size={14} /> Connect account</button>
        </div>
      </div>
    </>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────
function SecurityTab() {
  const [showDeleteModal,  setShowDeleteModal]  = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const { sessions, loading, revoking, revokeSession } = useSessions();

  const currentSessionId = sessions.length > 0
    ? sessions.reduce((a, b) => a.lastAccess > b.lastAccess ? a : b).id
    : null;

  const sorted = [...sessions].sort((a, b) => {
    if (a.id === currentSessionId) return -1;
    if (b.id === currentSessionId) return  1;
    return b.lastAccess - a.lastAccess;
  });

  return (
    <>
      <h3 className="text-base font-semibold text-zinc-900 mb-1">Security</h3>
      <div className="border-t border-zinc-100 mt-3 mb-6" />

      <div className="flex gap-10">
        <span className="text-sm text-zinc-500 w-36 shrink-0 pt-0.5">Password</span>
        <div className="flex-1">
          {showPasswordForm
            ? <PasswordForm onClose={() => setShowPasswordForm(false)} />
            : <button onClick={() => setShowPasswordForm(true)} className="text-sm text-zinc-700 hover:text-zinc-900 font-medium transition-colors">Set password</button>
          }
        </div>
      </div>

      <Divider />

      <div className="flex gap-10">
        <span className="text-sm text-zinc-500 w-36 shrink-0 pt-0.5">Active devices</span>
        <div className="flex-1 space-y-5">

          {loading && (
            <div className="space-y-5 animate-pulse">
              {[1, 2].map(i => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-10 h-8 rounded-md bg-zinc-100 shrink-0" />
                  <div className="space-y-2 flex-1 pt-0.5">
                    <div className="h-3.5 bg-zinc-100 rounded w-36" />
                    <div className="h-3 bg-zinc-100 rounded w-24" />
                    <div className="h-3 bg-zinc-100 rounded w-52" />
                    <div className="h-3 bg-zinc-100 rounded w-40" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && sessions.length === 0 && (
            <p className="text-sm text-zinc-400">No active sessions found.</p>
          )}

          {!loading && sorted.map(s => {
            const isCurrent = s.id === currentSessionId;

            // ✅ Utiliser le vrai userAgent envoyé par le backend
            // s.userAgent vient des events LOGIN Keycloak
            const ua      = s.userAgent ?? "";
            const os      = parseOS(ua);
            const browser = parseBrowser(ua);
            const mobile  = isMobileUA(ua);

            return (
              <div key={s.id} className="flex items-start justify-between group">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-8 rounded-md bg-zinc-900 flex items-center justify-center shrink-0 mt-0.5">
                    {mobile ? <Smartphone size={15} className="text-white" /> : <Monitor size={15} className="text-white" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-zinc-800">{os}</span>
                      {isCurrent && (
                        <span className="text-[11px] bg-zinc-100 text-zinc-500 border border-zinc-200 px-2 py-0.5 rounded-full font-medium">
                          This device
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">{browser}</p>
                    <p className="text-xs text-zinc-400">{s.ipAddress}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">Last active {formatDate(s.lastAccess)}</p>
                  </div>
                </div>
                <button
                  onClick={() => revokeSession(s.id, isCurrent)}
                  disabled={revoking === s.id}
                  title={isCurrent ? "Sign out" : "Revoke session"}
                  className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 text-zinc-400 hover:text-red-500 disabled:opacity-30"
                >
                  {revoking === s.id ? <Loader2 size={15} className="animate-spin" /> : isCurrent ? <LogOut size={15} /> : <X size={15} />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <Divider />

      <div className="flex gap-10">
        <span className="text-sm text-zinc-500 w-36 shrink-0 pt-0.5">Delete account</span>
        <div className="flex-1">
          <button onClick={() => setShowDeleteModal(true)} className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors">Delete account</button>
        </div>
      </div>

      {showDeleteModal && <DeleteModal onClose={() => setShowDeleteModal(false)} />}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AccountPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  return (
    <div className="min-h-screen bg-zinc-100 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-md border border-zinc-200 flex overflow-hidden">
        <aside className="w-60 shrink-0 bg-zinc-50 border-r border-zinc-100 px-5 py-8">
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Account</h2>
          <p className="text-sm text-zinc-400 mt-1 mb-8">Manage your account info.</p>
          <nav className="space-y-1">
            {(["profile", "security"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeTab === tab ? "bg-zinc-200/80 text-zinc-900 font-medium" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                }`}>
                {tab === "profile" ? <User size={14} className="shrink-0" /> : <Shield size={14} className="shrink-0" />}
                {tab === "profile" ? "Profile" : "Security"}
              </button>
            ))}
          </nav>
        </aside>
        <main className="flex-1 px-10 py-8 min-w-0">
          {activeTab === "profile" ? <ProfileTab /> : <SecurityTab />}
        </main>
      </div>
    </div>
  );
}