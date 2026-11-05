import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  BrainCircuit, LayoutDashboard, Compass, FileText, ChartNoAxesColumnIncreasing,
  Route, Scale, ChartLine, Settings, Bell, Search, LogOut, Menu, X,
  UploadCloud, File, FileCheck2, Sparkles, UserRound, GraduationCap,
  BriefcaseBusiness, Code2, Download, CheckCircle2, AlertCircle,
  RefreshCw, ArrowRight, History, Eye, ChevronRight,
  Lightbulb, Star, Trash2, RotateCw, ExternalLink, ChartPie, CalendarDays, Mail, Phone, MapPin, FileText as TextIcon
} from "lucide-react";
import API from "../services/api";
import "./ResumeAnalyzer.css";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt"];
const EMPTY_DATA = {
  personalInfo: {}, professionalSummary: "", skills: [], skillCategories: {},
  education: [], experience: [], projects: [], certifications: [], entities: [],
  insights: { resumeScore: null, scoreBreakdown: [], strengths: [], suggestions: [], metrics: {} }
};

const formatDate = (value) => value
  ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  : "Date unavailable";
const formatSize = (bytes) => bytes ? `${(bytes / 1048576).toFixed(2)} MB` : "Size unavailable";
const initials = (name = "User") => name.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0].toUpperCase()).join("");
const asArray = (value) => Array.isArray(value) ? value : [];
const getData = (resume) => ({ ...EMPTY_DATA, ...(resume?.parsedData || {}) });
const safeText = (value, fallback = "Not detected") => value || fallback;

