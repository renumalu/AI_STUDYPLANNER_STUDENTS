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
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import {
    BookOpen, LogOut, Sun, Moon, Youtube, ListChecks, BarChart3,
    MessageSquare, Plus, Trash2, RotateCcw, ChevronLeft, ChevronRight,
    Sparkles, Loader2, Layers, Eye, EyeOff, Check, X, Brain
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function FlashcardsPage() {
    const { logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const [subjects, setSubjects] = useState([]);
    const [decks, setDecks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    
    // Current deck and cards
    const [currentDeck, setCurrentDeck] = useState(null);
    const [cards, setCards] = useState([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    
    // Review mode
    const [reviewMode, setReviewMode] = useState(false);
    const [reviewCards, setReviewCards] = useState([]);
    
    // Generate dialog
    const [generateDialog, setGenerateDialog] = useState(false);
    const [genTopic, setGenTopic] = useState('');
    const [genSubject, setGenSubject] = useState('any');
    const [genCount, setGenCount] = useState('10');
    
    // Add card dialog
    const [addCardDialog, setAddCardDialog] = useState(false);
    const [newCardFront, setNewCardFront] = useState('');
    const [newCardBack, setNewCardBack] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [subjectsRes, decksRes] = await Promise.all([
                axios.get(`${API}/subjects`),
                axios.get(`${API}/flashcards/decks`)
            ]);
            setSubjects(subjectsRes.data);
            setDecks(decksRes.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const generateFlashcards = async () => {
        if (!genTopic.trim()) {
            toast.error('Please enter a topic');
            return;
        }

        setGenerating(true);
        try {
            const response = await axios.post(`${API}/flashcards/generate`, {
                topic: genTopic,
                subject_id: genSubject === 'any' ? null : genSubject,
                count: parseInt(genCount)
            });
            
            setDecks(prev => [{ id: response.data.deck_id, name: response.data.deck_name, card_count: response.data.count }, ...prev]);
            setCurrentDeck({ id: response.data.deck_id, name: response.data.deck_name });
            setCards(response.data.cards);
            setCurrentCardIndex(0);
            setIsFlipped(false);
            setGenerateDialog(false);
            setGenTopic('');
            
            toast.success(`${response.data.count} flashcards generated!`);
        } catch (error) {
            toast.error('Failed to generate flashcards');
        } finally {
            setGenerating(false);
        }
    };

    const loadDeck = async (deck) => {
        try {
            const response = await axios.get(`${API}/flashcards/deck/${deck.id}`);
            setCurrentDeck(response.data.deck);
            setCards(response.data.cards);
            setCurrentCardIndex(0);
            setIsFlipped(false);
            setReviewMode(false);
        } catch (error) {
            toast.error('Failed to load deck');
        }
    };

    const deleteDeck = async (deckId) => {
        if (!window.confirm('Delete this deck and all its cards?')) return;
        
        try {
            await axios.delete(`${API}/flashcards/decks/${deckId}`);
            setDecks(prev => prev.filter(d => d.id !== deckId));
            if (currentDeck?.id === deckId) {
                setCurrentDeck(null);
                setCards([]);
            }
            toast.success('Deck deleted');
        } catch (error) {
            toast.error('Failed to delete deck');
        }
    };

    const addCard = async () => {
        if (!newCardFront.trim() || !newCardBack.trim()) {
            toast.error('Please fill in both sides of the card');
            return;
        }

        try {
            const response = await axios.post(`${API}/flashcards?deck_id=${currentDeck.id}`, {
                front: newCardFront,
                back: newCardBack,
                tags: []
            });
            
            setCards(prev => [...prev, response.data]);
            setAddCardDialog(false);
            setNewCardFront('');
            setNewCardBack('');
            toast.success('Card added!');
        } catch (error) {
            toast.error('Failed to add card');
        }
    };

    const deleteCard = async (cardId) => {
        try {
            await axios.delete(`${API}/flashcards/${cardId}`);
            setCards(prev => prev.filter(c => c.id !== cardId));
            if (currentCardIndex >= cards.length - 1) {
                setCurrentCardIndex(Math.max(0, cards.length - 2));
            }
            toast.success('Card deleted');
        } catch (error) {
            toast.error('Failed to delete card');
        }
    };

    const reviewCard = async (difficulty) => {
        const card = cards[currentCardIndex];
        try {
            await axios.post(`${API}/flashcards/${card.id}/review`, { difficulty });
            
            // Move to next card
            if (currentCardIndex < cards.length - 1) {
                setCurrentCardIndex(prev => prev + 1);
                setIsFlipped(false);
            } else {
                toast.success('Review session complete!');
                setReviewMode(false);
                setCurrentCardIndex(0);
            }
        } catch (error) {
            toast.error('Failed to record review');
        }
    };

    const startReview = async () => {
        try {
            const response = await axios.get(`${API}/flashcards/review`);
            if (response.data.length === 0) {
                toast.info('No cards due for review!');
                return;
            }
            setReviewCards(response.data);
            setCards(response.data);
            setReviewMode(true);
            setCurrentCardIndex(0);
            setIsFlipped(false);
        } catch (error) {
            toast.error('Failed to start review');
        }
    };

    const nextCard = () => {
        if (currentCardIndex < cards.length - 1) {
            setCurrentCardIndex(prev => prev + 1);
            setIsFlipped(false);
        }
    };

    const prevCard = () => {
        if (currentCardIndex > 0) {
            setCurrentCardIndex(prev => prev - 1);
            setIsFlipped(false);
        }
    };

    const flipCard = () => {
        setIsFlipped(!isFlipped);
    };

    const currentCard = cards[currentCardIndex];

    return (
        <div className="min-h-screen bg-background pb-20 md:pb-0" data-testid="flashcards-page">
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
                            <Button variant="ghost" className="gap-2" onClick={() => navigate('/quiz')}>
                                <ListChecks className="h-4 w-4" />
                                Quiz
                            </Button>
                            <Button variant="ghost" className="gap-2 bg-accent" onClick={() => navigate('/flashcards')}>
                                <Layers className="h-4 w-4" />
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
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight font-['Outfit'] mb-2 flex items-center gap-3">
                            <Layers className="h-8 w-8 text-violet-500" />
                            Flashcards
                        </h1>
                        <p className="text-muted-foreground">
                            Learn with AI-generated flashcards and spaced repetition
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={startReview} data-testid="start-review-btn">
                            <Brain className="h-4 w-4 mr-2" />
                            Review Due
                        </Button>
                        <Button 
                            onClick={() => setGenerateDialog(true)} 
                            className="bg-gradient-to-r from-violet-500 to-purple-500"
                            data-testid="generate-cards-btn"
                        >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Cards
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Skeleton className="h-96 lg:col-span-2" />
                        <Skeleton className="h-96" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Flashcard Display */}
                        <div className="lg:col-span-2">
                            {currentDeck && cards.length > 0 ? (
                                <Card className="h-full">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="font-['Outfit']">
                                                    {currentDeck.name}
                                                    {reviewMode && (
                                                        <Badge className="ml-2 bg-violet-500">Review Mode</Badge>
                                                    )}
                                                </CardTitle>
                                                <CardDescription>
                                                    Card {currentCardIndex + 1} of {cards.length}
                                                </CardDescription>
                                            </div>
                                            {currentDeck && !reviewMode && (
                                                <Button variant="outline" size="sm" onClick={() => setAddCardDialog(true)}>
                                                    <Plus className="h-4 w-4 mr-1" />
                                                    Add Card
                                                </Button>
                                            )}
                                        </div>
                                        <Progress value={(currentCardIndex + 1) / cards.length * 100} className="mt-2" />
                                    </CardHeader>
                                    <CardContent>
                                        {/* Flashcard */}
                                        <div 
                                            className="relative h-64 cursor-pointer perspective-1000"
                                            onClick={flipCard}
                                            data-testid="flashcard"
                                        >
                                            <div className={`absolute inset-0 transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                                                {/* Front */}
                                                <div className={`absolute inset-0 backface-hidden ${isFlipped ? 'invisible' : ''}`}>
                                                    <div className="h-full rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 p-6 flex flex-col items-center justify-center text-white shadow-xl">
                                                        <Eye className="h-6 w-6 mb-4 opacity-70" />
                                                        <p className="text-xl text-center font-medium">
                                                            {currentCard?.front}
                                                        </p>
                                                        <p className="text-sm mt-4 opacity-70">Click to flip</p>
                                                    </div>
                                                </div>
                                                
                                                {/* Back */}
                                                <div className={`absolute inset-0 backface-hidden ${!isFlipped ? 'invisible' : ''}`}>
                                                    <div className="h-full rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-6 flex flex-col items-center justify-center text-white shadow-xl">
                                                        <EyeOff className="h-6 w-6 mb-4 opacity-70" />
                                                        <p className="text-xl text-center font-medium">
                                                            {currentCard?.back}
                                                        </p>
                                                        {currentCard?.tags?.length > 0 && (
                                                            <div className="flex gap-2 mt-4">
                                                                {currentCard.tags.map((tag, i) => (
                                                                    <Badge key={i} variant="secondary" className="bg-white/20">
                                                                        {tag}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Controls */}
                                        {reviewMode && isFlipped ? (
                                            <div className="mt-6">
                                                <p className="text-center text-sm text-muted-foreground mb-3">How well did you know this?</p>
                                                <div className="flex justify-center gap-2">
                                                    <Button 
                                                        variant="outline" 
                                                        className="flex-1 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                                                        onClick={() => reviewCard(0)}
                                                    >
                                                        <X className="h-4 w-4 mr-1" />
                                                        Again
                                                    </Button>
                                                    <Button 
                                                        variant="outline"
                                                        className="flex-1 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                                                        onClick={() => reviewCard(1)}
                                                    >
                                                        Hard
                                                    </Button>
                                                    <Button 
                                                        variant="outline"
                                                        className="flex-1 border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white"
                                                        onClick={() => reviewCard(2)}
                                                    >
                                                        Good
                                                    </Button>
                                                    <Button 
                                                        variant="outline"
                                                        className="flex-1 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
                                                        onClick={() => reviewCard(3)}
                                                    >
                                                        <Check className="h-4 w-4 mr-1" />
                                                        Easy
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center mt-6">
                                                <Button
                                                    variant="outline"
                                                    onClick={prevCard}
                                                    disabled={currentCardIndex === 0}
                                                >
                                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                                    Previous
                                                </Button>
                                                
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteCard(currentCard?.id);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                                
                                                <Button
                                                    variant="outline"
                                                    onClick={nextCard}
                                                    disabled={currentCardIndex === cards.length - 1}
                                                >
                                                    Next
                                                    <ChevronRight className="h-4 w-4 ml-1" />
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card className="h-96 flex items-center justify-center">
                                    <div className="text-center">
                                        <Layers className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                                        <h3 className="text-lg font-medium mb-2">No Flashcards Selected</h3>
                                        <p className="text-muted-foreground mb-4">
                                            Select a deck from the sidebar or generate new flashcards
                                        </p>
                                        <Button onClick={() => setGenerateDialog(true)} className="bg-gradient-to-r from-violet-500 to-purple-500">
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            Generate Flashcards
                                        </Button>
                                    </div>
                                </Card>
                            )}
                        </div>

                        {/* Decks Sidebar */}
                        <div>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-['Outfit'] text-lg">Your Decks</CardTitle>
                                    <CardDescription>{decks.length} deck{decks.length !== 1 ? 's' : ''}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {decks.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No decks yet</p>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="mt-3"
                                                onClick={() => setGenerateDialog(true)}
                                            >
                                                Create First Deck
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {decks.map((deck) => (
                                                <div
                                                    key={deck.id}
                                                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                                                        currentDeck?.id === deck.id ? 'border-primary bg-accent' : ''
                                                    }`}
                                                    onClick={() => loadDeck(deck)}
                                                    data-testid={`deck-${deck.id}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h4 className="font-medium text-sm">{deck.name}</h4>
                                                            <p className="text-xs text-muted-foreground">
                                                                {deck.card_count} card{deck.card_count !== 1 ? 's' : ''}
                                                            </p>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteDeck(deck.id);
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Quick Stats */}
                            <Card className="mt-4">
                                <CardHeader>
                                    <CardTitle className="font-['Outfit'] text-lg">Statistics</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Total Decks</span>
                                            <span className="font-mono">{decks.length}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Total Cards</span>
                                            <span className="font-mono">{decks.reduce((sum, d) => sum + (d.card_count || 0), 0)}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </main>

            {/* Generate Dialog */}
            <Dialog open={generateDialog} onOpenChange={setGenerateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="font-['Outfit']">Generate Flashcards</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Topic *</Label>
                            <Input
                                placeholder="e.g., Binary Search Trees, OSI Model"
                                value={genTopic}
                                onChange={(e) => setGenTopic(e.target.value)}
                                data-testid="gen-topic-input"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Subject (Optional)</Label>
                                <Select value={genSubject} onValueChange={setGenSubject}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Any" />
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
                                <Label>Number of Cards</Label>
                                <Select value={genCount} onValueChange={setGenCount}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">5 Cards</SelectItem>
                                        <SelectItem value="10">10 Cards</SelectItem>
                                        <SelectItem value="15">15 Cards</SelectItem>
                                        <SelectItem value="20">20 Cards</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setGenerateDialog(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={generateFlashcards} 
                            disabled={generating}
                            className="bg-gradient-to-r from-violet-500 to-purple-500"
                        >
                            {generating ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Sparkles className="h-4 w-4 mr-2" />
                            )}
                            Generate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Card Dialog */}
            <Dialog open={addCardDialog} onOpenChange={setAddCardDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="font-['Outfit']">Add New Card</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Front (Question)</Label>
                            <Textarea
                                placeholder="Enter the question or term"
                                value={newCardFront}
                                onChange={(e) => setNewCardFront(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Back (Answer)</Label>
                            <Textarea
                                placeholder="Enter the answer or definition"
                                value={newCardBack}
                                onChange={(e) => setNewCardBack(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddCardDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={addCard}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Card
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                    <Button variant="ghost" size="sm" className="flex-col h-auto py-2" onClick={() => navigate('/quiz')}>
                        <ListChecks className="h-5 w-5" />
                        <span className="text-xs mt-1">Quiz</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-col h-auto py-2 text-primary" onClick={() => navigate('/flashcards')}>
                        <Layers className="h-5 w-5" />
                        <span className="text-xs mt-1">Cards</span>
                    </Button>
                </div>
            </nav>

            <style jsx>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
                .transform-style-3d {
                    transform-style: preserve-3d;
                }
                .backface-hidden {
                    backface-visibility: hidden;
                }
                .rotate-y-180 {
                    transform: rotateY(180deg);
                }
            `}</style>
        </div>
    );
}
