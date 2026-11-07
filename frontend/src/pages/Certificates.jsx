import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  Award,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FileText,
  Info,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import API from "../services/api";

// Change these if your profile endpoints differ
const PROFILE_URL = "/profile";
const PROFILE_SAVE_METHOD = "put"; // "put" | "patch" | "post"

const EXPIRY_WARNING_DAYS = 60;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_SKILLS = 15;
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const DAY_MS = 24 * 60 * 60 * 1000;
const MULTIPART = { headers: { "Content-Type": "multipart/form-data" } };

const errMsg = (e, fallback) => e?.response?.data?.message || fallback;
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium", timeZone: "UTC" }) : "";
const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const formatSize = (b) => (b >= 1024 * 1024 ? `${(b / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const isHttpUrl = (u) => /^https?:\/\//i.test(u || "");

// A certificate is valid through the end of its expiry day
function getStatus(cert) {
  if (!cert.expiryDate) return { kind: "none", daysLeft: null, expired: false, expiringSoon: false };
  const msLeft = new Date(cert.expiryDate).getTime() + DAY_MS - Date.now();
  if (msLeft <= 0) return { kind: "expired", daysLeft: 0, expired: true, expiringSoon: false };
  const daysLeft = Math.ceil(msLeft / DAY_MS);
  const soon = daysLeft <= EXPIRY_WARNING_DAYS;
  return { kind: soon ? "soon" : "valid", daysLeft, expired: false, expiringSoon: soon };
}

const mergeSkills = (current, raw) => {
  const out = [...current];
  raw
    .split(",")
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .forEach((s) => {
      if (s.length > 40 || out.length >= MAX_SKILLS) return;
      if (!out.some((x) => x.toLowerCase() === s.toLowerCase())) out.push(s);
    });
  return out;
};

const cardCls = "rounded-xl border border-white/10 bg-white/5 p-5";
const chipBase = "rounded-full border px-2.5 py-0.5 text-xs";
const inputCls =
  "w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400 [color-scheme:dark]";

function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "border-white/10 bg-white/5 text-slate-300",
    indigo: "border-indigo-400/30 bg-indigo-400/10 text-indigo-300",
    green: "border-green-300/30 bg-green-300/10 text-green-300",
    amber: "border-amber-300/30 bg-amber-300/10 text-amber-300",
    red: "border-red-300/30 bg-red-300/10 text-red-300",
  };
  return <span className={`${chipBase} ${tones[tone]}`}>{children}</span>;
}

function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-lg"} rounded-xl border border-white/10 bg-slate-900 p-5 shadow-xl`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------- Add / edit modal ------------------------- */
function CertificateModal({ editing, saving, onSubmit, onClose }) {
  const [form, setForm] = useState(() => ({
    title: editing?.title || "",
    issuer: editing?.issuer || "",
    issueDate: toInputDate(editing?.issueDate),
    expiryDate: toInputDate(editing?.expiryDate),
    credentialId: editing?.credentialId || "",
    credentialUrl: editing?.credentialUrl || "",
  }));
  const [skills, setSkills] = useState(editing?.skills || []);
  const [skillInput, setSkillInput] = useState("");
  const [file, setFile] = useState(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const commitSkill = () => {
    if (!skillInput.trim()) return skills;
    const next = mergeSkills(skills, skillInput);
    setSkills(next);
    setSkillInput("");
    return next;
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError("Only PDF, PNG and JPG files are allowed");
      e.target.value = "";
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError("File is too large. Maximum size is 5 MB");
      e.target.value = "";
      return;
    }
    setError("");
    setFile(f);
    setRemoveFile(false);
  };

  const clearNewFile = () => {
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = (e) => {
    e.preventDefault();
    const title = form.title.trim();
    const issuer = form.issuer.trim();
    if (!title) return setError("Title is required");
    if (!issuer) return setError("Issuing organization is required");
    if (!form.issueDate) return setError("Issue date is required");
    if (form.expiryDate && form.expiryDate < form.issueDate) return setError("Expiry date cannot be before the issue date");
    if (form.credentialUrl.trim() && !isHttpUrl(form.credentialUrl.trim())) {
      return setError("Credential URL must start with http:// or https://");
    }
    setError("");

    const finalSkills = skillInput.trim() ? mergeSkills(skills, skillInput) : skills;

    const fd = new FormData();
    fd.append("title", title);
    fd.append("issuer", issuer);
    fd.append("issueDate", form.issueDate);
    fd.append("expiryDate", form.expiryDate);
    fd.append("credentialId", form.credentialId.trim());
    fd.append("credentialUrl", form.credentialUrl.trim());
    fd.append("skills", JSON.stringify(finalSkills));
    if (file) fd.append("file", file);
    if (editing && removeFile && !file) fd.append("removeFile", "true");
    onSubmit(fd);
  };

  const hasExisting = !!editing?.file && !removeFile && !file;

  return (
    <Modal title={editing ? "Edit certificate" : "Add certificate"} onClose={() => !saving && onClose()} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-slate-300">Title *</label>
            <input value={form.title} onChange={set("title")} maxLength={150} placeholder="e.g. Python for Data Analysis" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-slate-300">Issuing organization *</label>
            <input value={form.issuer} onChange={set("issuer")} maxLength={150} placeholder="Who issued it" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Issue date *</label>
            <input type="date" value={form.issueDate} onChange={set("issueDate")} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Expiry date (optional)</label>
            <input type="date" value={form.expiryDate} onChange={set("expiryDate")} min={form.issueDate || undefined} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Credential ID (optional)</label>
            <input value={form.credentialId} onChange={set("credentialId")} maxLength={100} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Credential URL (optional)</label>
            <input value={form.credentialUrl} onChange={set("credentialUrl")} maxLength={500} placeholder="https://..." className={inputCls} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">
            Skills ({skills.length}/{MAX_SKILLS})
          </label>
          <div className="mb-2 flex flex-wrap gap-2">
            {skills.map((s) => (
              <span key={s} className={`${chipBase} inline-flex items-center gap-1 border-indigo-400/30 bg-indigo-400/10 text-indigo-300`}>
                {s}
                <button
                  type="button"
                  aria-label={`Remove ${s}`}
                  onClick={() => setSkills((list) => list.filter((x) => x !== s))}
                  className="hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  commitSkill();
                }
              }}
              onBlur={commitSkill}
              maxLength={40}
              disabled={skills.length >= MAX_SKILLS}
              placeholder="Type a skill and press Enter"
              className={inputCls}
            />
            <button
              type="button"
              onClick={commitSkill}
              disabled={skills.length >= MAX_SKILLS}
              className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">Certificate file (optional, PDF/PNG/JPG, max 5 MB)</label>
          {hasExisting && (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
              <span className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-indigo-400" />
                <span className="truncate">{editing.file.originalName}</span>
                <span className="shrink-0 text-xs text-slate-500">{formatSize(editing.file.size)}</span>
              </span>
              <button type="button" onClick={() => setRemoveFile(true)} className="shrink-0 text-xs text-red-300 hover:text-red-200">
                Remove file
              </button>
            </div>
          )}
          {editing?.file && removeFile && !file && (
            <p className="mb-2 text-xs text-amber-300">
              The current file will be deleted when you save.{" "}
              <button type="button" onClick={() => setRemoveFile(false)} className="underline">
                Undo
              </button>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10">
              <Upload className="h-4 w-4" />
              {editing?.file ? "Replace file" : "Choose file"}
              <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={handleFile} className="hidden" />
            </label>
            {file && (
              <span className="flex items-center gap-2 text-sm text-slate-300">
                {file.name} <span className="text-xs text-slate-500">({formatSize(file.size)})</span>
                <button type="button" onClick={clearNewFile} aria-label="Clear selected file" className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </span>
            )}
          </div>
        </div>

        <p className="flex items-start gap-2 text-xs text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Certificates are user-provided and are not verified by CareerInfinity.
        </p>

        {error && (
          <p className="rounded-lg border border-red-300/30 bg-red-300/10 px-3 py-2 text-sm text-red-300" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving..." : editing ? "Save changes" : "Add certificate"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------- Sync confirmation ------------------------- */
function SyncModal({ plan, syncing, onConfirm, onClose }) {
  return (
    <Modal title="Sync skills to profile" onClose={() => !syncing && onClose()}>
      <div className="space-y-4 text-sm text-slate-300">
        {plan.toAdd.length > 0 && (
          <div>
            <p className="mb-2 font-medium text-green-300">Will be added as Intermediate</p>
            <div className="flex flex-wrap gap-2">
              {plan.toAdd.map((s) => (
                <Badge key={s} tone="green">{s}</Badge>
              ))}
            </div>
          </div>
        )}
        {plan.toUpgrade.length > 0 && (
          <div>
            <p className="mb-2 font-medium text-amber-300">Will be raised from Beginner to Intermediate</p>
            <div className="flex flex-wrap gap-2">
              {plan.toUpgrade.map((s) => (
                <Badge key={s} tone="amber">{s}</Badge>
              ))}
            </div>
          </div>
        )}
        {plan.unchanged.length > 0 && (
          <div>
            <p className="mb-2 font-medium text-slate-400">Already Intermediate or Advanced (unchanged)</p>
            <div className="flex flex-wrap gap-2">
              {plan.unchanged.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
          </div>
        )}
        <p className="flex items-start gap-2 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-xs text-amber-300">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Skills come from certificates that you entered yourself and that CareerInfinity has not verified. Expired
          certificates are skipped. Skills are never lowered.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={syncing}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Confirm sync
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------ Card ------------------------------ */
function CertificateCard({ cert, onEdit, onDelete, onViewFile, viewing, deleting, onSkillClick }) {
  const st = cert.status;
  return (
    <div className={`${cardCls} flex flex-col gap-3`}>
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-indigo-500/15 p-2">
          <Award className="h-5 w-5 text-indigo-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug text-slate-100">{cert.title}</h3>
          <p className="text-sm text-slate-400">{cert.issuer}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {st.kind === "expired" && <Badge tone="red">Expired {formatDate(cert.expiryDate)}</Badge>}
        {st.kind === "soon" && (
          <Badge tone="amber">
            <span className="inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Expires in {st.daysLeft} day{st.daysLeft === 1 ? "" : "s"}
            </span>
          </Badge>
        )}
        {st.kind === "valid" && <Badge tone="green">Valid until {formatDate(cert.expiryDate)}</Badge>}
        {st.kind === "none" && <Badge>No expiry</Badge>}
        <Badge tone="amber">User-provided, not verified</Badge>
      </div>

      <dl className="space-y-1 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 shrink-0 text-slate-500" />
          <span>Issued {formatDate(cert.issueDate)}</span>
        </div>
        {cert.credentialId && (
          <p className="break-all">
            <span className="text-slate-500">Credential ID: </span>
            {cert.credentialId}
          </p>
        )}
      </dl>

      {cert.skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {cert.skills.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSkillClick(s)}
              title={`Filter by ${s}`}
              className={`${chipBase} border-indigo-400/30 bg-indigo-400/10 text-indigo-300 transition hover:bg-indigo-400/20`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {cert.file && (
          <button
            type="button"
            onClick={() => onViewFile(cert)}
            disabled={viewing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
          >
            {viewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            View file
          </button>
        )}
        {isHttpUrl(cert.credentialUrl) && (
          <a
            href={cert.credentialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Credential link
          </a>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => onEdit(cert)}
          aria-label={`Edit ${cert.title}`}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(cert)}
          disabled={deleting}
          aria-label={`Delete ${cert.title}`}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-300/10 hover:text-red-300 disabled:opacity-50"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ Page ------------------------------ */
export default function Certificates() {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSkill, setFilterSkill] = useState("All");
  const [onlyExpiring, setOnlyExpiring] = useState(false);

  const [modal, setModal] = useState({ open: false, editing: null });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);

  const [syncPlan, setSyncPlan] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadCerts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await API.get("/certificates");
      setCerts(res.data?.certificates || []);
    } catch (e) {
      toast.error(errMsg(e, "Failed to load certificates"));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCerts();
  }, [loadCerts]);

  const enriched = useMemo(() => certs.map((c) => ({ ...c, status: getStatus(c) })), [certs]);

  const stats = useMemo(
    () => ({
      total: enriched.length,
      expiringSoon: enriched.filter((c) => c.status.expiringSoon).length,
      expired: enriched.filter((c) => c.status.expired).length,
    }),
    [enriched]
  );

  const skillSummary = useMemo(() => {
    const map = new Map();
    enriched.forEach((c) =>
      c.skills.forEach((s) => {
        const key = s.toLowerCase();
        const cur = map.get(key);
        if (cur) cur.count += 1;
        else map.set(key, { label: s, count: 1 });
      })
    );
    return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [enriched]);

  // Reset the filter if the selected skill no longer exists (after edit/delete)
  useEffect(() => {
    if (filterSkill !== "All" && !skillSummary.some((s) => s.label.toLowerCase() === filterSkill.toLowerCase())) {
      setFilterSkill("All");
    }
  }, [skillSummary, filterSkill]);

  const filtered = useMemo(
    () =>
      enriched.filter((c) => {
        const skillOk = filterSkill === "All" || c.skills.some((s) => s.toLowerCase() === filterSkill.toLowerCase());
        const expOk = !onlyExpiring || c.status.expiringSoon;
        return skillOk && expOk;
      }),
    [enriched, filterSkill, onlyExpiring]
  );

  const saveCertificate = async (formData) => {
    setSaving(true);
    try {
      if (modal.editing) {
        await API.put(`/certificates/${modal.editing._id}`, formData, MULTIPART);
        toast.success("Certificate updated");
      } else {
        await API.post("/certificates", formData, MULTIPART);
        toast.success("Certificate added");
      }
      setModal({ open: false, editing: null });
      await loadCerts(true);
    } catch (e) {
      toast.error(errMsg(e, "Failed to save certificate"));
    } finally {
      setSaving(false);
    }
  };

  const deleteCertificate = async (cert) => {
    if (!window.confirm(`Delete "${cert.title}"? The attached file will also be deleted.`)) return;
    setDeletingId(cert._id);
    try {
      await API.delete(`/certificates/${cert._id}`);
      setCerts((list) => list.filter((c) => c._id !== cert._id));
      toast.success("Certificate deleted");
    } catch (e) {
      toast.error(errMsg(e, "Failed to delete certificate"));
    } finally {
      setDeletingId(null);
    }
  };

  // The file route needs the JWT header, so fetch it as a blob and open that
  const viewFile = async (cert) => {
    setViewingId(cert._id);
    const win = window.open("", "_blank"); // opened first so the popup is not blocked
    try {
      const res = await API.get(`/certificates/${cert._id}/file`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      if (win) win.location.href = url;
      else toast.error("Your browser blocked the new tab. Allow pop-ups for this site.");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      if (win) win.close();
      toast.error(e?.response?.status === 404 ? "File not found" : "Could not open the file");
    } finally {
      setViewingId(null);
    }
  };

  const startSync = async () => {
    const eligible = enriched.filter((c) => !c.status.expired);
    const names = new Map();
    eligible.forEach((c) =>
      c.skills.forEach((s) => {
        if (!names.has(s.toLowerCase())) names.set(s.toLowerCase(), s);
      })
    );
    if (!names.size) {
      toast("No skills found on your active certificates.");
      return;
    }

    setSyncLoading(true);
    try {
      const res = await API.get(PROFILE_URL);
      const profile = res.data?.profile || res.data?.data || res.data || {};
      const profileSkills = Array.isArray(profile.skills) ? profile.skills : [];

      const toAdd = [];
      const toUpgrade = [];
      const unchanged = [];
      names.forEach((label, key) => {
        const existing = profileSkills.find((s) => String(s.name || "").toLowerCase() === key);
        if (!existing) toAdd.push(label);
        else if (existing.level === "Beginner") toUpgrade.push(label);
        else unchanged.push(label);
      });

      if (!toAdd.length && !toUpgrade.length) {
        toast("Your profile already has all these skills at Intermediate or higher.");
        return;
      }
      setSyncPlan({ toAdd, toUpgrade, unchanged, profile });
    } catch (e) {
      toast.error(errMsg(e, "Could not read your profile"));
    } finally {
      setSyncLoading(false);
    }
  };

  const confirmSync = async () => {
    if (!syncPlan) return;
    setSyncing(true);
    try {
      const { profile, toAdd, toUpgrade } = syncPlan;
      const profileSkills = Array.isArray(profile.skills) ? profile.skills : [];
      const upgradeKeys = new Set(toUpgrade.map((s) => s.toLowerCase()));

      const nextSkills = profileSkills.map((s) =>
        upgradeKeys.has(String(s.name || "").toLowerCase()) && s.level === "Beginner" ? { ...s, level: "Intermediate" } : s
      );
      toAdd.forEach((name) => nextSkills.push({ name, level: "Intermediate" }));

      // Send the full profile so nothing else is lost, minus database-only fields
      // eslint-disable-next-line no-unused-vars
      const { _id, __v, userId, user, createdAt, updatedAt, ...rest } = profile;
      await API[PROFILE_SAVE_METHOD](PROFILE_URL, { ...rest, skills: nextSkills });

      toast.success(`Profile updated: ${toAdd.length} added, ${toUpgrade.length} raised`);
      setSyncPlan(null);
    } catch (e) {
      toast.error(errMsg(e, "Could not update your profile. Add the skills manually on the Profile page."));
    } finally {
      setSyncing(false);
    }
  };

  const closeModal = useCallback(() => setModal({ open: false, editing: null }), []);
  const closeSync = useCallback(() => setSyncPlan(null), []);

  const hasFilters = filterSkill !== "All" || onlyExpiring;

  return (
    <div className="min-h-screen p-6 md:p-8 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Award className="h-6 w-6 text-indigo-400" />
              Certificates
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Keep track of your certificates, expiry dates and the skills they show.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startSync}
              disabled={syncLoading || !certs.length}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {syncLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync skills to profile
            </button>
            <button
              type="button"
              onClick={() => setModal({ open: true, editing: null })}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
            >
              <Plus className="h-4 w-4" /> Add certificate
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading certificates...</span>
          </div>
        ) : !certs.length ? (
          <div className={`${cardCls} text-center`}>
            <Award className="mx-auto h-8 w-8 text-slate-500" />
            <p className="mt-3 text-slate-300">No certificates yet.</p>
            <p className="mt-1 text-sm text-slate-400">Add your first certificate to build your skills summary.</p>
            <button
              type="button"
              onClick={() => setModal({ open: true, editing: null })}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
            >
              <Plus className="h-4 w-4" /> Add certificate
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className={cardCls}>
                <p className="text-sm text-slate-400">Certificates earned</p>
                <p className="mt-1 text-3xl font-bold text-indigo-300">{stats.total}</p>
              </div>
              <div className={cardCls}>
                <p className="text-sm text-slate-400">Expiring within {EXPIRY_WARNING_DAYS} days</p>
                <p className={`mt-1 text-3xl font-bold ${stats.expiringSoon ? "text-amber-300" : "text-slate-100"}`}>
                  {stats.expiringSoon}
                </p>
              </div>
              <div className={cardCls}>
                <p className="text-sm text-slate-400">Expired</p>
                <p className={`mt-1 text-3xl font-bold ${stats.expired ? "text-red-300" : "text-slate-100"}`}>{stats.expired}</p>
              </div>
            </div>

            {skillSummary.length > 0 && (
              <div className={cardCls}>
                <h3 className="mb-3 font-semibold text-slate-100">Skills from certificates</h3>
                <div className="flex flex-wrap gap-2">
                  {skillSummary.map((s) => {
                    const active = filterSkill.toLowerCase() === s.label.toLowerCase();
                    return (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => setFilterSkill(active ? "All" : s.label)}
                        className={`${chipBase} transition ${
                          active
                            ? "border-indigo-400 bg-indigo-500/30 text-indigo-100"
                            : "border-indigo-400/30 bg-indigo-400/10 text-indigo-300 hover:bg-indigo-400/20"
                        }`}
                      >
                        {s.label} <span className="text-slate-400">· {s.count}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Counts are based on the certificates you entered. They are user-provided, not verified.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={filterSkill}
                onChange={(e) => setFilterSkill(e.target.value)}
                aria-label="Filter by skill"
                className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400"
              >
                <option value="All" className="bg-slate-900">All skills</option>
                {skillSummary.map((s) => (
                  <option key={s.label} value={s.label} className="bg-slate-900">{s.label}</option>
                ))}
              </select>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={onlyExpiring}
                  onChange={(e) => setOnlyExpiring(e.target.checked)}
                  className="h-4 w-4 accent-indigo-500"
                />
                Expiring within {EXPIRY_WARNING_DAYS} days only
              </label>
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterSkill("All");
                    setOnlyExpiring(false);
                  }}
                  className="text-sm text-indigo-400 hover:text-indigo-300"
                >
                  Clear filters
                </button>
              )}
              <span className="text-sm text-slate-500">
                Showing {filtered.length} of {certs.length}
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className={`${cardCls} text-center text-sm text-slate-400`}>
                <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-slate-500" />
                No certificates match these filters.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((c) => (
                  <CertificateCard
                    key={c._id}
                    cert={c}
                    onEdit={(cert) => setModal({ open: true, editing: cert })}
                    onDelete={deleteCertificate}
                    onViewFile={viewFile}
                    viewing={viewingId === c._id}
                    deleting={deletingId === c._id}
                    onSkillClick={setFilterSkill}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {modal.open && (
        <CertificateModal
          key={modal.editing?._id || "new"}
          editing={modal.editing}
          saving={saving}
          onSubmit={saveCertificate}
          onClose={closeModal}
        />
      )}
      {syncPlan && <SyncModal plan={syncPlan} syncing={syncing} onConfirm={confirmSync} onClose={closeSync} />}
    </div>
  );
}