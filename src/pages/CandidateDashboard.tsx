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
  Link as LinkIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
  const [loading, setLoading] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [cvBlobUrl, setCvBlobUrl] = useState<string | null>(null);
  
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
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [user]);

  if (!user || user.role !== 'candidate') return null;

  const handleExportCV = () => {
    generateCV(user);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Profile Header Banner */}
      <div className="bg-slate-900 h-40 sm:h-56 relative" />

      {/* Profile Info Section - Overlapping with Banner */}
      <div className="container mx-auto px-4 relative -mt-20 sm:-mt-24 z-10">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 w-full">
          <Avatar className="h-28 w-28 sm:h-40 sm:w-40 border-4 border-white shadow-2xl flex-shrink-0 bg-white">
            <AvatarImage src={user.photoUrl || ''} />
            <AvatarFallback className="text-4xl sm:text-5xl bg-orange-100 text-orange-600">
              {user.displayName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center md:text-left pb-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight md:text-white md:drop-shadow-lg">
              {user.firstName} {user.lastName}
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2">
              <Badge className="bg-orange-600 text-white border-none px-4 py-1 text-sm font-bold shadow-lg shadow-orange-600/20">
                {user.jobTitle || 'Candidat'}
              </Badge>
              <div className="flex items-center text-slate-500 md:text-slate-100 text-sm font-medium gap-1 bg-black/10 md:bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                <MapPin className="h-4 w-4" /> {user.city || 'Ville non spécifiée'}, {user.commune || ''}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 pb-2 w-full sm:w-auto">
            <Link to="/onboarding" className="w-full sm:w-auto">
              <Button className="w-full bg-slate-900 text-white md:bg-white md:text-slate-900 border-none hover:bg-slate-800 md:hover:bg-slate-100 font-bold rounded-xl shadow-xl transition-all hover:scale-105">
                <Settings className="mr-2 h-4 w-4" /> Modifier Profil
              </Button>
            </Link>
            <Button onClick={handleExportCV} variant="outline" className="w-full sm:w-auto bg-white text-slate-700 border-slate-200 hover:bg-slate-50 rounded-xl font-bold shadow-lg transition-all hover:scale-105">
              <Download className="mr-2 h-4 w-4" /> Export PDF
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
            <div className="flex items-center justify-between mb-6 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
              <TabsList className="bg-transparent border-none gap-2">
                <TabsTrigger value="profile" className="rounded-xl font-bold py-2 px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white">Aperçu Profil</TabsTrigger>
                <TabsTrigger value="applications" className="rounded-xl font-bold py-2 px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                  Candidatures 
                  {applications.length > 0 && <Badge className="ml-2 bg-orange-600 text-white border-none">{applications.length}</Badge>}
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
                            {app.companyName?.[0] || 'J'}
                          </div>
                          <div>
                            <h3 className="text-lg font-extrabold text-slate-900">{app.jobTitle}</h3>
                            <p className="text-slate-500 font-medium">{app.companyName}</p>
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
                          <Button variant="ghost" className="h-10 rounded-xl font-bold bg-slate-50 hover:bg-slate-100">Détails</Button>
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
                  <Link to="/jobs">
                    <Button className="h-12 px-8 bg-orange-600 text-white rounded-xl font-bold">Parcourir les offres</Button>
                  </Link>
                </div>
              )}
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
    </div>
  );
}

