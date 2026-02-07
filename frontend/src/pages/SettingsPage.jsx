import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import {
    BookOpen, Calendar, MessageSquare, Settings, LogOut, Sun, Moon,
    Download, FileText, CalendarDays, User, Clock, Target, BarChart3
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STUDY_TIMES = [
    { value: 'morning', label: 'Morning (6 AM - 12 PM)' },
    { value: 'afternoon', label: 'Afternoon (12 PM - 6 PM)' },
    { value: 'evening', label: 'Evening (6 PM - 10 PM)' },
    { value: 'night', label: 'Night (10 PM - 2 AM)' }
];

export default function SettingsPage() {
    const { user, logout, fetchProfile } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Profile state
    const [name, setName] = useState('');
    const [college, setCollege] = useState('');
    const [branch, setBranch] = useState('');
    const [graduationYear, setGraduationYear] = useState('');
    const [weekdayHours, setWeekdayHours] = useState(3);
    const [weekendHours, setWeekendHours] = useState(6);
    const [preferredTime, setPreferredTime] = useState('evening');
    const [targetDate, setTargetDate] = useState('');

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setCollege(user.college || '');
            setBranch(user.branch || '');
            setGraduationYear(user.graduation_year?.toString() || '');
            setWeekdayHours(user.weekday_hours || 3);
            setWeekendHours(user.weekend_hours || 6);
            setPreferredTime(user.preferred_study_time || 'evening');
            setTargetDate(user.target_date || '');
            setLoading(false);
        }
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const saveProfile = async () => {
        setSaving(true);
        try {
            await axios.put(`${API}/user/profile`, {
                name,
                college,
                branch,
                graduation_year: parseInt(graduationYear),
                weekday_hours: weekdayHours,
                weekend_hours: weekendHours,
                preferred_study_time: preferredTime,
                target_date: targetDate
            });
            await fetchProfile();
            toast.success('Profile updated successfully');
        } catch (error) {
            toast.error('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const exportToICS = async () => {
        setExporting(true);
        try {
            const response = await axios.get(`${API}/export/ics`, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'study-plan.ics');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success('Calendar file downloaded! Import it into Google Calendar.');
        } catch (error) {
            toast.error('Failed to export calendar. Make sure you have a study plan generated.');
        } finally {
            setExporting(false);
        }
    };

    const exportToPDF = async () => {
        setExporting(true);
        try {
            const response = await axios.get(`${API}/export/pdf-data`);
            const data = response.data;
            
            // Generate PDF content as HTML and open in new window for printing
            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>EduBloom - Study Plan</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                        h1 { color: #4F46E5; }
                        h2 { color: #6366F1; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; }
                        .section { margin-bottom: 30px; }
                        .stat { display: inline-block; margin-right: 40px; margin-bottom: 10px; }
                        .stat-value { font-size: 24px; font-weight: bold; color: #4F46E5; }
                        .stat-label { font-size: 12px; color: #64748B; }
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #E2E8F0; }
                        th { background: #F8FAFC; font-weight: 600; }
                        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 5px; }
                        .badge-learning { background: #EEF2FF; color: #4F46E5; }
                        .badge-practice { background: #F3E8FF; color: #7C3AED; }
                        .badge-revision { background: #D1FAE5; color: #059669; }
                        @media print { body { padding: 20px; } }
                    </style>
                </head>
                <body>
                    <h1>EduBloom - Your AI Study Plan</h1>
                    
                    <div class="section">
                        <h2>Student Profile</h2>
                        <p><strong>Name:</strong> ${data.user?.name || 'N/A'}</p>
                        <p><strong>College:</strong> ${data.user?.college || 'N/A'}</p>
                        <p><strong>Branch:</strong> ${data.user?.branch || 'N/A'}</p>
                        <p><strong>Target Date:</strong> ${data.user?.target_date || 'N/A'}</p>
                    </div>
                    
                    <div class="section">
                        <h2>Progress Overview</h2>
                        <div class="stat">
                            <div class="stat-value">${data.stats?.total_subjects || 0}</div>
                            <div class="stat-label">Subjects</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${data.stats?.average_confidence || 0}</div>
                            <div class="stat-label">Avg Confidence</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${data.stats?.completion_rate || 0}%</div>
                            <div class="stat-label">Completion</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${data.stats?.completed_hours || 0}h</div>
                            <div class="stat-label">Hours Studied</div>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h2>Subjects</h2>
                        <table>
                            <tr>
                                <th>Subject</th>
                                <th>Credits</th>
                                <th>Confidence</th>
                                <th>Weak Areas</th>
                            </tr>
                            ${data.subjects?.map(s => `
                                <tr>
                                    <td>${s.name}</td>
                                    <td>${s.credits}</td>
                                    <td>${s.confidence_level}/5</td>
                                    <td>${s.weak_areas?.join(', ') || 'None'}</td>
                                </tr>
                            `).join('') || '<tr><td colspan="4">No subjects</td></tr>'}
                        </table>
                    </div>
                    
                    ${data.plan?.sessions?.length > 0 ? `
                    <div class="section">
                        <h2>Upcoming Sessions</h2>
                        <table>
                            <tr>
                                <th>Date</th>
                                <th>Subject</th>
                                <th>Time</th>
                                <th>Type</th>
                                <th>Topics</th>
                            </tr>
                            ${data.plan.sessions.slice(0, 20).map(s => `
                                <tr>
                                    <td>${s.date}</td>
                                    <td>${s.subject_name}</td>
                                    <td>${s.start_time} - ${s.end_time}</td>
                                    <td><span class="badge badge-${s.session_type}">${s.session_type}</span></td>
                                    <td>${s.topics?.join(', ') || '-'}</td>
                                </tr>
                            `).join('')}
                        </table>
                    </div>
                    ` : ''}
                    
                    ${data.plan?.recommendations?.length > 0 ? `
                    <div class="section">
                        <h2>AI Recommendations</h2>
                        <ul>
                            ${data.plan.recommendations.map(r => `<li>${r}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                    
                    <p style="margin-top: 40px; font-size: 12px; color: #94A3B8;">
                        Generated by EduBloom - AI Study Planner | ${new Date().toLocaleDateString()}
                    </p>
                </body>
                </html>
            `;
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.print();
            
            toast.success('PDF ready for printing!');
        } catch (error) {
            toast.error('Failed to export PDF');
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background p-6">
                <Skeleton className="h-12 w-48 mb-6" />
                <div className="max-w-2xl mx-auto space-y-6">
                    <Skeleton className="h-64" />
                    <Skeleton className="h-48" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20 md:pb-0" data-testid="settings-page">
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
                            <Button variant="ghost" className="gap-2" onClick={() => navigate('/dashboard')}>
                                <BarChart3 className="h-4 w-4" />
                                Dashboard
                            </Button>
                            <Button variant="ghost" className="gap-2" onClick={() => navigate('/calendar')}>
                                <Calendar className="h-4 w-4" />
                                Calendar
                            </Button>
                            <Button variant="ghost" className="gap-2" onClick={() => navigate('/subjects')}>
                                <BookOpen className="h-4 w-4" />
                                Subjects
                            </Button>
                            <Button variant="ghost" className="gap-2" onClick={() => navigate('/assistant')}>
                                <MessageSquare className="h-4 w-4" />
                                AI Assistant
                            </Button>
                            <Button variant="ghost" className="gap-2 bg-accent" onClick={() => navigate('/settings')}>
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
            <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-semibold tracking-tight font-['Outfit'] mb-2">
                        Settings
                    </h1>
                    <p className="text-muted-foreground">
                        Manage your profile and preferences
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Profile Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 font-['Outfit']">
                                <User className="h-5 w-5" />
                                Profile Information
                            </CardTitle>
                            <CardDescription>
                                Update your personal details
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        data-testid="settings-name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input value={user?.email || ''} disabled className="bg-muted" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>College</Label>
                                    <Input
                                        value={college}
                                        onChange={(e) => setCollege(e.target.value)}
                                        data-testid="settings-college"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Branch</Label>
                                    <Input
                                        value={branch}
                                        onChange={(e) => setBranch(e.target.value)}
                                        data-testid="settings-branch"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Graduation Year</Label>
                                <Select value={graduationYear} onValueChange={setGraduationYear}>
                                    <SelectTrigger data-testid="settings-year">
                                        <SelectValue placeholder="Select year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(year => (
                                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Study Preferences */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 font-['Outfit']">
                                <Clock className="h-5 w-5" />
                                Study Preferences
                            </CardTitle>
                            <CardDescription>
                                Customize your study schedule settings
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <Label>Weekday Study Hours</Label>
                                    <span className="text-sm font-mono text-muted-foreground">{weekdayHours} hrs/day</span>
                                </div>
                                <Slider
                                    value={[weekdayHours]}
                                    onValueChange={([v]) => setWeekdayHours(v)}
                                    min={1}
                                    max={8}
                                    step={0.5}
                                    data-testid="settings-weekday-hours"
                                />
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <Label>Weekend Study Hours</Label>
                                    <span className="text-sm font-mono text-muted-foreground">{weekendHours} hrs/day</span>
                                </div>
                                <Slider
                                    value={[weekendHours]}
                                    onValueChange={([v]) => setWeekendHours(v)}
                                    min={1}
                                    max={12}
                                    step={0.5}
                                    data-testid="settings-weekend-hours"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Preferred Study Time</Label>
                                <Select value={preferredTime} onValueChange={setPreferredTime}>
                                    <SelectTrigger data-testid="settings-preferred-time">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STUDY_TIMES.map(time => (
                                            <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Target Completion Date</Label>
                                <Input
                                    type="date"
                                    value={targetDate}
                                    onChange={(e) => setTargetDate(e.target.value)}
                                    data-testid="settings-target-date"
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Appearance */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 font-['Outfit']">
                                {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                                Appearance
                            </CardTitle>
                            <CardDescription>
                                Customize the look and feel
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Dark Mode</p>
                                    <p className="text-sm text-muted-foreground">Toggle dark/light theme</p>
                                </div>
                                <Switch
                                    checked={theme === 'dark'}
                                    onCheckedChange={toggleTheme}
                                    data-testid="theme-switch"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Export Options */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 font-['Outfit']">
                                <Download className="h-5 w-5" />
                                Export Study Plan
                            </CardTitle>
                            <CardDescription>
                                Download your study plan for offline use
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={exportToICS}
                                disabled={exporting}
                                data-testid="export-ics-btn"
                            >
                                <CalendarDays className="h-4 w-4 mr-2" />
                                Export to Google Calendar (.ics)
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={exportToPDF}
                                disabled={exporting}
                                data-testid="export-pdf-btn"
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                Export as PDF
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Save Button */}
                    <Button
                        className="w-full bg-gradient-to-r from-indigo-500 to-violet-500"
                        onClick={saveProfile}
                        disabled={saving}
                        data-testid="save-settings-btn"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </main>

            {/* Mobile Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-surface border-t">
                <div className="flex items-center justify-around h-16">
                    <Button variant="ghost" size="sm" className="flex-col h-auto py-2" onClick={() => navigate('/dashboard')}>
                        <BarChart3 className="h-5 w-5" />
                        <span className="text-xs mt-1">Home</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-col h-auto py-2" onClick={() => navigate('/calendar')}>
                        <Calendar className="h-5 w-5" />
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
