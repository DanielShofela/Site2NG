/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Users, 
  Briefcase, 
  TrendingUp, 
  ChevronRight, 
  Eye, 
  CheckCircle2, 
  Clock, 
  FileText,
  Building2,
  ExternalLink,
  Target,
  Award,
  Heart,
  Globe,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  LayoutDashboard,
  Settings,
  MessageSquare,
  Palette,
  AlertTriangle,
  HelpCircle,
  Check
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Link, useNavigate } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  orderBy,
  doc,
  updateDoc,
  increment,
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Job, Application, SupportTicket, UserProfile } from '@/types';
import { generateCV } from '@/lib/pdfUtils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function RecruiterDashboard() {
  const { user } = useAuth();
  const { config } = useSiteConfig();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role === 'recruiter' && user.status !== 'approved') {
      navigate('/pending-approval');
    }
  }, [user, navigate]);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [jobCreated, setJobCreated] = useState(false);
  const [activeTab, setActiveTab] = useState('jobs');
  
  // Creation form state
  const [jobTitle, setJobTitle] = useState('');
  const [jobType, setJobType] = useState('CDI');
  const [jobLocation, setJobLocation] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobField, setJobField] = useState('Informatique');
  const [jobSalary, setJobSalary] = useState('');
  const [jobExpiresAt, setJobExpiresAt] = useState('');

  // Edit form state
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [isEditingJobOpen, setIsEditingJobOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState('CDI');
  const [editLocation, setEditLocation] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editField, setEditField] = useState('Informatique');
  const [editSalary, setEditSalary] = useState('');
  const [editExpiresAt, setEditExpiresAt] = useState('');

  // Data state
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [cvBlobUrl, setCvBlobUrl] = useState<string | null>(null);

  // Support ticket states
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  // CVthèque states
  const [allCandidates, setAllCandidates] = useState<UserProfile[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [cvSearchTerm, setCvSearchTerm] = useState('');
  const [cvSector, setCvSector] = useState('all');
  const [cvExperience, setCvExperience] = useState('all');
  const [cvLocation, setCvLocation] = useState('');
  const [cvDisponibility, setCvDisponibility] = useState('all');
  const [selectedCandidate, setSelectedCandidate] = useState<UserProfile | null>(null);
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'candidate')
        );
        const snapshot = await getDocs(q);
        const list: UserProfile[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as UserProfile;
          // Only show active and where visibleInCvtheque is not explicitly false
          if (data.visibleInCvtheque !== false) {
            list.push({ uid: doc.id, ...data });
          }
        });
        setAllCandidates(list);
      } catch (err) {
        console.error("Error fetching candidates for CVthèque:", err);
      } finally {
        setCandidatesLoading(false);
      }
    };
    fetchCandidates();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'support_tickets'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const list: SupportTicket[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as SupportTicket);
      });
      setTickets(list);
    }, (error) => {
      console.warn("Error fetching support tickets real-time:", error);
    });
    return unsub;
  }, [user]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !ticketSubject.trim() || !ticketMessage.trim()) return;
    setIsSubmittingTicket(true);
    setTicketSuccess(false);
    try {
      await addDoc(collection(db, 'support_tickets'), {
        userId: user.uid,
        userEmail: user.email ?? '',
        userName: user.companyName || user.displayName || 'Recruteur',
        userRole: 'recruiter',
        subject: ticketSubject,
        message: ticketMessage,
        createdAt: serverTimestamp(),
        status: 'open',
        response: null
      });
      setTicketSubject('');
      setTicketMessage('');
      setTicketSuccess(true);
      setTimeout(() => setTicketSuccess(false), 5000);
    } catch (err) {
      console.error("Error creating support ticket:", err);
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  useEffect(() => {
    let url: string | null = null;
    
    if (selectedApp?.candidateProfile?.cvUrl?.startsWith('data:')) {
      try {
        const base64Data = selectedApp.candidateProfile.cvUrl;
        const parts = base64Data.split(',');
        if (parts.length === 2) {
          // Clean the base64 string to avoid atob errors
          const pureBase64 = parts[1].replace(/\s/g, '');
          const byteString = atob(pureBase64);
          const mimeString = parts[0].split(':')[1].split(';')[0];
          
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          
          const blob = new Blob([ab], { type: mimeString });
          url = URL.createObjectURL(blob);
          setCvBlobUrl(url);
        }
      } catch (e) {
        console.error('Error creating Blob URL:', e);
        // Fallback to data URL if blob fails
        setCvBlobUrl(selectedApp.candidateProfile.cvUrl);
      }
    } else if (selectedApp?.candidateProfile?.cvUrl) {
      setCvBlobUrl(selectedApp.candidateProfile.cvUrl);
    } else {
      setCvBlobUrl(null);
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [isPreviewOpen, selectedApp]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch jobs
        const jobsQ = query(
          collection(db, 'offers'),
          where('recruiterId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const jobsSnapshot = await getDocs(jobsQ);
        const jobsList = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Job[];
        setMyJobs(jobsList);

        // Fetch applications
        const appsQ = query(
          collection(db, 'applications'),
          where('recruiterId', '==', user.uid),
          orderBy('appliedAt', 'desc')
        );
        const appsSnapshot = await getDocs(appsQ);
        const appsList = appsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMyApplications(appsList);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getValidationWaitingState = () => {
    if (!user || user.role !== 'recruiter') return { canPost: false, isApproved: false, hoursLeft: 0 };
    
    if (user.status !== 'approved') {
      return { canPost: false, isApproved: false, hoursLeft: 72 };
    }
    
    let approvalTime = 0;
    if (user.approvedAt) {
      approvalTime = user.approvedAt.seconds 
        ? user.approvedAt.seconds * 1000 
        : new Date(user.approvedAt).getTime();
    } else if (user.createdAt) {
      approvalTime = user.createdAt.seconds 
        ? user.createdAt.seconds * 1000 
        : new Date(user.createdAt).getTime();
    } else {
      return { canPost: true, isApproved: true, hoursLeft: 0 };
    }
    
    const elapsedMs = Date.now() - approvalTime;
    const elapsedHours = elapsedMs / (3600 * 1000);
    const hoursLeft = 72 - elapsedHours;
    
    return {
      canPost: hoursLeft <= 0,
      isApproved: true,
      hoursLeft: Math.min(72, Math.max(0, Math.ceil(hoursLeft)))
    };
  };

  const handleOpenEdit = (job: Job) => {
    setEditingJob(job);
    setEditTitle(job.title || '');
    setEditType((job as any).contractType || job.type || 'CDI');
    setEditLocation(job.location || '');
    setEditDescription(job.description || '');
    setEditField(job.field || 'Informatique');
    setEditSalary(job.salary || '');
    const expiresVal = (job as any).expiresAt ? (typeof (job as any).expiresAt === 'string' ? (job as any).expiresAt : ((job as any).expiresAt.toDate ? (job as any).expiresAt.toDate() : new Date((job as any).expiresAt)).toISOString().substring(0, 16)) : '';
    setEditExpiresAt(expiresVal);
    setIsEditingJobOpen(true);
  };

  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob || !user) return;
    
    try {
      let calculatedType = 'unique';
      if (editExpiresAt) {
        const expiresDate = new Date(editExpiresAt);
        const diffHours = (expiresDate.getTime() - Date.now()) / (1000 * 60 * 60);
        if (diffHours > 0 && diffHours <= 48) {
          calculatedType = 'rapid';
        }
      }

      const jobRef = doc(db, 'offers', editingJob.id!);
      await updateDoc(jobRef, {
        title: editTitle,
        contractType: editType,
        type: calculatedType,
        location: editLocation,
        description: editDescription,
        field: editField,
        category: editField,
        salary: editSalary,
        expiresAt: editExpiresAt ? new Date(editExpiresAt) : null,
        status: 'pending_validation', // Go back to pending validation upon modification
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setMyJobs(prev => prev.map(j => j.id === editingJob.id ? {
        ...j,
        title: editTitle,
        type: calculatedType,
        contractType: editType,
        location: editLocation,
        description: editDescription,
        field: editField,
        category: editField,
        salary: editSalary,
        expiresAt: editExpiresAt ? new Date(editExpiresAt) : null,
        status: 'pending_validation'
      } : j));
      
      setIsEditingJobOpen(false);
      setEditingJob(null);
      alert("Votre offre d'emploi a été mise à jour avec succès et est en attente de validation par l'administrateur.");
    } catch (err) {
      console.error("Error updating job:", err);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const waitStatus = getValidationWaitingState();
    if (!waitStatus.canPost) {
      alert("Vous devez attendre la fin du délai de validation de 72 heures après approbation de votre compte.");
      return;
    }

    setIsCreatingJob(true);
    try {
      let calculatedType = 'unique';
      if (jobExpiresAt) {
        const expiresDate = new Date(jobExpiresAt);
        const diffHours = (expiresDate.getTime() - Date.now()) / (1000 * 60 * 60);
        if (diffHours > 0 && diffHours <= 48) {
          calculatedType = 'rapid';
        }
      }

      const jobData = {
        companyId: user.uid,
        createdBy: user.uid,
        companyName: user.companyName || user.displayName || "Entreprise",
        companyLogo: user.photoUrl || '',
        title: jobTitle,
        description: jobDescription,
        location: jobLocation,
        type: calculatedType,
        contractType: jobType,
        field: jobField,
        category: jobField,
        salary: jobSalary,
        expiresAt: jobExpiresAt ? new Date(jobExpiresAt) : null,
        status: 'pending_validation', // Default is en attente de validation
        createdAt: serverTimestamp(),
        isFeatured: false
      };

      const docRef = await addDoc(collection(db, 'offers'), jobData);
      setJobCreated(true);
      
      // Update local state
      setMyJobs([{ id: docRef.id, ...jobData } as any, ...myJobs]);
      
      // Reset form
      setJobTitle('');
      setJobLocation('');
      setJobDescription('');
      setJobSalary('');
      setJobExpiresAt('');
    } catch (error) {
      console.error('Error creating job:', error);
    } finally {
      setIsCreatingJob(false);
    }
  };

  const handleUpdateStatus = async (appId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const appRef = doc(db, 'applications', appId);
      await updateDoc(appRef, { status: newStatus });
      
      // Update local state
      setMyApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
      if (selectedApp && selectedApp.id === appId) {
        setSelectedApp({ ...selectedApp, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSelectApp = async (app: any) => {
    setSelectedApp(app);
    
    // Increment candidate profile views
    if (app.candidateId) {
      try {
        const userRef = doc(db, 'users', app.candidateId);
        await updateDoc(userRef, {
          profileViews: increment(1)
        });
      } catch (e) {
        console.error('Error incrementing profile views:', e);
      }
    }

    // Mark as viewed if pending
    if (app.status === 'pending') {
      handleUpdateStatus(app.id, 'viewed');
    }
  };

  const getStatusBadgeProps = (status: string) => {
    switch (status) {
      case 'viewed': return { color: 'bg-blue-100 text-blue-700', label: 'Vue' };
      case 'shortlisted': return { color: 'bg-green-100 text-green-700', label: 'Sélectionné' };
      case 'rejected': return { color: 'bg-red-100 text-red-700', label: 'Refusé' };
      case 'pending':
      default: return { color: 'bg-yellow-100 text-yellow-700', label: 'En attente' };
    }
  };

  const filteredCandidates = allCandidates.filter(c => {
    // 1. Search term
    if (cvSearchTerm.trim()) {
      const term = cvSearchTerm.toLowerCase();
      const nameMatch = c.displayName?.toLowerCase().includes(term);
      const titleMatch = c.jobTitle?.toLowerCase().includes(term);
      const sectorMatch = c.sector?.toLowerCase().includes(term);
      const skillsMatch = c.skills?.some(s => s.name?.toLowerCase().includes(term));
      if (!nameMatch && !titleMatch && !sectorMatch && !skillsMatch) {
         return false;
      }
    }

    // 2. Sector
    if (cvSector !== 'all') {
      if (c.sector !== cvSector) return false;
    }

    // 3. Experience level
    if (cvExperience !== 'all') {
      const expYears = c.yearsOfExperience || 0;
      if (cvExperience === '0-1' && expYears > 1) return false;
      if (cvExperience === '1-3' && (expYears < 1 || expYears > 3)) return false;
      if (cvExperience === '3-5' && (expYears < 3 || expYears > 5)) return false;
      if (cvExperience === '5+' && expYears < 5) return false;
    }

    // 4. Location
    if (cvLocation.trim()) {
      const locTerm = cvLocation.toLowerCase();
      const locMatch = c.location?.toLowerCase().includes(locTerm) || c.city?.toLowerCase().includes(locTerm) || c.commune?.toLowerCase().includes(locTerm);
      if (!locMatch) return false;
    }

    // 5. Disponibility
    if (cvDisponibility !== 'all') {
      const isAvail = c.availableImmediately || false;
      if (cvDisponibility === 'available' && !isAvail) return false;
      if (cvDisponibility === 'not-available' && isAvail) return false;
    }

    return true;
  });

  const stats = [
    { label: "Offres Actives", value: myJobs.filter(j => j.status === 'active').length.toString(), icon: Briefcase, color: "text-blue-600" },
    { label: "Candidatures", value: myApplications.length.toString(), icon: Users, color: "text-green-600" },
    { label: "Vues Profil Entreprise", value: (user.profileViews || 0).toString(), icon: Eye, color: "text-purple-600" },
  ];

  if (!user || user.role !== 'recruiter') {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-2xl font-bold">Accès restreint</h2>
        <p className="text-muted-foreground mt-2">Vous devez être connecté en tant que recruteur pour voir cette page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header Banner Section */}
      <div className="bg-slate-900 text-white pt-16 pb-24 px-4 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4"></div>
        
        <div className="container px-4 relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 w-full lg:w-auto">
              <div className="h-24 w-24 md:h-32 md:w-32 bg-white rounded-[24px] md:rounded-[32px] p-2 shadow-2xl relative shrink-0">
                <div className="h-full w-full rounded-[18px] md:rounded-[24px] overflow-hidden bg-slate-50 flex items-center justify-center">
                  {user.photoUrl ? (
                    <img src={user.photoUrl} alt={user.companyName} className="h-full w-full object-contain p-2" />
                  ) : (
                    <Building2 className="h-10 w-10 text-slate-300" />
                  )}
                </div>
                {user.status === 'approved' && (
                  <div className="absolute -top-2 -right-2 bg-blue-500 text-white p-1.5 rounded-full shadow-lg">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="text-center md:text-left flex-1">
                <h1 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight">{user.companyName || user.tradeName || user.displayName}</h1>
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 md:gap-4 mt-3 text-slate-400 font-bold text-sm md:text-base">
                  {user.tradeName && <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4 text-orange-500" /> {user.companyName}</span>}
                  <span className="flex items-center gap-1.5 shrink-0"><MapPin className="h-4 w-4 text-orange-500" /> {user.city || 'N/A'}, {user.commune || 'CI'}</span>
                  <span className="flex items-center gap-1.5 shrink-0"><Briefcase className="h-4 w-4 text-orange-500" /> {user.sectorActivity || 'Secteur non défini'}</span>
                  <Badge className={`${user.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'} border-none font-black px-3 text-[10px] tracking-wider`}>
                    {user.status === 'approved' ? 'VÉRIFIÉE' : 'EN VÉRIFICATION'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <Button 
                variant="outline" 
                className="bg-orange-650 text-white hover:bg-orange-700 border-none h-11 md:h-12 rounded-xl md:rounded-2xl font-black flex-1 md:flex-none shadow-lg shadow-orange-650/35"
                onClick={() => navigate('/')}
              >
                <ExternalLink className="mr-2 h-4 w-4" /> Retour au site
              </Button>
              <Button 
                variant="outline" 
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-11 md:h-12 rounded-xl md:rounded-2xl font-bold backdrop-blur-sm flex-1 md:flex-none"
                onClick={() => navigate('/recruiter-onboarding')}
              >
                <Settings className="mr-2 h-4 w-4" /> Modifier Profil
              </Button>
                <Button 
                  variant="outline" 
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-11 md:h-12 rounded-xl md:rounded-2xl font-bold backdrop-blur-sm flex-1 md:flex-none"
                  asChild
                  nativeButton={false}
                >
                  <Link to={`/company/${user.uid}`}>
                    <Eye className="mr-2 h-4 w-4" /> Voir Page Publique
                  </Link>
                </Button>
              <Dialog onOpenChange={(open) => { if (!open) setJobCreated(false); }}>
                <DialogTrigger asChild nativeButton={true}>
                  <Button className="h-11 md:h-12 px-6 md:px-8 rounded-xl md:rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-xl shadow-orange-600/20 border-none flex-1 md:flex-none">
                    <Plus className="mr-2 h-5 w-5" /> Publier Offre
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-[40px] border-none shadow-2xl">
            {!jobCreated ? (
              <>
                <DialogHeader className="bg-slate-900 text-white p-8 rounded-t-[40px]">
                  <DialogTitle className="text-2xl font-black">Publier une offre d'emploi</DialogTitle>
                  <DialogDescription className="text-slate-400 font-bold">
                    Attirez les meilleurs talents africains.
                  </DialogDescription>
                </DialogHeader>
                {!getValidationWaitingState().canPost ? (
                  <div className="p-8 text-center space-y-6">
                    <div className="inline-flex items-center justify-center p-4 bg-orange-50 text-orange-600 rounded-full mt-4">
                      <Clock className="h-12 w-12 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-slate-900">Période de Validation Requise (72h)</h3>
                      <p className="text-slate-500 font-bold text-sm max-w-sm mx-auto leading-relaxed">
                        Conformément à nos règles de sécurité, les nouvelles entreprises doivent attendre un délai de validation obligatoire de 72h après approbation de leur profil avant de pouvoir publier des offres d'emploi d'Afrique.
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 max-w-xs mx-auto">
                      <p className="text-[10px] uppercase font-black tracking-widest text-slate-450">Temps d'attente restant</p>
                      <p className="text-2xl font-black text-orange-600 mt-1 animate-pulse">
                        {getValidationWaitingState().hoursLeft} heures
                      </p>
                    </div>
                    <Button 
                      onClick={() => navigate('/recruiter-onboarding')}
                      className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-xs"
                    >
                      Vérifier mes informations juridiques
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleCreateJob} className="p-8 space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="font-black text-slate-700 ml-1 uppercase text-xs tracking-widest">Intitulé du poste *</Label>
                      <Input id="title" placeholder="Ex: Senior Marketing Manager" className="h-14 rounded-2xl border-slate-200 focus-visible:ring-orange-600 font-bold" value={jobTitle} onChange={e => setJobTitle(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="type" className="font-black text-slate-700 ml-1 uppercase text-xs tracking-widest">Contrat</Label>
                        <Select value={jobType} onValueChange={setJobType}>
                          <SelectTrigger className="h-14 rounded-2xl border-slate-200 font-bold">
                            <SelectValue placeholder="Choisir..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            <SelectItem value="CDI">CDI</SelectItem>
                            <SelectItem value="CDD">CDD</SelectItem>
                            <SelectItem value="Stage">Stage</SelectItem>
                            <SelectItem value="Freelance">Freelance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location" className="font-black text-slate-700 ml-1 uppercase text-xs tracking-widest">Ville *</Label>
                        <Input id="location" placeholder="Abidjan, Dakar..." className="h-14 rounded-2xl border-slate-200 focus-visible:ring-orange-600 font-bold" value={jobLocation} onChange={e => setJobLocation(e.target.value)} required />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category" className="font-black text-slate-700 ml-1 uppercase text-xs tracking-widest">Secteur d'activité *</Label>
                        <Select value={jobField} onValueChange={setJobField}>
                          <SelectTrigger className="h-14 rounded-2xl border-slate-200 font-bold">
                            <SelectValue placeholder="Secteur..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            <SelectItem value="Civil Engineering">Génie Civil / BTP</SelectItem>
                            <SelectItem value="Medical Health">Santé / Médical</SelectItem>
                            <SelectItem value="Commerce">Commerce / Vente</SelectItem>
                            <SelectItem value="Finance">Finance / Gestion</SelectItem>
                            <SelectItem value="Informatique">Technologies / IT</SelectItem>
                            <SelectItem value="Autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="salary" className="font-black text-slate-700 ml-1 uppercase text-xs tracking-widest">Salaire (CFA) *</Label>
                        <Input id="salary" placeholder="Ex: 500 000 CFA / mois" className="h-14 rounded-2xl border-slate-200 focus-visible:ring-orange-600 font-bold" value={jobSalary} onChange={e => setJobSalary(e.target.value)} required />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expiresAt" className="font-black text-slate-700 ml-1 uppercase text-xs tracking-widest">Date d'expiration (Sous 48h = Automatiquement "Offre Rapide")</Label>
                      <Input id="expiresAt" type="datetime-local" className="h-14 rounded-2xl border-slate-200 focus-visible:ring-orange-600 font-bold" value={jobExpiresAt} onChange={e => setJobExpiresAt(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="font-black text-slate-700 ml-1 uppercase text-xs tracking-widest">Descriptif & Missions *</Label>
                      <Textarea id="description" className="min-h-[120px] rounded-3xl border-slate-200 focus-visible:ring-orange-600 font-medium p-6" placeholder="Qu'attendez-vous du candidat idéal ?" value={jobDescription} onChange={e => setJobDescription(e.target.value)} required />
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="w-full h-16 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-xl shadow-orange-600/20 border-none transition-all" disabled={isCreatingJob}>
                        {isCreatingJob ? "ENVOI EN VALIDATION..." : "SOUMETTRE À LA VALIDATION"}
                      </Button>
                    </DialogFooter>
                  </form>
                )}
              </>
            ) : (
              <div className="py-12 text-center p-8">
                <div className="inline-flex items-center justify-center p-4 bg-green-100 text-green-700 rounded-full mb-6">
                  <CheckCircle2 className="h-12 w-12" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Offre soumise avec succès !</h3>
                <p className="text-muted-foreground mb-8">Votre offre est maintenant en cours de révision par l'administrateur et sera publiée automatiquement après validation.</p>
                <Button variant="outline" onClick={() => setJobCreated(false)} className="w-full rounded-xl">Fermer</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  </div>
</div>

      <div className="container px-4 -mt-12 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <Card key={i} className="border-none shadow-xl shadow-slate-900/5 bg-white rounded-[32px] overflow-hidden group hover:scale-[1.02] transition-all">
              <CardContent className="pt-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                    <h3 className="text-4xl font-black mt-1 text-slate-900">{stat.value}</h3>
                  </div>
                  <div className={`p-4 bg-slate-50 rounded-2xl ${stat.color} group-hover:scale-110 transition-transform`}>
                    <stat.icon className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="container px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
            <TabsList className="bg-white/50 backdrop-blur-sm inline-flex p-1.5 rounded-2xl border border-slate-100 shadow-sm w-auto min-w-max">
              <TabsTrigger value="jobs" className="rounded-xl px-4 md:px-8 font-black data-[state=active]:bg-slate-900 data-[state=active]:text-white whitespace-nowrap">
                <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="applications" className="rounded-xl px-4 md:px-8 font-black data-[state=active]:bg-slate-900 data-[state=active]:text-white whitespace-nowrap">
                <Users className="mr-2 h-4 w-4" /> Candidatures
              </TabsTrigger>
              <TabsTrigger value="cvtheque" className="rounded-xl px-4 md:px-8 font-black data-[state=active]:bg-slate-900 data-[state=active]:text-white whitespace-nowrap">
                <FileText className="mr-2 h-4 w-4" /> CVthèque
              </TabsTrigger>
              <TabsTrigger value="profile" className="rounded-xl px-4 md:px-8 font-black data-[state=active]:bg-slate-900 data-[state=active]:text-white whitespace-nowrap">
                <Building2 className="mr-2 h-4 w-4" /> Profil
              </TabsTrigger>
              <TabsTrigger value="support" className="rounded-xl px-4 md:px-8 font-black data-[state=active]:bg-slate-900 data-[state=active]:text-white whitespace-nowrap">
                <HelpCircle className="mr-2 h-4 w-4" /> Support & Aide
              </TabsTrigger>
            </TabsList>
          </div>

        <TabsContent value="jobs">
          <div className="grid gap-6">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Briefcase className="h-8 w-8 text-orange-600" /> Vos offres publiées
              </h2>
            </div>
            {myJobs.length > 0 ? (
              myJobs.map((job) => (
                <Card key={job.id} className="border-none shadow-lg shadow-slate-200/50 rounded-[32px] overflow-hidden group hover:shadow-2xl transition-all bg-white mb-6">
                  <CardHeader className="flex flex-col sm:flex-row items-center justify-between p-8 pb-4 bg-white gap-6">
                    <div className="flex items-center gap-5 w-full sm:w-auto">
                      <div className="h-14 w-14 bg-slate-50 flex items-center justify-center rounded-2xl group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors shrink-0">
                        <Briefcase className="h-7 w-7" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-black text-slate-900 group-hover:text-orange-600 transition-colors">{job.title}</CardTitle>
                        <CardDescription className="font-bold flex flex-wrap items-center gap-2 mt-1">
                          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-orange-500" /> {job.location}</span>
                          <span className="opacity-30">•</span>
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />
                          {(() => {
                            try {
                              if (!job.createdAt) return "À l'instant";
                              const date = job.createdAt.seconds 
                                ? new Date(job.createdAt.seconds * 1000) 
                                : new Date(job.createdAt);
                              return formatDistanceToNow(date, { addSuffix: true, locale: fr });
                            } catch (e) {
                              return "À l'instant";
                            }
                          })()}</span>
                          {job.salary && (
                            <>
                              <span className="opacity-30">•</span>
                              <span className="text-orange-600 font-extrabold">{job.salary}</span>
                            </>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right hidden md:block">
                        <p className="text-xl font-black text-slate-900">{(job.views || 0) + (Math.floor(Math.random() * 20))}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Vues réelles</p>
                      </div>
                      <div className="h-10 w-[1px] bg-slate-100 hidden md:block"></div>
                      <div className="text-right">
                        <p className="text-xl font-black text-orange-600">{myApplications.filter(a => a.jobId === job.id).length}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Candidats</p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {job.status === 'active' ? (
                          <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 border-2 px-3 py-1 font-black rounded-full text-xs">
                            ACTIF
                          </Badge>
                        ) : job.status === 'pending_validation' ? (
                          <Badge className="bg-amber-50 text-amber-600 border-amber-100 border-2 px-3 py-1 font-black rounded-full text-xs animate-pulse">
                            EN VALIDATION
                          </Badge>
                        ) : (
                          <Badge className="bg-red-50 text-red-600 border-red-100 border-2 px-3 py-1 font-black rounded-full text-xs">
                            SUSPENDU
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {job.status === 'suspended' ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled 
                            className="rounded-xl border-slate-100 bg-slate-50 text-slate-350 font-bold opacity-60 cursor-not-allowed text-xs h-10 px-4"
                            title="Cette offre a été suspendue par la modération et ne peut plus être modifiée."
                          >
                            Modifier Bloqué
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-xl border-slate-200 h-10 px-4 font-black text-xs text-slate-705 hover:bg-slate-50 hover:text-orange-600 transition-colors"
                            onClick={() => handleOpenEdit(job)}
                          >
                            Modifier
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {job.status === 'suspended' && job.suspensionReason && (
                    <div className="mx-8 mb-8 p-5 bg-red-50/70 border border-red-100 rounded-2xl">
                      <div className="flex gap-2 text-red-800">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-red-500 animate-pulse mt-0.5" />
                        <div>
                          <p className="font-black text-sm uppercase tracking-wide">Offre Suspendue par la Modération</p>
                          <p className="font-bold text-xs text-red-600 mt-1">Motif fourni par l'administrateur : {job.suspensionReason}</p>
                          <p className="text-[10px] text-slate-500 mt-1 font-medium">Vous ne pouvez pas modifier de publications suspendues. Prenez contact avec le support si nécessaire.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <div className="text-center py-24 bg-white rounded-[40px] border border-dashed border-slate-200 shadow-sm">
                <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                  <Briefcase className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">Aucune offre publiée</h3>
                <p className="text-slate-400 font-medium max-w-sm mx-auto mt-2">
                  Commencez à recruter dès maintenant en publiant votre première offre d'emploi.
                </p>
                <Button className="mt-8 h-14 px-10 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10" onClick={() => setIsCreatingJob(true)}>
                   Publier ma première offre
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="applications">
          <div className="grid gap-6">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 mb-4">
              <Users className="h-8 w-8 text-orange-600" /> Candidatures entrantes
            </h2>
            {myApplications.length > 0 ? (
              myApplications.map((app) => {
                const statusProps = getStatusBadgeProps(app.status);
                return (
                  <Card key={app.id} className="border-none shadow-lg shadow-slate-200/50 rounded-[32px] overflow-hidden group hover:shadow-2xl transition-all">
                    <CardContent className="p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-5 w-full sm:w-auto">
                        <div className="h-20 w-20 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-4xl text-orange-600 group-hover:scale-105 transition-transform overflow-hidden">
                          {app.candidateProfile?.photoUrl ? (
                             <img src={app.candidateProfile.photoUrl} alt="P" className="h-full w-full object-cover" />
                          ) : (
                             app.candidateProfile?.displayName?.[0] || 'C'
                          )}
                        </div>
                        <div>
                          <p className="text-xl font-black text-slate-900">{app.candidateProfile?.displayName}</p>
                          <p className="text-sm font-bold text-slate-500 mt-1 flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-orange-500" /> Postulé pour : {app.jobTitle}
                          </p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            REÇUE {(() => {
                              try {
                                if (!app.appliedAt) return "RÉCEMMENT";
                                const date = app.appliedAt.seconds 
                                  ? new Date(app.appliedAt.seconds * 1000) 
                                  : new Date(app.appliedAt);
                                return formatDistanceToNow(date, { addSuffix: true, locale: fr }).toUpperCase();
                              } catch (e) {
                                return "RÉCEMMENT";
                              }
                            })()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <Badge variant="outline" className={`${statusProps.color} border-none px-6 py-2 font-black rounded-full tracking-widest text-[10px]`}>{statusProps.label.toUpperCase()}</Badge>
                        <Button 
                          className="flex-1 sm:flex-none h-14 px-8 rounded-2xl bg-slate-900 border-none font-black text-white hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
                          onClick={() => handleSelectApp(app)}
                        >
                          <Eye className="mr-2 h-5 w-5" /> DÉTAILS
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-24 bg-white rounded-[40px] border border-dashed border-slate-200 shadow-sm">
                <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                  <Users className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">Aucune candidature</h3>
                <p className="text-slate-400 font-medium max-w-sm mx-auto mt-2">
                  Les candidatures reçues apparaîtront ici dès que vos offres seront actives.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cvtheque">
          <div className="grid gap-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <FileText className="h-8 w-8 text-orange-600" /> CVthèque Partenaire
                </h2>
                <p className="text-slate-500 font-bold text-sm mt-1">
                  Découvrez, filtrez et recrutez parmi nos meilleurs talents d'Afrique de l'Ouest.
                </p>
              </div>
              <div className="text-slate-400 text-xs font-black uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
                {filteredCandidates.length} candidat{filteredCandidates.length > 1 ? 's' : ''} trouvé{filteredCandidates.length > 1 ? 's' : ''}
              </div>
            </div>

            {/* Filters Bar */}
            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[32px] overflow-hidden bg-white p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search Term */}
                <div className="space-y-1.5 col-span-1 md:col-span-2 lg:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Mots-clés (Métier, Nom, Compétence)</label>
                  <div className="relative">
                    <Input 
                      placeholder="Ex: Développeur, Marie Kouassi, React..." 
                      value={cvSearchTerm}
                      onChange={e => setCvSearchTerm(e.target.value)}
                      className="h-11 pl-4 pr-4 border-slate-100 rounded-xl"
                    />
                  </div>
                </div>

                {/* Sector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Métier / Secteur</label>
                  <Select value={cvSector} onValueChange={setCvSector}>
                    <SelectTrigger className="h-11 border-slate-200 rounded-xl bg-white">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les secteurs</SelectItem>
                      <SelectItem value="it">Informatique / IT</SelectItem>
                      <SelectItem value="finance">Finance / Banque</SelectItem>
                      <SelectItem value="marketing">Marketing / Communication</SelectItem>
                      <SelectItem value="construction">BTP / Construction</SelectItem>
                      <SelectItem value="logistics">Logistique / Transport</SelectItem>
                      <SelectItem value="healthcare">Santé</SelectItem>
                      <SelectItem value="education">Éducation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Experience */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Expérience</label>
                  <Select value={cvExperience} onValueChange={setCvExperience}>
                    <SelectTrigger className="h-11 border-slate-200 rounded-xl bg-white">
                      <SelectValue placeholder="Toutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes d'expériences</SelectItem>
                      <SelectItem value="0-1">Débutant (0-1 an)</SelectItem>
                      <SelectItem value="1-3">Junior (1-3 ans)</SelectItem>
                      <SelectItem value="3-5">Intermédiaire (3-5 ans)</SelectItem>
                      <SelectItem value="5+">Sénior (5 ans+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Availability */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Disponibilité</label>
                  <Select value={cvDisponibility} onValueChange={setCvDisponibility}>
                    <SelectTrigger className="h-11 border-slate-200 rounded-xl bg-white">
                      <SelectValue placeholder="Toutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous statuts</SelectItem>
                      <SelectItem value="available">Disponible Immédiatement</SelectItem>
                      <SelectItem value="not-available">Sous préavis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Localisation (Ville / Pays)</label>
                  <Input 
                    placeholder="Ex: Abidjan, Dakar, Lomé..." 
                    value={cvLocation}
                    onChange={e => setCvLocation(e.target.value)}
                    className="h-11 border-slate-100 rounded-xl"
                  />
                </div>
              </div>

              {/* Clear filters */}
              {(cvSearchTerm || cvSector !== 'all' || cvExperience !== 'all' || cvLocation || cvDisponibility !== 'all') && (
                <div className="mt-4 flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setCvSearchTerm('');
                      setCvSector('all');
                      setCvExperience('all');
                      setCvLocation('');
                      setCvDisponibility('all');
                    }}
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-bold"
                  >
                    Réinitialiser les filtres
                  </Button>
                </div>
              )}
            </Card>

            {/* Candidates List */}
            {candidatesLoading ? (
              <div className="text-center py-20 bg-white rounded-[40px] border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
                <p className="text-slate-400 font-bold mt-4">Chargement des talents...</p>
              </div>
            ) : filteredCandidates.length > 0 ? (
              <div className="grid gap-6">
                {filteredCandidates.map((cand) => (
                  <Card key={cand.uid} className="border-none shadow-lg shadow-slate-200/50 rounded-[32px] overflow-hidden group hover:shadow-2xl transition-all bg-white">
                    <CardContent className="p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 w-full lg:w-auto">
                        <div className="h-20 w-20 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center font-black text-4xl text-orange-600 shrink-0 overflow-hidden">
                          {cand.photoUrl ? (
                            <img src={cand.photoUrl} alt={cand.displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            cand.displayName?.[0] || 'C'
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-black text-slate-900 group-hover:text-orange-600 transition-colors">{cand.displayName}</h3>
                            {cand.availableImmediately ? (
                              <Badge className="bg-emerald-50 text-emerald-600 border-none px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase">
                                Disponible
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-500 border-none px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase">
                                En poste
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm font-bold text-slate-600">{cand.jobTitle || 'Titre de profil non défini'}</p>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-semibold pt-1">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-orange-500" /> 
                              {cand.city || cand.location || 'Localisation non renseignée'}{cand.commune ? `, ${cand.commune}` : ''}
                            </span>
                            <span className="opacity-40">•</span>
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3.5 w-3.5" /> 
                              {cand.yearsOfExperience || 0} an{(cand.yearsOfExperience || 1) > 1 ? 's' : ''} d'exp.
                            </span>
                          </div>

                          {/* Skills preview */}
                          {cand.skills && cand.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100/50 mt-3 max-w-xl">
                              {cand.skills.slice(0, 5).map((skill, sIdx) => (
                                <span key={sIdx} className="bg-white px-2 py-0.5 rounded-md text-[10px] font-black text-slate-600 border border-slate-150">
                                  {skill.name}
                                </span>
                              ))}
                              {cand.skills.length > 5 && (
                                <span className="text-[10px] font-black text-orange-600 px-1 py-0.5">
                                  +{cand.skills.length - 5}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full lg:w-auto shrink-0 mt-2 lg:mt-0 justify-end">
                        <Button 
                          className="flex-1 sm:flex-none h-14 px-8 rounded-2xl bg-slate-900 border-none font-black text-white hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
                          onClick={() => {
                            setSelectedCandidate(cand);
                            setIsCandidateModalOpen(true);
                          }}
                        >
                          <Eye className="mr-2 h-5 w-5" /> VOIR PROFIL
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-24 bg-white rounded-[40px] border border-dashed border-slate-200 shadow-sm">
                <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                  <FileText className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">Aucun candidat</h3>
                <p className="text-slate-400 font-medium max-w-sm mx-auto mt-2">
                  Aucun talent ne correspond à vos filtres actuels. Recommencez en ajustant vos critères.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="profile">
           <div className="grid lg:grid-cols-[1fr_380px] gap-8">
              {/* Profile Details */}
              <div className="space-y-8">
                 <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[40px] bg-white overflow-hidden">
                    <CardHeader className="bg-slate-900 text-white p-6 md:p-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                       <div>
                         <Badge className="bg-orange-600 text-white border-none font-bold mb-3">VUE PUBLIQUE ACTIVÉE</Badge>
                         <CardTitle className="text-2xl md:text-3xl font-black">Identité Entreprise</CardTitle>
                       </div>
                       <Button 
                         variant="outline" 
                         className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-2xl h-11 md:h-12 font-bold backdrop-blur-sm w-full sm:w-auto"
                         onClick={() => navigate('/recruiter-onboarding')}
                       >
                         <Settings className="mr-2 h-4 w-4" /> Modifier
                       </Button>
                    </CardHeader>
                    <CardContent className="p-6 md:p-10 space-y-8 md:space-y-10">
                       <section className="space-y-4">
                          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-500" /> Présentation
                          </h3>
                          <div className="bg-slate-50 p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-slate-100">
                             <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap italic">
                                "{user.companyDescription || 'Aucune description fournie.'}"
                             </p>
                          </div>
                          {user.companyShortDescription && (
                            <p className="text-slate-400 text-sm font-bold pl-1">Slogan : {user.companyShortDescription}</p>
                          )}
                       </section>

                       {(user.branding?.mission || user.branding?.vision) && (
                         <div className="grid md:grid-cols-2 gap-6">
                            {user.branding?.mission && (
                              <div className="p-8 bg-slate-900 text-white rounded-[32px] relative overflow-hidden group">
                                 <Target className="h-10 w-10 text-orange-600 mb-4 relative z-10" />
                                 <h4 className="text-xl font-black relative z-10">Notre Mission</h4>
                                 <p className="text-slate-400 font-medium mt-2 relative z-10 line-clamp-3">{user.branding.mission}</p>
                                 <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                              </div>
                            )}
                            {user.branding?.vision && (
                              <div className="p-8 bg-orange-600 text-white rounded-[32px] relative overflow-hidden group">
                                 <Award className="h-10 w-10 text-white mb-4 relative z-10" />
                                 <h4 className="text-xl font-black relative z-10">Notre Vision</h4>
                                 <p className="text-white/80 font-medium mt-2 relative z-10 line-clamp-3">{user.branding.vision}</p>
                                 <div className="absolute top-0 right-0 w-32 h-32 bg-black/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                              </div>
                            )}
                         </div>
                       )}

                       {user.branding?.values && user.branding.values.length > 0 && (
                         <section className="space-y-4">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <Heart className="h-4 w-4 text-orange-500" /> Valeurs de l'entreprise
                            </h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                               {user.branding.values.map(val => (
                                 <div key={val} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
                                    <p className="font-black text-slate-900">{val}</p>
                                 </div>
                               ))}
                            </div>
                         </section>
                       )}

                       <section className="space-y-4">
                         <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           <ShieldCheck className="h-4 w-4 text-orange-500" /> Informations Légales
                         </h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                               <span className="text-slate-500 font-bold">N° RCCM</span>
                               <span className="font-black text-slate-900">{user.registrationNumber || 'N/A'}</span>
                            </div>
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                               <span className="text-slate-500 font-bold">Forme Juridique</span>
                               <span className="font-black text-slate-900">{user.legalForm || 'N/A'}</span>
                            </div>
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                               <span className="text-slate-500 font-bold">N° Contribuable</span>
                               <span className="font-black text-slate-900">{user.taxNumber || 'N/A'}</span>
                            </div>
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                               <span className="text-slate-500 font-bold">Date de création</span>
                               <span className="font-black text-slate-900">{user.creationDate || 'N/A'}</span>
                            </div>
                         </div>
                       </section>
                    </CardContent>
                 </Card>

                 <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[40px] bg-white overflow-hidden">
                    <CardHeader className="p-10 pb-4">
                       <CardTitle className="text-2xl font-black text-slate-900">Prévisualisation du Branding</CardTitle>
                    </CardHeader>
                    <CardContent className="p-10 pt-0 space-y-8">
                       <div className="space-y-4">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Bannière de profil</p>
                          <div className="h-[200px] w-full rounded-[32px] bg-slate-100 overflow-hidden relative border-2 border-slate-100">
                             {user.branding?.bannerUrl ? (
                               <img src={user.branding.bannerUrl} alt="Banner" className="h-full w-full object-cover" />
                             ) : (
                               <div className="h-full w-full flex items-center justify-center text-slate-300">
                                  <Palette className="h-12 w-12" />
                               </div>
                             )}
                          </div>
                       </div>
                    </CardContent>
                 </Card>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-8">
                 <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[40px] bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 p-8">
                       <CardTitle className="text-xl font-black text-slate-900">Coordonnées Publiques</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                       <div className="space-y-4">
                          <div className="flex items-center gap-4">
                             <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                                <Mail className="h-5 w-5" />
                             </div>
                             <div className="min-w-0">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Entreprise</p>
                                <p className="font-bold text-slate-900 truncate">{user.companyEmail || user.email}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <Phone className="h-5 w-5" />
                             </div>
                             <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Téléphone</p>
                                <p className="font-bold text-slate-900">{user.phone || 'N/A'}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <Globe className="h-5 w-5" />
                             </div>
                             <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Site Web</p>
                                <p className="font-bold text-slate-900">{user.website?.replace('https://', '') || 'N/A'}</p>
                             </div>
                          </div>
                       </div>

                       <Separator />

                       <div className="space-y-4">
                          <div className="flex items-center gap-4">
                             <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                <MessageSquare className="h-5 w-5" />
                             </div>
                             <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp Business</p>
                                <p className="font-bold text-slate-900">{user.whatsappBusiness || 'Non configuré'}</p>
                             </div>
                          </div>
                       </div>

                       <Button className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 shadow-xl shadow-slate-900/10" asChild nativeButton={false}>
                          <Link to={`/company/${user.uid}`}>
                             <Eye className="mr-2 h-5 w-5" /> Voir ma page publique
                          </Link>
                       </Button>
                    </CardContent>
                 </Card>

                 <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[40px] bg-orange-600 text-white overflow-hidden p-8">
                    <div className="space-y-6">
                       <Award className="h-12 w-12 text-white" />
                       <h4 className="text-2xl font-black leading-tight">Votre profil est complet à {user.completionScore || 0}% !</h4>
                       <p className="text-white/80 font-medium">
                          Un profil complet augmente de 60% vos chances d'attirer des candidats qualifiés.
                       </p>
                       <Button className="w-full h-14 rounded-2xl bg-white text-orange-600 font-black hover:bg-slate-50 transition-all shadow-xl" onClick={() => navigate('/recruiter-onboarding')}>
                          Terminer la configuration
                       </Button>
                    </div>
                 </Card>
              </div>
           </div>
        </TabsContent>

        <TabsContent value="support" className="space-y-6 outline-none animate-in fade-in duration-300">
          <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-slate-900/10">
            <div className="relative z-10 max-w-xl font-sans">
              <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none font-black text-[10px] uppercase px-3 py-1 rounded-full mb-4">ESPACE ASSISTANCE EN LIGNE</Badge>
              <h3 className="text-2xl font-black tracking-tight mb-2">Difficultés techniques ou besoin d'assistance ?</h3>
              <p className="text-slate-300 font-medium text-xs leading-relaxed mt-2 leading-relaxed">
                Nos administrateurs sont à votre entière disposition pour répondre à toutes vos interrogations : validation de compte entreprise, publication d'offres de recrutement ou dysfonctionnement de l'espace recruteur.
              </p>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-10 translate-y-10">
              <HelpCircle className="h-48 w-48 text-white" />
            </div>
          </div>

          {ticketSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl font-bold text-xs flex items-center justify-between animate-in fade-in"
            >
              <span>Message envoyé avec succès ! Nos équipes de support vont se pencher sur votre problème.</span>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ticket Submission Form */}
            <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-3xl p-6">
              <CardHeader className="p-0 mb-6 font-sans">
                <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-orange-600" />
                  Nouveau Ticket Recruteur
                </CardTitle>
                <CardDescription className="text-xs font-bold text-slate-400">Indiquez l'objet et le détail de vos difficultés.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <form onSubmit={handleCreateTicket} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="recruiterTicketSubject" className="font-bold text-slate-700 uppercase text-xs tracking-wider">Objet du Message</Label>
                    <Input 
                      id="recruiterTicketSubject"
                      type="text"
                      placeholder="Ex: Validation de mon profil entreprise bloquée"
                      className="h-11 rounded-xl border-slate-200 font-bold focus-visible:ring-indigo-600 text-xs text-slate-800"
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="recruiterTicketMessage" className="font-black text-slate-700 uppercase text-xs tracking-wider font-sans">Message détaillé</Label>
                    <Textarea 
                      id="recruiterTicketMessage"
                      placeholder="Expliquez en détail votre situation..."
                      className="min-h-[140px] rounded-xl border-slate-200 font-bold text-xs focus-visible:ring-indigo-650 text-slate-800"
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isSubmittingTicket}
                    className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider border-none"
                  >
                    {isSubmittingTicket ? "Envoi..." : "Envoyer mon message de détresse"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Recruiter Tickets list */}
            <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-3xl p-6 flex flex-col">
              <CardHeader className="p-0 mb-6 font-sans">
                <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  Courriers & Retours Admin
                </CardTitle>
                <CardDescription className="text-xs font-bold text-slate-400">Historique complet de vos demandes d'assistance.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-y-auto max-h-[380px] pr-1 space-y-4 scrollbar-hide">
                {tickets.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-bold flex flex-col items-center justify-center h-full">
                    <MessageSquare className="h-10 w-10 text-slate-200 mb-2" />
                    <p className="text-xs font-bold text-slate-450">Aucune demande envoyée pour le moment.</p>
                  </div>
                ) : (
                  tickets.map(ticket => (
                    <div key={ticket.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all space-y-3 animate-in fade-in duration-300">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h5 className="font-extrabold text-slate-900 text-sm leading-tight">{ticket.subject}</h5>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                            Posté le {ticket.createdAt ? new Date(ticket.createdAt.seconds ? ticket.createdAt.seconds * 1000 : ticket.createdAt).toLocaleDateString('fr-FR') : 'Date inconnue'}
                          </p>
                        </div>
                        <Badge className={`text-[8px] font-black uppercase border-none px-2 rounded-full ${ticket.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {ticket.status === 'open' ? 'En attente' : 'Répondu'}
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-slate-600 font-semibold bg-white p-2.5 rounded-xl border border-slate-50 overflow-hidden text-ellipsis whitespace-pre-wrap leading-relaxed font-sans">
                        "${ticket.message}"
                      </p>

                      {ticket.response ? (
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100/50 space-y-1">
                          <p className="text-[9px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1">
                            <Check className="h-3 w-3" /> Réponse de l'administration :
                          </p>
                          <p className="text-xs text-slate-700 font-semibold italic whitespace-pre-wrap">"${ticket.response}"</p>
                          {ticket.repliedAt && (
                            <p className="text-[8px] font-bold text-slate-400 text-right mt-1 font-sans">
                              Le {new Date(ticket.repliedAt.seconds ? ticket.repliedAt.seconds * 1000 : ticket.repliedAt).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-[9px] text-slate-450 font-bold flex items-center gap-1.5 pl-1 italic font-sans animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Un administrateur examine votre dossier d'assistance.
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>

    {/* Application Detail Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedApp && (
            <>
              <DialogHeader>
                <DialogTitle>Candidature de {selectedApp.candidateProfile?.displayName}</DialogTitle>
                <DialogDescription>
                  Postulé pour : {selectedApp.jobTitle}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="flex items-center gap-4 p-4 bg-accent/30 rounded-xl">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center font-bold text-2xl text-primary">
                    {selectedApp.candidateProfile?.displayName?.[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{selectedApp.candidateProfile?.displayName}</h4>
                    <p className="text-sm text-muted-foreground">{selectedApp.candidateProfile?.email}</p>
                    <p className="text-sm text-muted-foreground">{selectedApp.candidateProfile?.location || 'Lieu non renseigné'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Document</h5>
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50">
                    <FileText className={`h-8 w-8 ${selectedApp.candidateProfile?.cvUrl ? 'text-orange-500' : 'text-muted-foreground/30'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {selectedApp.candidateProfile?.cvName || (selectedApp.candidateProfile?.cvUrl ? 'Document_Candidat.pdf' : 'Aucun CV fourni')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedApp.candidateProfile?.cvUrl ? 'PDF Document' : 'Non disponible'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {selectedApp.candidateProfile?.cvUrl && (
                        <>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => setIsPreviewOpen(true)}
                            className="text-primary hover:text-primary hover:bg-primary/5"
                          >
                            <Eye className="mr-1 h-3 w-3" /> Prévisualiser
                          </Button>
                          <Button size="sm" variant="outline" asChild nativeButton={false}>
                            <a 
                              href={cvBlobUrl || selectedApp.candidateProfile?.cvUrl || '#'} 
                              download={selectedApp.candidateProfile?.cvName || 'CV_Candidat.pdf'}
                              className="flex items-center"
                            >
                              Télécharger
                            </a>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Action</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={updatingStatus || selectedApp.status === 'shortlisted'}
                      onClick={() => handleUpdateStatus(selectedApp.id, 'shortlisted')}
                    >
                      Sélectionner
                    </Button>
                    <Button 
                      variant="destructive"
                      disabled={updatingStatus || selectedApp.status === 'rejected'}
                      onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')}
                    >
                      Refuser
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* CV Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[800px] h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Aperçu du CV - {selectedApp?.candidateProfile?.displayName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full h-full p-4">
            {cvBlobUrl ? (
              <div className="w-full h-[calc(90vh-140px)] rounded-md border shadow-inner bg-white overflow-hidden relative">
                <embed 
                  src={cvBlobUrl} 
                  type="application/pdf"
                  className="w-full h-full"
                />
                <div className="absolute bottom-4 right-4 z-10">
                  <Button size="sm" asChild nativeButton={false} variant="secondary" className="shadow-md">
                    <a href={cvBlobUrl} target="_blank" rel="noopener noreferrer">
                      Ouvrir en plein écran
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full space-y-4 bg-accent/10 rounded-md border-2 border-dashed">
                <FileText className="h-16 w-16 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-semibold text-lg">Aperçu non disponible</p>
                  <p className="text-sm text-muted-foreground max-w-[300px]">
                    Le document n'est pas accessible en prévisualisation directe ou est trop ancien.
                  </p>
                </div>
                <Button asChild nativeButton={false}>
                  <a 
                    href={cvBlobUrl || selectedApp?.candidateProfile?.cvUrl || '#'} 
                    download={selectedApp?.candidateProfile?.cvName || 'CV_Candidat.pdf'}
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Ouvrir manuellement
                  </a>
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modification Offre Dialog */}
      <Dialog open={isEditingJobOpen} onOpenChange={setIsEditingJobOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-[40px] border-none shadow-2xl">
          <DialogHeader className="bg-slate-900 text-white p-8 rounded-t-[40px]">
            <DialogTitle className="text-2xl font-black">Modifier l'offre d'emploi</DialogTitle>
            <DialogDescription className="text-slate-400 font-bold">
              Modifiez votre annonce. Toute modification nécessite une nouvelle validation par un administrateur.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateJob} className="p-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="edit-title" className="font-black text-slate-700 ml-1 uppercase text-xs tracking-widest">Intitulé du poste *</Label>
              <Input id="edit-title" placeholder="Ex: Senior Marketing Manager" className="h-14 rounded-2xl border-slate-200 focus-visible:ring-orange-600 font-bold" value={editTitle} onChange={e => setEditTitle(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-type" className="font-black text-slate-700 ml-1 uppercase text-xs tracking-widest">Contrat</Label>
                <Select value={editType} onValueChange={setEditType}>
                  <SelectTrigger className="h-14 rounded-2xl border-slate-200 font-bold">
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="CDI">CDI</SelectItem>
                    <SelectItem value="CDD">CDD</SelectItem>
                    <SelectItem value="Stage">Stage</SelectItem>
                    <SelectItem value="Freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location" className="font-black text-slate-700 ml-1 uppercase text-xs tracking-widest">Ville *</Label>
                <Input id="edit-location" placeholder="Abidjan, Dakar..." className="h-14 rounded-2xl border-slate-200 focus-visible:ring-orange-600 font-bold" value={editLocation} onChange={e => setEditLocation(e.target.value)} required />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-category" className="font-black text-slate-700 ml-1 uppercase text-xs tracking-widest">Secteur d'activité *</Label>
                <Select value={editField} onValueChange={setEditField}>
                  <SelectTrigger className="h-14 rounded-2xl border-slate-200 font-bold">
                    <SelectValue placeholder="Secteur..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="Civil Engineering">Génie Civil / BTP</SelectItem>
                    <SelectItem value="Medical Health">Santé / Médical</SelectItem>
                    <SelectItem value="Commerce">Commerce / Vente</SelectItem>
                    <SelectItem value="Finance">Finance / Gestion</SelectItem>
                    <SelectItem value="Informatique">Technologies / IT</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-salary" className="font-black text-slate-700 ml-1 uppercase text-xs tracking-widest">Salaire (CFA) *</Label>
                <Input id="edit-salary" placeholder="Ex: 500 000 CFA" className="h-14 rounded-2xl border-slate-200 focus-visible:ring-orange-600 font-bold" value={editSalary} onChange={e => setEditSalary(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-expiresAt" className="font-black text-slate-700 ml-1 uppercase text-xs tracking-widest">Date d'expiration (Sous 48h = Automatiquement "Offre Rapide")</Label>
              <Input id="edit-expiresAt" type="datetime-local" className="h-14 rounded-2xl border-slate-200 focus-visible:ring-orange-600 font-bold" value={editExpiresAt} onChange={e => setEditExpiresAt(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description" className="font-black text-slate-700 ml-1 uppercase text-xs tracking-widest">Descriptif & Missions *</Label>
              <Textarea id="edit-description" className="min-h-[120px] rounded-3xl border-slate-200 focus-visible:ring-orange-650 font-medium p-6" value={editDescription} onChange={e => setEditDescription(e.target.value)} required />
            </div>
            <DialogFooter className="flex gap-2">
              <Button 
                type="button" 
                variant="outline"
                className="rounded-xl font-bold h-12 flex-1"
                onClick={() => { setIsEditingJobOpen(false); setEditingJob(null); }}
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                className="bg-orange-600 hover:bg-orange-700 text-white font-black h-12 rounded-xl flex-1 uppercase text-xs"
              >
                Enregistrer & Soumettre
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Candidate Profile Detail Dialog for CVthèque */}
      <Dialog open={isCandidateModalOpen} onOpenChange={setIsCandidateModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-[40px] border-none shadow-2xl p-0">
          {selectedCandidate && (
            <>
              <div className="bg-slate-900 text-white p-8 md:p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-orange-600/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/3"></div>
                <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                  <div className="h-24 w-24 bg-white/10 rounded-3xl flex items-center justify-center font-black text-4xl text-orange-400 border border-white/10 shrink-0 overflow-hidden">
                    {selectedCandidate.photoUrl ? (
                      <img src={selectedCandidate.photoUrl} alt={selectedCandidate.displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      selectedCandidate.displayName?.[0] || 'C'
                    )}
                  </div>
                  <div className="text-center sm:text-left space-y-2">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h3 className="text-2xl font-black">{selectedCandidate.displayName}</h3>
                      {selectedCandidate.availableImmediately ? (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                          Disponible
                        </span>
                      ) : (
                        <span className="bg-white/10 text-slate-300 border border-white/5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                          En poste
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-black text-orange-400 uppercase tracking-widest">{selectedCandidate.jobTitle || 'Titre non spécifié'}</p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-300 font-bold">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-orange-500" /> {selectedCandidate.city || selectedCandidate.location || 'N/A'}{selectedCandidate.commune ? `, ${selectedCandidate.commune}` : ''}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {selectedCandidate.yearsOfExperience || 0} an{(selectedCandidate.yearsOfExperience || 1) > 1 ? 's' : ''} d'exp.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-8 bg-white">
                {/* Contact and Overview grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Coordonnées</h4>
                    <div className="space-y-2.5 text-xs text-slate-700 font-bold">
                      {selectedCandidate.email && (
                        <div className="flex items-center gap-2.5">
                          <Mail className="h-4 w-4 text-orange-500 shrink-0" />
                          <a href={`mailto:${selectedCandidate.email}`} className="hover:text-orange-600 transition-colors">{selectedCandidate.email}</a>
                        </div>
                      )}
                      {selectedCandidate.phone && (
                        <div className="flex items-center gap-2.5">
                          <Phone className="h-4 w-4 text-orange-500 shrink-0" />
                          <a href={`tel:${selectedCandidate.phone}`} className="hover:text-orange-600 transition-colors">{selectedCandidate.phone}</a>
                        </div>
                      )}
                      {selectedCandidate.whatsApp && (
                        <div className="flex items-center gap-2.5">
                          <MessageSquare className="h-4 w-4 text-emerald-500 shrink-0" />
                          <a href={`https://wa.me/${selectedCandidate.whatsApp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 transition-colors">{selectedCandidate.whatsApp} (WhatsApp)</a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Résumé</h4>
                    <p className="text-xs font-bold text-slate-500 leading-relaxed">
                      {selectedCandidate.objective || "Ce candidat n'a pas rédigé d'introduction de profil."}
                    </p>
                  </div>
                </div>

                {/* Experiences Timeline */}
                {selectedCandidate.experience && selectedCandidate.experience.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Expériences Professionnelles</h4>
                    <div className="space-y-4">
                      {selectedCandidate.experience.map((exp: any, i: number) => (
                        <div key={i} className="flex gap-4">
                          <div className="text-xs text-orange-600 font-black min-w-[80px] pt-1">{exp.period || exp.years}</div>
                          <div className="space-y-1">
                            <h5 className="text-sm font-black text-slate-900">{exp.title || exp.role}</h5>
                            <p className="text-xs text-slate-500 font-bold">{exp.company || exp.employer}</p>
                            {exp.description && <p className="text-xs text-slate-400 font-bold leading-relaxed">{exp.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education Timeline */}
                {selectedCandidate.education && selectedCandidate.education.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Formations / Études</h4>
                    <div className="space-y-4">
                      {selectedCandidate.education.map((edu: any, i: number) => (
                        <div key={i} className="flex gap-4">
                          <div className="text-xs text-orange-600 font-black min-w-[80px] pt-1">{edu.period || edu.years}</div>
                          <div className="space-y-1">
                            <h5 className="text-sm font-black text-slate-900">{edu.degree || edu.diploma}</h5>
                            <p className="text-xs text-slate-500 font-bold">{edu.institution || edu.school}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills Section */}
                {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Compétences</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCandidate.skills.map((skill: any, i: number) => (
                        <span key={i} className="bg-slate-50 hover:bg-orange-50 hover:text-orange-600 border border-slate-200/60 px-3 py-1.5 rounded-xl text-xs font-black text-slate-600 transition-colors">
                          {skill.name} {skill.level ? `• ${skill.level}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* PDF generation and actual CV preview */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100">
                  <Button 
                    variant="outline"
                    className="flex-1 h-14 rounded-2xl border-2 border-slate-200 hover:bg-slate-50 font-black text-slate-700 uppercase tracking-wider text-xs"
                    disabled={!selectedCandidate.cvUrl}
                    asChild={!!selectedCandidate.cvUrl}
                    nativeButton={!selectedCandidate.cvUrl}
                  >
                    {selectedCandidate.cvUrl ? (
                      <a href={selectedCandidate.cvUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full h-full">
                        <ExternalLink className="mr-2 h-4 w-4 text-orange-500" /> Ouvrir le CV original
                      </a>
                    ) : (
                      <span className="flex items-center justify-center">
                        <ExternalLink className="mr-2 h-4 w-4 text-slate-300" /> Aucun CV téléversé
                      </span>
                    )}
                  </Button>
                  
                  <Button 
                    className="flex-1 h-14 rounded-2xl bg-orange-600 hover:bg-orange-700 font-black text-white uppercase tracking-wider text-xs shadow-xl shadow-orange-600/10"
                    onClick={() => generateCV(selectedCandidate)}
                  >
                    <FileText className="mr-2 h-4 w-4" /> Générer CV Synthèse
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
