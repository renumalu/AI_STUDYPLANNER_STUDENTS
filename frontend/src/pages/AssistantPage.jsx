import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import {
    BookOpen, Calendar, MessageSquare, Settings, LogOut, Sun, Moon,
    Send, Trash2, Bot, User, Sparkles, BarChart3
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AssistantPage() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const messagesEndRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');

    useEffect(() => {
        fetchHistory();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchHistory = async () => {
        try {
            const response = await axios.get(`${API}/chat/history`);
            setMessages(response.data);
        } catch (error) {
            console.error('Failed to fetch chat history:', error);
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setSending(true);

        try {
            const response = await axios.post(`${API}/chat/assistant`, {
                message: input
            });

            const assistantMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.data.response,
                timestamp: new Date().toISOString()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            toast.error('Failed to get response. Please try again.');
            // Remove the user message if failed
            setMessages(prev => prev.filter(m => m.id !== userMessage.id));
        } finally {
            setSending(false);
        }
    };

    const clearHistory = async () => {
        if (!window.confirm('Are you sure you want to clear chat history?')) return;

        try {
            await axios.delete(`${API}/chat/history`);
            setMessages([]);
            toast.success('Chat history cleared');
        } catch (error) {
            toast.error('Failed to clear history');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const suggestedQuestions = [
        "How can I improve my understanding of Data Structures?",
        "What's the best way to prepare for exams?",
        "Help me create a revision schedule",
        "Tips for staying focused during study sessions"
    ];

    return (
        <div className="min-h-screen bg-background flex flex-col" data-testid="assistant-page">
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
                            <Button variant="ghost" className="gap-2 bg-accent" onClick={() => navigate('/assistant')}>
                                <MessageSquare className="h-4 w-4" />
                                AI Assistant
                            </Button>
                            <Button variant="ghost" className="gap-2" onClick={() => navigate('/settings')}>
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

            {/* Main Chat Area */}
            <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight font-['Outfit']">
                            AI Study Assistant
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Your personal study helper powered by AI
                        </p>
                    </div>
                    {messages.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={clearHistory}
                            data-testid="clear-chat-btn"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear Chat
                        </Button>
                    )}
                </div>

                {/* Messages */}
                <Card className="flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1 p-4">
                        {loading ? (
                            <div className="space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                                        <Skeleton className={`h-16 ${i % 2 === 0 ? 'w-2/3' : 'w-3/4'} rounded-2xl`} />
                                    </div>
                                ))}
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center py-12">
                                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mb-4">
                                    <Sparkles className="h-8 w-8 text-white" />
                                </div>
                                <h3 className="text-lg font-medium mb-2">Hi, {user?.name?.split(' ')[0]}!</h3>
                                <p className="text-muted-foreground mb-6 max-w-md">
                                    I'm your AI study assistant. Ask me anything about your subjects, study techniques, or time management.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                                    {suggestedQuestions.map((question, index) => (
                                        <Button
                                            key={index}
                                            variant="outline"
                                            className="text-left h-auto py-3 px-4 text-sm justify-start"
                                            onClick={() => {
                                                setInput(question);
                                            }}
                                            data-testid={`suggested-question-${index}`}
                                        >
                                            {question}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        data-testid={`message-${message.id}`}
                                    >
                                        <div className={`flex items-start gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                message.role === 'user'
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-gradient-to-br from-indigo-500 to-violet-500'
                                            }`}>
                                                {message.role === 'user' ? (
                                                    <User className="h-4 w-4" />
                                                ) : (
                                                    <Bot className="h-4 w-4 text-white" />
                                                )}
                                            </div>
                                            <div className={`px-4 py-3 rounded-2xl ${
                                                message.role === 'user'
                                                    ? 'bg-primary text-primary-foreground rounded-br-md'
                                                    : 'bg-secondary text-secondary-foreground rounded-bl-md'
                                            }`}>
                                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {sending && (
                                    <div className="flex justify-start">
                                        <div className="flex items-start gap-3 max-w-[80%]">
                                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                                                <Bot className="h-4 w-4 text-white" />
                                            </div>
                                            <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-secondary">
                                                <div className="flex gap-1">
                                                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </ScrollArea>

                    {/* Input Area */}
                    <div className="p-4 border-t bg-card">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Ask me anything about your studies..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={sending}
                                className="flex-1"
                                data-testid="chat-input"
                            />
                            <Button
                                onClick={sendMessage}
                                disabled={sending || !input.trim()}
                                className="bg-gradient-to-r from-indigo-500 to-violet-500"
                                data-testid="send-message-btn"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </Card>
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
                    <Button variant="ghost" size="sm" className="flex-col h-auto py-2 text-primary" onClick={() => navigate('/assistant')}>
                        <MessageSquare className="h-5 w-5" />
                        <span className="text-xs mt-1">AI Chat</span>
                    </Button>
                </div>
            </nav>
        </div>
    );
}
