import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Circle,
  HelpCircle,
  Inbox,
  Info,
  LifeBuoy,
  Loader2,
  Rocket,
  Search,
  Send,
} from "lucide-react";
import API from "../services/api";

// Check this against your navigation.js
const RESUME_PATH = "/resume-analyzer";

const STEPS = {
  profile: { label: "Complete your profile", desc: "Add education, skills, interests and a preferred career.", path: "/profile" },
  resume: { label: "Upload your resume", desc: "Let the Resume Analyzer extract your skills and insights.", path: RESUME_PATH },
  careers: { label: "Explore career matches", desc: "See how your skills line up with each career.", path: "/career-intelligence" },
  learningPath: { label: "Create a learning path", desc: "Turn your skill gaps into a step-by-step plan.", path: "/learning-path" },
  mockInterview: { label: "Finish a mock interview", desc: "Practice career-specific questions.", path: "/mock-interview" },
  assessment: { label: "Take a skill assessment", desc: "Complete a timed quiz on a topic.", path: "/assessments" },
  certificate: { label: "Add a certificate", desc: "Record a certificate and the skills it shows.", path: "/certificates" },
};

const CATEGORY_OPTIONS = [
  ["technical", "Technical issue"],
  ["account", "Account"],
  ["feedback", "Feedback or idea"],
  ["question", "Question"],
  ["other", "Other"],
];
const CATEGORY_LABEL = Object.fromEntries(CATEGORY_OPTIONS);

const STATUS_META = {
  open: { label: "Open", tone: "indigo" },
  in_progress: { label: "In progress", tone: "amber" },
  resolved: { label: "Resolved", tone: "green" },
  closed: { label: "Closed", tone: "slate" },
};

const FAQS = [
  { id: "start", category: "Getting started", q: "How do I get started with CareerInfinity?",
    a: "Complete your profile, upload your resume, explore your career matches and create a learning path. The Getting started tab on this page tracks which of these steps you have finished." },
  { id: "profile", category: "Profile & Resume", q: "What should my profile contain?",
    a: "Add your education, your skills with a level (Beginner, Intermediate or Advanced), your interests and a preferred career. CGPA, branch and graduation year are optional and are only used to check eligibility for placement drives." },
  { id: "levels", category: "Profile & Resume", q: "What do the skill levels mean?",
    a: "Beginner means you are learning the basics, Intermediate means you can use the skill on your own, and Advanced means you can handle complex work and guide others. Skills found in your resume count as Intermediate." },
  { id: "resume-types", category: "Profile & Resume", q: "Which resume files can I upload?",
    a: "PDF, DOCX and TXT files up to 5 MB. If your file is rejected, check the format and size, and make sure it is not password protected." },
  { id: "resume-missing", category: "Profile & Resume", q: "Why are some of my skills missing after the resume analysis?",
    a: "Skill extraction is rule-assisted, so it can miss unusual wording or skills inside images. Add anything missing to your profile by hand." },
  { id: "matches", category: "Careers & Learning", q: "How are career matches calculated?",
    a: "Your skills (from your profile and resume) are compared with the required skills of each career. The result is a heuristic estimate to guide your choices, not a guarantee of fit or of getting a job." },
  { id: "learning", category: "Careers & Learning", q: "How do I use the Learning Path?",
    a: "Open Learning Path from the sidebar and create a path for a career you are aiming at. It is built around the skills you are missing, so keep your profile up to date for better results." },
  { id: "mock-score", category: "Practice & Assessments", q: "How is my Mock Interview scored?",
    a: "Each answer gets an automated estimate from 0 to 10 based on keyword coverage, answer length and structure, and, when the AI service is running, semantic similarity to a model answer. It is a practice guide, not a real evaluation." },
  { id: "mock-semantic", category: "Practice & Assessments", q: "Why does my interview result say semantic similarity was not used?",
    a: "The AI service could not be reached, so scoring fell back to keywords, length and structure only. Your interview still works. Start the AI service and try again to include similarity." },
  { id: "assess", category: "Practice & Assessments", q: "How do Assessments work?",
    a: "Pick a topic, a number of questions and a time limit. Answers are graded on the server, the quiz auto-submits when time runs out, and the pass mark is 60%. After you submit you can review every question with its explanation." },
  { id: "assess-skill", category: "Practice & Assessments", q: "What happens when I score 70% or more?",
    a: "You are offered the option to add that topic to your profile as an Intermediate skill. Nothing changes until you click the confirm button, and existing higher levels are never lowered." },
  { id: "cert-verified", category: "Certificates & Drives", q: "Are my certificates verified?",
    a: "No. Certificates are user-provided and are not verified by CareerInfinity. You can attach a PDF, PNG or JPG up to 5 MB. Files are private and only you can open them." },
  { id: "cert-expiry", category: "Certificates & Drives", q: "How do certificate expiry warnings and skill sync work?",
    a: "Certificates that expire within 60 days are flagged. Sync skills to profile adds the skills from your active certificates as Intermediate after you confirm. Expired certificates are skipped and skills are never lowered." },
  { id: "drives-real", category: "Certificates & Drives", q: "Are the placement drives real?",
    a: "No. The drives shown are sample data with fictional companies, loaded by a seed script for demonstration. Register interest and Add reminder are saved in CareerInfinity only. They do not apply to a company and no notification is sent." },
  { id: "drives-elig", category: "Certificates & Drives", q: "How does the eligibility check work?",
    a: "Your CGPA, branch and graduation year are compared with each drive's rules, and your skills are compared with its required skills. Missing details show as Partially eligible. It is an automated estimate, so always confirm with the company's official criteria." },
  { id: "name-pass", category: "Account", q: "How do I change my name or password?",
    a: "Open Settings, then the Account tab. To change your password you must enter your current password first." },
  { id: "delete", category: "Account", q: "How do I delete my account?",
    a: "Open Settings, then the Danger zone tab. You must enter your password and type DELETE. Your profile, resumes, results, certificates, saved drives and tickets are permanently removed and this cannot be undone." },
  { id: "privacy", category: "Account", q: "Who can see my data?",
    a: "Your data is tied to your account and other users cannot open it. You can remove everything at any time by deleting your account in Settings." },
  { id: "contact", category: "Account", q: "How do I contact support?",
    a: "Use the Contact support tab to send a message. It is saved as a ticket that you can follow under My tickets. There is no live chat or email, and a reply time cannot be promised." },
];

