import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  History as HistoryIcon,
  Info,
  Loader2,
  Play,
  PlusCircle,
  RotateCcw,
  Send,
  Timer,
  TrendingUp,
  XCircle,
} from "lucide-react";
import API from "../services/api";

// Change these if your profile endpoints differ
const PROFILE_URL = "/profile";
const PROFILE_SAVE_METHOD = "put"; // "put" | "patch" | "post"

const PASS_MARK = 60;
const OFFER_MARK = 70;
const COUNT_OPTIONS = [5, 10, 15];
const MINUTE_OPTIONS = [5, 10, 15, 20, 30];
const LINE_COLORS = ["#818cf8", "#86efac", "#fcd34d", "#fca5a5", "#67e8f9", "#f0abfc"];

const errMsg = (e, fallback) => e?.response?.data?.message || fallback;
const formatDate = (d) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";
const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const pctClass = (p) => (p >= OFFER_MARK ? "text-green-300" : p >= PASS_MARK ? "text-amber-300" : "text-red-300");
const letter = (i) => String.fromCharCode(65 + i);

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
    green: "border-green-300/30 bg-green-300/10 text-green-300",
    amber: "border-amber-300/30 bg-amber-300/10 text-amber-300",
    red: "border-red-300/30 bg-red-300/10 text-red-300",
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

