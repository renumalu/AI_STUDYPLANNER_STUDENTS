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
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import {
    BookOpen, Calendar, MessageSquare, Settings, LogOut, Sun, Moon,
    Plus, Pencil, Trash2, X, BarChart3
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SUBJECT_COLORS = [
    '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'
];

export default function SubjectsPage() {
    const { logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [credits, setCredits] = useState(3);
    const [confidenceLevel, setConfidenceLevel] = useState(3);
    const [strongAreas, setStrongAreas] = useState([]);
    const [weakAreas, setWeakAreas] = useState([]);
    const [strongAreaInput, setStrongAreaInput] = useState('');
    const [weakAreaInput, setWeakAreaInput] = useState('');

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            const response = await axios.get(`${API}/subjects`);
            setSubjects(response.data);
        } catch (error) {
            console.error('Failed to fetch subjects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const resetForm = () => {
        setName('');
        setCredits(3);
        setConfidenceLevel(3);
        setStrongAreas([]);
        setWeakAreas([]);
        setStrongAreaInput('');
        setWeakAreaInput('');
        setEditingSubject(null);
    };

    const openAddDialog = () => {
        resetForm();
        setDialogOpen(true);
    };

    const openEditDialog = (subject) => {
        setEditingSubject(subject);
        setName(subject.name);
        setCredits(subject.credits);
        setConfidenceLevel(subject.confidence_level);
        setStrongAreas(subject.strong_areas || []);
        setWeakAreas(subject.weak_areas || []);
        setDialogOpen(true);
    };

    const addStrongArea = () => {
        if (strongAreaInput.trim() && !strongAreas.includes(strongAreaInput.trim())) {
            setStrongAreas([...strongAreas, strongAreaInput.trim()]);
            setStrongAreaInput('');
        }
    };

    const addWeakArea = () => {
        if (weakAreaInput.trim() && !weakAreas.includes(weakAreaInput.trim())) {
            setWeakAreas([...weakAreas, weakAreaInput.trim()]);
            setWeakAreaInput('');
        }
    };

    const removeStrongArea = (index) => {
        setStrongAreas(strongAreas.filter((_, i) => i !== index));
    };

    const removeWeakArea = (index) => {
        setWeakAreas(weakAreas.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error('Please enter a subject name');
            return;
        }

        setSaving(true);
        try {
            if (editingSubject) {
                await axios.put(`${API}/subjects/${editingSubject.id}`, {
                    name,
                    credits,
                    confidence_level: confidenceLevel,
                    strong_areas: strongAreas,
                    weak_areas: weakAreas
                });
                toast.success('Subject updated successfully');
            } else {
                await axios.post(`${API}/subjects`, {
                    name,
                    credits,
                    confidence_level: confidenceLevel,
                    strong_areas: strongAreas,
                    weak_areas: weakAreas,
                    color: SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length]
                });
                toast.success('Subject added successfully');
            }
            
            setDialogOpen(false);
            resetForm();
            fetchSubjects();
        } catch (error) {
            toast.error('Failed to save subject');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (subjectId) => {
        if (!window.confirm('Are you sure you want to delete this subject?')) return;

        try {
            await axios.delete(`${API}/subjects/${subjectId}`);
            toast.success('Subject deleted');
            fetchSubjects();
        } catch (error) {
            toast.error('Failed to delete subject');
        }
    };

    const updateConfidence = async (subjectId, newConfidence) => {
        try {
            await axios.post(`${API}/progress/update-confidence`, {
                subject_id: subjectId,
                new_confidence: newConfidence
            });
            
            setSubjects(prev => prev.map(s => 
                s.id === subjectId ? { ...s, confidence_level: newConfidence } : s
            ));
            
            toast.success('Confidence updated');
        } catch (error) {
            toast.error('Failed to update confidence');
        }
    };

    const getConfidenceColor = (level) => {
        const colors = {
            1: 'bg-red-500',
            2: 'bg-orange-500',
            3: 'bg-amber-500',
            4: 'bg-lime-500',
            5: 'bg-emerald-500'
        };
        return colors[level] || 'bg-gray-500';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background p-6">
                <Skeleton className="h-12 w-48 mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-48" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20 md:pb-0" data-testid="subjects-page">
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
                            <Button variant="ghost" className="gap-2 bg-accent" onClick={() => navigate('/subjects')}>
                                <BookOpen className="h-4 w-4" />
                                Subjects
                            </Button>
                            <Button variant="ghost" className="gap-2" onClick={() => navigate('/assistant')}>
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

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight font-['Outfit'] mb-2">
                            My Subjects
                        </h1>
                        <p className="text-muted-foreground">
                            Manage your subjects and track confidence levels
                        </p>
                    </div>
                    <Button
                        onClick={openAddDialog}
                        className="bg-gradient-to-r from-indigo-500 to-violet-500"
                        data-testid="add-subject-btn"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Subject
                    </Button>
                </div>

                {subjects.length === 0 ? (
                    <Card className="text-center py-12">
                        <CardContent>
                            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-medium mb-2">No Subjects Yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Add your subjects to start creating personalized study plans.
                            </p>
                            <Button onClick={openAddDialog} data-testid="add-first-subject-btn">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Your First Subject
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {subjects.map((subject) => (
                            <Card
                                key={subject.id}
                                className="hover:shadow-md transition-shadow"
                                style={{ borderTopColor: subject.color, borderTopWidth: '4px' }}
                                data-testid={`subject-card-${subject.id}`}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="font-['Outfit']">{subject.name}</CardTitle>
                                            <CardDescription>{subject.credits} credits</CardDescription>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEditDialog(subject)}
                                                data-testid={`edit-subject-${subject.id}`}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(subject.id)}
                                                data-testid={`delete-subject-${subject.id}`}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {/* Confidence Level */}
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-muted-foreground">Confidence</span>
                                            <span className="text-sm font-mono">{subject.confidence_level}/5</span>
                                        </div>
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map((level) => (
                                                <button
                                                    key={level}
                                                    onClick={() => updateConfidence(subject.id, level)}
                                                    className={`flex-1 h-2 rounded-full transition-all ${
                                                        level <= subject.confidence_level
                                                            ? getConfidenceColor(subject.confidence_level)
                                                            : 'bg-secondary'
                                                    }`}
                                                    data-testid={`confidence-${subject.id}-${level}`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Strong Areas */}
                                    {subject.strong_areas?.length > 0 && (
                                        <div className="mb-3">
                                            <span className="text-xs text-muted-foreground block mb-1">Strong Areas</span>
                                            <div className="flex flex-wrap gap-1">
                                                {subject.strong_areas.map((area, i) => (
                                                    <Badge key={i} variant="secondary" className="text-xs">
                                                        {area}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Weak Areas */}
                                    {subject.weak_areas?.length > 0 && (
                                        <div>
                                            <span className="text-xs text-muted-foreground block mb-1">Weak Areas</span>
                                            <div className="flex flex-wrap gap-1">
                                                {subject.weak_areas.map((area, i) => (
                                                    <Badge key={i} variant="destructive" className="text-xs bg-red-500/10 text-red-600 dark:text-red-400">
                                                        {area}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="font-['Outfit']">
                            {editingSubject ? 'Edit Subject' : 'Add New Subject'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingSubject ? 'Update subject details' : 'Add a new subject to your study plan'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Subject Name</Label>
                                <Input
                                    placeholder="Data Structures"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    data-testid="dialog-subject-name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Credits</Label>
                                <Select value={credits.toString()} onValueChange={(v) => setCredits(parseInt(v))}>
                                    <SelectTrigger data-testid="dialog-credits">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4, 5, 6].map(c => (
                                            <SelectItem key={c} value={c.toString()}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label>Confidence Level</Label>
                                <span className="text-sm font-mono text-muted-foreground">{confidenceLevel}/5</span>
                            </div>
                            <Slider
                                value={[confidenceLevel]}
                                onValueChange={([v]) => setConfidenceLevel(v)}
                                min={1}
                                max={5}
                                step={1}
                                data-testid="dialog-confidence"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Strong Areas</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Arrays, Linked Lists"
                                    value={strongAreaInput}
                                    onChange={(e) => setStrongAreaInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStrongArea())}
                                    data-testid="dialog-strong-area"
                                />
                                <Button type="button" variant="outline" onClick={addStrongArea}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            {strongAreas.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {strongAreas.map((area, i) => (
                                        <Badge key={i} variant="secondary" className="gap-1">
                                            {area}
                                            <X className="h-3 w-3 cursor-pointer" onClick={() => removeStrongArea(i)} />
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Weak Areas</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Trees, Graphs"
                                    value={weakAreaInput}
                                    onChange={(e) => setWeakAreaInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addWeakArea())}
                                    data-testid="dialog-weak-area"
                                />
                                <Button type="button" variant="outline" onClick={addWeakArea}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            {weakAreas.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {weakAreas.map((area, i) => (
                                        <Badge key={i} variant="destructive" className="gap-1 bg-red-500/10 text-red-600">
                                            {area}
                                            <X className="h-3 w-3 cursor-pointer" onClick={() => removeWeakArea(i)} />
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving} data-testid="dialog-save-btn">
                            {saving ? 'Saving...' : editingSubject ? 'Update' : 'Add Subject'}
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
                    <Button variant="ghost" size="sm" className="flex-col h-auto py-2" onClick={() => navigate('/calendar')}>
                        <Calendar className="h-5 w-5" />
                        <span className="text-xs mt-1">Calendar</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-col h-auto py-2 text-primary" onClick={() => navigate('/subjects')}>
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
