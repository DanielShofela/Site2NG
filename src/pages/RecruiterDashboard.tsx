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
import { Plus, Users, Briefcase, TrendingUp, ChevronRight, Eye, CheckCircle2, Clock, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
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
    <div className="container py-10 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Espace {user.companyName}</h1>
          <p className="text-muted-foreground mt-1">Gérez vos offres et vos candidats en un coup d'œil.</p>
        </div>
        
        <Dialog onOpenChange={(open) => { if (!open) setJobCreated(false); }}>
          <DialogTrigger asChild nativeButton={true}>
            <Button className="h-12 px-6 rounded-full shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-5 w-5" /> Publier une offre
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            {!jobCreated ? (
              <>
                <DialogHeader>
                  <DialogTitle>Publier une nouvelle offre d'emploi</DialogTitle>
                  <DialogDescription>
                    Remplissez les détails du poste pour attirer les meilleurs talents.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateJob} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Intitulé du poste</Label>
                    <Input id="title" placeholder="Ex: Développeur PHP Senior" value={jobTitle} onChange={e => setJobTitle(e.target.value)} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Type de contrat</Label>
                      <Select value={jobType} onValueChange={setJobType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CDI">CDI</SelectItem>
                          <SelectItem value="CDD">CDD</SelectItem>
                          <SelectItem value="Stage">Stage</SelectItem>
                          <SelectItem value="Freelance">Freelance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Localisation</Label>
                      <Input id="location" placeholder="Ville, Pays" value={jobLocation} onChange={e => setJobLocation(e.target.value)} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label htmlFor="field">Secteur</Label>
                       <Input id="field" placeholder="Ex: Informatique" value={jobField} onChange={e => setJobField(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor="salary">Salaire (Optionnel)</Label>
                       <Input id="salary" placeholder="Ex: 500k FCFA" value={jobSalary} onChange={e => setJobSalary(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description et missions</Label>
                    <Textarea id="description" className="min-h-[150px]" placeholder="Détaillez le rôle..." value={jobDescription} onChange={e => setJobDescription(e.target.value)} required />
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full h-12" disabled={isCreatingJob}>
                      {isCreatingJob ? "Publication en cours..." : "Publier l'offre"}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none shadow-xl shadow-primary/5 border border-primary/5 hover:border-primary/20 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <h3 className="text-3xl font-bold mt-1">{stat.value}</h3>
                </div>
                <div className={`p-3 bg-accent rounded-2xl ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 bg-accent/50 p-1">
          <TabsTrigger value="jobs">Mes Offres</TabsTrigger>
          <TabsTrigger value="applications">Candidatures Récentes</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          <div className="space-y-4">
            {myJobs.length > 0 ? (
              myJobs.map((job) => (
                <Card key={job.id} className="hover:border-primary/30 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between py-4">
                    <div>
                      <CardTitle className="text-lg">{job.title}</CardTitle>
                      <CardDescription>
                        {(() => {
                          try {
                            if (!job.createdAt) return "À l'instant";
                            const date = job.createdAt.seconds 
                              ? new Date(job.createdAt.seconds * 1000) 
                              : new Date(job.createdAt);
                            if (isNaN(date.getTime())) return "À l'instant";
                            return formatDistanceToNow(date, { addSuffix: true, locale: fr });
                          } catch (e) {
                            return "À l'instant";
                          }
                        })()} • {job.location}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold">
                          {job.views || 0} vues • {myApplications.filter(a => a.jobId === job.id).length} candidatures
                        </p>
                      </div>
                      <Badge className={`${job.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'} border-none`}>
                        {job.status === 'active' ? 'Actif' : 'Clos'}
                      </Badge>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))
            ) : (
              <div className="text-center py-10 bg-accent/20 rounded-2xl">
                <p className="text-muted-foreground">Vous n'avez pas encore publié d'offre.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="applications">
          <div className="grid gap-4">
            {myApplications.length > 0 ? (
              myApplications.map((app) => {
                const statusProps = getStatusBadgeProps(app.status);
                return (
                  <Card key={app.id} className="hover:bg-accent/10 transition-colors">
                    <CardContent className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {app.candidateProfile?.displayName?.[0] || 'C'}
                        </div>
                        <div>
                          <p className="font-bold">{app.candidateProfile?.displayName}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {(() => {
                              try {
                                if (!app.appliedAt) return "Récemment";
                                const date = app.appliedAt.seconds 
                                  ? new Date(app.appliedAt.seconds * 1000) 
                                  : new Date(app.appliedAt);
                                if (isNaN(date.getTime())) return "Récemment";
                                return formatDistanceToNow(date, { addSuffix: true, locale: fr });
                              } catch (e) {
                                return "Récemment";
                              }
                            })()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Poste : {app.jobTitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`${statusProps.color} border-none`}>{statusProps.label}</Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleSelectApp(app)}
                        >
                          <Eye className="mr-1 h-3 w-3" /> Voir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-10 bg-accent/20 rounded-2xl">
                <p className="text-muted-foreground">Aucune candidature reçue pour le moment.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

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
