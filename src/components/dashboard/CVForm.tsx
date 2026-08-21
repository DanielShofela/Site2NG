import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Mail, Phone, Calendar, Globe, MapPin, Briefcase, 
  GraduationCap, Sparkles, Plus, Trash2, ArrowLeft, ArrowRight,
  FileCheck, Award, HeartHandshake, Eye, BookOpen,
  Camera, Upload, Image as ImageIcon, Send, Save, RotateCcw, CheckCircle2
} from 'lucide-react';
import Button from './Button';
import GlassCard from './GlassCard';
import { CVFormData, CVEducation, CVExperience, CVVersion } from '@/types/cvlm';
import { saveVersion, getVersionById } from '@/services/cvVersionService';
import { generateCVAdvice } from '@/services/geminiService';
import { saveCVRequest } from '@/services/supabaseClient';
import { showToast } from './toast';
import { compressImage } from '@/lib/imageUtils';
import { safeSetItem, safeGetItem, safeRemoveItem } from '@/lib/safeStorage';
import { db, auth } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { cleanUndefined } from '@/contexts/AuthContext';

interface CVFormProps {
  templateId: string;
  templateName: string;
  initialVersionId?: string | null;
  onBack: () => void;
  onSaveComplete: () => void;
  userProfile?: any;
}

