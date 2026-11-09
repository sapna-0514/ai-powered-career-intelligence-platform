import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
    BrainCircuit,
    FileText,
    ChartNoAxesColumnIncreasing,
    Route,
    Scale,
    ChartLine,
    Bell,
    Search,
    ArrowUpRight,
    ArrowRight,
    GraduationCap,
    Code2,
    BriefcaseBusiness,
    Sparkles,
    UserRound,
    Menu,
    Target,
    CheckCircle2,
    Clock3
} from "lucide-react";

import API from "../services/api";
import DashboardSummary from "../components/DashboardSummary";
<DashboardSummary />

function Dashboard() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;

        const fetchDashboard = async () => {
            setLoading(true);
            setError("");

            try {
                const [userResult, profileResult] = await Promise.allSettled([
                    API.get("/auth/me"),
                    API.get("/profile")
                ]);

                if (!isMounted) return;

                // Authentication check
                if (userResult.status === "rejected") {
                    const status = userResult.reason.response?.status;

                    if (status === 401) {
                        localStorage.removeItem("token");
                        localStorage.removeItem("user");
                        navigate("/login", { replace: true });
                        return;
                    }

                    throw userResult.reason;
                }

                // User information
                setUser(userResult.value.data.user);

                // Profile information
                if (profileResult.status === "fulfilled") {
                    setProfile(
                        profileResult.value.data.profile || {
                            education: [],
                            skills: [],
                            interests: [],
                            preferredCareer: []
                        }
                    );
                } else {
                    const status = profileResult.reason.response?.status;

                    if (status === 404) {
                        // Profile does not exist yet.
                        // Allow the dashboard to open.
                        setProfile({
                            education: [],
                            skills: [],
                            interests: [],
                            preferredCareer: []
                        });
                    } else if (status === 401) {
                        localStorage.removeItem("token");
                        localStorage.removeItem("user");
                        navigate("/login", { replace: true });
                        return;
                    } else {
                        throw profileResult.reason;
                    }
                }

            } catch (err) {
                console.error("Dashboard error:", err);

                if (isMounted) {
                    setError(
                        err.response?.data?.message ||
                        "Unable to load your dashboard. Please try again."
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchDashboard();

        return () => {
            isMounted = false;
        };
    }, [navigate]);

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
    };

    const retryLoading = () => {
        window.location.reload();
    };

    // Opens the shared sidebar (see components/Sidebar.jsx) on mobile.
    const openSidebar = () => {
        window.dispatchEvent(new Event("ci:open-sidebar"));
    };

    const skills = profile?.skills || [];
    const education = profile?.education || [];
    const interests = profile?.interests || [];
    const preferredCareers = profile?.preferredCareer || [];

    const completedSections = [
        education.length > 0,
        skills.length > 0,
        interests.length > 0,
        preferredCareers.length > 0
    ].filter(Boolean).length;

    const profileCompletion = Math.round(
        (completedSections / 4) * 100
    );

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-logo">
                    <BrainCircuit size={32} />
                </div>
                <div className="loading-spinner" />
                <h2>Preparing your career dashboard</h2>
                <p>Loading your profile and career information...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-loading">
                <div className="error-icon">
                    <Clock3 size={30} />
                </div>
                <h2>Something went wrong</h2>
                <p>{error}</p>
                <button className="primary-button" onClick={retryLoading}>
                    Try Again <ArrowRight size={17} />
                </button>
                <button className="text-button" onClick={logout}>
                    Logout
                </button>
            </div>
        );
    }

    if (!user || !profile) return null;

    return (
        <div className="dashboard-layout">

            {/* Main content (the sidebar now comes from AppLayout) */}
            <main className="dashboard-main">

                {/* Topbar */}
                <header className="dashboard-topbar">
                    <div className="topbar-left">
                        <button
                            className="mobile-menu"
                            onClick={openSidebar}
                            aria-label="Open navigation"
                        >
                            <Menu size={23} />
                        </button>

                        <div className="breadcrumb">
                            <span>Workspace</span>
                            <span className="breadcrumb-divider">/</span>
                            <strong>Dashboard</strong>
                        </div>
                    </div>

                    <div className="topbar-right">
                        <div className="topbar-search">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Search your dashboard..."
                                aria-label="Search dashboard"
                                disabled
                            />
                        </div>

                        <button className="notification-button" title="Notifications">
                            <Bell size={20} />
                            <span className="notification-dot" />
                        </button>

                        <div className="topbar-user">
                            <div className="user-avatar">
                                <UserRound size={23} />
                            </div>
                            <div className="user-details">
                                <strong>{user.name}</strong>
                                <span>{user.role || "Student"}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="dashboard-content">

                    {/* Welcome banner */}
                    <section className="welcome-banner">
                        <div className="welcome-content">
                            <div className="welcome-label">
                                <Sparkles size={15} />
                                YOUR PERSONAL CAREER SPACE
                            </div>

                            <h2>
                                Welcome back, {user.name?.split(" ")[0]}!
                            </h2>

                            <h3>
                                Discover your future with <span>AI.</span>
                            </h3>

                            <p>
                                Understand your strengths, explore career opportunities,
                                and build the skills needed to reach your goals.
                            </p>

                            <Link to="/resume-analyzer" className="banner-button">
                                Explore Resume Analyzer
                                <ArrowRight size={18} />
                            </Link>
                        </div>

                        <div className="welcome-visual">
                            <div className="visual-glow" />
                            <div className="visual-main-icon">
                                <BrainCircuit size={100} strokeWidth={1.2} />
                            </div>
                            <div className="floating-icon floating-icon-one">
                                <ChartLine size={25} />
                            </div>
                            <div className="floating-icon floating-icon-two">
                                <Target size={25} />
                            </div>
                            <div className="floating-icon floating-icon-three">
                                <Sparkles size={22} />
                            </div>
                        </div>
                    </section>

                    {/* Statistics */}
                    <section className="stats-grid">

                        <div className="stat-card">
                            <div className="stat-icon purple">
                                <UserRound size={25} />
                            </div>
                            <div className="stat-info">
                                <p>Profile Completion</p>
                                <h3>{profileCompletion}%</h3>
                                <div className="progress-track">
                                    <div
                                        className="progress-fill purple-fill"
                                        style={{ width: `${profileCompletion}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon blue">
                                <BriefcaseBusiness size={25} />
                            </div>
                            <div className="stat-info">
                                <p>Preferred Careers</p>
                                <h3>{preferredCareers.length}</h3>
                                <span className="stat-caption">From your profile</span>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon cyan">
                                <Code2 size={25} />
                            </div>
                            <div className="stat-info">
                                <p>Skills Identified</p>
                                <h3>{skills.length}</h3>
                                <span className="stat-caption">Added to your profile</span>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon pink">
                                <GraduationCap size={25} />
                            </div>
                            <div className="stat-info">
                                <p>Education Records</p>
                                <h3>{education.length}</h3>
                                <span className="stat-caption">Your qualifications</span>
                            </div>
                        </div>

                    </section>

                    {/* Main dashboard panels */}
                    <section className="dashboard-panels">

                        <div className="dashboard-panel profile-panel">
                            <div className="panel-heading">
                                <div>
                                    <h3>
                                        <GraduationCap size={21} />
                                        Education
                                    </h3>
                                    <p>Your academic background</p>
                                </div>
                                <Link to="/profile" className="panel-action">
                                    Edit Profile <ArrowUpRight size={16} />
                                </Link>
                            </div>

                            {education.length > 0 ? (
                                <div className="education-list">
                                    {education.map((edu, index) => (
                                        <div className="education-item" key={index}>
                                            <div className="education-icon">
                                                <GraduationCap size={21} />
                                            </div>
                                            <div>
                                                <h4>{edu.degree || "Degree not specified"}</h4>
                                                <p>{edu.institution || "Institution not specified"}</p>
                                                <span>{edu.graduationYear || "Year not specified"}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <GraduationCap size={28} />
                                    <p>No education details added yet.</p>
                                    <Link to="/profile">Complete your profile</Link>
                                </div>
                            )}
                        </div>

                        <div className="dashboard-panel skills-panel">
                            <div className="panel-heading">
                                <div>
                                    <h3>
                                        <Code2 size={21} />
                                        Technical Skills
                                    </h3>
                                    <p>Your current skill set</p>
                                </div>
                                <span className="count-label">{skills.length} skills</span>
                            </div>

                            {skills.length > 0 ? (
                                <div className="skill-tags">
                                    {skills.map((skill, index) => (
                                        <span className="skill-tag" key={index}>
                                            {typeof skill === "string" ? skill : skill.name}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <Code2 size={28} />
                                    <p>No skills added yet.</p>
                                    <Link to="/profile">Add your skills</Link>
                                </div>
                            )}
                        </div>

                    </section>

                    {/* Interests */}
                    <section className="dashboard-panels secondary-panels">

                        <div className="dashboard-panel">
                            <div className="panel-heading">
                                <div>
                                    <h3>
                                        <Sparkles size={21} />
                                        Career Interests
                                    </h3>
                                    <p>Areas you are interested in</p>
                                </div>
                            </div>

                            <div className="simple-list">
                                {interests.length > 0 ? (
                                    interests.map((interest, index) => (
                                        <div className="simple-list-item" key={index}>
                                            <CheckCircle2 size={17} />
                                            {interest}
                                        </div>
                                    ))
                                ) : (
                                    <p className="muted-text">Add your career interests to your profile.</p>
                                )}
                            </div>
                        </div>

                        <div className="dashboard-panel">
                            <div className="panel-heading">
                                <div>
                                    <h3>
                                        <Target size={21} />
                                        Preferred Careers
                                    </h3>
                                    <p>Career paths you want to explore</p>
                                </div>
                            </div>

                            <div className="simple-list">
                                {preferredCareers.length > 0 ? (
                                    preferredCareers.map((career, index) => (
                                        <div className="simple-list-item" key={index}>
                                            <ArrowUpRight size={17} />
                                            {career}
                                        </div>
                                    ))
                                ) : (
                                    <p className="muted-text">Add your preferred careers to your profile.</p>
                                )}
                            </div>
                        </div>

                    </section>

                    {/* Feature cards */}
                    <section className="tools-section">
                        <div className="section-heading">
                            <div>
                                <h2>Explore Career Tools</h2>
                                <p>Tools to help you move forward in your career.</p>
                            </div>
                        </div>

                        <div className="tools-grid">

                            <div className="tool-card">
                                <div className="tool-icon blue">
                                    <FileText size={25} />
                                </div>
                                <h3>AI Resume Analyzer</h3>
                                <p>Upload your resume and extract your skills, education, and experience using AI.</p>
                                <Link to="/resume-analyzer" className="tool-link">
                                    Analyze Resume <ArrowRight size={16} />
                                </Link>
                            </div>

                            <div className="tool-card coming-card">
                                <div className="tool-icon purple">
                                    <ChartNoAxesColumnIncreasing size={25} />
                                </div>
                                <h3>Skill Gap Analysis</h3>
                                <p>Discover the skills you need to develop for your desired career.</p>
                                <span className="coming-label">Coming soon</span>
                            </div>

                            <div className="tool-card coming-card">
                                <div className="tool-icon cyan">
                                    <Route size={25} />
                                </div>
                                <h3>Career Roadmap</h3>
                                <p>Plan your learning journey with a structured career development path.</p>
                                <span className="coming-label">Coming soon</span>
                            </div>

                            <div className="tool-card coming-card">
                                <div className="tool-icon pink">
                                    <Scale size={25} />
                                </div>
                                <h3>Career Comparison</h3>
                                <p>Compare different career options and understand their skill requirements.</p>
                                <span className="coming-label">Coming soon</span>
                            </div>

                        </div>
                    </section>

                    <footer className="dashboard-footer">
                        <span>© {new Date().getFullYear()} CareerInfinity</span>
                        <span>AI-powered career intelligence</span>
                    </footer>

                </div>
            </main>
        </div>
    );
}

export default Dashboard;
