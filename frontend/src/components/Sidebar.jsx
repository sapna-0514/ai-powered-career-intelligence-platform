import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { BrainCircuit, ChevronLeft, LogOut, X } from "lucide-react";
import { navigationItems } from "../config/navigation";
import "./Sidebar.css";

const COLLAPSE_KEY = "ci_sidebar_collapsed";

function Sidebar() {
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(
        () => localStorage.getItem(COLLAPSE_KEY) === "true"
    );
    const [mobileOpen, setMobileOpen] = useState(false);

    // Pages offset their content using this CSS variable.
    useEffect(() => {
        document.documentElement.style.setProperty(
            "--ci-sidebar-w",
            collapsed ? "80px" : "265px"
        );
        localStorage.setItem(COLLAPSE_KEY, String(collapsed));
    }, [collapsed]);

    // Page hamburger buttons open the sidebar on mobile via this event.
    useEffect(() => {
        const open = () => setMobileOpen(true);
        window.addEventListener("ci:open-sidebar", open);
        return () => window.removeEventListener("ci:open-sidebar", open);
    }, []);

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
    };

    return (
        <>
            {mobileOpen && (
                <button
                    className="ci-overlay"
                    aria-label="Close navigation"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside
                className={`ci-sidebar ${collapsed ? "ci-collapsed" : ""} ${mobileOpen ? "ci-open" : ""}`}
            >
                <div className="ci-brand">
                    <div className="ci-logo"><BrainCircuit size={26} /></div>
                    <div className="ci-brand-text">
                        <h1>Career<span>Infinity</span></h1>
                        <p>AI POWERED</p>
                    </div>
                    <button
                        className="ci-mobile-close"
                        onClick={() => setMobileOpen(false)}
                        aria-label="Close menu"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="ci-nav">
                    {navigationItems.map(({ label, path, icon: Icon }) => (
                        <NavLink
                            key={path}
                            to={path}
                            title={collapsed ? label : undefined}
                            className={({ isActive }) => `ci-link ${isActive ? "active" : ""}`}
                            onClick={() => setMobileOpen(false)}
                        >
                            <Icon size={20} />
                            <span className="ci-label">{label}</span>
                        </NavLink>
                    ))}
                </nav>

                <button className="ci-link ci-logout" onClick={logout} title="Logout">
                    <LogOut size={20} />
                    <span className="ci-label">Logout</span>
                </button>

                <button
                    className="ci-collapse"
                    onClick={() => setCollapsed((c) => !c)}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <ChevronLeft size={16} />
                </button>
            </aside>
        </>
    );
}

export default Sidebar;