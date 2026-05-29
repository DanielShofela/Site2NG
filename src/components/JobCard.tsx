import React, { useState, useEffect, useMemo } from 'react';
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
  ArrowUpRight,
  ChevronDown, 
  Building2, 
  DollarSign, 
  FileText,
  AlertCircle,
  Eye,
  Mail,
  Copy,
  Check,
  Award
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Job } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { db } from '@/lib/firebase';
import { doc, getDoc, getDocs, updateDoc, increment, collection, query, where, onSnapshot } from 'firebase/firestore';

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
  const [matchingCompanyId, setMatchingCompanyId] = useState<string | null>(null);
  
  // External Candidacy Popup state
  const [showExternalPopup, setShowExternalPopup] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Filter company labels to never display "administrateur" or "published by admin"
  const cleanCompanyName = useMemo(() => {
    const raw = companyName || job.companyName || "Société Partenaire";
    const lower = raw.toLowerCase();
    if (lower.includes('admin') || lower.includes('moderateur') || lower.includes('2ng group') || lower === 'administrateur') {
      return job.companyName || "Société Partenaire";
    }
    return raw;
  }, [companyName, job.companyName]);

  // Load saved state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`saved_job_${job.id}`);
    setIsSaved(!!saved);
  }, [job.id]);

  // Dynamic search for registered recruiter portfolio pages using static Firestore imports
  useEffect(() => {
    const checkCompanyAccount = async () => {
      const rId = job.recruiterId || (job as any).companyId;
      
      // 1. Check if the specific ID exists and is a recruiter
      if (rId && rId !== 'admin_popular' && rId !== 'admin') {
        try {
          const uDoc = await getDoc(doc(db, 'users', rId));
          if (uDoc.exists() && uDoc.data().role === 'recruiter') {
            setMatchingCompanyId(rId);
            return;
          }
        } catch (e) {
          console.error("Error matching company by ID:", e);
        }
      }

      // 2. Check by name search match if matching ID was not found or is generic
      if (cleanCompanyName && cleanCompanyName !== 'Administrateur' && cleanCompanyName !== 'Admin') {
        try {
          const q = query(
            collection(db, 'users'),
            where('role', '==', 'recruiter'),
            where('companyName', '==', cleanCompanyName)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            setMatchingCompanyId(snap.docs[0].id);
            return;
          }
        } catch (e) {
          console.error("Error matching company by name:", e);
        }
      }

      setMatchingCompanyId(null);
    };
    checkCompanyAccount();
  }, [job.recruiterId, (job as any).companyId, cleanCompanyName]);

  // Stable deterministic hash for realistic and stable seed metrics
  const seedHash = useMemo(() => {
    let hash = 0;
    const str = job.id || "2ng_job";
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  }, [job.id]);

  const baseLikes = useMemo(() => (seedHash % 24) + 6, [seedHash]);
  const baseShares = useMemo(() => Math.floor(baseLikes / 3) + (seedHash % 7), [baseLikes, seedHash]);
  const baseApps = useMemo(() => Math.floor(baseLikes / 2) + (seedHash % 5) + (isApplied ? 1 : 0), [baseLikes, seedHash, isApplied]);
  const baseViews = useMemo(() => (baseLikes * 9) + (seedHash % 89) + 42, [baseLikes, seedHash]);

  const [likesCount, setLikesCount] = useState((job as any).likes !== undefined ? (job as any).likes : baseLikes + (isSaved ? 1 : 0));
  const [sharesCount, setSharesCount] = useState((job as any).shares !== undefined ? (job as any).shares : baseShares);
  const [viewsCount, setViewsCount] = useState(job.views !== undefined ? job.views : baseViews);
  const [appsCount, setAppsCount] = useState(baseApps);

  // Realtime engagement metrics listener syncing directly with the Firestore database!
  useEffect(() => {
    if (!job.id) return;

    // 1. Listen to the offer document for real-time views, shares, and likes updates
    const jobRef = doc(db, 'offers', job.id);
    const unsubJob = onSnapshot(jobRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.views !== undefined) setViewsCount(data.views);
        if (data.shares !== undefined) setSharesCount(data.shares);
        if (data.likes !== undefined) setLikesCount(data.likes);
      }
    }, (err) => {
      console.log("Silent error from real-time job metrics listener", err);
    });

    // 2. Listen to applications count for the job in the real firestore collection
    const appsQuery = query(collection(db, 'applications'), where('jobId', '==', job.id));
    const unsubApps = onSnapshot(appsQuery, (snap) => {
      setAppsCount(snap.size);
    }, (err) => {
      console.log("Silent error from real-time apps count listener", err);
    });

    return () => {
      unsubJob();
      unsubApps();
    };
  }, [job.id]);

  const toggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const jobRef = doc(db, 'offers', job.id);
    if (isSaved) {
      localStorage.removeItem(`saved_job_${job.id}`);
      setIsSaved(false);
      try {
        await updateDoc(jobRef, {
          likes: increment(-1)
        });
      } catch (err) {
        console.log("Error decrementing likes in DB, local fallback updated", err);
      }
      setLikesCount(prev => Math.max(0, prev - 1));
    } else {
      localStorage.setItem(`saved_job_${job.id}`, 'true');
      setIsSaved(true);
      try {
        await updateDoc(jobRef, {
          likes: increment(1)
        });
      } catch (err) {
        console.log("Error incrementing likes in DB, local fallback updated", err);
      }
      setLikesCount(prev => prev + 1);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/jobs?id=${job.id}`;
    const shareTitle = `${job.title} chez ${cleanCompanyName}`;
    const shareText = `Regardez cette opportunité d'emploi chez 2NG Groupe Entreprises: ${job.title}`;

    try {
      const jobRef = doc(db, 'offers', job.id);
      await updateDoc(jobRef, {
        shares: increment(1)
      });
    } catch (err) {
      console.log("Error incrementing shares in DB, local fallback updated", err);
    }
    setSharesCount(prev => prev + 1);

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

  const offerType = job.offer_type || 'internal';
  const targetEmail = job.external_apply_email || job.companyEmail || "recrutement@2ng-partner.com";

  const copyEmailToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(targetEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleToggleExpand = async () => {
    if (!isExpanded) {
      try {
        const jobRef = doc(db, 'offers', job.id);
        await updateDoc(jobRef, {
          views: increment(1)
        });
      } catch (err) {
        console.log("Error incrementing views in DB, local state updated", err);
      }
      setViewsCount(prev => prev + 1);
    }
    setIsExpanded(!isExpanded);
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
                          <img src={job.companyLogo} alt={cleanCompanyName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          (cleanCompanyName || "EP").substring(0, 2)
                        )}
                      </div>
                      <div className="flex flex-col text-left">
                        {matchingCompanyId ? (
                          <Link 
                            to={`/company/${matchingCompanyId}`} 
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-800 hover:text-orange-600 font-extrabold text-sm tracking-tight leading-none truncate max-w-[170px] sm:max-w-[210px] flex items-center gap-0.5 transition-all outline-none"
                          >
                            {cleanCompanyName} <ArrowUpRight className="h-3.5 w-3.5 mt-0.5 stroke-[2.5] inline-block shrink-0" />
                          </Link>
                        ) : (
                          <span className="text-slate-800 font-extrabold text-sm tracking-tight leading-none truncate max-w-[170px] sm:max-w-[210px]">
                            {cleanCompanyName}
                          </span>
                        )}
                        
                        {/* Interactive Verification Badges & Badging */}
                        <div className="flex flex-wrap gap-1 mt-1 items-center">
                          {offerType === 'external' ? (
                            <>
                              <span className="bg-teal-50 text-teal-700 font-black text-[8px] px-1.5 py-0.5 rounded uppercase leading-none border border-teal-100">
                                Populaire
                              </span>
                              <span className="bg-amber-55 bg-amber-50 text-amber-700 font-black text-[8px] px-1.5 py-0.5 rounded uppercase leading-none border border-amber-100">
                                Relais
                              </span>
                            </>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-700 font-black text-[8px] px-1.5 py-0.5 rounded uppercase leading-none border border-emerald-100 flex items-center gap-0.5">
                              <Award className="h-2.5 w-2.5 text-emerald-600" /> Recrutement Direct
                            </span>
                          )}
                        </div>
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
 
            {/* Always Visible Job Title at top */}
            <div className={`transition-all duration-300 ${isExpanded ? 'bg-orange-50/50 p-4 -mx-6 -mt-6 border-b border-orange-100/40 rounded-t-[32px] mb-4 text-orange-950' : 'mt-4'}`}>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {job.title}
              </h3>
              {isExpanded && (
                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-1.5 text-xs text-orange-700/80 font-bold">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{cleanCompanyName}</span>
                    {offerType === 'external' ? (
                      <span className="text-[9px] ml-1 bg-teal-50 text-teal-700 font-extrabold py-0.5 px-2 rounded uppercase border border-teal-100">
                        Candidature Externe (Offre Populaire)
                      </span>
                    ) : (
                      <span className="text-[9px] ml-1 bg-emerald-50 text-emerald-700 font-extrabold py-0.5 px-2 rounded uppercase border border-emerald-100">
                        Recrutement Direct (Interne)
                      </span>
                    )}
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
                  <p className="text-xs font-semibold text-slate-600 leading-relaxed text-justify whitespace-pre-line font-sans">
                    {job.description}
                  </p>
                </div>
 
                {/* Requirements */}
                {job.requirements && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <h4 className="text-[11px] font-black uppercase text-orange-600 tracking-wider">Profil & Exigences</h4>
                    <p className="text-xs font-semibold text-slate-600 leading-relaxed whitespace-pre-line font-sans">
                      {job.requirements}
                    </p>
                  </div>
                )}
 
                {/* Mini details grid */}
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <div className="bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-150/50">
                    <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Expérience Requise</span>
                    <span className="text-[11px] font-extrabold text-slate-800 leading-none">
                      {job.experienceYears ? job.experienceYears : (job.experienceLevel || "3 ans")}
                    </span>
                  </div>
 
                  <div className="bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-150/50">
                    <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Niveau d'études</span>
                    <span className="text-[11px] font-extrabold text-slate-800 leading-none truncate block" title={job.studyLevels ? job.studyLevels.join(', ') : (job.educationLevel || "Bac +3 (Licence)")}>
                      {job.studyLevels ? job.studyLevels.join(', ') : (job.educationLevel || "Bac +3")}
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
 
                {/* Required Documents */}
                {((job.requiredDocs && job.requiredDocs.length > 0) || (job.conditionsDocuments && job.conditionsDocuments.length > 0)) && (
                  <div className="bg-orange-50/30 border border-orange-100 p-3 rounded-2xl space-y-1.5">
                    <span className="text-[10px] text-orange-900 font-black uppercase tracking-wider block">Documents Exigés :</span>
                    <div className="flex flex-wrap gap-1">
                      {(job.requiredDocs || job.conditionsDocuments).map((docItem, idx) => (
                        <span key={idx} className="bg-white border border-orange-200/50 text-slate-700 font-bold text-[9px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                          <FileText className="h-2.5 w-2.5 text-orange-500" />
                          {docItem}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
 
                {/* Deposition Channel instructions */}
                <div className="bg-slate-900 text-white p-3.5 rounded-2xl space-y-1 text-center">
                  <p className="text-[10px] font-black uppercase tracking-wide text-orange-400">Modalité de dépôt</p>
                  <p className="text-xs font-semibold">
                    Dépôt via :{" "}
                    <span className={`border text-white font-black text-[9px] px-1.5 py-0.5 rounded-md uppercase ${
                      offerType === 'external' ? 'bg-teal-600/30 border-teal-500/50' : 'bg-emerald-650/30 border-emerald-500/50'
                    }`}>
                      {offerType === 'external' ? 'E-mail Direct / Externe' : 'Plateforme Directe 2NG'}
                    </span>
                  </p>
                  {offerType === 'external' && targetEmail && (
                    <p className="text-[11px] font-bold text-teal-350 pt-1.5 select-all hover:text-teal-200 shrink-0 select-all leading-normal flex items-center justify-center gap-1">
                      <Mail className="h-3 w-3 inline text-teal-400" /> Email : {targetEmail}
                    </p>
                  )}
                </div>
 
              </div>
            </motion.div>
 
          </div>
 
          {/* Bottom Actions Row - Integrated metrics side by side with buttons */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            {/* Share, Save & Details */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant="outline"
                onClick={handleShare}
                className="h-10 px-3.5 rounded-full border-slate-150 text-slate-500 hover:text-orange-600 hover:bg-orange-50/30 hover:border-orange-200 transition-all shadow-sm flex items-center gap-1.5"
                title="Partager cette annonce"
              >
                <Share2 className="h-4 w-4 shrink-0" />
                <span className="text-[11px] font-black font-mono leading-none">{sharesCount}</span>
              </Button>

              <Button
                variant="outline"
                onClick={toggleSave}
                className={`h-10 px-3.5 rounded-full border-slate-150 transition-all shadow-sm flex items-center gap-1.5 ${
                  isSaved 
                    ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100' 
                    : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50/30 hover:border-rose-200'
                }`}
                title={isSaved ? "Retirer des favoris" : "Ajouter aux favoris"}
              >
                <Heart className={`h-4 w-4 shrink-0 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span className="text-[11px] font-black font-mono leading-none">{likesCount}</span>
              </Button>

              {/* Details Expand button */}
              <Button
                variant="ghost"
                onClick={handleToggleExpand}
                className={`h-10 px-3 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all outline-none ${
                  isExpanded ? 'bg-orange-600 text-white hover:bg-orange-700' : 'text-slate-600 hover:text-orange-600 hover:bg-orange-50/20'
                }`}
              >
                <Eye className="h-3.5 w-3.5 shrink-0" />
                <span className="text-[10px] font-black font-mono leading-none">{viewsCount}</span>
                <span className="h-3 w-px bg-slate-300/60" />
                <span>{isExpanded ? 'Fermer' : 'Détails'}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            {/* Apply Action Button & Applications Count beneath */}
            <div className="flex flex-col items-center sm:items-end justify-center shrink-0 min-w-[125px] sm:ml-auto">
              {offerType === 'external' ? (
                /* External / Popular Job - Trigger Instructions Modal and mailto drawer */
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowExternalPopup(true);
                  }}
                  className="w-full max-w-[155px] h-10 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-[10px] uppercase tracking-wider transition-all shadow-md hover:scale-[1.02] flex items-center justify-center gap-1"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span>Postuler</span>
                </Button>
              ) : isApplied ? (
                /* Internal Job - already applied */
                <div className="w-full max-w-[155px] flex items-center justify-center gap-1 py-2 px-3 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-full text-center font-extrabold text-[11px] uppercase tracking-wider shadow-sm">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>Postulé</span>
                </div>
              ) : (
                /* Internal Job - standard apply */
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onApply();
                    setAppsCount(prev => prev + 1);
                  }}
                  disabled={isApplying || (loggedIn && userRole !== 'candidate')}
                  className="w-full max-w-[155px] h-10 rounded-full bg-slate-900 hover:bg-orange-600 text-white font-extrabold text-[11px] uppercase tracking-widest transition-all shadow-md hover:scale-[1.02]"
                >
                  {isApplying ? '...' : 'Postuler'}
                </Button>
              )}
              
              <span className="text-[9px] font-black text-slate-400 mt-1.5 uppercase tracking-wide mr-1 text-right">
                {appsCount} candidature{appsCount !== 1 ? 's' : ''} envoyée{appsCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
 
        </div>
 
        {/* Floating next navigation arrow button on the right */}
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

      {/* Populaire / Relay External Instructions Modal */}
      <Dialog open={showExternalPopup} onOpenChange={setShowExternalPopup}>
        <DialogContent className="max-w-md w-full rounded-[30px] p-6 border-none shadow-2xl bg-white text-left">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-black text-slate-950 flex items-center gap-2">
              <Mail className="h-5.5 w-5.5 text-teal-600" />
              Candidature Externe (Relais)
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-slate-400 leading-normal">
              Cette offre d'emploi populaire est publiée en mode relais pour le compte d'une entreprise partenaire de 2NG.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 text-slate-700">
            <div className="bg-teal-50/55 p-4 rounded-2xl border border-teal-100/60 text-slate-800 space-y-1">
              <span className="text-[10px] font-black uppercase text-teal-700 block tracking-wider">Email de l'annonceur :</span>
              <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-teal-150 gap-2">
                <span className="text-xs font-black text-teal-950 truncate select-all">{targetEmail}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyEmailToClipboard}
                  className="h-8 w-8 p-0 hover:bg-teal-50 text-teal-600 rounded-lg"
                  title="Copier l'adresse email"
                >
                  {copiedEmail ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5">
              <span className="text-[10px] font-black uppercase text-slate-500 block">Instructions impératives</span>
              <ul className="space-y-1.5 text-xs font-semibold text-slate-600 leading-normal">
                <li className="flex items-start gap-1.5">• Précisez en objet de l'email : <strong className="text-slate-900 font-extrabold">"Candidature - {job.title}"</strong></li>
                <li className="flex items-start gap-1.5">• Joignez impérativement votre <strong className="text-slate-900 font-extrabold">Curriculum Vitae (CV)</strong> à jour.</li>
                <li className="flex items-start gap-1.5">• Adressez une lettre de motivation ou un court paragraphe d'introduction pour valoriser votre profil.</li>
              </ul>
            </div>

            <p className="text-[10px] text-slate-400 font-bold leading-normal italic text-justify">
              * Note de sécurité : L'administration de 2NG Groupe ne gère pas directement les dossiers pour ces offres relais externes. N'envoyez jamais de données confidentielles ou requêtes de paiement.
            </p>
          </div>

          <DialogFooter className="flex gap-2 border-t border-slate-50 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowExternalPopup(false)}
              className="rounded-xl font-bold text-xs uppercase h-10 border-slate-150"
            >
              Fermer
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `mailto:${targetEmail}?subject=${encodeURIComponent(`Candidature : ${job.title}`)}`;
              }}
              className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs uppercase h-10 px-5 flex items-center gap-1.5"
            >
              <Mail className="h-4 w-4" /> Envoyer un E-mail
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
