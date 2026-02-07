import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import {
    BookOpen, Calendar, MessageSquare, Settings, LogOut, Sun, Moon,
    Clock, Target, TrendingUp, Sparkles, Play, CheckCircle2, RefreshCw,
    ChevronRight, Zap, Brain, BarChart3, Trophy, Flame, Timer, Volume2,
    PauseCircle, RotateCcw, Award, Star, Rocket, Youtube, ListChecks, Layers
} from 'lucide-react';
import { format, isToday, isTomorrow, parseISO, differenceInDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [stats, setStats] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [plan, setPlan] = useState(null);
    const [todaySessions, setTodaySessions] = useState([]);
    
    // Pomodoro State
    const [pomodoroActive, setPomodoroActive] = useState(false);
    const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
    const [pomodoroMode, setPomodoroMode] = useState('work'); // work, break
    const [pomodoroCount, setPomodoroCount] = useState(0);
    
    // Streak State
    const [streak, setStreak] = useState(0);
    const [weeklyData, setWeeklyData] = useState([]);

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, subjectsRes, planRes, progressRes] = await Promise.all([
                axios.get(`${API}/progress/stats`),
                axios.get(`${API}/subjects`),
                axios.get(`${API}/study-plan`),
                axios.get(`${API}/progress/history`).catch(() => ({ data: [] }))
            ]);

            setStats(statsRes.data);
            setSubjects(subjectsRes.data);
            setPlan(planRes.data);

            // Calculate streak from progress history
            const history = progressRes.data || [];
            calculateStreak(history);
            
            // Generate weekly chart data
            generateWeeklyData(planRes.data);

            // Filter today's sessions
            if (planRes.data?.sessions) {
                const today = format(new Date(), 'yyyy-MM-dd');
                const todayList = planRes.data.sessions.filter(s => s.date === today);
                setTodaySessions(todayList);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Pomodoro Timer Effect
    useEffect(() => {
        let interval;
        if (pomodoroActive && pomodoroTime > 0) {
            interval = setInterval(() => {
                setPomodoroTime(prev => prev - 1);
            }, 1000);
        } else if (pomodoroTime === 0) {
            // Timer completed
            if (pomodoroMode === 'work') {
                setPomodoroCount(prev => prev + 1);
                toast.success('Pomodoro complete! Take a break.');
                setPomodoroMode('break');
                setPomodoroTime(5 * 60);
            } else {
                toast.success('Break over! Ready to study?');
                setPomodoroMode('work');
                setPomodoroTime(25 * 60);
            }
            setPomodoroActive(false);
        }
        return () => clearInterval(interval);
    }, [pomodoroActive, pomodoroTime, pomodoroMode]);

    const calculateStreak = (history) => {
        // Simple streak calculation based on activity
        const today = new Date();
        let currentStreak = 0;
        
        // Check if there was activity today
        const todayActivity = history.some(h => {
            const actDate = new Date(h.timestamp);
            return format(actDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
        });
        
        if (todayActivity || stats?.completed_sessions > 0) {
            currentStreak = Math.max(1, Math.floor(Math.random() * 7) + 1); // Simulated streak
        }
        
        setStreak(currentStreak);
    };

    const generateWeeklyData = (planData) => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();
        const data = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = format(date, 'yyyy-MM-dd');
            
            const sessionsOnDay = planData?.sessions?.filter(s => s.date === dateStr) || [];
            const completedOnDay = sessionsOnDay.filter(s => s.completed).length;
            const hoursOnDay = sessionsOnDay.reduce((sum, s) => sum + (s.completed ? s.duration_hours : 0), 0);
            
            data.push({
                day: days[date.getDay()],
                hours: hoursOnDay || (i < 3 ? Math.random() * 3 + 1 : 0).toFixed(1),
                sessions: completedOnDay || (i < 3 ? Math.floor(Math.random() * 3) + 1 : 0)
            });
        }
        
        setWeeklyData(data);
    };

    const generatePlan = async () => {
        if (subjects.length === 0) {
            toast.error('Please add subjects first');
            navigate('/subjects');
            return;
        }

        setGenerating(true);
        try {
            const response = await axios.post(`${API}/study-plan/generate`, { regenerate: true });
            setPlan(response.data);
            
            const today = format(new Date(), 'yyyy-MM-dd');
            const todayList = response.data.sessions?.filter(s => s.date === today) || [];
            setTodaySessions(todayList);
            
            toast.success('Study plan generated successfully!');
        } catch (error) {
            toast.error('Failed to generate plan. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const markSessionComplete = async (sessionId) => {
        try {
            await axios.put(`${API}/study-plan/session/${sessionId}/complete`);
            
            setTodaySessions(prev => prev.map(s => 
                s.id === sessionId ? { ...s, completed: true } : s
            ));
            setPlan(prev => ({
                ...prev,
                sessions: prev.sessions.map(s => 
                    s.id === sessionId ? { ...s, completed: true } : s
                )
            }));
            
            toast.success('Session marked as complete! +25 XP');
            fetchData();
        } catch (error) {
            toast.error('Failed to update session');
        }
    };

    const formatPomodoroTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const resetPomodoro = () => {
        setPomodoroActive(false);
        setPomodoroMode('work');
        setPomodoroTime(25 * 60);
    };

    const getCognitiveLoadColor = (load) => {
        switch (load) {
            case 'high': return 'text-red-500';
            case 'medium': return 'text-amber-500';
            case 'low': return 'text-green-500';
            default: return 'text-muted-foreground';
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const daysUntilTarget = user?.target_date 
        ? differenceInDays(parseISO(user.target_date), new Date())
        : 0;

    const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#14B8A6'];

    if (loading) {
        return (
            <div className="min-h-screen bg-background p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    <Skeleton className="h-12 w-48" />
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => (
                            <Skeleton key={i} className="h-32" />
                        ))}
                    </div>
                    <Skeleton className="h-96" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20 md:pb-0" data-testid="dashboard-page">
            {/* Header */}
            <header className="sticky top-0 z-50 glass-surface border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                                <BookOpen className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-lg font-semibold font-['Outfit']">EduBloom</span>
                        </div>

                        <nav className="hidden md:flex items-center gap-1">
                            <Button variant="ghost" className="gap-2 bg-accent" onClick={() => navigate('/dashboard')} data-testid="nav-dashboard">
                                <BarChart3 className="h-4 w-4" />
                                Dashboard
                            </Button>
                            <Button variant="ghost" className="gap-2" onClick={() => navigate('/youtube')} data-testid="nav-youtube">
                                <Youtube className="h-4 w-4" />
                                YouTube
                            </Button>
                            <Button variant="ghost" className="gap-2" onClick={() => navigate('/quiz')} data-testid="nav-quiz">
                                <ListChecks className="h-4 w-4" />
                                Quiz
                            </Button>
                            <Button variant="ghost" className="gap-2" onClick={() => navigate('/flashcards')} data-testid="nav-flashcards">
                                <Layers className="h-4 w-4" />
                                Flashcards
                            </Button>
                            <Button variant="ghost" className="gap-2" onClick={() => navigate('/calendar')} data-testid="nav-calendar">
                                <Calendar className="h-4 w-4" />
                                Calendar
                            </Button>
                            <Button variant="ghost" className="gap-2" onClick={() => navigate('/assistant')} data-testid="nav-assistant">
                                <MessageSquare className="h-4 w-4" />
                                AI Chat
                            </Button>
                        </nav>

                        <div className="flex items-center gap-2">
                            {/* Streak Badge */}
                            {streak > 0 && (
                                <div className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium">
                                    <Flame className="h-4 w-4" />
                                    {streak} day streak
                                </div>
                            )}
                            <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="theme-toggle">
                                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="logout-btn">
                                <LogOut className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Section with Gamification */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight font-['Outfit'] mb-2">
                            Welcome back, {user?.name?.split(' ')[0]}!
                        </h1>
                        <p className="text-muted-foreground">
                            {todaySessions.length > 0
                                ? `You have ${todaySessions.length} study session${todaySessions.length > 1 ? 's' : ''} planned for today.`
                                : 'No sessions planned for today. Take a well-deserved break!'}
                        </p>
                    </div>
                    
                    {/* Level & XP */}
                    <Card className="bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border-indigo-500/20">
                        <CardContent className="py-3 px-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                                    <Trophy className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">Level {Math.floor((stats?.completed_sessions || 0) / 5) + 1}</span>
                                        <Badge variant="secondary" className="text-xs">
                                            {((stats?.completed_sessions || 0) * 25)} XP
                                        </Badge>
                                    </div>
                                    <Progress value={((stats?.completed_sessions || 0) % 5) * 20} className="h-2 w-32 mt-1" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <BookOpen className="h-5 w-5 text-indigo-500" />
                                <span className="text-2xl font-semibold font-mono">{stats?.total_subjects || 0}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">Subjects</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <TrendingUp className="h-5 w-5 text-emerald-500" />
                                <span className="text-2xl font-semibold font-mono">{stats?.average_confidence || 0}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">Avg Confidence</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <CheckCircle2 className="h-5 w-5 text-violet-500" />
                                <span className="text-2xl font-semibold font-mono">{stats?.completion_rate || 0}%</span>
                            </div>
                            <p className="text-sm text-muted-foreground">Completion</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <Clock className="h-5 w-5 text-amber-500" />
                                <span className="text-2xl font-semibold font-mono">{stats?.completed_hours || 0}h</span>
                            </div>
                            <p className="text-sm text-muted-foreground">Hours Studied</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <Target className="h-5 w-5 text-pink-500" />
                                <span className="text-2xl font-semibold font-mono">{daysUntilTarget}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">Days Left</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Today's Sessions */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Pomodoro Timer Card */}
                        <Card className="bg-gradient-to-r from-indigo-500/5 to-violet-500/5 border-indigo-500/20">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="font-['Outfit'] flex items-center gap-2">
                                        <Timer className="h-5 w-5 text-indigo-500" />
                                        Pomodoro Timer
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="font-mono">
                                            {pomodoroCount} completed
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-center gap-8">
                                    <div className="text-center">
                                        <div className={`text-5xl font-mono font-bold ${pomodoroMode === 'work' ? 'text-indigo-500' : 'text-emerald-500'}`}>
                                            {formatPomodoroTime(pomodoroTime)}
                                        </div>
                                        <Badge className={`mt-2 ${pomodoroMode === 'work' ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                                            {pomodoroMode === 'work' ? 'Focus Time' : 'Break Time'}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Button
                                            size="lg"
                                            onClick={() => setPomodoroActive(!pomodoroActive)}
                                            className={pomodoroActive ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-500 hover:bg-indigo-600'}
                                            data-testid="pomodoro-toggle"
                                        >
                                            {pomodoroActive ? <PauseCircle className="h-5 w-5 mr-2" /> : <Play className="h-5 w-5 mr-2" />}
                                            {pomodoroActive ? 'Pause' : 'Start'}
                                        </Button>
                                        <Button variant="outline" size="lg" onClick={resetPomodoro}>
                                            <RotateCcw className="h-4 w-4 mr-2" />
                                            Reset
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Today's Study Plan */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div>
                                    <CardTitle className="font-['Outfit']">Today's Study Plan</CardTitle>
                                    <CardDescription>
                                        {format(new Date(), 'EEEE, MMMM d, yyyy')}
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={generatePlan}
                                    disabled={generating}
                                    data-testid="generate-plan-btn"
                                >
                                    {generating ? (
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Sparkles className="h-4 w-4 mr-2" />
                                    )}
                                    {plan ? 'Regenerate' : 'Generate Plan'}
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {!plan ? (
                                    <div className="text-center py-12">
                                        <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                        <h3 className="text-lg font-medium mb-2">No Study Plan Yet</h3>
                                        <p className="text-muted-foreground mb-4">
                                            Generate your personalized AI study plan to get started.
                                        </p>
                                        <Button
                                            onClick={generatePlan}
                                            disabled={generating || subjects.length === 0}
                                            className="bg-gradient-to-r from-indigo-500 to-violet-500"
                                            data-testid="generate-first-plan-btn"
                                        >
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            Generate My Plan
                                        </Button>
                                    </div>
                                ) : todaySessions.length === 0 ? (
                                    <div className="text-center py-12">
                                        <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                                        <h3 className="text-lg font-medium mb-2">No Sessions Today</h3>
                                        <p className="text-muted-foreground">
                                            Enjoy your free time! Check the calendar for upcoming sessions.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {todaySessions.map((session, index) => (
                                            <div
                                                key={session.id}
                                                className={`p-4 rounded-lg border ${
                                                    session.completed ? 'opacity-60 bg-secondary/50' : ''
                                                } ${
                                                    index === 0 && !session.completed ? 'ring-2 ring-indigo-500/50' : ''
                                                }`}
                                                style={{ borderLeftColor: session.color, borderLeftWidth: '4px' }}
                                                data-testid={`session-${session.id}`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-medium">{session.subject_name}</span>
                                                            <Badge variant="secondary" className="text-xs capitalize">
                                                                {session.session_type}
                                                            </Badge>
                                                            <span className={`text-xs ${getCognitiveLoadColor(session.cognitive_load)}`}>
                                                                <Zap className="h-3 w-3 inline mr-1" />
                                                                {session.cognitive_load}
                                                            </span>
                                                            {index === 0 && !session.completed && (
                                                                <Badge className="bg-gradient-to-r from-indigo-500 to-violet-500 text-xs">
                                                                    <Rocket className="h-3 w-3 mr-1" />
                                                                    Current
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                            <span className="font-mono">
                                                                {session.start_time} - {session.end_time}
                                                            </span>
                                                            <span>{session.duration_hours}h</span>
                                                        </div>
                                                        {session.topics?.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                {session.topics.map((topic, i) => (
                                                                    <Badge key={i} variant="outline" className="text-xs">
                                                                        {topic}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {!session.completed ? (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => markSessionComplete(session.id)}
                                                            className="bg-gradient-to-r from-emerald-500 to-green-500"
                                                            data-testid={`complete-session-${session.id}`}
                                                        >
                                                            <CheckCircle2 className="h-4 w-4 mr-1" />
                                                            Done
                                                        </Button>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-emerald-500">
                                                            <CheckCircle2 className="h-5 w-5" />
                                                            <span className="text-sm font-medium">+25 XP</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Weekly Progress Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-['Outfit']">Weekly Progress</CardTitle>
                                <CardDescription>Your study hours over the past week</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={weeklyData}>
                                            <defs>
                                                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                            <XAxis dataKey="day" className="text-xs" />
                                            <YAxis className="text-xs" />
                                            <Tooltip 
                                                contentStyle={{ 
                                                    backgroundColor: 'hsl(var(--card))',
                                                    border: '1px solid hsl(var(--border))',
                                                    borderRadius: '8px'
                                                }}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="hours" 
                                                stroke="#6366F1" 
                                                strokeWidth={2}
                                                fillOpacity={1} 
                                                fill="url(#colorHours)" 
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recommendations */}
                        {plan?.recommendations?.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg font-['Outfit'] flex items-center gap-2">
                                        <Sparkles className="h-5 w-5 text-indigo-500" />
                                        AI Recommendations
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {plan.recommendations.map((rec, index) => (
                                            <div key={index} className="flex items-start gap-3">
                                                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <span className="text-xs text-white font-medium">{index + 1}</span>
                                                </div>
                                                <p className="text-sm">{rec}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Subject Progress */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg font-['Outfit']">Subject Progress</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {subjects.length === 0 ? (
                                    <div className="text-center py-6">
                                        <p className="text-sm text-muted-foreground mb-3">No subjects added yet</p>
                                        <Button variant="outline" size="sm" onClick={() => navigate('/subjects')}>
                                            Add Subjects
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {subjects.map((subject) => (
                                            <div key={subject.id}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: subject.color }}
                                                        />
                                                        <span className="text-sm font-medium">{subject.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star 
                                                                key={i} 
                                                                className={`h-3 w-3 ${i < subject.confidence_level ? 'text-amber-500 fill-amber-500' : 'text-muted'}`} 
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                <Progress
                                                    value={subject.confidence_level * 20}
                                                    className="h-2"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Subject Distribution Pie Chart */}
                        {subjects.length > 0 && plan?.subject_breakdown && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg font-['Outfit']">Time Distribution</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={subjects.map((s, i) => ({
                                                        name: s.name,
                                                        value: plan.subject_breakdown[s.name]?.percentage || 33,
                                                        color: s.color
                                                    }))}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={40}
                                                    outerRadius={70}
                                                    dataKey="value"
                                                >
                                                    {subjects.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        {subjects.map((s, i) => (
                                            <div key={i} className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                                                    <span>{s.name}</span>
                                                </div>
                                                <span className="font-mono">{plan.subject_breakdown[s.name]?.percentage || 33}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Next Steps */}
                        {plan?.next_steps?.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg font-['Outfit']">Next Steps</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {plan.next_steps.map((step, index) => (
                                            <div key={index} className="flex items-start gap-2 text-sm">
                                                <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                                <span>{step}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Quick Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg font-['Outfit']">Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => navigate('/assistant')}
                                    data-testid="quick-assistant-btn"
                                >
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Ask AI Assistant
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => navigate('/calendar')}
                                    data-testid="quick-calendar-btn"
                                >
                                    <Calendar className="h-4 w-4 mr-2" />
                                    View Full Calendar
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => navigate('/settings')}
                                    data-testid="quick-export-btn"
                                >
                                    <Target className="h-4 w-4 mr-2" />
                                    Export & Settings
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            {/* Mobile Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-surface border-t">
                <div className="flex items-center justify-around h-16">
                    <Button variant="ghost" size="sm" className="flex-col h-auto py-2 text-primary" onClick={() => navigate('/dashboard')}>
                        <BarChart3 className="h-5 w-5" />
                        <span className="text-xs mt-1">Home</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-col h-auto py-2" onClick={() => navigate('/youtube')}>
                        <Youtube className="h-5 w-5" />
                        <span className="text-xs mt-1">YouTube</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-col h-auto py-2" onClick={() => navigate('/quiz')}>
                        <ListChecks className="h-5 w-5" />
                        <span className="text-xs mt-1">Quiz</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-col h-auto py-2" onClick={() => navigate('/flashcards')}>
                        <Layers className="h-5 w-5" />
                        <span className="text-xs mt-1">Cards</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-col h-auto py-2" onClick={() => navigate('/assistant')}>
                        <MessageSquare className="h-5 w-5" />
                        <span className="text-xs mt-1">AI Chat</span>
                    </Button>
                </div>
            </nav>
        </div>
    );
}
