import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Sparkles, 
  UploadCloud, 
  CheckCircle2, 
  Trash2, 
  Briefcase, 
  Building2, 
  MapPin, 
  DollarSign, 
  GraduationCap, 
  Phone, 
  Mail, 
  Link as LinkIcon, 
  AlertCircle,
  FileText,
  HelpCircle,
  ClipboardList
} from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

interface ParsedOffer {
  title: string;
  companyName: string;
  location: string;
  type: string;
  experienceYears: string;
  salary: string;
  studyLevels: string[];
  description: string;
  requirements: string;
  requiredDocs: string[];
  offer_type: 'internal' | 'external';
  external_apply_email: string;
  phone: string;
  whatsapp: string;
  external_apply_link: string;
}

interface ImportJobsModuleProps {
  addLog?: (action: string, target: string, type: string) => Promise<void>;
  onSuccess?: () => void;
}

const FIELD_DEFINITIONS = [
  { key: 'title', labels: ['intitule du poste', 'intitulé du poste', 'titre du poste', 'intitule', 'intitulé', 'titre', 'job title', 'poste', 'title'] },
  { key: 'companyName', labels: ["nom de l'entreprise", "nom de l'entreprise", "nom de l'entreprise", "entreprise", "societe", "société", "company name", "company"] },
  { key: 'location', labels: ['localisation', 'lieu', 'ville', 'adresse', 'location'] },
  { key: 'type', labels: ['type de contrat', 'type de contrat', 'contrat', 'contract type', 'contract'] },
  { key: 'experienceYears', labels: ['experience requise', 'expérience requise', 'experience level', 'experience', 'expérience', 'experience years'] },
  { key: 'salary', labels: ['salaire estimatif', 'salaire', 'remuneration', 'rémunération', 'salary'] },
  { key: 'studyLevels', labels: ["niveau d'etudes", "niveau d'études", "niveau d'etude", "niveau d'étude", "etudes", "études", "diplome", "diplôme", "education level", "education"] },
  { key: 'description', labels: ['description complete du poste', 'description complète du poste', 'description du poste', 'description', 'job description'] },
  { key: 'requirements', labels: ['missions & exigences du profil', 'missions & exigences', 'missions', 'exigences du profil', 'exigences', 'profil recherche', 'profil recherché', 'requirements'] },
  { key: 'requiredDocs', labels: ['documents demandes', 'documents demandés', 'pieces demandees', 'pièces demandées', 'documents requis', 'documents', 'required docs'] },
  { key: 'offer_type', labels: ['canal de candidature', 'canal', 'apply method'] },
  { key: 'external_apply_email', labels: ['email relais externe', 'email relais', 'email de contact', 'email', 'contact email'] },
  { key: 'phone', labels: ['telephone', 'téléphone', 'tel', 'phone'] },
  { key: 'whatsapp', labels: ['whatsapp', 'contact whatsapp'] },
  { key: 'external_apply_link', labels: ['lien de candidature', 'lien', 'apply link', 'link'] }
];

