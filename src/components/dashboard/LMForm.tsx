import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User, Mail, Phone, MapPin, Calendar, Sparkles, ArrowLeft, ArrowRight,
  FileCheck, Award, Edit, Trash2, HelpCircle, Send, Save, RotateCcw, CheckCircle2
} from 'lucide-react';
import Button from './Button';
import GlassCard from './GlassCard';
import { LMFormData, LMVersion } from '@/types/cvlm';
import { saveLMVersion, getLMVersionById } from '@/services/lmVersionService';
import { generateLMAdvice } from '@/services/geminiService';
import { saveCVRequest } from '@/services/supabaseClient';
import { showToast } from './toast';
import { safeSetItem, safeGetItem, safeRemoveItem } from '@/lib/safeStorage';
import { db, auth } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { cleanUndefined } from '@/contexts/AuthContext';

interface LMFormProps {
  templateId: string;
  templateName: string;
  initialVersionId?: string | null;
  onBack: () => void;
  onSaveComplete: () => void;
  userProfile?: any;
}

const SAMPLE_LETTER_TEMPLATE = (name: string, company: string, title: string) => `Objet : Candidature au poste de ${title || '[Intitulé du Poste]'}

Madame, Monsieur,

C’est avec une grande motivation que je vous adresse ma candidature pour rejoindre votre entreprise en qualité de ${title || '[Intitulé du Poste]'}. Fort(e) de mes compétences acquises au cours de mon parcours, je souhaite vivement mettre mon expertise au service de vos équipes.

Au sein de mes précédentes fonctions, j'ai eu l'opportunité de développer de solides compétences adaptées à vos objectifs de croissance. Mon professionnalisme et ma rigueur sont autant d'atouts que je souhaite partager avec ${company || '[Nom de l\'entreprise]'}.

Disponible rapidement, je me tiens à votre entière disposition pour convenir d'un rendez-vous afin de vous exposer mes motivations de vive voix.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.`;

const DEFAULT_LM_DATA = (): LMFormData => ({
  fullName: '',
  email: '',
  phone: '',
  address: '',
  recipientName: 'Directeur des Ressources Humaines',
  recipientCompany: 'Entreprise Cible',
  recipientAddress: 'Abidjan, Côte d\'Ivoire',
  date: new Date().toLocaleDateString('fr-FR'),
  subject: 'Candidature spontanée',
  openingSalutation: 'Madame, Monsieur,',
  content: '',
  closingSalutation: 'Je vous prie d\'agréer, Madame, Monsieur, l\'expression de mes salutations distinguées.',
  signature: 'Candidat'
});

const buildPrefilledLMData = (profile: any): LMFormData => {
  const base = DEFAULT_LM_DATA();
  if (!profile) return base;

  const pName = profile?.displayName || profile?.name || (profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : '') || base.fullName;
  const pEmail = profile?.email || base.email;
  const pPhone = profile?.phone || base.phone;
  const pAddress = profile?.address || (profile?.locationCity ? `${profile.locationCity}, Côte d'Ivoire` : '') || base.address;
  const pTitle = profile?.jobTitle || '';

  return {
    fullName: pName,
    email: pEmail,
    phone: pPhone,
    address: pAddress,
    recipientName: base.recipientName,
    recipientCompany: base.recipientCompany,
    recipientAddress: base.recipientAddress,
    date: base.date,
    subject: pTitle ? `Candidature au poste de ${pTitle}` : base.subject,
    openingSalutation: base.openingSalutation,
    content: SAMPLE_LETTER_TEMPLATE(pName, 'Votre Entreprise', pTitle),
    closingSalutation: base.closingSalutation,
    signature: pName || 'Candidat'
  };
};

