import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Mail, Phone, Calendar, Globe, MapPin, Briefcase, 
  GraduationCap, Sparkles, Plus, Trash2, ArrowLeft, ArrowRight,
  FileCheck, Download, Award, HeartHandshake, Eye, BookOpen
} from 'lucide-react';
import Button from './Button';
import GlassCard from './GlassCard';
import { CVFormData, CVEducation, CVExperience, CVVersion } from '@/types/cvlm';
import { saveVersion, getVersionById } from '@/services/cvVersionService';
import { generateCVAdvice } from '@/services/geminiService';
import { saveCVRequest } from '@/services/supabaseClient';
import { showToast } from './toast';
import { jsPDF } from 'jspdf';

interface CVFormProps {
  templateId: string;
  templateName: string;
  initialVersionId?: string | null;
  onBack: () => void;
  onSaveComplete: () => void;
  userProfile?: any;
}

const DEFAULT_FORM_DATA = (email: string = '', name: string = '', phone: string = ''): CVFormData => ({
  fullName: name,
  email: email,
  phonePrimary: phone,
  phoneSecondary: '',
  address: '',
  birthYear: '',
  nationality: 'Ivoirienne',
  jobTitle: '',
  portfolioUrl: '',
  educations: [],
  experiences: [],
  skillsTechnical: '',
  skillsTools: '',
  skillsLanguages: 'Français (Courant), Anglais (Intermédiaire)',
  certifications: '',
  interestsHobbies: '',
  interestsVolunteering: '',
  references: '',
  draft: true,
  message: ''
});

