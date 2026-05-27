import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Briefcase, 
  Clock, 
  Share2, 
  Heart, 
  Bookmark, 
  CheckCircle2, 
  ArrowRight, 
  ChevronDown, 
  Building2, 
  DollarSign, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Job } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface JobCardProps {
  job: Job;
  companyName: string;
  isApplied: boolean;
  onApply: () => void;
  isApplying?: boolean;
  onNext?: () => void; // Optional next callback for the carousel
  showNextArrow?: boolean;
  userRole?: string;
  loggedIn: boolean;
}

export default function JobCard({
  job,
  companyName,
  isApplied,
  onApply,
  isApplying = false,
  onNext,
  showNextArrow = false,
  userRole,
  loggedIn
}: JobCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load saved state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`saved_job_${job.id}`);
    setIsSaved(!!saved);
  }, [job.id]);

  const toggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaved) {
      localStorage.removeItem(`saved_job_${job.id}`);
      setIsSaved(false);
    } else {
      localStorage.setItem(`saved_job_${job.id}`, 'true');
      setIsSaved(true);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/jobs?id=${job.id}`;
    const shareTitle = `${job.title} chez ${companyName}`;
    const shareText = `Regardez cette opportunité d'emploi chez 2NG Groupe Entreprises: ${job.title}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.log("Web Share target closed / unsupported", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (err) {
        console.error("Clipboard copy failed", err);
      }
    }
  };

  // Helper for displaying human field titles
  const getJobTypeLabel = (type: string) => {
    if (type === 'rapid') return 'Express';
    if (type === 'popular') return 'Élite 2NG';
    if (type === 'unique') return 'Direct';
    return type || 'CDI';
  };

  const getJobTypeColor = (type: string) => {
    if (type === 'rapid') return 'bg-amber-500 text-white border-none shadow-sm';
    if (type === 'popular') return 'bg-indigo-650 text-white border-none';
    if (type === 'unique') return 'bg-emerald-600 text-white border-none';
    return 'bg-slate-900 text-white border-none';
  };

  const formattedDate = () => {
    try {
      if (!job.createdAt) return "Récemment";
      const date = job.createdAt.seconds 
        ? new Date(job.createdAt.seconds * 1000) 
        : new Date(job.createdAt);
      if (isNaN(date.getTime())) return "Récemment";
      return formatDistanceToNow(date, { addSuffix: true, locale: fr });
    } catch (e) {
      return "Récemment";
    }
  };

  const deadlineDate = () => {
    const expiresAt = job.expiresAt;
    let expDate: Date | null = null;
    if (expiresAt) {
      try {
        expDate = expiresAt.seconds ? new Date(expiresAt.seconds * 1000) : new Date(expiresAt);
      } catch (e) {}
    }
    if (!expDate || isNaN(expDate.getTime())) {
      if (job.createdAt) {
        try {
          const cDate = job.createdAt.seconds ? new Date(job.createdAt.seconds * 1000) : new Date(job.createdAt);
          expDate = new Date(cDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        } catch (e) {}
      }
    }
    if (expDate && !isNaN(expDate.getTime())) {
      return expDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return "30 jours";
  };

  return (
    <div id={`card-${job.id}`} className="relative w-full max-w-lg mx-auto px-1 sm:px-3 mb-4 select-none">
      {/* Toast alert confirmation inside card */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 12, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-0 inset-x-4 z-50 bg-slate-900 border border-slate-800 text-white text-xs font-black py-3 px-4 rounded-full text-center flex items-center justify-center gap-2 shadow-2xl"
          >
            <CheckCircle2 className="h-4 w-4 text-orange-500 shrink-0" />
            <span>Lien de l'offre copié avec succès !</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-stretch relative">
        {/* Main Interactive Card */}
        <div className="flex-1 bg-white border border-slate-100 rounded-[32px] shadow-sm hover:shadow-xl transition-all duration-350 overflow-hidden flex flex-col justify-between p-6">
          
          <div className="flex flex-col text-left">
            
            {/* Top Collapsible Section */}
            <AnimatePresence initial={false}>
              {!isExpanded && (
                <motion.div
                  initial={{ height: "auto", opacity: 1 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {/* Logo container */}
                      <div className="w-11 h-11 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-black text-xs uppercase overflow-hidden border border-neutral-800 shrink-0 shadow-sm">
                        {job.companyLogo ? (
                          <img src={job.companyLogo} alt={companyName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          (companyName || "EP").substring(0, 2)
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-800 font-extrabold text-sm tracking-tight leading-none truncate max-w-[170px] sm:max-w-[210px]">
                          {companyName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold mt-1 leading-none tracking-tight">
                          2NG Partenaire Certifié
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <Badge className={`${getJobTypeColor(job.type)} font-extrabold text-[9px] px-2.5 py-1 uppercase rounded-lg`}>
                        {getJobTypeLabel(job.type)}
                      </Badge>
                      <Badge variant="outline" className="border-slate-200/85 text-slate-600 bg-slate-50 font-black text-[9px] px-2.5 py-1 uppercase rounded-lg">
                        {job.contractType || 'CDI'}
                      </Badge>
                    </div>
                  </div>

                  {/* Short description when collapsed */}
                  {job.description && (
                    <p className="text-slate-400 font-semibold text-xs leading-relaxed line-clamp-2 pt-1">
                      {job.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3.5 text-[11px] font-black text-slate-500 pt-1 border-b border-dashed border-slate-100 pb-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-neutral-400 shrink-0" /> {job.location}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="h-3.5 w-3.5 text-neutral-400 shrink-0" /> {formattedDate()}
                    </span>
                    <span className="flex items-center gap-1 text-rose-600 bg-rose-50/50 px-2 py-0.5 rounded-md font-extrabold">
                      Exp: {deadlineDate()}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Always Visible Job Title at top. If expanded, it has a beautiful highlighted aesthetic */}
            <div className={`transition-all duration-300 ${isExpanded ? 'bg-orange-50/50 p-4 -mx-6 -mt-6 border-b border-orange-100/40 rounded-t-[32px] mb-4 text-orange-950' : 'mt-4'}`}>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {job.title}
              </h3>
              {isExpanded && (
                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-1.5 text-xs text-orange-700/80 font-bold">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{companyName}</span>
                  </div>
                  <Badge className={`${getJobTypeColor(job.type)} font-extrabold text-[8px] px-2 py-0.5 uppercase`}>
                    {getJobTypeLabel(job.type)}
                  </Badge>
                </div>
              )}
            </div>

            {/* Framer Motion Accordion Details Container */}
            <motion.div
              initial={false}
              animate={{ height: isExpanded ? "auto" : 0 }}
              className="overflow-hidden"
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            >
              <div className="space-y-4 pt-1 pb-4 text-slate-600">
                
                {/* Full Description */}
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-black uppercase text-orange-600 tracking-wider">Description Complète</h4>
                  <p className="text-xs font-semibold text-slate-600 leading-relaxed text-justify whitespace-pre-line">
                    {job.description}
                  </p>
                </div>

                {/* Requirements */}
                {job.requirements && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <h4 className="text-[11px] font-black uppercase text-orange-600 tracking-wider">Profil & Exigences</h4>
                    <p className="text-xs font-semibold text-slate-600 leading-relaxed whitespace-pre-line">
                      {job.requirements}
                    </p>
                  </div>
                )}

                {/* Mini details grid */}
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <div className="bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-150/50">
                    <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Expérience Requise</span>
                    <span className="text-[11px] font-extrabold text-slate-800 leading-none">
                      {job.experienceLevel || "Intermédiaire"} ({job.experienceYears || "1-3 ans"})
                    </span>
                  </div>

                  <div className="bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-150/50">
                    <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Niveau d'études</span>
                    <span className="text-[11px] font-extrabold text-slate-800 leading-none">
                      {job.educationLevel || "Bac +3 (Licence)"}
                    </span>
                  </div>

                  <div className="bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-150/50">
                    <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Secteur d'activité</span>
                    <span className="text-[11px] font-extrabold text-slate-800 leading-none truncate block">
                      {job.field || "Général"}
                    </span>
                  </div>

                  <div className="bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-150/50">
                    <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Détails financiers</span>
                    <span className="text-[11px] font-extrabold text-emerald-700 leading-none block truncate">
                      {job.salary || "Non spécifié"}
                    </span>
                  </div>
                </div>

                {/* Required Documents / Exigences */}
                {job.conditionsDocuments && job.conditionsDocuments.length > 0 && (
                  <div className="bg-orange-50/30 border border-orange-100 p-3 rounded-2xl space-y-1.5">
                    <span className="text-[10px] text-orange-900 font-black uppercase tracking-wider block">Documents Exigés :</span>
                    <div className="flex flex-wrap gap-1">
                      {job.conditionsDocuments.map((docItem, idx) => (
                        <span key={idx} className="bg-white border border-orange-200/50 text-slate-700 font-bold text-[9px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                          <FileText className="h-2.5 w-2.5 text-orange-500" />
                          {docItem}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mode de dépôt et instructions */}
                <div className="bg-slate-900 text-white p-3.5 rounded-2xl space-y-1 text-center">
                  <p className="text-[10px] font-black uppercase tracking-wide text-orange-400">Dossier de candidature</p>
                  <p className="text-xs font-semibold">
                    Dépôt via :{" "}
                    <span className="bg-white/15 border border-white/20 text-white font-black text-[9px] px-1.5 py-0.5 rounded-md uppercase">
                      {job.applyMethod === 'platform' ? 'Plateforme 2NG' : 'E-mail Direct'}
                    </span>
                  </p>
                  {job.companyEmail && (
                    <p className="text-[11px] font-bold text-slate-305 pt-1.5 select-all hover:text-orange-300">
                      Email : {job.companyEmail}
                    </p>
                  )}
                </div>

              </div>
            </motion.div>

          </div>

          {/* Bottom Actions Row */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-2.5">
            {/* Share, Save & Details */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                onClick={handleShare}
                className="w-10 h-10 rounded-full border-slate-150 text-slate-500 hover:text-orange-600 hover:bg-orange-50/30 hover:border-orange-200 transition-all shadow-sm"
                title="Partager"
              >
                <Share2 className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={toggleSave}
                className={`w-10 h-10 rounded-full border-slate-150 transition-all shadow-sm ${
                  isSaved 
                    ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100' 
                    : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50/30 hover:border-rose-200'
                }`}
                title="Enregistrer"
              >
                <Heart className={`h-4 w-4 ${isSaved ? 'fill-rose-500' : ''}`} />
              </Button>

              {/* Details Expand button */}
              <Button
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
                className={`h-10 px-3.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  isExpanded ? 'bg-orange-600 text-white hover:bg-orange-700' : 'text-slate-600 hover:text-orange-600 hover:bg-orange-50/20'
                }`}
              >
                <span>{isExpanded ? 'Fermer' : 'Détails'}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            {/* Apply Action Button */}
            <div className="flex-1 max-w-[150px]">
              {isApplied ? (
                <div className="w-full flex items-center justify-center gap-1 py-2 px-3 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-full text-center font-extrabold text-[11px] uppercase tracking-wider shadow-sm">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>Postulé</span>
                </div>
              ) : (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onApply();
                  }}
                  disabled={isApplying || (loggedIn && userRole !== 'candidate')}
                  className="w-full h-10 rounded-full bg-slate-900 hover:bg-orange-600 text-white font-extrabold text-[11px] uppercase tracking-widest transition-all shadow-md hover:scale-[1.02]"
                >
                  {isApplying ? '...' : 'Postuler'}
                </Button>
              )}
            </div>

          </div>

        </div>

        {/* Floating next navigation arrow button on the right, specifically for visual carousel matching user description */}
        {showNextArrow && onNext && (
          <div className="relative flex items-center justify-center pl-2 shrink-0 self-center">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="w-10 h-10 rounded-full bg-slate-900 text-white shadow-xl flex items-center justify-center border border-slate-800 hover:bg-orange-600 transition-colors cursor-pointer"
              title="Suivant"
            >
              <ArrowRight className="h-5 w-5" />
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