const cleanValue = (val: string): string => {
  if (!val) return '';
  return val
    .trim()
    .replace(/^(\*\*|\*|["'•\-\s:])*/g, '') // strip starting markdown markers, list symbols, or stray colons
    .replace(/(\*\*|\*|["'\s])*$/g, '')   // strip ending bold/italic markers
    .trim();
};

export default function ImportJobsModule({ addLog, onSuccess }: ImportJobsModuleProps) {
  const [inputText, setInputText] = useState('');
  const [offers, setOffers] = useState<ParsedOffer[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAnalyze = () => {
    if (!inputText.trim()) {
      showToast('Veuillez coller du texte contenant une ou plusieurs offres.', 'error');
      return;
    }

    try {
      // Split by 10 or more equals signs
      const blocks = inputText.split(/(?:\r?\n|^)\s*={10,}\s*(?:\r?\n|$)/);
      const parsedList: ParsedOffer[] = [];

      for (const block of blocks) {
        if (!block.trim()) continue;

        const occurrences: { key: string; index: number; length: number }[] = [];

        // Scan for all fields in current text block
        for (const field of FIELD_DEFINITIONS) {
          let earliestMatch: { index: number; length: number } | null = null;

          for (const label of field.labels) {
            const escapedLabel = label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            // Regex handles line start or newline, optional list/markdown markers, label, and separator (: or = or -)
            const regex = new RegExp(`(?:^|\\n)\\s*[-*•]*\\s*\\**\\s*(${escapedLabel})\\s*\\**\\s*[:=-]\\s*`, 'i');
            const match = regex.exec(block);

            if (match) {
              if (earliestMatch === null || match.index < earliestMatch.index) {
                earliestMatch = { index: match.index, length: match[0].length };
              }
            }
          }

          if (earliestMatch !== null) {
            occurrences.push({
              key: field.key,
              index: earliestMatch.index,
              length: earliestMatch.length
            });
          }
        }

        // Sort by index in text block to capture multi-line values between fields
        occurrences.sort((a, b) => a.index - b.index);

        const parsedData: Record<string, string> = {};

        for (let i = 0; i < occurrences.length; i++) {
          const current = occurrences[i];
          const startOfValue = current.index + current.length;
          const endOfValue = (i + 1 < occurrences.length) ? occurrences[i + 1].index : block.length;

          const rawValue = block.substring(startOfValue, endOfValue);
          parsedData[current.key] = cleanValue(rawValue);
        }

        // Only accept if title or company name is detected
        if (parsedData.title || parsedData.companyName) {
          const rawStudy = parsedData.studyLevels || '';
          const parsedStudy = rawStudy ? rawStudy.split(/[,;\n]+/).map(s => cleanValue(s)).filter(Boolean) : ['Bac+3'];

          const rawDocs = parsedData.requiredDocs || '';
          const parsedDocs = rawDocs ? rawDocs.split(/[,;\n]+/).map(s => cleanValue(s)).filter(Boolean) : ['Curriculum Vitae (CV)'];

          // Auto-detect canal de candidature (Platform vs External Email Relay)
          let offerType: 'internal' | 'external' = 'internal';
          if (parsedData.offer_type && /email|relais|externe|populaire/i.test(parsedData.offer_type)) {
            offerType = 'external';
          } else if (parsedData.external_apply_email) {
            offerType = 'external';
          }

          parsedList.push({
            title: parsedData.title || '',
            companyName: parsedData.companyName || '',
            location: parsedData.location || "Abidjan, Côte d'Ivoire",
            type: parsedData.type || 'CDI',
            experienceYears: parsedData.experienceYears || '3 ans',
            salary: parsedData.salary || '',
            studyLevels: parsedStudy,
            description: parsedData.description || '',
            requirements: parsedData.requirements || '',
            requiredDocs: parsedDocs,
            offer_type: offerType,
            external_apply_email: parsedData.external_apply_email || '',
            phone: parsedData.phone || '',
            whatsapp: parsedData.whatsapp || '',
            external_apply_link: parsedData.external_apply_link || '',
          });
        }
      }

      if (parsedList.length === 0) {
        showToast("Aucune offre n'a pu être reconnue. Assurez-vous d'utiliser les intitulés standards.", 'error');
        return;
      }

      setOffers(parsedList);
      showToast(`${parsedList.length} offre(s) extraite(s) avec succès ! Veuillez relire et corriger ci-dessous.`, 'success');
    } catch (err) {
      console.error(err);
      showToast("Une erreur est survenue lors de l'analyse.", 'error');
    }
  };

  const handleUpdateField = (index: number, key: keyof ParsedOffer, value: any) => {
    setOffers(prev => prev.map((off, idx) => {
      if (idx !== index) return off;
      return { ...off, [key]: value };
    }));
  };

  const handleRemoveOffer = (index: number) => {
    setOffers(prev => prev.filter((_, idx) => idx !== index));
    showToast('Offre retirée de la liste de pré-importation.', 'success');
  };

  const handleImportAll = async () => {
    if (offers.length === 0) {
      showToast("Aucune offre à importer.", 'error');
      return;
    }

    // Basic safety validation
    for (let i = 0; i < offers.length; i++) {
      const off = offers[i];
      if (!off.title.trim()) {
        showToast(`L'offre n°${i + 1} n'a pas d'intitulé de poste.`, 'error');
        return;
      }
      if (!off.companyName.trim()) {
        showToast(`L'offre n°${i + 1} n'a pas de nom d'entreprise.`, 'error');
        return;
      }
      if (off.offer_type === 'external' && !off.external_apply_email.trim()) {
        showToast(`L'offre n°${i + 1} est configurée en relais externe mais n'a pas d'email de contact.`, 'error');
        return;
      }
    }

    setLoading(true);
    try {
      let successCount = 0;

      for (const off of offers) {
        const payload = {
          title: off.title,
          companyName: off.companyName,
          companyLogo: "https://lh3.googleusercontent.com/d/1O58k8ZpXqgXW-9_H-Hk3V-e4I5V_H_R3=w200-h200", // standard brand fallback logo
          type: off.type || 'CDI',
          field: "Technologie & IA", // Standard default
          category: "popular",
          location: off.location || "Abidjan, Côte d'Ivoire",
          salary: off.salary || '',
          description: off.description || '',
          requirements: off.requirements || '',
          status: "active", // Direct imports from admin dashboard are active
          createdAt: new Date(),
          isFeatured: true,
          is_featured: true,
          is_hidden: false,
          is_restricted: false,
          is_anonymous: false,
          offer_type: off.offer_type,
          external_apply_email: off.offer_type === 'external' ? off.external_apply_email : '',
          createdBy: "admin",
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Valid for 30 days
          views: 0,
          shares: 0,
          likes: 0,
          applications: 0,
          studyLevels: off.studyLevels,
          experienceYears: off.experienceYears,
          requiredDocs: off.requiredDocs,
          prioritizePlatform: true,
          phone: off.phone || '',
          whatsapp: off.whatsapp || '',
          external_apply_link: off.external_apply_link || ''
        };

        await addDoc(collection(db, "offers"), payload);
        successCount++;

        if (addLog) {
          await addLog("Importation intelligente d'offre", `Offre "${off.title}" importée pour ${off.companyName}`, "info");
        }
      }

      showToast(`${successCount} offre(s) importée(s) et publiée(s) avec succès !`, 'success');
      setOffers([]);
      setInputText('');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'enregistrement dans la base de données.", 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-1 sm:p-4 text-left">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-2xl shadow-xl text-white flex items-center gap-3 font-extrabold text-xs uppercase tracking-wider ${
              toast.type === 'success' ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-rose-600 shadow-rose-600/20'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white rounded-[32px] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-64 w-64 bg-orange-600/10 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-orange-600 text-xs font-black uppercase px-3 py-1 rounded-full tracking-widest text-white shadow-lg shadow-orange-600/20 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> IA & Graphes
            </span>
            <span className="text-slate-400 font-extrabold text-xs">MOTEUR D'IMPORT INTELLIGENT v2.0</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white leading-tight">Importation Intelligente d'Offres</h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-300 max-w-xl leading-relaxed">
            Copiez-collez simplement une ou plusieurs fiches de poste préparées par ChatGPT ou au format brut. Notre moteur extrait instantanément les données pour les injecter en base de données.
          </p>
        </div>
        <div className="shrink-0 relative z-10 flex items-center">
          <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
            <div className="h-12 w-12 bg-orange-600/20 text-orange-500 rounded-xl flex items-center justify-center">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Séparateur requis</p>
              <p className="text-xs font-mono font-black text-white bg-slate-950 px-2 py-1 rounded border border-slate-800 mt-1">
                ==============================
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Block 1: Paste Area */}
      <Card className="border-none shadow-2xl rounded-[30px] p-6 sm:p-8 bg-white space-y-6">
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-orange-600" />
            Coller le texte des offres ici
          </Label>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Astuce : Vous pouvez coller plusieurs fiches de poste à la suite en les séparant par une ligne de tirets de type <code className="bg-slate-50 border border-slate-200 px-1 py-0.5 rounded font-mono font-bold text-slate-700">==============================</code>.
          </p>
        </div>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Exemple :&#10;&#10;Intitulé du poste : Développeur React&#10;Nom de l'entreprise : 2NG Groupe&#10;Localisation : Abidjan, Côte d'Ivoire&#10;Type de contrat : CDI&#10;Expérience requise : 3 ans&#10;Salaire estimatif : 800 000 FCFA&#10;Niveau d'études : Bac+3&#10;Description complète du poste : Nous recherchons un développeur React...&#10;Missions & Exigences du profil : Maîtrise de React, TypeScript...&#10;Documents demandés : CV&#10;Canal de candidature : Email&#10;Email relais externe : recrutement@2ng.com&#10;Téléphone : +225 0102030405&#10;WhatsApp : +225 0506070809&#10;Lien de candidature : https://2ng.com/apply"
          className="w-full min-h-[300px] sm:min-h-[350px] p-5 rounded-2xl border border-slate-200 bg-slate-50/50 font-mono text-xs font-medium text-slate-700 leading-relaxed outline-none focus:border-orange-500 focus:bg-white transition-all resize-y"
        />

        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <Button
            type="button"
            onClick={handleAnalyze}
            className="h-12 px-8 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/15 flex items-center justify-center gap-2 cursor-pointer flex-1 sm:flex-initial"
          >
            <Sparkles className="h-4.5 w-4.5" />
            Analyser & Préparer
          </Button>
          {offers.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => { setOffers([]); showToast('Aperçus effacés.', 'success'); }}
              className="h-12 px-6 rounded-xl border-slate-200 text-slate-500 font-extrabold text-xs uppercase tracking-wider cursor-pointer"
            >
              Annuler l'aperçu
            </Button>
          )}
        </div>
      </Card>

      {/* Block 2: Preview Area (Aperçu) */}
      <AnimatePresence>
        {offers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 25 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Aperçu des fiches extraites ({offers.length} offre(s) trouvée(s))
              </h3>
              <p className="text-xs font-bold text-slate-400">Veuillez ajuster les informations avant l'import final</p>
            </div>

            <div className="space-y-6">
              {offers.map((off, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border border-slate-150/80 rounded-[30px] p-6 sm:p-8 shadow-xl space-y-6 relative group"
                >
                  {/* Remove Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleRemoveOffer(index)}
                    className="absolute top-4 right-4 h-10 w-10 p-0 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Retirer cette offre"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>

                  {/* Card Badge Header */}
                  <div className="flex items-center gap-3">
                    <span className="h-8 w-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xs">
                      #{index + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        {off.title || 'Intitulé non renseigné'}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                        {off.companyName || 'Entreprise non renseignée'} · {off.location || 'Localisation non renseignée'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                    
                    {/* Left Column: Essential details */}
                    <div className="md:col-span-1 space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-slate-900 uppercase flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5 text-orange-500" /> Intitulé du poste *
                        </Label>
                        <Input
                          required
                          value={off.title}
                          onChange={(e) => handleUpdateField(index, 'title', e.target.value)}
                          className="h-10 rounded-xl border-slate-200 font-bold text-xs bg-slate-50/50 focus:bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-slate-900 uppercase flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-orange-500" /> Nom de l'entreprise *
                        </Label>
                        <Input
                          required
                          value={off.companyName}
                          onChange={(e) => handleUpdateField(index, 'companyName', e.target.value)}
                          className="h-10 rounded-xl border-slate-200 font-bold text-xs bg-slate-50/50 focus:bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-slate-900 uppercase flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-orange-500" /> Localisation *
                        </Label>
                        <Input
                          value={off.location}
                          onChange={(e) => handleUpdateField(index, 'location', e.target.value)}
                          className="h-10 rounded-xl border-slate-200 font-bold text-xs bg-slate-50/50 focus:bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-900 uppercase">Type de contrat</Label>
                          <select
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/50 font-bold text-xs text-slate-700 focus:bg-white outline-none"
                            value={off.type}
                            onChange={(e) => handleUpdateField(index, 'type', e.target.value)}
                          >
                            <option value="CDI">CDI</option>
                            <option value="CDD">CDD</option>
                            <option value="Freelance">Freelance</option>
                            <option value="Stage">Stage</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-900 uppercase">Expérience</Label>
                          <Input
                            value={off.experienceYears}
                            onChange={(e) => handleUpdateField(index, 'experienceYears', e.target.value)}
                            className="h-10 rounded-xl border-slate-200 font-bold text-xs bg-slate-50/50 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-900 uppercase flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5 text-orange-500" /> Salaire
                          </Label>
                          <Input
                            value={off.salary}
                            onChange={(e) => handleUpdateField(index, 'salary', e.target.value)}
                            placeholder="Ex: 800 000 FCFA"
                            className="h-10 rounded-xl border-slate-200 font-bold text-xs bg-slate-50/50 focus:bg-white"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-900 uppercase flex items-center gap-1">
                            <GraduationCap className="h-3.5 w-3.5 text-orange-500" /> Études / Diplôme
                          </Label>
                          <Input
                            value={off.studyLevels.join(', ')}
                            onChange={(e) => handleUpdateField(index, 'studyLevels', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
                            className="h-10 rounded-xl border-slate-200 font-bold text-xs bg-slate-50/50 focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Middle Column: Descriptions and Requirements */}
                    <div className="md:col-span-1 space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-slate-900 uppercase">Description complète du poste</Label>
                        <textarea
                          value={off.description}
                          onChange={(e) => handleUpdateField(index, 'description', e.target.value)}
                          className="w-full h-[142px] p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 font-medium text-xs text-slate-700 outline-none focus:bg-white focus:border-orange-500 transition-colors resize-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-slate-900 uppercase">Missions & Exigences du profil</Label>
                        <textarea
                          value={off.requirements}
                          onChange={(e) => handleUpdateField(index, 'requirements', e.target.value)}
                          className="w-full h-[142px] p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 font-medium text-xs text-slate-700 outline-none focus:bg-white focus:border-orange-500 transition-colors resize-none"
                        />
                      </div>
                    </div>

                    {/* Right Column: Candidates Documents and Contact Settings */}
                    <div className="md:col-span-1 space-y-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-150/40">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-slate-900 uppercase">Documents demandés (séparés par virgule)</Label>
                        <Input
                          value={off.requiredDocs.join(', ')}
                          onChange={(e) => handleUpdateField(index, 'requiredDocs', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
                          className="h-9 rounded-lg border-slate-200 font-bold text-[11px] bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-slate-900 uppercase">Canal de candidature *</Label>
                        <select
                          className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white font-bold text-[11px] text-slate-700 outline-none"
                          value={off.offer_type}
                          onChange={(e) => handleUpdateField(index, 'offer_type', e.target.value)}
                        >
                          <option value="internal">Candidature sur Plateforme (Interne)</option>
                          <option value="external">Relais Email Externe</option>
                        </select>
                      </div>

                      {off.offer_type === 'external' && (
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-900 uppercase flex items-center gap-1">
                            <Mail className="h-3 w-3 text-rose-500" /> Email relais externe *
                          </Label>
                          <Input
                            required={off.offer_type === 'external'}
                            type="email"
                            value={off.external_apply_email}
                            onChange={(e) => handleUpdateField(index, 'external_apply_email', e.target.value)}
                            placeholder="recrutement@societe.com"
                            className="h-9 rounded-lg border-rose-200 font-bold text-[11px] bg-rose-50/10 text-rose-800"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-900 uppercase flex items-center gap-1">
                            <Phone className="h-3 w-3 text-[#e25c1d]" /> Téléphone
                          </Label>
                          <Input
                            value={off.phone}
                            onChange={(e) => handleUpdateField(index, 'phone', e.target.value)}
                            className="h-9 rounded-lg border-slate-200 font-bold text-[11px] bg-white"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-900 uppercase flex items-center gap-1">
                            WhatsApp
                          </Label>
                          <Input
                            value={off.whatsapp}
                            onChange={(e) => handleUpdateField(index, 'whatsapp', e.target.value)}
                            placeholder="+225..."
                            className="h-9 rounded-lg border-slate-200 font-bold text-[11px] bg-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-slate-900 uppercase flex items-center gap-1">
                          <LinkIcon className="h-3 w-3 text-[#e25c1d]" /> Lien de candidature
                        </Label>
                        <Input
                          value={off.external_apply_link}
                          onChange={(e) => handleUpdateField(index, 'external_apply_link', e.target.value)}
                          placeholder="https://..."
                          className="h-9 rounded-lg border-slate-200 font-bold text-[11px] bg-white"
                        />
                      </div>
                    </div>

                  </div>
                </motion.div>
              ))}
            </div>

            {/* Bottom Actions for Bulk Import */}
            <div className="bg-slate-900 p-6 rounded-[32px] text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-sm font-black uppercase text-orange-500 tracking-wider">Prêt pour la publication directe ?</p>
                <p className="text-xs text-slate-300 font-semibold">
                  Une fois importées, ces {offers.length} offre(s) seront en ligne et immédiatement visibles par tous les candidats.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleImportAll}
                disabled={loading}
                className="h-12 px-8 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 w-full sm:w-auto justify-center"
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <UploadCloud className="h-4.5 w-4.5" />
                )}
                Confirmer l'importation ({offers.length} offre(s))
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