const DEFAULT_FORM_DATA = (): CVFormData => ({
  fullName: '',
  email: '',
  phonePrimary: '',
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

const buildPrefilledCVData = (profile: any): CVFormData => {
  const base = DEFAULT_FORM_DATA();
  if (!profile) return base;

  const email = profile?.email || base.email;
  const name = profile?.displayName || profile?.name || 
    (profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : '') || 
    base.fullName;

  const phone = profile?.phone || profile?.phonePrimary || base.phonePrimary;

  const address = profile?.address ||
    (profile?.locationCity ? `${profile.locationCity}, Côte d'Ivoire` : '') ||
    (profile?.city ? `${profile.city}, Côte d'Ivoire` : '') ||
    (profile?.location || base.address);

  const jobTitle = profile?.jobTitle || base.jobTitle;
  const portfolioUrl = profile?.portfolioUrl || profile?.linkedinUrl || profile?.social?.linkedin || profile?.social?.portfolio || base.portfolioUrl;
  const photoUrl = profile?.avatarUrl || profile?.photoUrl || undefined;

  let experiences: CVExperience[] = base.experiences;
  if (Array.isArray(profile?.experiences) && profile.experiences.length > 0) {
    experiences = profile.experiences.map((exp: any, idx: number) => ({
      id: `exp-${idx}-${Date.now()}`,
      company: exp.company || '',
      position: exp.role || exp.position || '',
      startDate: exp.startDate || '',
      endDate: exp.current ? 'Présent' : (exp.endDate || ''),
      description: exp.description || ''
    }));
  }

  let educations: CVEducation[] = base.educations;
  if (Array.isArray(profile?.education) && profile.education.length > 0) {
    educations = profile.education.map((ed: any, idx: number) => ({
      id: `ed-${idx}-${Date.now()}`,
      school: ed.school || '',
      degree: ed.degree ? `${ed.degree}${ed.field ? ' en ' + ed.field : ''}` : (ed.field || ''),
      startDate: ed.startDate || '',
      endDate: ed.current ? 'En cours' : (ed.endDate || ''),
      description: ed.description || ''
    }));
  }

  let skillsTechnical = base.skillsTechnical;
  if (Array.isArray(profile?.skills) && profile.skills.length > 0) {
    skillsTechnical = profile.skills.map((s: any) => typeof s === 'string' ? s : s.name).filter(Boolean).join(', ');
  }

  let skillsLanguages = base.skillsLanguages;
  if (Array.isArray(profile?.languages) && profile.languages.length > 0) {
    skillsLanguages = profile.languages.map((l: any) => typeof l === 'string' ? l : `${l.language || l} (${l.level || ''})`).filter(Boolean).join(', ');
  }

  return {
    fullName: name,
    email: email,
    phonePrimary: phone,
    phoneSecondary: profile?.phoneSecondary || base.phoneSecondary,
    address: address,
    birthYear: profile?.birthDate ? profile.birthDate.substring(0, 4) : base.birthYear,
    nationality: profile?.nationality || base.nationality,
    jobTitle: jobTitle,
    portfolioUrl: portfolioUrl,
    photoUrl: photoUrl,
    educations: educations,
    experiences: experiences,
    skillsTechnical: skillsTechnical,
    skillsTools: base.skillsTools,
    skillsLanguages: skillsLanguages,
    certifications: base.certifications,
    interestsHobbies: profile?.bio || base.interestsHobbies,
    interestsVolunteering: base.interestsVolunteering,
    references: base.references,
    draft: true,
    message: ''
  };
};

export default function CVForm({ templateId, templateName, initialVersionId, onBack, onSaveComplete, userProfile }: CVFormProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CVFormData>(() => buildPrefilledCVData(userProfile));
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [versionName, setVersionName] = useState('Mon CV Professionnel');

  const draftCacheKey = `cvlm_draft_cache_cv_${templateId}`;

  // Load existing version or draft cache or user profile prefill
  useEffect(() => {
    if (initialVersionId) {
      const existing = getVersionById(initialVersionId);
      if (existing) {
        setFormData(existing.data);
        setVersionName(existing.name);
      }
    } else {
      const cachedStr = safeGetItem(draftCacheKey);
      if (cachedStr) {
        try {
          const cachedData = JSON.parse(cachedStr);
          setFormData(cachedData);
          showToast('Brouillon sauvegardé en cache restauré !', 'info');
        } catch (e) {
          setFormData(buildPrefilledCVData(userProfile));
        }
      } else if (userProfile) {
        setFormData(buildPrefilledCVData(userProfile));
      }
    }
  }, [initialVersionId, userProfile, templateId]);

  // Auto-save form cache to localStorage on edit
  useEffect(() => {
    if (!initialVersionId && formData.fullName) {
      safeSetItem(draftCacheKey, JSON.stringify(formData));
    }
  }, [formData, templateId, initialVersionId]);

  const handleClearDraftCache = () => {
    safeRemoveItem(draftCacheKey);
    setFormData(buildPrefilledCVData(userProfile));
    showToast('Champs réinitialisés avec votre profil.', 'info');
  };

  // Handle inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 500, 500, 0.85);
      setFormData(prev => ({ ...prev, photoUrl: compressed }));
      showToast('Photo de profil ajoutée avec succès au CV !', 'success');
    } catch (err) {
      console.error('Error compressing CV photo:', err);
      showToast('Erreur lors du traitement de la photo', 'error');
    }
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
      showToast('Conseils d\'experts chargés !', 'success');
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

  // Format and send information to +225 0170561121 via WhatsApp
  const handleSendWhatsApp = () => {
    let text = `*✨ NOUVEAU CV COMPLÉTÉ SUR CVLM - 2NG Groupe *\n\n`;
    text += `👤 *Informations Personnelles :*\n`;
    text += `- *Nom complet :* ${formData.fullName}\n`;
    text += `- *Email :* ${formData.email}\n`;
    text += `- *Téléphone principal :* ${formData.phonePrimary}\n`;
    if (formData.phoneSecondary) text += `- *Téléphone secondaire :* ${formData.phoneSecondary}\n`;
    if (formData.address) text += `- *Adresse :* ${formData.address}\n`;
    if (formData.birthYear) text += `- *Année de naissance :* ${formData.birthYear}\n`;
    if (formData.nationality) text += `- *Nationalité :* ${formData.nationality}\n`;
    text += `- *Poste visé :* ${formData.jobTitle || 'Non spécifié'}\n`;
    if (formData.portfolioUrl) text += `- *Portfolio / LinkedIn :* ${formData.portfolioUrl}\n\n`;

    if (formData.experiences.length > 0) {
      text += `💼 *Expériences Professionnelles :*\n`;
      formData.experiences.forEach((exp, idx) => {
        text += `${idx + 1}. *${exp.position}* chez *${exp.company}* (${exp.startDate} - ${exp.endDate || "Présent"})\n`;
        if (exp.description) text += `   _Description :_ ${exp.description}\n`;
      });
      text += `\n`;
    }

    if (formData.educations.length > 0) {
      text += `🎓 *Formations & Éducation :*\n`;
      formData.educations.forEach((ed, idx) => {
        text += `${idx + 1}. *${ed.degree}* - *${ed.school}* (${ed.startDate} - ${ed.endDate})\n`;
        if (ed.description) text += `   _Description :_ ${ed.description}\n`;
      });
      text += `\n`;
    }

    text += `🛠️ *Compétences :*\n`;
    if (formData.skillsTechnical) text += `- *Techniques :* ${formData.skillsTechnical}\n`;
    if (formData.skillsTools) text += `- *Outils & Softwares :* ${formData.skillsTools}\n`;
    if (formData.skillsLanguages) text += `- *Langues :* ${formData.skillsLanguages}\n\n`;

    if (formData.certifications) {
      text += `🏅 *Certifications :*\n${formData.certifications}\n\n`;
    }
    if (formData.interestsHobbies) {
      text += `🎯 *Intérêts :*\n${formData.interestsHobbies}\n\n`;
    }
    if (formData.references) {
      text += `📞 *Références :*\n${formData.references}\n\n`;
    }

    text += `👉 _Généré via CVLM 2NG (Modèle : ${templateName})_`;

    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/2250170561121?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
    showToast('Redirection vers WhatsApp...', 'success');
  };

  // Submit CV Request to database & RH Experts
  const handleSubmitRequest = async () => {
    setSubmittingRequest(true);
    try {
      const versionId = initialVersionId || `cv-version-${Date.now()}`;
      const newVersion: CVVersion = {
        id: versionId,
        profileType: 'candidate',
        name: versionName,
        data: { ...formData, draft: false },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        templateId,
        templateName
      };

      // 1. Save version locally & Firestore cv_versions
      await saveVersion(newVersion);

      // 2. Save request record locally
      await saveCVRequest({
        templateName,
        status: 'completed'
      });

      // 3. Save request to Firestore database collection 'cv_requests' and local cache
      const currentUser = auth.currentUser;
      const requestDoc = {
        id: `req-cv-${Date.now()}`,
        userId: currentUser?.uid || 'guest',
        userEmail: formData.email,
        userName: formData.fullName,
        userPhone: formData.phonePrimary,
        templateId,
        templateName,
        type: 'cv',
        formData: cleanUndefined(formData),
        status: 'submitted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to local storage cache for instant offline / admin access
      try {
        const cachedStr = safeGetItem('cvlm_all_requests');
        let cachedList = [];
        if (cachedStr) {
          try { cachedList = JSON.parse(cachedStr); } catch (e) {}
        }
        cachedList = [requestDoc, ...cachedList.filter((r: any) => r.id !== requestDoc.id)];
        safeSetItem('cvlm_all_requests', JSON.stringify(cachedList));
      } catch (e) {
        console.warn('Local request cache notice:', e);
      }

      try {
        await setDoc(doc(db, 'cv_requests', requestDoc.id), requestDoc);
        if (currentUser?.uid) {
          await setDoc(doc(db, 'users', currentUser.uid), {
            displayName: formData.fullName,
            phone: formData.phonePrimary,
            jobTitle: formData.jobTitle,
            address: formData.address,
            cvUpdatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (e) {
        console.warn('Firestore request save notice:', e);
      }

      // 4. Background notification email
      try {
        fetch('https://formspree.io/f/xvovgwza', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: '2ng.groupeentreprise@gmail.com',
            subject: `Nouvelle demande de CV (${templateName}) - ${formData.fullName}`,
            candidateName: formData.fullName,
            candidateEmail: formData.email,
            candidatePhone: formData.phonePrimary,
            jobTitle: formData.jobTitle,
            templateName,
            formData
          })
        }).catch(() => {});
      } catch (err) {
        // ignore background dispatch
      }

      // 5. Clear draft cache from localStorage
      safeRemoveItem(draftCacheKey);

      showToast('Votre demande de création de CV a été transmise avec succès à nos experts RH !', 'success');
      onSaveComplete();
    } catch (err) {
      console.error('Error submitting request:', err);
      showToast('Erreur lors de la transmission de la demande', 'error');
    } finally {
      setSubmittingRequest(false);
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
      <div className="max-w-4xl mx-auto">
        <GlassCard className="space-y-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              Étape {step} / 7 : {stepsList[step - 1]}
            </h3>

            {/* Step 1: Personal Info */}
            {step === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Photo Upload Area */}
                <div className="col-span-1 sm:col-span-2 bg-slate-50 border border-dashed border-slate-300 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative shrink-0">
                    {formData.photoUrl ? (
                      <img
                        src={formData.photoUrl}
                        alt="Photo CV"
                        className="h-20 w-20 rounded-2xl object-cover border-2 border-orange-500 shadow-sm"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-2xl bg-slate-200 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                        <Camera className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-center sm:text-left space-y-1">
                    <p className="text-xs font-black uppercase text-slate-800">Photo du CV (Optionnel)</p>
                    <p className="text-[10px] text-slate-500">Insérez une photo professionnelle. Elle sera enregistrée dans la base de données.</p>
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors shadow-sm mt-1">
                      <Upload className="h-3.5 w-3.5" />
                      {formData.photoUrl ? 'Changer la photo' : 'Téléverser une photo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                    {formData.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, photoUrl: undefined }))}
                        className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:underline"
                      >
                        <Trash2 className="h-3 w-3" /> Supprimer
                      </button>
                    )}
                  </div>
                </div>

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

            {/* Step 7: Finalize & Submit Request */}
            {step === 7 && (
              <div className="py-6 text-center space-y-6">
                <div className="h-16 w-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-base font-black text-slate-800 uppercase">DEMANDE PRÊTE À ÊTRE TRANSMISE !</h4>
                  <p className="text-xs font-semibold text-slate-500 max-w-md mx-auto leading-relaxed">
                    Vos informations sont enregistrées. Cliquez sur <strong className="text-slate-800">Soumettre ma demande</strong> pour transmettre votre dossier à nos experts RH qui concevront votre CV sur-mesure.
                  </p>
                </div>

                <div className="flex flex-col gap-3 max-w-sm mx-auto w-full">
                  <Button 
                    variant="primary" 
                    className="w-full py-3.5 text-xs font-black uppercase tracking-wider bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-650/20"
                    onClick={handleSubmitRequest}
                    isLoading={submittingRequest}
                  >
                    <Send className="h-4 w-4" /> Soumettre ma demande de CV
                  </Button>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
                    <Button 
                      variant="secondary" 
                      className="w-full py-3 text-xs tracking-wider"
                      onClick={() => handleSaveDraft(false)}
                    >
                      <Save className="mr-1.5 h-4 w-4" /> Sauvegarder brouillon
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full py-3 text-xs tracking-wider border-slate-200"
                      onClick={handleClearDraftCache}
                    >
                      <RotateCcw className="mr-1.5 h-4 w-4 text-slate-500" /> Réinitialiser
                    </Button>
                  </div>
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
    </div>
  );
}
