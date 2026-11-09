import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Award,
  BarChart3,
  Bookmark,
  BookOpen,
  Briefcase,
  CalendarClock,
  ClipboardCheck,
  Compass,
  Gauge,
  Loader2,
  MessageSquare,
} from "lucide-react";
import API from "../services/api";

const cardCls = "rounded-xl border border-white/10 bg-white/5 p-5";
const chipBase = "rounded-full border px-2.5 py-0.5 text-xs";

const TOOLS = [
  { to: "/career-intelligence", icon: Compass, label: "Career Intelligence", desc: "See which careers match your skills." },
  { to: "/skill-analysis", icon: BarChart3, label: "Skill Analysis", desc: "Compare your skills with a target career." },
  { to: "/learning-path", icon: BookOpen, label: "Learning Path", desc: "Follow a plan built around your gaps." },
  { to: "/mock-interview", icon: MessageSquare, label: "Mock Interview", desc: "Practice questions with feedback." },
  { to: "/job-recommendations", icon: Briefcase, label: "Job Recommendations", desc: "Find and save roles that fit you." },
  { to: "/placement-drives", icon: CalendarClock, label: "Placement Drives", desc: "Check eligibility and deadlines." },
  { to: "/assessments", icon: ClipboardCheck, label: "Assessments", desc: "Take timed skill quizzes." },
  { to: "/certificates", icon: Award, label: "Certificates", desc: "Track certificates and expiry dates." },
];

const tone = (pct) => (pct >= 70 ? "text-green-300" : pct >= 40 ? "text-amber-300" : "text-red-300");
const formatDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium", timeZone: "UTC" }) : "");

function Stat({ to, icon: Icon, label, value, sub, valueClass = "text-slate-100" }) {
  return (
    <Link to={to} className={`${cardCls} block transition hover:bg-white/10`}>
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Icon className="h-4 w-4 text-indigo-400" />
        {label}
      </div>
      <p className={`mt-2 text-3xl font-bold ${valueClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </Link>
  );
}

export default function DashboardSummary() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await API.get("/dashboard/summary");
      setData(res.data.summary);
    } catch (e) {
      setFailed(true);
      toast.error(e?.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading your progress...</span>
        </div>
      ) : failed || !data ? (
        <div className={`${cardCls} text-center`}>
          <p className="text-slate-300">Could not load your dashboard data.</p>
          <button
            type="button"
            onClick={load}
            className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat
              to="/career-intelligence"
              icon={Gauge}
              label="Career readiness"
              value={data.readiness ? `${data.readiness.readiness}%` : "—"}
              valueClass={data.readiness ? tone(data.readiness.readiness) : undefined}
              sub={
                data.readiness
                  ? `${data.readiness.title} (heuristic estimate)`
                  : "Add skills to your profile to see this"
              }
            />
            <Stat
              to="/learning-path"
              icon={BookOpen}
              label="Learning path progress"
              value={data.learningPath?.percent != null ? `${data.learningPath.percent}%` : "—"}
              valueClass={data.learningPath?.percent != null ? tone(data.learningPath.percent) : undefined}
              sub={
                data.learningPath
                  ? data.learningPath.total
                    ? `${data.learningPath.done} of ${data.learningPath.total} steps done`
                    : data.learningPath.title || "In progress"
                  : "Create a learning path"
              }
            />
            <Stat
              to="/mock-interview"
              icon={MessageSquare}
              label="Latest mock interview"
              value={data.interview ? `${data.interview.totalScore}/100` : "—"}
              valueClass={data.interview ? tone(data.interview.totalScore) : undefined}
              sub={
                data.interview
                  ? `${data.interview.careerTitle} · ${formatDate(data.interview.completedAt)} (automated estimate)`
                  : "No interviews yet"
              }
            />
            <Stat
              to="/assessments"
              icon={ClipboardCheck}
              label="Latest assessment"
              value={data.assessment ? `${data.assessment.percentage}%` : "—"}
              valueClass={data.assessment ? tone(data.assessment.percentage) : undefined}
              sub={
                data.assessment
                  ? `${data.assessment.topic} · ${data.assessment.passed ? "Passed" : "Not passed"}`
                  : "No quizzes taken yet"
              }
            />
            <Stat
              to="/job-recommendations"
              icon={Bookmark}
              label="Saved jobs"
              value={data.savedJobs === null ? "—" : data.savedJobs}
              sub={data.savedJobs === null ? "Not available yet" : "Roles you saved"}
            />
            <Stat
              to="/certificates"
              icon={Award}
              label="Certificates"
              value={data.certificates.total}
              sub={
                data.certificates.expiringSoon
                  ? `${data.certificates.expiringSoon} expiring within 60 days`
                  : "User-provided, not verified"
              }
              valueClass="text-indigo-300"
            />
          </div>

          <div className={cardCls}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-semibold text-slate-100">
                <CalendarClock className="h-4 w-4 text-indigo-400" /> Upcoming drive deadlines
              </h3>
              <Link to="/placement-drives" className="text-sm text-indigo-400 hover:text-indigo-300">
                View all
              </Link>
            </div>
            {data.drives.length === 0 ? (
              <p className="text-sm text-slate-400">No open registration deadlines right now.</p>
            ) : (
              <ul className="space-y-2">
                {data.drives.map((d) => (
                  <li key={d._id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-slate-200">
                      {d.company} <span className="text-slate-400">· {d.role}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      {d.isSample && <span className={`${chipBase} border-amber-300/30 bg-amber-300/10 text-amber-300`}>SAMPLE</span>}
                      {d.saved && <span className={`${chipBase} border-indigo-400/30 bg-indigo-400/10 text-indigo-300`}>Saved</span>}
                      <span className={d.daysLeft <= 3 ? "text-amber-300" : "text-slate-400"}>
                        {d.daysLeft === 0 ? "Last day" : `${d.daysLeft} day${d.daysLeft === 1 ? "" : "s"} left`} · {formatDate(d.registrationDeadline)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <div>
        <h3 className="mb-3 font-semibold text-slate-100">Tools</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((t) => (
            <Link key={t.to} to={t.to} className={`${cardCls} block transition hover:bg-white/10`}>
              <t.icon className="h-5 w-5 text-indigo-400" />
              <p className="mt-3 font-medium text-slate-100">{t.label}</p>
              <p className="mt-1 text-sm text-slate-400">{t.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}