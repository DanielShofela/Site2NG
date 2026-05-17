import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  Languages, 
  FileText, 
  Link as LinkIcon, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Upload,
  Globe,
  PlusCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '@/types';
import { calculateCompletionScore } from '@/lib/profileUtils';

const STEPS = [
  { id: 'personal', title: 'Infos Personnelles', icon: User },
  { id: 'professional', title: 'Profil Pro', icon: Briefcase },
  { id: 'experience', title: 'Expériences', icon: Briefcase },
  { id: 'education', title: 'Formations', icon: GraduationCap },
  { id: 'skills_languages', title: 'Compétences', icon: Languages },
  { id: 'documents_social', title: 'Documents & Réseaux', icon: FileText },
];

export default function Onboarding() {
  const { user, updateProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    } else if (user) {
      setFormData(user);
    }
  }, [user, loading, navigate]);

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      // Auto-save on each step transition
      await saveProgress();
    } else {
      await finishOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const saveProgress = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const score = calculateCompletionScore({ ...user, ...formData } as UserProfile);
      await updateProfile({ ...formData, completionScore: score });
    } catch (error) {
      console.error("Error saving progress:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const finishOnboarding = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const score = calculateCompletionScore({ ...user, ...formData } as UserProfile);
      await updateProfile({ 
        ...formData, 
        completionScore: score, 
        profileComplete: true 
      });
      navigate('/candidate');
    } catch (error) {
      console.error("Error finishing onboarding:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateFormData = (data: Partial<UserProfile>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const currentStepProgress = ((currentStep + 1) / STEPS.length) * 100;

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-slate-50 pt-6 md:pt-10 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="text-center sm:text-left w-full sm:w-auto">
            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Complétez votre profil professionnel
            </h1>
            <p className="text-slate-500 mt-2 text-xs sm:text-base">
              Laissez les recruteurs découvrir votre plein potentiel.
            </p>
          </div>
          <div className="text-center sm:text-right w-full sm:w-auto bg-white p-4 rounded-xl shadow-sm border border-slate-100 sm:bg-transparent sm:p-0 sm:border-none sm:shadow-none">
            <span className="text-xs sm:text-sm font-bold text-orange-600 uppercase tracking-wider">
              Etape {currentStep + 1} / {STEPS.length}
            </span>
            <div className="w-full sm:w-48 h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
              <motion.div 
                className="h-full bg-orange-600"
                initial={{ width: 0 }}
                animate={{ width: `${currentStepProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-8">
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-none shadow-xl shadow-slate-200/60 transition-all rounded-2xl md:rounded-3xl overflow-hidden">
                  <CardHeader className="bg-slate-900 text-white rounded-none py-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/10 rounded-lg">
                        {React.createElement(STEPS[currentStep].icon, { className: "h-5 w-5" })}
                      </div>
                      <div>
                        <CardTitle className="text-lg md:text-xl">{STEPS[currentStep].title}</CardTitle>
                        <CardDescription className="text-slate-400 text-xs md:text-sm">
                          Les champs marqués d'un * sont importants
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 md:p-8">
                    {currentStep === 0 && (
                      <PersonalInfoStep data={formData} onChange={updateFormData} />
                    )}
                    {currentStep === 1 && (
                      <ProfessionalStep data={formData} onChange={updateFormData} />
                    )}
                    {currentStep === 2 && (
                      <ExperienceStep data={formData} onChange={updateFormData} />
                    )}
                    {currentStep === 3 && (
                      <EducationStep data={formData} onChange={updateFormData} />
                    )}
                    {currentStep === 4 && (
                      <SkillsStep data={formData} onChange={updateFormData} />
                    )}
                    {currentStep === 5 && (
                      <DocumentsStep data={formData} onChange={updateFormData} />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 0 || isSaving}
                className="w-full sm:w-auto font-bold text-slate-600 h-12 rounded-xl px-6"
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Précédent
              </Button>
              <Button
                onClick={handleNext}
                disabled={isSaving}
                className="w-full sm:w-auto font-bold h-12 rounded-xl px-10 bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/20 border-none text-white transition-all active:scale-[0.98]"
              >
                {currentStep === STEPS.length - 1 ? 'Terminer' : 'Suivant'}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Sidebar / Progress */}
          <div className="space-y-6">
            <Card className="border-none shadow-xl shadow-slate-200/60 sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Progression</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {STEPS.map((step, index) => (
                  <div 
                    key={step.id} 
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      currentStep === index ? 'bg-orange-50 text-orange-600' : 
                      currentStep > index ? 'text-green-600' : 'text-slate-400'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      currentStep === index ? 'bg-orange-600 text-white' : 
                      currentStep > index ? 'bg-green-600 text-white' : 'bg-slate-100'
                    }`}>
                      {currentStep > index ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                    </div>
                    <span className="text-sm font-bold">{step.title}</span>
                  </div>
                ))}
                
                <Separator />
                
                <div className="pt-2">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-semibold text-slate-600">Complétion</span>
                    <span className="text-xl font-black text-orange-600">
                      {calculateCompletionScore(formData as UserProfile)}%
                    </span>
                  </div>
                  <Progress value={calculateCompletionScore(formData as UserProfile)} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Steps Components ---

function PersonalInfoStep({ data, onChange }: { data: Partial<UserProfile>, onChange: (d: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Prénom *</Label>
          <Input 
            id="firstName" 
            value={data.firstName || ''} 
            onChange={e => onChange({ firstName: e.target.value })}
            placeholder="Jean"
            className="h-12 border-slate-200"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Nom *</Label>
          <Input 
            id="lastName" 
            value={data.lastName || ''} 
            onChange={e => onChange({ lastName: e.target.value })}
            placeholder="Dupont"
            className="h-12 border-slate-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="gender">Sexe</Label>
          <Select value={data.gender || ""} onValueChange={v => onChange({ gender: v })}>
            <SelectTrigger className="h-12 border-slate-200">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Masculin</SelectItem>
              <SelectItem value="F">Féminin</SelectItem>
              <SelectItem value="O">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="birthDate">Date de naissance (JJ/MM/AAAA)</Label>
          <Input 
            id="birthDate" 
            type="text"
            value={data.birthDate || ''} 
            onChange={e => {
              // Basic auto-formatting for DD/MM/YYYY
              let val = e.target.value.replace(/\D/g, '');
              if (val.length > 8) val = val.slice(0, 8);
              if (val.length > 4) {
                val = val.slice(0, 2) + '/' + val.slice(2, 4) + '/' + val.slice(4);
              } else if (val.length > 2) {
                val = val.slice(0, 2) + '/' + val.slice(2);
              }
              onChange({ birthDate: val });
            }}
            placeholder="Ex: 15/05/1990"
            className="h-12 border-slate-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone principal *</Label>
          <Input 
            id="phone" 
            value={data.phone || ''} 
            onChange={e => onChange({ phone: e.target.value })}
            placeholder="+225 00 00 00 00"
            className="h-12 border-slate-200"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phoneSecondary">Téléphone secondaire</Label>
          <Input 
            id="phoneSecondary" 
            value={data.phoneSecondary || ''} 
            onChange={e => onChange({ phoneSecondary: e.target.value })}
            placeholder="+225 00 00 00 00"
            className="h-12 border-slate-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">Ville</Label>
          <Input 
            id="city" 
            value={data.city || ''} 
            onChange={e => onChange({ city: e.target.value })}
            placeholder="Abidjan"
            className="h-12 border-slate-200"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="commune">Commune</Label>
          <Input 
            id="commune" 
            value={data.commune || ''} 
            onChange={e => onChange({ commune: e.target.value })}
            placeholder="Cocody"
            className="h-12 border-slate-200"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="address">Adresse complète</Label>
        <Textarea 
          id="address" 
          value={data.address || ''} 
          onChange={e => onChange({ address: e.target.value })}
          placeholder="Rue des jardins, Bâtiment A, Appt 4"
          className="min-h-[80px] border-slate-200"
        />
      </div>
    </div>
  );
}

function ProfessionalStep({ data, onChange }: { data: Partial<UserProfile>, onChange: (d: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="jobTitle">Titre professionnel *</Label>
        <Input 
          id="jobTitle" 
          value={data.jobTitle || ''} 
          onChange={e => onChange({ jobTitle: e.target.value })}
          placeholder="Ex: Développeur Fullstack React"
          className="h-12 border-slate-200"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sector">Secteur d'activité</Label>
        <Select value={data.sector || ""} onValueChange={v => onChange({ sector: v })}>
          <SelectTrigger className="h-12 border-slate-200">
            <SelectValue placeholder="Sélectionner un secteur" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="it">Informatique / IT</SelectItem>
            <SelectItem value="finance">Finance / Banque</SelectItem>
            <SelectItem value="marketing">Marketing / Communication</SelectItem>
            <SelectItem value="construction">BTP / Construction</SelectItem>
            <SelectItem value="logistics">Logistique / Transport</SelectItem>
            <SelectItem value="healthcare">Santé</SelectItem>
            <SelectItem value="education">Éducation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="yearsExp">Années d'expérience</Label>
          <Input 
            id="yearsExp" 
            type="number"
            value={data.yearsOfExperience || 0} 
            onChange={e => onChange({ yearsOfExperience: parseInt(e.target.value) })}
            className="h-12 border-slate-200"
          />
        </div>
        <div className="flex flex-col justify-center space-y-2">
          <Label htmlFor="available">Disponibilité immédiate</Label>
          <div className="flex items-center space-x-2 pt-2">
            <Switch 
              id="available" 
              checked={data.availableImmediately} 
              onCheckedChange={v => onChange({ availableImmediately: v })}
            />
            <span className="text-sm font-medium">{data.availableImmediately ? 'Oui' : 'Non'}</span>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <Label>Préférences de contrat</Label>
        <div className="grid grid-cols-2 gap-2">
          {['CDI', 'CDD', 'Stage', 'Freelance'].map(type => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox 
                id={`type-${type}`}
                checked={(data.preferences?.contractType || []).includes(type)}
                onCheckedChange={(checked) => {
                  const currentTypes = data.preferences?.contractType || [];
                  const newTypes = checked 
                    ? [...currentTypes, type]
                    : currentTypes.filter(t => t !== type);
                  onChange({ preferences: { ...data.preferences, contractType: newTypes } });
                }}
              />
              <Label htmlFor={`type-${type}`} className="text-sm font-normal cursor-pointer">{type}</Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExperienceStep({ data, onChange }: { data: Partial<UserProfile>, onChange: (d: any) => void }) {
  const experiences = data.experiences || [];

  const addExperience = () => {
    onChange({ 
      experiences: [...experiences, { company: '', role: '', startDate: '', description: '', current: false }]
    });
  };

  const updateExperience = (index: number, fields: any) => {
    const newExp = [...experiences];
    newExp[index] = { ...newExp[index], ...fields };
    onChange({ experiences: newExp });
  };

  const removeExperience = (index: number) => {
    onChange({ experiences: experiences.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      {experiences.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <Briefcase className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">Aucune expérience ajoutée.</p>
          <Button variant="ghost" onClick={addExperience} className="mt-4 text-orange-600 font-bold">
            <Plus className="mr-2 h-4 w-4" /> Ajouter ma première expérience
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {experiences.map((exp, index) => (
            <div key={index} className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm relative group">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                onClick={() => removeExperience(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Entreprise</Label>
                  <Input 
                    value={exp.company} 
                    onChange={e => updateExperience(index, { company: e.target.value })}
                    placeholder="Ex: Orange CI"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Poste</Label>
                  <Input 
                    value={exp.role || ''} 
                    onChange={e => updateExperience(index, { role: e.target.value })}
                    placeholder="Ex: Analyste Développeur"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Date de début</Label>
                  <Input 
                    type="date"
                    value={exp.startDate} 
                    onChange={e => updateExperience(index, { startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date de fin</Label>
                  <Input 
                    type="date"
                    disabled={exp.current}
                    value={exp.endDate || ''} 
                    onChange={e => updateExperience(index, { endDate: e.target.value })}
                  />
                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox 
                      id={`current-${index}`} 
                      checked={exp.current} 
                      onCheckedChange={v => updateExperience(index, { current: v })}
                    />
                    <Label htmlFor={`current-${index}`} className="text-xs font-normal">Poste actuel</Label>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Description des missions</Label>
                <Textarea 
                  value={exp.description} 
                  onChange={e => updateExperience(index, { description: e.target.value })}
                  placeholder="Quelles ont été vos réalisations ?"
                  className="min-h-[100px]"
                />
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addExperience} className="w-full h-12 rounded-xl border-dashed border-2 text-slate-600 font-bold">
            <Plus className="mr-2 h-4 w-4" /> Ajouter une autre expérience
          </Button>
        </div>
      )}
    </div>
  );
}

function EducationStep({ data, onChange }: { data: Partial<UserProfile>, onChange: (d: any) => void }) {
  const education = data.education || [];

  const addEducation = () => {
    onChange({ 
      education: [...education, { school: '', degree: '', field: '', startDate: '', current: false }]
    });
  };

  const updateEducation = (index: number, fields: any) => {
    const newEdu = [...education];
    newEdu[index] = { ...newEdu[index], ...fields };
    onChange({ education: newEdu });
  };

  const removeEducation = (index: number) => {
    onChange({ education: education.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      {education.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <GraduationCap className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">Aucune formation ajoutée.</p>
          <Button variant="ghost" onClick={addEducation} className="mt-4 text-orange-600 font-bold">
            <Plus className="mr-2 h-4 w-4" /> Ajouter ma première formation
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {education.map((edu, index) => (
            <div key={index} className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm relative group">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                onClick={() => removeEducation(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>École / Université</Label>
                  <Input 
                    value={edu.school} 
                    onChange={e => updateEducation(index, { school: e.target.value })}
                    placeholder="Ex: ESATIC"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Diplôme</Label>
                  <Input 
                    value={edu.degree || ''} 
                    onChange={e => updateEducation(index, { degree: e.target.value })}
                    placeholder="Ex: Master"
                  />
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <Label>Filière / Spécialité</Label>
                <Input 
                  value={edu.field || ''} 
                  onChange={e => updateEducation(index, { field: e.target.value })}
                  placeholder="Ex: Réseaux et Sécurité"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date de début</Label>
                  <Input 
                    type="date"
                    value={edu.startDate} 
                    onChange={e => updateEducation(index, { startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date de fin / Obtention</Label>
                  <Input 
                    type="date"
                    disabled={edu.current}
                    value={edu.endDate || ''} 
                    onChange={e => updateEducation(index, { endDate: e.target.value })}
                  />
                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox 
                      id={`edu-current-${index}`} 
                      checked={edu.current} 
                      onCheckedChange={v => updateEducation(index, { current: v })}
                    />
                    <Label htmlFor={`edu-current-${index}`} className="text-xs font-normal">Formation en cours</Label>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addEducation} className="w-full h-12 rounded-xl border-dashed border-2 text-slate-600 font-bold">
            <Plus className="mr-2 h-4 w-4" /> Ajouter un autre diplôme
          </Button>
        </div>
      )}
    </div>
  );
}

function SkillsStep({ data, onChange }: { data: Partial<UserProfile>, onChange: (d: any) => void }) {
  const skills = data.skills || [];
  const languages = data.languages || [];
  const [newSkill, setNewSkill] = useState('');

  const addSkill = () => {
    if (newSkill.trim()) {
      onChange({ skills: [...skills, { name: newSkill.trim(), level: 'intermediate' }] });
      setNewSkill('');
    }
  };

  const removeSkill = (name: string) => {
    onChange({ skills: skills.filter(s => s.name !== name) });
  };

  const addLanguage = () => {
    onChange({ languages: [...languages, { language: '', level: 'intermediate' }] });
  };

  const updateLanguage = (index: number, fields: any) => {
    const newLangs = [...languages];
    newLangs[index] = { ...newLangs[index], ...fields };
    onChange({ languages: newLangs });
  };

  const removeLanguage = (index: number) => {
    onChange({ languages: languages.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-10">
      <div>
        <Label className="text-lg font-bold mb-4 block">Tes Compétences</Label>
        <div className="flex gap-2 mb-6">
          <Input 
            value={newSkill} 
            onChange={e => setNewSkill(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && addSkill()}
            placeholder="Ex: React.js, Python, Marketing Digital..."
            className="h-12 border-slate-200"
          />
          <Button onClick={addSkill} className="h-12 bg-slate-900 border-none text-white px-6">Ajouter</Button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {skills.map(skill => (
            <Badge 
              key={skill.name} 
              className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded-full border-none flex items-center gap-2 group"
            >
              {skill.name}
              <X 
                className="h-3 w-3 cursor-pointer text-slate-400 hover:text-red-500" 
                onClick={() => removeSkill(skill.name)} 
              />
            </Badge>
          ))}
          {skills.length === 0 && <p className="text-slate-400 text-sm italic">Ajoute au moins 3 compétences</p>}
        </div>
      </div>

      <Separator />

      <div>
        <div className="flex justify-between items-center mb-4">
          <Label className="text-lg font-bold">Langues</Label>
          <Button variant="ghost" size="sm" onClick={addLanguage} className="text-orange-600">
            <Plus className="mr-1 h-4 w-4" /> Ajouter
          </Button>
        </div>
        
        <div className="space-y-4">
          {languages.map((lang, index) => (
            <div key={index} className="flex gap-4 items-end bg-slate-50 p-4 rounded-xl relative group">
               <div className="flex-1 space-y-2">
                 <Label className="text-xs">Langue</Label>
                 <Input 
                  value={lang.language} 
                  onChange={e => updateLanguage(index, { language: e.target.value })}
                  placeholder="Anglais, Français..."
                  className="bg-white"
                 />
               </div>
               <div className="flex-1 space-y-2">
                 <Label className="text-xs">Niveau</Label>
                 <Select value={lang.level || ""} onValueChange={v => updateLanguage(index, { level: v })}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Notions de base</SelectItem>
                    <SelectItem value="intermediate">Intermédiaire</SelectItem>
                    <SelectItem value="fluent">Courant (Bilingue)</SelectItem>
                    <SelectItem value="native">Langue paternelle</SelectItem>
                  </SelectContent>
                 </Select>
               </div>
               <Button 
                variant="ghost" 
                size="icon" 
                className="text-slate-400 hover:text-red-500"
                onClick={() => removeLanguage(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DocumentsStep({ data, onChange }: { data: Partial<UserProfile>, onChange: (d: any) => void }) {
  const social = data.social || {};

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 700KB to stay within Firestore 1MB doc limit after base64 overhead)
    const MAX_SIZE = 700 * 1024;
    if (file.size > MAX_SIZE) {
      alert("Le fichier est trop volumineux (Max 700 Ko). Veuillez compresser votre PDF ou utiliser un lien vers votre CV en ligne.");
      return;
    }
    
    // Simulate upload
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (type === 'cv') {
        onChange({ cvUrl: base64, cvName: file.name, cvUpdatedAt: new Date() });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8">
      {/* CV Section */}
      <div className="space-y-4">
        <Label className="text-lg font-bold">Votre CV *</Label>
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 transition-colors hover:border-orange-300 group bg-slate-50/50">
          <input 
            type="file" 
            id="cv-upload" 
            className="hidden" 
            accept=".pdf"
            onChange={e => handleFileUpload(e, 'cv')}
          />
          <label htmlFor="cv-upload" className="cursor-pointer flex flex-col items-center">
            {data.cvUrl ? (
              <>
                <div className="p-4 bg-green-100 text-green-600 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <p className="text-slate-800 font-bold">{data.cvName}</p>
                <p className="text-xs text-slate-500 mt-1">Cliquez pour remplacer le fichier</p>
              </>
            ) : (
              <>
                <div className="p-4 bg-orange-100 text-orange-600 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="h-10 w-10" />
                </div>
                <p className="text-slate-800 font-bold">Téléchargez votre CV (PDF uniquement)</p>
                <p className="text-xs text-slate-500 mt-1">Glissez-déposez ou cliquez pour parcourir</p>
              </>
            )}
          </label>
        </div>
      </div>

      <Separator />

      {/* Social Section */}
      <div className="space-y-6">
        <Label className="text-lg font-bold">Réseaux Professionnels</Label>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-slate-400" /> LinkedIn
            </Label>
            <Input 
              value={social.linkedin || ''} 
              onChange={e => onChange({ social: { ...social, linkedin: e.target.value } })}
              placeholder="https://linkedin.com/in/..."
              className="border-slate-200"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-slate-400" /> GitHub / Portfolio
            </Label>
            <Input 
              value={social.github || ''} 
              onChange={e => onChange({ social: { ...social, github: e.target.value } })}
              placeholder="https://github.com/..."
              className="border-slate-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
