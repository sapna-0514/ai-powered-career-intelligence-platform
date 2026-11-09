import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  Bell,
  BellRing,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  GraduationCap,
  IndianRupee,
  Info,
  ListChecks,
  Loader2,
  MapPin,
  Pencil,
  X,
  XCircle,
} from "lucide-react";
import API from "../services/api";

// Change these if your profile endpoints differ
const PROFILE_URL = "/profile";
const PROFILE_SAVE_METHOD = "put"; // "put" | "patch" | "post"

const STATUS_META = {
  open: { label: "Registration open", tone: "green" },
  closing_soon: { label: "Closing soon", tone: "amber" },
  closed: { label: "Registration closed", tone: "red" },
  completed: { label: "Completed", tone: "slate" },
};
const ELIG_META = {
  eligible: { label: "Eligible", tone: "green" },
  partial: { label: "Partially eligible", tone: "amber" },
  not_eligible: { label: "Not eligible", tone: "red" },
};
const STATUS_OPTIONS = [
  ["All", "All statuses"],
  ["open", "Open for registration"],
  ["closing_soon", "Closing soon"],
  ["closed", "Registration closed"],
  ["completed", "Completed"],
];
const ELIG_OPTIONS = [
  ["All", "Any eligibility"],
  ["eligible", "Eligible"],
  ["partial", "Partially eligible"],
  ["not_eligible", "Not eligible"],
];

const errMsg = (e, fallback) => e?.response?.data?.message || fallback;
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium", timeZone: "UTC" }) : "";
const dayNum = (d) => new Date(d).getUTCDate();
const monthShort = (d) => new Date(d).toLocaleDateString(undefined, { month: "short", timeZone: "UTC" });
const byDateAsc = (a, b) => new Date(a.driveDate) - new Date(b.driveDate);

const formatCtc = (min, max) => {
  if (min == null && max == null) return "Package not listed";
  if (min != null && max != null) return min === max ? `₹${min} LPA` : `₹${min}–${max} LPA`;
  return `₹${min ?? max} LPA`;
};

const deadlineText = (d) => {
  if (d.status === "closed" || d.status === "completed") return "Registration closed";
  if (d.daysToDeadline === 0) return "Last day to register (today)";
  if (d.daysToDeadline === 1) return "1 day left to register";
  return `${d.daysToDeadline} days left to register`;
};
const driveText = (d) => {
  if (d.status === "completed") return "Drive completed";
  if (d.daysToDrive === 0) return "Drive is today";
  if (d.daysToDrive === 1) return "1 day left until the drive";
  return `${d.daysToDrive} days left until the drive`;
};

const cardCls = "rounded-xl border border-white/10 bg-white/5 p-5";
const chipBase = "rounded-full border px-2.5 py-0.5 text-xs";
const inputCls =
  "w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400";
const selectCls =
  "rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400";

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

