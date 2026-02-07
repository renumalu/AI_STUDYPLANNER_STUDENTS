import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Skeleton } from '../components/ui/skeleton';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import {
    BookOpen, Calendar, MessageSquare, Settings, LogOut, Sun, Moon,
    Youtube, Search, Clock, Trash2, FileText, Download, ExternalLink,
    Sparkles, Loader2, BarChart3, Play, ListChecks
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function YouTubePage() {
    const { logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [summaries, setSummaries] = useState([]);
    const [loadingSummaries, setLoadingSummaries] = useState(true);
    const [url, setUrl] = useState('');
    const [currentSummary, setCurrentSummary] = useState(null);

    useEffect(() => {
        fetchSummaries();
    }, []);

    const fetchSummaries = async () => {
        try {
            const response = await axios.get(`${API}/youtube/summaries`);
            setSummaries(response.data);
        } catch (error) {
            console.error('Failed to fetch summaries:', error);
        } finally {
            setLoadingSummaries(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const summarizeVideo = async () => {
        if (!url.trim()) {
            toast.error('Please enter a YouTube URL');
            return;
        }

        if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
            toast.error('Please enter a valid YouTube URL');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${API}/youtube/summarize`, { url });
            setCurrentSummary(response.data);
            setSummaries(prev => [response.data, ...prev]);
            toast.success('Video summarized successfully!');
            setUrl('');
        } catch (error) {
            toast.error('Failed to summarize video. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const deleteSummary = async (summaryId) => {
        try {
            await axios.delete(`${API}/youtube/summaries/${summaryId}`);
            setSummaries(prev => prev.filter(s => s.id !== summaryId));
            if (currentSummary?.id === summaryId) {
                setCurrentSummary(null);
            }
            toast.success('Summary deleted');
        } catch (error) {
            toast.error('Failed to delete summary');
        }
    };

    const exportToPDF = (summary) => {
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${summary.video_title} - Summary</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                    h1 { color: #6366F1; font-size: 24px; }
                    h2 { color: #4F46E5; font-size: 18px; margin-top: 20px; }
                    .thumbnail { width: 100%; max-width: 500px; border-radius: 8px; }
                    .key-point { padding: 8px 0; border-bottom: 1px solid #eee; }
                    .timestamp { display: flex; gap: 10px; padding: 5px 0; }
                    .time { color: #6366F1; font-weight: bold; min-width: 50px; }
                    @media print { body { padding: 20px; } }
                </style>
            </head>
            <body>
                <img src="${summary.thumbnail}" class="thumbnail" alt="Video thumbnail" />
                <h1>${summary.video_title}</h1>
                <p><a href="${summary.video_url}">${summary.video_url}</a></p>
                
                <h2>Summary</h2>
                <p>${summary.summary}</p>
                
                <h2>Key Points</h2>
                ${summary.key_points.map(point => `<div class="key-point">• ${point}</div>`).join('')}
                
                ${summary.timestamps?.length > 0 ? `
                <h2>Important Timestamps</h2>
                ${summary.timestamps.map(ts => `
                    <div class="timestamp">
                        <span class="time">${ts.time}</span>
                        <span>${ts.topic}</span>
                    </div>
                `).join('')}
                ` : ''}
                
                <p style="margin-top: 40px; font-size: 12px; color: #888;">
                    Generated by EduBloom | ${new Date().toLocaleDateString()}
                </p>
            </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div className="min-h-screen bg-background pb-20 md:pb-0" data-testid="youtube-page">
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
                            <Button variant="ghost" className="gap-2 bg-accent" onClick={() => navigate('/youtube')}>
                                <Youtube className="h-4 w-4" />
                                YouTube
                            </Button>
                            <Button variant="ghost" className="gap-2" onClick={() => navigate('/quiz')}>
                                <ListChecks className="h-4 w-4" />
                                Quiz
                            </Button>
                            <Button variant="ghost" className="gap-2" onClick={() => navigate('/flashcards')}>
                                <BookOpen className="h-4 w-4" />
                                Flashcards
                            </Button>
                            <Button variant="ghost" className="gap-2" onClick={() => navigate('/assistant')}>
                                <MessageSquare className="h-4 w-4" />
                                AI Assistant
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
                    <h1 className="text-3xl font-semibold tracking-tight font-['Outfit'] mb-2 flex items-center gap-3">
                        <Youtube className="h-8 w-8 text-red-500" />
                        YouTube Summarizer
                    </h1>
                    <p className="text-muted-foreground">
                        Paste a YouTube video link to get AI-powered summaries, key points, and timestamps
                    </p>
                </div>

                {/* URL Input */}
                <Card className="mb-8">
                    <CardContent className="pt-6">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <Input
                                    placeholder="Paste YouTube URL here... (e.g., https://youtube.com/watch?v=...)"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && summarizeVideo()}
                                    data-testid="youtube-url-input"
                                    className="h-12"
                                />
                            </div>
                            <Button
                                onClick={summarizeVideo}
                                disabled={loading}
                                className="h-12 px-6 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                                data-testid="summarize-btn"
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                ) : (
                                    <Sparkles className="h-5 w-5 mr-2" />
                                )}
                                Summarize
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Summary Display */}
                    <div className="lg:col-span-2">
                        {currentSummary ? (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="font-['Outfit'] text-xl mb-2">
                                                {currentSummary.video_title}
                                            </CardTitle>
                                            <a 
                                                href={currentSummary.video_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-sm text-primary hover:underline flex items-center gap-1"
                                            >
                                                <ExternalLink className="h-3 w-3" />
                                                Watch on YouTube
                                            </a>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => exportToPDF(currentSummary)}
                                            data-testid="export-pdf-btn"
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Save PDF
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Thumbnail */}
                                    <img
                                        src={currentSummary.thumbnail}
                                        alt={currentSummary.video_title}
                                        className="w-full rounded-lg shadow-md"
                                    />

                                    {/* Summary */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-indigo-500" />
                                            Summary
                                        </h3>
                                        <p className="text-muted-foreground leading-relaxed">
                                            {currentSummary.summary}
                                        </p>
                                    </div>

                                    <Separator />

                                    {/* Key Points */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                            <ListChecks className="h-5 w-5 text-emerald-500" />
                                            Key Points
                                        </h3>
                                        <ul className="space-y-2">
                                            {currentSummary.key_points.map((point, index) => (
                                                <li key={index} className="flex items-start gap-3">
                                                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        <span className="text-xs text-white font-medium">{index + 1}</span>
                                                    </div>
                                                    <span>{point}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Timestamps */}
                                    {currentSummary.timestamps?.length > 0 && (
                                        <>
                                            <Separator />
                                            <div>
                                                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                                    <Clock className="h-5 w-5 text-amber-500" />
                                                    Important Timestamps
                                                </h3>
                                                <div className="space-y-2">
                                                    {currentSummary.timestamps.map((ts, index) => (
                                                        <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors">
                                                            <Badge variant="outline" className="font-mono">
                                                                {ts.time}
                                                            </Badge>
                                                            <span>{ts.topic}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="h-96 flex items-center justify-center">
                                <div className="text-center">
                                    <Youtube className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                                    <h3 className="text-lg font-medium mb-2">No Video Selected</h3>
                                    <p className="text-muted-foreground">
                                        Paste a YouTube URL above or select from your history
                                    </p>
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* History Sidebar */}
                    <div>
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-['Outfit'] text-lg">Summary History</CardTitle>
                                <CardDescription>Your previously summarized videos</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loadingSummaries ? (
                                    <div className="space-y-3">
                                        {[...Array(3)].map((_, i) => (
                                            <Skeleton key={i} className="h-20" />
                                        ))}
                                    </div>
                                ) : summaries.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Youtube className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No summaries yet</p>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-[500px]">
                                        <div className="space-y-3">
                                            {summaries.map((summary) => (
                                                <div
                                                    key={summary.id}
                                                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                                                        currentSummary?.id === summary.id ? 'border-primary bg-accent' : ''
                                                    }`}
                                                    onClick={() => setCurrentSummary(summary)}
                                                    data-testid={`summary-${summary.id}`}
                                                >
                                                    <div className="flex gap-3">
                                                        <img
                                                            src={summary.thumbnail}
                                                            alt={summary.video_title}
                                                            className="w-20 h-14 object-cover rounded"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-sm line-clamp-2">
                                                                {summary.video_title}
                                                            </h4>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                {summary.key_points?.length || 0} key points
                                                            </p>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 flex-shrink-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteSummary(summary.id);
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            {/* Mobile Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-surface border-t">
                <div className="flex items-center justify-around h-16">
                    <Button variant="ghost" size="sm" className="flex-col h-auto py-2" onClick={() => navigate('/dashboard')}>
                        <BarChart3 className="h-5 w-5" />
                        <span className="text-xs mt-1">Home</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-col h-auto py-2 text-primary" onClick={() => navigate('/youtube')}>
                        <Youtube className="h-5 w-5" />
                        <span className="text-xs mt-1">YouTube</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-col h-auto py-2" onClick={() => navigate('/quiz')}>
                        <ListChecks className="h-5 w-5" />
                        <span className="text-xs mt-1">Quiz</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-col h-auto py-2" onClick={() => navigate('/flashcards')}>
                        <BookOpen className="h-5 w-5" />
                        <span className="text-xs mt-1">Cards</span>
                    </Button>
                </div>
            </nav>
        </div>
    );
}
