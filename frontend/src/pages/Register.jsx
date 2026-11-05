
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";
import "./Login.css";
import "./Register.css";

function Register() {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: ""
    });

    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password.length < 6) {
            toast.error("Password must contain at least 6 characters.");
            return;
        }

        if (formData.password !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }

        if (!acceptedTerms) {
            toast.error("Please accept the Terms of Service and Privacy Policy.");
            return;
        }

        try {
            setLoading(true);

            const response = await API.post(
                "/auth/register",
                formData
            );

            localStorage.setItem(
                "token",
                response.data.token
            );

            localStorage.setItem(
                "user",
                JSON.stringify(response.data.user)
            );

            toast.success("Registration successful!");

            navigate("/profile");

        } catch (error) {

            toast.error(
                error.response?.data?.message ||
                "Registration failed"
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
        <div className="login-page register-page">

            {/* Background Effects */}

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
                        <h1>
                            <span>Career</span>Cast
                        </h1>

                        <p>AI Career Intelligence</p>
                    </div>

                </Link>

                <nav className="login-nav-links">

                    <a href="#about">About</a>
                    <a href="#features">Features</a>
                    <a href="#contact">Contact</a>

                    <Link to="/login" className="login-nav-button">
                        Sign In
                    </Link>

                </nav>

                <Link to="/login" className="login-mobile-register">
                    Sign In
                </Link>

            </header>

            {/* Main Layout */}

            <main className="login-main register-main">

                {/* LEFT SECTION */}

                <section className="login-hero" id="about">

                    <div className="login-hero-content">

                        <div className="login-eyebrow">
                            <span></span>
                            YOUR FUTURE STARTS HERE
                        </div>

                        <h2>
                            Build the Career
                            <br />
                            You <span>Deserve</span>
                        </h2>

                        <p className="login-hero-description">
                            Join learners and professionals using AI
                            to discover opportunities, improve skills,
                            and shape their future.
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

                    {/* Resume Illustration */}

                    <div className="login-illustration register-illustration">

                        <div className="illustration-glow"></div>

                        <div className="resume-card">

                            <div className="resume-card-header">

                                <div className="resume-avatar">
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <circle
                                            cx="12"
                                            cy="8"
                                            r="4"
                                            fill="currentColor"
                                        />
                                        <path
                                            d="M4 21C4 16.6 7.6 14 12 14C16.4 14 20 16.6 20 21"
                                            fill="currentColor"
                                        />
                                    </svg>
                                </div>

                                <div>
                                    <h3>Your Resume</h3>
                                    <span>Professional Profile</span>
                                </div>

                            </div>

                            <div className="resume-progress">
                                <span></span>
                            </div>

                            <div className="resume-line long"></div>
                            <div className="resume-line medium"></div>

                            <div className="resume-section-title">
                                EXPERIENCE
                            </div>

                            <div className="resume-line long"></div>
                            <div className="resume-line short"></div>

                            <div className="resume-section-title">
                                EDUCATION
                            </div>

                            <div className="resume-line medium"></div>
                            <div className="resume-line short"></div>

                            <div className="resume-upload">
                                <span>↑</span>
                            </div>

                        </div>

                        {/* Floating Cards */}

                        <div className="resume-floating skills-resume">
                            <span>✦ Skills</span>
                        </div>

                        <div className="resume-floating education-resume">
                            <span>▤ Education</span>
                        </div>

                        <div className="resume-floating experience-resume">
                            <span>↗ Experience</span>
                        </div>

                        <div className="resume-floating certification-resume">
                            <span>✧ Certifications</span>
                        </div>

                    </div>

                </section>

                {/* RIGHT SECTION */}

                <section className="login-form-section register-form-section">

                    <div className="login-card register-card">

                        {/* Heading */}

                        <div className="login-card-heading register-card-heading">

                            <div className="login-card-icon">
                                ✦
                            </div>

                            <h2>Create Your Account</h2>

                            <p>
                                Join CareerCast and start your career journey
                            </p>

                        </div>

                        <form onSubmit={handleSubmit}>

                            {/* Full Name */}

                            <div className="login-form-group">

                                <label htmlFor="register-name">
                                    Full Name
                                </label>

                                <div className="login-input-wrapper">

                                    <svg viewBox="0 0 24 24">
                                        <circle cx="12" cy="8" r="4" />
                                        <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
                                    </svg>

                                    <input
                                        id="register-name"
                                        type="text"
                                        name="name"
                                        placeholder="Enter your full name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        autoComplete="name"
                                        required
                                    />

                                </div>

                            </div>

                            {/* Email */}

                            <div className="login-form-group">

                                <label htmlFor="register-email">
                                    Email Address
                                </label>

                                <div className="login-input-wrapper">

                                    <svg viewBox="0 0 24 24">
                                        <rect x="3" y="5" width="18" height="14" rx="2" />
                                        <path d="m3 7 9 7 9-7" />
                                    </svg>

                                    <input
                                        id="register-email"
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

                                <label htmlFor="register-password">
                                    Password
                                </label>

                                <div className="login-input-wrapper">

                                    <svg viewBox="0 0 24 24">
                                        <rect x="4" y="10" width="16" height="11" rx="2" />
                                        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                                    </svg>

                                    <input
                                        id="register-password"
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        placeholder="Create a password (min. 6 characters)"
                                        value={formData.password}
                                        onChange={handleChange}
                                        autoComplete="new-password"
                                        minLength={6}
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

                            {/* Confirm Password */}

                            <div className="login-form-group">

                                <label htmlFor="confirm-password">
                                    Confirm Password
                                </label>

                                <div className="login-input-wrapper">

                                    <svg viewBox="0 0 24 24">
                                        <rect x="4" y="10" width="16" height="11" rx="2" />
                                        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                                    </svg>

                                    <input
                                        id="confirm-password"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Confirm your password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        autoComplete="new-password"
                                        minLength={6}
                                        required
                                    />

                                    <button
                                        type="button"
                                        className="login-password-toggle"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                    >
                                        {showConfirmPassword ? "Hide" : "Show"}
                                    </button>

                                </div>

                            </div>

                            {/* Terms and Conditions */}

                            <div className="register-terms">

                                <label>

                                    <input
                                        type="checkbox"
                                        checked={acceptedTerms}
                                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                                        required
                                    />

                                    <span>
                                        I agree to the{" "}
                                        <Link to="/terms">
                                            Terms of Service
                                        </Link>
                                        {" "}and{" "}
                                        <Link to="/privacy-policy">
                                            Privacy Policy
                                        </Link>
                                    </span>

                                </label>

                            </div>

                            {/* Register Button */}

                            <button
                                type="submit"
                                disabled={loading}
                                className="login-submit-button register-submit-button"
                            >

                                {loading ? "Creating Account..." : "Create Account"}

                                {!loading && <span>→</span>}

                            </button>

                        </form>

                        {/* Divider */}

                        <div className="login-divider">
                            <span></span>
                            <p>Or sign up with</p>
                            <span></span>
                        </div>

                        {/* Social Buttons */}

                        <div className="login-social-buttons">

                            <button
                                type="button"
                                onClick={() => toast("Google signup is not configured yet.")}
                            >
                                <strong className="google-icon">G</strong>
                                Google
                            </button>

                            <button
                                type="button"
                                onClick={() => toast("Microsoft signup is not configured yet.")}
                            >
                                <strong className="microsoft-icon">▦</strong>
                                Microsoft
                            </button>

                            <button
                                type="button"
                                onClick={() => toast("LinkedIn signup is not configured yet.")}
                            >
                                <strong className="linkedin-icon">in</strong>
                                LinkedIn
                            </button>

                        </div>

                        {/* Login Link */}

                        <div className="login-register-link">
                            <p>Already have an account?</p>

                            <Link to="/login">
                                Sign in
                            </Link>
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

export default Register;