function Modal({ title, onClose, children }) {
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
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-slate-900 p-5 shadow-xl">
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

/* ---------------------- Academic details modal ---------------------- */
function AcademicModal({ initial, saving, onSave, onClose }) {
  const [cgpa, setCgpa] = useState(initial.cgpa ?? "");
  const [branch, setBranch] = useState(initial.branch || "");
  const [year, setYear] = useState(initial.graduationYear ?? "");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const c = String(cgpa).trim();
    const y = String(year).trim();
    let cgpaNum = null;
    let yearNum = null;
    if (c) {
      cgpaNum = Number(c);
      if (!Number.isFinite(cgpaNum) || cgpaNum <= 0 || cgpaNum > 10) return setError("CGPA must be a number between 0 and 10");
    }
    if (y) {
      yearNum = Number(y);
      if (!Number.isInteger(yearNum) || yearNum < 1990 || yearNum > 2100) return setError("Enter a valid graduation year, for example 2027");
    }
    setError("");
    onSave({ cgpa: cgpaNum, branch: branch.trim(), graduationYear: yearNum });
  };

  return (
    <Modal title="Academic details" onClose={() => !saving && onClose()}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-slate-300">CGPA (out of 10)</label>
          <input type="number" min="0" max="10" step="0.01" value={cgpa} onChange={(e) => setCgpa(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Branch</label>
          <input value={branch} maxLength={80} onChange={(e) => setBranch(e.target.value)} placeholder="e.g. Computer Science" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Graduation year</label>
          <input type="number" min="1990" max="2100" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2027" className={inputCls} />
        </div>
        <p className="flex items-start gap-2 text-xs text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          These are saved to your profile and used only to check eligibility.
        </p>
        {error && (
          <p className="rounded-lg border border-red-300/30 bg-red-300/10 px-3 py-2 text-sm text-red-300" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
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
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------- Eligibility details ------------------------- */
function CheckIcon({ status }) {
  if (status === "pass") return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-300" />;
  if (status === "fail") return <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />;
  if (status === "partial") return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />;
  return <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />;
}

function EligibilityDetails({ eligibility }) {
  const meta = ELIG_META[eligibility.verdict] || ELIG_META.partial;
  return (
    <details className="group rounded-lg border border-white/10 bg-slate-900/40 p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <span className="text-slate-400">See why</span>
        </span>
        <ChevronDown className="h-4 w-4 text-slate-500 transition group-open:rotate-180" />
      </summary>
      <ul className="mt-3 space-y-2 text-sm">
        {eligibility.checks.map((c) => (
          <li key={c.key} className="flex items-start gap-2">
            <CheckIcon status={c.status} />
            <span className="text-slate-300">{c.text}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        Automated estimate from your profile and resume skills. Skills are a soft requirement. Always confirm with the
        company&apos;s official criteria.
      </p>
    </details>
  );
}

/* ------------------------------ Actions ------------------------------ */
function ActionButtons({ drive, busy, onToggle, compact = false }) {
  const reg = drive.registration;
  const closed = drive.status === "closed" || drive.status === "completed";
  const done = drive.status === "completed";
  const base = compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-1.5 text-xs";

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onToggle(drive, "interest", !reg.interested)}
        disabled={busy.interest || (closed && !reg.interested)}
        title={closed && !reg.interested ? "Registration is closed" : "Saves your interest in CareerInfinity only"}
        className={`inline-flex items-center gap-1.5 rounded-lg border ${base} transition disabled:cursor-not-allowed disabled:opacity-50 ${
          reg.interested
            ? "border-indigo-400/50 bg-indigo-500/20 text-indigo-200"
            : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
        }`}
      >
        {busy.interest ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : reg.interested ? (
          <BookmarkCheck className="h-3.5 w-3.5" />
        ) : (
          <Bookmark className="h-3.5 w-3.5" />
        )}
        {reg.interested ? "Interested" : "Register interest"}
      </button>
      <button
        type="button"
        onClick={() => onToggle(drive, "reminder", !reg.reminder)}
        disabled={busy.reminder || (done && !reg.reminder)}
        title={done && !reg.reminder ? "This drive has already taken place" : "Saved only. No notification is sent"}
        className={`inline-flex items-center gap-1.5 rounded-lg border ${base} transition disabled:cursor-not-allowed disabled:opacity-50 ${
          reg.reminder
            ? "border-amber-300/50 bg-amber-300/10 text-amber-300"
            : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
        }`}
      >
        {busy.reminder ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : reg.reminder ? (
          <BellRing className="h-3.5 w-3.5" />
        ) : (
          <Bell className="h-3.5 w-3.5" />
        )}
        {reg.reminder ? "Reminder on" : "Add reminder"}
      </button>
    </div>
  );
}

/* ------------------------------ Drive card ------------------------------ */
function DriveCard({ drive, busy, onToggle }) {
  const st = STATUS_META[drive.status] || STATUS_META.open;
  const matched = new Set(drive.eligibility.matchedSkills);
  const urgent = drive.status === "closing_soon";

  return (
    <div className={`${cardCls} flex flex-col gap-3`}>
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-indigo-500/15 p-2">
          <Building2 className="h-5 w-5 text-indigo-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug text-slate-100">{drive.company}</h3>
          <p className="text-sm text-slate-300">{drive.role}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge tone={st.tone}>{st.label}</Badge>
          {drive.isSample && <Badge tone="amber">SAMPLE DATA</Badge>}
        </div>
      </div>

      <div className="grid gap-1.5 text-sm text-slate-400 sm:grid-cols-2">
        <p className="flex items-center gap-2">
          <IndianRupee className="h-4 w-4 shrink-0 text-slate-500" />
          {formatCtc(drive.ctcMinLpa, drive.ctcMaxLpa)}
        </p>
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-slate-500" />
          {drive.location || "Location not listed"}
        </p>
        <p className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-slate-500" />
          Drive: {formatDate(drive.driveDate)}
        </p>
        <p className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-slate-500" />
          Register by: {formatDate(drive.registrationDeadline)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge tone={urgent ? "amber" : "slate"}>{deadlineText(drive)}</Badge>
        <Badge tone={drive.status === "completed" ? "slate" : "indigo"}>{driveText(drive)}</Badge>
        {drive.registration.reminder && drive.status !== "completed" && (
          <Badge tone="amber">
            <span className="inline-flex items-center gap-1">
              <BellRing className="h-3 w-3" /> Reminder set
            </span>
          </Badge>
        )}
      </div>

      <div className="text-sm text-slate-400">
        <p className="mb-1.5 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
          <GraduationCap className="h-3.5 w-3.5" /> Eligibility
        </p>
        <p>
          {drive.minCgpa > 0 ? `Min CGPA ${drive.minCgpa}` : "No CGPA limit"} ·{" "}
          {drive.branches.length ? drive.branches.join(", ") : "All branches"} ·{" "}
          {drive.graduationYears.length ? `Batch ${drive.graduationYears.join(", ")}` : "Any batch"}
        </p>
      </div>

      {drive.requiredSkills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {drive.requiredSkills.map((s) => (
            <span
              key={s}
              className={`${chipBase} ${
                matched.has(s)
                  ? "border-green-300/30 bg-green-300/10 text-green-300"
                  : "border-amber-300/30 bg-amber-300/10 text-amber-300"
              }`}
              title={matched.has(s) ? "You have this skill" : "Not on your profile or resume"}
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {drive.rounds.length > 0 && (
        <p className="flex items-start gap-2 text-sm text-slate-400">
          <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <span>{drive.rounds.join(" → ")}</span>
        </p>
      )}

      <EligibilityDetails eligibility={drive.eligibility} />

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
        <ActionButtons drive={drive} busy={busy} onToggle={onToggle} />
        {drive.applyLink && (
          <a
            href={drive.applyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-400"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {drive.isSample ? "Apply (sample link)" : "Apply"}
          </a>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Calendar row ----------------------------- */
function CalendarRow({ drive, busy, onToggle }) {
  const meta = ELIG_META[drive.eligibility.verdict] || ELIG_META.partial;
  const st = STATUS_META[drive.status] || STATUS_META.open;
  return (
    <div className={`${cardCls} flex flex-col gap-3 sm:flex-row sm:items-center`}>
      <div className="flex w-16 shrink-0 flex-col items-center rounded-lg border border-white/10 bg-slate-900/60 py-2">
        <span className="text-xs uppercase text-slate-400">{monthShort(drive.driveDate)}</span>
        <span className="text-2xl font-bold text-indigo-300">{dayNum(drive.driveDate)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-slate-100">{drive.company}</p>
          <span className="text-sm text-slate-400">· {drive.role}</span>
          {drive.isSample && <Badge tone="amber">SAMPLE</Badge>}
        </div>
        <p className="mt-1 text-sm text-slate-400">
          {formatCtc(drive.ctcMinLpa, drive.ctcMaxLpa)} · {drive.location || "Location not listed"}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <Badge tone={st.tone}>{deadlineText(drive)}</Badge>
          <Badge tone="indigo">{driveText(drive)}</Badge>
        </div>
      </div>
      <ActionButtons drive={drive} busy={busy} onToggle={onToggle} compact />
    </div>
  );
}

/* ------------------------------ Page ------------------------------ */
export default function PlacementDrives() {
  const [tab, setTab] = useState("drives"); // drives | calendar | mine
  const [drives, setDrives] = useState([]);
  const [profile, setProfile] = useState(null);
  const [missing, setMissing] = useState([]);
  const [loading, setLoading] = useState(true);

  const [mine, setMine] = useState([]);
  const [loadingMine, setLoadingMine] = useState(false);

  const [filters, setFilters] = useState({ status: "All", company: "All", role: "All", eligibility: "All" });
  const [busy, setBusy] = useState({});

  const [academicOpen, setAcademicOpen] = useState(false);
  const [savingAcademic, setSavingAcademic] = useState(false);

  const loadDrives = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await API.get("/drives");
      setDrives(res.data?.drives || []);
      setProfile(res.data?.profile || null);
      setMissing(res.data?.missingProfile || []);
      return res.data;
    } catch (e) {
      toast.error(errMsg(e, "Failed to load placement drives"));
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadMine = useCallback(async () => {
    setLoadingMine(true);
    try {
      const res = await API.get("/drives/registered");
      setMine(res.data?.drives || []);
    } catch (e) {
      toast.error(errMsg(e, "Failed to load your drives"));
    } finally {
      setLoadingMine(false);
    }
  }, []);

  useEffect(() => {
    loadDrives();
  }, [loadDrives]);

  const openTab = (name) => {
    setTab(name);
    if (name === "mine") loadMine();
  };

  const toggle = async (drive, action, turnOn) => {
    const key = `${drive._id}:${action}`;
    if (busy[key]) return;
    setBusy((b) => ({ ...b, [key]: true }));
    try {
      let res;
      if (turnOn) {
        res = await API.post(`/drives/${drive._id}/register`, action === "interest" ? { interested: true } : { reminder: true });
      } else {
        res = await API.delete(`/drives/${drive._id}/register`, { params: { type: action } });
      }
      const registration = res.data?.registration || { interested: false, reminder: false };
      const patch = (list) => list.map((d) => (d._id === drive._id ? { ...d, registration } : d));
      setDrives(patch);
      setMine((list) => {
        const stillSaved = registration.interested || registration.reminder;
        return stillSaved ? patch(list) : list.filter((d) => d._id !== drive._id);
      });
      toast.success(
        action === "interest"
          ? turnOn ? "Interest saved" : "Interest removed"
          : turnOn ? "Reminder saved (no notification is sent)" : "Reminder removed"
      );
    } catch (e) {
      toast.error(errMsg(e, "Could not save your choice"));
    } finally {
      setBusy((b) => {
        const next = { ...b };
        delete next[key];
        return next;
      });
    }
  };

  const busyFor = (id) => ({ interest: !!busy[`${id}:interest`], reminder: !!busy[`${id}:reminder`] });

  const saveAcademic = async (vals) => {
    setSavingAcademic(true);
    try {
      const res = await API.get(PROFILE_URL);
      const p = res.data?.profile || res.data?.data || res.data || {};
      // Send the full profile so nothing else is lost, minus database-only fields
      // eslint-disable-next-line no-unused-vars
      const { _id, __v, userId, user, createdAt, updatedAt, ...rest } = p;
      await API[PROFILE_SAVE_METHOD](PROFILE_URL, { ...rest, ...vals });

      const data = await loadDrives(true);
      const notStored =
        (vals.cgpa !== null && data?.profile?.cgpa == null) ||
        (vals.branch && !data?.profile?.branch) ||
        (vals.graduationYear !== null && data?.profile?.graduationYear == null);
      if (notStored) {
        toast.error("Saved, but your profile API did not store the new fields. Check the Profile controller (setup step 1).", { duration: 8000 });
      } else {
        toast.success("Academic details saved");
      }
      setAcademicOpen(false);
    } catch (e) {
      toast.error(errMsg(e, "Could not update your profile"));
    } finally {
      setSavingAcademic(false);
    }
  };

  const companies = useMemo(() => [...new Set(drives.map((d) => d.company))].sort(), [drives]);
  const roles = useMemo(() => [...new Set(drives.map((d) => d.role))].sort(), [drives]);

  const filtered = useMemo(
    () =>
      drives.filter((d) => {
        const statusOk =
          filters.status === "All" ||
          (filters.status === "open" ? ["open", "closing_soon"].includes(d.status) : d.status === filters.status);
        return (
          statusOk &&
          (filters.company === "All" || d.company === filters.company) &&
          (filters.role === "All" || d.role === filters.role) &&
          (filters.eligibility === "All" || d.eligibility.verdict === filters.eligibility)
        );
      }),
    [drives, filters]
  );

  const ordered = useMemo(() => {
    const upcoming = filtered.filter((d) => d.status !== "completed").sort(byDateAsc);
    const past = filtered.filter((d) => d.status === "completed").sort((a, b) => byDateAsc(b, a));
    return [...upcoming, ...past];
  }, [filtered]);

  const groups = useMemo(() => {
    const now = new Date();
    const sameMonth = (d) => {
      const x = new Date(d);
      return x.getUTCFullYear() === now.getUTCFullYear() && x.getUTCMonth() === now.getUTCMonth();
    };
    const g = [
      { key: "today", title: "Today", items: [] },
      { key: "week", title: "This week (next 7 days)", items: [] },
      { key: "month", title: "Later this month", items: [] },
      { key: "later", title: "Later", items: [] },
    ];
    filtered
      .filter((d) => d.status !== "completed")
      .sort(byDateAsc)
      .forEach((d) => {
        const n = d.daysToDrive ?? 0;
        if (n === 0) g[0].items.push(d);
        else if (n <= 6) g[1].items.push(d);
        else if (sameMonth(d.driveDate)) g[2].items.push(d);
        else g[3].items.push(d);
      });
    return g.filter((x) => x.items.length);
  }, [filtered]);

  const stats = useMemo(
    () => ({
      open: drives.filter((d) => ["open", "closing_soon"].includes(d.status)).length,
      eligible: drives.filter((d) => d.status !== "completed" && d.eligibility.verdict === "eligible").length,
      interested: drives.filter((d) => d.registration.interested).length,
    }),
    [drives]
  );

  const hasFilters = Object.values(filters).some((v) => v !== "All");
  const clearFilters = () => setFilters({ status: "All", company: "All", role: "All", eligibility: "All" });
  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  const tabCls = (active) =>
    `inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition ${
      active ? "bg-indigo-500 text-white" : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
    }`;

  const FilterBar = (
    <div className="flex flex-wrap items-center gap-3">
      <select value={filters.status} onChange={setFilter("status")} aria-label="Filter by status" className={selectCls}>
        {STATUS_OPTIONS.map(([v, l]) => (
          <option key={v} value={v} className="bg-slate-900">{l}</option>
        ))}
      </select>
      <select value={filters.company} onChange={setFilter("company")} aria-label="Filter by company" className={selectCls}>
        <option value="All" className="bg-slate-900">All companies</option>
        {companies.map((c) => (
          <option key={c} value={c} className="bg-slate-900">{c}</option>
        ))}
      </select>
      <select value={filters.role} onChange={setFilter("role")} aria-label="Filter by role" className={selectCls}>
        <option value="All" className="bg-slate-900">All roles</option>
        {roles.map((r) => (
          <option key={r} value={r} className="bg-slate-900">{r}</option>
        ))}
      </select>
      <select value={filters.eligibility} onChange={setFilter("eligibility")} aria-label="Filter by eligibility" className={selectCls}>
        {ELIG_OPTIONS.map(([v, l]) => (
          <option key={v} value={v} className="bg-slate-900">{l}</option>
        ))}
      </select>
      {hasFilters && (
        <button type="button" onClick={clearFilters} className="text-sm text-indigo-400 hover:text-indigo-300">
          Clear filters
        </button>
      )}
      <span className="text-sm text-slate-500">
        Showing {filtered.length} of {drives.length}
      </span>
    </div>
  );

  const NoMatches = (
    <div className={`${cardCls} text-center text-sm text-slate-400`}>
      <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-slate-500" />
      No drives match these filters.
    </div>
  );

  return (
    <div className="min-h-screen p-6 md:p-8 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Briefcase className="h-6 w-6 text-indigo-400" />
              Placement Drives
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Browse upcoming drives, check your eligibility and save the ones you care about.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => openTab("drives")} className={tabCls(tab === "drives")}>
              <ListChecks className="h-4 w-4" /> Drives
            </button>
            <button type="button" onClick={() => openTab("calendar")} className={tabCls(tab === "calendar")}>
              <CalendarDays className="h-4 w-4" /> Calendar
            </button>
            <button type="button" onClick={() => openTab("mine")} className={tabCls(tab === "mine")}>
              <BookmarkCheck className="h-4 w-4" /> My drives
            </button>
          </div>
        </header>

        <div className="flex items-start gap-2 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            These are <strong>sample drives</strong> with fictional companies, loaded by a seed script for demonstration.
            &quot;Register interest&quot; and &quot;Add reminder&quot; are saved in CareerInfinity only. They do not apply to a
            company and no notifications are sent.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading placement drives...</span>
          </div>
        ) : (
          <>
            {profile && (
              <div
                className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                  missing.length ? "border-amber-300/30 bg-amber-300/5" : "border-white/10 bg-white/5"
                }`}
              >
                <div className="text-sm">
                  {missing.length ? (
                    <p className="text-amber-300">
                      Add your {missing.join(", ")} to get accurate eligibility results. Unknown details show as
                      &quot;Partially eligible&quot;.
                    </p>
                  ) : (
                    <p className="text-slate-300">Eligibility is checked using your academic details and skills.</p>
                  )}
                  <p className="mt-1 text-slate-400">
                    CGPA: {profile.cgpa ?? "not set"} · Branch: {profile.branch || "not set"} · Graduation year:{" "}
                    {profile.graduationYear ?? "not set"} · Skills found: {profile.skillCount}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAcademicOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10"
                  >
                    <Pencil className="h-4 w-4" /> Edit academic details
                  </button>
                  <Link
                    to="/profile"
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10"
                  >
                    Open profile
                  </Link>
                </div>
              </div>
            )}

            {!drives.length ? (
              <div className={`${cardCls} text-center`}>
                <Briefcase className="mx-auto h-8 w-8 text-slate-500" />
                <p className="mt-3 text-slate-300">No placement drives found.</p>
                <p className="mt-1 text-sm text-slate-400">
                  Load the sample drives with <code className="text-indigo-300">npm run seed:drives</code> in the backend folder.
                </p>
              </div>
            ) : (
              <>
                {tab !== "mine" && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className={cardCls}>
                        <p className="text-sm text-slate-400">Open for registration</p>
                        <p className="mt-1 text-3xl font-bold text-indigo-300">{stats.open}</p>
                      </div>
                      <div className={cardCls}>
                        <p className="text-sm text-slate-400">Drives you look eligible for</p>
                        <p className="mt-1 text-3xl font-bold text-green-300">{stats.eligible}</p>
                      </div>
                      <div className={cardCls}>
                        <p className="text-sm text-slate-400">Interest saved</p>
                        <p className="mt-1 text-3xl font-bold text-slate-100">{stats.interested}</p>
                      </div>
                    </div>
                    {FilterBar}
                  </>
                )}

                {tab === "drives" &&
                  (ordered.length === 0 ? (
                    NoMatches
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {ordered.map((d) => (
                        <DriveCard key={d._id} drive={d} busy={busyFor(d._id)} onToggle={toggle} />
                      ))}
                    </div>
                  ))}

                {tab === "calendar" &&
                  (groups.length === 0 ? (
                    NoMatches
                  ) : (
                    <div className="space-y-6">
                      {groups.map((g) => (
                        <section key={g.key} className="space-y-3">
                          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                            {g.title} <span className="text-slate-600">· {g.items.length}</span>
                          </h2>
                          {g.items.map((d) => (
                            <CalendarRow key={d._id} drive={d} busy={busyFor(d._id)} onToggle={toggle} />
                          ))}
                        </section>
                      ))}
                      <p className="text-xs text-slate-500">Completed drives are hidden here. Dates are shown in UTC.</p>
                    </div>
                  ))}

                {tab === "mine" &&
                  (loadingMine ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">Loading your drives...</span>
                    </div>
                  ) : mine.length === 0 ? (
                    <div className={`${cardCls} text-center`}>
                      <Bookmark className="mx-auto h-8 w-8 text-slate-500" />
                      <p className="mt-3 text-slate-300">You have not saved any drives yet.</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Use &quot;Register interest&quot; or &quot;Add reminder&quot; on a drive and it will show up here.
                      </p>
                      <button
                        type="button"
                        onClick={() => openTab("drives")}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
                      >
                        Browse drives
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-400">
                        {mine.length} saved drive{mine.length === 1 ? "" : "s"}. Reminders are saved only; check back here for
                        the countdown.
                      </p>
                      <div className="grid gap-4 md:grid-cols-2">
                        {mine.map((d) => (
                          <DriveCard key={d._id} drive={d} busy={busyFor(d._id)} onToggle={toggle} />
                        ))}
                      </div>
                    </div>
                  ))}
              </>
            )}
          </>
        )}
      </div>

      {academicOpen && (
        <AcademicModal
          initial={profile || {}}
          saving={savingAcademic}
          onSave={saveAcademic}
          onClose={() => setAcademicOpen(false)}
        />
      )}
    </div>
  );
}