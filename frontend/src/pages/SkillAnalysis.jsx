import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
    ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis, Radar, Legend, Tooltip
} from "recharts";
import {
    Network, CheckCircle2, TrendingUp, AlertCircle, Target, ArrowRight, Info
} from "lucide-react";
import API from "../services/api";

const STATUS = {
    matched: { label: "Matched", badge: "bg-green-500/15 text-green-300", bar: "bg-green-500" },
    partial: { label: "Needs improvement", badge: "bg-amber-500/15 text-amber-300", bar: "bg-amber-500" },
    missing: { label: "Missing", badge: "bg-red-500/15 text-red-300", bar: "bg-red-500" }
};

const LEVEL_TICKS = ["None", "Beginner", "Intermediate", "Advanced"];

const readinessColor = (score) =>
    score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

function SkillAnalysis() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [careers, setCareers] = useState([]);
    const [careerId, setCareerId] = useState(searchParams.get("career") || "");
    const [gap, setGap] = useState(null);
    const [loadingCareers, setLoadingCareers] = useState(true);
    const [loadingGap, setLoadingGap] = useState(false);
    const [error, setError] = useState("");

    // 1. Load the list of careers
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const { data } = await API.get("/careers");
                if (!active) return;
                setCareers(data.careers || []);
                setCareerId((current) => current || data.careers?.[0]?._id || "");
            } catch (err) {
                if (!active) return;
                const msg = err.response?.data?.message || "Unable to load careers.";
                setError(msg);
                toast.error(msg);
            } finally {
                if (active) setLoadingCareers(false);
            }
        })();
        return () => { active = false; };
    }, []);

    // 2. Load the skill gap whenever the selected career changes
    useEffect(() => {
        if (!careerId) return;
        let active = true;
        (async () => {
            setLoadingGap(true);
            setError("");
            try {
                const { data } = await API.get(`/careers/${careerId}/skill-gap`);
                if (active) setGap(data);
            } catch (err) {
                if (!active) return;
                const msg = err.response?.data?.message || "Unable to analyze skill gap.";
                setError(msg);
                toast.error(msg);
            } finally {
                if (active) setLoadingGap(false);
            }
        })();
        return () => { active = false; };
    }, [careerId]);

    const handleCareerChange = (event) => {
        const id = event.target.value;
        setCareerId(id);
        setSearchParams({ career: id }, { replace: true });
    };

    const skills = useMemo(() => gap?.skills || [], [gap]);

    const counts = useMemo(() => ({
        matched: skills.filter((s) => s.status === "matched").length,
        partial: skills.filter((s) => s.status === "partial").length,
        missing: skills.filter((s) => s.status === "missing").length
    }), [skills]);

    const radarData = useMemo(() => skills.map((s) => ({
        skill: s.name,
        Required: s.requiredValue,
        "Your level": s.currentValue
    })), [skills]);

    // Missing skills first, then partial; hardest requirement first.
    const priorities = useMemo(() => {
        const order = { missing: 0, partial: 1 };
        return skills
            .filter((s) => s.status !== "matched")
            .sort((a, b) => order[a.status] - order[b.status] || b.requiredValue - a.requiredValue);
    }, [skills]);

    const noSkillsYet = skills.length > 0 && skills.every((s) => s.currentValue === 0);
    const readiness = gap?.readiness ?? 0;

    if (loadingCareers) {
        return <div className="p-8 text-slate-300">Loading careers...</div>;
    }

    return (
        <div className="min-h-screen p-6 md:p-8 text-slate-100">
            <div className="mx-auto max-w-6xl">

                {/* Header */}
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold">
                            <Network /> Skill Analysis
                        </h1>
                        <p className="mt-1 text-slate-400">
                            Compare your skills with the requirements of a target career.
                        </p>
                    </div>

                    <label className="flex flex-col gap-1 text-sm text-slate-400">
                        Target career
                        <select
                            value={careerId}
                            onChange={handleCareerChange}
                            className="min-w-64 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-indigo-400"
                        >
                            {careers.map((c) => (
                                <option key={c._id} value={c._id}>{c.title}</option>
                            ))}
                        </select>
                    </label>
                </div>

                {error && (
                    <p className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 p-4 text-red-300">
                        <AlertCircle size={18} /> {error}
                    </p>
                )}

                {careers.length === 0 && !error && (
                    <p className="rounded-lg bg-amber-500/10 p-4 text-amber-300">
                        No careers found. Run <code>node scripts/seedCareers.js</code> in the backend folder.
                    </p>
                )}

                {noSkillsYet && (
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-indigo-500/10 p-4 text-indigo-200">
                        <span className="flex items-center gap-2">
                            <Info size={18} /> We could not find any of your skills yet.
                        </span>
                        <span className="flex gap-4 text-sm font-semibold">
                            <Link to="/resume-analyzer" className="underline">Analyze a resume</Link>
                            <Link to="/profile" className="underline">Add skills to profile</Link>
                        </span>
                    </div>
                )}

                {loadingGap && <p className="text-slate-300">Analyzing your skills...</p>}

                {gap && !loadingGap && (
                    <>
                        {/* Summary row */}
                        <div className="mb-6 grid gap-4 md:grid-cols-4">
                            <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-5 md:col-span-1">
                                <div
                                    className="grid h-20 w-20 shrink-0 place-items-center rounded-full"
                                    style={{
                                        background: `conic-gradient(${readinessColor(readiness)} ${readiness}%, rgba(255,255,255,0.1) 0)`
                                    }}
                                >
                                    <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-900 text-xl font-bold">
                                        {readiness}%
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Readiness for</p>
                                    <p className="font-semibold">{gap.career.title}</p>
                                </div>
                            </div>

                            {[
                                ["matched", counts.matched, CheckCircle2],
                                ["partial", counts.partial, TrendingUp],
                                ["missing", counts.missing, AlertCircle]
                            ].map(([key, value, Icon]) => (
                                <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-5">
                                    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${STATUS[key].badge}`}>
                                        <Icon size={13} /> {STATUS[key].label}
                                    </span>
                                    <p className="mt-3 text-3xl font-bold">{value}</p>
                                    <p className="text-sm text-slate-400">of {skills.length} required skills</p>
                                </div>
                            ))}
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                            {/* Radar chart */}
                            <section className="rounded-xl border border-white/10 bg-white/5 p-5">
                                <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
                                    <Target size={18} /> Skill radar
                                </h2>
                                <p className="mb-2 text-sm text-slate-400">Your level compared with the level required.</p>
                                <div style={{ width: "100%", height: 340 }}>
                                    <ResponsiveContainer>
                                        <RadarChart data={radarData} outerRadius="70%">
                                            <PolarGrid stroke="rgba(255,255,255,0.15)" />
                                            <PolarAngleAxis dataKey="skill" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                                            <PolarRadiusAxis
                                                domain={[0, 3]}
                                                tickCount={4}
                                                tick={{ fill: "#94a3b8", fontSize: 10 }}
                                                tickFormatter={(v) => LEVEL_TICKS[v] ?? v}
                                                angle={90}
                                            />
                                            <Radar name="Required" dataKey="Required" stroke="#25c8e8" fill="#25c8e8" fillOpacity={0.15} />
                                            <Radar name="Your level" dataKey="Your level" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.45} />
                                            <Tooltip
                                                formatter={(v) => LEVEL_TICKS[v] ?? v}
                                                contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8 }}
                                            />
                                            <Legend />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </section>

                            {/* Skill-by-skill table */}
                            <section className="rounded-xl border border-white/10 bg-white/5 p-5">
                                <h2 className="mb-4 text-lg font-semibold">Skill breakdown</h2>
                                <div className="space-y-4">
                                    {skills.map((s) => (
                                        <div key={s.name}>
                                            <div className="mb-1 flex items-center justify-between gap-2">
                                                <span className="font-medium">{s.name}</span>
                                                <span className={`rounded px-2 py-0.5 text-xs ${STATUS[s.status].badge}`}>
                                                    {STATUS[s.status].label}
                                                </span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded bg-white/10">
                                                <div
                                                    className={`h-full ${STATUS[s.status].bar}`}
                                                    style={{ width: `${Math.round(s.coverage * 100)}%` }}
                                                />
                                            </div>
                                            <p className="mt-1 text-xs text-slate-400">
                                                You: {s.currentLevel} · Required: {s.requiredLevel}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        {/* Priorities */}
                        <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
                            <h2 className="mb-1 text-lg font-semibold">What to learn next</h2>
                            <p className="mb-4 text-sm text-slate-400">Ordered by importance: missing skills first.</p>

                            {priorities.length === 0 ? (
                                <p className="flex items-center gap-2 text-green-300">
                                    <CheckCircle2 size={18} /> You meet every skill requirement for this career.
                                </p>
                            ) : (
                                <ol className="space-y-2">
                                    {priorities.map((s, i) => (
                                        <li key={s.name} className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3">
                                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-500/20 text-sm font-bold text-indigo-300">
                                                {i + 1}
                                            </span>
                                            <span className="flex-1">
                                                <strong>{s.name}</strong>
                                                <span className="text-slate-400">
                                                    {s.status === "missing"
                                                        ? ` — start learning and reach ${s.requiredLevel}`
                                                        : ` — move from ${s.currentLevel} to ${s.requiredLevel}`}
                                                </span>
                                            </span>
                                            <span className={`rounded px-2 py-0.5 text-xs ${STATUS[s.status].badge}`}>
                                                {STATUS[s.status].label}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            )}

                            <Link
                               to={`/learning-path?career=${careerId}`}
                                className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-indigo-300 hover:text-indigo-200"
                            >
                                Build a learning path <ArrowRight size={15} />
                            </Link>
                        </section>

                        <p className="mt-4 text-xs text-slate-500">
                            Skills found on your resume count as Intermediate. Set exact levels
                            (Beginner / Intermediate / Advanced) in your profile for a more accurate result.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

export default SkillAnalysis;
