import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FileText, 
  MapPin, 
  Clock, 
  Eye, 
  Search, 
  Trash2, 
  Check, 
  X, 
  AlertCircle,
  Mail,
  Phone,
  ArrowUpRight
} from 'lucide-react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ApplicationsProps {
  applications: any[];
  users: any[];
  jobs: any[];
  onUpdateStatus?: (appId: string, status: string) => Promise<void>;
  onDelete?: (appId: string) => Promise<void>;
}

export default function ApplicationsModule({ applications, users, jobs, onUpdateStatus, onDelete }: ApplicationsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      const candidateName = (app.candidateProfile?.displayName || app.candidateName || "").toLowerCase();
      const jobTitle = (app.jobTitle || "").toLowerCase();
      const matchSearch = candidateName.includes(searchTerm.toLowerCase()) || jobTitle.includes(searchTerm.toLowerCase());
      
      const matchStatus = statusFilter === "all" || app.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [applications, searchTerm, statusFilter]);

  const selectedJob = useMemo(() => {
    if (!selectedApp || !jobs) return null;
    return jobs.find((j: any) => j.id === selectedApp.jobId);
  }, [selectedApp, jobs]);

  const isDirectAdminJob = useMemo(() => {
    if (!selectedJob) return false;
    return selectedJob.createdBy === 'admin' || selectedJob.recruiterId === 'admin_popular' || selectedJob.recruiterId === 'admin';
  }, [selectedJob]);

  const handleUpdateStatus = async (appId: string, newStatus: string) => {
    setUpdating(true);
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(appId, newStatus);
      } else {
        const docRef = doc(db, 'applications', appId);
        await updateDoc(docRef, { status: newStatus });
        alert("Statut de candidature mis à jour !");
      }
      
      // Update selected modal object if open
      if (selectedApp && selectedApp.id === appId) {
        setSelectedApp({ ...selectedApp, status: newStatus });
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la mise à jour.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteApplication = async (appId: string) => {
    if (!confirm("Voulez-vous rejeter et supprimer définitivement cette candidature de la liste ?")) {
      return;
    }
    try {
      if (onDelete) {
        await onDelete(appId);
      } else {
        await deleteDoc(doc(db, 'applications', appId));
        alert("Candidature supprimée de la plateforme avec succès.");
      }
      setIsViewOpen(false);
      setSelectedApp(null);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la suppression.");
    }
  };

  const getStatusLabelText = (status: string) => {
    switch (status) {
      case 'pending': return { label: 'En attente', color: 'bg-amber-50 text-amber-700 border-amber-100' };
      case 'reviewed': return { label: 'Revise / Lu', color: 'bg-blue-50 text-blue-700 border-blue-100' };
      case 'interview': return { label: 'Entretien Planifié', color: 'bg-purple-50 text-purple-700 border-purple-100' };
      case 'accepted': return { label: 'Acceptée / Retenue', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
      case 'rejected': return { label: 'Refusée', color: 'bg-red-50 text-red-700 border-red-100' };
      default: return { label: 'Nouveau', color: 'bg-slate-50 text-slate-700 border-slate-100' };
    }
  };

  return (
    <>
      <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
        <CardHeader className="p-6 md:p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <CardTitle className="text-xl font-black text-slate-900">Suivi des Candidatures</CardTitle>
            <CardDescription className="text-xs font-semibold text-slate-400 mt-1">
              Pilotez, évaluez et suivez le statut d'embauche de chaque postulant inscrit.
            </CardDescription>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Rechercher candidat, poste..." 
                className="pl-9 h-11 rounded-xl border-slate-100 bg-slate-50 text-xs font-semibold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <select 
              className="h-11 px-4 rounded-xl border border-slate-100 bg-slate-50 text-xs font-black uppercase text-slate-600 outline-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tous les Statuts</option>
              <option value="pending">En attente / Initiées</option>
              <option value="reviewed">Lues et révisées</option>
              <option value="interview">En entretien</option>
              <option value="accepted">Retenues pour embauche</option>
              <option value="rejected">Candidatures écartées</option>
            </select>
          </div>
        </CardHeader>

        <div className="divide-y divide-slate-50 min-h-[350px]">
          {filteredApps.length > 0 ? (
            filteredApps.map((app) => {
              const statusProps = getStatusLabelText(app.status);
              const appliedDate = app.appliedAt?.seconds 
                ? new Date(app.appliedAt.seconds * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                : "Aujourd'hui";
              
              return (
                <div key={app.id} className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50/20 transition-all group">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3.5">
                      <div className="h-11 w-11 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black">
                        {app.candidateProfile?.photoUrl ? (
                          <img src={app.candidateProfile.photoUrl} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          app.candidateProfile?.displayName?.[0] || 'C'
                        )}
                      </div>
                      <div>
                        <h4 className="text-base font-black text-slate-900">{app.candidateProfile?.displayName || app.candidateName || "Candidat Adhérent"}</h4>
                        <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1.5 uppercase">
                          <Clock className="h-3.5 w-3.5" /> Postulé le {appliedDate}
                        </p>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-500">Postule pour l'offre:</span>
                      <p className="text-sm font-black text-orange-600 flex items-center gap-1.5 uppercase tracking-wide mt-1">
                        {app.jobTitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center">
                    <Badge variant="outline" className={`px-3.5 py-1 text-[9px] font-black uppercase rounded-full ${statusProps.color}`}>
                      {statusProps.label}
                    </Badge>
                    
                    <Button 
                      className="h-10 px-5 rounded-xl bg-slate-950 font-black text-xs text-white hover:bg-slate-800 transition-all uppercase"
                      onClick={() => { setSelectedApp(app); setIsViewOpen(true); }}
                    >
                      Examiner
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-24 text-center space-y-3">
              <div className="h-14 w-14 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                <FileText className="h-7 w-7" />
              </div>
              <p className="text-xs font-black text-slate-400">Aucune candidature reçue dans ces critères.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Examine Application Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl w-full rounded-[30px] p-8 border-none shadow-2xl overflow-y-auto max-h-[85vh]">
          {selectedApp && (
            <div className="space-y-6 text-slate-900">
              <DialogHeader className="border-b border-slate-50 pb-5">
                <DialogTitle className="text-xl font-black flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black">
                    {selectedApp.candidateProfile?.displayName?.[0] || 'C'}
                  </div>
                  <div className="text-left">
                    <p>{selectedApp.candidateProfile?.displayName || selectedApp.candidateName}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">Postulant au poste de: {selectedApp.jobTitle}</p>
                  </div>
                </DialogTitle>
                <DialogDescription className="text-left font-bold text-sm text-slate-400 mt-1">
                  Examen du dossier de candidature et suivi d'orientation.
                </DialogDescription>
              </DialogHeader>

              {/* CONFIDENTIAL BANNER FOR EXTERNAL COMPANY JOBS */}
              {!isDirectAdminJob ? (
                <div className="bg-amber-50/80 border border-amber-200/60 p-5 rounded-2xl flex items-start gap-3.5 text-left">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-black uppercase text-amber-900 tracking-wide">Accès Restreint & Confidentiel B2B</h5>
                    <p className="text-[11px] font-semibold text-amber-700 leading-relaxed">
                      Cette candidature appartient à une offre d'emploi interne gérée directement par l'entreprise concernée. En tant qu'administrateur de la plateforme, vous n'êtes habilité qu'à visualiser les statistiques d'activité. Le dossier complet, la lettre de motivation, le Curriculum Vitae (CV) et la gestion des statuts restent la propriété exclusive et confidentielle du recruteur de l'entreprise.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Cover Letter Panel */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Lettre d'introduction / Motivation</Label>
                <div className="p-5 bg-slate-50 border border-slate-55 rounded-2xl">
                  <p className="text-xs font-semibold text-slate-600 whitespace-pre-line leading-relaxed italic">
                    {!isDirectAdminJob ? (
                      "• • • • • • • • • • (Lettre masquée pour préserver la confidentialité B2B de l'entreprise)"
                    ) : (
                      selectedApp.coverLetter ? `"${selectedApp.coverLetter}"` : `"Aucune lettre de motivation d'introduction n'a été rédigée."`
                    )}
                  </p>
                </div>
              </div>

              {/* Details Candidate Coords */}
              <div className="p-4 bg-orange-50/30 border border-orange-100/50 rounded-2xl grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-black text-slate-400">Email Candidat</p>
                  {!isDirectAdminJob ? (
                    <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-slate-300" /> ••••••••@••••.com
                    </p>
                  ) : (
                    <a href={`mailto:${selectedApp.candidateProfile?.email || selectedApp.candidateEmail}`} className="text-xs font-black text-orange-600 hover:underline flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" /> {selectedApp.candidateProfile?.email || selectedApp.candidateEmail || "Non renseigné"}
                    </a>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-black text-slate-400">Contact Téléphone</p>
                  {!isDirectAdminJob ? (
                    <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-slate-300" /> +225 •• •• •• ••
                    </p>
                  ) : (
                    <p className="text-xs font-black text-slate-800 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" /> {selectedApp.candidateProfile?.phone || "Non renseigné"}
                    </p>
                  )}
                </div>
              </div>

              {selectedApp.candidateProfile?.cvUrl && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Document Curriculum Vitae</Label>
                  {!isDirectAdminJob ? (
                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl cursor-not-allowed opacity-80">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-slate-200 text-slate-400 rounded-xl flex items-center justify-center font-bold font-sans text-xs">PDF</div>
                        <div>
                          <p className="text-xs font-bold text-slate-400">CV Confidentiel</p>
                          <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">Fichier réservé exclusivement à l'entreprise</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <a 
                      href={selectedApp.candidateProfile.cvUrl} 
                      target="_blank" 
                      rel="noopener"
                      className="flex items-center justify-between p-4 bg-white border border-slate-150 rounded-2xl hover:border-orange-500 hover:shadow-lg transition-all group/cv"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center font-bold font-sans text-xs">PDF</div>
                        <div>
                          <p className="text-xs font-black text-slate-900 group-hover/cv:text-orange-600 transition-colors">Visualiser le CV du Candidat</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Format Document PDF / Image</p>
                        </div>
                      </div>
                      <ArrowUpRight className="h-5 w-5 text-slate-300 group-hover/cv:text-orange-600 transition-colors" />
                    </a>
                  )}
                </div>
              )}

              {/* Status Action Buttons Panel - HELD ONLY FOR DIRECT JOBS */}
              {isDirectAdminJob ? (
                <div className="border-t border-slate-50 pt-5 space-y-3 font-sans">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Changer le Statut de Sélection</p>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline"
                      className={`h-10 text-[10px] font-black uppercase rounded-lg px-4 ${selectedApp.status === 'pending' ? 'bg-amber-500 text-white' : 'text-amber-600 border-amber-100 hover:bg-amber-50'}`}
                      onClick={() => handleUpdateStatus(selectedApp.id, 'pending')}
                    >
                      Mettre en attente
                    </Button>
                    <Button 
                      variant="outline"
                      className={`h-10 text-[10px] font-black uppercase rounded-lg px-4 ${selectedApp.status === 'reviewed' ? 'bg-blue-600 text-white' : 'text-blue-600 border-blue-100 hover:bg-blue-50'}`}
                      onClick={() => handleUpdateStatus(selectedApp.id, 'reviewed')}
                    >
                      Lue / Révisée
                    </Button>
                    <Button 
                      variant="outline"
                      className={`h-10 text-[10px] font-black uppercase rounded-lg px-4 ${selectedApp.status === 'interview' ? 'bg-purple-600 text-white' : 'text-purple-600 border-purple-100 hover:bg-purple-50'}`}
                      onClick={() => handleUpdateStatus(selectedApp.id, 'interview')}
                    >
                      Planifier Entretien
                    </Button>
                    <Button 
                      variant="outline"
                      className={`h-10 text-[10px] font-black uppercase rounded-lg px-4 ${selectedApp.status === 'accepted' ? 'bg-emerald-600 text-white' : 'text-emerald-00 border-emerald-100 hover:bg-emerald-50'}`}
                      onClick={() => handleUpdateStatus(selectedApp.id, 'accepted')}
                    >
                      Accepter l'embauche
                    </Button>
                    <Button 
                      variant="outline"
                      className={`h-10 text-[10px] font-black uppercase rounded-lg px-4 ${selectedApp.status === 'rejected' ? 'bg-red-600 text-white' : 'text-red-600 border-red-100 hover:bg-red-50'}`}
                      onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')}
                    >
                      Écarter / Terminer
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-slate-50 pt-5 text-left text-xs text-slate-405 font-semibold">
                  <span>Statut actuel de la candidature : </span>
                  <Badge variant="outline" className="ml-1 uppercase text-[9px] font-bold">
                    {selectedApp.status || 'pending'}
                  </Badge>
                </div>
              )}

              <DialogFooter className="border-t border-slate-50 pt-5 flex justify-between w-full">
                {isDirectAdminJob ? (
                  <Button 
                    variant="ghost" 
                    className="rounded-xl h-11 text-xs font-black text-red-500 hover:bg-red-50"
                    onClick={() => handleDeleteApplication(selectedApp.id)}
                  >
                    <Trash2 className="h-5 w-5 mr-1" /> Supprimer candidature
                  </Button>
                ) : (
                  <div />
                )}
                <Button 
                  className="rounded-xl bg-slate-950 text-white h-11 px-6 font-black text-xs uppercase"
                  onClick={() => setIsViewOpen(false)}
                >
                  Fermer
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
