import React, { useState, useEffect, useMemo } from 'react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import BannerRotator from '@/components/BannerRotator';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  MapPin, 
  Briefcase, 
  Clock, 
  Filter, 
  CheckCircle2, 
  SlidersHorizontal, 
  Building2, 
  DollarSign, 
  ChevronRight,
  ArrowRight,
  Sparkles,
  Heart,
  Eye,
  Award,
  ListFilter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Job } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  documentId
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import JobCard from '@/components/JobCard';

export default function Jobs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { config } = useSiteConfig();
  
  // Data State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companyNames, setCompanyNames] = useState<Record<string, string>>({});
  const [companyDetails, setCompanyDetails] = useState<Record<string, any>>({});
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContract, setSelectedContract] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedExperience, setSelectedExperience] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedSector, setSelectedSector] = useState('all');
  const [salaryFilter, setSalaryFilter] = useState('all'); // 'all', 'specified', 'unspecified'
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Load All Active Jobs on mount (or when admin role changes)
  useEffect(() => {
    const fetchJobsAndRecruiters = async () => {
      try {
        const isAdmin = user?.role === 'admin';
        const q = isAdmin
          ? query(collection(db, 'offers'))
          : query(
              collection(db, 'offers'),
              where('status', '==', 'active')
            );
        const querySnapshot = await getDocs(q);
        const jobsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Job[];
        
        // Sort chronologically in memory (most recent first)
        jobsData.sort((a: any, b: any) => {
          const timeA = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0);
          const timeB = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0);
          return timeB - timeA;
        });

        setJobs(jobsData);

        // Fetch registered recruiter names and details (logos, companyName)
        const recruiterIds = Array.from(new Set(jobsData.map(j => j.recruiterId || (j as any).companyId).filter(Boolean)));
        if (recruiterIds.length > 0) {
          const namesMap: Record<string, string> = {};
          const detailsMap: Record<string, any> = {};
          
          for (let i = 0; i < recruiterIds.length; i += 10) {
            const batch = recruiterIds.slice(i, i + 10);
            try {
              const recruitersQ = query(
                collection(db, 'users'), 
                where(documentId(), 'in', batch),
                where('role', '==', 'recruiter')
              );
              const recruitersSnap = await getDocs(recruitersQ);
              recruitersSnap.forEach(docSnap => {
                const data = docSnap.data();
                const name = data.companyName || data.tradeName || data.displayName || "Entreprise Partenaire";
                namesMap[docSnap.id] = name;
                detailsMap[docSnap.id] = data;
              });
            } catch (err) {
              console.error("Error fetching recruiters batch:", err);
            }
          }
          setCompanyNames(prev => ({ ...prev, ...namesMap }));
          setCompanyDetails(prev => ({ ...prev, ...detailsMap }));
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobsAndRecruiters();
  }, [user]);

  // Fetch applicant's applications to toggle correct postulé status in the list
  useEffect(() => {
    if (user && user.role === 'candidate') {
      const fetchApplications = async () => {
        try {
          const appsQ = query(
            collection(db, 'applications'),
            where('candidateId', '==', user.uid)
          );
          const snap = await getDocs(appsQ);
          const ids = new Set<string>();
          snap.forEach(docSnap => {
            ids.add(docSnap.data().jobId);
          });
          setAppliedJobIds(ids);
        } catch (err) {
          console.error("Error loading user applications:", err);
        }
      };
      fetchApplications();
    }
  }, [user]);

  // Handle immediate direct application
  const handleApplyJob = async (job: Job) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'candidate') return;

    setIsApplying(true);
    try {
      const rId = job.recruiterId || (job as any).companyId || 'admin_popular';
      const companyNameStr = companyNames[rId] || job.companyName || 'Entreprise Partenaire';

      const applicationData = {
        jobId: job.id,
        candidateId: user.uid,
        recruiterId: rId,
        jobTitle: job.title,
        companyName: companyNameStr,
        companyLogo: job.companyLogo || '',
        is_anonymous: !!job.is_anonymous,
        status: 'pending',
        appliedAt: serverTimestamp(),
        candidateProfile: {
          uid: user.uid,
          displayName: user.displayName || '',
          email: user.email || '',
          photoUrl: user.photoUrl || '',
          jobTitle: job.title || '',
          skills: user.skills || [],
          cvUrl: user.cvUrl || '',
          cvName: user.cvName || ''
        }
      };

      await addDoc(collection(db, 'applications'), applicationData);
      setAppliedJobIds(prev => {
        const next = new Set(prev);
        next.add(job.id);
        return next;
      });
    } catch (error) {
      console.error('Error applying to job:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const currentCompanyName = (job: Job) => {
    const rId = job.recruiterId || (job as any).companyId;
    return companyNames[rId || ''] || job.companyName || 'Entreprise Partenaire';
  };

  // Dynamically extract all unique sectors/fields in the database
  const availableSectors = useMemo(() => {
    const fields = new Set<string>();
    jobs.forEach(job => {
      if (job.field) {
        fields.add(job.field.trim());
      }
    });
    return Array.from(fields).sort();
  }, [jobs]);

  // Count jobs per sector
  const sectorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    jobs.forEach(job => {
      const field = job.field || 'Général';
      counts[field] = (counts[field] || 0) + 1;
    });
    return counts;
  }, [jobs]);

  // Application Tracking Metrics ("Suivi")
  const trackingMetrics = useMemo(() => {
    let viewedCount = 0;
    jobs.forEach(job => {
      if (localStorage.getItem(`viewed_job_${job.id}`)) {
        viewedCount++;
      }
    });

    const savedCount = jobs.filter(job => localStorage.getItem(`saved_job_${job.id}`)).length;

    return {
      totalAvailable: jobs.length,
      totalViewed: viewedCount,
      totalApplied: appliedJobIds.size,
      totalSaved: savedCount
    };
  }, [jobs, appliedJobIds]);

  // Highly responsive multi-dimension filter mechanism
  const filteredJobs = jobs.filter(job => {
    // 0. Screen out hidden or restricted jobs (unless user is an admin or the owner recruiter)
    const isAdmin = user?.role === 'admin';
    const isOwner = user && (job.recruiterId === user.uid || (job as any).companyId === user.uid);
    if (!isAdmin && !isOwner) {
      if (job.is_hidden || job.is_restricted) return false;
    }

    // 1. Search query
    const queryStr = searchTerm.toLowerCase();
    const docName = currentCompanyName(job).toLowerCase();
    const fieldMatch = (job.field || '').toLowerCase();
    const titleMatch = job.title.toLowerCase();
    const locMatch = job.location.toLowerCase();

    const matchesSearch = titleMatch.includes(queryStr) || 
                          docName.includes(queryStr) || 
                          fieldMatch.includes(queryStr) || 
                          locMatch.includes(queryStr);

    if (!matchesSearch) return false;

    // 2. Contract Type
    if (selectedContract !== 'all') {
      const currentContract = (job.contractType || 'CDI').toLowerCase();
      if (currentContract !== selectedContract.toLowerCase()) return false;
    }

    // 3. Location Filter
    if (selectedLocation !== 'all') {
      const rawLoc = job.location.toLowerCase();
      if (!rawLoc.includes(selectedLocation.toLowerCase())) return false;
    }

    // 4. Experience Filter
    if (selectedExperience !== 'all') {
      const expLevel = (job.experienceLevel || 'intermédiaire').toLowerCase();
      if (selectedExperience === 'débutant') {
        if (!expLevel.includes('débutant') && !expLevel.includes('junior') && !expLevel.includes('sans')) return false;
      } else if (selectedExperience === 'intermédiaire') {
        if (!expLevel.includes('intermédiaire') && !expLevel.includes('moyen')) return false;
      } else if (selectedExperience === 'senior') {
        if (!expLevel.includes('senior') && !expLevel.includes('expert') && !expLevel.includes('chef') && !expLevel.includes('dirigeant')) return false;
      }
    }

    // 5. Special Offer Type Filter
    if (selectedType !== 'all') {
      if (selectedType === 'rapid' && job.type !== 'rapid') return false;
      if (selectedType === 'popular' && (job.type !== 'popular' && !job.isFeatured)) return false;
      if (selectedType === 'unique' && job.type !== 'unique') return false;
    }

    // 6. Salary Filter
    if (salaryFilter !== 'all') {
      const sal = (job.salary || '').toLowerCase();
      const isNegotiable = !sal || sal.includes('non') || sal.includes('discuter') || sal.includes('précisé');
      if (salaryFilter === 'specified' && isNegotiable) return false;
      if (salaryFilter === 'unspecified' && !isNegotiable) return false;
    }

    // 7. Sector Filter (Classification)
    if (selectedSector !== 'all') {
      const jobField = (job.field || '').toLowerCase();
      if (!jobField.includes(selectedSector.toLowerCase()) && !selectedSector.toLowerCase().includes(jobField)) {
        return false;
      }
    }

    return true;
  });

  const clearAllFilters = () => {
    setSelectedContract('all');
    setSelectedLocation('all');
    setSelectedExperience('all');
    setSelectedType('all');
    setSelectedSector('all');
    setSalaryFilter('all');
    setSearchTerm('');
  };

  const activeFiltersCount = 
    (selectedContract !== 'all' ? 1 : 0) +
    (selectedLocation !== 'all' ? 1 : 0) +
    (selectedExperience !== 'all' ? 1 : 0) +
    (selectedType !== 'all' ? 1 : 0) +
    (selectedSector !== 'all' ? 1 : 0) +
    (salaryFilter !== 'all' ? 1 : 0);

  // Render the inner filters content (reused in desktop sidebar and mobile drawer)
  const renderFiltersContent = () => (
    <div className="space-y-6 text-left">
      <div className="flex items-center justify-between border-b border-slate-50 pb-3">
        <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-orange-600" />
          Filtres de recherche
        </h3>
        {activeFiltersCount > 0 && (
          <button 
            onClick={clearAllFilters}
            className="text-[10px] text-orange-600 hover:text-orange-700 font-extrabold uppercase bg-orange-50 px-2 py-0.5 rounded-md transition-colors"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Sector Selection inside Sidebar */}
      <div className="space-y-2">
        <label className="text-[11px] font-black uppercase text-slate-500 tracking-wide block">Secteur d'activité</label>
        <select
          value={selectedSector}
          onChange={(e) => setSelectedSector(e.target.value)}
          className="w-full h-10 px-3 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer"
        >
          <option value="all">Tous les secteurs ({jobs.length})</option>
          {availableSectors.map(sect => (
            <option key={sect} value={sect}>
              {sect} ({sectorCounts[sect] || 0})
            </option>
          ))}
        </select>
      </div>

      {/* Contract type */}
      <div className="space-y-2">
        <label className="text-[11px] font-black uppercase text-slate-500 tracking-wide block">Type de contrat</label>
        <div className="flex flex-wrap gap-1.5">
          {['all', 'CDI', 'CDD', 'Stage', 'Freelance'].map(type => (
            <button
              key={type}
              onClick={() => setSelectedContract(type.toLowerCase() === 'all' ? 'all' : type)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                (type.toLowerCase() === 'all' ? selectedContract === 'all' : selectedContract.toLowerCase() === type.toLowerCase())
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {type === 'all' ? 'Tous' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <label className="text-[11px] font-black uppercase text-slate-500 tracking-wide block">Localisation</label>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', name: 'Partout' },
            { id: 'sénégal', name: 'Sénégal' },
            { id: 'côte', name: 'Côte d\'Ivoire' },
            { id: 'france', name: 'France' },
            { id: 'remote', name: 'Télétravail' }
          ].map(loc => (
            <button
              key={loc.id}
              onClick={() => setSelectedLocation(loc.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedLocation === loc.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {loc.name}
            </button>
          ))}
        </div>
      </div>

      {/* Experience level */}
      <div className="space-y-2">
        <label className="text-[11px] font-black uppercase text-slate-500 tracking-wide block">Niveau d'expérience</label>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', name: 'Indifférent' },
            { id: 'débutant', name: 'Débutant / Junior' },
            { id: 'intermédiaire', name: 'Intermédiaire' },
            { id: 'senior', name: 'Senior / Expert' }
          ].map(exp => (
            <button
              key={exp.id}
              onClick={() => setSelectedExperience(exp.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedExperience === exp.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {exp.name}
            </button>
          ))}
        </div>
      </div>

      {/* Job category categories */}
      <div className="space-y-2">
        <label className="text-[11px] font-black uppercase text-slate-500 tracking-wide block">Catégorie d'offres</label>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', name: 'Toutes' },
            { id: 'rapid', name: 'Express (Urgent)' },
            { id: 'popular', name: 'Élite 2NG' },
            { id: 'unique', name: 'Direct (Partenaire)' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedType(cat.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedType === cat.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Salary selection */}
      <div className="space-y-2">
        <label className="text-[11px] font-black uppercase text-slate-500 tracking-wide block">Salaire</label>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', name: 'Tous les salaires' },
            { id: 'specified', name: 'Salaire spécifié' },
            { id: 'unspecified', name: 'Négociable / Non précisé' }
          ].map(sal => (
            <button
              key={sal.id}
              onClick={() => setSalaryFilter(sal.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                salaryFilter === sal.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {sal.name}
            </button>
          ))}
        </div>
      </div>

    </div>
  );

  if (loading) {
    return (
      <div className="container min-h-screen py-16 flex justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfbf9]/60 px-4 sm:px-6 md:px-12 py-10 max-w-7xl mx-auto">
      
      {/* 0. DYNAMIC TOP BANNER (L'espace des œuvres) */}
      {config.jobsBannerEnabled && config.jobsBannerImages && config.jobsBannerImages.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto mb-8"
        >
          <BannerRotator 
            images={config.jobsBannerImages}
            interval={config.jobsBannerInterval || 5000}
            heightClass="h-44 sm:h-56 md:h-64"
          />
        </motion.div>
      )}

      {/* 1. HEADER HERO BANNER & SEARCH */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 mb-8 border-b border-slate-100 pb-8">
        <div className="text-left flex-1">
          <Badge variant="outline" className="border-orange-200/80 text-orange-600 bg-orange-50 font-black uppercase text-[10px] px-3.5 py-1 rounded-full mb-3 shadow-sm">
            Recrutement 2NG Groupe
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-none">
            Espace Opportunités
          </h1>
          <p className="text-slate-500 font-bold text-xs sm:text-sm mt-2.5 leading-relaxed max-w-2xl">
            Découvrez les meilleures offres sélectionnées par secteur. Suivez vos consultations, sauvegardez vos favoris et postulez en quelques secondes.
          </p>
        </div>

        {/* Input Bar */}
        <div className="relative w-full md:w-[380px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Rechercher par poste, entreprise, ville..." 
            className="pl-11 pr-4 h-12 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-bold text-xs sm:text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 1.5. TABLEAU DE BORD DE SUIVI DE CANDIDATURE (Progress tracking bar) */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Award className="h-4 w-4 text-orange-600 animate-pulse" />
          <h2 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-widest leading-none">
            Mon tableau de suivi de recherche
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Disponible */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm hover:shadow transition-all border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-black uppercase text-slate-400 tracking-wider">Offres Actives</span>
              <div className="p-1.5 bg-slate-800 rounded-xl text-orange-500">
                <Briefcase className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-black leading-none">{trackingMetrics.totalAvailable}</span>
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold mt-1">Opportunités en ligne</p>
            </div>
          </div>

          {/* Consultées */}
          <div className="bg-white border border-slate-150/70 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm hover:shadow transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-black uppercase text-slate-500 tracking-wider">Déjà Consultées</span>
              <div className="p-1.5 bg-sky-50 rounded-xl text-sky-600">
                <Eye className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">{trackingMetrics.totalViewed}</span>
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold mt-1">
                {trackingMetrics.totalAvailable > 0 
                  ? `${Math.round((trackingMetrics.totalViewed / trackingMetrics.totalAvailable) * 100)}% de couverture`
                  : '0% de couverture'}
              </p>
            </div>
          </div>

          {/* Postulées */}
          <div className="bg-white border border-slate-150/70 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm hover:shadow transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-black uppercase text-slate-500 tracking-wider">Candidatures</span>
              <div className="p-1.5 bg-emerald-50 rounded-xl text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">{trackingMetrics.totalApplied}</span>
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold mt-1">Dossiers transmis</p>
            </div>
          </div>

          {/* Enregistrées */}
          <div className="bg-white border border-slate-150/70 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm hover:shadow transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-black uppercase text-slate-500 tracking-wider">Mes Favoris</span>
              <div className="p-1.5 bg-rose-50 rounded-xl text-rose-500">
                <Heart className="h-4 w-4 fill-rose-500" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">{trackingMetrics.totalSaved}</span>
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold mt-1">Offres sauvegardées</p>
            </div>
          </div>
        </div>
      </div>

      {/* 1.8. SECTOR PILLES HORIZONTAL CATEGORY SCROLL (Classification) */}
      <div className="max-w-7xl mx-auto mb-8 bg-white border border-slate-100 p-4 rounded-3xl shadow-sm">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <ListFilter className="h-4 w-4 text-orange-600" />
            Parcourir par secteur d'activité
          </h2>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none scroll-smooth">
          <button
            onClick={() => setSelectedSector('all')}
            className={`px-4.5 py-2.5 rounded-full text-xs font-black tracking-tight uppercase border shrink-0 transition-all cursor-pointer flex items-center gap-2 ${
              selectedSector === 'all'
                ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/10'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100/75'
            }`}
          >
            <span>Tous les Secteurs</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              selectedSector === 'all' ? 'bg-orange-700 text-orange-50' : 'bg-slate-200/80 text-slate-600'
            }`}>
              {jobs.length}
            </span>
          </button>

          {availableSectors.map(sect => {
            const count = sectorCounts[sect] || 0;
            return (
              <button
                key={sect}
                onClick={() => setSelectedSector(sect)}
                className={`px-4.5 py-2.5 rounded-full text-xs font-black tracking-tight uppercase border shrink-0 transition-all cursor-pointer flex items-center gap-2 ${
                  selectedSector === sect
                    ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/10'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{sect}</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  selectedSector === sect ? 'bg-orange-700 text-orange-50' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. MAIN LAYOUT CONTAINER */}
      <div className="mx-auto flex flex-col lg:flex-row gap-8 items-start">
        
        {/* DESKTOP SIDEBAR FILTERS (Visible only on lg and above) */}
        <div className="hidden lg:block w-[280px] shrink-0 bg-white border border-slate-100 p-6 rounded-[28px] shadow-sm sticky top-24">
          {renderFiltersContent()}
        </div>

        {/* MOBILE INSTANT CONTROL STRIP (Visible only below lg) */}
        <div className="w-full lg:hidden flex items-center justify-between bg-white border border-slate-100/80 px-4 py-3 rounded-2xl shadow-sm mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase text-slate-500">
              {filteredJobs.length} {filteredJobs.length > 1 ? 'postes trouvés' : 'poste trouvé'}
            </span>
            {activeFiltersCount > 0 && (
              <Badge className="bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                {activeFiltersCount}
              </Badge>
            )}
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="h-9 px-4 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 border-slate-200 cursor-pointer"
          >
            <Filter className="h-3.5 w-3.5 text-orange-600" />
            <span>Filtres</span>
          </Button>
        </div>

        {/* MOBILE COLLAPSIBLE DRAWER DRAWER */}
        <AnimatePresence>
          {showMobileFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden w-full bg-white border border-slate-100 p-5 rounded-2xl shadow-lg overflow-hidden mb-6 text-left"
            >
              {renderFiltersContent()}
              <Button 
                onClick={() => setShowMobileFilters(false)}
                className="w-full mt-6 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold uppercase cursor-pointer"
              >
                Appliquer les filtres
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. JOB LISTING GRID */}
        <div className="flex-1 w-full text-left">
          
          {/* Header context count */}
          <div className="hidden lg:flex items-center justify-between mb-6">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Recherche approfondie ➔ {filteredJobs.length} {filteredJobs.length > 1 ? 'Opportunités Disponibles' : 'Opportunité Disponible'}
            </span>
          </div>

          {filteredJobs.length > 0 ? (
            /* Spacious 1-Column Layout: Single responsive width, optimized for premium readability */
            <div className="flex flex-col gap-6 w-full max-w-4xl">
              {filteredJobs.map((job, index) => {
                const partnerProfile = job.recruiterId ? companyDetails[job.recruiterId] : null;
                const isRegistered = partnerProfile && partnerProfile.role === 'recruiter' && partnerProfile.companyName;
                const isAnonymous = !!job.is_anonymous || 
                                    job.companyName === "Recruteur Confidentiel" || 
                                    job.companyName === "Recruteur confidentiel" ||
                                    job.companyLogo === "https://lh3.googleusercontent.com/d/1O58k8ZpXqgXW-9_H-Hk3V-e4I5V_H_R3=w200-h200";
                const finalLogo = isAnonymous ? "https://lh3.googleusercontent.com/d/1O58k8ZpXqgXW-9_H-Hk3V-e4I5V_H_R3=w200-h200" : (isRegistered ? (partnerProfile.photoUrl || job.companyLogo) : job.companyLogo);
                const finalName = isAnonymous ? "Recruteur Confidentiel" : (isRegistered ? (partnerProfile.companyName || job.companyName) : job.companyName);

                return (
                  <React.Fragment key={job.id}>
                    <motion.div
                      layout="position"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 26 }}
                      className="w-full"
                    >
                      <JobCard
                        job={{
                          ...job,
                          companyLogo: finalLogo,
                          companyName: finalName,
                          is_anonymous: isAnonymous
                        }}
                        companyName={finalName}
                        isApplied={appliedJobIds.has(job.id)}
                        onApply={() => handleApplyJob(job)}
                        isApplying={isApplying}
                        loggedIn={!!user}
                        userRole={user?.role}
                        showNextArrow={false}
                      />
                    </motion.div>

                    {config.jobsInBetweenBannersEnabled && 
                     config.jobsInBetweenBannersImages && 
                     config.jobsInBetweenBannersImages.length > 0 && 
                     (index + 1) % (config.jobsInBetweenFrequency || 3) === 0 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-2 px-1 sm:px-3 mb-4 select-none"
                      >
                        <BannerRotator
                          images={config.jobsInBetweenBannersImages}
                          interval={config.jobsInBetweenBannersInterval || 5000}
                          heightClass="h-28 sm:h-36 md:h-44"
                        />
                      </motion.div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-white border border-slate-100 rounded-[32px] shadow-sm max-w-lg mx-auto">
              <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-3 animate-bounce" />
              <p className="text-slate-700 font-extrabold text-base">Aucun poste trouvé</p>
              <p className="text-slate-400 font-semibold text-xs mt-1.5 px-6 leading-relaxed">
                Essayez de modifier vos filtres, de choisir un autre secteur, ou de réinitialiser la recherche pour découvrir d'autres offres d'emploi.
              </p>
              <Button 
                onClick={clearAllFilters}
                className="mt-6 h-10 px-6 rounded-full bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-black uppercase tracking-wider cursor-pointer"
              >
                Réinitialiser les filtres
              </Button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
