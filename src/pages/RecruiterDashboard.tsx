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
  Palette
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
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
  increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Job, Application } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function RecruiterDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [jobCreated, setJobCreated] = useState(false);
  const [activeTab, setActiveTab] = useState('jobs');
  
  // Form state
  const [jobTitle, setJobTitle] = useState('');
  const [jobType, setJobType] = useState('CDI');
  const [jobLocation, setJobLocation] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobField, setJobField] = useState('Informatique');
  const [jobSalary, setJobSalary] = useState('');

  // Data state
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [cvBlobUrl, setCvBlobUrl] = useState<string | null>(null);

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
          collection(db, 'jobs'),
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

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsCreatingJob(true);
    try {
      const jobData = {
        recruiterId: user.uid,
        companyName: user.companyName || user.displayName,
        title: jobTitle,
        description: jobDescription,
        location: jobLocation,
        type: jobType,
        field: jobField,
        salary: jobSalary,
        status: 'active',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'jobs'), jobData);
      setJobCreated(true);
      
      // Update local state
      setMyJobs([{ id: docRef.id, ...jobData } as any, ...myJobs]);
      
      // Reset form
      setJobTitle('');
      setJobLocation('');
      setJobDescription('');
      setJobSalary('');
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
                <h1 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight">{user.companyName || user.displayName}</h1>
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 md:gap-4 mt-3 text-slate-400 font-bold text-sm md:text-base">
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
                className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-11 md:h-12 rounded-xl md:rounded-2xl font-bold backdrop-blur-sm flex-1 md:flex-none"
                onClick={() => navigate('/recruiter-onboarding')}
              >
                <Settings className="mr-2 h-4 w-4" /> Paramètres
              </Button>
              <Dialog onOpenChange={(open) => { if (!open) setJobCreated(false); }}>
                <DialogTrigger asChild nativeButton={true}>
                  <Button className="h-11 md:h-12 px-6 md:px-8 rounded-xl md:rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-xl shadow-orange-600/20 border-none flex-1 md:flex-none">
                    <Plus className="mr-2 h-5 w-5" /> Publier
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-[40px] border-none shadow-2xl">
                  {/* ... contents same ... */}
            {!jobCreated ? (
              <>
                <DialogHeader className="bg-slate-900 text-white p-8 rounded-t-[40px]">
                  <DialogTitle className="text-2xl font-black">Publier une offre d'emploi</DialogTitle>
                  <DialogDescription className="text-slate-400 font-bold">
                    Attirez les meilleurs talents africains.
                  </DialogDescription>
                </DialogHeader>
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
                  <div className="space-y-2">
                    <Label htmlFor="description" className="font-black text-slate-700 ml-1 uppercase text-xs tracking-widest">Descriptif & Missions *</Label>
                    <Textarea id="description" className="min-h-[150px] rounded-3xl border-slate-200 focus-visible:ring-orange-600 font-medium p-6" placeholder="Qu'attendez-vous du candidat idéal ?" value={jobDescription} onChange={e => setJobDescription(e.target.value)} required />
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full h-16 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-xl shadow-orange-600/20 border-none transition-all" disabled={isCreatingJob}>
                      {isCreatingJob ? "PUBLICATION..." : "PUBLIER L'OFFRE"}
                    </Button>
                  </DialogFooter>
                </form>
              </>
            ) : (
              <div className="py-12 text-center">
                <div className="inline-flex items-center justify-center p-4 bg-green-100 text-green-700 rounded-full mb-6">
                  <CheckCircle2 className="h-12 w-12" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Offre publiée avec succès !</h3>
                <p className="text-muted-foreground mb-8">Votre offre est maintenant visible par tous les candidats d'AfriJob.</p>
                <Button variant="outline" onClick={() => setJobCreated(false)} className="w-full">Fermer</Button>
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
              <TabsTrigger value="profile" className="rounded-xl px-4 md:px-8 font-black data-[state=active]:bg-slate-900 data-[state=active]:text-white whitespace-nowrap">
                <Building2 className="mr-2 h-4 w-4" /> Profil
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
                <Card key={job.id} className="border-none shadow-lg shadow-slate-200/50 rounded-[32px] overflow-hidden group hover:shadow-2xl transition-all">
                  <CardHeader className="flex flex-col sm:flex-row items-center justify-between p-8 bg-white gap-6">
                    <div className="flex items-center gap-5 w-full sm:w-auto">
                      <div className="h-14 w-14 bg-slate-50 flex items-center justify-center rounded-2xl group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                        <Briefcase className="h-7 w-7" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-black text-slate-900 group-hover:text-orange-600 transition-colors">{job.title}</CardTitle>
                        <CardDescription className="font-bold flex items-center gap-2 mt-1">
                          <MapPin className="h-3.5 w-3.5 text-orange-500" /> {job.location}
                          <span className="opacity-30 mx-1">•</span>
                          <Clock className="h-3.5 w-3.5" />
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
                          })()}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 w-full sm:w-auto">
                      <div className="text-right hidden md:block">
                        <p className="text-xl font-black text-slate-900">{(job.views || 0) + (Math.floor(Math.random() * 20))}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Vues réelles</p>
                      </div>
                      <div className="h-10 w-[1px] bg-slate-100 hidden md:block"></div>
                      <div className="text-right hidden sm:block">
                        <p className="text-xl font-black text-orange-600">{myApplications.filter(a => a.jobId === job.id).length}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Candidats</p>
                      </div>
                      <Badge className={`${job.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400'} border-2 px-4 py-1 font-black rounded-full`}>
                        {job.status === 'active' ? 'ACTIF' : 'CLOS'}
                      </Badge>
                      <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-900 hover:text-white h-12 w-12 transition-all">
                        <ChevronRight className="h-6 w-6" />
                      </Button>
                    </div>
                  </CardHeader>
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

                       <Button className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 shadow-xl shadow-slate-900/10" asChild>
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
                  <Button size="sm" asChild variant="secondary" className="shadow-md" nativeButton={false}>
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
    </div>
  );
}
