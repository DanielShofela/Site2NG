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
  FolderOpen
} from 'lucide-react';
import { Job } from '@/types';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface JobsModuleProps {
  jobs: Job[];
  onAction: (jobId: string, action: 'approve' | 'suspend' | 'delete' | 'toggleFeatured', reason?: string) => Promise<void>;
  recruiterNames: Record<string, string>;
}

export default function JobsModule({ jobs, onAction, recruiterNames }: JobsModuleProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Direct Job Builder Form State
  const [newTitle, setNewTitle] = useState("");
  const [newCompany, setNewCompany] = useState("2NG Groupe Партенер");
  const [newType, setNewType] = useState("CDI");
  const [newField, setNewField] = useState("Technologie & IT");
  const [newCategory, setNewCategory] = useState("popular"); // 'popular' | 'rapid' | 'unique'
  const [newLocation, setNewLocation] = useState("Abidjan, Côte d'Ivoire");
  const [newSalary, setNewSalary] = useState("");
  const [newRequirements, setNewRequirements] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      const title = (j.title || "").toLowerCase();
      const company = (j.companyName || "").toLowerCase();
      const matchSearch = title.includes(searchTerm.toLowerCase()) || company.includes(searchTerm.toLowerCase());
      
      const matchCategory = categoryFilter === "all" || j.category === categoryFilter;
      const matchStatus = statusFilter === "all" || j.status === statusFilter;
      
      return matchSearch && matchCategory && matchStatus;
    });
  }, [jobs, searchTerm, categoryFilter, statusFilter]);

  const handlePostDirectJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim() || !newRequirements.trim() || !newExpiresAt) {
      alert("Veuillez remplir correctement les champs obligatoires (*) incluant la date d'expiration.");
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
        createdBy: "admin",
        expiresAt: new Date(newExpiresAt),
        views: 0
      };

      await addDoc(collection(db, "offers"), payload);
      alert("L'offre d'emploi directe a été publiée avec succès sur la plateforme !");
      setIsCreateOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la publication directe.");
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setNewTitle("");
    setNewCompany("2NG Groupe Partenaire");
    setNewType("CDI");
    setNewField("Technologie & IT");
    setNewCategory("popular");
    setNewLocation("Abidjan, Côte d'Ivoire");
    setNewSalary("");
    setNewRequirements("");
    setNewDescription("");
    setNewExpiresAt("");
  };

  return (
    <>
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
                  const isSuspended = j.status === 'suspended';
                  const expDate = j.expiresAt?.seconds 
                    ? new Date(j.expiresAt.seconds * 1000).toLocaleDateString('fr-FR')
                    : (j.expiresAt ? new Date(j.expiresAt).toLocaleDateString('fr-FR') : "Illimitée");
                  
                  return (
                    <tr key={j.id} className="hover:bg-slate-50/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold font-sans">
                            {j.companyLogo ? (
                              <img src={j.companyLogo} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              j.title?.[0] || 'J'
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900 group-hover:text-orange-600 transition-colors truncate">{j.title}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1.5 uppercase">
                              <MapPin className="h-3.5 w-3.5" /> Le poste : {j.location} • {j.type}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-black text-slate-700">{j.companyName || recruiterNames[j.recruiterId] || "2NG Partner"}</p>
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
                          className={`h-8 w-8 p-0 rounded-lg ${j.isFeatured ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:text-amber-500'}`}
                          onClick={() => onAction(j.id, 'toggleFeatured')}
                          title={j.isFeatured ? "Retirer de l'affiche" : "Mettre à la une"}
                        >
                          <Star className="h-4 w-4 fill-current" />
                        </Button>

                        {isSuspended ? (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 rounded-lg p-0"
                            onClick={() => onAction(j.id, 'approve')}
                            title="Publier en ligne"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-lg p-0"
                            onClick={() => {
                              const note = prompt("Saisissez une note de modération ou raison de suspension :");
                              if (note !== null) onAction(j.id, 'suspend', note);
                            }}
                            title="Masquer l'offre"
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </Button>
                        )}

                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 text-red-600 hover:bg-red-100 rounded-lg p-0"
                          onClick={() => {
                            if (confirm("Voulez-vous supprimer définitivement ce poste ? Les candidats postulants ne pourront plus y accéder.")) {
                              onAction(j.id, 'delete');
                            }
                          }}
                          title="Supprimer définitivement"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-black text-slate-900 uppercase">Intitulé du Poste *</Label>
                <Input 
                  required
                  placeholder="Ex: Chef de Projet Digital" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="h-11 rounded-lg border-slate-100 bg-slate-50 font-semibold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black text-slate-900 uppercase">Entreprise ou Logo Partenaire *</Label>
                <Input 
                  required
                  placeholder="Ex: 2NG Partner Executive" 
                  value={newCompany} 
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="h-11 rounded-lg border-slate-100 bg-slate-50 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-black text-slate-900 uppercase">Secteur / Domaine d'activité</Label>
                <select 
                  className="w-full h-11 px-3 rounded-lg border border-slate-100 bg-slate-50 text-xs font-black uppercase text-slate-600 outline-none"
                  value={newField}
                  onChange={(e) => setNewField(e.target.value)}
                >
                  <option value="Technologie & IT">Technologie & IT</option>
                  <option value="Banque, Assurances, Finance">Banque & Finance</option>
                  <option value="Bâtiment & Travaux Publics">Bâtiments / BTP</option>
                  <option value="Agriculture & Élevage">Agriculture & Élevage</option>
                  <option value="Automobile & Transport">Automobile / Transport</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black text-slate-900 uppercase">Catégorie de valorisation</Label>
                <select 
                  className="w-full h-11 px-3 rounded-lg border border-slate-100 bg-slate-50 text-xs font-black uppercase text-slate-600 outline-none"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  <option value="popular">Sélection Populaire</option>
                  <option value="rapid">Recrutement Rapide (48h)</option>
                  <option value="unique">Direct Partenaires (2NG)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-black text-slate-900 uppercase">Type Contrat *</Label>
                <select 
                  className="w-full h-11 px-3 rounded-lg border border-slate-100 bg-slate-50 text-xs font-black uppercase text-slate-600 outline-none"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                >
                  <option value="CDI">CDI</option>
                  <option value="CDD">CDD</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Stage">Stage</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black text-slate-900 uppercase">Zone / Localisation</Label>
                <Input 
                  value={newLocation} 
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="h-11 rounded-lg border-slate-100 bg-slate-50 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black text-slate-900 uppercase">Date Fin d'Expiration *</Label>
                <Input 
                  required
                  type="date" 
                  value={newExpiresAt} 
                  onChange={(e) => setNewExpiresAt(e.target.value)}
                  className="h-11 rounded-lg border-slate-100 bg-slate-50 font-black cursor-pointer text-xs uppercase"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black text-slate-900 uppercase">Rémunération indicative (Facultative)</Label>
              <Input 
                placeholder="Ex: 500.000 F CFA - 800.000 F CFA / Mois" 
                value={newSalary} 
                onChange={(e) => setNewSalary(e.target.value)}
                className="h-11 rounded-lg border-slate-100 bg-slate-50 font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-slate-900 uppercase">Compétences & Profil réquis (1 par ligne) *</Label>
              <Textarea 
                required
                rows={3}
                placeholder="Ex: Maîtrise avancée de React & NodeJS&#10;Expérience de 3 ans min en PME&#10;Rigueur et esprit critique"
                value={newRequirements}
                onChange={(e) => setNewRequirements(e.target.value)}
                className="rounded-lg border-slate-100 bg-slate-50 font-semibold text-xs leading-relaxed"
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
                className="rounded-lg border-slate-100 bg-slate-50 font-semibold text-xs leading-relaxed"
              />
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
    </>
  );
}
