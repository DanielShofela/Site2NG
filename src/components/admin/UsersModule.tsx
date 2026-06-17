import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Trash2, 
  Lock, 
  Unlock, 
  Eye, 
  FileText, 
  Download,
  ShieldCheck,
  UserCheck,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles,
  Award
} from 'lucide-react';
import { UserProfile } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, initializeAuth, inMemoryPersistence } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFirebaseFriendlyError } from '@/lib/utils';
import firebaseConfig from '../../../firebase-applet-config.json';

interface UsersModuleProps {
  users: UserProfile[];
  onAction: (uid: string, action: 'suspend' | 'activate' | 'delete' | 'promote' | 'approve' | 'reject' | 'correction', message?: string) => Promise<void>;
  addLog: (action: string, target: string, type: string) => Promise<void>;
}

export default function UsersModule({ users, onAction, addLog }: UsersModuleProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [cityFilter, setCityFilter] = useState("");
  const [sortField, setSortField] = useState("createdAt"); // 'createdAt' | 'name'
  const [sortOrder, setSortOrder] = useState("desc");      // 'asc' | 'desc'
  
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  
  const [adminNotesText, setAdminNotesText] = useState("");
  const [isSendingCorrection, setIsSendingCorrection] = useState(false);

  // Create Company States
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [addCompanyLoading, setAddCompanyLoading] = useState(false);
  
  const [newCompany, setNewCompany] = useState({
    email: "",
    password: "",
    companyName: "",
    sectorActivity: "",
    registrationNumber: "",
    phone: "",
    city: "",
    companyDescription: "",
    companySize: "11-50",
    companyType: "PME",
    website: "",
  });

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCompany.email || !newCompany.password || !newCompany.companyName) {
      alert("Veuillez remplir l'adresse e-mail, le mot de passe et le nom de l'entreprise.");
      return;
    }
    
    if (newCompany.password.length < 6) {
      alert("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    
    setAddCompanyLoading(true);
    try {
      // 1. Create secondary auth account
      let secondaryApp;
      const apps = getApps();
      const existingApp = apps.find(app => app.name === 'secondary-admin-create');
      if (existingApp) {
        secondaryApp = existingApp;
      } else {
        secondaryApp = initializeApp(firebaseConfig, 'secondary-admin-create');
      }
      
      let secondaryAuth;
      try {
        secondaryAuth = initializeAuth(secondaryApp, {
          persistence: inMemoryPersistence
        });
      } catch (e) {
        secondaryAuth = getAuth(secondaryApp);
      }
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newCompany.email, newCompany.password);
      const uid = userCredential.user.uid;
      
      // Sign out from the secondary instance to free memory/prevent session caching
      await signOut(secondaryAuth);
      
      // 2. Write the user's profile to Firestore db
      const profileData: UserProfile = {
        uid: uid,
        email: newCompany.email,
        role: "recruiter" as const,
        status: "approved" as const, // Direct approval since created by admin
        accountStatus: "active" as const,
        displayName: newCompany.companyName,
        companyName: newCompany.companyName,
        phone: newCompany.phone || "",
        location: newCompany.city || "",
        city: newCompany.city || "",
        sectorActivity: newCompany.sectorActivity || "",
        registrationNumber: newCompany.registrationNumber || "",
        companyDescription: newCompany.companyDescription || "",
        companySize: newCompany.companySize || "11-50",
        companyType: newCompany.companyType || "PME",
        website: newCompany.website || "",
        profileComplete: true,
        createdAt: serverTimestamp() as any,
      };
      
      await setDoc(doc(db, 'users', uid), profileData);
      
      await addLog("Création d'entreprise", `L'entreprise "${newCompany.companyName}" a été créée par l'administrateur (${newCompany.email})`, "info");
      
      alert(`L'entreprise "${newCompany.companyName}" a été créée avec succès et son compte est directement approuvé.`);
      
      // Clear forms
      setNewCompany({
        email: "",
        password: "",
        companyName: "",
        sectorActivity: "",
        registrationNumber: "",
        phone: "",
        city: "",
        companyDescription: "",
        companySize: "11-50",
        companyType: "PME",
        website: "",
      });
      setIsAddCompanyOpen(false);
    } catch (err: any) {
      console.warn("Company creation failed (handled):", err.message || err);
      const friendlyError = getFirebaseFriendlyError(err);
      alert(`Erreur lors de la création de l'entreprise : ${friendlyError}`);
    } finally {
      setAddCompanyLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    // 1. Filter
    let result = users.filter(u => {
      const name = (u.displayName || u.companyName || u.email || "").toLowerCase();
      const matchSearch = name.includes(searchTerm.toLowerCase());
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      
      let matchStatus = true;
      if (statusFilter !== "all") {
        if (statusFilter === "suspended") matchStatus = u.accountStatus === "suspended";
        else if (statusFilter === "active") matchStatus = u.accountStatus !== "suspended";
        else if (statusFilter === "pending") matchStatus = u.status === "pending" || u.status === "submitted" || u.status === "verifying";
      }

      const userCity = (u.city || "").toLowerCase();
      const matchCity = !cityFilter || userCity.includes(cityFilter.toLowerCase());
      
      return matchSearch && matchRole && matchStatus && matchCity;
    });

    // 2. Sort
    result.sort((a, b) => {
      if (sortField === "name") {
        const nameA = (a.companyName || a.displayName || a.email || "").toLowerCase();
        const nameB = (b.companyName || b.displayName || b.email || "").toLowerCase();
        return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      } else if (sortField === "createdAt") {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      }
      return 0;
    });

    return result;
  }, [users, searchTerm, roleFilter, statusFilter, cityFilter, sortField, sortOrder]);

  // Export users to CSV format
  const handleExportCSV = () => {
    try {
      const headers = ["ID", "Email", "Nom/Entreprise", "Rôle", "Statut Compte", "Statut Juridique", "Téléphone", "Ville", "Créé Le"];
      const rows = filteredUsers.map(u => [
        u.uid,
        u.email,
        u.displayName || u.companyName || "N/A",
        u.role,
        u.accountStatus || "active",
        u.status || "N/A",
        u.phone || "N/A",
        u.city || "N/A",
        u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000).toLocaleDateString('fr-FR') : "N/A"
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `utilisateurs_2ng_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addLog("Export CSV Utilisateurs", `${filteredUsers.length} utilisateurs exportés`, "info");
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'export.");
    }
  };

  const handlePromoteAdmin = async (uid: string) => {
    if (confirm("Voulez-vous vraiment promouvoir cet utilisateur comme administrateur principal ?")) {
      await onAction(uid, 'promote'); // will be handled or update role directly
      alert("Utilisateur promu avec succès !");
    }
  };

  return (
    <>
      <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
        <CardHeader className="border-b border-slate-50 flex flex-col gap-6 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <CardTitle className="text-xl font-black text-slate-900 animate-fade-in">Annuaire des Adhérents</CardTitle>
              <CardDescription className="text-xs font-semibold text-slate-400 mt-1">Supervisez, suspendez ou supprimez les comptes inscrits.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <Button 
                onClick={() => setIsAddCompanyOpen(true)}
                className="h-11 rounded-xl font-black text-xs uppercase px-4 bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2 w-full sm:w-auto justify-center shadow-lg shadow-orange-600/10"
              >
                <Building2 className="h-4 w-4" /> Ajouter une Entreprise
              </Button>
              <Button 
                onClick={handleExportCSV}
                variant="outline" 
                className="h-11 rounded-xl font-black text-xs uppercase px-4 border-slate-100 bg-slate-50 flex items-center gap-2 text-slate-600 hover:bg-slate-100 w-full sm:w-auto justify-center"
              >
                <Download className="h-4 w-4 text-orange-600" /> Export CSV
              </Button>
            </div>
          </div>

          {/* ADVANCED FILTER GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/60 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input 
                placeholder="Nom, entreprise, email..." 
                className="pl-9 h-10 border-slate-150 bg-white text-xs font-semibold rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input 
                placeholder="Filtrer par Ville..." 
                className="pl-9 h-10 border-slate-150 bg-white text-xs font-semibold rounded-xl"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
              />
            </div>

            <select 
              className="h-10 px-3.5 rounded-xl border border-slate-150 bg-white text-xs font-black uppercase text-slate-600 outline-none cursor-pointer"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">Tous les rôles</option>
              <option value="candidate">Candidats</option>
              <option value="recruiter">Recruteurs</option>
              <option value="admin">Admins</option>
            </select>

            <select 
              className="h-10 px-3.5 rounded-xl border border-slate-150 bg-white text-xs font-black uppercase text-slate-600 outline-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Comptes Actifs</option>
              <option value="suspended">Comptes Suspendus</option>
              <option value="pending">En attente juridique (Validation)</option>
            </select>

            <div className="flex gap-2">
              <select 
                className="h-10 px-3 rounded-xl border border-slate-150 bg-white text-[10px] font-black uppercase text-slate-600 outline-none cursor-pointer flex-1"
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
              >
                <option value="createdAt">Date Inscription</option>
                <option value="name">Noms (A-Z)</option>
              </select>
              <select 
                className="h-10 px-2.5 rounded-xl border border-slate-150 bg-white text-[9px] font-black uppercase text-slate-500 outline-none cursor-pointer shrink-0"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="desc">DECR ↓</option>
                <option value="asc">CROI ↑</option>
              </select>
            </div>
          </div>
        </CardHeader>
        
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-50">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Utilisateur</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type / Rôle</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut Administratif</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Création</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const isSuspended = u.accountStatus === 'suspended';
                  const dateLabel = u.createdAt?.seconds 
                    ? new Date(u.createdAt.seconds * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                    : "Récemment";
                  
                  return (
                    <tr key={u.uid} className="hover:bg-slate-50/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4 min-w-[240px]">
                          <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-black text-base shrink-0 border border-slate-100 overflow-hidden ${
                            u.role === 'recruiter' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                          }`}>
                            {u.photoUrl ? (
                              <img src={u.photoUrl} className="w-full h-full object-cover" />
                            ) : (
                              u.displayName?.[0] || u.companyName?.[0] || 'U'
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900 leading-tight truncate">
                              {u.displayName || u.companyName || u.email}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 truncate mt-1">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={`text-[9px] font-black uppercase py-0.5 px-2 rounded-md ${
                          u.role === 'recruiter' 
                            ? 'bg-purple-50 text-purple-700 border-none' 
                            : u.role === 'admin' 
                              ? 'bg-orange-50 text-orange-700 border-none' 
                              : 'bg-blue-50 text-blue-700 border-none'
                        }`}>
                          {u.role === 'recruiter' ? 'Recruteur' : u.role === 'admin' ? 'Administrateur' : 'Candidat'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          isSuspended 
                            ? 'border-red-100 text-red-700 bg-red-50' 
                            : 'border-emerald-100 text-emerald-700 bg-emerald-50'
                        }`}>
                          {isSuspended ? 'Suspendu' : 'Actif / OK'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-400">
                        {dateLabel}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap space-x-1.5">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-9 px-3 text-xs font-black text-slate-500 hover:text-orange-600 hover:bg-orange-50/50 rounded-lg transition-colors gap-1"
                          onClick={() => { setSelectedUser(u); setIsViewOpen(true); }}
                        >
                          <Eye className="h-4 w-4" /> Détails
                        </Button>
                        
                        {isSuspended ? (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-9 w-9 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 p-0"
                            title="Réactiver le compte"
                            onClick={() => onAction(u.uid, 'activate')}
                          >
                            <Unlock className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-9 w-9 rounded-lg text-orange-600 hover:bg-orange-50 hover:text-orange-700 p-0"
                            title="Suspendre le compte"
                            onClick={() => onAction(u.uid, 'suspend')}
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        )}

                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-9 w-9 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 p-0"
                          title="Supprimer définitivement"
                          onClick={() => { setUserToDelete(u); setIsDeleteOpen(true); }}
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
                    <p className="text-sm font-bold text-slate-400">Aucun adhérent ne correspond à vos filtres.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Profil User Visualizer Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl w-full rounded-[32px] p-8 border-none shadow-2xl overflow-y-auto max-h-[90vh]">
          {selectedUser && (
            <div className="space-y-8">
              <DialogHeader className="border-b border-slate-50 pb-6">
                <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-black ${
                    selectedUser.role === 'recruiter' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {selectedUser.photoUrl ? (
                      <img src={selectedUser.photoUrl} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      selectedUser.displayName?.[0] || 'U'
                    )}
                  </div>
                  <div className="text-left">
                    <p>{selectedUser.displayName || selectedUser.companyName}</p>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{selectedUser.role} • UID: {selectedUser.uid}</p>
                  </div>
                </DialogTitle>
                <DialogDescription className="text-left font-bold text-sm text-slate-500">
                  Fiche d'identité consolidée de l'adhérent 2NG.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Lateral Profile Details */}
                <div className="md:col-span-1 bg-slate-50/50 border border-slate-100 rounded-3xl p-6 space-y-6">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Coordonnées</p>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="text-xs font-bold truncate">{selectedUser.email}</span>
                    </div>
                    {selectedUser.phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-xs font-bold">{selectedUser.phone}</span>
                      </div>
                    )}
                    {selectedUser.location && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-xs font-bold truncate">{selectedUser.location}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-6 space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Informations Annexes</p>
                    <p className="text-xs font-bold text-slate-600">Genre: <span className="font-extrabold text-slate-800">{selectedUser.gender || 'Non spécifié'}</span></p>
                    <p className="text-xs font-bold text-slate-600">Nationalité: <span className="font-extrabold text-slate-800">{selectedUser.nationality || 'Non spécifié'}</span></p>
                    <p className="text-xs font-bold text-slate-600">Date Naissance: <span className="font-extrabold text-slate-800">{selectedUser.birthDate || 'Non spécifié'}</span></p>
                  </div>

                  {selectedUser.role === 'candidate' && selectedUser.cvUrl && (
                    <div className="border-t border-slate-100 pt-6">
                      <a 
                        href={selectedUser.cvUrl} 
                        target="_blank" 
                        rel="noopener"
                        className="flex items-center justify-between p-4 bg-white border border-slate-150 rounded-2xl hover:border-orange-500 hover:shadow-sm transition-all group/cv"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-5 w-5 text-orange-600 shrink-0" />
                          <p className="text-xs font-black truncate text-slate-800 group-hover/cv:text-orange-600">{selectedUser.cvName || "CV_Candidate.pdf"}</p>
                        </div>
                        <Eye className="h-4 w-4 text-slate-300 group-hover/cv:text-orange-600 shrink-0" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Main Content Info */}
                <div className="md:col-span-2 space-y-6">
                  {selectedUser.role === 'recruiter' ? (
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Description</p>
                        <p className="text-sm text-slate-600 leading-relaxed font-semibold">{selectedUser.companyDescription || "Aucune description fournie par l'entreprise."}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl">
                          <p className="text-[10px] font-black uppercase text-slate-400">RCCM / Enregistrement</p>
                          <p className="text-sm font-black text-slate-800 mt-1">{selectedUser.registrationNumber || "Non renseigné"}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl">
                          <p className="text-[10px] font-black uppercase text-slate-400">Secteur Activité</p>
                          <p className="text-sm font-black text-slate-800 mt-1">{selectedUser.sectorActivity || "Non renseigné"}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl">
                          <p className="text-[10px] font-black uppercase text-slate-400">Type de Société</p>
                          <p className="text-sm font-black text-slate-800 mt-1">{selectedUser.companyType || "Non renseigné"}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl">
                          <p className="text-[10px] font-black uppercase text-slate-400">Taille</p>
                          <p className="text-sm font-black text-slate-800 mt-1">{selectedUser.companySize || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Candidate details */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Métier ciblé / Secteur</p>
                        <p className="text-lg font-black text-slate-800 flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-orange-600" />
                          {selectedUser.jobTitle || "Recherche de poste"}
                        </p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{selectedUser.sector || "Domaine de compétence non spécifié"}</p>
                      </div>

                      {selectedUser.skills && selectedUser.skills.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Compétences clés</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedUser.skills.map((s, i) => (
                              <Badge key={i} variant="outline" className="border-slate-100 bg-slate-50 font-black text-[10px] py-1 px-3 text-slate-700 capitalize">
                                {s.name} ({s.level === 'expert' ? 'Expert' : s.level === 'advanced' ? 'Avancé' : 'Intermédiaire'})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedUser.experiences && selectedUser.experiences.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Parcours Professionnel</p>
                          <div className="space-y-4">
                            {selectedUser.experiences.map((exp: any, i) => (
                              <div key={i} className="flex gap-4 border-l-2 border-slate-100 pl-4 relative.">
                                <span className="absolute -left-1.5 h-3 w-3 rounded-full bg-orange-600" />
                                <div className="space-y-1">
                                  <p className="text-sm font-black text-slate-800 leading-none">{exp.role}</p>
                                  <p className="text-xs font-bold text-slate-400 mt-1">{exp.company} • {exp.startDate} - {exp.current ? 'Présent' : exp.endDate}</p>
                                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-semibold">{exp.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-50 pt-6 flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="rounded-xl font-black text-[10px] uppercase h-11 px-6 border-slate-100 text-slate-500"
                  onClick={() => setIsViewOpen(false)}
                >
                  Fermer la vue
                </Button>
                {selectedUser.role !== 'admin' && (
                  <Button 
                    type="button" 
                    className="rounded-xl font-black text-[10px] uppercase bg-slate-950 text-white h-11 px-6 hover:bg-slate-800 shadow-lg"
                    onClick={() => { handlePromoteAdmin(selectedUser.uid); setIsViewOpen(false); }}
                  >
                    Promouvoir Co-Admin
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Account Deletion Prompt */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md w-full rounded-[30px] p-6 border-none shadow-2xl text-center">
          <DialogHeader>
            <div className="h-14 w-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-7 w-7" />
            </div>
            <DialogTitle className="text-xl font-black text-slate-900 text-center">Suppression Définitive</DialogTitle>
            <DialogDescription className="text-center text-sm text-slate-500 mt-2 font-medium leading-relaxed">
              Voulez-vous vraiment écarter définitivement <span className="font-extrabold text-slate-800">{userToDelete?.displayName || userToDelete?.companyName}</span> de la plateforme ? Cette opération est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex sm:justify-center gap-3 w-full">
            <Button 
              type="button" 
              variant="outline" 
              className="rounded-xl font-black text-xs uppercase h-11 flex-1 border-slate-100" 
              onClick={() => setIsDeleteOpen(false)}
            >
              Non, Conserver
            </Button>
            <Button 
              type="button" 
              className="rounded-xl font-black text-xs uppercase h-11 flex-1 bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-600/10" 
              onClick={async () => {
                if (userToDelete) {
                  await onAction(userToDelete.uid, 'delete');
                  setIsDeleteOpen(false);
                }
              }}
            >
              Oui, Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue d'ajout d'entreprise */}
      <Dialog open={isAddCompanyOpen} onOpenChange={setIsAddCompanyOpen}>
        <DialogContent className="max-w-3xl w-full rounded-[32px] p-8 border-none shadow-2xl overflow-y-auto max-h-[90vh] bg-white">
          <DialogHeader className="border-b border-slate-150 pb-6">
            <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p>Créer un compte Entreprise</p>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Ajouter un nouveau profil recruteur</p>
              </div>
            </DialogTitle>
            <DialogDescription className="text-left font-semibold text-sm text-slate-500">
              Remplissez les informations ci-dessous pour inscrire et approuver directement une nouvelle entreprise partenaire.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCompany} className="space-y-6 pt-4 text-left">
            {/* Section 1: Connexion et Accès */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-orange-600 uppercase tracking-wider">1. Identifiants d'accès</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-email" className="text-xs font-black text-slate-700 uppercase">Adresse E-mail de connexion *</Label>
                  <Input 
                    id="company-email"
                    type="email" 
                    placeholder="contact@entreprise.com" 
                    required
                    className="h-11 border-slate-200 rounded-xl text-xs font-semibold"
                    value={newCompany.email}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-pass" className="text-xs font-black text-slate-700 uppercase">Mot de passe provisoire *</Label>
                  <Input 
                    id="company-pass"
                    type="password" 
                    placeholder="Minimum 6 caractères" 
                    required
                    className="h-11 border-slate-200 rounded-xl text-xs font-semibold"
                    value={newCompany.password}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Profil et Entreprise */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-black text-orange-600 uppercase tracking-wider">2. Fiche d'identité de l'entreprise</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name" className="text-xs font-black text-slate-700 uppercase">Nom de l'entreprise *</Label>
                  <Input 
                    id="company-name"
                    type="text" 
                    placeholder="Ex: Orange Côte d'Ivoire" 
                    required
                    className="h-11 border-slate-200 rounded-xl text-xs font-semibold"
                    value={newCompany.companyName}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, companyName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-rccm" className="text-xs font-black text-slate-700 uppercase">Numéro RCCM / Enregistrement</Label>
                  <Input 
                    id="company-rccm"
                    type="text" 
                    placeholder="Ex: CI-ABJ-2024-B-XXXX" 
                    className="h-11 border-slate-200 rounded-xl text-xs font-semibold"
                    value={newCompany.registrationNumber}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, registrationNumber: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-sector" className="text-xs font-black text-slate-700 uppercase">Secteur d'activité</Label>
                  <select 
                    id="company-sector"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                    value={newCompany.sectorActivity}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, sectorActivity: e.target.value }))}
                  >
                    <option value="">Sélectionner un secteur</option>
                    <option value="Banque & Microfinance">Banque & Microfinance</option>
                    <option value="Bâtiment & Travaux Publics (BTP)">Bâtiment & Travaux Publics (BTP)</option>
                    <option value="Commerce & Distribution">Commerce & Distribution</option>
                    <option value="Communication, Publicité & Média">Communication, Publicité & Média</option>
                    <option value="Éducation & Formation">Éducation & Formation</option>
                    <option value="Hôtellerie, Restauration & Loisirs">Hôtellerie, Restauration & Loisirs</option>
                    <option value="Industrie, Énergie & Mines">Industrie, Énergie & Mines</option>
                    <option value="Informatique & Télécoms (T.I.C)">Informatique & Télécoms (T.I.C)</option>
                    <option value="Logistique, Transports & Transit">Logistique, Transports & Transit</option>
                    <option value="Santé, Pharmacie & Social">Santé, Pharmacie & Social</option>
                    <option value="Services aux Entreprises & Conseil">Services aux Entreprises & Conseil</option>
                    <option value="Autre">Autre secteur</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-phone" className="text-xs font-black text-slate-700 uppercase">Téléphone professionnel</Label>
                  <Input 
                    id="company-phone"
                    type="tel" 
                    placeholder="Ex: +225 07 00 00 00 00" 
                    className="h-11 border-slate-200 rounded-xl text-xs font-semibold"
                    value={newCompany.phone}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-city" className="text-xs font-black text-slate-700 uppercase">Ville / Commune / Localisation</Label>
                  <Input 
                    id="company-city"
                    type="text" 
                    placeholder="Ex: Abidjan, Cocody" 
                    className="h-11 border-slate-200 rounded-xl text-xs font-semibold"
                    value={newCompany.city}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-web" className="text-xs font-black text-slate-700 uppercase">Site Internet (URL)</Label>
                  <Input 
                    id="company-web"
                    type="url" 
                    placeholder="Ex: https://www.entreprise.com" 
                    className="h-11 border-slate-200 rounded-xl text-xs font-semibold"
                    value={newCompany.website}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, website: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-size" className="text-xs font-black text-slate-700 uppercase">Taille de l'effectif</Label>
                  <select 
                    id="company-size"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                    value={newCompany.companySize}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, companySize: e.target.value }))}
                  >
                    <option value="1-10">1 à 10 employés (TPE)</option>
                    <option value="11-50">11 à 50 employés (Petite Entreprise)</option>
                    <option value="51-200">51 à 200 employés (Moyenne Entreprise)</option>
                    <option value="201-500">201 à 500 employés (ETI)</option>
                    <option value="+500">Plus de 500 employés (Grande Entreprise)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-type" className="text-xs font-black text-slate-700 uppercase">Catégorie juridique / Type</Label>
                  <select 
                    id="company-type"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                    value={newCompany.companyType}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, companyType: e.target.value }))}
                  >
                    <option value="PME">PME (Petite et Moyenne Entreprise)</option>
                    <option value="Grande Entreprise">Grande Entreprise</option>
                    <option value="Multinationale">Multinationale</option>
                    <option value="TPE">TPE / Individuelle</option>
                    <option value="Institutionnel / ONG / Service Public">Institutionnel / ONG / Service Public</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-desc" className="text-xs font-black text-slate-700 uppercase">Description succincte de l'entreprise</Label>
                <Textarea 
                  id="company-desc"
                  placeholder="Présentez les activités majeures de l'entreprise en quelques mots-clés..." 
                  className="rounded-xl border-slate-200 text-xs font-semibold min-h-[90px]"
                  value={newCompany.companyDescription}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, companyDescription: e.target.value }))}
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 flex justify-end gap-3">
              <Button 
                type="button" 
                variant="outline" 
                className="rounded-xl font-black text-[10px] uppercase h-11 px-6 border-slate-150 text-slate-500"
                onClick={() => setIsAddCompanyOpen(false)}
                disabled={addCompanyLoading}
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                className="rounded-xl font-black text-[10px] uppercase bg-orange-600 text-white h-11 px-8 hover:bg-orange-700 shadow-lg shadow-orange-600/10 flex items-center gap-2"
                disabled={addCompanyLoading}
              >
                {addCompanyLoading ? "Création en cours..." : "Créer et Approuver"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
