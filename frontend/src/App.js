import "@/App.css";
import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Toaster } from "./components/ui/sonner";

// Pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import OnboardingPage from "./pages/OnboardingPage";
import DashboardPage from "./pages/DashboardPage";
import CalendarPage from "./pages/CalendarPage";
import SubjectsPage from "./pages/SubjectsPage";
import AssistantPage from "./pages/AssistantPage";
import SettingsPage from "./pages/SettingsPage";
import YouTubePage from "./pages/YouTubePage";
import QuizPage from "./pages/QuizPage";
import FlashcardsPage from "./pages/FlashcardsPage";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { user, loading, token } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="h-8 w-8 spinner" />
            </div>
        );
    }

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

// Onboarding Check Route
const OnboardingCheck = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="h-8 w-8 spinner" />
            </div>
        );
    }

    if (user && !user.onboarding_completed) {
        return <Navigate to="/onboarding" replace />;
    }

    return children;
};

// Public Route (redirect if already logged in)
const PublicRoute = ({ children }) => {
    const { user, loading, token } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="h-8 w-8 spinner" />
            </div>
        );
    }

    if (token && user?.onboarding_completed) {
        return <Navigate to="/dashboard" replace />;
    }

    if (token && !user?.onboarding_completed) {
        return <Navigate to="/onboarding" replace />;
    }

    return children;
};

function AppRoutes() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <LoginPage />
                    </PublicRoute>
                }
            />
            <Route
                path="/register"
                element={
                    <PublicRoute>
                        <RegisterPage />
                    </PublicRoute>
                }
            />

            {/* Onboarding Route */}
            <Route
                path="/onboarding"
                element={
                    <ProtectedRoute>
                        <OnboardingPage />
                    </ProtectedRoute>
                }
            />

            {/* Protected Routes */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <OnboardingCheck>
                            <DashboardPage />
                        </OnboardingCheck>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/calendar"
                element={
                    <ProtectedRoute>
                        <OnboardingCheck>
                            <CalendarPage />
                        </OnboardingCheck>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/subjects"
                element={
                    <ProtectedRoute>
                        <OnboardingCheck>
                            <SubjectsPage />
                        </OnboardingCheck>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/assistant"
                element={
                    <ProtectedRoute>
                        <OnboardingCheck>
                            <AssistantPage />
                        </OnboardingCheck>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/settings"
                element={
                    <ProtectedRoute>
                        <OnboardingCheck>
                            <SettingsPage />
                        </OnboardingCheck>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/youtube"
                element={
                    <ProtectedRoute>
                        <OnboardingCheck>
                            <YouTubePage />
                        </OnboardingCheck>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/quiz"
                element={
                    <ProtectedRoute>
                        <OnboardingCheck>
                            <QuizPage />
                        </OnboardingCheck>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/flashcards"
                element={
                    <ProtectedRoute>
                        <OnboardingCheck>
                            <FlashcardsPage />
                        </OnboardingCheck>
                    </ProtectedRoute>
                }
            />

            {/* Default Route */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter>
                    <AppRoutes />
                    <Toaster position="top-right" richColors closeButton />
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
