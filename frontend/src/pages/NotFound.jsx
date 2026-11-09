import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <div className="max-w-md rounded-xl border border-white/10 bg-white/5 p-6 text-center">
        <Compass className="mx-auto h-10 w-10 text-indigo-400" />
        <p className="mt-3 text-5xl font-bold text-indigo-300">404</p>
        <h1 className="mt-2 text-xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-slate-400">The page you are looking for does not exist or was moved.</p>
        <Link
          to="/dashboard"
          className="mt-5 inline-flex rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}