"use client";

import { useState, useRef } from "react";
import {
  User,
  Shield,
  Camera,
  X,
  Check,
  MoreHorizontal,
  Plus,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface EmailEntry {
  address: string;
  primary: boolean;
}

interface ConnectedAccount {
  provider: "Google" | "GitHub" | "Microsoft";
  email: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionDivider() {
  return <div className="border-t border-zinc-100 my-8" />;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-medium text-zinc-500 w-44 shrink-0 pt-1">
      {children}
    </p>
  );
}

// ─── Avatar Uploader ──────────────────────────────────────────────────────────
function AvatarUploader({
  src,
  onUpload,
  onRemove,
}: {
  src: string | null;
  onUpload: (url: string) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onUpload(url);
    }
  };

  return (
    <div className="flex items-start gap-5">
      {/* Avatar */}
      <div className="relative w-16 h-16 rounded-full overflow-hidden bg-zinc-100 border border-zinc-200 shrink-0">
        {src ? (
          <img src={src} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-400">
            <User size={28} />
          </div>
        )}
      </div>

      {/* Actions */}
      <div>
        <div className="flex items-center gap-3 mb-1.5">
          <button
            onClick={() => inputRef.current?.click()}
            className="text-sm px-3 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors font-medium text-zinc-700 flex items-center gap-1.5"
          >
            <Camera size={14} />
            Upload
          </button>
          <button
            onClick={onRemove}
            className="text-sm px-3 py-1.5 rounded-md border border-red-100 bg-white hover:bg-red-50 transition-colors font-medium text-red-500"
          >
            Remove
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </div>
        <p className="text-xs text-zinc-400">Recommended size 1:1, up to 10MB.</p>
      </div>
    </div>
  );
}

