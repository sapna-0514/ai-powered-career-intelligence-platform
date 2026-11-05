import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import ResumeAnalyzer from "./pages/ResumeAnalyzer";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";

import ProtectedRoute from "./components/ProtectedRoute";

function App() {

    return (
        <BrowserRouter>

            <Toaster position="top-right" />

            <Routes>

                <Route path="/" element={<Navigate to="/login" replace />} />

                <Route path="/login" element={<Login />} />

                <Route path="/register" element={<Register />} />

                <Route element={<ProtectedRoute />}>

                    <Route path="/profile" element={<Profile />} />

                    <Route path="/dashboard" element={<Dashboard />} />

                    <Route path="/resume-analyzer" element={<ResumeAnalyzer />}/>

                </Route>

            </Routes>

        </BrowserRouter>
    );
}

export default App;
