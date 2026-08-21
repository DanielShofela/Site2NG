/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  Building2, 
  ShieldCheck, 
  MapPin, 
  UserCircle2, 
  Users, 
  Target, 
  Palette, 
  FileText,
  Mail,
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Upload,
  Globe,
  PlusCircle,
  X,
  MessageSquare,
  Briefcase,
  ExternalLink,
  Phone,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '@/types';
import { calculateCompletionScore } from '@/lib/profileUtils';
import { cn, compressImage } from '@/lib/utils';
import { uploadImageToStorage } from '@/lib/imageUtils';


const STEPS = [
  { id: 'general', title: 'Infos Générales', icon: Building2 },
  { id: 'legal', title: 'Informations Légales', icon: ShieldCheck },
  { id: 'contact', title: 'Coordonnées', icon: MapPin },
  { id: 'manager', title: 'Responsable Recrutement', icon: UserCircle2 },
  { id: 'size_type', title: 'Taille & Type', icon: Users },
  { id: 'needs', title: 'Besoins Recrutement', icon: Target },
  { id: 'branding', title: 'Branding', icon: Palette },
  { id: 'documents', title: 'Documents', icon: FileText },
];

export default function RecruiterOnboarding() {
  const { user, updateProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
      } else if (user.role !== 'recruiter') {
        navigate('/');
      } else {
        setFormData(user);
      }
    }
  }, [user, loading, navigate]);

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      await saveProgress('draft');
    } else {
      await finishOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const saveProgress = async (status: any = 'draft') => {
    if (!user) return;
    setIsSaving(true);
    try {
      const score = calculateCompletionScore({ ...user, ...formData } as UserProfile);
      await updateProfile({ ...formData, completionScore: score, status: user.status === 'approved' ? 'approved' : status });
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
        profileComplete: true,
        status: user.status === 'approved' ? 'approved' : 'submitted'
      });
      navigate('/recruiter');
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
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2 text-center md:text-left w-full md:w-auto">
            <Badge className="bg-orange-600 text-white border-none px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider">
              Onboarding Recrutement
            </Badge>
            <h1 className="text-xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Configurez votre profil entreprise
            </h1>
            <p className="text-slate-500 text-sm md:text-lg font-medium max-w-2xl">
              Un profil complet et vérifié attire les meilleurs talents.
            </p>
            {user.adminNotes && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 shrink-0" />
                <p className="text-xs md:text-sm font-bold text-orange-800">
                  <span className="uppercase tracking-widest font-black text-[10px] block mb-1">Notes de l'Administrateur :</span>
                  {user.adminNotes}
                </p>
              </div>
            )}
          </div>
          <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 w-full md:w-auto md:min-w-[240px]">
            <div className="flex justify-between items-end mb-3">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Etape {currentStep + 1}/{STEPS.length}</span>
              <span className="text-2xl font-black text-orange-600">{Math.round(currentStepProgress)}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-orange-600"
                initial={{ width: 0 }}
                animate={{ width: `${currentStepProgress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-3xl md:rounded-[40px] overflow-hidden bg-white">
                  <div className="bg-slate-900 p-6 md:p-8 text-white relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                    
                    <div className="flex items-center gap-4 md:gap-5 relative z-10">
                      <div className="p-3 md:p-4 bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl border border-white/10 text-orange-500">
                        {React.createElement(STEPS[currentStep].icon, { className: "h-6 w-6 md:h-8 md:w-8" })}
                      </div>
                      <div>
                        <CardTitle className="text-xl md:text-2xl font-black">{STEPS[currentStep].title}</CardTitle>
                        <CardDescription className="text-slate-400 text-sm md:text-base font-medium mt-1">
                          Veuillez remplir les informations avec précision.
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                  
                  <CardContent className="p-5 md:p-12">
                    {currentStep === 0 && <GeneralStep data={formData} onChange={updateFormData} />}
                    {currentStep === 1 && <LegalStep data={formData} onChange={updateFormData} />}
                    {currentStep === 2 && <ContactStep data={formData} onChange={updateFormData} />}
                    {currentStep === 3 && <ManagerStep data={formData} onChange={updateFormData} />}
                    {currentStep === 4 && <SizeTypeStep data={formData} onChange={updateFormData} />}
                    {currentStep === 5 && <NeedsStep data={formData} onChange={updateFormData} />}
                    {currentStep === 6 && <BrandingStep data={formData} onChange={updateFormData} />}
                    {currentStep === 7 && <DocumentsStep data={formData} onChange={updateFormData} />}
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-4 px-2">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 0 || isSaving}
                className="w-full sm:w-auto font-black text-slate-500 hover:text-slate-900 h-14 rounded-2xl px-8 transition-all"
              >
                <ChevronLeft className="mr-2 h-5 w-5" /> Précédent
              </Button>
              <Button
                onClick={handleNext}
                disabled={isSaving}
                className="w-full sm:w-auto font-black h-14 rounded-2xl px-12 bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/10 border-none transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isSaving ? "Sauvegarde..." : currentStep === STEPS.length - 1 ? 'Soumettre' : 'Continuer'}
                {!isSaving && <ChevronRight className="ml-2 h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Stepper Sidebar */}
          <div className="hidden lg:block space-y-6">
            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[32px] sticky top-24 overflow-hidden bg-white">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
                <CardTitle className="text-lg font-black text-slate-900">Etapes du profil</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {STEPS.map((step, index) => (
                  <button 
                    key={step.id} 
                    onClick={() => index <= currentStep && setCurrentStep(index)}
                    disabled={index > currentStep + 1}
                    className={`w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all text-left ${
                      currentStep === index 
                        ? 'bg-orange-50 text-orange-600 shadow-sm' 
                        : currentStep > index 
                          ? 'text-emerald-600 hover:bg-emerald-50/50' 
                          : 'text-slate-400 opacity-60'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all ${
                      currentStep === index 
                        ? 'bg-orange-600 text-white scale-110' 
                        : currentStep > index 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-slate-100'
                    }`}>
                      {currentStep > index ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                    </div>
                    <span className="text-sm font-bold tracking-tight">{step.title}</span>
                  </button>
                ))}
              </CardContent>
              <div className="p-6 bg-slate-900 text-white">
                 <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Score de complétion</span>
                    <span className="text-xl font-black text-orange-500">
                      {calculateCompletionScore(formData as UserProfile)}%
                    </span>
                  </div>
                  <Progress value={calculateCompletionScore(formData as UserProfile)} className="h-2 bg-white/10" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Steps Components ---

function GeneralStep({ data, onChange }: { data: Partial<UserProfile>, onChange: (d: any) => void }) {
  const sectors = [
    "Informatique & Cloud", "Banque & Finance", "Assurance", "BTP & Construction",
    "Télécommunications", "Agriculture & Agro-industrie", "Santé & Pharma",
    "Éducation & Formation", "Logistique & Transport", "Hôtellerie & Tourisme",
    "E-commerce & Retail"
  ];

  return (
    <div className="space-y-8 md:space-y-10">
       <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start text-center md:text-left">
        <div className="shrink-0">
          <Label className="block text-xs font-bold text-slate-700 mb-3 ml-1 uppercase tracking-wider">Logo Entreprise</Label>
          <div className="relative group mx-auto md:mx-0">
            <div className="h-28 w-28 md:h-32 md:w-32 rounded-2xl md:rounded-[32px] bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-orange-300">
              {data.photoUrl ? (
                <img src={data.photoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-10 w-10 text-slate-300" />
              )}
            </div>
            <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[32px]">
              <Upload className="h-6 w-6 text-white" />
              <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = async () => {
                    const compressed = await compressImage(reader.result as string);
                    onChange({ photoUrl: compressed });
                  };
                  reader.readAsDataURL(file);
                }
              }} />
            </label>
          </div>
        </div>
        <div className="flex-1 space-y-6 w-full">
          <div className="space-y-4">
            <Label htmlFor="companyName" className="font-bold text-slate-700 ml-1">Nom Officiel de l'entreprise *</Label>
            <Input 
              id="companyName" 
              value={data.companyName || ''} 
              onChange={e => onChange({ companyName: e.target.value })}
              placeholder="Ex: AfriCorp Technologies SARL"
              className="h-14 rounded-2xl border-slate-200 focus-visible:ring-orange-600 font-medium"
            />
          </div>
          <div className="space-y-4">
            <Label htmlFor="tradeName" className="font-bold text-slate-700 ml-1">Enseigne Commerciale / Marque</Label>
            <Input 
              id="tradeName" 
              value={data.tradeName || ''} 
              onChange={e => onChange({ tradeName: e.target.value })}
              placeholder="Ex: AfriCorp"
              className="h-14 rounded-2xl border-slate-200 focus-visible:ring-orange-600 font-medium"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="sector" className="font-bold text-slate-700 ml-1">Secteur d'activité *</Label>
           <Select value={data.sectorActivity || ""} onValueChange={v => onChange({ sectorActivity: v })}>
            <SelectTrigger className="h-14 rounded-2xl border-slate-200 font-medium">
              <SelectValue placeholder="Choisir un secteur" />
            </SelectTrigger>
            <SelectContent>
              {sectors.map(s => <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="subSector" className="font-bold text-slate-700 ml-1">Sous-secteur / Spécialité</Label>
          <Input 
            id="subSector" 
            value={data.subSector || ''} 
            onChange={e => onChange({ subSector: e.target.value })}
            placeholder="Ex: Fintech, Cybersécurité"
            className="h-14 rounded-2xl border-slate-200 focus-visible:ring-orange-600 font-medium"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="companyShortDescription" className="font-bold text-slate-700 ml-1">Description courte (Slogan) *</Label>
        <Input 
          id="companyShortDescription" 
          value={data.companyShortDescription || ''} 
          onChange={e => onChange({ companyShortDescription: e.target.value })}
          placeholder="Ex: Leader de la transformation digitale en Afrique de l'Ouest"
          className="h-14 rounded-2xl border-slate-200 focus-visible:ring-orange-600 font-medium"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="companyDescription" className="font-bold text-slate-700 ml-1">Description complète de l'entreprise *</Label>
        <Textarea 
          id="companyDescription" 
          value={data.companyDescription || ''} 
          onChange={e => onChange({ companyDescription: e.target.value })}
          placeholder="Détaillez votre vision, votre mission et ce que vous proposez..."
          className="min-h-[150px] rounded-2xl border-slate-200 focus-visible:ring-orange-600 font-medium p-4 resize-none"
        />
      </div>
    </div>
  );
}

function LegalStep({ data, onChange }: { data: Partial<UserProfile>, onChange: (d: any) => void }) {
  const legalForms = ["SARL", "SA", "SAS", "SNC", "Entreprise Individuelle", "ONG"];
  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      alert("Fichier trop lourd (Max 500Ko)");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange({ 
        legalDocuments: { 
          ...(data.legalDocuments || {}), 
          [field]: reader.result as string,
          [`${field}Name`]: file.name 
        } 
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="font-bold text-slate-700 ml-1">N° RCCM (Registre de Commerce) *</Label>
          <Input 
            value={data.registrationNumber || ''} 
            onChange={e => onChange({ registrationNumber: e.target.value })}
            placeholder="Ex: CI-ABJ-2023-B-12345"
            className="h-14 rounded-2xl border-slate-200 font-medium"
          />
        </div>
        <div className="space-y-2">
          <Label className="font-bold text-slate-700 ml-1">Forme Juridique *</Label>
          <Select value={data.legalForm || ""} onValueChange={v => onChange({ legalForm: v })}>
            <SelectTrigger className="h-14 rounded-2xl border-slate-200 font-medium">
              <SelectValue placeholder="Choisir" />
            </SelectTrigger>
            <SelectContent>
              {legalForms.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label className="font-bold text-slate-700 ml-1">N° Contribuable</Label>
          <Input 
            value={data.taxNumber || ''} 
            onChange={e => onChange({ taxNumber: e.target.value })}
            placeholder="Ex: 2314567 P"
            className="h-14 rounded-2xl border-slate-200 font-medium"
          />
        </div>
        <div className="space-y-2">
          <Label className="font-bold text-slate-700 ml-1">Compte Contribuable</Label>
          <Input 
            value={data.taxAccount || ''} 
            onChange={e => onChange({ taxAccount: e.target.value })}
            placeholder="Ex: CC 1234567 A"
            className="h-14 rounded-2xl border-slate-200 font-medium"
          />
        </div>
        <div className="space-y-2">
          <Label className="font-bold text-slate-700 ml-1">Date de création</Label>
          <Input 
            type="date"
            value={data.creationDate || ''} 
            onChange={e => onChange({ creationDate: e.target.value })}
            className="h-14 rounded-2xl border-slate-200 font-medium"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="font-black text-xs text-slate-400 uppercase tracking-widest block ml-1">Documents Vérification (PDF/IMAGE) *</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-5 text-center hover:border-orange-400 transition-all cursor-pointer group bg-slate-50/50">
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf,image/*" onChange={e => handleDocUpload(e, 'rccmUrl')} />
            <Upload className="h-6 w-6 text-slate-300 mx-auto mb-2 group-hover:text-orange-500 transition-colors" />
            <p className="text-xs font-bold text-slate-600">
              {data.legalDocuments?.rccmUrl ? "RCCM Chargé ✓" : "Registre du Commerce"}
            </p>
          </div>
          <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-5 text-center hover:border-orange-400 transition-all cursor-pointer group bg-slate-50/50">
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf,image/*" onChange={e => handleDocUpload(e, 'taxStatusUrl')} />
            <Upload className="h-6 w-6 text-slate-300 mx-auto mb-2 group-hover:text-orange-500 transition-colors" />
            <p className="text-xs font-bold text-slate-600">
              {data.legalDocuments?.taxStatusUrl ? "Attestation Chargée ✓" : "Attestation Fiscale"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactStep({ data, onChange }: { data: Partial<UserProfile>, onChange: (d: any) => void }) {
  const communes = ["Cocody", "Marcory", "Plateau", "Treichville", "Yopougon", "Abobo", "Koumassi", "Adjamé", "Port-Bouët", "Anyama", "Bingerville"];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label className="font-bold text-slate-700 ml-1">Pays</Label>
          <Input value="Côte d'Ivoire" disabled className="h-14 rounded-2xl border-slate-200 bg-slate-100 font-bold" />
        </div>
        <div className="space-y-2">
          <Label className="font-bold text-slate-700 ml-1">Ville *</Label>
          <Input 
            value={data.city || ''} 
            onChange={e => onChange({ city: e.target.value })}
            placeholder="Ex: Abidjan"
            className="h-14 rounded-2xl border-slate-200 font-medium"
          />
        </div>
        <div className="space-y-2">
          <Label className="font-bold text-slate-700 ml-1">Commune</Label>
          <Select value={data.commune || ""} onValueChange={v => onChange({ commune: v })}>
            <SelectTrigger className="h-14 rounded-2xl border-slate-200 font-medium">
              <SelectValue placeholder="Choisir" />
            </SelectTrigger>
            <SelectContent>
              {communes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-bold text-slate-700 ml-1">Adresse Géographique</Label>
        <Input 
          value={data.address || ''} 
          onChange={e => onChange({ address: e.target.value })}
          placeholder="Ex: Rue des jardins, Vallon, en face de..."
          className="h-14 rounded-2xl border-slate-200 font-medium"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="font-bold text-slate-700 ml-1">Email Professionnel *</Label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
              type="email"
              value={data.companyEmail || ''} 
              onChange={e => onChange({ companyEmail: e.target.value })}
              placeholder="rh@entreprise.com"
              className="h-14 pl-12 rounded-2xl border-slate-200 font-medium"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="font-bold text-slate-700 ml-1">Téléphone Bureau *</Label>
           <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
              value={data.phone || ''} 
              onChange={e => onChange({ phone: e.target.value })}
              placeholder="+225 27 00 00 00 00"
              className="h-14 pl-12 rounded-2xl border-slate-200 font-medium"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="font-bold text-slate-700 ml-1">Site Web</Label>
          <div className="relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
              value={data.website || ''} 
              onChange={e => onChange({ website: e.target.value })}
              placeholder="https://www.monsite.ci"
              className="h-14 pl-12 rounded-2xl border-slate-200 font-medium"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="font-bold text-slate-700 ml-1">WhatsApp Business</Label>
          <div className="relative">
            <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
              value={data.whatsappBusiness || ''} 
              onChange={e => onChange({ whatsappBusiness: e.target.value })}
              placeholder="+225 07 00 00 00 00"
              className="h-14 pl-12 rounded-2xl border-slate-200 font-medium"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ManagerStep({ data, onChange }: { data: Partial<UserProfile>, onChange: (d: any) => void }) {
  const manager = data.manager || { firstName: '', lastName: '', role: '', email: '', phone: '' };

  const updateManager = (fields: any) => {
    onChange({ manager: { ...manager, ...fields } });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-center mb-8">
        <div className="relative group">
          <div className="h-32 w-32 rounded-full bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-orange-300">
            {manager.photoUrl ? (
              <img src={manager.photoUrl} alt="Manager" className="h-full w-full object-cover" />
            ) : (
              <UserCircle2 className="h-12 w-12 text-slate-300" />
            )}
          </div>
          <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
            <Upload className="h-6 w-6 text-white" />
            <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = async () => {
                  const compressed = await compressImage(reader.result as string, 400, 400);
                  updateManager({ photoUrl: compressed });
                };
                reader.readAsDataURL(file);
              }
            }} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="font-bold text-slate-700 ml-1">Prénom Manager *</Label>
          <Input 
            value={manager.firstName} 
            onChange={e => updateManager({ firstName: e.target.value })}
            placeholder="Ex: Marie"
            className="h-14 rounded-2xl border-slate-200 font-medium"
          />
        </div>
        <div className="space-y-2">
          <Label className="font-bold text-slate-700 ml-1">Nom Manager *</Label>
          <Input 
            value={manager.lastName} 
            onChange={e => updateManager({ lastName: e.target.value })}
            placeholder="Ex: Kouassi"
            className="h-14 rounded-2xl border-slate-200 font-medium"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-bold text-slate-700 ml-1">Fonction / Titre *</Label>
        <Input 
          value={manager.role} 
          onChange={e => updateManager({ role: e.target.value })}
          placeholder="Ex: Responsable RH"
          className="h-14 rounded-2xl border-slate-200 font-medium"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="space-y-2">
          <Label className="font-bold text-slate-700 ml-1">Email Direct *</Label>
          <Input 
            value={manager.email} 
            onChange={e => updateManager({ email: e.target.value })}
            placeholder="m.kouassi@entreprise.com"
            className="h-14 rounded-2xl border-slate-200 font-medium"
          />
        </div>
        <div className="space-y-2">
          <Label className="font-bold text-slate-700 ml-1">Téléphone Direct *</Label>
          <Input 
            value={manager.phone} 
            onChange={e => updateManager({ phone: e.target.value })}
            placeholder="+225 00 00 00 00 00"
            className="h-14 rounded-2xl border-slate-200 font-medium"
          />
        </div>
      </div>
    </div>
  );
}

function SizeTypeStep({ data, onChange }: { data: Partial<UserProfile>, onChange: (d: any) => void }) {
  const sizes = ["1-10 employés", "11-50 employés", "51-200 employés", "201-500 employés", "Plus de 500 employés"];
  const types = ["TPE", "PME", "Grande Entreprise", "Filiale", "Multinationale", "Startup", "Administration / Public", "ONG / Association"];

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Label className="text-lg md:text-xl font-black text-slate-900 block ml-1">Quelle est la taille de votre entreprise ?</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sizes.map(size => (
            <button
              key={size}
              onClick={() => onChange({ companySize: size })}
              className={`p-5 md:p-6 rounded-2xl md:rounded-[28px] border-2 text-left transition-all ${
                data.companySize === size 
                  ? 'border-orange-600 bg-orange-50 text-orange-700 ring-4 ring-orange-100' 
                  : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-orange-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm md:text-base">{size}</span>
                {data.companySize === size && <CheckCircle2 className="h-5 w-5 text-orange-600" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <Label className="text-lg md:text-xl font-black text-slate-900 block ml-1">Type de structure</Label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {types.map(type => (
            <button
              key={type}
              onClick={() => onChange({ companyType: type })}
              className={`p-3 md:p-4 rounded-xl md:rounded-2xl border-2 text-xs md:text-sm font-bold transition-all ${
                data.companyType === type 
                  ? 'border-orange-600 bg-orange-600 text-white shadow-lg' 
                  : 'border-slate-100 bg-white text-slate-500 hover:border-orange-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function NeedsStep({ data, onChange }: { data: Partial<UserProfile>, onChange: (d: any) => void }) {
  const needs = data.recruitmentNeeds || { currentlyRecruiting: false, profileTypes: [], frequency: '', zones: [] };
  const updateNeeds = (fields: any) => onChange({ recruitmentNeeds: { ...needs, ...fields } });

  const profileTypes = ["Technique / IT", "Vente / Commercial", "Finance / Admin", "Marketing / Com", "Logistique", "Direction", "Stagiaires"];
  const zones = ["Abidjan", "Intérieur du pays", "Afrique de l'Ouest", "International"];

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between p-6 bg-slate-900 rounded-3xl text-white">
        <div className="space-y-1">
          <p className="font-bold text-lg">Recrutez-vous actuellement ?</p>
          <p className="text-slate-400 text-sm">Activez pour être plus visible auprès des candidats.</p>
        </div>
        <Switch 
          checked={needs.currentlyRecruiting} 
          onCheckedChange={v => updateNeeds({ currentlyRecruiting: v })}
          className="data-[state=checked]:bg-orange-600"
        />
      </div>

      <div className="space-y-4">
        <Label className="text-lg font-bold text-slate-700 ml-1">Types de profils recherchés</Label>
        <div className="flex flex-wrap gap-3">
          {profileTypes.map(type => (
            <Badge 
              key={type}
              onClick={() => {
                const current = needs.profileTypes || [];
                const next = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
                updateNeeds({ profileTypes: next });
              }}
              className={`px-5 py-2.5 rounded-full border-none cursor-pointer text-sm font-bold transition-all ${
                (needs.profileTypes || []).includes(type) ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Label className="text-lg font-bold text-slate-700 ml-1">Fréquence de recrutement</Label>
          <Select value={needs.frequency || ""} onValueChange={v => updateNeeds({ frequency: v })}>
            <SelectTrigger className="h-14 rounded-2xl border-slate-200">
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="constant">En continu</SelectItem>
              <SelectItem value="regular">Régulière (Mensuelle)</SelectItem>
              <SelectItem value="occasional">Occasionnelle</SelectItem>
              <SelectItem value="rare">Rarement</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-4">
          <Label className="text-lg font-bold text-slate-700 ml-1">Zones de recrutement</Label>
          <div className="grid grid-cols-2 gap-2">
             {zones.map(zone => (
               <div key={zone} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Checkbox 
                    id={`zone-${zone}`}
                    checked={(needs.zones || []).includes(zone)}
                    onCheckedChange={(checked) => {
                      const current = needs.zones || [];
                      const next = checked ? [...current, zone] : current.filter(z => z !== zone);
                      updateNeeds({ zones: next });
                    }}
                  />
                  <Label htmlFor={`zone-${zone}`} className="text-xs font-bold cursor-pointer">{zone}</Label>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandingStep({ data, onChange }: { data: Partial<UserProfile>, onChange: (d: any) => void }) {
  const branding = data.branding || { mission: '', vision: '', values: [], perks: [] };
  const updateBranding = (fields: any) => onChange({ branding: { ...branding, ...fields } });

  const [newValue, setNewValue] = useState('');
  const [newPerk, setNewPerk] = useState('');

  const addValue = () => { if (newValue.trim()) { updateBranding({ values: [...(branding.values || []), newValue.trim()] }); setNewValue(''); } };
  const addPerk = () => { if (newPerk.trim()) { updateBranding({ perks: [...(branding.perks || []), newPerk.trim()] }); setNewPerk(''); } };

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <Label className="font-bold text-slate-700 ml-1 block">Bannière Entreprise</Label>
        <div className="h-48 w-full bg-slate-100 rounded-[32px] border-2 border-dashed border-slate-200 relative overflow-hidden flex items-center justify-center group hover:border-orange-400 transition-all">
          {branding.bannerUrl ? (
            <img src={branding.bannerUrl} alt="Banner" className="h-full w-full object-cover" />
          ) : (
            <div className="text-center">
              <Palette className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 font-bold">Télécharger une photo de couverture</p>
              <p className="text-[10px] text-slate-300">Recommandé : 1200 x 400 px</p>
            </div>
          )}
           <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              <Upload className="h-8 w-8 text-white" />
              <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    const storageUrl = await uploadImageToStorage(file, 'recruiter_banners');
                    updateBranding({ bannerUrl: storageUrl });
                  } catch (err) {
                    console.error("Failed uploading recruiter banner:", err);
                  }
                }
              }} />
            </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <Label className="font-bold text-slate-700 ml-1">Notre Mission</Label>
          <Textarea 
            value={branding.mission} 
            onChange={e => updateBranding({ mission: e.target.value })}
            placeholder="Pourquoi existons-nous ?" 
            className="rounded-2xl border-slate-200 min-h-[120px] resize-none"
          />
        </div>
        <div className="space-y-3">
          <Label className="font-bold text-slate-700 ml-1">Notre Vision</Label>
          <Textarea 
            value={branding.vision} 
            onChange={e => updateBranding({ vision: e.target.value })}
            placeholder="Où voulons-nous être dans 5 ans ?" 
            className="rounded-2xl border-slate-200 min-h-[120px] resize-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-4">
          <Label className="text-lg font-black text-slate-900 border-l-4 border-orange-600 pl-4">Nos Valeurs</Label>
          <div className="flex gap-2">
            <Input value={newValue} onChange={e => setNewValue(e.target.value)} onKeyPress={e => e.key === 'Enter' && addValue()} placeholder="Ex: Intégrité" className="h-12 rounded-xl" />
            <Button onClick={addValue} className="h-12 rounded-xl bg-slate-900 text-white">Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(branding.values || []).map(v => (
              <Badge key={v} className="bg-slate-100 text-slate-700 border-none px-4 py-2 rounded-lg flex items-center gap-2">
                {v} <X className="h-3 w-3 cursor-pointer" onClick={() => updateBranding({ values: branding.values.filter((val: string) => val !== v) })} />
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-lg font-black text-slate-900 border-l-4 border-emerald-500 pl-4">Avantages Salariés</Label>
          <div className="flex gap-2">
            <Input value={newPerk} onChange={e => setNewPerk(e.target.value)} onKeyPress={e => e.key === 'Enter' && addPerk()} placeholder="Ex: Assurance Santé 100%" className="h-12 rounded-xl" />
            <Button onClick={addPerk} className="h-12 rounded-xl bg-slate-900 text-white">Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(branding.perks || []).map(p => (
              <Badge key={p} className="bg-emerald-50 text-emerald-700 border-none px-4 py-2 rounded-lg flex items-center gap-2">
                {p} <X className="h-3 w-3 cursor-pointer" onClick={() => updateBranding({ perks: branding.perks.filter((val: string) => val !== p) })} />
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentsStep({ data, onChange }: { data: Partial<UserProfile>, onChange: (d: any) => void }) {
  const docs = data.legalDocuments || { brochureUrl: '', presentationUrl: '' };
  const updateDocs = (fields: any) => onChange({ legalDocuments: { ...docs, ...fields } });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'brochureUrl' | 'presentationUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const storageUrl = await uploadImageToStorage(file, 'recruiter_docs');
      updateDocs({ [field]: storageUrl, [`${field}Name`]: file.name });
    } catch (err) {
      console.error("Failed uploading document:", err);
      alert("Erreur lors de l'envoi du document.");
    }
  };

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <h4 className="text-xl font-black text-slate-900">Branding & Présentation</h4>
        <p className="text-slate-500 font-medium italic text-sm text-center bg-slate-100 p-3 rounded-xl mb-4">
          Note: Pour préserver les performances, les fichiers directs sont limités à 500 Ko. Favorisez les liens pour les documents plus volumineux.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {/* Brochure */}
           <div className="p-6 md:p-8 border-2 border-dashed border-slate-200 rounded-[32px] bg-slate-50/50 flex flex-col items-center gap-4 text-center group hover:border-orange-400 transition-all">
              <div className="p-4 bg-white rounded-2xl shadow-sm text-orange-600">
                <FileText className="h-10 w-10" />
              </div>
              <div className="w-full">
                <p className="font-extrabold text-slate-900">Brochure Corporate</p>
                {docs.brochureUrl && !docs.brochureUrl.startsWith('http') ? (
                  <Badge variant="secondary" className="mt-1 bg-green-100 text-green-700">Fichier chargé</Badge>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">PDF uniquement (Max 500Ko)</p>
                )}
              </div>
              
              <div className="flex flex-col gap-3 w-full">
                <Button variant="outline" className="rounded-xl border-slate-200 font-bold bg-white w-full relative">
                  <Upload className="mr-2 h-4 w-4" /> {docs.brochureUrl ? "Changer le fichier" : "Télécharger PDF"}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf" onChange={(e) => handleFileUpload(e, 'brochureUrl')} />
                </Button>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Ou lien URL (Google Drive...)" 
                    className="pl-10 h-10 rounded-xl"
                    value={docs.brochureUrl && docs.brochureUrl.startsWith('http') ? docs.brochureUrl : ''}
                    onChange={(e) => updateDocs({ brochureUrl: e.target.value })}
                  />
                </div>
              </div>
           </div>

           {/* Presentation */}
           <div className="p-6 md:p-8 border-2 border-dashed border-slate-200 rounded-[32px] bg-slate-50/50 flex flex-col items-center gap-4 text-center group hover:border-emerald-400 transition-all">
              <div className="p-4 bg-white rounded-2xl shadow-sm text-emerald-600">
                <ExternalLink className="h-10 w-10" />
              </div>
              <div className="w-full">
                <p className="font-extrabold text-slate-900">Présentation PDF</p>
                {docs.presentationUrl && !docs.presentationUrl.startsWith('http') ? (
                  <Badge variant="secondary" className="mt-1 bg-green-100 text-green-700">Fichier chargé</Badge>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">Pitch Deck, Keynote...</p>
                )}
              </div>
              
              <div className="flex flex-col gap-3 w-full">
                <Button variant="outline" className="rounded-xl border-slate-200 font-bold bg-white w-full relative">
                  <Upload className="mr-2 h-4 w-4" /> {docs.presentationUrl ? "Changer le fichier" : "Télécharger PDF"}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf" onChange={(e) => handleFileUpload(e, 'presentationUrl')} />
                </Button>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Ou lien URL (Dropbox, Site...)" 
                    className="pl-10 h-10 rounded-xl"
                    value={docs.presentationUrl && docs.presentationUrl.startsWith('http') ? docs.presentationUrl : ''}
                    onChange={(e) => updateDocs({ presentationUrl: e.target.value })}
                  />
                </div>
              </div>
           </div>
        </div>
      </div>

      <div className="p-5 md:p-8 bg-blue-50 rounded-2xl md:rounded-[40px] border border-blue-100 flex flex-col sm:flex-row items-start gap-4 md:gap-6">
        <div className="p-3 bg-blue-600 text-white rounded-xl md:rounded-2xl shadow-lg shadow-blue-600/20 shrink-0">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="font-black text-blue-900 text-base md:text-lg tracking-tight">Vérification de sécurité</p>
          <p className="text-blue-700/80 font-medium text-xs md:text-sm leading-relaxed">
            En soumettant ces documents, vous certifiez leur authenticité. Notre équipe admin examinera votre profil sous 72h ouvrées. Une fois approuvé, vous recevrez le badge <span className="font-black text-blue-900">"Entreprise Vérifiée"</span> visible par tous les candidats.
          </p>
        </div>
      </div>
    </div>
  );
}
