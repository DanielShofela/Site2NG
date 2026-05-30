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
  Award,
  GraduationCap,
  Coins,
  Pencil,
  Trash2,
  Calendar,
  User,
  Send,
  Sparkles
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Job } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, getDocs, updateDoc, increment, collection, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

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
  isApplied: initialIsApplied,
  onApply,
  isApplying = false,
  onNext,
  showNextArrow = false,
  userRole,
  loggedIn
}: JobCardProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [matchingCompanyId, setMatchingCompanyId] = useState<string | null>(null);
  
  // Realtime user states
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [localJob, setLocalJob] = useState<Job>(job);
  const [isApplied, setIsApplied] = useState(initialIsApplied);

  // Edit job modal states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editType, setEditType] = useState("CDI");
  const [editSalary, setEditSalary] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRequirements, setEditRequirements] = useState("");
  const [editStudyLevels, setEditStudyLevels] = useState("");
  const [editExperienceYears, setEditExperienceYears] = useState("");
  const [editRequiredDocs, setEditRequiredDocs] = useState("");
  const [editOfferType, setEditOfferType] = useState<'internal' | 'external'>('internal');
  const [editExternalEmail, setEditExternalEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // local toast notification
  const [showToast, setShowToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [localJob.companyLogo]);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setShowToast({ show: true, message, type });
    setTimeout(() => {
      setShowToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // Sync with original job parameter
  useEffect(() => {
    setLocalJob(job);
  }, [job]);

  useEffect(() => {
    setIsApplied(initialIsApplied);
  }, [initialIsApplied]);

  // Auth monitoring
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usr) => {
      setCurrentUser(usr);
    });
    return unsub;
  }, []);

  const isAnonymous = useMemo(() => {
    return !!localJob.is_anonymous || 
      localJob.companyName === "Recruteur Confidentiel" || 
      localJob.companyName === "Recruteur confidentiel" ||
      localJob.companyLogo === "https://lh3.googleusercontent.com/d/1O58k8ZpXqgXW-9_H-Hk3V-e4I5V_H_R3=w200-h200";
  }, [localJob.is_anonymous, localJob.companyName, localJob.companyLogo]);

  const showDefaultIcon = useMemo(() => {
    if (imgError) return true;
    if (isAnonymous) return true;
    if (!localJob.companyLogo) return true;
    const trimmedLogo = localJob.companyLogo.trim();
    if (trimmedLogo === "" || trimmedLogo === "https://lh3.googleusercontent.com/d/1O58k8ZpXqgXW-9_H-Hk3V-e4I5V_H_R3=w200-h200") {
      return true;
    }
    return false;
  }, [imgError, isAnonymous, localJob.companyLogo]);

  const isExternalApply = useMemo(() => {
    return localJob.offer_type === 'external' || isAnonymous;
  }, [localJob.offer_type, isAnonymous]);

  // Filter company labels to never display "administrateur" or "published by admin"
  const cleanCompanyName = useMemo(() => {
    if (isAnonymous) {
      return "Recruteur Confidentiel";
    }
    const raw = companyName || localJob.companyName || "Société Partenaire";
    const lower = raw.toLowerCase();
    if (lower.includes('admin') || lower.includes('moderateur') || lower.includes('2ng group') || lower === 'administrateur') {
      return localJob.companyName || "Société Partenaire";
    }
    return raw;
  }, [companyName, localJob.companyName, isAnonymous]);

  const applyEmail = useMemo(() => {
    return localJob.external_apply_email || `recrutement@${cleanCompanyName.toLowerCase().replace(/[^a-zA-Z0-9]/g, "") || "entreprise"}.com`;
  }, [localJob.external_apply_email, cleanCompanyName]);

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(applyEmail);
      setCopiedEmail(true);
      triggerToast("Adresse email copiée avec succès.", "success");
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch (err) {
      console.error(err);
      triggerToast("Erreur lors de la copie de l'adresse email.", "error");
    }
  };

  // Load saved state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`saved_job_${localJob.id}`);
    setIsSaved(!!saved);
  }, [localJob.id]);

  // Dynamic search for registered recruiter portfolio pages
  useEffect(() => {
    const checkCompanyAccount = async () => {
      if (isAnonymous) {
        setMatchingCompanyId(null);
        return;
      }
      const rId = localJob.recruiterId || (localJob as any).companyId;
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
  }, [localJob.recruiterId, (localJob as any).companyId, cleanCompanyName, isAnonymous]);

  // Stable deterministic metrics seed hashes
  const seedHash = useMemo(() => {
    let hash = 0;
    const str = localJob.id || "2ng_job";
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  }, [localJob.id]);

  const baseLikes = useMemo(() => (seedHash % 24) + 6, [seedHash]);
  const baseShares = useMemo(() => Math.floor(baseLikes / 3) + (seedHash % 7), [baseLikes, seedHash]);
  const baseApps = useMemo(() => Math.floor(baseLikes / 2) + (seedHash % 5) + (isApplied ? 1 : 0), [baseLikes, seedHash, isApplied]);
  const baseViews = useMemo(() => (baseLikes * 9) + (seedHash % 89) + 42, [baseLikes, seedHash]);

  const [likesCount, setLikesCount] = useState((localJob as any).likes !== undefined ? (localJob as any).likes : baseLikes + (isSaved ? 1 : 0));
  const [sharesCount, setSharesCount] = useState((localJob as any).shares !== undefined ? (localJob as any).shares : baseShares);
  const [viewsCount, setViewsCount] = useState(localJob.views !== undefined ? localJob.views : baseViews);
  const [appsCount, setAppsCount] = useState(baseApps);

  // Sync realtime engagement metrics directly from Firestore Database 
  useEffect(() => {
    if (!localJob.id) return;

    const jobRef = doc(db, 'offers', localJob.id);
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

    const appsQuery = query(collection(db, 'applications'), where('jobId', '==', localJob.id));
    const unsubApps = onSnapshot(appsQuery, (snap) => {
      setAppsCount(snap.size);
    }, (err) => {
      console.log("Silent error from real-time apps count listener", err);
    });

    return () => {
      unsubJob();
      unsubApps();
    };
  }, [localJob.id]);

  // Action Permissions check for modifying/editing job
  const canModify = useMemo(() => {
    if (!currentUser) return false;
    
    // Check if user is an admin
    const isAdmin = userRole === 'admin' || currentUser.email === '2ng.groupeentreprise@gmail.com';
    
    // Requirement checklist:
    // 1. "If it is an offer that an administrator has registered, all administrators need to be able to modify the offer information."
    const isAdminJob = localJob.createdBy === 'admin' || localJob.recruiterId === 'admin_popular' || localJob.recruiterId === 'admin';
    if (isAdmin && isAdminJob) {
      return true;
    }
    
    // 2. "If it is an offer that a recruiter added, only that person should be able to modify it."
    const isCreatedBySelf = localJob.recruiterId === currentUser.uid;
    if (isCreatedBySelf) {
      return true;
    }
    
    return false;
  }, [currentUser, userRole, localJob.recruiterId, localJob.createdBy]);

  // Handle open editor dialog with current form values
  const handleOpenEdit = () => {
    setEditTitle(localJob.title || "");
    setEditCompanyName(localJob.companyName || "");
    setEditLocation(localJob.location || "");
    setEditType(localJob.contractType || localJob.type || "CDI");
    setEditSalary(localJob.salary || "À déterminer");
    setEditDescription(localJob.description || "");
    setEditRequirements(localJob.requirements || "");
    setEditStudyLevels(localJob.studyLevels ? localJob.studyLevels.join(', ') : "Bac+3");
    setEditExperienceYears(localJob.experienceYears ? String(localJob.experienceYears) : "2 à 5 ans");
    setEditRequiredDocs(localJob.requiredDocs ? localJob.requiredDocs.join(', ') : "CV, Lettre de motivation");
    setEditOfferType(localJob.offer_type || "internal");
    setEditExternalEmail(localJob.external_apply_email || "");
    setIsEditOpen(true);
  };

  // Handle direct save modification in Firestore
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editCompanyName.trim() || !editDescription.trim()) {
      triggerToast("Veuillez remplir les données nécessaires (*)", "error");
      return;
    }

    setIsSaving(true);
    try {
      const jobRef = doc(db, 'offers', localJob.id);
      
      const studyArr = editStudyLevels.split(',').map(s => s.trim()).filter(s => s.length > 0);
      const docsArr = editRequiredDocs.split(',').map(d => d.trim()).filter(d => d.length > 0);

      const updatePayload: Partial<Job> = {
        title: editTitle,
        companyName: editCompanyName,
        location: editLocation,
        type: editType,
        contractType: editType,
        salary: editSalary,
        description: editDescription,
        requirements: editRequirements,
        studyLevels: studyArr,
        experienceYears: editExperienceYears,
        requiredDocs: docsArr,
        offer_type: editOfferType,
        external_apply_email: editOfferType === 'external' ? editExternalEmail : ""
      };

      await updateDoc(jobRef, updatePayload);
      
      // Update local card state instantly programmatically for immediate reactive change
      setLocalJob(prev => ({
        ...prev,
        ...updatePayload
      }));

      triggerToast("L'offre d'emploi a été modifiée avec succès !", "success");
      setIsEditOpen(false);
    } catch (err) {
      console.error("Error editing job offer:", err);
      triggerToast("Erreur lors de la modification de l'offre.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Immediate automatically apply candidate logic
  const handleImmediateApply = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const isExternalApply = localJob.offer_type === 'external' || isAnonymous;
    if (isExternalApply) {
      setIsApplyModalOpen(true);
      return;
    }

    if (!loggedIn) {
      navigate('/login');
      return;
    }
    if (userRole !== 'candidate') {
      triggerToast("Seuls les comptes Candidats peuvent postuler !", "error");
      return;
    }

    try {
      onApply(); // Execute standard candidate application script (addDoc collections inside Home/Jobs)
      setIsApplied(true);
      triggerToast("Félicitations! Votre candidature a été transmise immédiatement.", "success");
    } catch (error) {
      console.error(error);
      triggerToast("Erreur lors de la soumission de la candidature.", "error");
    }
  };

  const toggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const jobRef = doc(db, 'offers', localJob.id);
    if (isSaved) {
      localStorage.removeItem(`saved_job_${localJob.id}`);
      setIsSaved(false);
      try {
        await updateDoc(jobRef, { likes: increment(-1) });
      } catch (err) {
        console.log("Local save toggled", err);
      }
      setLikesCount(prev => Math.max(0, prev - 1));
    } else {
      localStorage.setItem(`saved_job_${localJob.id}`, 'true');
      setIsSaved(true);
      try {
        await updateDoc(jobRef, { likes: increment(1) });
      } catch (err) {
        console.log("Local save toggled", err);
      }
      setLikesCount(prev => prev + 1);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/jobs?id=${localJob.id}`;
    const shareTitle = `${localJob.title} chez ${cleanCompanyName}`;
    const shareText = `Regardez cette opportunité d'emploi chez 2NG Groupe Entreprises: ${localJob.title}`;

    try {
      const jobRef = doc(db, 'offers', localJob.id);
      await updateDoc(jobRef, { shares: increment(1) });
    } catch (err) {
      console.log("Shares count saved locally", err);
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
        console.log("Web share target supported");
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        triggerToast("Lien de l'offre copié dans le presse-papiers !", "success");
        setTimeout(() => setCopied(false), 2500);
      } catch (err) {
        console.error("Clipboard copy failed", err);
      }
    }
  };

  const getJobTypeLabel = (type: string) => {
    if (type === 'rapid') return 'Express';
    if (type === 'popular') return 'Élite 2NG';
    if (type === 'unique') return 'Direct';
    return type || 'CDI';
  };

  const getJobTypeColor = (type: string) => {
    if (type === 'rapid') return 'bg-amber-500 text-white border-none shadow-sm';
    if (type === 'popular') return 'bg-orange-655 bg-orange-600 text-white border-none';
    if (type === 'unique') return 'bg-emerald-600 text-white border-none';
    return 'bg-slate-900 text-white border-none';
  };

  const formattedDate = () => {
    try {
      if (!localJob.createdAt) return "Récemment";
      const date = localJob.createdAt.seconds 
        ? new Date(localJob.createdAt.seconds * 1000) 
        : new Date(localJob.createdAt);
      if (isNaN(date.getTime())) return "Récemment";
      return formatDistanceToNow(date, { addSuffix: true, locale: fr });
    } catch (e) {
      return "Récemment";
    }
  };

  const deadlineDate = () => {
    const expiresAt = localJob.expiresAt;
    let expDate: Date | null = null;
    if (expiresAt) {
      try {
        expDate = expiresAt.seconds ? new Date(expiresAt.seconds * 1000) : new Date(expiresAt);
      } catch (e) {}
    }
    if (!expDate || isNaN(expDate.getTime())) {
      if (localJob.createdAt) {
        try {
          const cDate = localJob.createdAt.seconds ? new Date(localJob.createdAt.seconds * 1000) : new Date(localJob.createdAt);
          expDate = new Date(cDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        } catch (e) {}
      }
    }
    if (expDate && !isNaN(expDate.getTime())) {
      return expDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return "Sous 30 jours";
  };

  // Safe split helper for description layout splitting
  const parsedDesc = useMemo(() => {
    const desc = localJob.description || "";
    const lines = desc.split('\n');
    const bulletLines: string[] = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
        bulletLines.push(trimmed.replace(/^[-•*\s]+/, '').trim());
      }
    });

    const missionsToReturn = bulletLines.length > 0 
      ? bulletLines 
      : lines.map(l => l.trim()).filter(l => l.length > 0).length > 1
        ? lines.map(l => l.trim()).filter(l => l.length > 0)
        : [
            "Prendre en charge les tâches quotidiennes liées au poste",
            "Collaborer efficacement avec l'équipe pour atteindre les objectifs de l'entreprise",
            "Assurer un suivi rigoureux des livrables et rapports"
          ];

    return {
      descriptionText: desc || "Aucune description fournie.",
      missions: missionsToReturn
    };
  }, [localJob.description]);

  // Safe split helper for requirements list splitting
  const parsedReqs = useMemo(() => {
    const reqs = localJob.requirements || "";
    const lines = reqs.split('\n');
    const bulletLines: string[] = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
        bulletLines.push(trimmed.replace(/^[-•*\s]+/, '').trim());
      }
    });

    const skillsToReturn = bulletLines.length > 0
      ? bulletLines
      : lines.map(l => l.trim()).filter(l => l.length > 0).length > 1
        ? lines.map(l => l.trim()).filter(l => l.length > 0)
        : [
            "Autonomie et grand sens des responsabilités",
            "Esprit d'équipe et d'entraide prononcé",
            "Capacité d'analyse et résolution de problèmes complexes"
          ];

    return {
      mainRequirements: reqs || "Profil motivé et rigoureux recherché.",
      skills: skillsToReturn
    };
  }, [localJob.requirements]);

  const handleToggleExpand = async () => {
    if (!isExpanded) {
      try {
        const jobRef = doc(db, 'offers', localJob.id);
        await updateDoc(jobRef, { views: increment(1) });
      } catch (err) {
        console.log("View count incremented local copy");
      }
      setViewsCount(prev => prev + 1);
    }
    setIsExpanded(!isExpanded);
  };

  const studyLevelsToShow = localJob.studyLevels || ["Bac+3 (Licence)"];
  const docsToShow = localJob.requiredDocs || ["Curriculum Vitae (CV)", "Lettre de motivation (LM)"];

  return (
    <div id={`card-${localJob.id}`} className="relative w-full max-w-lg mx-auto px-1 sm:px-3 mb-6 select-none leading-normal">
      
      {/* Toast Alert Canvas Banner inside Card */}
      <AnimatePresence>
        {showToast.show && (
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 12, scale: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.95 }}
            className={`absolute top-2 inset-x-4 z-50 px-4 py-3 rounded-full text-center text-xs font-black flex items-center justify-center gap-2 shadow-xl ${
              showToast.type === 'success' ? 'bg-slate-900 text-[#e25c1d] border border-orange-500/20' : 'bg-rose-950 text-rose-350 border border-rose-500/20'
            }`}
          >
            {showToast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-orange-500" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            )}
            <span>{showToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col items-stretch relative">
        
        {/* PARTIE 1: LA FEUILLE BLANCHE (FACE PRINCIPALE) */}
        <div className="bg-white border border-slate-150/70 rounded-[28px] shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col justify-between p-6">
          
          <div className="flex flex-col text-left">
            {/* Cabal / Meta row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {/* Logo company */}
                <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 shadow-sm leading-none flex items-center justify-center bg-white border border-slate-150/70">
                  {showDefaultIcon ? (
                    <div className="w-full h-full bg-orange-50/85 text-[#e25c1d] flex items-center justify-center">
                      <Building2 className="h-6 w-6 stroke-[2]" />
                    </div>
                  ) : (
                    <img 
                      src={localJob.companyLogo} 
                      alt={cleanCompanyName} 
                      className="h-full w-full object-cover" 
                      referrerPolicy="no-referrer" 
                      onError={() => setImgError(true)}
                    />
                  )}
                </div>

                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1">
                    {matchingCompanyId ? (
                      <Link 
                        to={`/company/${matchingCompanyId}`} 
                        onClick={(e) => e.stopPropagation()}
                        className="text-slate-800 hover:text-orange-600 font-black text-sm tracking-tight leading-none truncate max-w-[150px] inline-flex items-center gap-0.5 transition-all outline-none"
                      >
                        {cleanCompanyName} <ArrowUpRight className="h-3.5 w-3.5 mt-0.5" />
                      </Link>
                    ) : (
                      <span className="text-slate-800 font-extrabold text-sm tracking-tight leading-none truncate max-w-[150px]">
                        {cleanCompanyName}
                      </span>
                    )}

                    {/* Verification blue check icon */}
                    <span className="text-sky-500 shrink-0" title="Recruteur Certifié 2NG">
                      <CheckCircle2 className="h-3.5 w-3.5 fill-sky-500 text-white" />
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-400 font-bold block mt-1 uppercase tracking-wider leading-none">
                    {localJob.field || "Secteur Général"}
                  </span>
                </div>
              </div>

              {/* Sub-Badges and Editor Modifier tools */}
              <div className="flex items-center gap-1">
                {canModify && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit();
                    }}
                    className="h-8 rounded-full border-orange-200 text-orange-600 hover:bg-orange-50/50 hover:text-orange-700 text-[10px] font-black uppercase flex items-center gap-1.5 shrink-0 px-2.5 transition-colors"
                  >
                    <Pencil className="h-3 w-3 stroke-[2.5]" />
                    <span>Modifier</span>
                  </Button>
                )}

                <Badge variant="outline" className="border-slate-200 text-orange-600 bg-orange-50/50 font-black text-[9px] px-2 py-0.5 uppercase rounded-lg">
                  Offre {localJob.offer_type === 'external' ? 'relais' : 'interne'}
                </Badge>
              </div>
            </div>

            {/* Post Job Name - Bold heading */}
            <div className="mt-4">
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {localJob.title}
              </h3>
            </div>

            {/* Geographical details & publish date metadata */}
            <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[11px] font-bold text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                <span>{localJob.location || "Abidjan, Côte d'Ivoire"}</span>
              </span>
              <span className="text-slate-200">|</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                <span>Publié {formattedDate()}</span>
              </span>
            </div>

            {/* Standard pastel tag badges */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-extrabold text-[10px] px-2.5 py-1 uppercase rounded-lg leading-none shrink-0 shadow-none">
                {localJob.contractType || localJob.type || 'CDI'}
              </Badge>
              <Badge className="bg-sky-50 text-sky-700 border border-sky-100 font-extrabold text-[10px] px-2.5 py-1 uppercase rounded-lg leading-none shrink-0 shadow-none">
                Temps plein
              </Badge>
              <Badge className="bg-purple-50 text-purple-700 border border-purple-100 font-extrabold text-[10px] px-2.5 py-1 uppercase rounded-lg leading-none shrink-0 shadow-none">
                Exp. {localJob.experienceYears ? String(localJob.experienceYears) : "2 à 5 ans"}
              </Badge>
            </div>

            {/* Short summary snippet text (Max 2 lines) */}
            {localJob.description && (
              <p className="text-slate-500 font-medium text-xs leading-relaxed line-clamp-2 mt-4 text-justify">
                {parsedDesc.descriptionText}
              </p>
            )}

            {/* Divider */}
            <div className="border-t border-slate-100 my-4" />

            {/* ZONE DES ACTIONS ALIGNÉES HORIZONTALEMENT */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 gap-1 mt-1 border-b border-slate-50 pb-1">
              
              {/* ACTION 1: POSTULER (📩) */}
              <button
                onClick={handleImmediateApply}
                disabled={isApplying || (!isExternalApply && loggedIn && userRole !== 'candidate')}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 hover:bg-slate-50/50 transition-all rounded-xl cursor-pointer"
                title="Postuler à cette offre"
              >
                <Send className={`h-4.5 w-4.5 shrink-0 stroke-[2.5] ${isApplied ? 'text-emerald-500' : 'text-sky-500'}`} />
                <span className={`text-[11px] sm:text-xs font-extrabold leading-none ${isApplied ? 'text-emerald-600' : 'text-slate-800'}`}>
                  {isApplied ? 'Postulé' : 'Postuler'}
                </span>
                <span className="text-[9px] font-mono font-medium text-slate-400">({appsCount})</span>
              </button>

              {/* ACTION 2: PARTAGER (🔗) */}
              <button
                onClick={handleShare}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 hover:bg-slate-50/50 transition-all rounded-xl cursor-pointer"
                title="Partager le lien de l'offre"
              >
                <Share2 className="h-4.5 w-4.5 shrink-0 text-sky-500 stroke-[2.5]" />
                <span className="text-[11px] sm:text-xs font-extrabold text-slate-800 leading-none">Partager</span>
                <span className="text-[9px] font-mono font-medium text-slate-400">({sharesCount})</span>
              </button>

              {/* ACTION 3: FAVORIS/LIKE (❤️) */}
              <button
                onClick={toggleSave}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 hover:bg-slate-50/50 transition-all rounded-xl cursor-pointer"
                title="Ajouter aux favoris"
              >
                <Heart className={`h-4.5 w-4.5 shrink-0 transition-all ${isSaved ? 'fill-rose-500 text-rose-500' : 'text-slate-400 stroke-[2.5]'}`} />
                <span className="text-[11px] sm:text-xs font-extrabold text-[#e25c1d] leading-none">_like</span>
                <span className="text-[9px] font-mono font-semibold text-slate-400">({likesCount})</span>
              </button>

            </div>

          </div>

        </div>

        {/* PARTIE 2: LA LANGUETTE DÉTAILS (ORANGE) */}
        <button
          onClick={handleToggleExpand}
          className="w-full bg-[#e25c1d] hover:bg-[#c94d15] text-white py-3 px-6 rounded-b-[24px] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center justify-center gap-0.5 outline-none relative z-10 -mt-1 outline-none cursor-pointer"
        >
          <span className="text-xs font-extrabold flex items-center gap-1 justify-center uppercase tracking-wider">
            {isExpanded ? 'Masquer ▲' : 'Détails ▼'}
          </span>
          <span className="text-[9px] sm:text-[10px] font-bold text-orange-100 flex items-center gap-1 justify-center opacity-90 font-mono">
            <Eye className="h-3 w-3" />
            {viewsCount} vues
          </span>
        </button>

        {/* PARTIE 3: FEUILLE DE CONTENU DÉTAILLÉ (DÉPLIANT ACCORDÉON BIEN DESSINÉ) */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-2"
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            >
              <div className="bg-white border border-slate-150/70 rounded-[24px] p-5 sm:p-6 shadow-md space-y-5 text-left text-slate-600">
                
                {/* SECTION 1: Description du poste */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs tracking-wider uppercase border-b border-slate-100 pb-1.5">
                    <div className="w-6 h-6 rounded-lg bg-orange-100/50 flex items-center justify-center text-[#e25c1d] shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <span>Section 1 : Description du poste</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line text-justify pl-1 pt-1 font-medium">
                    {parsedDesc.descriptionText}
                  </p>
                </div>

                {/* SECTION 2: Missions principales */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs tracking-wider uppercase border-b border-slate-100 pb-1.5">
                    <div className="w-6 h-6 rounded-lg bg-orange-100/50 flex items-center justify-center text-[#e25c1d] shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span>Section 2 : Missions principales</span>
                  </div>
                  <ul className="space-y-1.5 pl-2 pt-1">
                    {parsedDesc.missions.map((mission, idx) => (
                      <li key={idx} className="text-xs text-slate-600 flex items-start gap-2 font-medium leading-relaxed">
                        <span className="text-[#e25c1d] mt-1 shrink-0 font-extrabold">•</span>
                        <span>{mission}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* TWO-COLUMN MATRIX SYSTEM */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                  
                  {/* SECTION 3: Profil recherché */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs tracking-wider uppercase border-b border-slate-100 pb-1.5">
                      <div className="w-6 h-6 rounded-lg bg-orange-100/50 flex items-center justify-center text-[#e25c1d] shrink-0">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <span>Section 3 : Profil recherché</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-semibold pl-1">
                      {parsedReqs.mainRequirements}
                    </p>
                  </div>

                  {/* SECTION 5: Niveaux d'études */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs tracking-wider uppercase border-b border-slate-100 pb-1.5">
                      <div className="w-6 h-6 rounded-lg bg-orange-100/50 flex items-center justify-center text-[#e25c1d] shrink-0">
                        <GraduationCap className="w-3.5 h-3.5" />
                      </div>
                      <span>Section 5 : Niveau d'études</span>
                    </div>
                    <ul className="space-y-1 pl-2 pt-1.5">
                      {studyLevelsToShow.map((lvl, idx) => (
                        <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5 font-semibold">
                          <Check className="h-3 w-3 text-emerald-600 mt-1 shrink-0" />
                          <span>{lvl}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* SECTION 6: Expérience requise */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs tracking-wider uppercase border-b border-slate-100 pb-1.5">
                      <div className="w-6 h-6 rounded-lg bg-orange-100/50 flex items-center justify-center text-[#e25c1d] shrink-0">
                        <Briefcase className="w-3.5 h-3.5" />
                      </div>
                      <span>Section 6 : Expérience requise</span>
                    </div>
                    <p className="text-xs text-slate-600 font-bold pl-2 pt-1 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                      {localJob.experienceYears ? `${localJob.experienceYears}` : `${localJob.experienceLevel || "2 à 5 ans"}`}
                    </p>
                  </div>

                  {/* SECTION 8: Salaire */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs tracking-wider uppercase border-b border-slate-100 pb-1.5">
                      <div className="w-6 h-6 rounded-lg bg-orange-100/50 flex items-center justify-center text-[#e25c1d] shrink-0">
                        <Coins className="w-3.5 h-3.5" />
                      </div>
                      <span>Section 8 : Salaire estimé</span>
                    </div>
                    <p className="text-xs text-emerald-600 font-black pl-2 pt-1 flex items-center gap-1.5">
                      <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-[10px] uppercase font-mono">
                        {localJob.salary || "À déterminer"}
                      </span>
                    </p>
                  </div>

                </div>

                {/* SECTION 4: Compétences */}
                <div className="space-y-1.5 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs tracking-wider uppercase border-b border-slate-100 pb-1.5">
                    <div className="w-6 h-6 rounded-lg bg-orange-100/50 flex items-center justify-center text-[#e25c1d] shrink-0">
                      <Award className="w-3.5 h-3.5" />
                    </div>
                    <span>Section 4 : Compétences clefs</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pl-1 pt-1">
                    {parsedReqs.skills.slice(0, 6).map((skill, idx) => (
                      <span key={idx} className="bg-slate-50 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-150/50 tracking-wide">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* SECTION 7: Documents exigés */}
                <div className="space-y-1.5 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs tracking-wider uppercase border-b border-slate-100 pb-1.5">
                    <div className="w-6 h-6 rounded-lg bg-orange-100/50 flex items-center justify-center text-[#e25c1d] shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <span>Section 7 : Documents exigés</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pl-1 pt-1">
                    {docsToShow.map((docItem, idx) => (
                      <span key={idx} className="bg-white border border-orange-200/50 text-slate-700 font-bold text-[10px] px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-none hover:bg-orange-50/20 transition-all">
                        <FileText className="h-3.5 w-3.5 text-[#e25c1d] shrink-0" />
                        <span>{docItem}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* SECTION 9: Date limite */}
                <div className="space-y-1.5 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs tracking-wider uppercase border-b border-slate-100 pb-1.5">
                    <div className="w-6 h-6 rounded-lg bg-orange-100/50 flex items-center justify-center text-[#e25c1d] shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <span>Section 9 : Date limite de candidature</span>
                  </div>
                  <div className="pl-1 pt-1.5">
                    <span className="text-xs font-black text-rose-600 bg-rose-50 border border-rose-100/80 rounded-xl px-3 py-2 w-fit inline-flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      Postuler avant le : {deadlineDate()}
                    </span>
                  </div>
                </div>

                {/* SECTION 10: Informations de l'entreprise */}
                <div className="space-y-1.5 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs tracking-wider uppercase border-b border-slate-100 pb-1.5">
                    <div className="w-6 h-6 rounded-lg bg-orange-100/50 flex items-center justify-center text-[#e25c1d] shrink-0">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <span>Section 10 : Informations entreprise</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-150/40 p-4 rounded-2xl space-y-1.5 pt-3 mt-1.5">
                    <p className="text-xs text-slate-800 font-black flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-orange-600 shrink-0" />
                      {cleanCompanyName}
                    </p>
                    {localJob.location && (
                      <p className="text-[11px] text-slate-500 font-semibold pl-5.5">Localisation : {localJob.location}</p>
                    )}
                    {localJob.field && (
                      <p className="text-[11px] text-slate-500 font-semibold pl-5.5">Secteur : {localJob.field}</p>
                    )}
                    <div className="pt-2 pl-5.5">
                      <span className={`text-[9px] font-black uppercase text-white px-2 py-0.5 rounded-md ${
                        localJob.offer_type === 'external' ? 'bg-teal-600' : 'bg-emerald-600'
                      }`}>
                        Offre {localJob.offer_type === 'external' ? 'Populaire Relais' : 'Recrutement direct 2NG'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* MODAL / DIALOG D'ÉDITION DIRECT EN PLACE DES INFORMATIONS DE L'OFFRE */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl w-full rounded-[28px] p-6 border-none shadow-2xl overflow-y-auto max-h-[85vh] bg-white text-left">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-2">
              <Pencil className="h-5 w-5 text-[#e25c1d]" />
              Modifier l'offre d'emploi
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-bold mt-1 leading-normal">
              Remplissez les informations ci-dessous pour mettre à jour les détails affichés sur l'offre d'emploi.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveChanges} className="space-y-4 pt-3">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-800 uppercase">Intitulé du poste *</label>
                <input 
                  type="text" 
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-semibold bg-slate-50/50 outline-none focus:border-[#e25c1d]"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Ex. Développeur Full Stack"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-800 uppercase">Nom de l'entreprise *</label>
                <input 
                  type="text" 
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-semibold bg-slate-50/50 outline-none focus:border-[#e25c1d]"
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                  placeholder="Ex. TechSolutions CI"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-800 uppercase">Localisation</label>
                <input 
                  type="text" 
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-semibold bg-slate-50/50 outline-none focus:border-[#e25c1d]"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="Ex. Abidjan, Cocody"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-800 uppercase">Type de contrat</label>
                <select 
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-semibold bg-slate-50/50 outline-none cursor-pointer"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                >
                  <option value="CDI">CDI</option>
                  <option value="CDD">CDD</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Stage">Stage</option>
                  <option value="Alternance">Alternance</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-800 uppercase">Expérience Requise</label>
                <input 
                  type="text" 
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-semibold bg-slate-50/50 outline-none focus:border-[#e25c1d]"
                  value={editExperienceYears}
                  onChange={(e) => setEditExperienceYears(e.target.value)}
                  placeholder="Ex. 2 à 5 ans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-800 uppercase">Salaire estimatif</label>
                <input 
                  type="text" 
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-semibold bg-slate-50/50 outline-none focus:border-[#e25c1d]"
                  value={editSalary}
                  onChange={(e) => setEditSalary(e.target.value)}
                  placeholder="Ex. À déterminer ou 400.000 FCFA"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-800 uppercase">Niveau d'études (séparés par une virgule)</label>
              <input 
                type="text" 
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-semibold bg-slate-50/50 outline-none focus:border-[#e25c1d]"
                value={editStudyLevels}
                onChange={(e) => setEditStudyLevels(e.target.value)}
                placeholder="Ex. Bac+2, Licence, Master"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-800 uppercase font-sans">Description complète du poste *</label>
              <textarea 
                className="w-full h-24 p-3 rounded-lg border border-slate-200 text-xs font-semibold bg-slate-50/50 outline-none focus:border-[#e25c1d] resize-none"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Décrivez les objectifs et contexte du poste..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-800 uppercase font-sans">Missions & Exigences du profil *</label>
              <textarea 
                className="w-full h-24 p-3 rounded-lg border border-slate-200 text-xs font-semibold bg-slate-50/50 outline-none focus:border-[#e25c1d] resize-none"
                value={editRequirements}
                onChange={(e) => setEditRequirements(e.target.value)}
                placeholder="Listez les missions ou exigences requises par des tirets..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-800 uppercase">Documents demandés (séparés par une virgule)</label>
              <input 
                type="text" 
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-semibold bg-slate-50/50 outline-none focus:border-[#e25c1d]"
                value={editRequiredDocs}
                onChange={(e) => setEditRequiredDocs(e.target.value)}
                placeholder="Ex. CV, Lettre de motivation"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-orange-50/30 rounded-xl border border-orange-100/50">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-800 uppercase">Canal de candidature</label>
                <select 
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-extrabold bg-white cursor-pointer"
                  value={editOfferType}
                  onChange={(e) => setEditOfferType(e.target.value as 'internal' | 'external')}
                >
                  <option value="internal">Interne (Candidature Plateforme)</option>
                  <option value="external">Relais Externe (Candidature email)</option>
                </select>
              </div>

              {editOfferType === 'external' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-800 uppercase">Email relais externe *</label>
                  <input 
                    type="email" 
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold bg-white outline-none focus:border-[#e25c1d]"
                    value={editExternalEmail}
                    onChange={(e) => setEditExternalEmail(e.target.value)}
                    placeholder="recrutement@societe.com"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2 pt-2 border-t border-slate-50">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="rounded-xl font-bold text-xs uppercase h-10 border-slate-150 leading-none"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-[#e25c1d] hover:bg-orange-700 text-white font-extrabold text-xs uppercase h-10 px-5 flex items-center justify-center gap-1.5"
              >
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL / DIALOG D'INFORMATION POUR CANDIDATURE EXTERNE / ANONYME */}
      <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
        <DialogContent className="max-w-md w-full rounded-[24px] p-0 border-none shadow-2xl overflow-hidden bg-white text-left">
          
          {/* Header Banner with Gradient / Icon */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 pb-4 border-b border-orange-100/50 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[#e25c1d] flex items-center justify-center shrink-0">
              <AlertCircle className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                📢 Information importante
              </DialogTitle>
              <DialogDescription className="text-xs text-orange-700/80 font-bold mt-0.5 leading-normal">
                Offre relayée · Candidature externe par email
              </DialogDescription>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Message section */}
            <div className="space-y-2.5 text-xs text-slate-600 font-medium leading-relaxed">
              <p className="font-bold text-orange-800 bg-orange-50/70 p-2.5 rounded-xl border border-orange-100 flex items-start gap-2">
                <AlertCircle className="h-4.5 w-4.5 text-[#e25c1d] shrink-0 mt-0.5" />
                <span>
                  Cette offre a été enregistrée par l'administrateur de la plateforme pour le compte d'une entreprise anonyme ou externe non inscrite.
                </span>
              </p>
              <p>
                Pour cette raison, aucune candidature directe via notre plateforme n'est enregistrée. Vous êtes <strong>vivement prié(e) de postuler directement par email</strong> en transmettant votre dossier à l'adresse indiquée ci-dessous.
              </p>
              <p className="font-bold text-slate-800">
                Merci de bien vouloir joindre l'ensemble des documents requis et demandés pour cette offre.
              </p>
            </div>

            {/* Documents requested section */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 font-sans">
              <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                📄 Documents à fournir :
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {docsToShow.map((docItem, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200/60 shadow-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-700 truncate" title={docItem}>
                      {docItem}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Email destination section */}
            <div className="space-y-2">
              <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                📧 Adresse email de candidature :
              </h4>
              <div className="flex items-center justify-between gap-3 bg-orange-50/40 border border-orange-100/50 p-3.5 rounded-2xl">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="h-4.5 w-4.5 text-[#e25c1d] shrink-0" />
                  <span className="text-xs font-black text-slate-800 truncate select-all">
                    {applyEmail}
                  </span>
                </div>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={handleCopyEmail}
                  className="h-8 rounded-full border-orange-200/50 hover:bg-orange-50 text-[10px] font-black uppercase text-[#e25c1d] shrink-0 px-2.5 flex items-center gap-1 leading-none shadow-none cursor-pointer"
                >
                  <Copy className="h-3 w-3 stroke-[2.5]" />
                  <span>Copier</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="bg-slate-50 p-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2 mt-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsApplyModalOpen(false)}
              className="w-full sm:w-auto rounded-xl font-bold text-xs uppercase h-11 border-slate-200 text-slate-500 leading-none hover:bg-slate-100/50 cursor-pointer"
            >
              Fermer
            </Button>
            <a
              href={`mailto:${applyEmail}?subject=Candidature - ${encodeURIComponent(localJob.title)}`}
              onClick={() => setIsApplyModalOpen(false)}
              className="w-full sm:flex-1 h-11 bg-[#e25c1d] hover:bg-orange-700 text-white font-extrabold text-xs uppercase rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all text-center leading-none"
            >
              <Mail className="h-4 w-4" />
              <span>Ouvrir mon application email</span>
            </a>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </div>
  );
}
