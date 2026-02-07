import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, GraduationCap, Clock, BookOpen, Target, Plus, X, Sparkles } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STEPS = [
    { id: 1, title: 'Student Details', icon: GraduationCap },
    { id: 2, title: 'Study Time', icon: Clock },
    { id: 3, title: 'Subjects', icon: BookOpen },
    { id: 4, title: 'Review', icon: Target }
];

const BRANCHES = [
    'Computer Science Engineering',
    'Information Technology',
    'Electronics & Communication',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Chemical Engineering',
    'Aerospace Engineering',
    'Biotechnology',
    'Other'
];

const STUDY_TIMES = [
    { value: 'morning', label: 'Morning (6 AM - 12 PM)' },
    { value: 'afternoon', label: 'Afternoon (12 PM - 6 PM)' },
    { value: 'evening', label: 'Evening (6 PM - 10 PM)' },
    { value: 'night', label: 'Night (10 PM - 2 AM)' }
];

const SUBJECT_COLORS = [
    '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'
];

export default function OnboardingPage() {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: Student Details
    const [college, setCollege] = useState('');
    const [branch, setBranch] = useState('');
    const [graduationYear, setGraduationYear] = useState('');

    // Step 2: Study Time
    const [weekdayHours, setWeekdayHours] = useState(3);
    const [weekendHours, setWeekendHours] = useState(6);
    const [preferredTime, setPreferredTime] = useState('evening');
    const [targetDate, setTargetDate] = useState('');

    // Step 3: Subjects
    const [subjects, setSubjects] = useState([]);
    const [newSubject, setNewSubject] = useState({
        name: '',
        credits: 3,
        strong_areas: [],
        weak_areas: [],
        confidence_level: 3
    });
    const [strongAreaInput, setStrongAreaInput] = useState('');
    const [weakAreaInput, setWeakAreaInput] = useState('');

    const addStrongArea = () => {
        if (strongAreaInput.trim()) {
            setNewSubject(prev => ({
                ...prev,
                strong_areas: [...prev.strong_areas, strongAreaInput.trim()]
            }));
            setStrongAreaInput('');
        }
    };

    const addWeakArea = () => {
        if (weakAreaInput.trim()) {
            setNewSubject(prev => ({
                ...prev,
                weak_areas: [...prev.weak_areas, weakAreaInput.trim()]
            }));
            setWeakAreaInput('');
        }
    };

    const removeStrongArea = (index) => {
        setNewSubject(prev => ({
            ...prev,
            strong_areas: prev.strong_areas.filter((_, i) => i !== index)
        }));
    };

    const removeWeakArea = (index) => {
        setNewSubject(prev => ({
            ...prev,
            weak_areas: prev.weak_areas.filter((_, i) => i !== index)
        }));
    };

    const addSubject = () => {
        if (!newSubject.name.trim()) {
            toast.error('Please enter a subject name');
            return;
        }

        setSubjects(prev => [...prev, {
            ...newSubject,
            color: SUBJECT_COLORS[prev.length % SUBJECT_COLORS.length]
        }]);

        setNewSubject({
            name: '',
            credits: 3,
            strong_areas: [],
            weak_areas: [],
            confidence_level: 3
        });
    };

    const removeSubject = (index) => {
        setSubjects(prev => prev.filter((_, i) => i !== index));
    };

    const validateStep = () => {
        switch (currentStep) {
            case 1:
                if (!college || !branch || !graduationYear) {
                    toast.error('Please fill in all fields');
                    return false;
                }
                break;
            case 2:
                if (!targetDate) {
                    toast.error('Please select a target completion date');
                    return false;
                }
                break;
            case 3:
                if (subjects.length === 0) {
                    toast.error('Please add at least one subject');
                    return false;
                }
                break;
            default:
                break;
        }
        return true;
    };

    const nextStep = () => {
        if (validateStep()) {
            setCurrentStep(prev => Math.min(prev + 1, 4));
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const completeOnboarding = async () => {
        setLoading(true);
        try {
            // Save onboarding data
            await axios.post(`${API}/user/onboarding`, {
                college,
                branch,
                graduation_year: parseInt(graduationYear),
                weekday_hours: weekdayHours,
                weekend_hours: weekendHours,
                preferred_study_time: preferredTime,
                target_date: targetDate
            });

            // Create subjects
            for (const subject of subjects) {
                await axios.post(`${API}/subjects`, {
                    name: subject.name,
                    credits: subject.credits,
                    strong_areas: subject.strong_areas,
                    weak_areas: subject.weak_areas,
                    confidence_level: subject.confidence_level,
                    color: subject.color
                });
            }

            updateUser({ onboarding_completed: true });
            toast.success('Setup complete! Generating your study plan...');
            navigate('/dashboard');
        } catch (error) {
            toast.error('Failed to complete setup. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="college">College/University</Label>
                            <Input
                                id="college"
                                placeholder="XYZ Institute of Technology"
                                value={college}
                                onChange={(e) => setCollege(e.target.value)}
                                data-testid="onboarding-college-input"
                                className="h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="branch">Branch/Department</Label>
                            <Select value={branch} onValueChange={setBranch}>
                                <SelectTrigger data-testid="onboarding-branch-select" className="h-11">
                                    <SelectValue placeholder="Select your branch" />
                                </SelectTrigger>
                                <SelectContent>
                                    {BRANCHES.map(b => (
                                        <SelectItem key={b} value={b}>{b}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="graduationYear">Graduation Year</Label>
                            <Select value={graduationYear} onValueChange={setGraduationYear}>
                                <SelectTrigger data-testid="onboarding-year-select" className="h-11">
                                    <SelectValue placeholder="Select graduation year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(year => (
                                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label>Weekday Study Hours</Label>
                                <span className="text-sm font-mono text-muted-foreground">{weekdayHours} hrs/day</span>
                            </div>
                            <Slider
                                value={[weekdayHours]}
                                onValueChange={([value]) => setWeekdayHours(value)}
                                min={1}
                                max={8}
                                step={0.5}
                                data-testid="onboarding-weekday-slider"
                            />
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label>Weekend Study Hours</Label>
                                <span className="text-sm font-mono text-muted-foreground">{weekendHours} hrs/day</span>
                            </div>
                            <Slider
                                value={[weekendHours]}
                                onValueChange={([value]) => setWeekendHours(value)}
                                min={1}
                                max={12}
                                step={0.5}
                                data-testid="onboarding-weekend-slider"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Preferred Study Time</Label>
                            <Select value={preferredTime} onValueChange={setPreferredTime}>
                                <SelectTrigger data-testid="onboarding-time-select" className="h-11">
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
                            <Label htmlFor="targetDate">Target Completion Date</Label>
                            <Input
                                id="targetDate"
                                type="date"
                                value={targetDate}
                                onChange={(e) => setTargetDate(e.target.value)}
                                data-testid="onboarding-target-date"
                                className="h-11"
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        {/* Added Subjects */}
                        {subjects.length > 0 && (
                            <div className="space-y-3">
                                <Label>Added Subjects</Label>
                                <div className="space-y-2">
                                    {subjects.map((subject, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 rounded-lg bg-secondary"
                                            style={{ borderLeft: `4px solid ${subject.color}` }}
                                        >
                                            <div>
                                                <span className="font-medium">{subject.name}</span>
                                                <span className="text-sm text-muted-foreground ml-2">
                                                    ({subject.credits} credits, Confidence: {subject.confidence_level}/5)
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeSubject(index)}
                                                data-testid={`remove-subject-${index}`}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Add New Subject Form */}
                        <Card className="border-dashed">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Add Subject</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Subject Name</Label>
                                        <Input
                                            placeholder="Data Structures"
                                            value={newSubject.name}
                                            onChange={(e) => setNewSubject(prev => ({ ...prev, name: e.target.value }))}
                                            data-testid="subject-name-input"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Credits</Label>
                                        <Select
                                            value={newSubject.credits.toString()}
                                            onValueChange={(value) => setNewSubject(prev => ({ ...prev, credits: parseInt(value) }))}
                                        >
                                            <SelectTrigger data-testid="subject-credits-select">
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
                                        <span className="text-sm font-mono text-muted-foreground">{newSubject.confidence_level}/5</span>
                                    </div>
                                    <Slider
                                        value={[newSubject.confidence_level]}
                                        onValueChange={([value]) => setNewSubject(prev => ({ ...prev, confidence_level: value }))}
                                        min={1}
                                        max={5}
                                        step={1}
                                        data-testid="subject-confidence-slider"
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
                                            data-testid="strong-area-input"
                                        />
                                        <Button type="button" variant="outline" onClick={addStrongArea} data-testid="add-strong-area-btn">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {newSubject.strong_areas.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {newSubject.strong_areas.map((area, idx) => (
                                                <Badge key={idx} variant="secondary" className="gap-1">
                                                    {area}
                                                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeStrongArea(idx)} />
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
                                            data-testid="weak-area-input"
                                        />
                                        <Button type="button" variant="outline" onClick={addWeakArea} data-testid="add-weak-area-btn">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {newSubject.weak_areas.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {newSubject.weak_areas.map((area, idx) => (
                                                <Badge key={idx} variant="destructive" className="gap-1">
                                                    {area}
                                                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeWeakArea(idx)} />
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={addSubject}
                                    data-testid="add-subject-btn"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Subject
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-6">
                        <div className="rounded-lg border p-4 space-y-3">
                            <h4 className="font-medium">Student Information</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <span className="text-muted-foreground">College:</span>
                                <span>{college}</span>
                                <span className="text-muted-foreground">Branch:</span>
                                <span>{branch}</span>
                                <span className="text-muted-foreground">Graduation:</span>
                                <span>{graduationYear}</span>
                            </div>
                        </div>

                        <div className="rounded-lg border p-4 space-y-3">
                            <h4 className="font-medium">Study Schedule</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <span className="text-muted-foreground">Weekdays:</span>
                                <span className="font-mono">{weekdayHours} hrs/day</span>
                                <span className="text-muted-foreground">Weekends:</span>
                                <span className="font-mono">{weekendHours} hrs/day</span>
                                <span className="text-muted-foreground">Preferred Time:</span>
                                <span className="capitalize">{preferredTime}</span>
                                <span className="text-muted-foreground">Target Date:</span>
                                <span className="font-mono">{targetDate}</span>
                            </div>
                        </div>

                        <div className="rounded-lg border p-4 space-y-3">
                            <h4 className="font-medium">Subjects ({subjects.length})</h4>
                            <div className="space-y-2">
                                {subjects.map((subject, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 text-sm"
                                    >
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }} />
                                        <span className="font-medium">{subject.name}</span>
                                        <span className="text-muted-foreground">
                                            {subject.credits} credits · Confidence {subject.confidence_level}/5
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Progress Steps */}
                <div className="flex items-center justify-center mb-8">
                    {STEPS.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                            <div
                                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                                    currentStep >= step.id
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-secondary text-muted-foreground'
                                }`}
                            >
                                <step.icon className="h-5 w-5" />
                            </div>
                            {index < STEPS.length - 1 && (
                                <div
                                    className={`w-16 h-1 mx-2 rounded transition-all ${
                                        currentStep > step.id ? 'bg-primary' : 'bg-secondary'
                                    }`}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-['Outfit']">{STEPS[currentStep - 1].title}</CardTitle>
                        <CardDescription>
                            {currentStep === 1 && "Tell us about yourself"}
                            {currentStep === 2 && "How much time can you dedicate to studying?"}
                            {currentStep === 3 && "Add subjects you need to study"}
                            {currentStep === 4 && "Review your information before we generate your plan"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {renderStepContent()}

                        <div className="flex justify-between mt-8">
                            <Button
                                variant="outline"
                                onClick={prevStep}
                                disabled={currentStep === 1}
                                data-testid="onboarding-prev-btn"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>

                            {currentStep < 4 ? (
                                <Button onClick={nextStep} data-testid="onboarding-next-btn">
                                    Next
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={completeOnboarding}
                                    disabled={loading}
                                    className="bg-gradient-to-r from-indigo-500 to-violet-500"
                                    data-testid="onboarding-complete-btn"
                                >
                                    {loading ? (
                                        <div className="h-5 w-5 spinner" />
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            Generate My Study Plan
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
