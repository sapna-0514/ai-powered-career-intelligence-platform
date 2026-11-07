import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Flag,
  History as HistoryIcon,
  Info,
  Lightbulb,
  Loader2,
  MessageSquare,
  Play,
  RotateCcw,
  SkipForward,
  Target,
  Timer,
  Trophy,
  XCircle,
} from "lucide-react";
import API from "../services/api";

const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const COUNTS = [5, 10];
const TIMER_OPTIONS = [60, 120, 180];

const errMsg = (e, fallback) => e?.response?.data?.message || fallback;
const formatDate = (d) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";
const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const barColor = (s) => (s >= 7 ? "#86efac" : s >= 4 ? "#fcd34d" : "#fca5a5");
const scoreTextClass = (s) => (s >= 7 ? "text-green-300" : s >= 4 ? "text-amber-300" : "text-red-300");

const cardCls = "rounded-xl border border-white/10 bg-white/5 p-5";
const chipBase = "rounded-full border px-2.5 py-0.5 text-xs";

function Spinner({ text }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "border-white/10 bg-white/5 text-slate-300",
    indigo: "border-indigo-400/30 bg-indigo-400/10 text-indigo-300",
    amber: "border-amber-300/30 bg-amber-300/10 text-amber-300",
  };
  return <span className={`${chipBase} ${tones[tone]}`}>{children}</span>;
}

function OptionButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-2 text-sm transition ${
        active
          ? "border-indigo-400 bg-indigo-500/20 text-indigo-200"
          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------------------------- Setup ---------------------------- */
function SetupView({ careers, loading, form, setForm, onStart, starting }) {
  if (loading) return <Spinner text="Loading careers..." />;

  if (!careers.length) {
    return (
      <div className={`${cardCls} text-center`}>
        <Target className="mx-auto h-8 w-8 text-slate-500" />
        <p className="mt-3 text-slate-300">No careers found.</p>
        <p className="mt-1 text-sm text-slate-400">
          Add careers to the database first (see Career Intelligence), then come back.
        </p>
      </div>
    );
  }

  return (
    <div className={`${cardCls} space-y-6`}>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Target career</label>
        <select
          value={form.careerId}
          onChange={(e) => setForm((f) => ({ ...f, careerId: e.target.value }))}
          className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400"
        >
          {careers.map((c) => (
            <option key={c._id} value={c._id} className="bg-slate-900">
              {c.title}
              {c.category ? ` (${c.category})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Difficulty</label>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTIES.map((d) => (
            <OptionButton key={d} active={form.difficulty === d} onClick={() => setForm((f) => ({ ...f, difficulty: d }))}>
              {d}
            </OptionButton>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Number of questions</label>
        <div className="flex flex-wrap gap-2">
          {COUNTS.map((n) => (
            <OptionButton key={n} active={form.count === n} onClick={() => setForm((f) => ({ ...f, count: n }))}>
              {n} questions
            </OptionButton>
          ))}
        </div>
      </div>

      <div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-300">
          <input
            type="checkbox"
            checked={form.timerEnabled}
            onChange={(e) => setForm((f) => ({ ...f, timerEnabled: e.target.checked }))}
            className="h-4 w-4 accent-indigo-500"
          />
          <Timer className="h-4 w-4 text-indigo-400" />
          Per-question timer (optional)
        </label>
        {form.timerEnabled && (
          <div className="mt-3 flex flex-wrap gap-2">
            {TIMER_OPTIONS.map((s) => (
              <OptionButton key={s} active={form.timerSeconds === s} onClick={() => setForm((f) => ({ ...f, timerSeconds: s }))}>
                {s / 60} min
              </OptionButton>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Scores are an <strong>automated estimate</strong> based on keyword coverage, answer length/structure and
          (when available) semantic similarity. They are a practice guide, not a real evaluation.
        </p>
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={starting || !form.careerId}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {starting ? "Preparing..." : "Start interview"}
      </button>
    </div>
  );
}

/* --------------------------- Interview --------------------------- */
function InterviewView({
  session, questions, index, answer, onChange, onNext, onSkip, onEnd, onQuit,
  submitting, timerEnabled, secondsLeft,
}) {
  const q = questions[index];
  const isLast = index === questions.length - 1;
  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const pct = Math.round(((index + 1) / questions.length) * 100);
  const lowTime = timerEnabled && secondsLeft <= 15;

  return (
    <div className="space-y-4">
      <div className={cardCls}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-slate-300">
            {session.careerTitle} · {session.difficulty}
          </span>
          <span className="text-slate-400">
            Question {index + 1} of {questions.length}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className={`${cardCls} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Badge tone="indigo">{q.type}</Badge>
            <Badge>{q.difficulty}</Badge>
          </div>
          {timerEnabled && (
            <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${lowTime ? "text-amber-300" : "text-slate-300"}`}>
              <Timer className="h-4 w-4" />
              {formatTime(Math.max(secondsLeft, 0))}
            </span>
          )}
        </div>

        <h2 className="text-lg font-semibold leading-snug text-slate-100">{q.question}</h2>

        <div>
          <textarea
            value={answer}
            onChange={(e) => onChange(e.target.value)}
            disabled={submitting}
            rows={8}
            maxLength={5000}
            placeholder="Type your answer here. Explain your reasoning and give an example where it helps."
            className="w-full resize-y rounded-lg border border-white/10 bg-slate-900/60 p-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400 disabled:opacity-60"
          />
          <p className="mt-1 text-right text-xs text-slate-500">{words} words</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onQuit}
            disabled={submitting}
            className="text-sm text-slate-400 transition hover:text-slate-200 disabled:opacity-50"
          >
            Cancel interview
          </button>
          <div className="flex flex-wrap gap-2">
            {!isLast && (
              <button
                type="button"
                onClick={onEnd}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
              >
                <Flag className="h-4 w-4" />
                Finish now
              </button>
            )}
            <button
              type="button"
              onClick={onSkip}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
            >
              <SkipForward className="h-4 w-4" />
              Skip
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={submitting || !answer.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isLast ? (
                <Flag className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Result ----------------------------- */
function ResultView({ result, from, onBack, onNew }) {
  const answers = result.answers || [];
  const chartData = answers.map((a, i) => ({ name: `Q${i + 1}`, score: a.score }));
  const answeredCount = answers.filter((a) => !a.skipped).length;
  const usedSemantic = answers.some((a) => a.method === "hybrid");
  const total = result.totalScore ?? 0;
  const totalTen = total / 10;

  return (
    <div className="space-y-6">
      <div className={`${cardCls} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
        <div>
          <div className="flex items-center gap-2 text-slate-400">
            <Trophy className="h-5 w-5 text-indigo-400" />
            <span className="text-sm">Overall score</span>
            <Badge tone="amber">automated estimate</Badge>
          </div>
          <p className={`mt-2 text-5xl font-bold ${scoreTextClass(totalTen)}`}>
            {total}
            <span className="text-xl font-medium text-slate-500"> / 100</span>
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {result.careerTitle} · {result.difficulty} · {answeredCount}/{answers.length} answered
          </p>
          <p className="text-xs text-slate-500">{formatDate(result.completedAt)}</p>
        </div>
        <div className="max-w-sm text-xs text-slate-400">
          <Info className="mb-1 h-4 w-4 text-slate-500" />
          Heuristic scoring: keyword coverage, length and structure
          {usedSemantic ? ", plus semantic similarity to a model answer (AI service)." : ". Semantic similarity was not used."}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className={cardCls}>
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-green-300">
            <CheckCircle2 className="h-4 w-4" /> Strengths
          </h3>
          <ul className="space-y-2 text-sm text-slate-300">
            {(result.summary?.strengths || []).map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>
        <div className={cardCls}>
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-amber-300">
            <Target className="h-4 w-4" /> Areas to improve
          </h3>
          <ul className="space-y-2 text-sm text-slate-300">
            {(result.summary?.weaknesses || []).map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className={cardCls}>
        <h3 className="mb-4 font-semibold text-slate-100">Score by question (out of 10)</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} stroke="rgba(255,255,255,0.15)" />
              <YAxis domain={[0, 10]} tick={{ fill: "#94a3b8", fontSize: 12 }} stroke="rgba(255,255,255,0.15)" />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  color: "#e2e8f0",
                }}
              />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={barColor(d.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-slate-100">Question feedback</h3>
        {answers.map((a, i) => (
          <div key={i} className={`${cardCls} space-y-3`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <Badge>Q{i + 1}</Badge>
                <Badge tone="indigo">{a.type}</Badge>
                {a.difficulty && <Badge>{a.difficulty}</Badge>}
                {a.skipped && <Badge tone="amber">skipped</Badge>}
              </div>
              <span className={`text-lg font-bold ${scoreTextClass(a.score)}`}>{a.score}/10</span>
            </div>

            <p className="font-medium text-slate-100">{a.question}</p>

            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Your answer</p>
              <p className="whitespace-pre-wrap rounded-lg bg-slate-900/50 p-3 text-sm text-slate-300">
                {a.answer || "No answer given."}
              </p>
            </div>

            {a.matched?.length > 0 && (
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Matched keywords</p>
                <div className="flex flex-wrap gap-2">
                  {a.matched.map((k) => (
                    <span key={k} className={`${chipBase} inline-flex items-center gap-1 border-green-300/30 bg-green-300/10 text-green-300`}>
                      <CheckCircle2 className="h-3 w-3" /> {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {a.missed?.length > 0 && (
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Missed keywords</p>
                <div className="flex flex-wrap gap-2">
                  {a.missed.map((k) => (
                    <span key={k} className={`${chipBase} inline-flex items-center gap-1 border-red-300/30 bg-red-300/10 text-red-300`}>
                      <XCircle className="h-3 w-3" /> {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {a.feedback?.length > 0 && (
              <div className="rounded-lg border border-indigo-400/20 bg-indigo-400/5 p-3">
                <p className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide text-indigo-300">
                  <Lightbulb className="h-3.5 w-3.5" /> Tips
                </p>
                <ul className="space-y-1 text-sm text-slate-300">
                  {a.feedback.map((t, j) => (
                    <li key={j}>• {t}</li>
                  ))}
                </ul>
              </div>
            )}

            {a.modelAnswer && (
              <details className="group">
                <summary className="cursor-pointer text-sm text-indigo-400 hover:text-indigo-300">
                  Show model answer
                </summary>
                <p className="mt-2 rounded-lg bg-slate-900/50 p-3 text-sm text-slate-300">{a.modelAnswer}</p>
              </details>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {from === "history" && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" /> Back to history
          </button>
        )}
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
        >
          <RotateCcw className="h-4 w-4" /> New interview
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- History ----------------------------- */
function HistoryView({ items, loading, openingId, onOpen, onNew }) {
  if (loading) return <Spinner text="Loading history..." />;

  if (!items.length) {
    return (
      <div className={`${cardCls} text-center`}>
        <HistoryIcon className="mx-auto h-8 w-8 text-slate-500" />
        <p className="mt-3 text-slate-300">No interviews yet.</p>
        <p className="mt-1 text-sm text-slate-400">Complete a mock interview and it will show up here.</p>
        <button
          type="button"
          onClick={onNew}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
        >
          <Play className="h-4 w-4" /> Start your first interview
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((s) => {
        const ten = (s.totalScore || 0) / 10;
        return (
          <button
            key={s._id}
            type="button"
            onClick={() => onOpen(s._id)}
            disabled={openingId === s._id}
            className={`${cardCls} flex w-full items-center justify-between gap-4 text-left transition hover:bg-white/10 disabled:opacity-60`}
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-100">{s.careerTitle}</p>
              <p className="mt-1 text-sm text-slate-400">
                {s.difficulty} · {s.questionCount} questions · {formatDate(s.completedAt || s.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className={`text-xl font-bold ${scoreTextClass(ten)}`}>{s.totalScore}</span>
              {openingId === s._id ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-500" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------ Page ------------------------------ */
export default function MockInterview() {
  const [view, setView] = useState("setup"); // setup | interview | result | history
  const [careers, setCareers] = useState([]);
  const [loadingCareers, setLoadingCareers] = useState(true);
  const [form, setForm] = useState({
    careerId: "",
    difficulty: "Medium",
    count: 5,
    timerEnabled: false,
    timerSeconds: 120,
  });
  const [starting, setStarting] = useState(false);

  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [drafts, setDrafts] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const questionStartRef = useRef(Date.now());

  const [result, setResult] = useState(null);
  const [resultFrom, setResultFrom] = useState("interview");
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [openingId, setOpeningId] = useState(null);

  // Load careers once
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await API.get("/careers");
        const list = Array.isArray(res.data) ? res.data : res.data?.careers || res.data?.data || [];
        if (!active) return;
        setCareers(list);
        if (list.length) setForm((f) => ({ ...f, careerId: f.careerId || list[0]._id }));
      } catch (e) {
        toast.error(errMsg(e, "Failed to load careers"));
      } finally {
        if (active) setLoadingCareers(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await API.get("/interviews");
      setHistory(res.data?.sessions || []);
    } catch (e) {
      toast.error(errMsg(e, "Failed to load interview history"));
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const showHistory = () => {
    setView("history");
    loadHistory();
  };

  const startInterview = async () => {
    if (!form.careerId) return toast.error("Please select a career");
    setStarting(true);
    try {
      const res = await API.post("/interviews/start", {
        careerId: form.careerId,
        difficulty: form.difficulty,
        count: form.count,
      });
      setSession(res.data.session);
      setQuestions(res.data.questions);
      setIndex(0);
      setDrafts({});
      if (res.data.notice) toast(res.data.notice);
      setView("interview");
    } catch (e) {
      toast.error(errMsg(e, "Failed to start interview"));
    } finally {
      setStarting(false);
    }
  };

  // Reset per-question clock and timer whenever the question changes
  useEffect(() => {
    questionStartRef.current = Date.now();
    if (view !== "interview" || !form.timerEnabled) return undefined;
    setSecondsLeft(form.timerSeconds);
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [view, index, form.timerEnabled, form.timerSeconds]);

  const advance = async ({ skip = false, finish = false } = {}) => {
    if (submitting || !session) return;
    const q = questions[index];
    const text = (drafts[q._id] || "").trim();
    const skipped = skip || !text;
    const isLast = index === questions.length - 1;

    setSubmitting(true);
    try {
      try {
        await API.post(`/interviews/${session._id}/answer`, {
          questionId: q._id,
          answer: skipped ? "" : text,
          skipped,
          timeTaken: Math.round((Date.now() - questionStartRef.current) / 1000),
        });
      } catch (e) {
        if (e?.response?.status !== 409) throw e; // already saved earlier, continue
      }

      if (isLast || finish) {
        const res = await API.post(`/interviews/${session._id}/finish`);
        setResult(res.data.session);
        setResultFrom("interview");
        setView("result");
      } else {
        setIndex((i) => i + 1);
      }
    } catch (e) {
      toast.error(errMsg(e, "Could not save your answer. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  // Always call the latest version of advance from the timer
  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  useEffect(() => {
    if (view === "interview" && form.timerEnabled && secondsLeft === 0) {
      toast("Time is up for this question.");
      advanceRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const endEarly = () => {
    if (window.confirm("Finish now? Unanswered questions will be marked as skipped.")) {
      advance({ finish: true });
    }
  };

  const quitInterview = () => {
    if (window.confirm("Cancel this interview? Your answers will not be scored.")) {
      setSession(null);
      setQuestions([]);
      setView("setup");
    }
  };

  const openHistoryItem = async (id) => {
    setOpeningId(id);
    try {
      const res = await API.get(`/interviews/${id}`);
      setResult(res.data.session);
      setResultFrom("history");
      setView("result");
    } catch (e) {
      toast.error(errMsg(e, "Failed to open interview"));
    } finally {
      setOpeningId(null);
    }
  };

  const tabCls = (active) =>
    `inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition ${
      active
        ? "bg-indigo-500 text-white"
        : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
    }`;

  return (
    <div className="min-h-screen p-6 md:p-8 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <MessageSquare className="h-6 w-6 text-indigo-400" />
              Mock Interview
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Practice career-specific questions and get an automated estimate of your answers.
            </p>
          </div>
          {view !== "interview" && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setView("setup")} className={tabCls(view === "setup")}>
                <Play className="h-4 w-4" /> New interview
              </button>
              <button type="button" onClick={showHistory} className={tabCls(view === "history")}>
                <HistoryIcon className="h-4 w-4" /> History
              </button>
            </div>
          )}
        </header>

        {view === "setup" && (
          <SetupView
            careers={careers}
            loading={loadingCareers}
            form={form}
            setForm={setForm}
            onStart={startInterview}
            starting={starting}
          />
        )}

        {view === "interview" && session && questions[index] && (
          <InterviewView
            session={session}
            questions={questions}
            index={index}
            answer={drafts[questions[index]._id] || ""}
            onChange={(v) => setDrafts((d) => ({ ...d, [questions[index]._id]: v }))}
            onNext={() => advance()}
            onSkip={() => advance({ skip: true })}
            onEnd={endEarly}
            onQuit={quitInterview}
            submitting={submitting}
            timerEnabled={form.timerEnabled}
            secondsLeft={secondsLeft}
          />
        )}

        {view === "result" && result && (
          <ResultView
            result={result}
            from={resultFrom}
            onBack={showHistory}
            onNew={() => setView("setup")}
          />
        )}

        {view === "history" && (
          <HistoryView
            items={history}
            loading={loadingHistory}
            openingId={openingId}
            onOpen={openHistoryItem}
            onNew={() => setView("setup")}
          />
        )}
      </div>
    </div>
  );
}