const FAQ_CATEGORIES = ["All", ...new Set(FAQS.map((f) => f.category))];

const errMsg = (e, fallback) => e?.response?.data?.message || fallback;
const formatDate = (d) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";

const cardCls = "rounded-xl border border-white/10 bg-white/5 p-5";
const chipBase = "rounded-full border px-2.5 py-0.5 text-xs";
const inputCls =
  "w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400";

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

function Spinner({ text }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

/* ------------------------------- FAQ ------------------------------- */
function FaqTab() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [openId, setOpenId] = useState(null);

  const filtered = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    return FAQS.filter(
      (f) =>
        (cat === "All" || f.category === cat) &&
        tokens.every((t) => `${f.q} ${f.a} ${f.category}`.toLowerCase().includes(t))
    );
  }, [query, cat]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions, e.g. resume, password, certificate"
          aria-label="Search FAQ"
          className={`${inputCls} pl-9`}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {FAQ_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={`${chipBase} transition ${
              cat === c
                ? "border-indigo-400 bg-indigo-500/30 text-indigo-100"
                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-500">
        Showing {filtered.length} of {FAQS.length} questions
      </p>

      {filtered.length === 0 ? (
        <div className={`${cardCls} text-center`}>
          <HelpCircle className="mx-auto h-8 w-8 text-slate-500" />
          <p className="mt-3 text-slate-300">No questions match your search.</p>
          <p className="mt-1 text-sm text-slate-400">Try different words, or send us a message in the Contact support tab.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((f) => {
            const open = openId === f.id;
            return (
              <div key={f.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : f.id)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-white/5"
                >
                  <span>
                    <span className="block text-xs text-indigo-300">{f.category}</span>
                    <span className="font-medium text-slate-100">{f.q}</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
                </button>
                {open && <p className="border-t border-white/10 px-4 pb-4 pt-3 text-sm leading-relaxed text-slate-300">{f.a}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* --------------------------- Getting started --------------------------- */
function StartTab({ progress, loading, error, onRetry }) {
  if (loading) return <Spinner text="Checking your progress..." />;

  if (error || !progress) {
    return (
      <div className={`${cardCls} text-center`}>
        <Info className="mx-auto h-8 w-8 text-slate-500" />
        <p className="mt-3 text-slate-300">Could not load your progress.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
        >
          Try again
        </button>
      </div>
    );
  }

  const pct = progress.total ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className={cardCls}>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-slate-300">
            {progress.completed} of {progress.total} steps done
          </span>
          <span className="font-semibold text-indigo-300">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        {pct === 100 && <p className="mt-3 text-sm text-green-300">All steps complete. Nice work.</p>}
      </div>

      <div className="space-y-3">
        {progress.items
          .filter((i) => STEPS[i.key])
          .map((i) => {
            const meta = STEPS[i.key];
            return (
              <div key={i.key} className={`${cardCls} flex items-start gap-3`}>
                {i.done ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-300" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={`font-medium ${i.done ? "text-slate-300" : "text-slate-100"}`}>{meta.label}</p>
                  <p className="text-sm text-slate-400">{meta.desc}</p>
                  {!i.done && i.detail && <p className="mt-1 text-sm text-amber-300">{i.detail}</p>}
                </div>
                {i.done ? (
                  <Badge tone="green">Done</Badge>
                ) : (
                  <Link
                    to={meta.path}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-400"
                  >
                    Go <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

/* ------------------------------ Contact ------------------------------ */
function ContactTab({ onSent }) {
  const [form, setForm] = useState({ category: "question", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const subject = form.subject.trim();
    const message = form.message.trim();
    if (subject.length < 3) return setError("Subject must be at least 3 characters");
    if (message.length < 10) return setError("Message must be at least 10 characters");
    setError("");
    setSending(true);
    try {
      await API.post("/support/tickets", { category: form.category, subject, message });
      toast.success("Your message was saved as a ticket");
      setForm({ category: "question", subject: "", message: "" });
      onSent();
    } catch (err) {
      setError(errMsg(err, "Could not send your message"));
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className={`${cardCls} space-y-4`}>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm text-slate-300">Category</label>
          <select value={form.category} onChange={set("category")} className={inputCls}>
            {CATEGORY_OPTIONS.map(([v, l]) => (
              <option key={v} value={v} className="bg-slate-900">{l}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-slate-300">Subject</label>
          <input value={form.subject} onChange={set("subject")} maxLength={120} placeholder="Short summary" className={inputCls} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-300">Message</label>
        <textarea
          value={form.message}
          onChange={set("message")}
          maxLength={2000}
          rows={7}
          placeholder="Describe what happened or what you would like to see. Do not include passwords."
          className={`${inputCls} resize-y`}
        />
        <p className="mt-1 text-right text-xs text-slate-500">{form.message.length} / 2000</p>
      </div>

      <p className="flex items-start gap-2 text-xs text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Messages are saved as tickets in CareerInfinity. There is no live chat or email, and a reply time cannot be promised.
      </p>

      {error && (
        <p className="rounded-lg border border-red-300/30 bg-red-300/10 px-3 py-2 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {sending ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}

/* ------------------------------ Tickets ------------------------------ */
function TicketsTab({ tickets, loading, onNew }) {
  if (loading) return <Spinner text="Loading your tickets..." />;

  if (!tickets.length) {
    return (
      <div className={`${cardCls} text-center`}>
        <Inbox className="mx-auto h-8 w-8 text-slate-500" />
        <p className="mt-3 text-slate-300">You have not sent any tickets.</p>
        <button
          type="button"
          onClick={onNew}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
        >
          <Send className="h-4 w-4" /> Contact support
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((t) => {
        const st = STATUS_META[t.status] || STATUS_META.open;
        return (
          <div key={t._id} className={`${cardCls} space-y-2`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-medium text-slate-100">{t.subject}</p>
              <Badge tone={st.tone}>{st.label}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-400">
              <Badge>{CATEGORY_LABEL[t.category] || t.category}</Badge>
              <span className="self-center">{formatDate(t.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap rounded-lg bg-slate-900/50 p-3 text-sm text-slate-300">{t.message}</p>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------- Page ------------------------------- */
export default function HelpSupport() {
  const [tab, setTab] = useState("start"); // start | faq | contact | tickets

  const [progress, setProgress] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [progressError, setProgressError] = useState(false);

  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const loadProgress = useCallback(async () => {
    setLoadingProgress(true);
    setProgressError(false);
    try {
      const res = await API.get("/support/progress");
      setProgress(res.data);
    } catch (e) {
      setProgressError(true);
      toast.error(errMsg(e, "Failed to load your progress"));
    } finally {
      setLoadingProgress(false);
    }
  }, []);

  const loadTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const res = await API.get("/support/tickets");
      setTickets(res.data?.tickets || []);
    } catch (e) {
      toast.error(errMsg(e, "Failed to load your tickets"));
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    loadProgress();
    loadTickets();
  }, [loadProgress, loadTickets]);

  const afterSent = async () => {
    await loadTickets();
    setTab("tickets");
  };

  const tabCls = (active) =>
    `inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition ${
      active ? "bg-indigo-500 text-white" : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
    }`;

  return (
    <div className="min-h-screen p-6 md:p-8 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <LifeBuoy className="h-6 w-6 text-indigo-400" />
            Help &amp; Support
          </h1>
          <p className="mt-1 text-sm text-slate-400">Find answers, track your setup progress or send us a message.</p>
        </header>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setTab("start")} className={tabCls(tab === "start")}>
            <Rocket className="h-4 w-4" /> Getting started
          </button>
          <button type="button" onClick={() => setTab("faq")} className={tabCls(tab === "faq")}>
            <HelpCircle className="h-4 w-4" /> FAQ
          </button>
          <button type="button" onClick={() => setTab("contact")} className={tabCls(tab === "contact")}>
            <Send className="h-4 w-4" /> Contact support
          </button>
          <button type="button" onClick={() => setTab("tickets")} className={tabCls(tab === "tickets")}>
            <Inbox className="h-4 w-4" /> My tickets{tickets.length ? ` (${tickets.length})` : ""}
          </button>
        </div>

        {tab === "start" && (
          <StartTab progress={progress} loading={loadingProgress} error={progressError} onRetry={loadProgress} />
        )}
        {tab === "faq" && <FaqTab />}
        {tab === "contact" && <ContactTab onSent={afterSent} />}
        {tab === "tickets" && <TicketsTab tickets={tickets} loading={loadingTickets} onNew={() => setTab("contact")} />}
      </div>
    </div>
  );
}