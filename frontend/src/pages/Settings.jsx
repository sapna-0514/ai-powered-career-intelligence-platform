import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { AlertTriangle, ExternalLink, Info, KeyRound, Loader2, Save, Settings as SettingsIcon, Trash2, User } from "lucide-react";
import API from "../services/api";

// Change these if your app stores the session under other keys or uses another login route
const TOKEN_KEY = "token";
const USER_KEY = "user";
const LOGIN_PATH = "/login";

const errMsg = (e, fallback) => e?.response?.data?.message || fallback;
const formatDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "");

function syncStoredName(name) {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return;
    const u = JSON.parse(raw);
    if (u && typeof u === "object") localStorage.setItem(USER_KEY, JSON.stringify({ ...u, name }));
  } catch {
    // ignore a malformed stored user
  }
}

const cardCls = "rounded-xl border border-white/10 bg-white/5 p-5";
const inputCls =
  "w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400 disabled:opacity-60";

function ErrorBox({ children }) {
  return (
    <p className="rounded-lg border border-red-300/30 bg-red-300/10 px-3 py-2 text-sm text-red-300" role="alert">
      {children}
    </p>
  );
}

/* ------------------------------ Profile tab ------------------------------ */
function ProfileTab() {
  return (
    <div className={`${cardCls} space-y-3`}>
      <h2 className="flex items-center gap-2 font-semibold text-slate-100">
        <User className="h-4 w-4 text-indigo-400" /> Your profile
      </h2>
      <p className="text-sm text-slate-400">
        Education, skills, interests, preferred career and academic details (CGPA, branch, graduation year) are edited on the
        profile form.
      </p>
      <Link
        to="/profile"
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
      >
        <ExternalLink className="h-4 w-4" /> Open profile form
      </Link>
    </div>
  );
}

