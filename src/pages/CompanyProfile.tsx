/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, Job } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  MapPin, 
  Globe, 
  Users, 
  Briefcase, 
  CheckCircle2, 
  Mail, 
  Phone,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  Target,
  Award,
  Heart,
  ShieldCheck,
  Clock,
  FileText
} from 'lucide-react';

export default function CompanyProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompany = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'users', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          if (data.role === 'recruiter') {
            setProfile(data);
            
            // Fetch company jobs
            const jobsQ = query(
              collection(db, 'jobs'),
              where('recruiterId', '==', id),
              where('status', '==', 'active'),
              limit(5)
            );
            const jobsSnap = await getDocs(jobsQ);
            setJobs(jobsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Job)));
          } else {
            setError("Ce profil n'est pas une entreprise.");
          }
        } else {
          setError("L'entreprise demandée n'existe pas.");
        }
      } catch (err) {
        console.error(err);
        setError("Erreur lors du chargement du profil.");
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (error || !profile) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="max-w-md w-full p-8 text-center border-none shadow-xl">
        <div className="bg-red-50 text-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <Building2 className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Oups !</h2>
        <p className="text-slate-500 font-medium mb-8">{error || "Nous n'avons pas trouvé cette entreprise."}</p>
        <Link to="/jobs">
          <Button className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black">
            Voir les offres d'emploi
          </Button>
        </Link>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header / Banner */}
      <div className="h-[300px] md:h-[400px] w-full relative overflow-hidden bg-slate-900">
        {profile.branding?.bannerUrl ? (
          <img 
            src={profile.branding.bannerUrl} 
            alt="Banner" 
            className="w-full h-full object-cover opacity-60"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900/20" />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
        
        <div className="container relative h-full flex flex-col justify-end pb-12 px-4">
          <div className="flex flex-col md:flex-row items-end gap-6">
            <div className="h-32 w-32 md:h-44 md:w-44 bg-white rounded-[40px] p-2 shadow-2xl shrink-0 translate-y-6">
              <div className="h-full w-full rounded-[34px] overflow-hidden bg-slate-50 flex items-center justify-center border border-slate-100">
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt={profile.companyName} className="h-full w-full object-contain p-4" />
                ) : (
                  <Building2 className="h-16 w-16 text-slate-300" />
                )}
              </div>
            </div>
            <div className="flex-1 mb-8 md:mb-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                  {profile.companyName}
                </h1>
                {profile.status === 'approved' && (
                  <Badge className="bg-blue-500 text-white border-none rounded-full px-3 py-1 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Vérifiée
                  </Badge>
                )}
              </div>
              <p className="text-slate-300 text-lg font-medium mt-2 max-w-2xl line-clamp-2">
                {profile.companyShortDescription || profile.companyDescription?.slice(0, 150) + '...'}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-4 text-slate-400 text-sm font-bold">
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {profile.city}, {profile.commune || "CI"}</span>
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {profile.companySize || "N/A"}</span>
                <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" /> {profile.sectorActivity || "N/A"}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 mb-2 w-full md:w-auto">
              {profile.recruitmentNeeds?.currentlyRecruiting && (
                <Badge className="bg-orange-600 text-white border-none font-bold py-2 px-6 rounded-full text-center justify-center">
                  Recrute actuellement
                </Badge>
              )}
              {profile.website && (
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-2xl h-12 font-bold backdrop-blur-sm" asChild>
                  <a href={profile.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="mr-2 h-4 w-4" /> Site Web
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container px-4 mt-20 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12">
        {/* Main Content */}
        <div className="space-y-12">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
              <Award className="h-6 w-6 text-orange-600 mb-2" />
              <p className="text-xl font-black text-slate-900">{profile.companyType || "Entreprise"}</p>
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mt-1">Type</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
              <Users className="h-6 w-6 text-orange-600 mb-2" />
              <p className="text-xl font-black text-slate-900">{profile.companySize?.split(' ')[0] || "1-10"}</p>
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mt-1">Employés</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
              <Briefcase className="h-6 w-6 text-orange-600 mb-2" />
              <p className="text-xl font-black text-slate-900">{jobs.length}</p>
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mt-1">Offres actives</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
              <Award className="h-6 w-6 text-orange-600 mb-2" />
              <p className="text-xl font-black text-slate-900">{profile.legalForm || "SA/SARL"}</p>
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mt-1">Structure</p>
            </div>
          </div>

          <section className="space-y-4">
            <h2 className="text-2xl font-black text-slate-900 border-l-4 border-orange-600 pl-4">À propos de nous</h2>
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
              <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                {profile.companyDescription}
              </p>
            </div>
          </section>

          {(profile.branding?.mission || profile.branding?.vision) && (
            <div className="grid md:grid-cols-2 gap-8">
              {profile.branding?.mission && (
                <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-slate-900 text-white">
                  <CardHeader className="bg-white/5 border-b border-white/5">
                    <CardTitle className="text-lg font-black flex items-center gap-2">
                       <Target className="h-5 w-5 text-orange-500" />
                       Notre Mission
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-slate-300 font-medium italic">"{profile.branding.mission}"</p>
                  </CardContent>
                </Card>
              )}
              {profile.branding?.vision && (
                <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-orange-600 text-white">
                  <CardHeader className="bg-white/10 border-b border-white/10">
                    <CardTitle className="text-lg font-black flex items-center gap-2">
                       <Award className="h-5 w-5 text-white" />
                       Notre Vision
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-white/90 font-medium italic">"{profile.branding.vision}"</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {profile.branding?.values && profile.branding.values.length > 0 && (
            <section className="space-y-6">
               <h2 className="text-2xl font-black text-slate-900 border-l-4 border-orange-600 pl-4">Nos Valeurs</h2>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {profile.branding.values.map(val => (
                   <div key={val} className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm text-center">
                     <Heart className="h-6 w-6 text-red-500 mx-auto mb-3" />
                     <p className="font-black text-slate-900 tracking-tight">{val}</p>
                   </div>
                 ))}
               </div>
            </section>
          )}

          {/* Jobs List */}
          <section className="space-y-6">
            <div className="flex justify-between items-end">
               <h2 className="text-2xl font-black text-slate-900 border-l-4 border-orange-600 pl-4">Offres d'emploi</h2>
               <Link to="/jobs" className="text-sm font-black text-orange-600 hover:underline flex items-center gap-1">
                 Tout voir <ChevronRight className="h-4 w-4" />
               </Link>
            </div>
            <div className="space-y-4">
              {jobs.length > 0 ? (
                jobs.map(job => (
                  <Link key={job.id} to={`/jobs`}>
                    <Card className="border-slate-100 hover:border-orange-200 transition-all shadow-sm hover:shadow-xl hover:shadow-orange-600/5 rounded-3xl overflow-hidden group">
                      <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                            <Briefcase className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-black text-slate-900 text-lg group-hover:text-orange-600 transition-colors">{job.title}</h3>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-slate-400 mt-1">
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {job.type}</span>
                              <Badge className="bg-slate-100 text-slate-600 border-none px-2 py-0 h-5 text-[10px]">{job.field}</Badge>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" className="rounded-full font-black text-orange-600 group-hover:bg-orange-50">
                          Postuler <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="p-12 text-center bg-slate-100 rounded-[32px] border border-dashed border-slate-200">
                  <p className="text-slate-500 font-bold italic">Aucune offre disponible pour le moment.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
           {/* Contact Card */}
           <Card className="border-none shadow-xl shadow-slate-200/60 rounded-[40px] overflow-hidden bg-white sticky top-24">
              <CardHeader className="bg-slate-900 p-8 text-white">
                <CardTitle className="text-xl font-black">Contact & Social</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</p>
                      <p className="text-sm font-bold text-slate-900 truncate">{profile.companyEmail || profile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Téléphone</p>
                      <p className="text-sm font-bold text-slate-900">{profile.phone || "N/A"}</p>
                    </div>
                  </div>
                  {profile.whatsappBusiness && (
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">WhatsApp</p>
                        <p className="text-sm font-bold text-slate-900">{profile.whatsappBusiness}</p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-4 text-center">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suivez-nous</p>
                   <div className="flex justify-center gap-4">
                      {profile.social?.linkedin && (
                        <a href={profile.social.linkedin} target="_blank" rel="noopener noreferrer" className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">
                          <ExternalLink className="h-5 w-5" />
                        </a>
                      )}
                      <a href="#" className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all">
                        <Globe className="h-5 w-5" />
                      </a>
                   </div>
                </div>

                {profile.legalDocuments?.brochureUrl && (
                  <Button className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black shadow-xl" asChild>
                    <a href={profile.legalDocuments.brochureUrl} download>
                      <FileText className="mr-2 h-5 w-5" /> Brochure PDF
                    </a>
                  </Button>
                )}
              </CardContent>
           </Card>

           {/* Recruiting Needs Card */}
           {profile.recruitmentNeeds?.currentlyRecruiting && (
             <Card className="border-none shadow-xl shadow-orange-600/5 rounded-[40px] overflow-hidden bg-orange-50 border border-orange-100">
               <CardContent className="p-8 space-y-4">
                  <div className="p-3 bg-orange-600 text-white rounded-2xl w-fit shadow-lg shadow-orange-600/20">
                    <Target className="h-6 w-6" />
                  </div>
                  <h4 className="text-xl font-black text-orange-900 tracking-tight">On recrute !</h4>
                  <p className="text-orange-800/80 font-medium text-sm leading-relaxed">
                    Nous sommes activement à la recherche de nouveaux talents pour rejoindre notre aventure.
                  </p>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Profils recherchés</p>
                    <div className="flex flex-wrap gap-2">
                       {(profile.recruitmentNeeds.profileTypes || []).map(t => (
                         <Badge key={t} className="bg-white text-orange-800 border-none px-3 py-1 font-bold">{t}</Badge>
                       ))}
                    </div>
                  </div>
               </CardContent>
             </Card>
           )}
        </div>
      </div>
    </div>
  );
}
