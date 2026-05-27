/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Search, 
  FileText, 
  CheckCircle, 
  Clock, 
  MapPin, 
  ExternalLink, 
  Eye, 
  TrendingUp, 
  AlertCircle, 
  Download, 
  Settings, 
  Briefcase,
  GraduationCap,
  Globe,
  Mail,
  Phone,
  Link as LinkIcon,
  MessageSquare,
  HelpCircle,
  Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  documentId,
  onSnapshot,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Textarea } from '@/components/ui/textarea';
import { SupportTicket } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { calculateCompletionScore, getProfileSuggestions } from '@/lib/profileUtils';
import { generateCV } from '@/lib/pdfUtils';
import { motion } from 'motion/react';

export default function CandidateDashboard() {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [applications, setApplications] = useState<any[]>([]);
  const [companyNames, setCompanyNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [cvBlobUrl, setCvBlobUrl] = useState<string | null>(null);
  
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isLoadingJob, setIsLoadingJob] = useState(false);

  // Support ticket states
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

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
        userEmail: user.email,
        userName: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Candidat Anonyme',
        userRole: 'candidate',
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

  const handleViewDetails = async (app: any) => {
    setSelectedApp(app);
    setIsDetailsOpen(true);
    setIsLoadingJob(true);
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const jobDoc = await getDoc(doc(db, 'offers', app.jobId));
      if (jobDoc.exists()) {
        setSelectedJob({ id: jobDoc.id, ...jobDoc.data() });
      } else {
        setSelectedJob(null);
      }
    } catch (e) {
      console.error('Error fetching job details:', e);
      setSelectedJob(null);
    } finally {
      setIsLoadingJob(false);
    }
  };
  
  const score = user ? calculateCompletionScore(user) : 0;
  const suggestions = user ? getProfileSuggestions(user) : [];

  useEffect(() => {
    let url: string | null = null;
    
    if (user?.cvUrl?.startsWith('data:')) {
      try {
        const base64Data = user.cvUrl;
        const parts = base64Data.split(',');
        if (parts.length === 2) {
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
        setCvBlobUrl(user.cvUrl || null);
      }
    } else if (user?.cvUrl) {
      setCvBlobUrl(user.cvUrl);
    }

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [user?.cvUrl]);

  useEffect(() => {
    if (!user) return;
    
    const fetchApplications = async () => {
      try {
        const q = query(
          collection(db, 'applications'),
          where('candidateId', '==', user.uid),
          orderBy('appliedAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const apps = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setApplications(apps);

        // Fetch current company names
        const recruiterIds = Array.from(new Set(apps.map((a: any) => a.recruiterId).filter(Boolean)));
        if (recruiterIds.length > 0) {
          const namesMap: Record<string, string> = {};
          for (let i = 0; i < recruiterIds.length; i += 10) {
            const batch = recruiterIds.slice(i, i + 10);
            const recruitersQ = query(
              collection(db, 'users'), 
              where(documentId(), 'in', batch),
              where('role', '==', 'recruiter')
            );
            const recruitersSnap = await getDocs(recruitersQ);
            recruitersSnap.forEach(doc => {
              const data = doc.data();
              // Prioritize companyName, then tradeName, then displayName
              namesMap[doc.id] = data.companyName || data.tradeName || data.displayName || "Entreprise";
            });
          }
          setCompanyNames(namesMap);
        }
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [user]);

  const getCompanyName = (app: any) => {
    return companyNames[app.recruiterId] || app.companyName;
  };

  if (!user || user.role !== 'candidate') return null;

  const handleExportCV = () => {
    generateCV(user);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Profile completion suggestion banner */}
      {user && !user.profileComplete && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="bg-orange-600 text-white py-3 px-4 text-center overflow-hidden relative z-50 shadow-lg"
        >
          <div className="container mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 font-bold text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>Votre profil est incomplet ({score}%). Un profil à 100% attire 3x plus de recruteurs.</span>
            </div>
            <Link to="/onboarding" className="bg-white text-orange-600 px-4 py-1.5 rounded-full text-[10px] sm:text-xs shadow-md hover:bg-orange-50 transition-all uppercase tracking-widest">
              Compléter mon profil
            </Link>
          </div>
        </motion.div>
      )}

      {/* Profile Header Banner */}
      <div className="bg-slate-900 h-40 sm:h-56 relative" />

      {/* Profile Info Section - Overlapping with Banner */}
      <div className="container mx-auto px-4 relative -mt-16 sm:-mt-24 z-10">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 w-full">
          <Avatar className="h-24 w-24 sm:h-32 md:h-40 sm:w-32 md:w-40 border-4 border-white shadow-2xl flex-shrink-0 bg-white">
            <AvatarImage src={user.photoUrl || ''} />
            <AvatarFallback className="text-3xl sm:text-4xl md:text-5xl bg-orange-100 text-orange-600">
              {user.displayName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight md:text-white md:drop-shadow-lg leading-tight">
              {user.firstName ? `${user.firstName} ${user.lastName}` : user.displayName}
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3 mt-2">
              <Badge className="bg-orange-600 text-white border-none px-3 md:px-4 py-1 text-xs md:text-sm font-bold shadow-lg shadow-orange-600/20">
                {user.jobTitle || 'Candidat'}
              </Badge>
              <div className="flex items-center text-slate-500 md:text-slate-100 text-[10px] md:text-sm font-bold gap-1 bg-black/5 md:bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                <MapPin className="h-3 w-3 md:h-4 md:w-4 text-orange-500 md:text-white" /> {user.city || 'CP'}, {user.commune || 'CI'}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <Button className="w-full h-11 md:h-12 bg-orange-600 text-white hover:bg-orange-700 border-none font-black rounded-xl md:rounded-2xl shadow-xl shadow-orange-600/10 transition-all" asChild nativeButton={false}>
              <Link to="/">
                <ExternalLink className="mr-2 h-4 w-4" /> Retour au site
              </Link>
            </Button>
            <Button className="w-full h-11 md:h-12 bg-slate-900 text-white md:bg-white md:text-slate-900 border-none hover:bg-slate-800 md:hover:bg-slate-100 font-bold rounded-xl md:rounded-2xl shadow-xl transition-all" asChild nativeButton={false}>
              <Link to="/onboarding">
                <Settings className="mr-2 h-4 w-4" /> Profil
              </Link>
            </Button>
            <Button onClick={handleExportCV} variant="outline" className="w-full h-11 md:h-12 sm:w-auto bg-white text-slate-700 border-slate-200 hover:bg-slate-50 rounded-xl md:rounded-2xl font-bold shadow-lg transition-all">
              <Download className="mr-2 h-4 w-4" /> CV PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Stats & Completion */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold">Complétion Profil</CardTitle>
                <span className="text-2xl font-black text-orange-600">{score}%</span>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={score} className="h-3 mb-6" />
              
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                   <AlertCircle className="h-3 w-3" /> Suggestions
                </h4>
                {suggestions.map((suggestion, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl text-sm font-medium text-orange-800">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    {suggestion}
                  </div>
                ))}
                {suggestions.length === 0 && (
                  <div className="text-center py-4 text-green-600 font-bold flex items-center justify-center gap-2">
                    <CheckCircle className="h-5 w-5" /> Profil Parfait !
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl shadow-slate-200/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold">Visibilité CVthèque</CardTitle>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  user.visibleInCvtheque !== false 
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-150" 
                    : "bg-slate-100 text-slate-500 border border-slate-200"
                }`}>
                  {user.visibleInCvtheque !== false ? "√ Active" : "Ø Masquée"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                Lorsque votre visibilité est active, votre profil est consultable par les recruteurs via la CVthèque pour des opportunités professionnelles.
              </p>
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-700">Autoriser la recherche de mon profil</span>
                <Switch 
                  id="dashboard-visible-cv" 
                  checked={user.visibleInCvtheque !== false}
                  onCheckedChange={(checked) => {
                    updateProfile({ visibleInCvtheque: checked });
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl shadow-slate-200/50">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Email</p>
                  <p className="text-sm font-bold text-slate-700">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Téléphone</p>
                  <p className="text-sm font-bold text-slate-700">{user.phone || 'Non renseigné'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                  <LinkIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">LinkedIn</p>
                  <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">
                    {user.social?.linkedin || 'Non renseigné'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Experience, Education, Skills */}
        <div className="lg:col-span-8 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-6 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto scrollbar-hide">
              <TabsList className="bg-transparent border-none gap-1 md:gap-2 min-w-max">
                <TabsTrigger value="profile" className="rounded-xl font-bold py-2 px-4 md:px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all whitespace-nowrap">Aperçu Profil</TabsTrigger>
                <TabsTrigger value="applications" className="rounded-xl font-bold py-2 px-4 md:px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all whitespace-nowrap">
                  Candidatures 
                  {applications.length > 0 && <Badge className="ml-2 bg-orange-600 text-white border-none px-1.5 py-0 h-5 min-w-[20px]">{applications.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="support" className="rounded-xl font-bold py-2 px-4 md:px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all whitespace-nowrap">
                  Support & Aide
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="profile" className="space-y-6 outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Experiences */}
                <Card className="border-none shadow-xl shadow-slate-200/50">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-orange-600" /> Expériences
                    </CardTitle>
                    <Link to="/onboarding">
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-orange-600"><Settings className="h-4 w-4" /></Button>
                    </Link>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {user.experiences && user.experiences.length > 0 ? (
                      user.experiences.map((exp, idx) => (
                        <div key={idx} className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-0 before:w-px before:bg-slate-100 last:before:hidden">
                          <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full bg-orange-600" />
                          <h4 className="font-bold text-slate-800">{exp.role}</h4>
                          <p className="text-sm font-bold text-orange-600">{exp.company}</p>
                          <p className="text-xs text-slate-400 mt-1 mb-2">
                            {exp.startDate} - {exp.current ? 'Présent' : exp.endDate}
                          </p>
                          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{exp.description}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-sm italic text-center py-4">Aucune expérience renseignée</p>
                    )}
                  </CardContent>
                </Card>

                {/* Education */}
                <Card className="border-none shadow-xl shadow-slate-200/50">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-orange-600" /> Formations
                    </CardTitle>
                    <Link to="/onboarding">
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-orange-600"><Settings className="h-4 w-4" /></Button>
                    </Link>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {user.education && user.education.length > 0 ? (
                      user.education.map((edu, idx) => (
                        <div key={idx} className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-0 before:w-px before:bg-slate-100 last:before:hidden">
                          <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full bg-orange-600" />
                          <h4 className="font-bold text-slate-800">{edu.degree}</h4>
                          <p className="text-sm font-bold text-slate-600">{edu.school}</p>
                          <p className="text-xs text-orange-600 font-medium mb-2">{edu.field}</p>
                          <p className="text-xs text-slate-400">
                             {edu.startDate} - {edu.current ? 'En cours' : edu.endDate}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-sm italic text-center py-4">Aucune formation renseignée</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Skills & Languages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-xl shadow-slate-200/50">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-orange-600" /> Compétences
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {user.skills && user.skills.length > 0 ? (
                        user.skills.map((skill, idx) => (
                          <Badge key={idx} className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-none rounded-xl px-4 py-2 font-bold transition-all">
                            {skill.name}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-slate-400 text-sm italic">Aucune compétence ajoutée</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-xl shadow-slate-200/50">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Globe className="h-5 w-5 text-orange-600" /> Langues
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {user.languages && user.languages.length > 0 ? (
                      user.languages.map((lang, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="font-bold text-slate-700">{lang.language}</span>
                          <Badge variant="outline" className="text-xs capitalize rounded-lg">{lang.level}</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-sm italic">Aucune langue renseignée</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="applications" className="space-y-4 outline-none">
              {applications.length > 0 ? (
                applications.map((app) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="hover:border-orange-200 transition-all border border-transparent shadow-sm overflow-hidden group">
                      <CardContent className="py-6 flex flex-col sm:flex-row items-center justify-between gap-6 px-8">
                        <div className="flex items-center gap-6">
                          <div className="h-16 w-16 bg-slate-900 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-slate-900/10 transition-transform group-hover:scale-110">
                            {getCompanyName(app)?.[0] || 'J'}
                          </div>
                          <div>
                            <h3 className="text-lg font-extrabold text-slate-900">{app.jobTitle}</h3>
                            <div className="flex items-center gap-2">
                              <p className="text-slate-500 font-medium">{getCompanyName(app)}</p>
                              {app.recruiterId && (
                                <Link 
                                  to={`/company/${app.recruiterId}`}
                                  className="text-slate-400 hover:text-orange-600 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-bold uppercase tracking-wider">
                                <Clock className="h-3 w-3" /> Postulé {formatDistanceToNow(app.appliedAt?.seconds ? new Date(app.appliedAt.seconds * 1000) : new Date(app.appliedAt), { addSuffix: true, locale: fr })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge className={`
                            ${app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                            ${app.status === 'viewed' ? 'bg-blue-100 text-blue-700' : ''}
                            ${app.status === 'shortlisted' ? 'bg-green-100 text-green-700' : ''}
                            ${app.status === 'rejected' ? 'bg-red-100 text-red-700' : ''}
                            px-4 py-1.5 border-none font-bold rounded-lg
                          `}>
                            {app.status === 'pending' ? 'En attente' : 
                             app.status === 'viewed' ? 'Consultée' :
                             app.status === 'shortlisted' ? 'Sélectionné' : 'Refusé'}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            className="h-10 rounded-xl font-bold bg-slate-50 hover:bg-slate-100"
                            onClick={() => handleViewDetails(app)}
                          >
                            Détails
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100 shadow-sm">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-10 w-10 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Aucune candidature</h3>
                  <p className="text-slate-400 mt-2 max-w-xs mx-auto mb-8">Commencez à explorer les offres pour trouver votre prochain job.</p>
                  <Button className="h-12 px-8 bg-orange-600 text-white rounded-xl font-bold" asChild nativeButton={false}>
                    <Link to="/jobs">Parcourir les offres</Link>
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="support" className="space-y-6 outline-none animate-in fade-in duration-300">
              <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-slate-900/10">
                <div className="relative z-10 max-w-xl font-sans">
                  <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none font-black text-[10px] uppercase px-3 py-1 rounded-full mb-4">CANAL D'ASSISTANCE DIRECT</Badge>
                  <h3 className="text-2xl font-black tracking-tight mb-2">Des difficultés avec l'application ?</h3>
                  <p className="text-slate-300 font-medium text-xs leading-relaxed">
                    Notre équipe d’administration est disponible pour vous aider dans vos démarches de recherche d'emploi, de validation de profil, ou pour toute question technique. Envoyez un message et nous vous répondrons directement ici.
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
                  className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl font-bold text-xs flex items-center justify-between"
                >
                  <span>Votre message d'assistance a été envoyé avec succès ! Un administrateur va l'examiner rapidement.</span>
                </motion.div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form to submit support message */}
                <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-3xl p-6">
                  <CardHeader className="p-0 mb-6">
                    <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-orange-600" />
                      Nouveau Message de Support
                    </CardTitle>
                    <CardDescription className="text-xs font-bold text-slate-400">Renseignez votre demande d'assistance.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <form onSubmit={handleCreateTicket} className="space-y-4">
                      <div className="space-y-1">
                        <Label htmlFor="ticketSubject" className="font-black text-slate-700 uppercase text-xs tracking-wider">Objet / Thème de la demande</Label>
                        <Input 
                          id="ticketSubject"
                          type="text"
                          placeholder="Ex: Problème d'export de mon CV en PDF"
                          className="h-11 rounded-xl border-slate-200 font-bold focus-visible:ring-orange-600 text-xs text-slate-800"
                          value={ticketSubject}
                          onChange={(e) => setTicketSubject(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="ticketMessage" className="font-black text-slate-700 uppercase text-xs tracking-wider">Message détaillé</Label>
                        <Textarea 
                          id="ticketMessage"
                          placeholder="Décrivez précisément les difficultés rencontrées ou votre suggestion..."
                          className="min-h-[140px] rounded-xl border-slate-200 font-bold text-xs focus-visible:ring-orange-600 text-slate-800"
                          value={ticketMessage}
                          onChange={(e) => setTicketMessage(e.target.value)}
                          required
                        />
                      </div>
                      <Button 
                        type="submit" 
                        disabled={isSubmittingTicket}
                        className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase tracking-wider border-none"
                      >
                        {isSubmittingTicket ? "Envoi en cours..." : "Envoyer mon message"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Past support tickets list */}
                <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-3xl p-6 flex flex-col">
                  <CardHeader className="p-0 mb-6">
                    <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-600" />
                      Historique des Échanges
                    </CardTitle>
                    <CardDescription className="text-xs font-bold text-slate-400">Suivi en direct de vos demandes de support.</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="p-0 flex-1 overflow-y-auto max-h-[380px] pr-1 space-y-4 scrollbar-hide">
                    {tickets.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 font-bold flex flex-col items-center justify-center h-full">
                        <MessageSquare className="h-10 w-10 text-slate-200 mb-2" />
                        <p className="text-xs font-bold text-slate-400">Vous n'avez pas encore envoyé de message.</p>
                      </div>
                    ) : (
                      tickets.map(ticket => (
                        <div key={ticket.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/55 hover:bg-white hover:shadow-md transition-all space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h5 className="font-extrabold text-slate-900 text-sm leading-tight">{ticket.subject}</h5>
                              <p className="text-[10px] text-slate-450 font-bold uppercase mt-0.5">
                                Envoyé le {ticket.createdAt ? new Date(ticket.createdAt.seconds ? ticket.createdAt.seconds * 1000 : ticket.createdAt).toLocaleDateString('fr-FR') : 'Date inconnue'}
                              </p>
                            </div>
                            <Badge className={`text-[8px] font-black uppercase border-none px-2 rounded-full ${ticket.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {ticket.status === 'open' ? 'En attente' : 'Répondu'}
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-slate-600 font-semibold bg-white p-2.5 rounded-xl border border-slate-50 overflow-hidden text-ellipsis whitespace-pre-wrap leading-relaxed">
                            "{ticket.message}"
                          </p>

                          {ticket.response ? (
                            <div className="p-3 bg-emerald-55/40 border border-emerald-100 rounded-xl space-y-1">
                              <p className="text-[9px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1">
                                <Check className="h-3 w-3" /> Réponse de l'administration :
                              </p>
                              <p className="text-xs text-slate-700 font-semibold italic whitespace-pre-wrap">"{ticket.response}"</p>
                              {ticket.repliedAt && (
                                <p className="text-[8px] font-bold text-slate-400 text-right mt-1">
                                  Le {new Date(ticket.repliedAt.seconds ? ticket.repliedAt.seconds * 1000 : ticket.repliedAt).toLocaleDateString('fr-FR')}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="text-[9px] text-slate-400 font-bold flex items-center gap-1.5 pl-1 italic">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Un administrateur examine votre demande.
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
      </div>

      {/* CV Preview Dialog - Simple preview of uploaded CV */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[800px] h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Aperçu de mon CV</DialogTitle>
            <DialogDescription>{user.cvName}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 w-full h-full p-4">
            {cvBlobUrl ? (
              <div className="w-full h-[calc(90vh-140px)] rounded-md border shadow-inner bg-white overflow-hidden relative text-center">
                 <embed src={cvBlobUrl} type="application/pdf" className="w-full h-full" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <FileText className="h-16 w-16 text-slate-200" />
                <p className="text-slate-400 font-medium">Aucun aperçu disponible</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Application Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
          {selectedApp && (
            <div className="bg-white">
              <div className="bg-slate-900 p-4 md:p-8 text-white">
                <DialogHeader>
                  <DialogTitle className="text-lg md:text-2xl font-extrabold tracking-tight">Détails de la candidature</DialogTitle>
                  <DialogDescription className="text-slate-400 mt-1 text-xs md:text-sm">
                    Candidature envoyée le {formatDistanceToNow(selectedApp.appliedAt?.seconds ? new Date(selectedApp.appliedAt.seconds * 1000) : new Date(selectedApp.appliedAt), { addSuffix: true, locale: fr })}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-4 md:p-8 space-y-4">
                <div className="flex items-center gap-4 bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100">
                  <div className="h-12 w-12 bg-slate-900 rounded-xl flex items-center justify-center font-black text-white text-lg shrink-0">
                    {getCompanyName(selectedApp)?.[0] || 'J'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-slate-900 truncate">{selectedApp.jobTitle}</h4>
                    <div className="flex items-center gap-2">
                      <p className="text-slate-500 text-sm font-medium truncate">{getCompanyName(selectedApp)}</p>
                      {selectedApp.recruiterId && (
                        <Link 
                           to={`/company/${selectedApp.recruiterId}`}
                           className="text-slate-400 hover:text-orange-600 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                  <Badge className={`ml-auto
                    ${selectedApp.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                    ${selectedApp.status === 'viewed' ? 'bg-blue-100 text-blue-700' : ''}
                    ${selectedApp.status === 'shortlisted' ? 'bg-green-100 text-green-700' : ''}
                    ${selectedApp.status === 'rejected' ? 'bg-red-100 text-red-700' : ''}
                    px-3 py-1 border-none font-bold rounded-lg
                  `}>
                    {selectedApp.status === 'pending' ? 'En attente' : 
                     selectedApp.status === 'viewed' ? 'Consultée' :
                     selectedApp.status === 'shortlisted' ? 'Sélectionné' : 'Refusé'}
                  </Badge>
                </div>

                {isLoadingJob ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-600"></div>
                  </div>
                ) : selectedJob ? (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Localisation</p>
                        <p className="text-sm font-bold text-slate-700 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-orange-600" /> {selectedJob.location}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Type de contrat</p>
                        <p className="text-sm font-bold text-slate-700">{selectedJob.type}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-900 border-l-4 border-orange-600 pl-3">Description du poste</h4>
                      <p className="text-sm text-slate-600 leading-relaxed max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                        {selectedJob.description}
                      </p>
                    </div>

                    {selectedJob.salary && (
                      <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-1">Salaire proposé</p>
                        <p className="text-sm font-bold text-emerald-700">{selectedJob.salary}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm font-medium">Les détails complets de l'offre ne sont plus disponibles.</p>
                  </div>
                )}
              </div>

              <div className="p-4 md:p-8 pt-0">
                <Button 
                  variant="outline" 
                  className="w-full h-10 md:h-12 rounded-xl font-bold border-slate-200 text-xs md:text-sm"
                  onClick={() => setIsDetailsOpen(false)}
                >
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

