/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ShieldCheck, UserCheck, AlertTriangle, FileBarChart, Check, X, Building2, Eye, FileText, MapPin, Globe } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/types';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [pendingRecruiters, setPendingRecruiters] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [selectedRecruiter, setSelectedRecruiter] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({
    pending: 0,
    recruiters: 0,
    candidates: 0,
    jobs: 0
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const fetchData = async () => {
      try {
        // Fetch pending recruiters (submitted or verifying)
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'recruiter'),
          where('status', 'in', ['submitted', 'verifying'])
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[];
        setPendingRecruiters(list);

        // Fetch counts for dashboard
        const recruitersQ = query(collection(db, 'users'), where('role', '==', 'recruiter'), where('status', '==', 'approved'));
        const rSnapshot = await getDocs(recruitersQ);
        const candidatesQ = query(collection(db, 'users'), where('role', '==', 'candidate'));
        const cSnapshot = await getDocs(candidatesQ);
        const jobsQ = query(collection(db, 'jobs'));
        const jSnapshot = await getDocs(jobsQ);

        setStats({
          pending: list.length,
          recruiters: rSnapshot.size,
          candidates: cSnapshot.size,
          jobs: jSnapshot.size
        });
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleAction = async (uid: string, type: 'approve' | 'reject') => {
    setValidatingId(uid);
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        status: type === 'approve' ? 'approved' : 'rejected'
      });
      setPendingRecruiters(pendingRecruiters.filter(r => r.uid !== uid));
      setStats(prev => ({
        ...prev,
        pending: prev.pending - 1,
        recruiters: type === 'approve' ? prev.recruiters + 1 : prev.recruiters
      }));
      if (selectedRecruiter?.uid === uid) {
        setSelectedRecruiter(null);
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    } finally {
      setValidatingId(null);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-2xl font-bold">Accès réservé aux administrateurs</h2>
        <p className="text-muted-foreground mt-2">Veuillez vous connecter avec un compte admin.</p>
      </div>
    );
  }

  return (
    <div className="container py-10 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Console Administration</h1>
          <p className="text-muted-foreground mt-1">Gérez la sécurité et le contenu de la plateforme.</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-orange-600 h-8 px-4 rounded-full font-bold">MODE ADMIN ACTIF</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "En attente", value: stats.pending, icon: AlertTriangle, color: "text-orange-600" },
          { label: "Recruteurs Alpha", value: stats.recruiters, icon: ShieldCheck, color: "text-green-600" },
          { label: "Candidats", value: stats.candidates, icon: UserCheck, color: "text-blue-600" },
          { label: "Offres", value: stats.jobs, icon: FileBarChart, color: "text-purple-600" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-lg shadow-primary/5 rounded-3xl group hover:shadow-xl transition-all">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-4 bg-accent rounded-2xl ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">{stat.label}</p>
                  <p className="text-3xl font-black">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-xl rounded-[32px] overflow-hidden">
          <CardHeader className="bg-slate-900 text-white">
            <CardTitle className="text-lg font-black">Validations Recruteurs Prioritaires</CardTitle>
            <CardDescription className="text-slate-400">Vérifiez les documents légaux avant d'autoriser la publication.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {pendingRecruiters.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground font-medium italic bg-slate-50 rounded-[24px]">
                Aucune validation en attente.
              </div>
            ) : (
              pendingRecruiters.map((rec) => (
                <div key={rec.uid} className="flex flex-col sm:flex-row items-center justify-between p-6 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors gap-6 group">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="h-14 w-14 bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-center p-2 group-hover:border-orange-200 transition-colors">
                      {rec.photoUrl ? (
                         <img src={rec.photoUrl} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <Building2 className="h-6 w-6 text-slate-300" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black text-slate-900">{rec.companyName || rec.displayName}</p>
                        <Badge variant="outline" className="text-[9px] uppercase border-orange-200 text-orange-600 bg-orange-50">{rec.status}</Badge>
                      </div>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">RCCM: {rec.registrationNumber || 'N/A'} • {rec.city}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 sm:flex-none font-bold text-slate-500 hover:text-slate-900"
                      onClick={() => setSelectedRecruiter(rec)}
                    >
                      <Eye className="mr-2 h-4 w-4" /> Détails
                    </Button>
                    <div className="flex gap-2 flex-1 sm:flex-none border-l pl-3 ml-1 border-slate-100">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 sm:flex-none text-red-600 border-red-100 hover:bg-red-50 font-bold"
                        onClick={() => handleAction(rec.uid ?? '', 'reject')}
                        disabled={validatingId === rec.uid}
                      >
                        Refuser
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 font-bold px-6"
                        onClick={() => handleAction(rec.uid ?? '', 'approve')}
                        disabled={validatingId === rec.uid}
                      >
                        {validatingId === rec.uid ? "..." : "Approuver"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-[32px] overflow-hidden self-start">
          <CardHeader className="bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-lg font-black">Activités Récentes</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-8 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 italic">
              {[
                { text: "Nouveau recruteur inscrit", time: "Il y a 5 min", color: "bg-blue-500" },
                { text: "15 candidatures soumises", time: "Il y a 12 min", color: "bg-green-500" },
                { text: "Offre signalée par un candidat", time: "Il y a 45 min", color: "bg-red-500" },
                { text: "Mise à jour CMS effectuée", time: "Il y a 1h", color: "bg-purple-500" },
              ].map((log, i) => (
                <div key={i} className="flex gap-4 relative z-10">
                  <div className={`mt-1.5 h-4 w-4 rounded-full border-2 border-white shadow-sm shrink-0 ${log.color}`} />
                  <div>
                    <p className="text-sm font-bold text-slate-800 leading-tight">{log.text}</p>
                    <p className="text-[10px] uppercase font-black text-slate-400 mt-1 tracking-widest">{log.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-8 rounded-xl font-bold border-slate-200">Voir tout le journal</Button>
          </CardContent>
        </Card>
      </div>

      {/* Recruiter Details Dialog */}
      <Dialog open={!!selectedRecruiter} onOpenChange={(open) => !open && setSelectedRecruiter(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 border-none rounded-[40px]">
          {selectedRecruiter && (
            <div className="bg-white">
              <div className="bg-slate-900 p-8 text-white">
                 <DialogHeader>
                   <div className="flex items-center gap-4">
                     <div className="h-20 w-20 bg-white rounded-3xl p-2 flex items-center justify-center">
                        {selectedRecruiter.photoUrl ? (
                          <img src={selectedRecruiter.photoUrl} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="h-10 w-10 text-slate-200" />
                        )}
                     </div>
                     <div>
                       <DialogTitle className="text-3xl font-black">{selectedRecruiter.companyName}</DialogTitle>
                       <DialogDescription className="text-slate-400 font-bold mt-1">
                         Demande d'accès Recruteur • Statut: {selectedRecruiter.status}
                       </DialogDescription>
                     </div>
                   </div>
                 </DialogHeader>
              </div>

              <div className="p-8 space-y-8">
                {/* General Info */}
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Informations Générales</h3>
                    <div className="space-y-2">
                       <p className="text-[11px] font-black text-slate-400 uppercase">Secteur</p>
                       <p className="font-bold text-slate-900">{selectedRecruiter.sectorActivity || 'N/A'}</p>
                    </div>
                    <div className="space-y-2">
                       <p className="text-[11px] font-black text-slate-400 uppercase">Taille</p>
                       <p className="font-bold text-slate-900">{selectedRecruiter.companySize || 'N/A'}</p>
                    </div>
                    <div className="space-y-2">
                       <p className="text-[11px] font-black text-slate-400 uppercase">Description</p>
                       <p className="text-sm text-slate-600 leading-relaxed italic">"{selectedRecruiter.companyShortDescription}"</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Informations Légales</h3>
                    <div className="space-y-2">
                       <p className="text-[11px] font-black text-slate-400 uppercase">RCCM</p>
                       <p className="font-bold text-slate-900">{selectedRecruiter.registrationNumber || 'N/A'}</p>
                    </div>
                    <div className="space-y-2">
                       <p className="text-[11px] font-black text-slate-400 uppercase">Compte Contribuable</p>
                       <p className="font-bold text-slate-900">{selectedRecruiter.taxNumber || 'N/A'}</p>
                    </div>
                    <div className="space-y-2">
                       <p className="text-[11px] font-black text-slate-400 uppercase">Forme Juridique</p>
                       <p className="font-bold text-slate-900">{selectedRecruiter.legalForm || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Manager Info */}
                <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Responsable Recrutement</h3>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center font-black">
                      {selectedRecruiter.manager?.firstName?.[0]}{selectedRecruiter.manager?.lastName?.[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{selectedRecruiter.manager?.firstName} {selectedRecruiter.manager?.lastName}</p>
                      <p className="text-xs font-bold text-slate-500">{selectedRecruiter.manager?.role} • {selectedRecruiter.manager?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div className="space-y-4">
                   <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Documents Vérification</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {selectedRecruiter.legalDocuments?.rccmUrl && (
                       <a href={selectedRecruiter.legalDocuments.rccmUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl hover:border-orange-200 transition-colors group">
                          <FileText className="h-6 w-6 text-orange-600" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-900 truncate uppercase tracking-tight">Registre Commerce (RCCM)</p>
                            <p className="text-[10px] font-bold text-slate-400">Document PDF/Image</p>
                          </div>
                       </a>
                     )}
                     {selectedRecruiter.legalDocuments?.taxStatusUrl && (
                       <a href={selectedRecruiter.legalDocuments.taxStatusUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl hover:border-orange-200 transition-colors group">
                          <ShieldCheck className="h-6 w-6 text-orange-600" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-900 truncate uppercase tracking-tight">Attestation Fiscale</p>
                            <p className="text-[10px] font-bold text-slate-400">Document Officiel</p>
                          </div>
                       </a>
                     )}
                   </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-14 rounded-2xl border-red-200 text-red-600 font-black hover:bg-red-50"
                    onClick={() => handleAction(selectedRecruiter.uid ?? '', 'reject')}
                    disabled={validatingId === selectedRecruiter.uid}
                  >
                    REFUSER L'ACCÈS
                  </Button>
                  <Button 
                    className="flex-1 h-14 rounded-2xl bg-emerald-600 text-white font-black shadow-xl shadow-emerald-200 hover:bg-emerald-700"
                    onClick={() => handleAction(selectedRecruiter.uid ?? '', 'approve')}
                    disabled={validatingId === selectedRecruiter.uid}
                  >
                    {validatingId === selectedRecruiter.uid ? "CHARGEMENT..." : "APPROUVER L'ENTREPRISE"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