export default function LMForm({ templateId, templateName, initialVersionId, onBack, onSaveComplete, userProfile }: LMFormProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<LMFormData>(() => buildPrefilledLMData(userProfile));
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [versionName, setVersionName] = useState('Ma Lettre de Motivation');

  const draftCacheKey = `cvlm_draft_cache_lm_${templateId}`;

  // Load version or pre-populate or load from cache
  useEffect(() => {
    if (initialVersionId) {
      const existing = getLMVersionById(initialVersionId);
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
          showToast('Brouillon de lettre sauvegardé en cache restauré !', 'info');
        } catch (e) {
          setFormData(buildPrefilledLMData(userProfile));
        }
      } else if (userProfile) {
        setFormData(buildPrefilledLMData(userProfile));
      }
    }
  }, [initialVersionId, userProfile, templateId]);

  // Auto-save form cache to localStorage
  useEffect(() => {
    if (!initialVersionId && formData.fullName) {
      safeSetItem(draftCacheKey, JSON.stringify(formData));
    }
  }, [formData, templateId, initialVersionId]);

  const handleClearDraftCache = () => {
    safeRemoveItem(draftCacheKey);
    setFormData(buildPrefilledLMData(userProfile));
    showToast('Formulaire de lettre réinitialisé.', 'info');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Pre-load a structural preset
  const handleLoadTemplate = () => {
    setFormData(prev => ({
      ...prev,
      content: SAMPLE_LETTER_TEMPLATE(prev.fullName, prev.recipientCompany, 'Développeur React/Node.js')
    }));
    showToast('Gabarit de lettre classique injecté !', 'info');
  };

  const isStepValid = () => {
    if (step === 1) {
      return formData.fullName.trim() !== '' && formData.email.trim() !== '';
    }
    if (step === 2) {
      return formData.recipientCompany.trim() !== '';
    }
    if (step === 4) {
      return formData.content.trim() !== '';
    }
    return true;
  };

  // AI Gemini Optimization Trigger
  const handleGetAiAdvice = async () => {
    if (!formData.content) {
      showToast('Saisissez d\'abord du texte dans votre lettre (étape 4) !', 'error');
      return;
    }
    setLoadingAdvice(true);
    setAiAdvice(null);
    try {
      const feedback = await generateLMAdvice(formData.content);
      setAiAdvice(feedback);
      showToast('Conseils de nos experts générés !', 'success');
    } catch (e) {
      showToast('Erreur lors de l\'analyse', 'error');
    } finally {
      setLoadingAdvice(false);
    }
  };

  const handleSaveDraft = (isSilent = false) => {
    const versionId = initialVersionId || `lm-version-${Date.now()}`;
    const newVersion: LMVersion = {
      id: versionId,
      name: versionName,
      data: formData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      templateId,
      templateName
    };
    saveLMVersion(newVersion);
    
    // Register local request count
    saveCVRequest({
      templateName,
      status: 'completed'
    });

    if (!isSilent) {
      showToast('Brouillon de lettre sauvegardé !', 'success');
      onSaveComplete();
    }
  };

  // Format and send cover letter information to +225 0170561121 via WhatsApp
  const handleSendWhatsApp = () => {
    let text = `*✨ NOUVELLE LETTRE DE MOTIVATION COMPLÉTÉE SUR CVLM - 2NG Groupe *\n\n`;
    text += `👤 *Expéditeur :*\n`;
    text += `- *Nom complet :* ${formData.fullName}\n`;
    text += `- *Email :* ${formData.email}\n`;
    if (formData.phone) text += `- *Téléphone :* ${formData.phone}\n`;
    if (formData.address) text += `- *Adresse :* ${formData.address}\n\n`;

    text += `🏢 *Destinataire :*\n`;
    text += `- *Titre :* ${formData.recipientName}\n`;
    text += `- *Entreprise :* ${formData.recipientCompany}\n`;
    text += `- *Adresse :* ${formData.recipientAddress}\n`;
    text += `- *Date :* ${formData.date}\n\n`;

    text += `🎯 *Objet :* ${formData.subject}\n\n`;
    text += `✍ *Contenu de la lettre :*\n`;
    text += `${formData.openingSalutation}\n\n`;
    text += `${formData.content}\n\n`;
    text += `${formData.closingSalutation}\n\n`;
    text += `*Signature :* ${formData.signature}\n\n`;

    text += `👉 _Généré via CVLM 2NG (Modèle : ${templateName})_`;

    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/2250170561121?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
    showToast('Redirection vers WhatsApp...', 'success');
  };

  // Submit Cover Letter Request to database & experts
  const handleSubmitRequest = async () => {
    setSubmittingRequest(true);
    try {
      const versionId = initialVersionId || `lm-version-${Date.now()}`;
      const newVersion: LMVersion = {
        id: versionId,
        name: versionName,
        data: formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        templateId,
        templateName
      };
      await saveLMVersion(newVersion);

      // Save request record
      await saveCVRequest({
        templateName,
        status: 'completed'
      });

      // Save to Firestore database collection 'cv_requests' and local cache
      const currentUser = auth.currentUser;
      const requestDoc = {
        id: `req-lm-${Date.now()}`,
        userId: currentUser?.uid || 'guest',
        userEmail: formData.email,
        userName: formData.fullName,
        userPhone: formData.phone,
        templateId,
        templateName,
        type: 'lm',
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
            phone: formData.phone,
            address: formData.address,
            lmUpdatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (e) {
        console.warn('Firestore request save notice:', e);
      }

      // Background email notification
      try {
        fetch('https://formspree.io/f/xvovgwza', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: '2ng.groupeentreprise@gmail.com',
            subject: `Nouvelle demande de Lettre (${templateName}) - ${formData.fullName}`,
            candidateName: formData.fullName,
            candidateEmail: formData.email,
            candidatePhone: formData.phone,
            recipientCompany: formData.recipientCompany,
            templateName,
            formData
          })
        }).catch(() => {});
      } catch (err) {
        // ignore background dispatch
      }

      // Clear cached draft
      safeRemoveItem(draftCacheKey);

      showToast('Votre demande de lettre de motivation a été transmise avec succès à nos experts !', 'success');
      onSaveComplete();
    } catch (err) {
      console.error('Error submitting LM request:', err);
      showToast('Erreur lors de la transmission de la demande', 'error');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const stepsList = [
    'Expéditeur',
    'Destinataire',
    'Objet',
    'Rédaction',
    'Finaliser'
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-black uppercase text-slate-500 hover:text-orange-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Retourner à la galerie
        </button>
        <div className="flex items-center gap-3">
          <label className="text-[10px] font-black uppercase text-slate-400">Nom du brouillon :</label>
          <input
            type="text"
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            className="h-9 px-3 border border-slate-200 rounded-xl font-bold text-xs bg-white text-slate-700 focus:outline-none focus:border-orange-500"
          />
          <Button variant="outline" size="sm" onClick={() => handleSaveDraft(false)}>
            Sauver
          </Button>
        </div>
      </div>

      {/* Steps Indicator progress */}
      <div className="grid grid-cols-5 gap-1 sm:gap-2 max-w-lg mx-auto">
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

      <div className="max-w-4xl mx-auto">
        <GlassCard className="space-y-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              Étape {step} / 5 : {stepsList[step - 1]}
            </h3>

            {/* Step 1: Sender Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-orange-600" /> Nom complet de l'Expéditeur *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Jean-Marc Kouadio"
                    className="w-full h-11 px-4 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-orange-600" /> Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="jean-marc@example.com"
                      className="w-full h-11 px-4 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-orange-600" /> Téléphone</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+225 07 00 00 00 00"
                      className="w-full h-11 px-4 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" /> Votre Adresse</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Cocody, Abidjan, Côte d'Ivoire"
                    className="w-full h-11 px-4 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Recipient details */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-orange-600" /> Titre du Destinataire</label>
                  <input
                    type="text"
                    name="recipientName"
                    value={formData.recipientName}
                    onChange={handleChange}
                    placeholder="Directeur des Ressources Humaines"
                    className="w-full h-11 px-4 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-orange-600" /> Nom de l'entreprise cible *</label>
                  <input
                    type="text"
                    name="recipientCompany"
                    value={formData.recipientCompany}
                    onChange={handleChange}
                    placeholder="SOCIÉTÉ DU COCHET CI"
                    className="w-full h-11 px-4 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" /> Adresse de l'entreprise</label>
                  <input
                    type="text"
                    name="recipientAddress"
                    value={formData.recipientAddress}
                    onChange={handleChange}
                    placeholder="Zone Industrielle, Yopougon, Abidjan"
                    className="w-full h-11 px-4 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400" /> Date du jour</label>
                  <input
                    type="text"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full h-11 px-4 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Objet & Salutation */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">🎯 Objet de la Lettre *</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Candidature pour le poste de Développeur Fullstack"
                    className="w-full h-11 px-4 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">👋 Formule d'appel</label>
                  <input
                    type="text"
                    name="openingSalutation"
                    value={formData.openingSalutation}
                    onChange={handleChange}
                    placeholder="Madame, Monsieur,"
                    className="w-full h-11 px-4 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Redaction content rich */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">✍️ Corps de votre Lettre de Motivation</label>
                  <button
                    type="button"
                    onClick={handleLoadTemplate}
                    className="text-[9px] font-black uppercase text-orange-600 hover:underline cursor-pointer"
                  >
                    💡 Charger Gabarit de base
                  </button>
                </div>
                
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  rows={10}
                  className="w-full p-4 border border-slate-200 rounded-2xl font-medium text-xs focus:outline-none focus:border-orange-500 leading-relaxed bg-white text-slate-800"
                  placeholder="Écrivez ou collez le texte de votre lettre ici..."
                />
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">🤝 Formule de politesse (Fin)</label>
                  <textarea
                    name="closingSalutation"
                    value={formData.closingSalutation}
                    onChange={handleChange}
                    rows={2}
                    className="w-full p-3.5 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}

            {/* Step 5: Finalize and submit request */}
            {step === 5 && (
              <div className="py-6 text-center space-y-6">
                <div className="h-16 w-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-base font-black text-slate-800 uppercase">DEMANDE PRÊTE À ÊTRE TRANSMISE !</h4>
                  <p className="text-xs font-semibold text-slate-500 max-w-md mx-auto leading-relaxed">
                    Votre formulaire est complet. Transmettez votre demande pour que nos experts RH rédigent et subliment votre lettre de motivation sur-mesure.
                  </p>
                </div>

                <div className="space-y-4 max-w-sm mx-auto">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[9px] font-black uppercase text-slate-400">Signature :</label>
                    <input
                      type="text"
                      name="signature"
                      value={formData.signature}
                      onChange={handleChange}
                      className="w-full h-11 px-4 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="flex flex-col gap-3 w-full">
                    <Button 
                      variant="primary" 
                      className="w-full py-3.5 text-xs font-black uppercase tracking-wider bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-650/20"
                      onClick={handleSubmitRequest}
                      isLoading={submittingRequest}
                    >
                      <Send className="h-4 w-4" /> Soumettre ma demande de Lettre
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
              </div>
            )}

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

              {step < 5 ? (
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
