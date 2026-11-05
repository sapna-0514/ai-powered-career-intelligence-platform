
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";
import "./Login.css";

function Login() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);

            const response = await API.post("/auth/login", formData);

            localStorage.setItem("token", response.data.token);
            localStorage.setItem("user", JSON.stringify(response.data.user));

            toast.success("Login successful!");
            navigate("/dashboard");

        } catch (error) {
            toast.error(
                error.response?.data?.message || "Login failed"
            );
        } finally {
            setLoading(false);
        }
    };

    const features = [
        {
            icon: "🎓",
            title: "Discover Career Paths",
            description: "Get AI-driven career recommendations",
            color: "blue"
        },
        {
            icon: "▤",
            title: "Resume Intelligence",
            description: "Analyze and extract key skills",
            color: "purple"
        },
        {
            icon: "▥",
            title: "Identify Skill Gaps",
            description: "Know what to learn next",
            color: "indigo"
        },
        {
            icon: "↗",
            title: "Build Your Future",
            description: "Get a personalized learning roadmap",
            color: "teal"
        }
    ];

    return (
        <div className="login-page">

            {/* Background effects */}
            <div className="login-bg-glow login-glow-one"></div>
            <div className="login-bg-glow login-glow-two"></div>
            <div className="login-bg-grid"></div>

            {/* Navbar */}
            <header className="login-navbar">

                <Link to="/login" className="login-brand">

                    <div className="login-brand-icon">
                        <svg viewBox="0 0 48 48" fill="none">
                            <path
                                d="M24 7C18 2 10 7 11 14C4 17 6 27 12 29C10 37 18 42 24 37V7Z"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                            />
                            <path
                                d="M24 7C30 2 38 7 37 14C44 17 42 27 36 29C38 37 30 42 24 37V7Z"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                            />
                            <path
                                d="M16 14L20 17M12 23H19M17 31L21 28M32 14L28 17M36 23H29M31 31L27 28M24 7V39"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>

                    <div className="login-brand-text">
                        <h1><span>Career</span>Cast</h1>
                        <p>AI Career Intelligence</p>
                    </div>

                </Link>

                <nav className="login-nav-links">
                    <a href="#about">About</a>
                    <a href="#features">Features</a>
                    <a href="#contact">Contact</a>

                    <Link to="/register" className="login-nav-button">
                        Create Account
                    </Link>
                </nav>

                <Link to="/register" className="login-mobile-register">
                    Register
                </Link>

            </header>

            {/* Main Layout */}
            <main className="login-main">

                {/* LEFT CONTENT */}
                <section className="login-hero" id="about">

                    <div className="login-hero-content">

                        <div className="login-eyebrow">
                            <span></span>
                            AI-POWERED CAREER INTELLIGENCE
                        </div>

                        <h2>
                            Turn Your Skills
                            <br />
                            Into a <span>Brighter Future</span>
                        </h2>

                        <p className="login-hero-description">
                            AI-powered career insights, personalized
                            recommendations, and a roadmap to your success.
                        </p>

                        {/* Features */}
                        <div className="login-features" id="features">

                            {features.map((feature, index) => (
                                <div className="login-feature" key={index}>

                                    <div className={`login-feature-icon ${feature.color}`}>
                                        {feature.icon}
                                    </div>

                                    <div className="login-feature-content">
                                        <h3>{feature.title}</h3>
                                        <p>{feature.description}</p>
                                    </div>

                                </div>
                            ))}

                        </div>

                    </div>

                    {/* Dashboard illustration */}
                    <div className="login-illustration">

                        <div className="illustration-glow"></div>

                        <div className="dashboard-card">

                            <div className="dashboard-card-header">

                                <div>
                                    <span>CAREERCAST DASHBOARD</span>
                                    <h3>Your Career Overview</h3>
                                </div>

                                <div className="dashboard-sparkle">✦</div>

                            </div>

                            <div className="dashboard-chart">

                                {[38, 56, 48, 76, 62, 88, 100].map((height, index) => (
                                    <div className="chart-column" key={index}>
                                        <div style={{ height: `${height}%` }}></div>
                                    </div>
                                ))}

                            </div>

                            <div className="dashboard-chart-labels">
                                <span>Skills Growth</span>
                                <span>Career Progress</span>
                                <span>AI Insights</span>
                            </div>

                            <div className="dashboard-bottom">
                                <div>
                                    <span>Weekly Progress</span>
                                    <strong>+24.8%</strong>
                                </div>
                                <div>
                                    <span>Skills Improved</span>
                                    <strong>12 Skills</strong>
                                </div>
                            </div>

                        </div>

                        <div className="floating-card skills-floating">
                            <span>Skills Identified</span>
                            <strong>18</strong>
                        </div>

                        <div className="floating-card match-floating">
                            <span>Skill Match</span>
                            <strong>89%</strong>
                        </div>

                        <div className="floating-card growth-floating">
                            <span>Career Growth</span>
                            <strong>↗ On Track</strong>
                        </div>

                    </div>

                </section>

                {/* RIGHT LOGIN FORM */}
                <section className="login-form-section">

                    <div className="login-card">

                        <div className="login-card-heading">
                            <div className="login-card-icon">✦</div>

                            <h2>Welcome Back</h2>

                            <p>Sign in to your CareerCast account</p>
                        </div>

                        <form onSubmit={handleSubmit}>

                            {/* Email */}
                            <div className="login-form-group">

                                <label htmlFor="login-email">
                                    Email Address
                                </label>

                                <div className="login-input-wrapper">

                                    <svg viewBox="0 0 24 24">
                                        <rect x="3" y="5" width="18" height="14" rx="2" />
                                        <path d="m3 7 9 7 9-7" />
                                    </svg>

                                    <input
                                        id="login-email"
                                        type="email"
                                        name="email"
                                        placeholder="Enter your email address"
                                        value={formData.email}
                                        onChange={handleChange}
                                        autoComplete="email"
                                        required
                                    />

                                </div>

                            </div>

                            {/* Password */}
                            <div className="login-form-group">

                                <label htmlFor="login-password">
                                    Password
                                </label>

                                <div className="login-input-wrapper">

                                    <svg viewBox="0 0 24 24">
                                        <rect x="4" y="10" width="16" height="11" rx="2" />
                                        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                                    </svg>

                                    <input
                                        id="login-password"
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        placeholder="Enter your password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        autoComplete="current-password"
                                        required
                                    />

                                    <button
                                        type="button"
                                        className="login-password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? "Hide" : "Show"}
                                    </button>

                                </div>

                            </div>

                            {/* Remember / Forgot */}
                            <div className="login-options">

                                <label className="remember-option">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                    />
                                    <span>Remember me</span>
                                </label>

                                <Link to="/forgot-password">
                                    Forgot password?
                                </Link>

                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="login-submit-button"
                            >
                                {loading ? "Signing In..." : "Sign In"}
                                {!loading && <span>→</span>}
                            </button>

                        </form>

                        {/* Divider */}
                        <div className="login-divider">
                            <span></span>
                            <p>Or continue with</p>
                            <span></span>
                        </div>

                        {/* Social buttons - placeholders */}
                        <div className="login-social-buttons">

                            <button
                                type="button"
                                onClick={() => toast("Google login is not configured yet.")}
                            >
                                <strong className="google-icon">G</strong>
                                Google
                            </button>

                            <button
                                type="button"
                                onClick={() => toast("Microsoft login is not configured yet.")}
                            >
                                <strong className="microsoft-icon">▦</strong>
                                Microsoft
                            </button>

                            <button
                                type="button"
                                onClick={() => toast("LinkedIn login is not configured yet.")}
                            >
                                <strong className="linkedin-icon">in</strong>
                                LinkedIn
                            </button>

                        </div>

                        {/* Register */}
                        <div className="login-register-link">
                            <p>Don't have an account?</p>
                            <Link to="/register">Create one</Link>
                        </div>

                    </div>

                </section>

            </main>

            {/* Footer */}
            <footer className="login-footer" id="contact">

                <p>© 2026 CareerCast. All rights reserved.</p>

                <p>Empowering Careers with Artificial Intelligence.</p>

            </footer>

        </div>
    );
}

export default Login;
