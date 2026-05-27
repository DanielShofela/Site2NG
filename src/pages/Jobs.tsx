import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, MapPin, Briefcase, Clock, Filter, ChevronRight, CheckCircle2, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { Job, Application } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  orderBy,
  doc,
  updateDoc,
  increment,
  documentId
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Jobs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companyNames, setCompanyNames] = useState<Record<string, string>>({});
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const q = query(
          collection(db, 'offers'),
          where('status', '==', 'active')
        );
        const querySnapshot = await getDocs(q);
        const jobsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Job[];
        
        // Sort in memory to avoid missing index errors
        jobsData.sort((a: any, b: any) => {
          const timeA = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0);
          const timeB = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0);
          return timeB - timeA;
        });

        setJobs(jobsData);

        // Fetch company names for these jobs to ensure we display the latest ones
        const recruiterIds = Array.from(new Set(jobsData.map(j => j.recruiterId || (j as any).companyId).filter(Boolean)));
        if (recruiterIds.length > 0) {
          const namesMap: Record<string, string> = {};
          
          // Batch fetch recruiters (limit 10 for 'in' query)
          for (let i = 0; i < recruiterIds.length; i += 10) {
            const batch = recruiterIds.slice(i, i + 10);
            try {
              // Using documentId() to match the doc ID (which is the recruiter's UID)
              // Added where('role', '==', 'recruiter') to satisfy Firestore security rules for unauthenticated users
              const recruitersQ = query(
                collection(db, 'users'), 
                where(documentId(), 'in', batch),
                where('role', '==', 'recruiter')
              );
              const recruitersSnap = await getDocs(recruitersQ);
              recruitersSnap.forEach(docSnap => {
                const data = docSnap.data();
                // Prioritization: Registered Company Name > Trade/Commercial Name > Display Name
                namesMap[docSnap.id] = data.companyName || data.tradeName || data.displayName || "Entreprise";
              });
            } catch (err) {
              console.error("Error fetching batch of recruiters:", err);
            }
          }
          setCompanyNames(prev => ({ ...prev, ...namesMap }));
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const handleApply = async () => {
    if (!user || !selectedJob) return;

    setIsApplying(true);
    try {
      const rId = selectedJob.recruiterId || (selectedJob as any).companyId || 'admin_popular';
      const applicationData = {
        jobId: selectedJob.id,
        candidateId: user.uid,
        recruiterId: rId,
        jobTitle: selectedJob.title,
        companyName: companyNames[rId] || selectedJob.companyName || 'Entreprise Partenaire',
        status: 'pending',
        appliedAt: serverTimestamp(),
        candidateProfile: {
          uid: user.uid,
          displayName: user.displayName || '',
          email: user.email || '',
          photoUrl: user.photoUrl || '',
          jobTitle: user.jobTitle || '',
          skills: user.skills || [],
          cvUrl: user.cvUrl || '',
          cvName: user.cvName || ''
        }
      };

      await addDoc(collection(db, 'applications'), applicationData);
      setHasApplied(true);
    } catch (error) {
      console.error('Error applying:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const getCompanyName = (job: Job) => {
    const rId = job.recruiterId || (job as any).companyId;
    return companyNames[rId || ''] || job.companyName;
  };

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCompanyName(job).toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container py-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="container py-12 px-6 mx-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Opportunités Ouvertes</h1>
            <p className="text-slate-500 font-semibold text-sm mt-1">Trouvez le poste qui correspond à vos ambitions.</p>
          </div>
          <div className="relative w-full md:w-[400px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
              placeholder="Poste, ville, entreprise..." 
              className="pl-12 h-14 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-orange-500 focus:border-orange-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredJobs.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Dialog onOpenChange={async (open) => {
                if (open) {
                  setSelectedJob(job);
                  setHasApplied(false);
                  
                  // Increment job views
                  try {
                    const jobRef = doc(db, 'offers', job.id);
                    await updateDoc(jobRef, {
                      views: increment(1)
                    });
                  } catch (e) {
                    console.error('Error incrementing job views:', e);
                  }
                }
              }}>
                <DialogTrigger asChild nativeButton={false}>
                  <Card className="hover:border-orange-500/50 transition-all cursor-pointer group rounded-[28px] border-slate-100 shadow-sm hover:shadow-xl hover:shadow-orange-100/5 overflow-hidden bg-white h-full">
                    <div className="md:flex h-full">
                      <CardHeader className="flex-1 pb-6 text-left flex flex-col justify-between">
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div className="space-y-1 flex-1">
                              <CardTitle className="text-xl md:text-2xl font-black text-slate-800 group-hover:text-orange-600 transition-colors leading-snug">
                                {job.title}
                              </CardTitle>
                              <div className="flex flex-wrap items-center text-xs md:text-sm font-semibold text-slate-400">
                                {(job.type !== 'popular' && (job.recruiterId || (job as any).companyId)) ? (
                                  <Link 
                                    to={`/company/${job.recruiterId || (job as any).companyId}`} 
                                    className="text-slate-700 hover:text-orange-600 transition-colors flex items-center gap-1 group/company relative z-10"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {getCompanyName(job)}
                                    <ExternalLink className="h-3 w-3 opacity-0 group-hover/company:opacity-100 transition-opacity" />
                                  </Link>
                                ) : (
                                  <span className="text-slate-700">{getCompanyName(job)}</span>
                                )}
                                <span className="mx-2 opacity-35">•</span>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5 text-orange-600" /> {job.location}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 shrink-0">
                              {job.type === 'rapid' && (
                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none font-black text-[9px] uppercase tracking-wider px-2 py-0.5 animate-pulse flex items-center gap-1 rounded-lg">
                                  <span className="h-1 w-1 rounded-full bg-amber-500 animate-ping" />
                                  Urgent
                                </Badge>
                              )}
                              {job.type === 'popular' && (
                                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none font-black text-[9px] uppercase tracking-wider px-2 py-0.5 flex items-center gap-1 rounded-lg">
                                  Élite
                                </Badge>
                              )}
                              {job.type === 'unique' && (
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none font-black text-[9px] uppercase tracking-wider px-2 py-0.5 flex items-center gap-1 rounded-lg">
                                  Direct
                                </Badge>
                              )}
                              <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-none font-extrabold px-2.5 py-0.5 rounded-lg text-[10px] uppercase">
                                {(job as any).contractType || (job.type !== 'rapid' && job.type !== 'popular' && job.type !== 'unique' ? job.type : 'CDI')}
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-4">
                             <p className="text-sm font-semibold text-slate-500 line-clamp-3 leading-relaxed">
                              {job.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-6">
                          <Badge variant="outline" className="flex items-center gap-1.5 border-slate-100 bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-semibold">
                            <Briefcase className="h-3.5 w-3.5 text-orange-500" /> {job.field}
                          </Badge>
                          {job.salary && (
                            <Badge variant="outline" className="text-emerald-700 border-emerald-150 bg-emerald-50 px-3 py-1.5 rounded-xl text-xs font-bold">
                              {job.salary}
                            </Badge>
                          )}
                          <Badge variant="outline" className="flex items-center gap-1.5 border-slate-100 bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-semibold">
                            <Clock className="h-3.5 w-3.5 text-blue-500" /> 
                            {(() => {
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
                            })()}
                          </Badge>

                          {/* Beautiful expiration badge */}
                          {(() => {
                            const expiresAt = (job as any).expiresAt;
                            let expDate: Date | null = null;
                            if (expiresAt) {
                              try {
                                expDate = expiresAt.seconds ? new Date(expiresAt.seconds * 1000) : new Date(expiresAt);
                              } catch (e) {}
                            }
                            if (!expDate || isNaN(expDate.getTime())) {
                              // If none exists, calculate 30 days fallback from createdAt
                              if (job.createdAt) {
                                try {
                                  const cDate = job.createdAt.seconds ? new Date(job.createdAt.seconds * 1000) : new Date(job.createdAt);
                                  expDate = new Date(cDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                                } catch (e) {}
                              }
                            }
                            if (expDate && !isNaN(expDate.getTime())) {
                              return (
                                <Badge variant="outline" className="flex items-center gap-1.5 border-rose-100 bg-rose-50/70 text-rose-700 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm">
                                  <Clock className="h-3.5 w-3.5 text-rose-500" />
                                  Exp: {expDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                </Badge>
                              );
                            }
                            return (
                              <Badge variant="outline" className="flex items-center gap-1.5 border-rose-100 bg-rose-50/70 text-rose-700 px-3 py-1.5 rounded-xl text-xs font-bold">
                                <Clock className="h-3.5 w-3.5 text-rose-500" />
                                Exp: 30 jours
                              </Badge>
                            );
                          })()}
                        </div>
                      </CardHeader>
                      <div className="bg-slate-50 md:w-14 flex items-center justify-center p-3 border-t md:border-t-0 md:border-l border-slate-100 group-hover:bg-orange-50 group-hover:border-orange-100 transition-colors shrink-0">
                        <ChevronRight className="h-6 w-6 text-slate-300 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </Card>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px] rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
                  {selectedJob && (
                    <div className="bg-white">
                      <div className="bg-slate-900 p-4 md:p-8 text-white">
                        <DialogHeader>
                          <DialogTitle className="text-xl md:text-3xl font-extrabold tracking-tight">{selectedJob.title}</DialogTitle>
                          <DialogDescription className="flex flex-wrap items-center gap-2 mt-3 text-slate-300 text-xs md:text-sm font-medium">
                            {(selectedJob.type !== 'popular' && (selectedJob.recruiterId || (selectedJob as any).companyId)) ? (
                              <Link 
                                to={`/company/${selectedJob.recruiterId || (selectedJob as any).companyId}`}
                                className="text-white bg-white/10 px-3 py-1 rounded-lg hover:bg-white/20 transition-all flex items-center gap-2"
                              >
                                {getCompanyName(selectedJob)}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            ) : (
                              <span className="bg-white/5 px-2 py-1 rounded overflow-hidden truncate max-w-[150px]">
                                {getCompanyName(selectedJob)}
                              </span>
                            )}
                            <span className="opacity-50">•</span>
                            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-orange-500" /> {selectedJob.location}</span>
                          </DialogDescription>
                        </DialogHeader>
                      </div>
                      
                      <div className="p-4 space-y-4">
                        <div className="flex gap-3">
                          <Badge variant="secondary" className="bg-orange-50 text-orange-600">{(selectedJob as any).contractType || (selectedJob.type !== 'rapid' && selectedJob.type !== 'popular' && selectedJob.type !== 'unique' ? selectedJob.type : 'CDI')}</Badge>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600">{selectedJob.field}</Badge>
                        </div>

                        <div className="space-y-2 text-left">
                          <h4 className="text-base font-bold text-slate-900 border-l-4 border-orange-600 pl-4">Description du poste</h4>
                          <p className="text-slate-500 leading-relaxed text-xs font-medium">
                            {selectedJob.description}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-left">
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/60">
                            <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Expérience</span>
                            <span className="text-xs font-bold text-slate-800">
                              {(selectedJob as any).experienceLevel || "Intermédiaire"} ({(selectedJob as any).experienceYears || "1-3 ans"})
                            </span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/60">
                            <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Niveau d'études</span>
                            <span className="text-xs font-bold text-slate-800">
                              {(selectedJob as any).educationLevel || "Bac +3 (Licence)"}
                            </span>
                          </div>
                        </div>

                        {/* Dossier de candidature */}
                        <div className="bg-orange-50/50 p-3 rounded-2xl border border-orange-100 text-left space-y-2">
                          <h4 className="text-[11px] font-black text-orange-900 uppercase tracking-wider">Dossier de Candidature</h4>
                          <div className="text-xs space-y-1.5 text-slate-700 font-medium">
                            <p>
                              <span className="text-slate-400 font-bold">Mode de dépôt :</span>{" "}
                              <span className="font-extrabold uppercase text-slate-800 bg-white border px-2 py-0.5 rounded text-[10px]">
                                {(selectedJob as any).applyMethod === 'platform' ? 'Plateforme 2NG' : 'E-mail de l\'entreprise'}
                              </span>
                            </p>
                            {(selectedJob as any).companyEmail && (
                              <p>
                                <span className="text-slate-400 font-bold">Adresse d'envoi :</span>{" "}
                                <span className="font-extrabold text-slate-900 select-all">{(selectedJob as any).companyEmail}</span>
                              </p>
                            )}
                            {(selectedJob as any).conditionsDocuments && (selectedJob as any).conditionsDocuments.length > 0 && (
                              <div className="pt-1.5 border-t border-orange-100/50">
                                <span className="text-[10px] text-slate-400 font-black uppercase block tracking-wider mb-0.5">Pièces exigées :</span>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {(selectedJob as any).conditionsDocuments.map((docItem: string, idx: number) => (
                                    <span key={idx} className="bg-white border text-slate-700 font-bold text-[9px] px-2 py-0.5 rounded-md">
                                      ✓ {docItem}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <h4 className="text-xs font-bold text-slate-900 mb-1 uppercase tracking-wider">Détails financiers</h4>
                          <div className="flex items-center gap-2 text-emerald-700 font-bold text-base">
                            {selectedJob.salary || "Salaire non précisé"}
                          </div>
                        </div>

                        {!user && (
                          <div className="p-5 bg-orange-50 text-orange-800 rounded-2xl text-sm font-bold italic flex items-center gap-3">
                            <span className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" />
                            Connectez-vous en tant que candidat pour postuler.
                          </div>
                        )}
                      </div>

                      <div className="p-4 md:p-8 pt-0">
                        {hasApplied ? (
                          <div className="w-full flex flex-col items-center gap-2 py-4 md:py-6 bg-emerald-50 rounded-[20px] md:rounded-[24px]">
                            <div className="bg-emerald-600 text-white p-2.5 rounded-full shadow-lg shadow-emerald-200">
                              <CheckCircle2 className="h-6 w-6 md:h-8 md:w-8" />
                            </div>
                            <div className="text-center">
                              <p className="font-extrabold text-emerald-800 text-base md:text-lg">Candidature envoyée !</p>
                              <p className="text-xs md:text-sm text-emerald-600 font-medium">L'entreprise a bien reçu votre profil.</p>
                            </div>
                          </div>
                        ) : (
                          <Button 
                            className="w-full h-11 md:h-16 rounded-xl md:rounded-[20px] bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs md:text-lg shadow-xl shadow-orange-600/20 uppercase tracking-wider" 
                            disabled={!user || user.role !== 'candidate' || isApplying}
                            onClick={handleApply}
                          >
                            {isApplying ? "Transmission..." : "Envoyer ma candidature"}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

