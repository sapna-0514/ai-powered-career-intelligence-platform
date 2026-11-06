import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import ResumeAnalyzer from "./pages/ResumeAnalyzer";
import PlaceholderPage from "./pages/PlaceholderPage";

import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import CareerExplorer from "./pages/CareerExplorer";
import SkillAnalysis from "./pages/SkillAnalysis";
import LearningPath from "./pages/LearningPath";
import MockInterview from "./pages/MockInterview";
import JobRecommendations from "./pages/JobRecommendations";
import { navigationItems } from "./config/navigation";

function App() {
    return (
        <BrowserRouter>
            <Toaster position="top-right" />

            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/career-explorer" element={<CareerExplorer />} />
                <Route path="/skill-analysis" element={<SkillAnalysis />} />
                <Route path="/learning-path" element={<LearningPath />} />
                <Route path="/mock-interview" element={<MockInterview />} />
                <Route path="/job-recommendations" element={<JobRecommendations />} />

                <Route element={<ProtectedRoute />}>
                    {/* Profile keeps its own full-page layout */}
                    <Route path="/profile" element={<Profile />} />

                    {/* Everything inside here gets the shared sidebar */}
                    <Route element={<AppLayout />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/resume-analyzer" element={<ResumeAnalyzer />} />

                        {navigationItems
                            .filter((item) => item.placeholder)
                            .map((item) => (
                                <Route
                                    key={item.path}
                                    path={item.path}
                                    element={
                                        <PlaceholderPage
                                            title={item.label}
                                            description={item.description}
                                            icon={item.icon}
                                            features={item.features}
                                        />
                                    }
                                />
                            ))}
                    </Route>
                </Route>

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;