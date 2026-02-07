import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Calendar } from '../components/ui/calendar';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import {
    BookOpen, Calendar as CalendarIcon, MessageSquare, Settings, LogOut, Sun, Moon,
    ChevronLeft, ChevronRight, Clock, Zap, BarChart3
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CalendarPage() {
    const { logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [plan, setPlan] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDaySessions, setSelectedDaySessions] = useState([]);

    useEffect(() => {
        fetchPlan();
    }, []);

    useEffect(() => {
        if (plan?.sessions) {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const sessions = plan.sessions.filter(s => s.date === dateStr);
            setSelectedDaySessions(sessions);
        }
    }, [selectedDate, plan]);

    const fetchPlan = async () => {
        try {
            const response = await axios.get(`${API}/study-plan`);
            setPlan(response.data);
        } catch (error) {
            console.error('Failed to fetch plan:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getSessionsForDate = (date) => {
        if (!plan?.sessions) return [];
        const dateStr = format(date, 'yyyy-MM-dd');
        return plan.sessions.filter(s => s.date === dateStr);
    };

    const getDayModifiers = () => {
        if (!plan?.sessions) return {};

        const modifiers = {
            hasSession: [],
            highLoad: [],
            mediumLoad: [],
            lowLoad: []
        };

        plan.sessions.forEach(session => {
            const date = parseISO(session.date);
            modifiers.hasSession.push(date);
            
            if (session.cognitive_load === 'high') {
                modifiers.highLoad.push(date);
            } else if (session.cognitive_load === 'medium') {
                modifiers.mediumLoad.push(date);
            } else {
                modifiers.lowLoad.push(date);
            }
        });

        return modifiers;
    };

    const getCognitiveLoadColor = (load) => {
        switch (load) {
            case 'high': return 'text-red-500 bg-red-500/10';
            case 'medium': return 'text-amber-500 bg-amber-500/10';
            case 'low': return 'text-green-500 bg-green-500/10';
            default: return 'text-muted-foreground';
        }
    };

    const getSessionTypeColor = (type) => {
        switch (type) {
            case 'learning': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
            case 'practice': return 'bg-violet-500/10 text-violet-600 dark:text-violet-400';
            case 'revision': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
            case 'buffer': return 'bg-slate-500/10 text-slate-600 dark:text-slate-400';
            default: return '';
        }
    };

    const modifiers = getDayModifiers();

    if (loading) {
        return (
            <div className="min-h-screen bg-background p-6">
                <Skeleton className="h-12 w-48 mb-6" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-96 lg:col-span-2" />
                    <Skeleton className="h-96" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background" data-testid="calendar-page">
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
                            <Button variant="ghost" className="gap-2" onClick={() => navigate('/dashboard')} data-testid="nav-dashboard">
                                <BarChart3 className="h-4 w-4" />
                                Dashboard
                            </Button>
                            <Button variant="ghost" className="gap-2 bg-accent" onClick={() => navigate('/calendar')} data-testid="nav-calendar">
                                <CalendarIcon className="h-4 w-4" />
                                Calendar
                            </Button>
                            <Button variant="ghost" className="gap-2" onClick={() => navigate('/subjects')} data-testid="nav-subjects">
                                <BookOpen className="h-4 w-4" />
                                Subjects
                            </Button>
                            <Button variant="ghost" className="gap-2" onClick={() => navigate('/assistant')} data-testid="nav-assistant">
                                <MessageSquare className="h-4 w-4" />
                                AI Assistant
                            </Button>
                            <Button variant="ghost" className="gap-2" onClick={() => navigate('/settings')} data-testid="nav-settings">
                                <Settings className="h-4 w-4" />
                                Settings
                            </Button>
                        </nav>

                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={toggleTheme}>
                                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleLogout}>
                                <LogOut className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-semibold tracking-tight font-['Outfit'] mb-2">
                        Study Calendar
                    </h1>
                    <p className="text-muted-foreground">
                        View and manage your study schedule
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendar */}
                    <Card className="lg:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="font-['Outfit']">
                                {format(currentMonth, 'MMMM yyyy')}
                            </CardTitle>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                    data-testid="prev-month-btn"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                    data-testid="next-month-btn"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => date && setSelectedDate(date)}
                                month={currentMonth}
                                onMonthChange={setCurrentMonth}
                                className="rounded-md w-full"
                                modifiers={modifiers}
                                modifiersClassNames={{
                                    hasSession: 'bg-primary/10 font-medium',
                                    highLoad: 'border-2 border-red-500',
                                    mediumLoad: 'border-2 border-amber-500',
                                    lowLoad: 'border-2 border-green-500'
                                }}
                                data-testid="study-calendar"
                            />
                            
                            {/* Legend */}
                            <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded border-2 border-red-500" />
                                    <span className="text-muted-foreground">High Load</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded border-2 border-amber-500" />
                                    <span className="text-muted-foreground">Medium Load</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded border-2 border-green-500" />
                                    <span className="text-muted-foreground">Low Load</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Selected Day Sessions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-['Outfit']">
                                {format(selectedDate, 'EEEE, MMM d')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {selectedDaySessions.length === 0 ? (
                                <div className="text-center py-8">
                                    <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                                    <p className="text-muted-foreground">No sessions scheduled</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedDaySessions.map((session) => (
                                        <div
                                            key={session.id}
                                            className="p-3 rounded-lg border"
                                            style={{ borderLeftColor: session.color, borderLeftWidth: '4px' }}
                                            data-testid={`calendar-session-${session.id}`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-sm">{session.subject_name}</span>
                                                <Badge className={`text-xs ${getCognitiveLoadColor(session.cognitive_load)}`}>
                                                    <Zap className="h-3 w-3 mr-1" />
                                                    {session.cognitive_load}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                                <Clock className="h-3 w-3" />
                                                <span className="font-mono">{session.start_time} - {session.end_time}</span>
                                                <span>({session.duration_hours}h)</span>
                                            </div>
                                            <Badge variant="secondary" className={`text-xs ${getSessionTypeColor(session.session_type)}`}>
                                                {session.session_type}
                                            </Badge>
                                            {session.topics?.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {session.topics.map((topic, i) => (
                                                        <Badge key={i} variant="outline" className="text-xs">
                                                            {topic}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Weekly Overview */}
                {plan?.sessions && (
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle className="font-['Outfit']">Weekly Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-7 gap-2">
                                {eachDayOfInterval({
                                    start: startOfMonth(currentMonth),
                                    end: endOfMonth(currentMonth)
                                }).slice(0, 7).map((day, index) => {
                                    const sessions = getSessionsForDate(day);
                                    const totalHours = sessions.reduce((sum, s) => sum + s.duration_hours, 0);
                                    
                                    return (
                                        <div
                                            key={index}
                                            className={`p-3 rounded-lg border text-center cursor-pointer transition-all hover:shadow-md ${
                                                isSameDay(day, selectedDate) ? 'border-primary bg-accent' : ''
                                            }`}
                                            onClick={() => setSelectedDate(day)}
                                        >
                                            <div className="text-xs text-muted-foreground mb-1">
                                                {format(day, 'EEE')}
                                            </div>
                                            <div className="text-lg font-semibold font-mono">
                                                {format(day, 'd')}
                                            </div>
                                            {totalHours > 0 && (
                                                <div className="text-xs text-primary mt-1 font-mono">
                                                    {totalHours}h
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </main>

            {/* Mobile Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-surface border-t">
                <div className="flex items-center justify-around h-16">
                    <Button variant="ghost" size="sm" className="flex-col h-auto py-2" onClick={() => navigate('/dashboard')}>
                        <BarChart3 className="h-5 w-5" />
                        <span className="text-xs mt-1">Home</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-col h-auto py-2 text-primary" onClick={() => navigate('/calendar')}>
                        <CalendarIcon className="h-5 w-5" />
                        <span className="text-xs mt-1">Calendar</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-col h-auto py-2" onClick={() => navigate('/subjects')}>
                        <BookOpen className="h-5 w-5" />
                        <span className="text-xs mt-1">Subjects</span>
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
