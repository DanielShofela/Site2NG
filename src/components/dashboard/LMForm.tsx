import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User, Mail, Phone, MapPin, Calendar, Sparkles, ArrowLeft, ArrowRight,
  FileCheck, Download, Award, Edit, Trash2, HelpCircle
} from 'lucide-react';
import Button from './Button';
import GlassCard from './GlassCard';
import { LMFormData, LMVersion } from '@/types/cvlm';
import { saveLMVersion, getLMVersionById } from '@/services/lmVersionService';
import { generateLMAdvice } from '@/services/geminiService';
import { saveCVRequest } from '@/services/supabaseClient';
import { showToast } from './toast';
import { jsPDF } from 'jspdf';

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

const DEFAULT_LM_DATA = (email: string = '', name: string = '', phone: string = ''): LMFormData => ({
  fullName: name,
  email: email,
  phone: phone,
  address: '',
  recipientName: 'Directeur des Ressources Humaines',
  recipientCompany: 'Entreprise Cible',
  recipientAddress: 'Abidjan, Côte d\'Ivoire',
  date: new Date().toLocaleDateString('fr-FR'),
  subject: 'Candidature spontanée',
  openingSalutation: 'Madame, Monsieur,',
  content: '',
  closingSalutation: 'Je vous prie d\'agréer, Madame, Monsieur, l\'expression de mes salutations distinguées.',
  signature: name || 'Candidat'
});

