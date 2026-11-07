const Job = require("../models/Job");

// Optional live jobs. Active only when BOTH JOBS_API_KEY and JOBS_API_URL are set.
// Generic adapter: configure URL, header, param names and results path via env.
// Any failure falls back silently to whatever is already in the database.

const CACHE_MS = 30 * 60 * 1000;
const lastSync = new Map();

const isLiveEnabled = () => Boolean(process.env.JOBS_API_KEY && process.env.JOBS_API_URL);

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const getPath = (obj, p) => p.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
const pick = (obj, keys) => {
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  return undefined;
};
const asText = (v) => (v && typeof v === "object" ? v.name || v.display_name || "" : v || "");
const stripHtml = (str) => String(str || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

function extractSkills(text, vocab) {
  const hay = ` ${text.toLowerCase()} `;
  return vocab
    .filter((name) => {
      const rx = new RegExp(`(^|[^a-z0-9+#])${escapeRegex(name.toLowerCase())}($|[^a-z0-9+#])`);
      return rx.test(hay);
    })
    .slice(0, 12)
    .map((name) => ({ name, requiredLevel: 2 }));
}

function normalize(raw, vocab) {
  const title = String(asText(pick(raw, ["title", "job_title", "name"]))).trim();
  const company = String(asText(pick(raw, ["company", "company_name", "employer_name"]))).trim();
  const applyUrl = String(pick(raw, ["url", "apply_url", "redirect_url", "job_apply_link"]) || "");
  const externalId = String(pick(raw, ["id", "job_id", "externalId"]) || applyUrl || "");
  if (!title || !company || !externalId) return null;

  const description = stripHtml(pick(raw, ["description", "job_description", "summary"])).slice(0, 4000);
  const location = String(asText(pick(raw, ["location", "job_location", "city"])) || "").trim();
  const text = `${title} ${location} ${description}`;
  const posted = new Date(pick(raw, ["postedAt", "created", "created_at", "date_posted", "posted_at"]) || Date.now());

  return {
    externalId,
    title,
    company,
    location,
    description,
    applyUrl,
    category: "General",
    workMode: /remote/i.test(text) ? "remote" : /hybrid/i.test(text) ? "hybrid" : "onsite",
    jobType: /intern/i.test(title) ? "internship" : "full-time",
    experienceLevel: /senior|lead|principal/i.test(title)
      ? "Senior"
      : /junior|intern|fresher|entry|trainee/i.test(title)
      ? "Entry"
      : "Mid",
    requiredSkills: extractSkills(text, vocab),
    postedAt: Number.isNaN(posted.getTime()) ? new Date() : posted,
    source: "api",
    isSample: false,
  };
}

async function syncLiveJobs({ q = "", location = "" } = {}) {
  if (!isLiveEnabled()) return 0;

  const key = `${q}|${location}`.toLowerCase();
  const last = lastSync.get(key);
  if (last && Date.now() - last < CACHE_MS) return 0;

  try {
    const url = new URL(process.env.JOBS_API_URL);
    if (q) url.searchParams.set(process.env.JOBS_API_QUERY_PARAM || "q", q);
    if (location) url.searchParams.set(process.env.JOBS_API_LOCATION_PARAM || "location", location);

    const headerName = process.env.JOBS_API_KEY_HEADER || "Authorization";
    const prefix = process.env.JOBS_API_KEY_PREFIX ?? "Bearer ";

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const resp = await fetch(url, {
      headers: { [headerName]: `${prefix}${process.env.JOBS_API_KEY}`, Accept: "application/json" },
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (!resp.ok) throw new Error(`Provider responded with ${resp.status}`);
    const body = await resp.json();
    const items = Array.isArray(body) ? body : getPath(body, process.env.JOBS_API_RESULTS_PATH || "results");
    if (!Array.isArray(items)) throw new Error("Unexpected provider response shape");

    const vocab = await Job.distinct("requiredSkills.name");
    const ops = items
      .slice(0, 50)
      .map((raw) => normalize(raw, vocab))
      .filter(Boolean)
      .map((job) => ({
        updateOne: {
          filter: { source: "api", externalId: job.externalId },
          update: { $set: job },
          upsert: true,
        },
      }));

    if (ops.length) await Job.bulkWrite(ops);
    lastSync.set(key, Date.now());
    return ops.length;
  } catch (e) {
    console.error("Live jobs sync error:", e.message);
    lastSync.set(key, Date.now() - CACHE_MS + 60 * 1000); // retry in ~1 minute
    return 0;
  }
}

module.exports = { isLiveEnabled, syncLiveJobs };