export default function CVForm({ templateId, templateName, initialVersionId, onBack, onSaveComplete, userProfile }: CVFormProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CVFormData>(DEFAULT_FORM_DATA(userProfile?.email, userProfile?.displayName, userProfile?.phone));
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [versionName, setVersionName] = useState('Mon CV Professionnel');

  // Load existing version if editing
  useEffect(() => {
    if (initialVersionId) {
      const existing = getVersionById(initialVersionId);
      if (existing) {
        setFormData(existing.data);
        setVersionName(existing.name);
      }
    } else if (userProfile) {
      setFormData(prev => ({
        ...prev,
        fullName: userProfile.displayName || prev.fullName,
        email: userProfile.email || prev.email,
        phonePrimary: userProfile.phone || prev.phonePrimary,
        address: userProfile.locationCity ? `${userProfile.locationCity}, ${userProfile.locationCountry || 'CI'}` : prev.address,
        jobTitle: userProfile.jobTitle || prev.jobTitle,
        portfolioUrl: userProfile.portfolioUrl || prev.portfolioUrl
      }));
    }
  }, [initialVersionId, userProfile]);

  // Handle inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Dynamic Array Handlers - Educations
  const handleAddEducation = () => {
    const newEd: CVEducation = {
      id: `ed-${Date.now()}`,
      school: '',
      degree: '',
      startDate: '',
      endDate: '',
      description: ''
    };
    setFormData(prev => ({ ...prev, educations: [...prev.educations, newEd] }));
  };

  const handleUpdateEducation = (id: string, field: keyof CVEducation, value: string) => {
    setFormData(prev => ({
      ...prev,
      educations: prev.educations.map(ed => ed.id === id ? { ...ed, [field]: value } : ed)
    }));
  };

  const handleRemoveEducation = (id: string) => {
    setFormData(prev => ({
      ...prev,
      educations: prev.educations.filter(ed => ed.id !== id)
    }));
  };

  // Dynamic Array Handlers - Experiences
  const handleAddExperience = () => {
    const newExp: CVExperience = {
      id: `exp-${Date.now()}`,
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      description: ''
    };
    setFormData(prev => ({ ...prev, experiences: [...prev.experiences, newExp] }));
  };

  const handleUpdateExperience = (id: string, field: keyof CVExperience, value: string) => {
    setFormData(prev => ({
      ...prev,
      experiences: prev.experiences.map(exp => exp.id === id ? { ...exp, [field]: value } : exp)
    }));
  };

  const handleRemoveExperience = (id: string) => {
    setFormData(prev => ({
      ...prev,
      experiences: prev.experiences.filter(exp => exp.id !== id)
    }));
  };

  // Form Validation helper
  const isStepValid = () => {
    if (step === 1) {
      return formData.fullName.trim() !== '' && formData.email.trim() !== '' && formData.phonePrimary.trim() !== '';
    }
    if (step === 2) {
      return formData.jobTitle.trim() !== '';
    }
    return true;
  };

  // Fetch AI advice from server-side Gemini wrapper
  const handleGetAiAdvice = async () => {
    if (!formData.jobTitle) {
      showToast('Saisissez d\'abord un titre de poste à l\'étape 2 !', 'error');
      return;
    }
    setLoadingAdvice(true);
    setAiAdvice(null);
    try {
      const advice = await generateCVAdvice(formData.jobTitle);
      setAiAdvice(advice);
      showToast('Conseils IA générés !', 'success');
    } catch (e) {
      showToast('Erreur lors de la génération', 'error');
    } finally {
      setLoadingAdvice(false);
    }
  };

  // Save Version action
  const handleSaveDraft = (isSilent = false) => {
    const versionId = initialVersionId || `cv-version-${Date.now()}`;
    const newVersion: CVVersion = {
      id: versionId,
      profileType: 'candidate',
      name: versionName,
      data: { ...formData, draft: true },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      templateId,
      templateName
    };
    saveVersion(newVersion);
    
    // Log to Supabase Client locally
    saveCVRequest({
      templateName,
      status: 'completed'
    });

    if (!isSilent) {
      showToast('Brouillon sauvegardé localement !', 'success');
      onSaveComplete();
    }
  };

  // Generate beautiful customized PDF with jsPDF
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Colors
      const primaryColor = [226, 92, 29]; // Orange #e25c1d
      const darkColor = [15, 23, 42]; // Slate 900
      const lightColor = [71, 85, 105]; // Slate 600

      // Margins & Position trackers
      const margin = 20;
      let y = 25;

      // Header background decoration (elegant header bar)
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 15, 'F');

      // Title & Header details
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(formData.fullName.toUpperCase(), margin, y);
      y += 6;

      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(formData.jobTitle || 'CANDIDAT PROFESSIONNEL', margin, y);
      y += 8;

      // Info metadata columns
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(lightColor[0], lightColor[1], lightColor[2]);
      
      const metaText = `Email: ${formData.email}  |  Tél: ${formData.phonePrimary}  |  Adresse: ${formData.address || 'Abidjan, CI'}`;
      doc.text(metaText, margin, y);
      y += 4;

      if (formData.portfolioUrl) {
        doc.text(`Portfolio / LinkedIn: ${formData.portfolioUrl}`, margin, y);
        y += 4;
      }
      
      // Divider
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.4);
      doc.line(margin, y, 210 - margin, y);
      y += 8;

      // EXPERIENCES SECTION
      if (formData.experiences.length > 0) {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.text('EXPÉRIENCES PROFESSIONNELLES', margin, y);
        y += 6;

        formData.experiences.forEach((exp) => {
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
          doc.text(`${exp.position} - ${exp.company}`, margin, y);
          
          doc.setFont('Helvetica', 'italic');
          doc.setFontSize(9);
          doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.text(`(${exp.startDate} - ${exp.endDate || "Présent"})`, 210 - margin - 35, y, { align: 'right' });
          y += 5;

          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(lightColor[0], lightColor[1], lightColor[2]);
          const splitDesc = doc.splitTextToSize(exp.description || '', 170);
          doc.text(splitDesc, margin, y);
          y += splitDesc.length * 4.5 + 4;
        });
        y += 2;
      }

      // EDUCATION SECTION
      if (formData.educations.length > 0) {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.text('FORMATIONS & ÉDUCATION', margin, y);
        y += 6;

        formData.educations.forEach((ed) => {
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
          doc.text(`${ed.degree} - ${ed.school}`, margin, y);
          
          doc.setFont('Helvetica', 'italic');
          doc.setFontSize(9);
          doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.text(`(${ed.startDate} - ${ed.endDate})`, 210 - margin - 35, y, { align: 'right' });
          y += 5;

          if (ed.description) {
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(lightColor[0], lightColor[1], lightColor[2]);
            const splitDesc = doc.splitTextToSize(ed.description, 170);
            doc.text(splitDesc, margin, y);
            y += splitDesc.length * 4.5 + 4;
          } else {
            y += 2;
          }
        });
        y += 2;
      }

      // SKILLS SECTION
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('COMPÉTENCES ET EXPERTISE', margin, y);
      y += 6;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(lightColor[0], lightColor[1], lightColor[2]);
      
      if (formData.skillsTechnical) {
        doc.setFont('Helvetica', 'bold');
        doc.text('Techniques : ', margin, y);
        doc.setFont('Helvetica', 'normal');
        doc.text(formData.skillsTechnical, margin + 25, y);
        y += 5;
      }
      if (formData.skillsTools) {
        doc.setFont('Helvetica', 'bold');
        doc.text('Outils & Softwares : ', margin, y);
        doc.setFont('Helvetica', 'normal');
        doc.text(formData.skillsTools, margin + 35, y);
        y += 5;
      }
      if (formData.skillsLanguages) {
        doc.setFont('Helvetica', 'bold');
        doc.text('Langues : ', margin, y);
        doc.setFont('Helvetica', 'normal');
        doc.text(formData.skillsLanguages, margin + 20, y);
        y += 5;
      }

      y += 3;

      // CERTIFICATIONS & INTERESTS
      if (formData.certifications || formData.interestsHobbies) {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.text('CERTIFICATIONS & CENTRES D\'INTÉRÊT', margin, y);
        y += 5;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(lightColor[0], lightColor[1], lightColor[2]);
        
        if (formData.certifications) {
          doc.text(`Certifications: ${formData.certifications}`, margin, y);
          y += 5;
        }
        if (formData.interestsHobbies) {
          doc.text(`Intérêts: ${formData.interestsHobbies}`, margin, y);
          y += 5;
        }
      }

      // Footer brand notice
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      doc.text(`Généré avec CVLM - Partenaire de Réussite 2NG Groupe`, 105, 287, { align: 'center' });

      doc.save(`CV_${formData.fullName.replace(/\s+/g, '_')}_${templateName.replace(/\s+/g, '_')}.pdf`);
      showToast('Fichier PDF téléchargé avec succès !', 'success');
      
      // Auto-save progress
      handleSaveDraft(true);
    } catch (e: any) {
      console.error(e);
      showToast(`Erreur lors de la génération du PDF: ${e.message}`, 'error');
    }
  };

  const stepsList = [
    'Profil',
    'Titre',
    'Formations',
    'Expériences',
    'Compétences',
    'Autres',
    'Finaliser'
  ];

  return (
    <div className="space-y-6">
      {/* Form Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-black uppercase text-slate-500 hover:text-orange-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Retourner à la galerie
        </button>
        <div className="flex items-center gap-3">
          <label className="text-[10px] font-black uppercase text-slate-400">Nom du CV :</label>
          <input
            type="text"
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            className="h-9 px-3 border border-slate-200 rounded-xl font-bold text-xs bg-white text-slate-700 focus:outline-none focus:border-orange-500"
          />
          <Button variant="outline" size="sm" onClick={() => handleSaveDraft(false)}>
            Sauver Brouillon
          </Button>
        </div>
      </div>

      {/* Steps indicators */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 max-w-2xl mx-auto">
        {stepsList.map((label, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < step;
          const isActive = stepNum === step;
          return (
            <button
              key={idx}
              onClick={() => isStepValid() && stepNum <= step + 1 && setStep(stepNum)}
              className="flex flex-col items-center group cursor-pointer"
              disabled={stepNum > step && !isStepValid()}
              title={label}
            >
              <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all ${
                isCompleted 
                  ? 'bg-orange-600 text-white shadow-md' 
                  : isActive 
                    ? 'bg-slate-900 text-white ring-4 ring-orange-100' 
                    : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
              }`}>
                {isCompleted ? <FileCheck className="h-4.5 w-4.5" /> : stepNum}
              </div>
              <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-2 text-center truncate w-full">
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Steps Editor Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Step Panel */}
        <div className="lg:col-span-2">
          <GlassCard className="space-y-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              Étape {step} / 7 : {stepsList[step - 1]}
            </h3>

            {/* Step 1: Personal Info */}
            {step === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-orange-600" /> Nom complet *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Jean-Marc Kouadio"
                    className="w-full h-11 px-4 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-orange-600" /> Adresse Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="jean.marc@example.com"
                    className="w-full h-11 px-4 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-orange-600" /> Téléphone Principal *</label>
                  <input
                    type="text"
                    name="phonePrimary"
                    value={formData.phonePrimary}
                    onChange={handleChange}
                    placeholder="+225 07 00 00 00 00"
                    className="w-full h-11 px-4 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" /> Téléphone Secondaire</label>
                  <input
                    type="text"
                    name="phoneSecondary"
                    value={formData.phoneSecondary}
                    onChange={handleChange}
                    placeholder="+225 05 00 00 00 00"
                    className="w-full h-11 px-4 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 col-span-1 sm:col-span-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400" /> Année de Naissance</label>
                    <input
                      type="text"
                      name="birthYear"
                      value={formData.birthYear}
                      onChange={handleChange}
                      placeholder="1998"
                      className="w-full h-11 px-4 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-slate-400" /> Nationalité</label>
                    <input
                      type="text"
                      name="nationality"
                      value={formData.nationality}
                      onChange={handleChange}
                      placeholder="Ivoirienne"
                      className="w-full h-11 px-4 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Coordinates & Title */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-orange-600" /> Titre du Poste Visé *</label>
                  <input
                    type="text"
                    name="jobTitle"
                    value={formData.jobTitle}
                    onChange={handleChange}
                    placeholder="Développeur React & Node.js"
                    className="w-full h-11 px-4 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                  />
                  <p className="text-[9px] text-slate-400 font-semibold">Ex: Designer Senior, Chargé d'Affaires, Community Manager...</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-orange-600" /> Adresse postale / Ville</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Abidjan, Cocody, Côte d'Ivoire"
                    className="w-full h-11 px-4 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-slate-400" /> Portfolio ou LinkedIn</label>
                  <input
                    type="text"
                    name="portfolioUrl"
                    value={formData.portfolioUrl}
                    onChange={handleChange}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full h-11 px-4 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Education */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase text-slate-500">🎓 Liste de vos diplômes / formations</p>
                  <Button variant="outline" size="sm" onClick={handleAddEducation}>
                    <Plus className="mr-1.5 h-4 w-4 text-orange-600" /> Ajouter
                  </Button>
                </div>

                {formData.educations.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-450 font-semibold text-xs">
                    Aucune éducation saisie. Ajoutez votre premier diplôme !
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.educations.map((ed, index) => (
                      <div key={ed.id} className="p-4 bg-slate-50/60 border border-slate-200 rounded-2xl space-y-3 relative">
                        <button
                          onClick={() => handleRemoveEducation(ed.id)}
                          className="absolute top-4 right-4 text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <p className="text-[10px] font-black text-orange-600 uppercase">Diplôme #{index + 1}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase text-slate-400">Établissement / École</label>
                            <input
                              type="text"
                              value={ed.school}
                              onChange={(e) => handleUpdateEducation(ed.id, 'school', e.target.value)}
                              placeholder="INP-HB Yamoussoukro"
                              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-orange-500 bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase text-slate-400">Diplôme ou Certificat</label>
                            <input
                              type="text"
                              value={ed.degree}
                              onChange={(e) => handleUpdateEducation(ed.id, 'degree', e.target.value)}
                              placeholder="Diplôme d'Ingénieur de Conception"
                              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-orange-500 bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase text-slate-400">Mois/Année Début</label>
                            <input
                              type="text"
                              value={ed.startDate}
                              onChange={(e) => handleUpdateEducation(ed.id, 'startDate', e.target.value)}
                              placeholder="Sep 2018"
                              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-orange-500 bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase text-slate-400">Mois/Année Fin</label>
                            <input
                              type="text"
                              value={ed.endDate}
                              onChange={(e) => handleUpdateEducation(ed.id, 'endDate', e.target.value)}
                              placeholder="Juil 2021"
                              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-orange-500 bg-white"
                            />
                          </div>
                          <div className="space-y-1 col-span-1 sm:col-span-2">
                            <label className="text-[9px] font-bold uppercase text-slate-400">Description / Spécialisation</label>
                            <textarea
                              value={ed.description}
                              onChange={(e) => handleUpdateEducation(ed.id, 'description', e.target.value)}
                              placeholder="Spécialité Génie Logiciel, Mention Très Bien."
                              rows={2}
                              className="w-full p-3 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-orange-500 bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Experiences */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase text-slate-500">💼 Liste de vos expériences professionnelles</p>
                  <Button variant="outline" size="sm" onClick={handleAddExperience}>
                    <Plus className="mr-1.5 h-4 w-4 text-orange-600" /> Ajouter
                  </Button>
                </div>

                {formData.experiences.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-450 font-semibold text-xs">
                    Aucune expérience saisie. Ajoutez votre premier poste !
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.experiences.map((exp, index) => (
                      <div key={exp.id} className="p-4 bg-slate-50/60 border border-slate-200 rounded-2xl space-y-3 relative">
                        <button
                          onClick={() => handleRemoveExperience(exp.id)}
                          className="absolute top-4 right-4 text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <p className="text-[10px] font-black text-orange-600 uppercase">Poste #{index + 1}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase text-slate-400">Entreprise / Organisation</label>
                            <input
                              type="text"
                              value={exp.company}
                              onChange={(e) => handleUpdateExperience(exp.id, 'company', e.target.value)}
                              placeholder="Orange Côte d'Ivoire"
                              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-orange-500 bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase text-slate-400">Intitulé de votre Poste</label>
                            <input
                              type="text"
                              value={exp.position}
                              onChange={(e) => handleUpdateExperience(exp.id, 'position', e.target.value)}
                              placeholder="Développeur Frontend Junior"
                              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-orange-500 bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase text-slate-400">Mois/Année Début</label>
                            <input
                              type="text"
                              value={exp.startDate}
                              onChange={(e) => handleUpdateExperience(exp.id, 'startDate', e.target.value)}
                              placeholder="Sep 2021"
                              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-orange-500 bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase text-slate-400">Mois/Année Fin (ou 'Présent')</label>
                            <input
                              type="text"
                              value={exp.endDate}
                              onChange={(e) => handleUpdateExperience(exp.id, 'endDate', e.target.value)}
                              placeholder="Présent"
                              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-orange-500 bg-white"
                            />
                          </div>
                          <div className="space-y-1 col-span-1 sm:col-span-2">
                            <label className="text-[9px] font-bold uppercase text-slate-400">Principales missions et réalisations</label>
                            <textarea
                              value={exp.description}
                              onChange={(e) => handleUpdateExperience(exp.id, 'description', e.target.value)}
                              placeholder="Création et intégration de maquettes Figma. Développement de fonctionnalités web complexes avec React.js et Tailwind CSS."
                              rows={3}
                              className="w-full p-3 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-orange-500 bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Compétences */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-orange-600" /> Compétences Techniques (Hard Skills)</label>
                  <textarea
                    name="skillsTechnical"
                    value={formData.skillsTechnical}
                    onChange={handleChange}
                    placeholder="React, TypeScript, Node.js, Express, PostgreSQL, APIs Rest"
                    rows={2}
                    className="w-full p-3.5 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-orange-600" /> Outils et Méthodes</label>
                  <textarea
                    name="skillsTools"
                    value={formData.skillsTools}
                    onChange={handleChange}
                    placeholder="Git, Docker, Figma, Jira, VS Code, Agile Scrum"
                    rows={2}
                    className="w-full p-3.5 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-orange-600" /> Langues maîtrisées</label>
                  <input
                    type="text"
                    name="skillsLanguages"
                    value={formData.skillsLanguages}
                    onChange={handleChange}
                    placeholder="Français (Courant), Anglais (Technique)"
                    className="w-full h-11 px-4 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}

            {/* Step 6: Certifications & Autres */}
            {step === 6 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-orange-600" /> Certifications obtenues</label>
                  <textarea
                    name="certifications"
                    value={formData.certifications}
                    onChange={handleChange}
                    placeholder="AWS Certified Cloud Practitioner, Scrum Master Professional Certification"
                    rows={2}
                    className="w-full p-3.5 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><HeartHandshake className="h-3.5 w-3.5 text-orange-600" /> Centres d'intérêt ou Bénévolats</label>
                  <textarea
                    name="interestsHobbies"
                    value={formData.interestsHobbies}
                    onChange={handleChange}
                    placeholder="Bénévolat de formation au code, Voyages, Photographie"
                    rows={2}
                    className="w-full p-3.5 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-slate-400" /> Références Professionnelles (Optionnel)</label>
                  <input
                    type="text"
                    name="references"
                    value={formData.references}
                    onChange={handleChange}
                    placeholder="M. Koffi (Directeur Technique chez Orange) - koffi@orange.ci"
                    className="w-full h-11 px-4 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}

            {/* Step 7: Save & Export PDF */}
            {step === 7 && (
              <div className="py-6 text-center space-y-6">
                <div className="h-16 w-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <FileCheck className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-base font-black text-slate-800 uppercase">CV Prêt pour l'Action !</h4>
                  <p className="text-xs font-semibold text-slate-500 max-w-md mx-auto leading-relaxed">
                    Votre CV est complet. Vous pouvez à présent le sauvegarder sous forme de brouillon pour l'éditer plus tard, ou l'exporter immédiatement au format PDF standard pour postuler directement.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
                  <Button 
                    variant="primary" 
                    className="w-full py-3 text-xs tracking-wider"
                    onClick={handleDownloadPDF}
                  >
                    <Download className="mr-1.5 h-4.5 w-4.5 animate-bounce" /> Exporter en PDF
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="w-full py-3 text-xs tracking-wider"
                    onClick={() => handleSaveDraft(false)}
                  >
                    Terminer & Sauvegarder
                  </Button>
                </div>
              </div>
            )}

            {/* Form Actions Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(prev => prev - 1)}
                  className="h-11 px-4.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-extrabold uppercase text-[10px] tracking-wide flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" /> Précédent
                </button>
              ) : (
                <div />
              )}

              {step < 7 ? (
                <button
                  type="button"
                  disabled={!isStepValid()}
                  onClick={() => setStep(prev => prev + 1)}
                  className={`h-11 px-4.5 rounded-xl font-extrabold uppercase text-[10px] tracking-wide flex items-center gap-1.5 transition-colors cursor-pointer bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  Suivant <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <div />
              )}
            </div>
          </GlassCard>
        </div>

        {/* AI Copilot Advisor card column */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard className="border-orange-100/60 bg-gradient-to-br from-white to-orange-50/10 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                <Sparkles className="h-4.5 w-4.5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Conseiller IA Gemini</h4>
                <p className="text-[9px] font-bold text-slate-400">OPTIMISATION CV EN DIRECT</p>
              </div>
            </div>

            <p className="text-[10px] font-semibold text-slate-500 leading-normal">
              Demandez à l'IA Gemini d'analyser le poste visé (<span className="text-orange-600 font-extrabold">{formData.jobTitle || "Indéterminé"}</span>) et d'obtenir 3 recommandations adaptées pour multiplier vos chances d'entretien.
            </p>

            <Button
              variant="outline"
              className="w-full text-[10px] uppercase tracking-wider bg-white py-2"
              onClick={handleGetAiAdvice}
              isLoading={loadingAdvice}
              disabled={!formData.jobTitle}
            >
              <Sparkles className="mr-1.5 h-4 w-4 text-orange-500" /> Générer conseils IA
            </Button>

            {aiAdvice && (
              <div className="bg-slate-950 text-slate-100 rounded-2xl p-4.5 border border-slate-800/80 shadow-md text-left text-xs leading-relaxed max-h-72 overflow-y-auto space-y-2 prose prose-invert font-semibold">
                <p className="text-[10px] font-black uppercase text-orange-400 tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-850">
                  ⚡ Recommandations Gemini 2.5
                </p>
                <div className="text-[11px] font-medium leading-relaxed space-y-1.5 break-words whitespace-pre-wrap">
                  {aiAdvice}
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
