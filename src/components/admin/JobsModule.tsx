import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Building2, 
  MapPin, 
  Briefcase, 
  Calendar, 
  Trash2, 
  Check, 
  Search, 
  Filter, 
  Plus, 
  Star,
  Eye,
  AlertTriangle,
  FolderOpen,
  Lock,
  Unlock,
  EyeOff,
  Sparkles,
  Mail,
  Compass,
  CheckCircle,
  HelpCircle,
  AlertOctagon,
  Loader2,
  Pencil
} from 'lucide-react';
import { Job } from '@/types';
import { collection, addDoc, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface JobsModuleProps {
  jobs: Job[];
  onAction: (
    jobId: string, 
    action: 'approve' | 'suspend' | 'delete' | 'toggleFeatured' | 'toggleRestricted' | 'toggleHidden' | 'toggleAdminFavorite', 
    reason?: string
  ) => Promise<void>;
  recruiterNames: Record<string, string>;
}

export default function JobsModule({ jobs, onAction, recruiterNames }: JobsModuleProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all"); // 'all' | 'internal' | 'external'

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Floating Toast Notification Engine
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(4);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const triggerAction = async (
    jobId: string, 
    action: 'approve' | 'suspend' | 'delete' | 'toggleFeatured' | 'toggleRestricted' | 'toggleHidden' | 'toggleAdminFavorite', 
    reason?: string
  ) => {
    const actionKey = `${jobId}-${action}`;
    setLoadingMap(prev => ({ ...prev, [actionKey]: true }));
    try {
      await onAction(jobId, action, reason);
      addToast(`Action exécutée avec succès !`, 'success');
      
      // Keep selected job details synchronized in the view state
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob(prev => {
          if (!prev) return null;
          if (action === 'toggleFeatured') {
            const nextVal = !((prev as any).is_featured || prev.isFeatured || false);
            return { ...prev, isFeatured: nextVal, is_featured: nextVal };
          }
          if (action === 'toggleRestricted') {
            const nextVal = !((prev as any).is_restricted || false);
            return { ...prev, is_restricted: nextVal };
          }
          if (action === 'toggleAdminFavorite') {
            const nextVal = !((prev as any).is_admin_favorite || false);
            return { ...prev, is_admin_favorite: nextVal };
          }
          if (action === 'toggleHidden' || action === 'suspend' || action === 'approve') {
            const nextHidden = action === 'suspend' ? true : action === 'approve' ? false : !((prev as any).is_hidden || prev.status === 'suspended' || false);
            return { ...prev, is_hidden: nextHidden, status: nextHidden ? 'suspended' : 'active' };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de l'exécution de l'opération.", 'error');
    } finally {
      setLoadingMap(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Direct Job Builder Form State
  const [newTitle, setNewTitle] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newType, setNewType] = useState("CDI");
  const [newField, setNewField] = useState("Technologie & IT");
  const [newCategory, setNewCategory] = useState("popular"); // 'popular' | 'rapid' | 'unique'
  const [newLocation, setNewLocation] = useState("Abidjan, Côte d'Ivoire");
  const [newSalary, setNewSalary] = useState("");
  const [newRequirements, setNewRequirements] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState("");
  const [newIsAnonymous, setNewIsAnonymous] = useState<boolean>(false);
  
  // New specific properties requested in Section 8
  const [newOfferType, setNewOfferType] = useState<'internal' | 'external'>('internal');
  const [newExternalApplyEmail, setNewExternalApplyEmail] = useState("");

  const [creating, setCreating] = useState(false);

  // New recruiting field parameters (checkboxes & selections)
  const [newStudyLevels, setNewStudyLevels] = useState<string[]>(["Bac+3"]);
  const [newExperienceYears, setNewExperienceYears] = useState<string>("3 ans");
  const [newRequiredDocs, setNewRequiredDocs] = useState<string[]>(["Curriculum Vitae (CV)"]);
  const [newPrioritizePlatform, setNewPrioritizePlatform] = useState<boolean>(true);

  // Admin Editing Job Form State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingJobState, setEditingJobState] = useState<Job | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editType, setEditType] = useState("CDI");
  const [editField, setEditField] = useState("Technologie & IT");
  const [editCategory, setEditCategory] = useState("popular");
  const [editOfferType, setEditOfferType] = useState<'internal' | 'external'>('internal');
  const [editLocation, setEditLocation] = useState("");
  const [editSalary, setEditSalary] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRequirements, setEditRequirements] = useState("");
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editExternalApplyEmail, setEditExternalApplyEmail] = useState("");
  const [editStudyLevels, setEditStudyLevels] = useState<string[]>(["Bac+3"]);
  const [editExperienceYears, setEditExperienceYears] = useState<string>("3 ans");
  const [editRequiredDocs, setEditRequiredDocs] = useState<string[]>(["Curriculum Vitae (CV)"]);
  const [editPrioritizePlatform, setEditPrioritizePlatform] = useState<boolean>(true);
  const [editIsAnonymous, setEditIsAnonymous] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleOpenEdit = (job: Job) => {
    setEditingJobState(job);
    setEditTitle(job.title || '');
    setEditCompany(job.companyName || '');
    setEditType((job as any).contractType || job.type || 'CDI');
    setEditField(job.field || 'Technologie & IT');
    setEditCategory(job.category || 'popular');
    setEditIsAnonymous(!!job.is_anonymous);
    setEditOfferType(job.offer_type || 'internal');
    setEditLocation(job.location || '');
    setEditSalary(job.salary || '');
    setEditDescription(job.description || '');
    setEditRequirements(job.requirements || '');
    setEditStudyLevels((job as any).studyLevels || ["Bac+3"]);
    setEditExperienceYears((job as any).experienceYears || "3 ans");
    setEditRequiredDocs((job as any).requiredDocs || ["Curriculum Vitae (CV)"]);
    setEditPrioritizePlatform((job as any).prioritizePlatform !== false);
    setEditExternalApplyEmail(job.external_apply_email || '');
    
    let expiresDateString = "";
    if (job.expiresAt) {
      try {
        const d = job.expiresAt.seconds ? new Date(job.expiresAt.seconds * 1000) : new Date(job.expiresAt);
        if (!isNaN(d.getTime())) {
          expiresDateString = d.toISOString().split('T')[0];
        }
      } catch (e) {}
    }
    setEditExpiresAt(expiresDateString);
    setIsEditOpen(true);
  };

  const handleUpdateAdminJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJobState) return;
    if (!editTitle.trim() || !editCompany.trim() || !editDescription.trim() || !editRequirements.trim() || !editExpiresAt) {
      addToast("Veuillez remplir correctement les champs obligatoires (*).", 'error');
      return;
    }
    if (editOfferType === 'external' && !editExternalApplyEmail.trim()) {
      addToast("Veuillez fournir un email de candidature pour les offres populaires relais.", 'error');
      return;
    }

    setIsUpdating(true);
    try {
      const jobRef = doc(db, 'offers', editingJobState.id);
      await updateDoc(jobRef, {
        title: editTitle,
        companyName: editCompany,
        contractType: editType,
        type: editType,
        field: editField,
        category: editCategory,
        offer_type: editOfferType,
        location: editLocation,
        salary: editSalary || "Non spécifié",
        description: editDescription,
        requirements: editRequirements,
        expiresAt: editExpiresAt ? new Date(editExpiresAt) : null,
        external_apply_email: editOfferType === 'external' ? editExternalApplyEmail : null,
        studyLevels: editStudyLevels,
        experienceYears: editExperienceYears,
        requiredDocs: editRequiredDocs,
        prioritizePlatform: editPrioritizePlatform,
        is_anonymous: editIsAnonymous,
        updatedAt: serverTimestamp()
      });
      addToast("Offre d'emploi mise à jour avec succès !", 'success');
      setIsEditOpen(false);
      
      if (selectedJob && selectedJob.id === editingJobState.id) {
        setSelectedJob({
          ...selectedJob,
          title: editTitle,
          companyName: editCompany,
          type: editType,
          field: editField,
          category: editCategory,
          offer_type: editOfferType,
          location: editLocation,
          salary: editSalary || "Non spécifié",
          description: editDescription,
          requirements: editRequirements,
          expiresAt: editExpiresAt ? { seconds: Math.floor(new Date(editExpiresAt).getTime() / 1000) } as any : null,
          external_apply_email: editOfferType === 'external' ? editExternalApplyEmail : null,
          studyLevels: editStudyLevels,
          experienceYears: editExperienceYears,
          requiredDocs: editRequiredDocs,
          prioritizePlatform: editPrioritizePlatform,
          is_anonymous: editIsAnonymous
        });
      }
    } catch (error) {
      console.error("Error updating admin job:", error);
      addToast("Erreur lors de la mise à jour de l'offre.", 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      const title = (j.title || "").toLowerCase();
      const company = (j.companyName || "").toLowerCase();
      const matchSearch = title.includes(searchTerm.toLowerCase()) || company.includes(searchTerm.toLowerCase());
      
      const matchCategory = categoryFilter === "all" || j.category === categoryFilter;
      const matchStatus = statusFilter === "all" || j.status === statusFilter;
      const matchType = typeFilter === "all" || (j.offer_type || 'internal') === typeFilter;
      
      return matchSearch && matchCategory && matchStatus && matchType;
    });
  }, [jobs, searchTerm, categoryFilter, statusFilter, typeFilter]);

  const handlePostDirectJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCompany.trim() || !newDescription.trim() || !newRequirements.trim() || !newExpiresAt) {
      addToast("Veuillez remplir correctement les champs obligatoires (*) incluant l'entreprise.", 'error');
      return;
    }

    if (newOfferType === 'external' && !newExternalApplyEmail.trim()) {
      addToast("Veuillez fournir un email de candidature pour les offres populaires relais.", 'error');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        title: newTitle,
        companyName: newCompany,
        companyLogo: "https://lh3.googleusercontent.com/d/1O58k8ZpXqgXW-9_H-Hk3V-e4I5V_H_R3=w200-h200", // beautiful brand fallback logo
        type: newType, // CDI, CDD, Freelance, Stage
        field: newField,
        category: newCategory,
        location: newLocation,
        salary: newSalary,
        description: newDescription,
        requirements: newRequirements,
        status: "active", // direct admin jobs are automatically live
        createdAt: new Date(),
        isFeatured: true, // premium status by default
        is_featured: true,
        is_hidden: false,
        is_restricted: false,
        is_anonymous: newIsAnonymous,
        offer_type: newOfferType,
        external_apply_email: newOfferType === 'external' ? newExternalApplyEmail : "",
        createdBy: "admin",
        expiresAt: new Date(newExpiresAt),
        views: 0,
        shares: 0,
        likes: 0,
        applications: 0,
        
        // Expanded recruiting criteria
        studyLevels: newStudyLevels,
        experienceYears: newExperienceYears,
        requiredDocs: newRequiredDocs,
        prioritizePlatform: newPrioritizePlatform
      };

      await addDoc(collection(db, "offers"), payload);
      addToast("L'offre d'emploi directe a été publiée avec succès sur la plateforme !", 'success');
      setIsCreateOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de la publication directe.", 'error');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setNewTitle("");
    setNewCompany("");
    setNewType("CDI");
    setNewField("Technologie & IT");
    setNewCategory("popular");
    setNewLocation("Abidjan, Côte d'Ivoire");
    setNewSalary("");
    setNewRequirements("");
    setNewDescription("");
    setNewExpiresAt("");
    setNewIsAnonymous(false);
    setNewStudyLevels(["Bac+3"]);
    setNewExperienceYears("3 ans");
    setNewRequiredDocs(["Curriculum Vitae (CV)"]);
    setNewPrioritizePlatform(true);
    setNewOfferType("internal");
    setNewExternalApplyEmail("");
  };

  return (
    <>
      {/* Floating Toast Area */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div 
            key={t.id} 
            className={`pointer-events-auto flex items-center gap-3 p-4 rounded-2xl shadow-xl transition-all border leading-normal ${
              t.type === 'error' 
                ? 'bg-rose-50 border-rose-100/85 text-rose-800' 
                : t.type === 'info' 
                  ? 'bg-blue-50 border-blue-100/85 text-blue-800' 
                  : 'bg-emerald-50 border-emerald-100/85 text-emerald-800'
            }`}
          >
            {t.type === 'error' ? (
              <AlertOctagon className="h-5 w-5 flex-shrink-0 text-rose-600" />
            ) : t.type === 'info' ? (
              <Compass className="h-5 w-5 flex-shrink-0 text-blue-600" />
            ) : (
              <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600" />
            )}
            <p className="text-xs font-black">{t.message}</p>
          </div>
        ))}
      </div>

      <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
        <CardHeader className="p-6 md:p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <CardTitle className="text-xl font-black text-slate-900">Modération des Offres</CardTitle>
            <CardDescription className="text-xs font-semibold text-slate-400 mt-1">Supervisez l'ensemble des annonces d'emploi ou publiez des offres directes au nom du groupe.</CardDescription>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Button 
              onClick={() => setIsCreateOpen(true)}
              className="h-11 rounded-xl bg-orange-600 font-black text-xs text-white uppercase tracking-wider px-5 hover:bg-orange-700 shadow-lg shadow-orange-600/15 flex items-center gap-1.5"
            >
              <Plus className="h-4.5 w-4.5" /> Publier Offre Directe
            </Button>
            
            <div className="relative flex-1 sm:w-60 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Rechercher offre, société..." 
                className="pl-9 h-11 rounded-xl border-slate-100 bg-slate-50 text-xs font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select 
              className="h-11 px-4 rounded-xl border border-slate-100 bg-slate-50 text-xs font-black uppercase text-slate-600 outline-none cursor-pointer"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">Tous les Types d'offre</option>
              <option value="internal">Recrutement Direct (Interne)</option>
              <option value="external">Offre Populaire (Relais)</option>
            </select>

            <select 
              className="h-11 px-4 rounded-xl border border-slate-100 bg-slate-50 text-xs font-black uppercase text-slate-600 outline-none cursor-pointer"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">Toutes Catégories</option>
              <option value="popular">Populaires (Test)</option>
              <option value="rapid">Recrutement Rapide (48h)</option>
              <option value="unique">Direct Partenaires</option>
            </select>

            <select 
              className="h-11 px-4 rounded-xl border border-slate-100 bg-slate-50 text-xs font-black uppercase text-slate-600 outline-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tous les Statuts</option>
              <option value="active">Actives / En ligne</option>
              <option value="pending_validation">En attente active</option>
              <option value="suspended">Masquées / Offlines</option>
            </select>
          </div>
        </CardHeader>

        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-50">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Intitulé de l'offre</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entreprise</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtre / Catégorie</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fin d'échéance</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredJobs.length > 0 ? (
                filteredJobs.map((j) => {
                  const isHidden = j.is_hidden || j.status === 'suspended';
                  const isRestricted = (j as any).is_restricted || false;
                  const isFeatured = (j as any).is_featured || j.isFeatured || false;
                  const isAdminFav = (j as any).is_admin_favorite || false;
                  const offerType = j.offer_type || 'internal';
                  const isAdminJob = j.createdBy === 'admin' || j.recruiterId === 'admin_popular' || j.recruiterId === 'admin';

                  const expDate = j.expiresAt?.seconds 
                    ? new Date(j.expiresAt.seconds * 1000).toLocaleDateString('fr-FR')
                    : (j.expiresAt ? new Date(j.expiresAt).toLocaleDateString('fr-FR') : "Illimitée");
                  
                  return (
                    <tr key={j.id} className="hover:bg-slate-50/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-orange-50/70 text-[#e25c1d] flex items-center justify-center font-sans flex-shrink-0 overflow-hidden border border-slate-100/50">
                            {j.companyLogo && j.companyLogo !== "https://lh3.googleusercontent.com/d/1O58k8ZpXqgXW-9_H-Hk3V-e4I5V_H_R3=w200-h200" ? (
                              <img src={j.companyLogo} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              <Building2 className="h-5 w-5 stroke-[2.2]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900 group-hover:text-orange-600 transition-colors truncate">{j.title}</p>
                            
                            <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                              <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1 uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                <MapPin className="h-3 w-3" /> {j.location} • {j.type}
                              </span>

                              {offerType === 'external' ? (
                                <span className="text-[9px] font-black uppercase bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded border border-teal-150/70">
                                  Offre Populaire
                                </span>
                              ) : (
                                <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-150/70">
                                  Recrutement Direct
                                </span>
                              )}

                              {isRestricted && (
                                <span className="text-[9px] font-black uppercase bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-150 flex items-center gap-0.5">
                                  <Lock className="h-2.5 w-2.5" /> Restreint
                                </span>
                              )}

                              {isHidden && (
                                <span className="text-[9px] font-black uppercase bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-150 flex items-center gap-0.5 animate-pulse">
                                  <EyeOff className="h-2.5 w-2.5" /> Masqué
                                </span>
                              )}

                              {isFeatured && (
                                <span className="text-[9px] font-black uppercase bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-150/70 flex items-center gap-0.5">
                                  <Sparkles className="h-2.5 w-2.5 text-amber-500 fill-amber-500" /> À la une
                                </span>
                              )}

                              {isAdminFav && (
                                <span className="text-[9px] font-black uppercase bg-pink-50 text-pink-700 px-1.5 py-0.5 rounded border border-pink-150/70 flex items-center gap-0.5">
                                  <Star className="h-2.5 w-2.5 text-pink-500 fill-pink-500" /> Favori Admin
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-black text-slate-700">{j.companyName || recruiterNames[j.recruiterId] || "Société Partenaire"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={`text-[9px] font-black uppercase py-0.5 px-2 rounded-md ${
                          j.category === 'rapid' 
                            ? 'bg-rose-50 text-rose-700 border-none' 
                            : j.category === 'unique' 
                              ? 'bg-blue-50 text-blue-700 border-none' 
                              : 'bg-orange-50 text-orange-700 border-none'
                        }`}>
                          {j.category === 'rapid' ? 'Recrutement Rapide (48h)' : j.category === 'unique' ? 'Direct Partenaire' : 'Offre Classique'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-400">
                        {expDate}
                      </td>
                      <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                        {/* 1. SEER (Voir) */}
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 text-xs font-black text-slate-500 hover:text-orange-600 hover:bg-orange-50/50"
                          onClick={() => { setSelectedJob(j); setIsViewOpen(true); }}
                        >
                          <Eye className="h-4 w-4 mr-0.5" /> Voir
                        </Button>

                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 text-xs font-black text-slate-500 hover:text-orange-600 hover:bg-orange-50/50"
                          onClick={() => handleOpenEdit(j)}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-0.5" /> Modifier
                        </Button>

                        {/* 2. METTRE EN AVANT (is_featured) */}
                        <Button 
                          size="sm"
                          variant="ghost"
                          className={`h-8 w-8 p-0 rounded-lg ${isFeatured ? 'text-amber-500 hover:bg-amber-50 bg-amber-50/40' : 'text-slate-300 hover:text-amber-500'}`}
                          onClick={() => triggerAction(j.id, 'toggleFeatured')}
                          title={isFeatured ? "Retirer de l'affiche à la une" : "Mettre en avant à la une"}
                          disabled={loadingMap[`${j.id}-toggleFeatured`]}
                        >
                          {loadingMap[`${j.id}-toggleFeatured`] ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className={`h-4 w-4 ${isFeatured ? 'fill-current' : ''}`} />
                          )}
                        </Button>

                        {/* 3. ÉTOILE/FAVORI ADMIN */}
                        <Button 
                          size="sm"
                          variant="ghost"
                          className={`h-8 w-8 p-0 rounded-lg ${isAdminFav ? 'text-pink-500 hover:bg-pink-50 bg-pink-50/40' : 'text-slate-300 hover:text-pink-500'}`}
                          onClick={() => triggerAction(j.id, 'toggleAdminFavorite')}
                          title={isAdminFav ? "Retirer des favoris de l'admin" : "Sélectionner comme coup de coeur admin"}
                          disabled={loadingMap[`${j.id}-toggleAdminFavorite`]}
                        >
                          {loadingMap[`${j.id}-toggleAdminFavorite`] ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Star className={`h-4 w-4 ${isAdminFav ? 'fill-current' : ''}`} />
                          )}
                        </Button>

                        {/* 4. RESTREINDRE (access is_restricted) */}
                        <Button 
                          size="sm"
                          variant="ghost"
                          className={`h-8 w-8 p-0 rounded-lg ${isRestricted ? 'text-purple-600 hover:bg-purple-50 bg-purple-50/40' : 'text-slate-300 hover:text-purple-600'}`}
                          onClick={() => triggerAction(j.id, 'toggleRestricted')}
                          title={isRestricted ? "Retirer la restriction d'accès" : "Restreindre l'accès de l'offre"}
                          disabled={loadingMap[`${j.id}-toggleRestricted`]}
                        >
                          {loadingMap[`${j.id}-toggleRestricted`] ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isRestricted ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            <Unlock className="h-4 w-4" />
                          )}
                        </Button>

                        {/* 5. MASQUER/AFFICHER (is_hidden) */}
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className={`h-8 w-8 rounded-lg p-0 ${isHidden ? 'text-emerald-600 hover:bg-emerald-50 bg-emerald-50/40' : 'text-slate-350 hover:text-rose-500'}`}
                          onClick={() => triggerAction(j.id, 'toggleHidden')}
                          title={isHidden ? "Afficher publiquement" : "Masquer l'offre temporairement"}
                          disabled={loadingMap[`${j.id}-toggleHidden`]}
                        >
                          {loadingMap[`${j.id}-toggleHidden`] ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isHidden ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>

                        {/* 6. SUPPRIMER DEFINITIVEMENT */}
                        {isAdminJob ? (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg p-0"
                            onClick={() => {
                              if (window.confirm("Êtes-vous absolument sûr de vouloir supprimer définitivement cette offre d'emploi ? Cette action supprimera également toutes les candidatures rattachées et est irréversible.")) {
                                triggerAction(j.id, 'delete');
                              }
                            }}
                            title="Supprimer définitivement du système"
                            disabled={loadingMap[`${j.id}-delete`]}
                          >
                            {loadingMap[`${j.id}-delete`] ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 text-slate-300 rounded-lg p-0 cursor-not-allowed"
                            title="Vous ne pouvez pas supprimer une offre publiée par un recruteur partenaire. Utilisez l'option Masquer."
                            disabled
                          >
                            <Trash2 className="h-4 w-4 opacity-40" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <p className="text-sm font-bold text-slate-400">Aucune offre d'emploi active sur la plateforme.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Direct Job Creation Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl w-full rounded-[30px] p-8 border-none shadow-2xl overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-orange-600" />
              Publier pour 2NG Groupe Partenaires
            </DialogTitle>
            <DialogDescription className="font-semibold text-xs text-slate-400 mt-1">
              Cette offre est directement marquée comme approuvée en tant que Partenaire Exclusif du groupe 2NG.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePostDirectJob} className="py-4 space-y-6">
            
            {/* BLOCK 1: INFORMATIONS ENTREPRISE */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-black text-orange-600 uppercase tracking-widest border-b border-orange-100 pb-2 flex items-center gap-1.5">
                <Building2 className="h-4 w-4" /> Block 1 : Informations Entreprise & Configuration
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black text-slate-900 uppercase">Type d'offre d'emploi *</Label>
                  <select 
                    className="w-full h-11 px-3 rounded-lg border border-slate-150 bg-white text-xs font-black uppercase text-slate-600 outline-none cursor-pointer p-2"
                    value={newOfferType}
                    onChange={(e) => setNewOfferType(e.target.value as 'internal' | 'external')}
                  >
                    <option value="internal">Recrutement Direct (Candidature Plateforme)</option>
                    <option value="external">Offre Populaire / Relais (Candidature Email Externe)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-black text-slate-900 uppercase">Entreprise ou Groupe Bénéficiaire *</Label>
                  <Input 
                    required
                    placeholder="Ex: 2NG Partner Executive" 
                    value={newCompany} 
                    onChange={(e) => setNewCompany(e.target.value)}
                    className="h-11 rounded-lg border-slate-150 bg-white font-semibold"
                  />
                  <div className="flex items-center gap-2 pt-1.5">
                    <input
                      type="checkbox"
                      id="newIsAnonymous"
                      checked={newIsAnonymous}
                      onChange={(e) => setNewIsAnonymous(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <Label htmlFor="newIsAnonymous" className="text-[10px] font-black text-slate-700 uppercase cursor-pointer select-none">
                      Publier anonymement
                    </Label>
                  </div>
                </div>
              </div>

              {newOfferType === 'external' && (
                <div className="space-y-1 animate-fadeIn duration-250">
                  <Label className="text-[10px] font-black text-slate-900 uppercase">Email de réception des candidatures *</Label>
                  <Input 
                    required={newOfferType === 'external'}
                    type="email"
                    placeholder="Ex: recrutement@groupe-partenaire.com" 
                    value={newExternalApplyEmail} 
                    onChange={(e) => setNewExternalApplyEmail(e.target.value)}
                    className="h-11 rounded-lg border-rose-200 bg-rose-50/10 font-bold text-xs text-rose-800"
                  />
                  <p className="text-[10px] font-bold text-rose-500 italic mt-1 bg-rose-50/50 p-2 rounded-lg border border-rose-100">
                    * Attention: Cette offre est configurée en mode Populaire / Relais. Le bouton de candidature directe sera désactivé pour les candidats, au profit d'une directive d'envoi d'email à cette adresse.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black text-slate-900 uppercase">Secteur / Domaine d'activité</Label>
                  <select 
                    className="w-full h-11 px-3 rounded-lg border border-slate-150 bg-white text-xs font-black uppercase text-slate-600 outline-none"
                    value={newField}
                    onChange={(e) => setNewField(e.target.value)}
                  >
                    <option value="Technologie & IA">Technologie & IA</option>
                    <option value="Banque, Assurances, Finance">Banque & Finance</option>
                    <option value="Bâtiment & Travaux Publics (BTP)">Bâtiments / BTP</option>
                    <option value="Transport & Logistique">Transport & Logistique</option>
                    <option value="Santé & Paramédical">Santé & Paramédical</option>
                    <option value="Agriculture & Agroalimentaire">Agriculture & Agroalimentaire</option>
                    <option value="Mines & Énergie">Mines & Énergie</option>
                    <option value="Éducation & Formation">Éducation & Formation</option>
                    <option value="Télécommunications">Télécommunications</option>
                    <option value="Tourisme & Hôtellerie">Tourisme & Hôtellerie</option>
                    <option value="Commerce, Distribution, Vente">Commerce / Vente</option>
                    <option value="Administration & Fonction Publique">Administration / Fonction Publique</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-black text-slate-900 uppercase">Localisation (Ville, Pays) *</Label>
                  <Input 
                    required
                    value={newLocation} 
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="h-11 rounded-lg border-slate-150 bg-white font-semibold"
                    placeholder="Ex: Abidjan, Côte d'Ivoire"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  id="prioritize-platform"
                  type="checkbox"
                  checked={newPrioritizePlatform}
                  onChange={(e) => setNewPrioritizePlatform(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-350 text-orange-600 focus:ring-orange-500 cursor-pointer"
                />
                <Label htmlFor="prioritize-platform" className="text-[10px] font-black text-slate-700 cursor-pointer select-none">
                  Prioriser le canal direct de la plate-forme (Recommandé)
                </Label>
              </div>
            </div>

            {/* BLOCK 2: DÉTAILS DE L’OFFRE */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-black text-orange-600 uppercase tracking-widest border-b border-orange-100 pb-2 flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" /> Block 2 : Descriptif détaillé de l'offre
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black text-slate-900 uppercase">Intitulé du Poste Recherché *</Label>
                  <Input 
                    required
                    placeholder="Ex: Chef de Projet Digital" 
                    value={newTitle} 
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="h-11 rounded-lg border-slate-150 bg-white font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-black text-slate-900 uppercase">Contrat de Travail *</Label>
                  <select 
                    className="w-full h-11 px-3 rounded-lg border border-slate-150 bg-white text-xs font-black uppercase text-slate-600 outline-none"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                  >
                    <option value="CDI">CDI (Contrat Durée Indéterminée)</option>
                    <option value="CDD">CDD (Contrat Durée Déterminée)</option>
                    <option value="Freelance">Consultant / Freelance</option>
                    <option value="Stage">Stage Professionnel</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1">
                  <Label className="text-[10px] font-black text-slate-900 uppercase">Rémunération Brute (Optionnelle)</Label>
                  <Input 
                    placeholder="Ex: 600.000 F CFA - 900.000 F CFA / Mois" 
                    value={newSalary} 
                    onChange={(e) => setNewSalary(e.target.value)}
                    className="h-11 rounded-lg border-slate-150 bg-white font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-black text-slate-900 uppercase">Valorisation d'affichage</Label>
                  <select 
                    className="w-full h-11 px-3 rounded-lg border border-slate-150 bg-white text-xs font-black uppercase text-slate-600 outline-none"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  >
                    <option value="popular">Sélection Populaire</option>
                    <option value="rapid">Recrutement Rapide (48h)</option>
                    <option value="unique">Direct Partenaire</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black text-slate-900 uppercase">Date limite d'expiration *</Label>
                <Input 
                  required
                  type="date" 
                  value={newExpiresAt} 
                  onChange={(e) => setNewExpiresAt(e.target.value)}
                  className="h-11 rounded-lg border-slate-150 bg-white font-black cursor-pointer text-xs uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-slate-900 uppercase">Présentation Descriptif de Poste *</Label>
                <Textarea 
                  required
                  rows={4}
                  placeholder="Présentez les missions quotidiennes, l'environnement de travail et les responsabilités rattachées au poste..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="rounded-lg border-slate-150 bg-white font-semibold text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* BLOCK 3: COMPÉTENCES & CRITÈRES */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-black text-orange-600 uppercase tracking-widest border-b border-orange-100 pb-2 flex items-center gap-1.5">
                <Check className="h-4 w-4" /> Block 3 : Compétences, Diplômes & Expérience
              </h4>

              {/* Expérience Requise selection */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-slate-900 uppercase">Expérience Professionnelle Requise</Label>
                <select 
                  className="w-full h-11 px-3 rounded-lg border border-slate-150 bg-white text-xs font-black uppercase text-slate-600 outline-none"
                  value={newExperienceYears}
                  onChange={(e) => setNewExperienceYears(e.target.value)}
                >
                  <option value="1 an">1 an d'expérience</option>
                  <option value="2 ans">2 ans d'expérience</option>
                  <option value="3 ans">3 ans d'expérience (Recommandé)</option>
                  <option value="5 ans">5 ans d'expérience (Senior)</option>
                  <option value="10 ans+">10 ans+ d'expérience (Expert/Directeur)</option>
                </select>
              </div>

              {/* Niveaux d'étude checkboxes selection */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-900 uppercase">Niveau d'études exigé (Sélection multiple)</Label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 bg-white p-3 rounded-xl border border-slate-150">
                  {["Bac", "Bac+2", "Bac+3", "Bac+5", "Bac+8 (Doctorat)"].map((level) => {
                    const checked = newStudyLevels.includes(level);
                    return (
                      <label key={level} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setNewStudyLevels(newStudyLevels.filter(x => x !== level));
                            } else {
                              setNewStudyLevels([...newStudyLevels, level]);
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                        {level}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Required Documents checkboxes selection */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-900 uppercase">Pièces à fournir impérativement (Cocher)</Label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 bg-white p-3 rounded-xl border border-slate-150">
                  {[
                    "Curriculum Vitae (CV)",
                    "Lettre de Motivation (LM)",
                    "Diplômes / Certificats d'études",
                    "Attestation de travail",
                    "Pièce d'identité (CNI / Passeport)"
                  ].map((docName) => {
                    const checked = newRequiredDocs.includes(docName);
                    return (
                      <label key={docName} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setNewRequiredDocs(newRequiredDocs.filter(x => x !== docName));
                            } else {
                              setNewRequiredDocs([...newRequiredDocs, docName]);
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                        {docName}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-slate-900 uppercase">Compétences & Profil réquis (1 par ligne) *</Label>
                <Textarea 
                  required
                  rows={3}
                  placeholder="Ex: Maîtrise avancée de React & NodeJS&#10;Expérience de 3 ans min en PME&#10;Rigueur et esprit critique"
                  value={newRequirements}
                  onChange={(e) => setNewRequirements(e.target.value)}
                  className="rounded-lg border-slate-150 bg-white font-semibold text-xs leading-relaxed"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-50 flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                className="rounded-xl font-black text-xs uppercase h-11 border-slate-100"
                onClick={() => setIsCreateOpen(false)}
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                className="rounded-xl bg-orange-600 text-white font-black text-xs uppercase h-11 px-6 hover:bg-orange-700 shadow-xl shadow-orange-600/15"
                disabled={creating}
              >
                {creating ? "Publication..." : "Approuver & Mettre en Ligne"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Selected Job Viewer/Moderator Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl w-full rounded-[30px] p-8 border-none shadow-2xl overflow-y-auto max-h-[85vh] bg-white">
          {selectedJob && (
            <>
              <DialogHeader className="border-b border-slate-50 pb-5">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-orange-50/70 text-[#e25c1d] flex items-center justify-center flex-shrink-0 overflow-hidden border border-orange-100/50">
                    {selectedJob.companyLogo && selectedJob.companyLogo !== "https://lh3.googleusercontent.com/d/1O58k8ZpXqgXW-9_H-Hk3V-e4I5V_H_R3=w200-h200" ? (
                      <img src={selectedJob.companyLogo} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="h-7 w-7 stroke-[2.2]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-xl font-black text-slate-950 tracking-tight leading-snug">
                      {selectedJob.title}
                    </DialogTitle>
                    <p className="text-xs font-black text-orange-600 mt-1 uppercase tracking-wider">
                      {selectedJob.companyName || recruiterNames[selectedJob.recruiterId] || "Société Partenaire"}
                    </p>
                  </div>
                </div>

                {/* Sub-Badges */}
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {selectedJob.offer_type === 'external' ? (
                    <Badge className="bg-teal-50 text-teal-700 hover:bg-teal-50 border border-teal-150 py-1 px-3.5 rounded-xl font-bold uppercase text-[9px]">
                      Offre Populaire / Relais Admin
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-150 py-1 px-3.5 rounded-xl font-bold uppercase text-[9px]">
                      Recrutement Direct (Interne)
                    </Badge>
                  )}

                  {selectedJob.is_restricted && (
                    <Badge className="bg-purple-50 text-purple-700 hover:bg-purple-50 border border-purple-150 py-1 px-3.5 rounded-xl font-bold uppercase text-[9px] flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Accès Restreint
                    </Badge>
                  )}

                  {(selectedJob.is_hidden || selectedJob.status === 'suspended') && (
                    <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border border-rose-150 py-1 px-3.5 rounded-xl font-bold uppercase text-[9px] flex items-center gap-1">
                      <EyeOff className="h-3 w-3" /> Masqué de la recherche
                    </Badge>
                  )}

                  {(selectedJob.isFeatured || (selectedJob as any).is_featured) && (
                    <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-150 py-1 px-3.5 rounded-xl font-bold uppercase text-[9px] flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-amber-500 fill-amber-500" /> Mis à la une
                    </Badge>
                  )}

                  {(selectedJob as any).is_admin_favorite && (
                    <Badge className="bg-pink-50 text-pink-700 hover:bg-pink-50 border border-pink-150 py-1 px-3.5 rounded-xl font-bold uppercase text-[9px] flex items-center gap-1">
                      <Star className="h-3 w-3 text-pink-500 fill-pink-500" /> Coup de Coeur
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 py-6 text-slate-700">
                
                {/* Side info panel */}
                <div className="md:col-span-2 bg-slate-50 p-5 rounded-2xl border border-slate-100/60 space-y-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest">Informations clés</span>
                    <div className="mt-3 space-y-3">
                      <div className="flex gap-2 text-xs font-semibold text-slate-700">
                        <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span>{selectedJob.location}</span>
                      </div>
                      <div className="flex gap-2 text-xs font-semibold text-slate-700">
                        <Briefcase className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span>Contrat : <strong className="font-extrabold uppercase">{selectedJob.type}</strong></span>
                      </div>
                      <div className="flex gap-2 text-xs font-semibold text-slate-700">
                        <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span>Fin d'offre : <strong>{selectedJob.expiresAt ? (selectedJob.expiresAt.seconds ? new Date(selectedJob.expiresAt.seconds * 1000).toLocaleDateString() : new Date(selectedJob.expiresAt).toLocaleDateString()) : "Indéterminée"}</strong></span>
                      </div>
                      <div className="flex gap-2 text-xs font-semibold text-slate-700">
                        <Building2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span>Filtre : <strong className="text-orange-600">{selectedJob.category === 'rapid' ? 'Recrutement Rapide (48h)' : selectedJob.category === 'unique' ? 'Direct Partenaire' : 'Offre Classique'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {selectedJob.offer_type === 'external' ? (
                    <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 space-y-2 animate-fadeIn">
                      <span className="text-[10px] font-black uppercase text-rose-700 block flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" /> Envoi Candidature Externe
                      </span>
                      <p className="text-[11px] font-bold text-slate-600 leading-normal">
                        Les candidats postuleront par email direct à l'adresse ci-dessous :
                      </p>
                      <span className="text-xs font-black text-rose-800 break-all select-all block bg-white p-2 rounded border border-rose-100">
                        {selectedJob.external_apply_email || "Aucun email configuré"}
                      </span>
                    </div>
                  ) : (
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-2">
                      <span className="text-[10px] font-black uppercase text-emerald-700 block flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" /> Candidature Plateforme
                      </span>
                      <p className="text-[11px] font-bold text-slate-600 leading-normal">
                        Candidature transmise directement sur la plateforme. Le recruteur reçoit et modère les profils depuis son dashboard.
                      </p>
                    </div>
                  )}

                  {/* Standard Requirements metrics */}
                  <div className="pt-2 border-t border-slate-150">
                    <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest leading-none">Critères requis</span>
                    <ul className="mt-3 space-y-1.5 text-xs font-bold text-slate-600">
                      <li>• Expérience : <span className="font-extrabold text-slate-900">{selectedJob.experienceYears || "3 ans maximum"}</span></li>
                      <li>• Niveaux d'étude : <span className="font-extrabold text-slate-900">{selectedJob.studyLevels?.join(', ') || "Tout niveau d'études"}</span></li>
                    </ul>
                  </div>
                </div>

                {/* Rich Description */}
                <div className="md:col-span-3 space-y-4">
                  <div>
                    <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded inline-block">Missions et Descriptif</h5>
                    <p className="text-xs font-semibold leading-relaxed text-slate-600 mt-2.5 whitespace-pre-wrap max-h-48 overflow-y-auto pr-2 bg-slate-50/20 p-3 rounded-lg border border-slate-100">
                      {selectedJob.description || "Aucun descriptif de poste n'est renseigné."}
                    </p>
                  </div>

                  <div>
                    <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded inline-block">Profil requis / Compétences</h5>
                    <p className="text-xs font-semibold leading-relaxed text-slate-600 mt-2.5 whitespace-pre-wrap max-h-40 overflow-y-auto pr-2 bg-slate-50/20 p-3 rounded-lg border border-slate-100">
                      {selectedJob.requirements || "Aucun critère spécifique d'embauche n'est listé."}
                    </p>
                  </div>

                  <div>
                    <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded inline-block">Pièces exigées</h5>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedJob.requiredDocs?.map((doc, idx) => (
                        <span key={idx} className="text-[9px] font-bold bg-white text-slate-700 px-2 py-1 rounded border border-slate-150 shadow-sm flex items-center gap-1">
                          <Check className="h-3 w-3 text-emerald-500" /> {doc}
                        </span>
                      )) || <span className="text-xs text-slate-400">Aucun document spécifique</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic moderation actions panel */}
              <DialogFooter className="border-t border-slate-50 pt-5 flex flex-wrap gap-2 justify-between items-center bg-slate-50/30 p-4 -mx-8 -mb-8 rounded-b-[30px]">
                <div className="flex flex-wrap gap-1.5 items-center">
                  
                  {/* Action 1: Featured Toggle */}
                  <Button 
                    variant="outline"
                    size="sm"
                    className={`h-9 font-black text-[10px] uppercase rounded-xl transition-all ${
                      (selectedJob.isFeatured || (selectedJob as any).is_featured)
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:text-amber-600'
                    }`}
                    onClick={() => triggerAction(selectedJob.id, 'toggleFeatured')}
                    disabled={loadingMap[`${selectedJob.id}-toggleFeatured`]}
                  >
                    {loadingMap[`${selectedJob.id}-toggleFeatured`] ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                    )}
                    {(selectedJob.isFeatured || (selectedJob as any).is_featured) ? 'Retirer la Une' : 'Mettre la Une'}
                  </Button>

                  {/* Action 2: Favorite Toggle */}
                  <Button 
                    variant="outline"
                    size="sm"
                    className={`h-9 font-black text-[10px] uppercase rounded-xl transition-all ${
                      (selectedJob as any).is_admin_favorite
                        ? 'bg-pink-100 text-pink-800 border-pink-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:text-pink-600'
                    }`}
                    onClick={() => triggerAction(selectedJob.id, 'toggleAdminFavorite')}
                    disabled={loadingMap[`${selectedJob.id}-toggleAdminFavorite`]}
                  >
                    {loadingMap[`${selectedJob.id}-toggleAdminFavorite`] ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Star className="h-3.5 w-3.5 mr-1" />
                    )}
                    {(selectedJob as any).is_admin_favorite ? 'Retirer Coup de Coeur' : 'Coup de Coeur'}
                  </Button>

                  {/* Action 3: Lock Toggle */}
                  <Button 
                    variant="outline"
                    size="sm"
                    className={`h-9 font-black text-[10px] uppercase rounded-xl transition-all ${
                      (selectedJob as any).is_restricted
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:text-purple-650'
                    }`}
                    onClick={() => triggerAction(selectedJob.id, 'toggleRestricted')}
                    disabled={loadingMap[`${selectedJob.id}-toggleRestricted`]}
                  >
                    {loadingMap[`${selectedJob.id}-toggleRestricted`] ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 mr-1" />
                    )}
                    {(selectedJob as any).is_restricted ? "Débloquer d'accès" : 'Restreindre'}
                  </Button>

                  {/* Action 4: Hide/Show Toggle */}
                  <Button 
                    variant="outline"
                    size="sm"
                    className={`h-9 font-black text-[10px] uppercase rounded-xl transition-all ${
                      (selectedJob.is_hidden || selectedJob.status === 'suspended')
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-white text-slate-600 border-slate-200 hover:text-rose-500'
                    }`}
                    onClick={() => triggerAction(selectedJob.id, 'toggleHidden')}
                    disabled={loadingMap[`${selectedJob.id}-toggleHidden`]}
                  >
                    {loadingMap[`${selectedJob.id}-toggleHidden`] ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 mr-1" />
                    )}
                    {(selectedJob.is_hidden || selectedJob.status === 'suspended') ? 'Remettre en ligne' : 'Masquer'}
                  </Button>

                  {/* Action 5: Supprimer */}
                  {(selectedJob.createdBy === 'admin' || selectedJob.recruiterId === 'admin_popular' || selectedJob.recruiterId === 'admin') ? (
                    <Button 
                      variant="destructive"
                      size="sm"
                      className="h-9 font-black text-[10px] uppercase rounded-xl bg-rose-600 text-white hover:bg-rose-700 hover:shadow-lg shadow-rose-600/10 flex items-center"
                      onClick={() => {
                        if (window.confirm("Voulez-vous supprimer définitivement cette offre ainsi que tous les dossiers de candidature ?")) {
                          triggerAction(selectedJob.id, 'delete');
                          setIsViewOpen(false);
                        }
                      }}
                      disabled={loadingMap[`${selectedJob.id}-delete`]}
                    >
                      {loadingMap[`${selectedJob.id}-delete`] ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                      )}
                      Supprimer
                    </Button>
                  ) : (
                    <Button 
                      variant="outline"
                      size="sm"
                      className="h-9 font-black text-[10px] uppercase rounded-xl border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed flex items-center"
                      title="Seules les offres d'emploi créées et publiées par un administrateur peuvent être supprimées."
                      disabled
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1 opacity-50" />
                      Non Supprimable
                    </Button>
                  )}

                </div>

                <Button 
                  variant="outline" 
                  className="rounded-xl font-bold text-xs uppercase h-9 border-slate-100 bg-white"
                  onClick={() => setIsViewOpen(false)}
                >
                  Fermer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Direct Job Editing Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl w-full rounded-[30px] p-8 border-none shadow-2xl overflow-y-auto max-h-[85vh] bg-white text-left">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Pencil className="h-6 w-6 text-[#e25c1d]" />
              Modifier l'offre d'emploi
            </DialogTitle>
            <DialogDescription className="font-semibold text-xs text-slate-400 mt-1">
              Remplissez les informations ci-dessous pour mettre à jour les détails affichés sur l'offre d'emploi.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateAdminJob} className="py-4 space-y-6">
            
            {/* BLOCK 1: INFORMATIONS ENTREPRISE */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-black text-[#e25c1d] uppercase tracking-widest border-b border-orange-100 pb-2 flex items-center gap-1.5">
                <Building2 className="h-4 w-4" /> Block 1 : Informations Entreprise & Configuration
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black text-slate-900 uppercase">Type d'offre d'emploi *</Label>
                  <select 
                    className="w-full h-11 px-3 rounded-lg border border-slate-150 bg-white text-xs font-black uppercase text-slate-600 outline-none cursor-pointer p-2"
                    value={editOfferType}
                    onChange={(e) => setEditOfferType(e.target.value as 'internal' | 'external')}
                  >
                    <option value="internal">Recrutement Direct (Candidature Plateforme)</option>
                    <option value="external">Offre Populaire / Relais (Candidature Email Externe)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-black text-slate-900 uppercase">Entreprise ou Groupe Bénéficiaire *</Label>
                  <Input 
                    required
                    placeholder="Ex: 2NG Partner Executive" 
                    value={editCompany} 
                    onChange={(e) => setEditCompany(e.target.value)}
                    className="h-11 rounded-lg border-slate-150 bg-white font-semibold"
                  />
                  <div className="flex items-center gap-2 pt-1.5">
                    <input
                      type="checkbox"
                      id="editIsAnonymous"
                      checked={editIsAnonymous}
                      onChange={(e) => setEditIsAnonymous(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <Label htmlFor="editIsAnonymous" className="text-[10px] font-black text-slate-700 uppercase cursor-pointer select-none">
                      Publier anonymement
                    </Label>
                  </div>
                </div>
              </div>

              {editOfferType === 'external' && (
                <div className="space-y-1 animate-fadeIn duration-250">
                  <Label className="text-[10px] font-black text-slate-900 uppercase">Email de réception des candidatures *</Label>
                  <Input 
                    required={editOfferType === 'external'}
                    type="email"
                    placeholder="Ex: recrutement@groupe-partenaire.com" 
                    value={editExternalApplyEmail} 
                    onChange={(e) => setEditExternalApplyEmail(e.target.value)}
                    className="h-11 rounded-lg border-rose-200 bg-rose-50/10 font-bold text-xs text-rose-800"
                  />
                  <p className="text-[10px] font-bold text-rose-500 italic mt-1 bg-rose-50/50 p-2 rounded-lg border border-rose-100">
                    * Attention: Cette offre est configurée en mode Populaire / Relais. Le bouton de candidature directe sera désactivé pour les candidats, au profit d'une directive d'envoi d'email à cette adresse.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black text-slate-900 uppercase">Secteur / Domaine d'activité</Label>
                  <select 
                    className="w-full h-11 px-3 rounded-lg border border-slate-150 bg-white text-xs font-black uppercase text-slate-600 outline-none cursor-pointer"
                    value={editField}
                    onChange={(e) => setEditField(e.target.value)}
                  >
                    <option value="Technologie & IA">Technologie & IA</option>
                    <option value="Banque, Assurances, Finance">Banque & Finance</option>
                    <option value="Bâtiment & Travaux Publics (BTP)">Bâtiments / BTP</option>
                    <option value="Transport & Logistique">Transport & Logistique</option>
                    <option value="Santé & Paramédical">Santé & Paramédical</option>
                    <option value="Agriculture & Agroalimentaire">Agriculture & Agroalimentaire</option>
                    <option value="Mines & Énergie">Mines & Énergie</option>
                    <option value="Éducation & Formation">Éducation & Formation</option>
                    <option value="Télécommunications">Télécommunications</option>
                    <option value="Tourisme & Hôtellerie">Tourisme & Hôtellerie</option>
                    <option value="Commerce, Distribution, Vente">Commerce / Vente</option>
                    <option value="Administration & Fonction Publique">Administration / Fonction Publique</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-black text-slate-900 uppercase">Localisation (Ville, Pays) *</Label>
                  <Input 
                    required
                    value={editLocation} 
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="h-11 rounded-lg border-slate-150 bg-white font-semibold"
                    placeholder="Ex: Abidjan, Côte d'Ivoire"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  id="edit-prioritize-platform"
                  type="checkbox"
                  checked={editPrioritizePlatform}
                  onChange={(e) => setEditPrioritizePlatform(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-350 text-orange-600 focus:ring-orange-500 cursor-pointer"
                />
                <Label htmlFor="edit-prioritize-platform" className="text-[10px] font-black text-slate-700 cursor-pointer select-none">
                  Prioriser le canal direct de la plate-forme (Recommandé)
                </Label>
              </div>
            </div>

            {/* BLOCK 2: DÉTAILS DE L’OFFRE */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-black text-[#e25c1d] uppercase tracking-widest border-b border-orange-100 pb-2 flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" /> Block 2 : Descriptif détaillé de l'offre
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black text-slate-900 uppercase">Intitulé du Poste Recherché *</Label>
                  <Input 
                    required
                    placeholder="Ex: Chef de Projet Digital" 
                    value={editTitle} 
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-11 rounded-lg border-slate-150 bg-white font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-black text-slate-900 uppercase">Contrat de Travail *</Label>
                  <select 
                    className="w-full h-11 px-3 rounded-lg border border-slate-150 bg-white text-xs font-black uppercase text-slate-600 outline-none cursor-pointer"
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                  >
                    <option value="CDI">CDI (Contrat Durée Indéterminée)</option>
                    <option value="CDD">CDD (Contrat Durée Déterminée)</option>
                    <option value="Freelance">Consultant / Freelance</option>
                    <option value="Stage">Stage Professionnel</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1">
                  <Label className="text-[10px] font-black text-slate-900 uppercase">Rémunération Brute (Optionnelle)</Label>
                  <Input 
                    placeholder="Ex: 600.000 F CFA - 900.000 F CFA / Mois" 
                    value={editSalary} 
                    onChange={(e) => setEditSalary(e.target.value)}
                    className="h-11 rounded-lg border-slate-150 bg-white font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-black text-slate-900 uppercase">Valorisation d'affichage</Label>
                  <select 
                    className="w-full h-11 px-3 rounded-lg border border-slate-150 bg-white text-xs font-black uppercase text-slate-600 outline-none cursor-pointer"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                  >
                    <option value="popular">Sélection Populaire</option>
                    <option value="rapid">Recrutement Rapide (48h)</option>
                    <option value="unique">Direct Partenaire</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black text-slate-900 uppercase">Date limite d'expiration *</Label>
                <Input 
                  required
                  type="date" 
                  value={editExpiresAt} 
                  onChange={(e) => setEditExpiresAt(e.target.value)}
                  className="h-11 rounded-lg border-slate-150 bg-white font-black cursor-pointer text-xs uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-slate-900 uppercase">Présentation Descriptif de Poste *</Label>
                <Textarea 
                  required
                  rows={4}
                  placeholder="Présentez les missions quotidiennes, l'environnement de travail et les responsabilités rattachées au poste..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="rounded-lg border-slate-150 bg-white font-semibold text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* BLOCK 3: COMPÉTENCES & CRITÈRES */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-black text-[#e25c1d] uppercase tracking-widest border-b border-orange-100 pb-2 flex items-center gap-1.5">
                <Check className="h-4 w-4" /> Block 3 : Compétences, Diplômes & Expérience
              </h4>

              {/* Expérience Requise selection */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-slate-900 uppercase">Expérience Professionnelle Requise</Label>
                <select 
                  className="w-full h-11 px-3 rounded-lg border border-slate-150 bg-white text-xs font-black uppercase text-slate-600 outline-none cursor-pointer"
                  value={editExperienceYears}
                  onChange={(e) => setEditExperienceYears(e.target.value)}
                >
                  <option value="1 an">1 an d'expérience</option>
                  <option value="2 ans">2 ans d'expérience</option>
                  <option value="3 ans">3 ans d'expérience (Recommandé)</option>
                  <option value="5 ans">5 ans d'expérience (Senior)</option>
                  <option value="10 ans+">10 ans+ d'expérience (Expert/Directeur)</option>
                </select>
              </div>

              {/* Niveaux d'étude checkboxes selection */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-900 uppercase">Niveau d'études exigé (Sélection multiple)</Label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 bg-white p-3 rounded-xl border border-slate-150">
                  {["Bac", "Bac+2", "Bac+3", "Bac+5", "Bac+8 (Doctorat)"].map((level) => {
                    const checked = editStudyLevels.includes(level);
                    return (
                      <label key={level} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setEditStudyLevels(editStudyLevels.filter(x => x !== level));
                            } else {
                              setEditStudyLevels([...editStudyLevels, level]);
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                        {level}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Required Documents checkboxes selection */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-900 uppercase">Pièces à fournir impérativement (Cocher)</Label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 bg-white p-3 rounded-xl border border-slate-150">
                  {[
                    "Curriculum Vitae (CV)",
                    "Lettre de Motivation (LM)",
                    "Diplômes / Certificats d'études",
                    "Attestation de travail",
                    "Pièce d'identité (CNI / Passeport)"
                  ].map((docName) => {
                    const checked = editRequiredDocs.includes(docName);
                    return (
                      <label key={docName} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setEditRequiredDocs(editRequiredDocs.filter(x => x !== docName));
                            } else {
                              setEditRequiredDocs([...editRequiredDocs, docName]);
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                        {docName}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-slate-900 uppercase">Compétences & Profil réquis (1 par ligne) *</Label>
                <Textarea 
                  required
                  rows={3}
                  placeholder="Ex: Maîtrise avancée de React & NodeJS&#10;Expérience de 3 ans min en PME&#10;Rigueur et esprit critique"
                  value={editRequirements}
                  onChange={(e) => setEditRequirements(e.target.value)}
                  className="rounded-lg border-slate-150 bg-white font-semibold text-xs leading-relaxed"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-50 flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                className="rounded-xl font-black text-xs uppercase h-11 border-slate-100"
                onClick={() => setIsEditOpen(false)}
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                className="rounded-xl bg-[#e25c1d] text-white font-black text-xs uppercase h-11 px-6 hover:bg-[#c94d15] shadow-xl shadow-orange-600/15"
                disabled={isUpdating}
              >
                {isUpdating ? "Enregistrement..." : "Sauvegarder les modifications"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
