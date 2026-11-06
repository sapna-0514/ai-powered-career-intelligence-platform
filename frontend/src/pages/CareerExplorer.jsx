import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Compass, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import API from "../services/api";

function CareerExplorer() {
    const [recs, setRecs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await API.get("/careers/recommendations");
                setRecs(data.recommendations);
            } catch (err) {
                const msg = err.response?.data?.message || "Unable to load recommendations.";
                setMessage(msg);
                toast.error(msg);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    return (
        <div className="min-h-screen p-6 md:p-8 text-slate-100">
            <div className="mx-auto max-w-5xl">
                <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold">
                    <Compass /> Career Intelligence
                </h1>
                <p className="mb-6 text-slate-400">Careers ranked by how well your skills align.</p>

                {loading && <p className="text-slate-300">Analyzing your skills...</p>}
                {!loading && message && (
                    <p className="rounded-lg bg-amber-500/10 p-4 text-amber-300">{message}</p>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                    {recs.map((r) => (
                        <div key={r.careerId} className="rounded-xl border border-white/10 bg-white/5 p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold">{r.careerName}</h2>
                                    <p className="text-xs text-slate-400">{r.category} · Demand: {r.demand}</p>
                                </div>
                                <span className="text-2xl font-bold text-indigo-400">{r.predictionProbability}%</span>
                            </div>

                            <p className="my-3 text-sm text-slate-300">{r.description}</p>

                            <div className="h-2 overflow-hidden rounded bg-white/10">
                                <div className="h-full bg-indigo-500" style={{ width: `${r.skillAlignment}%` }} />
                            </div>

                            <div className="mt-3 flex flex-wrap gap-1">
                                {r.matchedSkills.map((s) => (
                                    <span key={s} className="inline-flex items-center gap-1 rounded bg-green-500/15 px-2 py-0.5 text-xs text-green-300">
                                        <CheckCircle2 size={12} /> {s}
                                    </span>
                                ))}
                                {r.missingSkills.map((s) => (
                                    <span key={s} className="inline-flex items-center gap-1 rounded bg-red-500/15 px-2 py-0.5 text-xs text-red-300">
                                        <AlertCircle size={12} /> {s}
                                    </span>
                                ))}
                            </div>

                            <Link
                                to={`/skill-analysis?career=${r.careerId}`}
                                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-300 hover:text-indigo-200"
                            >
                                View skill gap <ArrowRight size={14} />
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default CareerExplorer;