// ─── Profile Details Card ─────────────────────────────────────────────────────
function ProfileCard() {
  const [avatar, setAvatar] = useState<string | null>(
    "https://i.pravatar.cc/150?img=47"
  );
  const [firstName, setFirstName] = useState("Baya");
  const [lastName, setLastName] = useState("Boulaares");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-800 mb-5">
        Update profile
      </h3>

      <AvatarUploader
        src={avatar}
        onUpload={setAvatar}
        onRemove={() => setAvatar(null)}
      />

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1.5">
            First name
          </label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-300 transition"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1.5">
            Last name
          </label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-300 transition"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <button
          onClick={() => {
            setFirstName("Baya");
            setLastName("Boulaares");
          }}
          className="text-sm px-4 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className={`text-sm px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
            saved
              ? "bg-green-600 text-white"
              : "bg-zinc-800 hover:bg-zinc-700 text-white"
          }`}
        >
          {saved ? (
            <>
              <Check size={14} /> Saved
            </>
          ) : (
            "Save"
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Email Addresses Section ──────────────────────────────────────────────────
function EmailSection() {
  const [emails, setEmails] = useState<EmailEntry[]>([
    { address: "bayaboubou20@gmail.com", primary: true },
  ]);
  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  const addEmail = () => {
    if (!newEmail.trim()) return;
    setEmails([...emails, { address: newEmail.trim(), primary: false }]);
    setNewEmail("");
    setAdding(false);
  };

  return (
    <div className="flex gap-8">
      <Label>Email addresses</Label>
      <div className="flex-1 space-y-3">
        {emails.map((e, i) => (
          <div key={i} className="flex items-center justify-between group">
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-700">{e.address}</span>
              {e.primary && (
                <span className="text-[11px] bg-zinc-100 text-zinc-500 border border-zinc-200 px-2 py-0.5 rounded-full font-medium">
                  Primary
                </span>
              )}
            </div>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-600">
              <MoreHorizontal size={16} />
            </button>
          </div>
        ))}

        {adding ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEmail()}
              placeholder="new@email.com"
              className="flex-1 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
            />
            <button
              onClick={addEmail}
              className="text-sm px-3 py-1.5 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition"
            >
              Add
            </button>
            <button
              onClick={() => setAdding(false)}
              className="text-zinc-400 hover:text-zinc-600"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors font-medium"
          >
            <Plus size={14} />
            Add email address
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Connected Accounts Section ───────────────────────────────────────────────
const providerIcons: Record<string, React.ReactNode> = {
  Google: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  ),
};

function ConnectedAccountsSection() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([
    { provider: "Google", email: "bayaboubou20@gmail.com" },
  ]);

  return (
    <div className="flex gap-8">
      <Label>Connected accounts</Label>
      <div className="flex-1 space-y-3">
        {accounts.map((acc, i) => (
          <div key={i} className="flex items-center justify-between group">
            <div className="flex items-center gap-2">
              {providerIcons[acc.provider] ?? null}
              <span className="text-sm text-zinc-700 font-medium">
                {acc.provider}
              </span>
              <span className="text-zinc-400 text-sm">•</span>
              <span className="text-sm text-zinc-500">{acc.email}</span>
            </div>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-600">
              <MoreHorizontal size={16} />
            </button>
          </div>
        ))}
        <button className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors font-medium">
          <Plus size={14} />
          Connect account
        </button>
      </div>
    </div>
  );
}

// ─── Profile Page ─────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"profile" | "security">(
    "profile"
  );

  return (
    <div className="flex h-screen bg-zinc-50 font-sans">
      {/* ── Sidebar (minimal stub, matching screenshot) ── */}
      <aside className="w-56 bg-white border-r border-zinc-100 flex flex-col shrink-0">
        <div className="h-14 border-b border-zinc-100 flex items-center px-4 gap-2">
          <div className="w-6 h-6 rounded-md bg-zinc-900 flex items-center justify-center text-white text-xs font-bold">
            +
          </div>
          <div className="leading-tight">
            <p className="text-xs font-semibold text-zinc-800">
              Create organization
            </p>
            <p className="text-[10px] text-zinc-400">Get started</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 text-sm">
          {["Dashboard", "Workspaces", "Product", "Kanban"].map((item) => (
            <button
              key={item}
              className="w-full text-left px-3 py-1.5 rounded-md text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 transition-colors"
            >
              {item}
            </button>
          ))}
          <div className="pt-2">
            <button className="w-full text-left px-3 py-1.5 rounded-md text-zinc-500 hover:bg-zinc-50 flex items-center justify-between">
              <span>Pro</span>
              <span className="text-zinc-300">›</span>
            </button>
          </div>
          <div className="pt-2">
            <button className="w-full text-left px-3 py-1.5 rounded-md text-zinc-500 hover:bg-zinc-50 flex items-center justify-between">
              <span>Account</span>
              <span className="text-zinc-300">›</span>
            </button>
            <button className="w-full text-left px-3 py-1.5 pl-6 rounded-md bg-zinc-100 text-zinc-800 font-medium">
              Profile
            </button>
            <button className="w-full text-left px-3 py-1.5 pl-6 rounded-md text-zinc-500 hover:bg-zinc-50">
              Login
            </button>
          </div>
        </nav>

        {/* Bottom user */}
        <div className="border-t border-zinc-100 p-3 flex items-center gap-2">
          <img
            src="https://i.pravatar.cc/150?img=47"
            alt="avatar"
            className="w-7 h-7 rounded-full object-cover"
          />
          <div className="leading-tight overflow-hidden">
            <p className="text-xs font-semibold text-zinc-800 truncate">
              Baya Boulaares
            </p>
            <p className="text-[10px] text-zinc-400 truncate">
              bayaboubou20@gmail.com
            </p>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-auto">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-zinc-100 flex items-center px-6 gap-2 text-sm text-zinc-500">
          <span>Dashboard</span>
          <span className="text-zinc-300">/</span>
          <span className="text-zinc-800 font-medium">Profile</span>
        </header>

        {/* Two-column layout */}
        <div className="flex max-w-5xl mx-auto px-8 py-10 gap-10">
          {/* Left: Account nav */}
          <div className="w-52 shrink-0">
            <h2 className="text-xl font-semibold text-zinc-900">Account</h2>
            <p className="text-sm text-zinc-400 mt-0.5 mb-6">
              Manage your account info.
            </p>

            <nav className="space-y-0.5">
              <button
                onClick={() => setActiveTab("profile")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeTab === "profile"
                    ? "bg-zinc-100 text-zinc-900 font-medium"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
                }`}
              >
                <User size={15} />
                Profile
              </button>
              <button
                onClick={() => setActiveTab("security")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeTab === "security"
                    ? "bg-zinc-100 text-zinc-900 font-medium"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
                }`}
              >
                <Shield size={15} />
                Security
              </button>
            </nav>
          </div>

          {/* Right: Profile details */}
          <div className="flex-1">
            <h3 className="text-base font-semibold text-zinc-900 mb-6">
              Profile details
            </h3>

            {/* Profile row */}
            <div className="flex gap-8">
              <Label>Profile</Label>
              <div className="flex-1">
                <ProfileCard />
              </div>
            </div>

            <SectionDivider />

            <EmailSection />

            <SectionDivider />

            <ConnectedAccountsSection />
          </div>
        </div>
      </div>
    </div>
  );
}