function ResumeAnalyzer() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  });
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("extracted");
  const [showHistory, setShowHistory] = useState(false);

  const parsed = useMemo(() => getData(result), [result]);
  const skills = asArray(parsed.skills);
  const categories = parsed.skillCategories || {};
  const categoryEntries = Object.entries(categories).filter(([, values]) => asArray(values).length);
  const totalSkills = categoryEntries.reduce((sum, [, values]) => sum + asArray(values).length, 0) || skills.length;

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const authError = (status) => {
    if (status !== 401) return false;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
    return true;
  };

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await API.get("/resume");
      setResumes(response.data.resumes || []);
      setError("");
    } catch (err) {
      if (!authError(err.response?.status)) {
        setError(err.response?.data?.message || "Unable to load resume history.");
      }
    } finally {
      setHistoryLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [me, history] = await Promise.all([API.get("/auth/me"), API.get("/resume")]);
        if (!active) return;
        setUser(me.data.user);
        setResumes(history.data.resumes || []);
      } catch (err) {
        if (!active) return;
        if (!authError(err.response?.status)) setError(err.response?.data?.message || "Unable to load Resume Analyzer.");
      } finally {
        if (active) setHistoryLoading(false);
      }
    })();
    return () => { active = false; };
  }, [navigate]);

  const validateFile = (selected) => {
    if (!selected) return false;
    const extension = `.${selected.name.split(".").pop().toLowerCase()}`;
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      toast.error("Choose a PDF, DOCX or TXT file.");
      return false;
    }
    if (!selected.size || selected.size > MAX_FILE_SIZE) {
      toast.error(selected.size ? "Maximum file size is 5 MB." : "The selected file is empty.");
      return false;
    }
    return true;
  };

  const selectFile = (selected) => {
    if (!validateFile(selected)) return;
    setFile(selected);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file) return toast.error("Please choose a resume first.");
    const body = new FormData();
    body.append("resume", file);
    setLoading(true);
    setError("");
    try {
      const response = await API.post("/resume/upload", body);
      setResult(response.data.resume);
      setFile(null);
      setActiveSection("extracted");
      toast.success("Resume analyzed successfully.");
      await fetchHistory();
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.detail || "Resume analysis failed.";
      if (!authError(err.response?.status)) {
        setError(message);
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const openResume = async (id) => {
    try {
      const response = await API.get(`/resume/${id}`);
      setResult(response.data.resume);
      setFile(null);
      setShowHistory(false);
      setActiveSection("extracted");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (!authError(err.response?.status)) toast.error(err.response?.data?.message || "Unable to open resume.");
    }
  };

  const removeResume = async (id) => {
    if (!window.confirm("Remove this saved resume and its extracted data?")) return;
    try {
      await API.delete(`/resume/${id}`);
      if (result?._id === id) setResult(null);
      await fetchHistory();
      toast.success("Resume removed.");
    } catch (err) {
      if (!authError(err.response?.status)) toast.error(err.response?.data?.message || "Could not remove resume.");
    }
  };

  const reanalyze = async () => {
    if (!result?._id) return;
    setLoading(true);
    try {
      const response = await API.post(`/resume/${result._id}/reanalyze`);
      setResult(response.data.resume);
      await fetchHistory();
      toast.success("Resume re-analyzed.");
    } catch (err) {
      if (!authError(err.response?.status)) toast.error(err.response?.data?.message || "Re-analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const downloadText = () => {
    if (!result?.extractedText) return toast.error("No extracted text is available.");
    const blob = new Blob([result.extractedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(result.fileName || "resume").replace(/\.[^.]+$/, "")}-extracted.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const viewOriginal = async () => {
    if (!result?._id) return;
    try {
      const response = await API.get(`/resume/${result._id}/file`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      if (!authError(err.response?.status)) toast.error("Original file is unavailable. Re-upload this resume.");
    }
  };

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "AI Career Explorer", icon: Compass, disabled: true },
    { label: "Resume Analyzer", icon: FileText, active: true },
    { label: "Skill Gap Analysis", icon: ChartNoAxesColumnIncreasing, disabled: true },
    { label: "Career Roadmap", icon: Route, disabled: true },
    { label: "Career Comparison", icon: Scale, disabled: true },
    { label: "Reports & Analytics", icon: ChartLine, disabled: true },
    { label: "Profile & Settings", icon: Settings, path: "/profile" }
  ];

  const sections = [
    ["extracted", "Extracted Information", FileText],
    ["skills", "Skills Analysis", ChartNoAxesColumnIncreasing],
    ["experience", "Experience Timeline", BriefcaseBusiness],
    ["score", "Resume Score", Star],
    ["suggestions", "Improvement Suggestions", Lightbulb]
  ];

  const scrollTo = (id) => {
    setActiveSection(id);
    document.getElementById(`ra-section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const score = parsed.insights?.resumeScore;
  const personal = parsed.personalInfo || {};
  const metrics = parsed.insights?.metrics || {};

  return (
    <div className="ra-layout">
      {sidebarOpen && <button className="ra-overlay" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className={`ra-sidebar ${sidebarOpen ? "ra-sidebar-open" : ""}`}>
        <div className="ra-brand">
          <div className="ra-brand-icon"><BrainCircuit size={30} /></div>
          <div><h1>Career<span>Cast</span></h1><p>AI Career Intelligence</p></div>
          <button className="ra-mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <p className="ra-sidebar-label">WORKSPACE</p>
        <nav className="ra-navigation">
          {navItems.map(item => {
            const Icon = item.icon;
            return item.disabled
              ? <div key={item.label} className="ra-nav-link ra-disabled-link"><Icon size={19} /><span>{item.label}</span><small>Soon</small></div>
              : <Link key={item.label} to={item.path || "/resume-analyzer"} className={`ra-nav-link ${item.active ? "active" : ""}`} onClick={() => setSidebarOpen(false)}><Icon size={19} /><span>{item.label}</span></Link>;
          })}
        </nav>
        <div className="ra-sidebar-bottom">
          <div className="ra-sidebar-promo"><Sparkles size={23} /><h3>Build your career with AI</h3><p>Discover your skills and explore career opportunities.</p><Link to="/dashboard">Go to Dashboard <ArrowRight size={15} /></Link></div>
          <button className="ra-logout" onClick={logout}><LogOut size={18} />Logout</button>
        </div>
      </aside>

      <main className="ra-main">
        <header className="ra-topbar">
          <div className="ra-topbar-left">
            <button className="ra-mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
            <div className="ra-breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>Resume Analyzer</strong></div>
          </div>
          <div className="ra-topbar-right">
            <div className="ra-search"><Search size={17} /><input placeholder="Search for careers, skills, or insights..." disabled /></div>
            <button className="ra-notification" aria-label="Notifications"><Bell size={19} /></button>
            <div className="ra-user"><div className="ra-avatar">{initials(user?.name)}</div><div><strong>{user?.name || "User"}</strong><span>{user?.role || "Career Explorer"}</span></div></div>
          </div>
        </header>

        <div className="ra-content">
          <section className="ra-hero">
            <div className="ra-hero-icon"><FileSearchIcon /></div>
            <div className="ra-hero-copy"><span>AI-POWERED CAREER INTELLIGENCE</span><h1>Resume Analyzer</h1><p>Upload your resume and let CareerCast extract your skills, experience, education and more.</p></div>
            <div className="ra-format-card"><strong>Supported Formats</strong><div><span><File size={15} /> PDF</span><span><File size={15} /> DOCX</span><span><File size={15} /> TXT</span><small>Max size: 5 MB</small></div></div>
          </section>

          <section className="ra-upload-row">
            <form className={`ra-upload-box ${dragActive ? "drag-active" : ""}`} onSubmit={handleUpload}
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={e => { e.preventDefault(); setDragActive(false); selectFile(e.dataTransfer.files?.[0]); }}>
              <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" hidden onChange={e => selectFile(e.target.files?.[0])} />
              <UploadCloud size={43} />
              <h3>{file ? file.name : "Upload Your Resume"}</h3>
              <p>{file ? `${formatSize(file.size)} · Ready to analyze` : <>Drag and drop your file here, or <button type="button" className="ra-inline-link" onClick={() => fileInputRef.current?.click()}>click to browse</button></>}</p>
              {file && <button type="button" className="ra-clear-file" onClick={() => setFile(null)}>Choose another file</button>}
              <button className="ra-primary-button" type="submit" disabled={!file || loading}>{loading ? <><RefreshCw className="ra-spin" size={17} /> Analyzing...</> : <><UploadCloud size={17} /> {result ? "Analyze New Resume" : "Choose File & Analyze"}</>}</button>
              <small>PDF, DOCX or TXT · Maximum 5 MB</small>
            </form>

            <div className="ra-file-card">
              {result ? <>
                <div className="ra-file-preview"><FileText size={42} /><span>{(result.fileName || "RESUME").split(".").pop().toUpperCase()}</span></div>
                <div className="ra-file-details"><h3>{result.fileName}</h3><p>{formatDate(result.createdAt)} · {result.fileSize ? formatSize(result.fileSize) : "Uploaded resume"}</p><div className="ra-success-line"><CheckCircle2 size={17} /> Analysis completed successfully</div>
                  <div className="ra-pipeline"><span>✓<small>File Upload</small></span><i /><span>✓<small>Text Extraction</small></span><i /><span>✓<small>AI Analysis</small></span><i /><span>✓<small>Results Ready</small></span></div>
                </div>
                <div className="ra-file-actions"><button onClick={reanalyze} disabled={loading}><RotateCw size={16} /> Re-analyze</button><button onClick={viewOriginal}><Eye size={16} /> View Original</button><button className="danger" onClick={() => removeResume(result._id)}><Trash2 size={16} /> Remove</button></div>
              </> : <div className="ra-no-file"><FileCheck2 size={34} /><h3>Your analysis will appear here</h3><p>Upload a resume to view its extracted information, skill distribution and improvement insights.</p></div>}
            </div>
          </section>

          {error && <div className="ra-error-banner"><AlertCircle size={18} /><span>{error}</span><button onClick={() => setError("")}><X size={16} /></button></div>}

          {result && <>
            <nav className="ra-section-nav" aria-label="Resume analysis sections">
              {sections.map(([id, label, Icon]) => <button key={id} className={activeSection === id ? "active" : ""} onClick={() => scrollTo(id)}><Icon size={17} />{label}</button>)}
            </nav>

            <section id="ra-section-extracted" className="ra-analysis-section">
              <div className="ra-section-title"><div><span>RESUME BREAKDOWN</span><h2>Extracted Information</h2></div><button className="ra-outline-button" onClick={downloadText}><Download size={16} /> Export Text</button></div>
              <div className="ra-dashboard-grid">
                <article className="ra-panel ra-personal-panel">
                  <PanelHeading icon={<UserRound size={18} />} title="Personal Information" action={<span className="ra-detected-label">Extracted</span>} />
                  <InfoLine icon={<UserRound />} label="Name" value={personal.name} />
                  <InfoLine icon={<Mail />} label="Email" value={personal.email} />
                  <InfoLine icon={<Phone />} label="Phone" value={personal.phone} />
                  <InfoLine icon={<MapPin />} label="Location" value={personal.location} />
                  <InfoLine icon={<ExternalLink  />} label="LinkedIn" value={personal.linkedin} link />
                  <InfoLine icon={<ExternalLink />} label="Website" value={personal.website} link />
                </article>

                <article className="ra-panel ra-summary-panel">
                  <PanelHeading icon={<BrainCircuit size={18} />} title="Professional Summary" />
                  <p className="ra-summary-text">{safeText(parsed.professionalSummary, "A professional summary could not be generated because the resume did not contain enough readable profile information.")}</p>
                  <small className="ra-generated-note">Generated from extracted resume content · Review before using</small>
                </article>

                <article className="ra-panel ra-skills-chart-panel">
                  <PanelHeading icon={<ChartPie size={18} />} title="Skills Distribution" />
                  {totalSkills ? <div className="ra-chart-layout">
                    <div className="ra-donut" style={{ background: `conic-gradient(${categoryEntries.map(([ values], index, arr) => {
                      const colors = ["#268cff", "#f39b4a", "#9b68f4", "#20c7b4", "#e85bbd"];
                      const start = arr.slice(0, index).reduce((sum, [, items]) => sum + items.length, 0) / totalSkills * 100;
                      const end = start + values.length / totalSkills * 100;
                      return `${colors[index % colors.length]} ${start}% ${end}%`;
                    }).join(", ")})` }}><div><strong>{totalSkills}</strong><span>Total Skills</span></div></div>
                    <div className="ra-chart-legend">{categoryEntries.map(([name, values], i) => <div key={name}><i className={`ra-dot dot-${i % 5}`} /><span>{name}</span><strong>{Math.round(values.length / totalSkills * 100)}%</strong></div>)}</div>
                  </div> : <EmptyState text="No categorized skills were detected." />}
                </article>

                <article className="ra-panel ra-experience-panel">
                  <PanelHeading icon={<BriefcaseBusiness size={18} />} title="Work Experience" count={asArray(parsed.experience).length} />
                  {asArray(parsed.experience).length ? <div className="ra-timeline">{parsed.experience.map((item, i) => <div className="ra-timeline-item" key={i}><span className="ra-timeline-dot" /><strong>{item.role || item.title || "Experience entry"}</strong><b>{item.company || "Organization not identified"}</b><small>{[item.startDate, item.endDate].filter(Boolean).join(" – ") || "Dates not identified"}{item.duration ? ` · ${item.duration}` : ""}</small>{item.description && <p>{item.description}</p>}</div>)}</div> : <EmptyState text="No structured work experience was detected." />}
                </article>

                <article className="ra-panel ra-extracted-skills-panel">
                  <PanelHeading icon={<Code2 size={18} />} title="Extracted Skills" count={totalSkills} />
                  {categoryEntries.length ? categoryEntries.map(([category, values], i) => <div className="ra-skill-group" key={category}><h4>{category}</h4><div className={`ra-skill-tags skill-group-${i % 5}`}>{values.map(skill => <span key={skill}>{skill}</span>)}</div></div>) : <EmptyState text="No known skills were detected in the resume." />}
                </article>

                <article className="ra-panel ra-insights-panel">
                  <PanelHeading icon={<Sparkles size={18} />} title="Resume Insights" />
                  <div className="ra-insight-metrics">
                    <Metric icon={<Code2 />} value={metrics.skillsFound ?? totalSkills} label="Skills Found" />
                    <Metric icon={<BriefcaseBusiness />} value={metrics.experienceEntries ?? asArray(parsed.experience).length} label="Experience" />
                    <Metric icon={<GraduationCap />} value={metrics.educationEntries ?? asArray(parsed.education).length} label="Education" />
                    <Metric icon={<Star />} value={score == null ? "—" : `${score}%`} label="Resume Score" />
                  </div>
                  <p className="ra-score-disclaimer">Score is a rule-based completeness indicator, not an ATS ranking or hiring prediction.</p>
                </article>

                <article className="ra-panel ra-education-panel">
                  <PanelHeading icon={<GraduationCap size={18} />} title="Education" count={asArray(parsed.education).length} />
                  {asArray(parsed.education).length ? <div className="ra-simple-list">{parsed.education.map((item, i) => <div key={i}><GraduationCap size={17} /><p>{typeof item === "string" ? item : [item.degree, item.institution, item.graduationYear].filter(Boolean).join(" · ")}</p></div>)}</div> : <EmptyState text="No education information was detected." />}
                </article>

                <article className="ra-panel ra-extras-panel">
                  <PanelHeading icon={<Star size={18} />} title="Projects & Certifications" />
                  <h4>Projects</h4>
                  {asArray(parsed.projects).length ? <ul>{parsed.projects.map((x, i) => <li key={i}>{typeof x === "string" ? x : `${x.name || "Project"}${x.description ? ` — ${x.description}` : ""}`}</li>)}</ul> : <p className="ra-muted">No projects detected.</p>}
                  <h4>Certifications</h4>
                  {asArray(parsed.certifications).length ? <ul>{parsed.certifications.map((x, i) => <li key={i}>{typeof x === "string" ? x : x.name}</li>)}</ul> : <p className="ra-muted">No certifications detected.</p>}
                </article>
              </div>
            </section>

            <section id="ra-section-skills" className="ra-panel ra-detail-section">
              <PanelHeading icon={<ChartNoAxesColumnIncreasing size={18} />} title="Skills Analysis" count={totalSkills} />
              <p className="ra-section-description">Skills are matched against the analyzer's built-in taxonomy. A skill is listed only when a matching term is found in the resume text.</p>
              {categoryEntries.map(([name, values]) => <div className="ra-detail-skill-row" key={name}><strong>{name}</strong><div>{values.map(v => <span key={v}>{v}</span>)}</div><small>{values.length} detected</small></div>)}
              {!totalSkills && <EmptyState text="No skills found. Try a text-based PDF or DOCX resume." />}
            </section>

            <section id="ra-section-experience" className="ra-panel ra-detail-section">
              <PanelHeading icon={<BriefcaseBusiness size={18} />} title="Experience Timeline" count={asArray(parsed.experience).length} />
              {asArray(parsed.experience).length ? <div className="ra-timeline ra-timeline-large">{parsed.experience.map((item, i) => <div className="ra-timeline-item" key={i}><span className="ra-timeline-dot" /><strong>{item.role || item.title || "Experience entry"}</strong><b>{item.company || "Organization not identified"}</b><small>{[item.startDate, item.endDate].filter(Boolean).join(" – ") || "Dates not identified"}</small><p>{item.description || item.rawText}</p></div>)}</div> : <EmptyState text="No work experience entries could be reliably structured." />}
            </section>

            <section id="ra-section-score" className="ra-panel ra-detail-section">
              <PanelHeading icon={<Star size={18} />} title="Resume Score" />
              <div className="ra-score-layout"><div className="ra-score-circle"><strong>{score == null ? "—" : score}</strong><span>{score == null ? "Not scored" : "out of 100"}</span></div><div className="ra-score-breakdown">{asArray(parsed.insights?.scoreBreakdown).map((item, i) => <div key={i}><span>{item.label}</span><strong>{item.score}/{item.maxScore}</strong><div><i style={{ width: `${item.maxScore ? item.score / item.maxScore * 100 : 0}%` }} /></div></div>)}</div></div>
              <p className="ra-score-disclaimer">This transparent heuristic checks content completeness (contact details, summary, skills, education, experience, projects and certifications). It does not measure writing quality, ATS compatibility or candidate suitability.</p>
            </section>

            <section id="ra-section-suggestions" className="ra-panel ra-detail-section">
              <PanelHeading icon={<Lightbulb size={18} />} title="Improvement Suggestions" count={asArray(parsed.insights?.suggestions).length} />
              {asArray(parsed.insights?.strengths).length > 0 && <><h4 className="ra-list-heading good">Detected strengths</h4><ul className="ra-advice-list">{parsed.insights.strengths.map((x, i) => <li key={i}><CheckCircle2 size={16} />{x}</li>)}</ul></>}
              {asArray(parsed.insights?.suggestions).length > 0 ? <><h4 className="ra-list-heading">Suggested improvements</h4><ul className="ra-advice-list">{parsed.insights.suggestions.map((x, i) => <li key={i}><Lightbulb size={16} />{x}</li>)}</ul></> : <EmptyState text="No additional suggestions are available." />}
            </section>

            <section className="ra-panel ra-raw-text">
              <PanelHeading icon={<TextIcon size={18} />} title="Extracted Resume Text" action={<button className="ra-text-download" onClick={downloadText}><Download size={15} /> Download</button>} />
              <pre>{result.extractedText || "No extracted text available."}</pre>
            </section>
            <div className="ra-result-meta"><span><CheckCircle2 size={16} /> Analysis status: {result.analysisStatus || "completed"}</span><span><CalendarDays size={15} /> Uploaded {formatDate(result.createdAt)}</span></div>
          </>}

          <section className="ra-history-panel">
            <button className="ra-history-toggle" onClick={() => setShowHistory(v => !v)}><span><History size={18} /> Resume History <small>{resumes.length}</small></span><ChevronRight className={showHistory ? "rotated" : ""} size={18} /></button>
            {showHistory && (historyLoading ? <p className="ra-muted">Loading resume history...</p> : resumes.length ? <div className="ra-history-list">{resumes.map(item => <div className="ra-history-item" key={item._id}><FileText size={22} /><div><strong>{item.fileName}</strong><small>{formatDate(item.createdAt)} · {asArray(item.parsedData?.skills).length} skills</small></div><span className="ra-status">{item.analysisStatus}</span><button onClick={() => openResume(item._id)} title="View analysis"><Eye size={16} /></button><button className="danger" onClick={() => removeResume(item._id)} title="Remove"><Trash2 size={16} /></button></div>)}</div> : <p className="ra-muted">No saved resumes yet.</p>)}
          </section>

          <footer className="ra-footer"><span>© {new Date().getFullYear()} CareerCast</span><span>AI-powered career intelligence</span></footer>
        </div>
      </main>
    </div>
  );
}

function FileSearchIcon() { return <FileText size={25} />; }
function PanelHeading({ icon, title, count, action }) {
  return <div className="ra-panel-heading"><div className="ra-panel-heading-icon">{icon}</div><div><h3>{title}</h3>{count !== undefined && <small>{count} detected</small>}</div>{action && <div className="ra-panel-action">{action}</div>}</div>;
}
function InfoLine({ icon, label, value, link }) {
    return (
        <div className="ra-info-line">
            {icon}
            <span>{label}</span>
            {value
                ? link && /^https?:\/\//i.test(value)
                    ? <a href={value} target="_blank" rel="noreferrer">
                        {value} <ExternalLink size={12} />
                      </a>
                    : <strong>{value}</strong>
                : <em>Not detected</em>
            }
        </div>
    );
}
function EmptyState({ text }) { return <div className="ra-empty-state"><FileSearchIcon /><p>{text}</p></div>; }
function Metric({ icon, value, label }) {
    return (
        <div className="ra-metric">
            {icon}
            <strong>{value}</strong>
            <span>{label}</span>
        </div>
    );
}

export default ResumeAnalyzer;
