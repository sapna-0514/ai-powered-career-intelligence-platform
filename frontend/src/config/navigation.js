import {
    LayoutDashboard, Target, Network, BookOpenCheck, FileText, SquareUser,
    Waypoints, BriefcaseBusiness, ClipboardList, Award, Settings, LifeBuoy
} from "lucide-react";

// Single source of truth for the sidebar AND the placeholder routes.
export const navigationItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    {
        label: "Career Intelligence", path: "/career-intelligence", icon: Target,
        description: "AI-powered career recommendations based on your skills and profile.",
        features: ["Ranked career matches", "Demand and growth insights", "Skill alignment scores"]
    },
    {
        label: "Skill Analysis", path: "/skill-analysis", icon: Network, placeholder: true,
        description: "See where your skills stand against your target role.",
        features: ["Skill gap radar chart", "Matched vs missing skills", "Readiness score"]
    },
    {
        label: "Learning Path", path: "/learning-path", icon: BookOpenCheck, placeholder: true,
        description: "A personalised step-by-step roadmap to reach your goal role.",
        features: ["Weekly learning plan", "Recommended courses", "Progress tracking"]
    },
    { label: "Resume Analyzer", path: "/resume-analyzer", icon: FileText },
    {
        label: "Mock Interview", path: "/mock-interview", icon: SquareUser, placeholder: true,
        description: "Practise interviews with AI-generated questions and feedback.",
        features: ["Role-based question sets", "Answer scoring", "Improvement tips"]
    },
    {
        label: "Job Recommendations", path: "/job-recommendations", icon: Waypoints, placeholder: true,
        description: "Job openings matched to your skills and preferences.",
        features: ["Skill-matched openings", "Match percentage", "Save and track jobs"]
    },
    {
        label: "Placement Drives", path: "/placement-drives", icon: BriefcaseBusiness, placeholder: true,
        description: "Upcoming campus and off-campus placement drives.",
        features: ["Drive calendar", "Eligibility check", "One-click apply"]
    },
    {
        label: "Assessments", path: "/assessments", icon: ClipboardList, placeholder: true,
        description: "Skill tests to measure and prove your proficiency.",
        features: ["Topic-wise quizzes", "Instant results", "Score history"]
    },
    {
        label: "Certificates", path: "/certificates", icon: Award, placeholder: true,
        description: "Store and showcase your certifications in one place.",
        features: ["Upload certificates", "Verification status", "Downloadable portfolio"]
    },
    { label: "Settings", path: "/profile", icon: Settings },
    {
        label: "Help & Support", path: "/help", icon: LifeBuoy, placeholder: true,
        description: "Guides, FAQs and ways to contact support.",
        features: ["FAQs", "Getting-started guide", "Contact form"]
    }
];