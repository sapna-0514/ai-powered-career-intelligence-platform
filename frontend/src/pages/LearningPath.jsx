import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
    BookOpenCheck, CheckCircle2, Circle, Clock, ExternalLink,
    RefreshCw, Trash2, Sparkles, AlertCircle
} from "lucide-react";
import API from "../services/api";

function LearningPath() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [careers, setCareers] = useState([]);
    const [paths, setPaths] = useState([]);
    const [careerId, setCareerId] = useState(searchParams.get("career") || "");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const [careersRes, pathsRes] = await Promise.all([
                    API.get("/careers"),
                    API.get("/learning-paths")
                ]);
                if (!active) return;
                setCareers(careersRes.data.careers || []);
                setPaths(pathsRes.data.paths || []);
                setCareerId((cur) => cur || careersRes.data.careers?.[0]?._id || "");
            } catch (err) {
                if (!active) return;
                const msg = err.response?.data?.message || "Unable to load learning paths.";
                setError(msg);
                toast.error(msg);
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, []);

    const path = useMemo(
        () => paths.find((p) => String(p.careerId) === careerId) || null,
        [paths, careerId]
    );

    // Steps in order, each with its week range on the timeline.
    const steps = useMemo(() => {
        let week = 1;
        return [...(path?.items || [])]
            .sort((a, b) => a.order - b.order)
            .map((item) => {
                const startWeek = week;
                week += item.weeks;
                return { ...item, startWeek, endWeek: week - 1 };
            });
    }, [path]);

    const doneCount = steps.filter((s) => s.completed).length;
    const percent = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;
    const weeksLeft = steps.filter((s) => !s.completed).reduce((sum, s) => sum + s.weeks, 0);

    const savePath = (updated) =>
        setPaths((prev) =>
            prev.some((p) => p._id === updated._id)
                ? prev.map((p) => (p._id === updated._id ? updated : p))
                : [updated, ...prev]
        );

    const handleCareerChange = (event) => {
        setCareerId(event.target.value);
        setSearchParams({ career: event.target.value }, { replace: true });
    };

    const generate = async () => {
        setBusy(true);
        try {
            const { data } = await API.post("/learning-paths", { careerId });
            savePath(data.path);
            toast.success(path ? "Learning path refreshed." : "Learning path created.");
        } catch (err) {
            toast.error(err.response?.data?.message || "Unable to generate learning path.");
        } finally {
            setBusy(false);
        }
    };

    const toggle = async (item) => {
        try {
            const { data } = await API.patch(
                `/learning-paths/${path._id}/items/${item._id}`,
                { completed: !item.completed }
            );
            savePath(data.path);
        } catch (err) {
            toast.error(err.response?.data?.message || "Unable to update progress.");
        }
    };

    const remove = async () => {
        if (!window.confirm("Delete this learning path and its progress?")) return;
        try {
            await API.delete(`/learning-paths/${path._id}`);
            setPaths((prev) => prev.filter((p) => p._id !== path._id));
            toast.success("Learning path deleted.");
        } catch (err) {
            toast.error(err.response?.data?.message || "Unable to delete learning path.");
        }
    };

    if (loading) return <div className="p-8 text-slate-300">Loading...</div>;

    return (
        <div className="min-h-screen p-6 md:p-8 text-slate-100">
            <div className="mx-auto max-w-4xl">

                {/* Header */}
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold">
                            <BookOpenCheck /> Learning Path
                        </h1>
                        <p className="mt-1 text-slate-400">
                            A step-by-step plan to close your skill gap for a target career.
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

                {/* No path yet */}
                {!path && careerId && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center">
                        <Sparkles className="mx-auto mb-3 text-indigo-300" size={32} />
                        <h2 className="text-lg font-semibold">No learning path for this career yet</h2>
                        <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
                            We will compare your skills with the career requirements and build a plan
                            with milestones, time estimates and study links.
                        </p>
                        <button
                            onClick={generate}
                            disabled={busy}
                            className="mt-5 rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold hover:bg-indigo-500 disabled:opacity-60"
                        >
                            {busy ? "Generating..." : "Generate my learning path"}
                        </button>
                    </div>
                )}

                {/* Path exists */}
                {path && (
                    <>
                        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold">{path.careerTitle}</h2>
                                    <p className="text-sm text-slate-400">
                                        {doneCount} of {steps.length} skills completed
                                        {steps.length > 0 && <> · about {weeksLeft} weeks left</>}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={generate}
                                        disabled={busy}
                                        className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
                                    >
                                        <RefreshCw size={15} className={busy ? "animate-spin" : ""} /> Refresh
                                    </button>
                                    <button
                                        onClick={remove}
                                        className="inline-flex items-center gap-1 rounded-lg border border-red-400/30 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
                                    >
                                        <Trash2 size={15} /> Delete
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center gap-3">
                                <div className="h-2.5 flex-1 overflow-hidden rounded bg-white/10">
                                    <div className="h-full bg-green-500 transition-all" style={{ width: `${percent}%` }} />
                                </div>
                                <span className="w-12 text-right text-sm font-semibold">{percent}%</span>
                            </div>
                        </div>

                        {steps.length === 0 ? (
                            <p className="flex items-center gap-2 rounded-xl bg-green-500/10 p-5 text-green-300">
                                <CheckCircle2 size={18} /> You already meet every skill requirement for this career.
                            </p>
                        ) : (
                            <ol className="space-y-4">
                                {steps.map((s) => (
                                    <li
                                        key={s._id}
                                        className={`rounded-xl border p-5 ${
                                            s.completed ? "border-green-500/30 bg-green-500/5" : "border-white/10 bg-white/5"
                                        }`}
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="flex items-start gap-3">
                                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-500/20 text-sm font-bold text-indigo-300">
                                                    {s.order}
                                                </span>
                                                <div>
                                                    <h3 className={`text-lg font-semibold ${s.completed ? "line-through opacity-60" : ""}`}>
                                                        {s.skillName}
                                                    </h3>
                                                    <p className="text-sm text-slate-400">
                                                        {s.currentLevel} → {s.targetLevel}
                                                        <span className="mx-2">·</span>
                                                        <Clock size={13} className="mr-1 inline" />
                                                        Week {s.startWeek}
                                                        {s.endWeek > s.startWeek ? `–${s.endWeek}` : ""}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => toggle(s)}
                                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
                                                    s.completed
                                                        ? "bg-green-500/20 text-green-300"
                                                        : "border border-white/15 hover:bg-white/10"
                                                }`}
                                            >
                                                {s.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                                {s.completed ? "Completed" : "Mark complete"}
                                            </button>
                                        </div>

                                        <ul className="mt-4 space-y-2 text-sm text-slate-300">
                                            {s.milestones.map((m) => (
                                                <li key={m.level} className="flex gap-2">
                                                    <span className="mt-0.5 shrink-0 rounded bg-indigo-500/15 px-2 py-0.5 text-xs text-indigo-300">
                                                        {m.level}
                                                    </span>
                                                    {m.task}
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {s.resources.map((r) => (
                                                <a
                                                    key={r.url}
                                                    href={r.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-cyan-300 hover:bg-white/10"
                                                >
                                                    {r.title} <ExternalLink size={12} />
                                                </a>
                                            ))}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        )}

                        <p className="mt-4 text-xs text-slate-500">
                            Time estimates assume about 2 weeks per skill level. After you learn a skill,
                            update your Profile and press Refresh to recalculate your path.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

export default LearningPath;