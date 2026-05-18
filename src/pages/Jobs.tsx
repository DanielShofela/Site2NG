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
          collection(db, 'jobs'),
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
        const recruiterIds = Array.from(new Set(jobsData.map(j => j.recruiterId).filter(Boolean)));
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
      const applicationData = {
        jobId: selectedJob.id,
        candidateId: user.uid,
        recruiterId: selectedJob.recruiterId,
        jobTitle: selectedJob.title,
        companyName: companyNames[selectedJob.recruiterId] || selectedJob.companyName,
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
    return companyNames[job.recruiterId] || job.companyName;
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
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Opportunités Ouvertes</h1>
            <p className="text-slate-500 text-sm mt-1">Trouvez le poste qui correspond à vos ambitions.</p>
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

        <div className="grid grid-cols-1 gap-6">
          {filteredJobs.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Dialog onOpenChange={async (open) => {
                if (open) {
                  setSelectedJob(job);
                  setHasApplied(false);
                  
                  // Increment job views
                  try {
                    const jobRef = doc(db, 'jobs', job.id);
                    await updateDoc(jobRef, {
                      views: increment(1)
                    });
                  } catch (e) {
                    console.error('Error incrementing job views:', e);
                  }
                }
              }}>
                <DialogTrigger asChild nativeButton={false}>
                  <Card className="hover:border-orange-500/50 transition-all cursor-pointer group rounded-[24px] border-slate-100 shadow-sm hover:shadow-md overflow-hidden bg-white">
                    <div className="md:flex">
                      <CardHeader className="flex-1 pb-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <CardTitle className="text-2xl font-bold text-slate-800 group-hover:text-orange-600 transition-colors">
                              {job.title}
                            </CardTitle>
                            <div className="flex flex-wrap items-center text-sm font-medium text-slate-500">
                              {job.recruiterId ? (
                                <Link 
                                  to={`/company/${job.recruiterId}`} 
                                  className="text-slate-900 hover:text-orange-600 transition-colors flex items-center gap-1 group/company relative z-10"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {getCompanyName(job)}
                                  <ExternalLink className="h-3 w-3 opacity-0 group-hover/company:opacity-100 transition-opacity" />
                                </Link>
                              ) : (
                                <span>{getCompanyName(job)}</span>
                              )}
                              <span className="mx-2 opacity-30">•</span>
                              <div className="flex items-center">
                                <MapPin className="h-3.5 w-3.5 mr-1 text-orange-600" /> {job.location}
                              </div>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-orange-50 text-orange-600 border-none font-bold px-3 py-1">
                            {job.type}
                          </Badge>
                        </div>
                        <div className="mt-4">
                           <p className="text-sm text-slate-500 line-clamp-2 italic leading-relaxed">
                            {job.description}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-5">
                          <Badge variant="outline" className="flex items-center gap-1.5 border-slate-100 bg-slate-50 text-slate-600 px-3 py-1.5">
                            <Briefcase className="h-3.5 w-3.5" /> {job.field}
                          </Badge>
                          {job.salary && (
                            <Badge variant="outline" className="text-emerald-700 border-emerald-100 bg-emerald-50 px-3 py-1.5">
                              {job.salary}
                            </Badge>
                          )}
                          <Badge variant="outline" className="flex items-center gap-1.5 border-slate-100 bg-slate-50 text-slate-600 px-3 py-1.5">
                            <Clock className="h-3.5 w-3.5" /> 
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
                        </div>
                      </CardHeader>
                      <div className="bg-slate-50 md:w-16 flex items-center justify-center p-4 border-t md:border-t-0 md:border-l border-slate-100 group-hover:bg-orange-50 group-hover:border-orange-100 transition-colors">
                        <ChevronRight className="h-6 w-6 text-slate-300 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </Card>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px] rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
                  {selectedJob && (
                    <div className="bg-white">
                      <div className="bg-slate-900 p-8 text-white">
                        <DialogHeader>
                          <DialogTitle className="text-3xl font-extrabold tracking-tight">{selectedJob.title}</DialogTitle>
                          <DialogDescription className="flex flex-wrap items-center gap-2 mt-3 text-slate-300 font-medium">
                            {selectedJob.recruiterId ? (
                              <Link 
                                to={`/company/${selectedJob.recruiterId}`}
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
                      
                      <div className="p-8 space-y-8">
                        <div className="flex gap-3">
                          <Badge variant="secondary" className="bg-orange-50 text-orange-600">{selectedJob.type}</Badge>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600">{selectedJob.field}</Badge>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-lg font-bold text-slate-900 border-l-4 border-orange-600 pl-4">Description du poste</h4>
                          <p className="text-slate-500 leading-relaxed font-medium">
                            {selectedJob.description}
                          </p>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                          <h4 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Détails financiers</h4>
                          <div className="flex items-center gap-2 text-emerald-700 font-bold text-lg">
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

                      <div className="p-8 pt-0">
                        {hasApplied ? (
                          <div className="w-full flex flex-col items-center gap-3 py-6 bg-emerald-50 rounded-[24px]">
                            <div className="bg-emerald-600 text-white p-3 rounded-full shadow-lg shadow-emerald-200">
                              <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <div className="text-center">
                              <p className="font-extrabold text-emerald-800 text-lg">Candidature envoyée !</p>
                              <p className="text-sm text-emerald-600 font-medium">L'entreprise a bien reçu votre profil.</p>
                            </div>
                          </div>
                        ) : (
                          <Button 
                            className="w-full h-16 rounded-[20px] bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-lg shadow-xl shadow-orange-600/20" 
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