/* ------------------------------ Account tab ------------------------------ */
function AccountTab() {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await API.get("/account");
      setAccount(res.data.account);
      setName(res.data.account.name || "");
    } catch (e) {
      setLoadError(true);
      toast.error(errMsg(e, "Failed to load your account"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveName = async (e) => {
    e.preventDefault();
    const clean = name.trim().replace(/\s+/g, " ");
    if (clean.length < 2) return setNameError("Name must be at least 2 characters");
    if (clean.length > 60) return setNameError("Name must be 60 characters or fewer");
    setNameError("");
    setSavingName(true);
    try {
      const res = await API.put("/account/name", { name: clean });
      setAccount((a) => ({ ...a, name: res.data.account.name }));
      setName(res.data.account.name);
      syncStoredName(res.data.account.name);
      toast.success("Name updated. Refresh the page if the sidebar still shows the old one.");
    } catch (err) {
      setNameError(errMsg(err, "Could not update your name"));
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (!pw.current) return setPwError("Enter your current password");
    if (pw.next.length < 8) return setPwError("New password must be at least 8 characters");
    if (pw.next === pw.current) return setPwError("New password must be different from the current one");
    if (pw.next !== pw.confirm) return setPwError("New password and confirmation do not match");
    setPwError("");
    setSavingPw(true);
    try {
      await API.put("/account/password", { currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: "", next: "", confirm: "" });
      toast.success("Password changed");
    } catch (err) {
      setPwError(errMsg(err, "Could not change your password"));
    } finally {
      setSavingPw(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading your account...</span>
      </div>
    );
  }

  if (loadError || !account) {
    return (
      <div className={`${cardCls} text-center`}>
        <p className="text-slate-300">Could not load your account.</p>
        <button
          type="button"
          onClick={load}
          className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={saveName} className={`${cardCls} space-y-4`}>
        <h2 className="flex items-center gap-2 font-semibold text-slate-100">
          <User className="h-4 w-4 text-indigo-400" /> Account details
        </h2>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Email</label>
          <input value={account.email || ""} disabled className={inputCls} />
          <p className="mt-1 text-xs text-slate-500">Your email cannot be changed here. Member since {formatDate(account.createdAt)}.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" className={inputCls} />
        </div>
        {nameError && <ErrorBox>{nameError}</ErrorBox>}
        <button
          type="submit"
          disabled={savingName || name.trim() === (account.name || "")}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save name
        </button>
      </form>

      <form onSubmit={savePassword} className={`${cardCls} space-y-4`}>
        <h2 className="flex items-center gap-2 font-semibold text-slate-100">
          <KeyRound className="h-4 w-4 text-indigo-400" /> Change password
        </h2>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Current password</label>
          <input
            type="password"
            value={pw.current}
            onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
            autoComplete="current-password"
            className={inputCls}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-300">New password (min 8 characters)</label>
            <input
              type="password"
              value={pw.next}
              onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
              autoComplete="new-password"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Confirm new password</label>
            <input
              type="password"
              value={pw.confirm}
              onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
              autoComplete="new-password"
              className={inputCls}
            />
          </div>
        </div>
        <p className="flex items-start gap-2 text-xs text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Other devices stay signed in until their session expires.
        </p>
        {pwError && <ErrorBox>{pwError}</ErrorBox>}
        <button
          type="submit"
          disabled={savingPw}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
        >
          {savingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          Change password
        </button>
      </form>
    </div>
  );
}

/* ------------------------------ Danger zone ------------------------------ */
function DangerTab() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const ready = password.length > 0 && confirm === "DELETE";

  const submit = async (e) => {
    e.preventDefault();
    if (!ready || deleting) return;
    if (!window.confirm("This permanently deletes your account and all your data. This cannot be undone. Continue?")) return;
    setError("");
    setDeleting(true);
    try {
      await API.delete("/account", { data: { password, confirm } });
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      toast.success("Your account was deleted");
      window.location.replace(LOGIN_PATH);
    } catch (err) {
      setError(errMsg(err, "Could not delete your account"));
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-red-300/30 bg-red-300/5 p-5">
      <h2 className="flex items-center gap-2 font-semibold text-red-300">
        <AlertTriangle className="h-4 w-4" /> Delete account
      </h2>
      <p className="text-sm text-slate-300">This permanently removes your account and everything linked to it:</p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
        <li>Profile, resumes and resume analysis</li>
        <li>Career predictions and learning paths</li>
        <li>Mock interview and assessment history</li>
        <li>Certificates and their uploaded files</li>
        <li>Saved placement drives and support tickets</li>
      </ul>
      <p className="text-sm font-medium text-red-300">This cannot be undone.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-slate-300">Your password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">
            Type <span className="font-mono text-red-300">DELETE</span> to confirm
          </label>
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" className={inputCls} />
        </div>
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}

      <button
        type="submit"
        disabled={!ready || deleting}
        className="inline-flex items-center gap-2 rounded-lg bg-red-500/80 px-5 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        {deleting ? "Deleting..." : "Delete my account"}
      </button>
    </form>
  );
}

/* ------------------------------- Page ------------------------------- */
export default function Settings() {
  const [tab, setTab] = useState("profile"); // profile | account | danger

  const tabCls = (active, danger = false) =>
    `inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition ${
      active
        ? danger
          ? "bg-red-500/80 text-white"
          : "bg-indigo-500 text-white"
        : `border bg-white/5 hover:bg-white/10 ${danger ? "border-red-300/30 text-red-300" : "border-white/10 text-slate-300"}`
    }`;

  return (
    <div className="min-h-screen p-6 md:p-8 text-slate-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <SettingsIcon className="h-6 w-6 text-indigo-400" />
            Settings
          </h1>
          <p className="mt-1 text-sm text-slate-400">Manage your profile, account and data.</p>
        </header>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setTab("profile")} className={tabCls(tab === "profile")}>
            <User className="h-4 w-4" /> Profile
          </button>
          <button type="button" onClick={() => setTab("account")} className={tabCls(tab === "account")}>
            <KeyRound className="h-4 w-4" /> Account
          </button>
          <button type="button" onClick={() => setTab("danger")} className={tabCls(tab === "danger", true)}>
            <AlertTriangle className="h-4 w-4" /> Danger zone
          </button>
        </div>

        {tab === "profile" && <ProfileTab />}
        {tab === "account" && <AccountTab />}
        {tab === "danger" && <DangerTab />}
      </div>
    </div>
  );
}