export default function LMForm({ templateId, templateName, initialVersionId, onBack, onSaveComplete, userProfile }: LMFormProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<LMFormData>(DEFAULT_LM_DATA(userProfile?.email, userProfile?.displayName, userProfile?.phone));
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [versionName, setVersionName] = useState('Ma Lettre de Motivation');

  // Load version or pre-populate
  useEffect(() => {
    if (initialVersionId) {
      const existing = getLMVersionById(initialVersionId);
      if (existing) {
        setFormData(existing.data);
        setVersionName(existing.name);
      }
    } else if (userProfile) {
      const pName = userProfile.displayName || '';
      const pTitle = userProfile.jobTitle || '';
      setFormData(prev => ({
        ...prev,
        fullName: pName,
        email: userProfile.email || prev.email,
        phone: userProfile.phone || prev.phone,
        address: userProfile.locationCity ? `${userProfile.locationCity}, ${userProfile.locationCountry || 'CI'}` : prev.address,
        subject: pTitle ? `Candidature au poste de ${pTitle}` : prev.subject,
        content: SAMPLE_LETTER_TEMPLATE(pName, 'Votre Entreprise', pTitle),
        signature: pName
      }));
    }
  }, [initialVersionId, userProfile]);

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
      showToast('Analyses de style Gemini générées !', 'success');
    } catch (e) {
      showToast('Erreur d\'amélioration IA', 'error');
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

  // PDF generation for Letter of Motivation
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const primaryColor = [226, 92, 29]; // #e25c1d
      const darkColor = [15, 23, 42]; // #0f172a
      const lightColor = [71, 85, 105]; // Slate 600

      const margin = 20;
      let y = 25;

      // Header strip decoration
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 8, 'F');

      // 1. SENDER DETAILS (Top Left)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(formData.fullName.toUpperCase(), margin, y);
      y += 5;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(lightColor[0], lightColor[1], lightColor[2]);
      doc.text(formData.address || 'Abidjan, Côte d\'Ivoire', margin, y);
      y += 4;
      doc.text(`Tél: ${formData.phone || ''}`, margin, y);
      y += 4;
      doc.text(`Email: ${formData.email}`, margin, y);

      // Reset Y for recipient block
      let rY = 25;

      // 2. RECIPIENT DETAILS (Top Right aligned)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(`À l'attention de :`, 130, rY);
      rY += 5;
      doc.text(formData.recipientName, 130, rY);
      rY += 4;
      doc.setFont('Helvetica', 'italic');
      doc.text(formData.recipientCompany, 130, rY);
      rY += 4;
      doc.setFont('Helvetica', 'normal');
      doc.text(formData.recipientAddress, 130, rY);

      y = Math.max(y, rY) + 15;

      // Date Block
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Fait à Abidjan, le ${formData.date}`, 210 - margin, y, { align: 'right' });
      y += 12;

      // Subject Block
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(`OBJET : ${formData.subject.toUpperCase()}`, margin, y);
      y += 10;

      // Salutation
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(formData.openingSalutation, margin, y);
      y += 10;

      // Body Content (splitted)
      const splitContent = doc.splitTextToSize(formData.content, 170);
      doc.text(splitContent, margin, y);
      y += splitContent.length * 6 + 10;

      // Closing
      const splitClose = doc.splitTextToSize(formData.closingSalutation, 170);
      doc.text(splitClose, margin, y);
      y += splitClose.length * 6 + 15;

      // Signature Block (Right aligned)
      doc.setFont('Helvetica', 'bold');
      doc.text(formData.signature, 210 - margin - 40, y);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      doc.text(`Généré avec CVLM - 2NG Groupe Entreprises`, 105, 287, { align: 'center' });

      doc.save(`Lettre_${formData.fullName.replace(/\s+/g, '_')}_${templateName.replace(/\s+/g, '_')}.pdf`);
      showToast('Lettre exportée en PDF !', 'success');
      
      handleSaveDraft(true);
    } catch (e: any) {
      console.error(e);
      showToast(`Erreur PDF: ${e.message}`, 'error');
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
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

            {/* Step 5: Finalize and export */}
            {step === 5 && (
              <div className="py-6 text-center space-y-6">
                <div className="h-16 w-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <FileCheck className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-base font-black text-slate-800 uppercase">Lettre Prête pour l'Action !</h4>
                  <p className="text-xs font-semibold text-slate-500 max-w-md mx-auto leading-relaxed">
                    Votre Lettre de Motivation est prête à être envoyée. Exportez-la maintenant en format PDF professionnel pour compléter votre candidature.
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

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
                    <Button 
                      variant="primary" 
                      className="w-full py-3 text-xs tracking-wider"
                      onClick={handleDownloadPDF}
                    >
                      <Download className="mr-1.5 h-4.5 w-4.5 animate-bounce" /> Exporter Lettre
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="w-full py-3 text-xs tracking-wider"
                      onClick={() => handleSaveDraft(false)}
                    >
                      Terminer & Sauver
                    </Button>
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

        {/* AI Style Editor Panel */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard className="border-orange-100/60 bg-gradient-to-br from-white to-orange-50/10 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                <Sparkles className="h-4.5 w-4.5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Correcteur de Style IA</h4>
                <p className="text-[9px] font-bold text-slate-400">AMÉLIORER AVEC GEMINI</p>
              </div>
            </div>

            <p className="text-[10px] font-semibold text-slate-500 leading-normal">
              Utilisez la puissance de Gemini 2.5 pour analyser votre rédaction, corriger les tournures maladroites, et maximiser l'intérêt des recruteurs professionnels.
            </p>

            <Button
              variant="outline"
              className="w-full text-[10px] uppercase tracking-wider bg-white py-2"
              onClick={handleGetAiAdvice}
              isLoading={loadingAdvice}
              disabled={!formData.content}
            >
              <Sparkles className="mr-1.5 h-4 w-4 text-orange-500" /> Améliorer ma Lettre
            </Button>

            {aiAdvice && (
              <div className="bg-slate-950 text-slate-100 rounded-2xl p-4.5 border border-slate-800/80 shadow-md text-left text-xs leading-relaxed max-h-72 overflow-y-auto space-y-2 prose prose-invert font-semibold">
                <p className="text-[10px] font-black uppercase text-orange-400 tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-850">
                  ⚡ Revue de style de l'IA
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
