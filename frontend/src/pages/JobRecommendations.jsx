import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Banknote,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Clock,
  ExternalLink,
  GraduationCap,
  Info,
  Loader2,
  MapPin,
  Search,
  X,
} from "lucide-react";
import API from "../services/api";

const PAGE_SIZE = 12;
const LEVELS = ["", "Beginner", "Intermediate", "Advanced"];
const STATUSES = [
  { value: "none", label: "Not applied" },
  { value: "applied", label: "Applied" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
];
const STATUS_STYLE = {
  none: "text-slate-300",
  applied: "text-indigo-300",
  interview: "text-amber-300",
  offer: "text-green-300",
  rejected: "text-red-300",
};
const TONES = {
  green: "border-green-400/30 bg-green-400/10 text-green-300",
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  red: "border-red-400/30 bg-red-400/10 text-red-300",
};
const DEFAULT_FILTERS = {
  q: "",
  location: "",
  workMode: "",
  jobType: "",
  experienceLevel: "",
  minMatch: 0,
  sort: "match",
};
const inputCls =
  "w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none";

function useDebounced(value, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function timeAgo(date) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
}

function formatSalary(sr, isSample) {
  if (!sr || (!sr.min && !sr.max)) return null;
  const sym = sr.currency === "INR" || !sr.currency ? "₹" : `${sr.currency} `;
  const fmt = (n) =>
    n >= 100000 ? `${sym}${(n / 100000).toFixed(1).replace(/\.0$/, "")}L` : `${sym}${Math.round(n / 1000)}k`;
  const range = sr.min && sr.max ? `${fmt(sr.min)} – ${fmt(sr.max)}` : fmt(sr.min || sr.max);
  return `${range}${sr.period === "month" ? "/mo" : "/yr"}${isSample ? " (sample)" : ""}`;
}

function matchStyle(score) {
  if (score >= 70) return { text: "text-green-300", bar: "bg-green-400" };
  if (score >= 40) return { text: "text-amber-300", bar: "bg-amber-400" };
  return { text: "text-red-300", bar: "bg-red-400" };
}

function applyClientFilters(list, f) {
  const q = f.q.trim().toLowerCase();
  const loc = f.location.trim().toLowerCase();
  const out = list.filter((j) => {
    if (q) {
      const hay = [j.title, j.company, j.category, ...(j.requiredSkills || []).map((s) => s.name)]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (loc && !String(j.location || "").toLowerCase().includes(loc)) return false;
    if (f.workMode && j.workMode !== f.workMode) return false;
    if (f.jobType && j.jobType !== f.jobType) return false;
    if (f.experienceLevel && j.experienceLevel !== f.experienceLevel) return false;
    if (j.match.matchScore < f.minMatch) return false;
    return true;
  });
  return out.sort(
    f.sort === "newest"
      ? (a, b) => new Date(b.postedAt) - new Date(a.postedAt)
      : (a, b) => b.match.matchScore - a.match.matchScore
  );
}

function SkillChips({ label, skills = [], tone, max = 6 }) {
  if (!skills.length) return null;
  return (
    <div>
      <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">
        {label} ({skills.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {skills.slice(0, max).map((s) => (
          <span
            key={s.name}
            title={`Needs ${LEVELS[s.requiredLevel] || ""}${s.userLevel ? ` · you: ${LEVELS[s.userLevel]}` : ""}`}
            className={`rounded-full border px-2 py-0.5 text-xs ${TONES[tone]}`}
          >
            {s.name}
          </span>
        ))}
        {skills.length > max && <span className="px-1 text-xs text-slate-500">+{skills.length - max}</span>}
      </div>
    </div>
  );
}

function StatusSelect({ value, onChange }) {
  const v = value || "none";
  return (
    <select
      value={v}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Application status"
      className={`rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-xs focus:border-indigo-400 focus:outline-none ${STATUS_STYLE[v]}`}
    >
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

function JobMeta({ job }) {
  const salary = formatSalary(job.salaryRange, job.isSample);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
      {job.location && (
        <span className="inline-flex items-center gap-1">
          <MapPin size={13} /> {job.location}
        </span>
      )}
      <span className="capitalize">{job.workMode}</span>
      <span className="capitalize">{job.jobType}</span>
      <span>{job.experienceLevel}</span>
      <span className="inline-flex items-center gap-1">
        <Clock size={13} /> {timeAgo(job.postedAt)}
      </span>
      {salary && (
        <span className="inline-flex items-center gap-1">
          <Banknote size={13} /> {salary}
        </span>
      )}
    </div>
  );
}

function SourceBadge({ job }) {
  return job.isSample ? (
    <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-300">
      Sample
    </span>
  ) : (
    <span className="rounded-full border border-indigo-400/30 bg-indigo-400/10 px-2 py-0.5 text-[11px] text-indigo-300">
      Live
    </span>
  );
}

function JobCard({ job, onOpen, onToggleSave, onStatus }) {
  const m = job.match;
  const style = matchStyle(m.matchScore);
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-slate-100">{job.title}</h3>
            <SourceBadge job={job} />
          </div>
          <p className="truncate text-sm text-slate-400">{job.company}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-2xl font-bold ${style.text}`}>{m.matchScore}%</p>
          <p className="text-[11px] text-slate-500">match (heuristic)</p>
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className={`h-full ${style.bar}`} style={{ width: `${m.matchScore}%` }} />
      </div>

      <JobMeta job={job} />

      <div className="space-y-2">
        <SkillChips label="Matched" skills={m.matchedSkills} tone="green" />
        <SkillChips label="Partial" skills={m.partialSkills} tone="amber" />
        <SkillChips label="Missing" skills={m.missingSkills} tone="red" />
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <button
          onClick={() => onOpen(job._id)}
          className="rounded-lg bg-indigo-500/90 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          View details
        </button>
        <div className="flex items-center gap-2">
          <StatusSelect value={job.status} onChange={(s) => onStatus(job, s)} />
          <button
            onClick={() => onToggleSave(job)}
            aria-label={job.saved ? "Remove from saved" : "Save job"}
            className={`rounded-lg border border-white/10 p-2 hover:bg-white/10 ${
              job.saved ? "text-indigo-300" : "text-slate-400"
            }`}
          >
            {job.saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function JobModal({ detail, loading, onClose, onToggleSave, onStatus, onLearn }) {
  const job = detail?.job;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 md:p-8"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-xl border border-white/10 bg-slate-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-100"
        >
          <X size={20} />
        </button>

        {loading || !job ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="mr-2 animate-spin" size={18} /> Loading job...
          </div>
        ) : (
          <div className="space-y-5">
            <div className="pr-8">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-100">{job.title}</h2>
                <SourceBadge job={job} />
              </div>
              <p className="text-sm text-slate-400">{job.company}</p>
            </div>

            <JobMeta job={job} />

            <div className="flex flex-wrap items-center gap-3">
              <span className={`text-2xl font-bold ${matchStyle(job.match.matchScore).text}`}>
                {job.match.matchScore}% match
              </span>
              <span className="text-xs text-slate-500">
                Heuristic: skill overlap weighted by required level
              </span>
              <div className="ml-auto flex items-center gap-2">
                <StatusSelect value={job.status} onChange={(s) => onStatus(job, s)} />
                <button
                  onClick={() => onToggleSave(job)}
                  aria-label={job.saved ? "Remove from saved" : "Save job"}
                  className={`rounded-lg border border-white/10 p-2 hover:bg-white/10 ${
                    job.saved ? "text-indigo-300" : "text-slate-400"
                  }`}
                >
                  {job.saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                </button>
              </div>
            </div>

            {job.description && <p className="text-sm leading-relaxed text-slate-300">{job.description}</p>}

            {job.applyUrl && (
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300"
              >
                Open original listing <ExternalLink size={14} />
              </a>
            )}

            <div className="space-y-3">
              <SkillChips label="Matched" skills={job.match.matchedSkills} tone="green" max={99} />
              <SkillChips label="Partial" skills={job.match.partialSkills} tone="amber" max={99} />
              <SkillChips label="Missing" skills={job.match.missingSkills} tone="red" max={99} />
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-100">
                <GraduationCap size={18} className="text-indigo-400" /> Skills to learn for this job
              </h3>
              {detail.skillsToLearn.length === 0 ? (
                <p className="text-sm text-green-300">
                  You already meet every required skill level for this job.
                </p>
              ) : (
                <>
                  <ol className="mb-4 space-y-2 text-sm">
                    {detail.skillsToLearn.map((s, i) => (
                      <li key={s.name} className="flex items-center justify-between gap-3">
                        <span className="text-slate-200">
                          {i + 1}. {s.name}
                        </span>
                        <span className="text-xs text-slate-400">
                          {s.userLevel ? `${LEVELS[s.userLevel]} → ` : "Not started → "}
                          {LEVELS[s.requiredLevel]}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <button
                    onClick={onLearn}
                    className="rounded-lg bg-indigo-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                  >
                    Create learning path for these skills
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JobRecommendations() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("recommended");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const dq = useDebounced(filters.q);
  const dloc = useDebounced(filters.location);

  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [meta, setMeta] = useState({ hasSkills: true, liveEnabled: false });

  const [saved, setSaved] = useState([]);
  const [applied, setApplied] = useState([]);
  const [trackedLoading, setTrackedLoading] = useState(true);

  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const reqId = useRef(0);
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  const fetchJobs = useCallback(
    async (pageNum, append) => {
      const id = ++reqId.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const params = { page: pageNum, limit: PAGE_SIZE, sort: filters.sort };
        if (dq.trim()) params.q = dq.trim();
        if (dloc.trim()) params.location = dloc.trim();
        if (filters.workMode) params.workMode = filters.workMode;
        if (filters.jobType) params.jobType = filters.jobType;
        if (filters.experienceLevel) params.experienceLevel = filters.experienceLevel;
        if (filters.minMatch > 0) params.minMatch = filters.minMatch;

        const { data } = await API.get("/jobs", { params });
        if (id !== reqId.current) return;
        setJobs((prev) => (append ? [...prev, ...data.jobs] : data.jobs));
        setPage(data.page);
        setHasMore(data.hasMore);
        setTotal(data.total);
        setMeta({ hasSkills: data.hasSkills, liveEnabled: data.liveEnabled });
      } catch (e) {
        if (id !== reqId.current) return;
        toast.error(e.response?.data?.message || "Failed to load jobs");
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [dq, dloc, filters.workMode, filters.jobType, filters.experienceLevel, filters.minMatch, filters.sort]
  );

  useEffect(() => {
    if (tab === "recommended") fetchJobs(1, false);
  }, [tab, fetchJobs]);

  const loadTracked = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([API.get("/jobs/saved"), API.get("/jobs/applied")]);
      setSaved(s.data.jobs);
      setApplied(a.data.jobs);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load saved/applied jobs");
    } finally {
      setTrackedLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTracked();
  }, [loadTracked]);

  const patchLocal = (id, patch) => {
    const apply = (list) => list.map((j) => (j._id === id ? { ...j, ...patch } : j));
    setJobs(apply);
    setSaved(apply);
    setApplied(apply);
    setDetail((d) => (d && d.job._id === id ? { ...d, job: { ...d.job, ...patch } } : d));
  };

  const toggleSave = async (job) => {
    const next = !job.saved;
    patchLocal(job._id, { saved: next });
    try {
      if (next) await API.post(`/jobs/${job._id}/save`);
      else await API.delete(`/jobs/${job._id}/save`);
      toast.success(next ? "Job saved" : "Removed from saved");
      loadTracked();
    } catch (e) {
      patchLocal(job._id, { saved: !next });
      toast.error(e.response?.data?.message || "Could not update saved job");
    }
  };

  const changeStatus = async (job, status) => {
    const prev = job.status || "none";
    patchLocal(job._id, { status });
    try {
      await API.patch(`/jobs/${job._id}/status`, { status });
      toast.success("Status updated");
      loadTracked();
    } catch (e) {
      patchLocal(job._id, { status: prev });
      toast.error(e.response?.data?.message || "Could not update status");
    }
  };

  const openDetail = async (id) => {
    setOpenId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const { data } = await API.get(`/jobs/${id}`);
      setDetail({ job: data.job, skillsToLearn: data.skillsToLearn });
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load job");
      setOpenId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setOpenId(null);
    setDetail(null);
  };

  const startLearningPath = () => {
    if (!detail) return;
    navigate("/learning-path", {
      state: {
        fromJob: {
          jobId: detail.job._id,
          title: detail.job.title,
          company: detail.job.company,
          skills: detail.skillsToLearn.map((s) => s.name),
        },
      },
    });
  };

  const visible = useMemo(() => {
    if (tab === "recommended") return jobs;
    return applyClientFilters(tab === "saved" ? saved : applied, { ...filters, q: dq, location: dloc });
  }, [tab, jobs, saved, applied, filters, dq, dloc]);

  const isLoading = tab === "recommended" ? loading : trackedLoading;
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  const tabs = [
    { key: "recommended", label: "Recommended", count: total },
    { key: "saved", label: "Saved", count: saved.length },
    { key: "applied", label: "Applied", count: applied.length },
  ];

  const emptyText = {
    recommended: "No jobs match your filters. Try clearing some filters.",
    saved: "You have not saved any jobs yet. Use the bookmark icon on a job card.",
    applied: "No tracked applications yet. Change a job's status to Applied to track it here.",
  }[tab];

  return (
    <div className="min-h-screen p-6 text-slate-100 md:p-8">
      <div className="mx-auto w-full max-w-[1800px] space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Briefcase className="text-indigo-400" size={26} /> Job Recommendations
          </h1>
          <p className="mt-1 text-slate-400">Jobs ranked by how well they match your profile and latest resume skills.</p>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-300">
          <Info size={18} className="mt-0.5 shrink-0" />
          <p>
            {meta.liveEnabled
              ? "Live listings (marked Live) and sample listings (marked Sample, fictional companies) may both appear. "
              : "All jobs here are SAMPLE listings from seeded data with fictional companies. "}
            Match % is a heuristic: skill overlap weighted by required level, using your profile skills and resume skills
            (counted as Intermediate).
          </p>
        </div>

        {!meta.hasSkills && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            No skills found yet, so every match is 0%.{" "}
            <Link to="/profile" className="text-indigo-400 hover:text-indigo-300">
              Add skills in your profile
            </Link>{" "}
            or upload a resume to get meaningful matches.
          </div>
        )}

        <div className="flex gap-2 border-b border-white/10">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
                tab === t.key
                  ? "border-indigo-400 text-indigo-300"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {t.label} <span className="ml-1 text-xs text-slate-500">({t.count})</span>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={filters.q}
                onChange={(e) => setFilter("q", e.target.value)}
                placeholder="Title, company or skill"
                className={`${inputCls} pl-9`}
              />
            </div>
            <input
              value={filters.location}
              onChange={(e) => setFilter("location", e.target.value)}
              placeholder="Location"
              className={inputCls}
            />
            <select value={filters.workMode} onChange={(e) => setFilter("workMode", e.target.value)} className={inputCls}>
              <option value="">Any work mode</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite</option>
            </select>
            <select value={filters.jobType} onChange={(e) => setFilter("jobType", e.target.value)} className={inputCls}>
              <option value="">Any job type</option>
              <option value="full-time">Full-time</option>
              <option value="internship">Internship</option>
            </select>
            <select
              value={filters.experienceLevel}
              onChange={(e) => setFilter("experienceLevel", e.target.value)}
              className={inputCls}
            >
              <option value="">Any experience</option>
              <option value="Entry">Entry</option>
              <option value="Mid">Mid</option>
              <option value="Senior">Senior</option>
            </select>
            <select
              value={filters.minMatch}
              onChange={(e) => setFilter("minMatch", Number(e.target.value))}
              className={inputCls}
            >
              <option value={0}>Any match %</option>
              <option value={25}>Match 25%+</option>
              <option value={50}>Match 50%+</option>
              <option value={70}>Match 70%+</option>
              <option value={85}>Match 85%+</option>
            </select>
            <select value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)} className={inputCls}>
              <option value="match">Sort: Best match</option>
              <option value="newest">Sort: Newest</option>
            </select>
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              disabled={!filtersActive}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-40"
            >
              Clear filters
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="mr-2 animate-spin" size={20} /> Loading jobs...
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center">
            <Briefcase className="mx-auto mb-3 text-slate-500" size={32} />
            <p className="text-slate-400">{emptyText}</p>
            {tab === "recommended" && !filtersActive && (
              <p className="mt-2 text-xs text-slate-500">
                If you never seeded the jobs, run <code className="text-indigo-300">node scripts/seedJobs.js</code> in the
                backend folder.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {visible.map((job) => (
                <JobCard
                  key={job._id}
                  job={job}
                  onOpen={openDetail}
                  onToggleSave={toggleSave}
                  onStatus={changeStatus}
                />
              ))}
            </div>

            {tab === "recommended" && (
              <div className="flex flex-col items-center gap-2 pt-2">
                <p className="text-xs text-slate-500">
                  Showing {jobs.length} of {total} jobs
                </p>
                {hasMore && (
                  <button
                    onClick={() => fetchJobs(page + 1, true)}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-5 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
                  >
                    {loadingMore && <Loader2 size={14} className="animate-spin" />} Load more
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {openId && (
        <JobModal
          detail={detail}
          loading={detailLoading}
          onClose={closeDetail}
          onToggleSave={toggleSave}
          onStatus={changeStatus}
          onLearn={startLearningPath}
        />
      )}
    </div>
  );
}