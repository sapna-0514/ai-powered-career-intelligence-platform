// Heuristic, free answer scoring (0-10). Optional semantic similarity via ai-service.

const STAR_MARKERS = ["situation", "task", "action", "result", "outcome", "learned", "lesson", "because", "team", "as a result", "my role", "i decided", "i took"];
const TECH_MARKERS = ["for example", "for instance", "such as", "e g", "trade off", "tradeoff", "use case", "in practice", "instead of"];
const CONNECTIVES = ["because", "therefore", "however", "so that", "which means", "for example", "for instance", "first", "then", "finally", "while", "whereas", "instead", "in order to"];

const round1 = (n) => Math.round(n * 10) / 10;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

function normalize(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function stem(word) {
  if (word.length <= 4) return word;
  let s = word.replace(/(ing|ed|es|s)$/, "");
  if (s.length > 4 && s.endsWith("e")) s = s.slice(0, -1);
  return s;
}

function toStems(text) {
  const n = normalize(text);
  return n ? n.split(" ").map(stem) : [];
}

function parseKeyword(raw) {
  const alts = String(raw).split("|").map((s) => s.trim()).filter(Boolean);
  return { label: alts[0] || String(raw), alts: alts.map(toStems).filter((a) => a.length) };
}

function hasPhrase(normalizedText, phrase) {
  return ` ${normalizedText} `.includes(` ${normalize(phrase)} `);
}

function countMarkers(normalizedText, list) {
  return list.filter((m) => hasPhrase(normalizedText, m)).length;
}

let semanticDownUntil = 0;

async function getSemanticScore(answer, reference) {
  if (process.env.USE_SEMANTIC_SCORING === "false") return null;
  if (Date.now() < semanticDownUntil) return null;
  const baseUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
  try {
    const res = await fetch(`${baseUrl}/ai/score-answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": process.env.AI_SERVICE_SECRET || "",
      },
      body: JSON.stringify({ answer, reference }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`AI service responded ${res.status}`);
    const data = await res.json();
    if (typeof data.similarity !== "number") throw new Error("Bad AI response");
    // cosine ~0.2 (unrelated) .. ~0.8 (very close) -> 0..1
    return clamp((data.similarity - 0.2) / 0.6, 0, 1);
  } catch (e) {
    console.error("Semantic scoring unavailable, using keywords only:", e.message);
    semanticDownUntil = Date.now() + 60 * 1000; // don't hammer a dead service
    return null;
  }
}

async function scoreAnswer(question, answerText) {
  const text = String(answerText || "").trim();
  const keywords = (question.keywords || []).map(parseKeyword);
  const labels = keywords.map((k) => k.label);

  if (!text) {
    return {
      score: 0,
      matched: [],
      missed: labels,
      feedback: ["No answer was given. Read the model answer and try again."],
      method: "none",
    };
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const normalized = normalize(text);
  const ansStems = toStems(text);
  const joined = ` ${ansStems.join(" ")} `;
  const ansSet = new Set(ansStems);

  const matched = [];
  const missed = [];
  keywords.forEach((k) => {
    const hit = k.alts.some(
      (alt) => joined.includes(` ${alt.join(" ")} `) || (alt.length > 1 && alt.every((s) => ansSet.has(s)))
    );
    (hit ? matched : missed).push(k.label);
  });
  const kw = keywords.length ? matched.length / keywords.length : 0;

  const target = question.type === "behavioral" ? 60 : 45;
  const lengthScore = Math.min(1, wordCount / target);

  const sentences = text.split(/[.!?\n]+/).filter((s) => s.trim().split(/\s+/).length >= 3).length;
  const connectives = countMarkers(normalized, CONNECTIVES);
  const starHits = countMarkers(normalized, STAR_MARKERS);
  const techHits = countMarkers(normalized, TECH_MARKERS);

  let structure = 0;
  if (sentences >= 2) structure += 0.4;
  structure += connectives >= 2 ? 0.3 : connectives === 1 ? 0.15 : 0;
  if (question.type === "behavioral") structure += starHits >= 2 ? 0.3 : starHits === 1 ? 0.15 : 0;
  else structure += techHits >= 1 ? 0.3 : 0;
  structure = Math.min(1, structure);

  const semantic = wordCount >= 8 ? await getSemanticScore(text, question.modelAnswer) : null;

  let total;
  if (semantic !== null) total = 5 * kw + 3 * semantic + 1.2 * lengthScore + 0.8 * structure;
  else total = 6.5 * kw + 2 * lengthScore + 1.5 * structure;

  if (wordCount < 8) total = Math.min(total, 2);
  else if (kw === 0 && (semantic === null || semantic < 0.4)) total = Math.min(total, 3);

  const score = round1(clamp(total, 0, 10));

  const feedback = [];
  if (wordCount < target * 0.5) feedback.push(`Your answer is short. Aim for about ${target}+ words with a clear explanation or example.`);
  if (missed.length) feedback.push(`Try to cover: ${missed.slice(0, 4).join(", ")}.`);
  if (question.type === "behavioral" && starHits < 2) feedback.push("Structure it with STAR: Situation, Task, Action, Result.");
  if (question.type === "technical" && techHits < 1) feedback.push("Add a concrete example or trade-off to show practical understanding.");
  if (sentences < 2) feedback.push("Break your answer into a few clear sentences.");
  if (semantic !== null && semantic < 0.4) feedback.push("Your answer differs a lot from the expected explanation. Compare it with the model answer.");
  if (score >= 8) feedback.unshift("Strong answer. Most key ideas are covered.");

  return {
    score,
    matched,
    missed,
    feedback: feedback.slice(0, 4),
    method: semantic !== null ? "hybrid" : "keyword",
  };
}

function summarize(answers) {
  const count = (arr) => {
    const m = new Map();
    arr.forEach((k) => m.set(k, (m.get(k) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  };
  const avg = (type) => {
    const list = answers.filter((a) => a.type === type && !a.skipped);
    return list.length ? round1(list.reduce((s, a) => s + a.score, 0) / list.length) : null;
  };

  const answered = answers.filter((a) => !a.skipped);
  const matchedTop = count(answered.flatMap((a) => a.matched)).slice(0, 5);
  const missedTop = count(answers.flatMap((a) => a.missed)).slice(0, 5);
  const technicalAvg = avg("technical");
  const behavioralAvg = avg("behavioral");
  const skippedCount = answers.length - answered.length;
  const strongCount = answers.filter((a) => a.score >= 7).length;

  const strengths = [];
  const weaknesses = [];

  if (matchedTop.length) strengths.push(`Concepts you covered well: ${matchedTop.join(", ")}`);
  if (strongCount) strengths.push(`${strongCount} answer(s) scored 7/10 or higher`);
  if (technicalAvg !== null && technicalAvg >= 6) strengths.push(`Solid technical answers (average ${technicalAvg}/10)`);
  if (behavioralAvg !== null && behavioralAvg >= 6) strengths.push(`Solid behavioral answers (average ${behavioralAvg}/10)`);

  if (missedTop.length) weaknesses.push(`Concepts to revise: ${missedTop.join(", ")}`);
  if (technicalAvg !== null && technicalAvg < 5) weaknesses.push(`Technical answers need depth (average ${technicalAvg}/10)`);
  if (behavioralAvg !== null && behavioralAvg < 5) weaknesses.push(`Behavioral answers need structure (average ${behavioralAvg}/10)`);
  if (skippedCount) weaknesses.push(`${skippedCount} question(s) were skipped or unanswered`);

  if (!strengths.length) strengths.push("Keep practising. Strengths will show up as you cover more key concepts.");
  if (!weaknesses.length) weaknesses.push("No major gaps found. Try a harder difficulty next.");

  return { strengths, weaknesses, technicalAvg, behavioralAvg };
}

module.exports = { scoreAnswer, summarize };