/* ---------------------------- Topics ---------------------------- */
function TopicsView({ topics, loading, selected, onSelect, config, setConfig, onStart, starting }) {
  if (loading) return <Spinner text="Loading topics..." />;

  if (!topics.length) {
    return (
      <div className={`${cardCls} text-center`}>
        <ClipboardCheck className="mx-auto h-8 w-8 text-slate-500" />
        <p className="mt-3 text-slate-300">No assessments available yet.</p>
        <p className="mt-1 text-sm text-slate-400">
          Seed the question bank with <code className="text-indigo-300">npm run seed:assessments</code> in the backend folder.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((t) => {
          const active = selected === t.topic;
          return (
            <button
              key={t.topic}
              type="button"
              onClick={() => onSelect(t.topic)}
              className={`rounded-xl border p-5 text-left transition ${
                active ? "border-indigo-400 bg-indigo-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-100">{t.topic}</h3>
                {active && <CheckCircle2 className="h-5 w-5 shrink-0 text-indigo-400" />}
              </div>
              <p className="mt-1 text-sm text-slate-400">{t.questionCount} questions in bank</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <Badge>{t.attempts} attempt{t.attempts === 1 ? "" : "s"}</Badge>
                {t.bestPercentage !== null && (
                  <Badge tone={t.bestPercentage >= PASS_MARK ? "green" : "amber"}>Best {t.bestPercentage}%</Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className={`${cardCls} space-y-6`}>
        <h3 className="font-semibold text-slate-100">
          {selected ? `Configure: ${selected}` : "Select a topic above to configure your quiz"}
        </h3>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">Number of questions</label>
          <div className="flex flex-wrap gap-2">
            {COUNT_OPTIONS.map((n) => (
              <OptionButton key={n} active={config.count === n} onClick={() => setConfig((c) => ({ ...c, count: n }))}>
                {n} questions
              </OptionButton>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
            <Timer className="h-4 w-4 text-indigo-400" /> Time limit
          </label>
          <div className="flex flex-wrap gap-2">
            {MINUTE_OPTIONS.map((m) => (
              <OptionButton key={m} active={config.minutes === m} onClick={() => setConfig((c) => ({ ...c, minutes: m }))}>
                {m} min
              </OptionButton>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Pass mark is {PASS_MARK}%. The quiz auto-submits when time runs out. Answers are graded on the server and
            shown after you submit. These are practice questions, not an official certification.
          </p>
        </div>

        <button
          type="button"
          onClick={onStart}
          disabled={!selected || starting}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {starting ? "Preparing..." : "Start quiz"}
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- Quiz ----------------------------- */
function QuizView({ attempt, questions, index, setIndex, answers, onSelect, secondsLeft, onSubmit, onQuit, submitting }) {
  const q = questions[index];
  const selected = answers[q._id];
  const answeredCount = questions.filter((x) => answers[x._id] !== undefined).length;
  const low = secondsLeft <= 60;
  const pct = Math.round((answeredCount / questions.length) * 100);

  return (
    <div className="space-y-4">
      <div className={cardCls}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-slate-300">{attempt.topic}</span>
          <span className={`inline-flex items-center gap-1.5 font-semibold ${low ? "text-amber-300" : "text-slate-100"}`}>
            <Timer className="h-4 w-4" />
            {formatTime(secondsLeft)}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {answeredCount} of {questions.length} answered
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className={`${cardCls} space-y-4`}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="indigo">
              Question {index + 1} of {questions.length}
            </Badge>
            <Badge>{q.difficulty}</Badge>
          </div>

          <h2 className="text-lg font-semibold leading-snug text-slate-100">{q.question}</h2>

          <div className="space-y-2">
            {q.options.map((opt, i) => {
              const active = selected === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelect(q._id, i)}
                  disabled={submitting}
                  className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition ${
                    active
                      ? "border-indigo-400 bg-indigo-500/20 text-slate-100"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                      active ? "border-indigo-400 bg-indigo-500 text-white" : "border-white/20 text-slate-400"
                    }`}
                  >
                    {letter(i)}
                  </span>
                  <span className="pt-0.5">{opt}</span>
                </button>
              );
            })}
          </div>
          {selected !== undefined && (
            <p className="text-xs text-slate-500">Click the selected option again to clear your answer.</p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onQuit}
              disabled={submitting}
              className="text-sm text-slate-400 transition hover:text-slate-200 disabled:opacity-50"
            >
              Cancel quiz
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0 || submitting}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" /> Previous
              </button>
              {index < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-500/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-500 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={`${cardCls} h-fit`}>
          <p className="mb-3 text-sm font-medium text-slate-300">Question navigator</p>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((x, i) => {
              const answered = answers[x._id] !== undefined;
              const current = i === index;
              return (
                <button
                  key={x._id}
                  type="button"
                  onClick={() => setIndex(i)}
                  disabled={submitting}
                  className={`h-9 rounded-lg border text-sm transition ${
                    answered
                      ? "border-indigo-400/60 bg-indigo-500/30 text-indigo-100"
                      : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                  } ${current ? "ring-2 ring-indigo-400" : ""}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-3 space-y-1 text-xs text-slate-500">
            <p>Indigo = answered</p>
            <p>Grey = not answered</p>
          </div>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-green-300/30 bg-green-300/10 px-3 py-2 text-sm text-green-300 transition hover:bg-green-300/20 disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> Submit quiz
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Result ----------------------------- */
function ResultView({ result, from, onBack, onRetake, onTopics, adding, added, onAddSkill }) {
  const items = result.items || [];
  const passed = result.percentage >= PASS_MARK;
  const offer = result.percentage >= OFFER_MARK;

  return (
    <div className="space-y-6">
      <div className={`${cardCls} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
        <div>
          <div className="flex flex-wrap items-center gap-2 text-slate-400">
            <Award className="h-5 w-5 text-indigo-400" />
            <span className="text-sm">{result.topic} assessment</span>
            <Badge tone={passed ? "green" : "red"}>{passed ? "Passed" : "Failed"}</Badge>
            {result.timedOut && <Badge tone="amber">submitted after the time limit</Badge>}
          </div>
          <p className={`mt-2 text-5xl font-bold ${pctClass(result.percentage)}`}>
            {result.percentage}%
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {result.score} / {result.total} correct · pass mark {PASS_MARK}% · time {formatTime(result.timeTaken || 0)} of{" "}
            {result.durationMinutes}:00
          </p>
          <p className="text-xs text-slate-500">{formatDate(result.submittedAt)}</p>
        </div>
      </div>

      {offer && (
        <div className="flex flex-col gap-3 rounded-xl border border-indigo-400/30 bg-indigo-400/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-indigo-200">Add {result.topic} to your profile?</p>
            <p className="mt-1 text-sm text-slate-300">
              You scored {result.percentage}%. You can add {result.topic} as an Intermediate skill. Nothing changes until you confirm.
            </p>
          </div>
          {added ? (
            <span className="inline-flex items-center gap-2 text-sm text-green-300">
              <CheckCircle2 className="h-4 w-4" /> Added to your profile
            </span>
          ) : (
            <button
              type="button"
              onClick={onAddSkill}
              disabled={adding}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
              Add as Intermediate
            </button>
          )}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-semibold text-slate-100">Review</h3>
        {items.map((it, i) => (
          <div key={i} className={`${cardCls} space-y-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <Badge>Q{i + 1}</Badge>
                {it.difficulty && <Badge>{it.difficulty}</Badge>}
                {it.selectedIndex === null && <Badge tone="amber">not answered</Badge>}
              </div>
              {it.isCorrect ? (
                <span className="inline-flex items-center gap-1 text-sm text-green-300">
                  <CheckCircle2 className="h-4 w-4" /> Correct
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-sm text-red-300">
                  <XCircle className="h-4 w-4" /> Incorrect
                </span>
              )}
            </div>

            <p className="font-medium text-slate-100">{it.question}</p>

            <div className="space-y-2">
              {it.options.map((opt, j) => {
                const isCorrect = j === it.correctIndex;
                const isPicked = j === it.selectedIndex;
                let cls = "border-white/10 bg-white/5 text-slate-300";
                if (isCorrect) cls = "border-green-300/40 bg-green-300/10 text-green-200";
                else if (isPicked) cls = "border-red-300/40 bg-red-300/10 text-red-200";
                return (
                  <div key={j} className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${cls}`}>
                    <span className="font-semibold">{letter(j)}.</span>
                    <span className="flex-1">{opt}</span>
                    {isCorrect && <span className="text-xs">Correct answer</span>}
                    {isPicked && !isCorrect && <span className="text-xs">Your answer</span>}
                  </div>
                );
              })}
            </div>

            <p className="rounded-lg bg-slate-900/50 p-3 text-sm text-slate-300">
              <span className="font-medium text-indigo-300">Explanation: </span>
              {it.explanation}
            </p>
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
          onClick={onRetake}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
        >
          <RotateCcw className="h-4 w-4" /> Retake {result.topic}
        </button>
        <button
          type="button"
          onClick={onTopics}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10"
        >
          <ClipboardCheck className="h-4 w-4" /> All topics
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- History ----------------------------- */
function HistoryView({ items, loading, openingId, onOpen, onTopics }) {
  const [filter, setFilter] = useState("All");

  const topicNames = useMemo(() => [...new Set(items.map((h) => h.topic))].sort(), [items]);

  const filtered = useMemo(
    () => items.filter((h) => filter === "All" || h.topic === filter),
    [items, filter]
  );

  const chart = useMemo(() => {
    const asc = [...filtered].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
    const rows = asc.map((h, i) => ({ n: i + 1, date: formatDate(h.submittedAt), [h.topic]: h.percentage }));
    const series = [...new Set(asc.map((h) => h.topic))];
    return { rows, series };
  }, [filtered]);

  if (loading) return <Spinner text="Loading history..." />;

  if (!items.length) {
    return (
      <div className={`${cardCls} text-center`}>
        <HistoryIcon className="mx-auto h-8 w-8 text-slate-500" />
        <p className="mt-3 text-slate-300">No attempts yet.</p>
        <p className="mt-1 text-sm text-slate-400">Finish a quiz and it will show up here.</p>
        <button
          type="button"
          onClick={onTopics}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
        >
          <Play className="h-4 w-4" /> Take your first quiz
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={cardCls}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-semibold text-slate-100">
            <TrendingUp className="h-4 w-4 text-indigo-400" /> Score over time
          </h3>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-indigo-400"
          >
            <option value="All" className="bg-slate-900">All topics</option>
            {topicNames.map((t) => (
              <option key={t} value={t} className="bg-slate-900">{t}</option>
            ))}
          </select>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart.rows} margin={{ top: 5, right: 15, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis
                dataKey="n"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                stroke="rgba(255,255,255,0.15)"
                allowDecimals={false}
              />
              <YAxis domain={[0, 100]} unit="%" tick={{ fill: "#94a3b8", fontSize: 12 }} stroke="rgba(255,255,255,0.15)" />
              <Tooltip
                labelFormatter={(n) => `Attempt ${n} · ${chart.rows[n - 1]?.date || ""}`}
                formatter={(v, name) => [`${v}%`, name]}
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  color: "#e2e8f0",
                }}
              />
              <ReferenceLine y={PASS_MARK} stroke="#fcd34d" strokeDasharray="4 4" />
              <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
              {chart.series.map((s, i) => (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Dashed amber line = {PASS_MARK}% pass mark. Points are in the order you took the quizzes.
          {chart.rows.length < 2 ? " Complete more attempts to see a trend." : ""}
        </p>
      </div>

      <div className="space-y-3">
        {filtered.map((h) => (
          <button
            key={h._id}
            type="button"
            onClick={() => onOpen(h._id)}
            disabled={openingId === h._id}
            className={`${cardCls} flex w-full items-center justify-between gap-4 text-left transition hover:bg-white/10 disabled:opacity-60`}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-slate-100">{h.topic}</p>
                <Badge tone={h.passed ? "green" : "red"}>{h.passed ? "Passed" : "Failed"}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                {h.score}/{h.total} correct · {formatDate(h.submittedAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className={`text-xl font-bold ${pctClass(h.percentage)}`}>{h.percentage}%</span>
              {openingId === h._id ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-500" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Page ------------------------------ */
export default function Assessments() {
  const [view, setView] = useState("topics"); // topics | quiz | result | history
  const [topics, setTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [config, setConfig] = useState({ count: 10, minutes: 15 });
  const [starting, setStarting] = useState(false);

  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [result, setResult] = useState(null);
  const [resultFrom, setResultFrom] = useState("quiz");
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [openingId, setOpeningId] = useState(null);

  const [addingSkill, setAddingSkill] = useState(false);
  const [addedAttempts, setAddedAttempts] = useState({});

  const endTimeRef = useRef(0);
  const submittedRef = useRef(false);
  const answersRef = useRef({});
  answersRef.current = answers;

  const loadTopics = useCallback(async (silent = false) => {
    if (!silent) setLoadingTopics(true);
    try {
      const res = await API.get("/assessments/topics");
      setTopics(res.data?.topics || []);
    } catch (e) {
      toast.error(errMsg(e, "Failed to load assessment topics"));
    } finally {
      if (!silent) setLoadingTopics(false);
    }
  }, []);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await API.get("/assessments/history");
      setHistory(res.data?.attempts || []);
    } catch (e) {
      toast.error(errMsg(e, "Failed to load history"));
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const showHistory = () => {
    setView("history");
    loadHistory();
  };

  const showTopics = () => {
    setView("topics");
    loadTopics(true);
  };

  const startQuiz = async (topic = selectedTopic, cfg = config) => {
    if (!topic) return toast.error("Please select a topic");
    setStarting(true);
    try {
      const res = await API.post("/assessments/start", { topic, count: cfg.count, minutes: cfg.minutes });
      submittedRef.current = false;
      endTimeRef.current = Date.now() + res.data.attempt.remainingSeconds * 1000;
      setAttempt(res.data.attempt);
      setQuestions(res.data.questions);
      setAnswers({});
      setIndex(0);
      setSecondsLeft(res.data.attempt.remainingSeconds);
      if (res.data.notice) toast(res.data.notice);
      setView("quiz");
    } catch (e) {
      toast.error(errMsg(e, "Failed to start quiz"));
    } finally {
      setStarting(false);
    }
  };

  // Countdown based on an absolute end time, so it does not drift
  useEffect(() => {
    if (view !== "quiz") return undefined;
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [view]);

  const submitQuiz = async () => {
    if (submittedRef.current || !attempt) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const payload = questions.map((q) => ({
        questionId: q._id,
        selectedIndex: answersRef.current[q._id] ?? null,
      }));
      const res = await API.post(`/assessments/${attempt._id}/submit`, { answers: payload });
      setResult(res.data.attempt);
      setResultFrom("quiz");
      setView("result");
      loadTopics(true);
    } catch (e) {
      submittedRef.current = false;
      toast.error(errMsg(e, "Could not submit. Please click Submit to try again."));
    } finally {
      setSubmitting(false);
    }
  };

  // Timer and buttons always call the latest version
  const submitRef = useRef(submitQuiz);
  submitRef.current = submitQuiz;

  useEffect(() => {
    if (view === "quiz" && attempt && secondsLeft === 0 && !submittedRef.current) {
      toast("Time is up. Submitting your quiz.");
      submitRef.current();
    }
  }, [secondsLeft, view, attempt]);

  const confirmSubmit = () => {
    const unanswered = questions.filter((q) => answers[q._id] === undefined).length;
    const msg = unanswered
      ? `${unanswered} question(s) are not answered. Submit anyway?`
      : "Submit your quiz now?";
    if (window.confirm(msg)) submitQuiz();
  };

  const quitQuiz = () => {
    if (window.confirm("Cancel this quiz? Your answers will not be scored.")) {
      setAttempt(null);
      setQuestions([]);
      setView("topics");
    }
  };

  const selectOption = (qid, i) =>
    setAnswers((prev) => {
      const next = { ...prev };
      if (next[qid] === i) delete next[qid];
      else next[qid] = i;
      return next;
    });

  const openHistoryItem = async (id) => {
    setOpeningId(id);
    try {
      const res = await API.get(`/assessments/${id}`);
      setResult(res.data.attempt);
      setResultFrom("history");
      setView("result");
    } catch (e) {
      toast.error(errMsg(e, "Failed to open attempt"));
    } finally {
      setOpeningId(null);
    }
  };

  const retake = () => {
    if (!result) return;
    const cfg = {
      count: Math.min(15, Math.max(5, result.items?.length || config.count)),
      minutes: result.durationMinutes || config.minutes,
    };
    setSelectedTopic(result.topic);
    setConfig(cfg);
    startQuiz(result.topic, cfg);
  };

  const addSkillToProfile = async () => {
    if (!result) return;
    const skillName = result.topic;
    setAddingSkill(true);
    try {
      const res = await API.get(PROFILE_URL);
      const profile = res.data?.profile || res.data?.data || res.data || {};
      const skills = Array.isArray(profile.skills) ? profile.skills : [];
      const existing = skills.find((s) => String(s.name || "").toLowerCase() === skillName.toLowerCase());

      if (existing && ["Intermediate", "Advanced"].includes(existing.level)) {
        toast(`${skillName} is already on your profile as ${existing.level}.`);
        setAddedAttempts((a) => ({ ...a, [result._id]: true }));
        return;
      }

      const nextSkills = existing
        ? skills.map((s) => (s === existing ? { ...s, level: "Intermediate" } : s))
        : [...skills, { name: skillName, level: "Intermediate" }];

      // Send the full profile so nothing else is lost, minus database-only fields
      // eslint-disable-next-line no-unused-vars
      const { _id, __v, userId, user, createdAt, updatedAt, ...rest } = profile;
      await API[PROFILE_SAVE_METHOD](PROFILE_URL, { ...rest, skills: nextSkills });

      setAddedAttempts((a) => ({ ...a, [result._id]: true }));
      toast.success(`${skillName} added to your profile as Intermediate`);
    } catch (e) {
      toast.error(errMsg(e, "Could not update your profile. Add the skill manually on the Profile page."));
    } finally {
      setAddingSkill(false);
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
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <ClipboardCheck className="h-6 w-6 text-indigo-400" />
              Assessments
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Take timed skill quizzes, review explanations and track your progress.
            </p>
          </div>
          {view !== "quiz" && (
            <div className="flex gap-2">
              <button type="button" onClick={showTopics} className={tabCls(view === "topics")}>
                <ClipboardCheck className="h-4 w-4" /> Topics
              </button>
              <button type="button" onClick={showHistory} className={tabCls(view === "history")}>
                <HistoryIcon className="h-4 w-4" /> History
              </button>
            </div>
          )}
        </header>

        {view === "topics" && (
          <TopicsView
            topics={topics}
            loading={loadingTopics}
            selected={selectedTopic}
            onSelect={setSelectedTopic}
            config={config}
            setConfig={setConfig}
            onStart={() => startQuiz()}
            starting={starting}
          />
        )}

        {view === "quiz" && attempt && questions[index] && (
          <QuizView
            attempt={attempt}
            questions={questions}
            index={index}
            setIndex={setIndex}
            answers={answers}
            onSelect={selectOption}
            secondsLeft={secondsLeft}
            onSubmit={confirmSubmit}
            onQuit={quitQuiz}
            submitting={submitting}
          />
        )}

        {view === "result" && result && (
          <ResultView
            result={result}
            from={resultFrom}
            onBack={showHistory}
            onRetake={retake}
            onTopics={showTopics}
            adding={addingSkill}
            added={!!addedAttempts[result._id]}
            onAddSkill={addSkillToProfile}
          />
        )}

        {view === "history" && (
          <HistoryView
            items={history}
            loading={loadingHistory}
            openingId={openingId}
            onOpen={openHistoryItem}
            onTopics={showTopics}
          />
        )}
      </div>
    </div>
  );
}