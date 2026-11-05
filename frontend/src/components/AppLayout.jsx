import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

function AppLayout() {
    return (
        <div className="ci-shell">
            <Sidebar />
            <div className="ci-content">
                <Outlet />
            </div>
        </div>
    );
}

export default AppLayout;