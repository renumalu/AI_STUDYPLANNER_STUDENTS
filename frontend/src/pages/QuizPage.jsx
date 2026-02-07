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
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import {
    BookOpen, LogOut, Sun, Moon, Youtube, ListChecks, BarChart3,
    MessageSquare, Play, CheckCircle2, XCircle, Trophy, Target,
    Sparkles, Loader2, ArrowRight, RotateCcw, Clock, Zap
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function QuizPage() {
    const { logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingSubjects, setLoadingSubjects] = useState(true);
    
    // Quiz state
    const [quiz, setQuiz] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [results, setResults] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    
    // Form state
    const [selectedSubject, setSelectedSubject] = useState('any');
    const [topic, setTopic] = useState('');
    const [numQuestions, setNumQuestions] = useState('5');
    const [difficulty, setDifficulty] = useState('medium');
    
    // History
    const [quizHistory, setQuizHistory] = useState([]);

    useEffect(() => {
        fetchSubjects();
        fetchHistory();
    }, []);

    const fetchSubjects = async () => {
        try {
            const response = await axios.get(`${API}/subjects`);
            setSubjects(response.data);
        } catch (error) {
            console.error('Failed to fetch subjects:', error);
        } finally {
            setLoadingSubjects(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const response = await axios.get(`${API}/quiz/history`);
            setQuizHistory(response.data);
        } catch (error) {
            console.error('Failed to fetch history:', error);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const generateQuiz = async () => {
        if (!topic.trim() && !selectedSubject) {
            toast.error('Please enter a topic or select a subject');
            return;
        }

        setLoading(true);
        setQuiz(null);
        setResults(null);
        setCurrentQuestion(0);
        setAnswers({});

        try {
            const response = await axios.post(`${API}/quiz/generate`, {
                subject_id: selectedSubject === 'any' ? null : selectedSubject,
                topic: topic || null,
                num_questions: parseInt(numQuestions),
                difficulty
            });
            setQuiz(response.data);
            toast.success('Quiz generated! Good luck!');
        } catch (error) {
            toast.error('Failed to generate quiz. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const selectAnswer = (questionId, answerIndex) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answerIndex
        }));
    };

    const nextQuestion = () => {
        if (currentQuestion < quiz.questions.length - 1) {
            setCurrentQuestion(prev => prev + 1);
        }
    };

    const prevQuestion = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(prev => prev - 1);
        }
    };

    const submitQuiz = async () => {
        if (Object.keys(answers).length < quiz.questions.length) {
            toast.error('Please answer all questions before submitting');
            return;
        }

        setSubmitting(true);
        try {
            const response = await axios.post(`${API}/quiz/${quiz.id}/submit`, { answers });
            setResults(response.data);
            fetchHistory();
            toast.success(`Quiz completed! Score: ${response.data.score}/${response.data.total}`);
        } catch (error) {
            toast.error('Failed to submit quiz');
        } finally {
            setSubmitting(false);
        }
    };

    const resetQuiz = () => {
        setQuiz(null);
        setResults(null);
        setCurrentQuestion(0);
        setAnswers({});
    };

    const getDifficultyColor = (diff) => {
        switch (diff) {
            case 'easy': return 'bg-green-500';
            case 'medium': return 'bg-amber-500';
            case 'hard': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20 md:pb-0" data-testid="quiz-page">
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
                            <Button variant="ghost" className="gap-2" onClick={() => navigate('/youtube')}>
                                <Youtube className="h-4 w-4" />
                                YouTube
                            </Button>
                            <Button variant="ghost" className="gap-2 bg-accent" onClick={() => navigate('/quiz')}>
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
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-semibold tracking-tight font-['Outfit'] mb-2 flex items-center gap-3">
                        <ListChecks className="h-8 w-8 text-indigo-500" />
                        Quiz Mode
                    </h1>
                    <p className="text-muted-foreground">
                        Test your knowledge with AI-generated quizzes
                    </p>
                </div>

                {!quiz && !results && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Quiz Generator */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="font-['Outfit']">Generate Quiz</CardTitle>
                                <CardDescription>Customize your quiz settings</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Subject (Optional)</Label>
                                        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                            <SelectTrigger data-testid="quiz-subject">
                                                <SelectValue placeholder="Select subject" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="any">Any Subject</SelectItem>
                                                {subjects.map(s => (
                                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Number of Questions</Label>
                                        <Select value={numQuestions} onValueChange={setNumQuestions}>
                                            <SelectTrigger data-testid="quiz-num-questions">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="5">5 Questions</SelectItem>
                                                <SelectItem value="10">10 Questions</SelectItem>
                                                <SelectItem value="15">15 Questions</SelectItem>
                                                <SelectItem value="20">20 Questions</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Topic</Label>
                                    <Input
                                        placeholder="e.g., Binary Search Trees, Deadlock Prevention"
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        data-testid="quiz-topic-input"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label>Difficulty</Label>
                                    <div className="flex gap-3">
                                        {['easy', 'medium', 'hard'].map(d => (
                                            <Button
                                                key={d}
                                                variant={difficulty === d ? 'default' : 'outline'}
                                                onClick={() => setDifficulty(d)}
                                                className={`flex-1 capitalize ${difficulty === d ? getDifficultyColor(d) : ''}`}
                                                data-testid={`difficulty-${d}`}
                                            >
                                                {d === 'easy' && <Zap className="h-4 w-4 mr-1" />}
                                                {d === 'medium' && <Target className="h-4 w-4 mr-1" />}
                                                {d === 'hard' && <Trophy className="h-4 w-4 mr-1" />}
                                                {d}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <Button
                                    onClick={generateQuiz}
                                    disabled={loading}
                                    className="w-full h-12 bg-gradient-to-r from-indigo-500 to-violet-500"
                                    data-testid="generate-quiz-btn"
                                >
                                    {loading ? (
                                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    ) : (
                                        <Sparkles className="h-5 w-5 mr-2" />
                                    )}
                                    Generate Quiz
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Quiz History */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-['Outfit'] text-lg">Recent Quizzes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {quizHistory.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No quizzes taken yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {quizHistory.slice(0, 5).map((q) => (
                                            <div key={q.id} className="p-3 rounded-lg border">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-medium text-sm">{q.topic}</span>
                                                    <Badge className={getDifficultyColor(q.difficulty)}>
                                                        {q.difficulty}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-muted-foreground">
                                                        Score: {q.score}/{q.total}
                                                    </span>
                                                    <span className="font-mono text-primary">
                                                        {Math.round(q.score / q.total * 100)}%
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Quiz Taking */}
                {quiz && !results && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="font-['Outfit']">{quiz.topic}</CardTitle>
                                    <CardDescription className="flex items-center gap-2 mt-1">
                                        <Badge className={getDifficultyColor(quiz.difficulty)}>
                                            {quiz.difficulty}
                                        </Badge>
                                        Question {currentQuestion + 1} of {quiz.total}
                                    </CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={resetQuiz}>
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Reset
                                </Button>
                            </div>
                            <Progress value={(currentQuestion + 1) / quiz.total * 100} className="mt-4" />
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {quiz.questions[currentQuestion] && (
                                <>
                                    <div className="text-lg font-medium">
                                        {quiz.questions[currentQuestion].question}
                                    </div>

                                    <RadioGroup
                                        value={answers[quiz.questions[currentQuestion].id]?.toString()}
                                        onValueChange={(value) => selectAnswer(quiz.questions[currentQuestion].id, parseInt(value))}
                                    >
                                        <div className="space-y-3">
                                            {quiz.questions[currentQuestion].options.map((option, index) => (
                                                <div
                                                    key={index}
                                                    className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-all ${
                                                        answers[quiz.questions[currentQuestion].id] === index
                                                            ? 'border-primary bg-accent'
                                                            : 'hover:border-primary/50'
                                                    }`}
                                                    onClick={() => selectAnswer(quiz.questions[currentQuestion].id, index)}
                                                    data-testid={`option-${index}`}
                                                >
                                                    <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                                                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                                                        {option}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </RadioGroup>

                                    <div className="flex justify-between pt-4">
                                        <Button
                                            variant="outline"
                                            onClick={prevQuestion}
                                            disabled={currentQuestion === 0}
                                        >
                                            Previous
                                        </Button>
                                        
                                        {currentQuestion === quiz.questions.length - 1 ? (
                                            <Button
                                                onClick={submitQuiz}
                                                disabled={submitting || Object.keys(answers).length < quiz.total}
                                                className="bg-gradient-to-r from-emerald-500 to-green-500"
                                                data-testid="submit-quiz-btn"
                                            >
                                                {submitting ? (
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                ) : (
                                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                                )}
                                                Submit Quiz
                                            </Button>
                                        ) : (
                                            <Button onClick={nextQuestion} data-testid="next-question-btn">
                                                Next
                                                <ArrowRight className="h-4 w-4 ml-2" />
                                            </Button>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Results */}
                {results && (
                    <div className="space-y-6">
                        {/* Score Card */}
                        <Card className="text-center">
                            <CardContent className="pt-8 pb-6">
                                <div className={`h-24 w-24 rounded-full mx-auto mb-4 flex items-center justify-center ${
                                    results.percentage >= 70 ? 'bg-gradient-to-br from-emerald-500 to-green-500' :
                                    results.percentage >= 50 ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                                    'bg-gradient-to-br from-red-500 to-pink-500'
                                }`}>
                                    <span className="text-3xl font-bold text-white">{results.percentage}%</span>
                                </div>
                                <h2 className="text-2xl font-semibold font-['Outfit'] mb-2">
                                    {results.percentage >= 70 ? 'Excellent!' :
                                     results.percentage >= 50 ? 'Good Job!' : 'Keep Practicing!'}
                                </h2>
                                <p className="text-muted-foreground">
                                    You scored {results.score} out of {results.total} questions
                                </p>
                                <div className="flex justify-center gap-4 mt-6">
                                    <Button variant="outline" onClick={resetQuiz}>
                                        <RotateCcw className="h-4 w-4 mr-2" />
                                        New Quiz
                                    </Button>
                                    <Button onClick={() => navigate('/flashcards')} className="bg-gradient-to-r from-indigo-500 to-violet-500">
                                        <BookOpen className="h-4 w-4 mr-2" />
                                        Study Flashcards
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Detailed Results */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-['Outfit']">Review Answers</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {results.results.map((result, index) => (
                                    <div key={result.question_id} className={`p-4 rounded-lg border ${
                                        result.is_correct ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-red-500/50 bg-red-500/5'
                                    }`}>
                                        <div className="flex items-start gap-3 mb-3">
                                            {result.is_correct ? (
                                                <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1">
                                                <p className="font-medium mb-2">Q{index + 1}: {result.question}</p>
                                                <div className="space-y-1 text-sm">
                                                    {result.options.map((opt, i) => (
                                                        <div key={i} className={`p-2 rounded ${
                                                            i === result.correct_answer ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                                                            i === result.user_answer && !result.is_correct ? 'bg-red-500/20 text-red-700 dark:text-red-300' : ''
                                                        }`}>
                                                            {i === result.correct_answer && '✓ '}
                                                            {i === result.user_answer && i !== result.correct_answer && '✗ '}
                                                            {opt}
                                                        </div>
                                                    ))}
                                                </div>
                                                <p className="mt-3 text-sm text-muted-foreground">
                                                    <strong>Explanation:</strong> {result.explanation}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>

            {/* Mobile Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-surface border-t">
                <div className="flex items-center justify-around h-16">
                    <Button variant="ghost" size="sm" className="flex-col h-auto py-2" onClick={() => navigate('/dashboard')}>
                        <BarChart3 className="h-5 w-5" />
                        <span className="text-xs mt-1">Home</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-col h-auto py-2" onClick={() => navigate('/youtube')}>
                        <Youtube className="h-5 w-5" />
                        <span className="text-xs mt-1">YouTube</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-col h-auto py-2 text-primary" onClick={() => navigate('/quiz')}>
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
