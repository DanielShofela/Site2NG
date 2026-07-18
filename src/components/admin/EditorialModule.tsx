import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Inbox, 
  FileText, 
  Users, 
  Sparkles, 
  Loader2, 
  Check, 
  Trash2, 
  Edit, 
  Search, 
  Building2, 
  MapPin, 
  Coins, 
  Phone, 
  Send, 
  Plus, 
  MessageSquare, 
  Facebook, 
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Job } from '@/types';

interface EditorialModuleProps {
  addLog: (action: string, target: string, type: string) => Promise<void>;
}

export interface EditorialOffer {
  id: string;
  title: string;
  companyName: string;
  description: string;
  requirements?: string;
  location?: string;
  salary?: string;
  contactInfo?: string;
  status: 'Nouvelle' | 'À reformater' | 'Prête' | 'Programmée' | 'Publiée' | 'Archivée';
  createdAt: any;
  updatedAt: any;
  sourceText?: string;
  notes?: string;
}

export interface AssistedCandidate {
  id: string;
  fullName: string;
  contactMethod: 'WhatsApp' | 'Phone' | 'Facebook' | 'Other';
  contactValue: string;
  profession: string;
  experience?: string;
  skills?: string;
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

export default function EditorialModule({ addLog }: EditorialModuleProps) {
  const [activeTab, setActiveTab] = useState<'inbox' | 'bank' | 'candidates'>('inbox');

  // Firebase Real-time states
  const [editorialOffers, setEditorialOffers] = useState<EditorialOffer[]>([]);
  const [assistedCandidates, setAssistedCandidates] = useState<AssistedCandidate[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(true);

  // Smart Inbox States
  const [rawText, setRawText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedDrafts, setParsedDrafts] = useState<Partial<EditorialOffer>[]>([]);
  const [parseWarning, setParseWarning] = useState<string | null>(null);
  const [parseMode, setParseMode] = useState<'local' | 'gemini'>('local');
  const [editingDraftIndex, setEditingDraftIndex] = useState<number | null>(null);
  const [editingDraftData, setEditingDraftData] = useState<Partial<EditorialOffer> | null>(null);

  // Filter States
  const [offerSearch, setOfferSearch] = useState("");
  const [offerStatusFilter, setOfferStatusFilter] = useState<string>("ALL");
  const [candidateSearch, setCandidateSearch] = useState("");

  // Modals / Selected Items
  const [selectedOffer, setSelectedOffer] = useState<EditorialOffer | null>(null);
  const [isOfferEditOpen, setIsOfferEditOpen] = useState(false);
  const [isCandidateCreateOpen, setIsCandidateCreateOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<AssistedCandidate | null>(null);
  const [isCandidateEditOpen, setIsCandidateEditOpen] = useState(false);

  // Delete Confirmation Dialog states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'offer' | 'candidate'; label: string } | null>(null);

  // New Candidate Form State
  const [newCandidate, setNewCandidate] = useState<Partial<AssistedCandidate>>({
    fullName: "",
    contactMethod: "WhatsApp",
    contactValue: "",
    profession: "",
    experience: "",
    skills: "",
    notes: ""
  });

  // Load Real-time Data
  useEffect(() => {
    const unsubOffers = onSnapshot(collection(db, 'editorial_offers'), (snapshot) => {
      const list: EditorialOffer[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as EditorialOffer);
      });
      // Sort desc by creation
      list.sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });
      setEditorialOffers(list);
      setLoadingOffers(false);
    }, (error) => {
      console.error("Error reading editorial offers:", error);
      setLoadingOffers(false);
    });

    const unsubCandidates = onSnapshot(collection(db, 'assisted_candidates'), (snapshot) => {
      const list: AssistedCandidate[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as AssistedCandidate);
      });
      list.sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });
      setAssistedCandidates(list);
      setLoadingCandidates(false);
    }, (error) => {
      console.error("Error reading assisted candidates:", error);
      setLoadingCandidates(false);
    });

    return () => {
      unsubOffers();
      unsubCandidates();
    };
  }, []);

  // AI-Powered / Local Smart Inbox parser call
  const handleParseText = async () => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    setParseWarning(null);
    try {
      const res = await fetch('/api/parse-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, parseMode })
      });
      const data = await res.json();
      if (res.ok && data.offers) {
        setParsedDrafts(data.offers);
        if (data.warning) {
          setParseWarning(data.warning);
        }
        const modeLabel = parseMode === 'gemini' ? "IA Gemini" : "Parseur local";
        await addLog(`Analyse d'offres (${modeLabel})`, `Extrait de ${data.offers.length} offre(s) à partir de texte brut`, "info");
      } else {
        alert(data.error || "Erreur de traitement.");
      }
    } catch (e: any) {
      console.error(e);
      alert("Une erreur de communication est survenue: " + (e.message || e));
    } finally {
      setIsParsing(false);
    }
  };

  // Stage Draft Handling
  const handleEditDraft = (index: number) => {
    setEditingDraftIndex(index);
    setEditingDraftData({ ...parsedDrafts[index] });
  };

  const handleSaveDraftEdit = () => {
    if (editingDraftIndex !== null && editingDraftData) {
      const updated = [...parsedDrafts];
      updated[editingDraftIndex] = editingDraftData;
      setParsedDrafts(updated);
      setEditingDraftIndex(null);
      setEditingDraftData(null);
    }
  };

  const handleDeleteDraft = (index: number) => {
    const updated = parsedDrafts.filter((_, i) => i !== index);
    setParsedDrafts(updated);
  };

  // Create editorial offer from draft
  const handleSaveDraftToBank = async (draft: Partial<EditorialOffer>, indexToDelete?: number) => {
    try {
      const payload = {
        title: draft.title || "Titre non spécifié",
        companyName: draft.companyName || "Non spécifié",
        description: draft.description || "",
        requirements: draft.requirements || "",
        location: draft.location || "",
        salary: draft.salary || "",
        contactInfo: draft.contactInfo || "",
        status: "Nouvelle" as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await addDoc(collection(db, 'editorial_offers'), payload);
      
      if (indexToDelete !== undefined) {
        setParsedDrafts(prev => prev.filter((_, i) => i !== indexToDelete));
      }
      
      await addLog("Fiche éditoriale créée", `Offre "${payload.title}" ajoutée en brouillon dans la banque`, "success");
    } catch (e: any) {
      alert("Erreur lors de la sauvegarde : " + e.message);
    }
  };

  // Publish Editorial Offer directly to public job listings
  const handlePublishOffer = async (offer: Partial<EditorialOffer>, indexToDelete?: number, editOfferId?: string) => {
    try {
      // 1. Save to main "offers" collection for the public site
      const jobPayload = {
        title: offer.title || "Titre non spécifié",
        companyName: offer.companyName || "Non spécifié",
        description: offer.description || "",
        requirements: offer.requirements || "",
        location: offer.location || "Côte d'Ivoire",
        salary: offer.salary || "",
        status: "active" as const,
        createdAt: serverTimestamp(),
        createdBy: "admin",
        offer_type: "external" as const,
        contactInfo: offer.contactInfo || "",
        type: "CDI", // default values for required public schema
        field: "Autre", 
        views: 0
      };
      
      const jobRef = await addDoc(collection(db, 'offers'), jobPayload);

      // 2. Add or update in "editorial_offers" with status "Publiée"
      if (editOfferId) {
        // It's an existing editorial offer being published
        await updateDoc(doc(db, 'editorial_offers', editOfferId), {
          status: "Publiée",
          updatedAt: serverTimestamp()
        });
      } else {
        // It's a new draft from inbox published directly
        await addDoc(collection(db, 'editorial_offers'), {
          ...jobPayload,
          status: "Publiée",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      if (indexToDelete !== undefined) {
        setParsedDrafts(prev => prev.filter((_, i) => i !== indexToDelete));
      }

      await addLog("Offre éditoriale publiée", `L'offre "${jobPayload.title}" a été publiée en ligne avec succès`, "success");
      alert("L'offre a été publiée avec succès sur l'application publique !");
    } catch (e: any) {
      alert("Erreur lors de la publication : " + e.message);
    }
  };

  // Update existing editorial offer
  const handleUpdateOffer = async () => {
    if (!selectedOffer) return;
    try {
      await updateDoc(doc(db, 'editorial_offers', selectedOffer.id), {
        title: selectedOffer.title,
        companyName: selectedOffer.companyName,
        description: selectedOffer.description,
        requirements: selectedOffer.requirements || "",
        location: selectedOffer.location || "",
        salary: selectedOffer.salary || "",
        contactInfo: selectedOffer.contactInfo || "",
        status: selectedOffer.status,
        updatedAt: serverTimestamp()
      });
      setIsOfferEditOpen(false);
      setSelectedOffer(null);
      await addLog("Fiche éditoriale mise à jour", `L'offre "${selectedOffer.title}" a été modifiée`, "info");
    } catch (e: any) {
      alert("Erreur de mise à jour : " + e.message);
    }
  };

  // Change offer status directly
  const handleUpdateOfferStatus = async (id: string, nextStatus: EditorialOffer['status']) => {
    try {
      await updateDoc(doc(db, 'editorial_offers', id), {
        status: nextStatus,
        updatedAt: serverTimestamp()
      });
      await addLog("Statut offre éditoriale modifié", `Offre ID: ${id} passée au statut ${nextStatus}`, "info");
    } catch (e: any) {
      alert("Erreur : " + e.message);
    }
  };

  // Delete Editorial offer
  const handleDeleteOffer = (id: string) => {
    const offer = editorialOffers.find(o => o.id === id);
    if (!offer) return;
    setDeleteTarget({ id, type: 'offer', label: `l'offre éditoriale "${offer.title}"` });
    setDeleteConfirmOpen(true);
  };

  // Assisted Candidate Create
  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidate.fullName || !newCandidate.profession) return;
    try {
      const payload = {
        fullName: newCandidate.fullName,
        contactMethod: newCandidate.contactMethod || "WhatsApp",
        contactValue: newCandidate.contactValue || "",
        profession: newCandidate.profession,
        experience: newCandidate.experience || "",
        skills: newCandidate.skills || "",
        notes: newCandidate.notes || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await addDoc(collection(db, 'assisted_candidates'), payload);
      setIsCandidateCreateOpen(false);
      setNewCandidate({
        fullName: "",
        contactMethod: "WhatsApp",
        contactValue: "",
        profession: "",
        experience: "",
        skills: "",
        notes: ""
      });
      await addLog("Candidat enregistré", `Enregistrement du candidat d'accompagnement : "${payload.fullName}"`, "success");
    } catch (e: any) {
      alert("Erreur lors de la création : " + e.message);
    }
  };

  // Update Assisted Candidate
  const handleUpdateCandidate = async () => {
    if (!selectedCandidate) return;
    try {
      await updateDoc(doc(db, 'assisted_candidates', selectedCandidate.id), {
        fullName: selectedCandidate.fullName,
        contactMethod: selectedCandidate.contactMethod,
        contactValue: selectedCandidate.contactValue,
        profession: selectedCandidate.profession,
        experience: selectedCandidate.experience || "",
        skills: selectedCandidate.skills || "",
        notes: selectedCandidate.notes || "",
        updatedAt: serverTimestamp()
      });
      setIsCandidateEditOpen(false);
      setSelectedCandidate(null);
      await addLog("Candidat mis à jour", `Fiche de "${selectedCandidate.fullName}" modifiée`, "info");
    } catch (e: any) {
      alert("Erreur : " + e.message);
    }
  };

  // Delete Assisted Candidate
  const handleDeleteCandidate = (id: string) => {
    const candidate = assistedCandidates.find(c => c.id === id);
    if (!candidate) return;
    setDeleteTarget({ id, type: 'candidate', label: `le candidat d'accompagnement "${candidate.fullName}"` });
    setDeleteConfirmOpen(true);
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    const { id, type } = deleteTarget;
    try {
      if (type === 'offer') {
        await deleteDoc(doc(db, 'editorial_offers', id));
        await addLog("Fiche éditoriale supprimée", `Offre ID: ${id} retirée définitivement`, "warning");
      } else {
        await deleteDoc(doc(db, 'assisted_candidates', id));
        await addLog("Candidat d'accompagnement supprimé", `ID: ${id} retiré de l'index d'accompagnement`, "warning");
      }
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    } catch (e: any) {
      alert("Erreur de suppression : " + e.message);
    }
  };

  // Smart Matching algorithm (simple string mapping candidate <-> jobs)
  const getMatchesForCandidate = (profession: string) => {
    if (!profession) return [];
    const profNorm = profession.toLowerCase().trim();
    return editorialOffers.filter(offer => 
      offer.title.toLowerCase().includes(profNorm) || 
      offer.description.toLowerCase().includes(profNorm)
    );
  };

  const getCandidatesForJob = (jobTitle: string) => {
    if (!jobTitle) return [];
    const titleNorm = jobTitle.toLowerCase().trim();
    return assistedCandidates.filter(candidate => 
      titleNorm.includes(candidate.profession.toLowerCase().trim()) ||
      candidate.profession.toLowerCase().trim().includes(titleNorm)
    );
  };

  // Filtering Logic
  const filteredOffers = editorialOffers.filter(offer => {
    const matchesSearch = offer.title.toLowerCase().includes(offerSearch.toLowerCase()) || 
                          offer.companyName.toLowerCase().includes(offerSearch.toLowerCase()) ||
                          (offer.description && offer.description.toLowerCase().includes(offerSearch.toLowerCase()));
    
    const matchesStatus = offerStatusFilter === 'ALL' || offer.status === offerStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredCandidates = assistedCandidates.filter(candidate => {
    return candidate.fullName.toLowerCase().includes(candidateSearch.toLowerCase()) ||
           candidate.profession.toLowerCase().includes(candidateSearch.toLowerCase()) ||
           (candidate.skills && candidate.skills.toLowerCase().includes(candidateSearch.toLowerCase()));
  });

  return (
    <div className="space-y-6">
      {/* Mini header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-orange-600 p-6 md:p-8 rounded-[32px] text-white shadow-xl shadow-orange-600/10">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-200 animate-pulse shrink-0" />
            <h2 className="text-xl md:text-2xl font-black">Gestion Éditoriale & Accompagnement</h2>
          </div>
          <p className="text-orange-100 text-xs font-semibold mt-1 max-w-xl">
            Analyse intelligente de listes d'offres externes, banque éditoriale d'offres consolidées, et suivi direct des personnes à accompagner.
          </p>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex bg-orange-700/50 p-1.5 rounded-2xl gap-1 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeTab === 'inbox' ? 'bg-white text-orange-700 shadow-sm' : 'text-white hover:bg-orange-600/30'}`}
          >
            <Inbox className="h-4 w-4" />
            Boîte de réception
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeTab === 'bank' ? 'bg-white text-orange-700 shadow-sm' : 'text-white hover:bg-orange-600/30'}`}
          >
            <FileText className="h-4 w-4" />
            Offres éditoriales
          </button>
          <button
            onClick={() => setActiveTab('candidates')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeTab === 'candidates' ? 'bg-white text-orange-700 shadow-sm' : 'text-white hover:bg-orange-600/30'}`}
          >
            <Users className="h-4 w-4" />
            Candidats
          </button>
        </div>
      </div>

      {/* --- TAB 1: SMART INBOX --- */}
      {activeTab === 'inbox' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* Input area */}
            <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl p-6 bg-white flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">📥 Analyseur d'Offres</h3>
                  <p className="text-slate-450 text-[11px] font-bold mt-0.5">
                    Collez plusieurs offres groupées dans le champ ci-dessous. Choisissez le parseur local pour un traitement instantané et gratuit, ou l'IA Gemini pour un traitement sémantique avancé.
                  </p>
                </div>

                <Textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Exemple : 
RECRUTEMENT URGENT : 
1. Chauffeur de direction chez Sodex, permis B exigé, habitant à Cocody. Contact : 0707070707.
2. Secrétaire bilingue diplômée, salaire 250k CFA, entreprise à Marcory. CV à recrutement@ex.com..."
                  className="min-h-[220px] md:min-h-[280px] font-medium text-xs leading-relaxed rounded-2xl border-slate-200 focus:border-orange-500 bg-slate-50/50 p-4"
                />

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Moteur d'analyse</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setParseMode('local')}
                      className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                        parseMode === 'local'
                          ? 'bg-orange-600 text-white shadow-sm'
                          : 'bg-white border border-slate-250 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      Parseur Local (Stable & Instantané)
                    </button>
                    <button
                      type="button"
                      onClick={() => setParseMode('gemini')}
                      className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                        parseMode === 'gemini'
                          ? 'bg-orange-600 text-white shadow-sm'
                          : 'bg-white border border-slate-250 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5 shrink-0" />
                      IA Gemini
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 mt-4 flex items-center justify-between gap-4">
                <Button 
                  variant="outline"
                  onClick={() => setRawText("")}
                  className="rounded-xl font-black text-xs h-11 border-slate-200 text-slate-500"
                >
                  Effacer
                </Button>
                <Button
                  disabled={isParsing || !rawText.trim()}
                  onClick={handleParseText}
                  className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs h-11 px-5 shadow-lg shadow-orange-600/10 flex items-center gap-2"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-amber-200" />
                      Analyse Automatique
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Results / Drafts Area */}
            <Card className="lg:col-span-3 border-none shadow-sm rounded-3xl p-6 bg-white min-h-[400px]">
              <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">📋 Fiches en brouillon ({parsedDrafts.length})</h3>
                  <p className="text-slate-400 text-[11px] font-bold mt-0.5">Vérifiez les données extraites par l'IA avant de les insérer dans votre banque éditoriale.</p>
                </div>
                {parsedDrafts.length > 0 && (
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setParsedDrafts([]);
                      setParseWarning(null);
                    }}
                    className="text-xs font-black text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    Vider la liste
                  </Button>
                )}
              </div>

              {parseWarning && (
                <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-medium text-amber-800 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{parseWarning}</span>
                </div>
              )}

              {parsedDrafts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="h-14 w-14 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mb-3">
                    <Inbox className="h-7 w-7" />
                  </div>
                  <p className="text-slate-800 text-sm font-black">Aucun brouillon extrait</p>
                  <p className="text-slate-450 text-xs font-semibold max-w-sm mt-1">Saisissez du texte brut à gauche puis lancez l'analyse automatique pour générer des fiches de postes.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {parsedDrafts.map((draft, idx) => (
                    <div key={idx} className="p-5 border border-slate-100 bg-slate-50/50 rounded-2xl hover:border-orange-200 transition-all space-y-3 relative">
                      
                      {editingDraftIndex === idx ? (
                        /* Direct inline edit mode */
                        <div className="space-y-3 pt-1">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-black uppercase text-slate-400">Poste recherché</Label>
                              <Input 
                                value={editingDraftData?.title || ""} 
                                onChange={(e) => setEditingDraftData(prev => ({ ...prev, title: e.target.value }))}
                                className="h-9 rounded-xl text-xs font-semibold"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-black uppercase text-slate-400">Entreprise</Label>
                              <Input 
                                value={editingDraftData?.companyName || ""} 
                                onChange={(e) => setEditingDraftData(prev => ({ ...prev, companyName: e.target.value }))}
                                className="h-9 rounded-xl text-xs font-semibold"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Description du poste</Label>
                            <Textarea 
                              value={editingDraftData?.description || ""} 
                              onChange={(e) => setEditingDraftData(prev => ({ ...prev, description: e.target.value }))}
                              className="min-h-[80px] rounded-xl text-xs leading-relaxed"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-black uppercase text-slate-400">Lieu de travail</Label>
                              <Input 
                                value={editingDraftData?.location || ""} 
                                onChange={(e) => setEditingDraftData(prev => ({ ...prev, location: e.target.value }))}
                                className="h-9 rounded-xl text-xs font-semibold"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-black uppercase text-slate-400">Salaire</Label>
                              <Input 
                                value={editingDraftData?.salary || ""} 
                                onChange={(e) => setEditingDraftData(prev => ({ ...prev, salary: e.target.value }))}
                                className="h-9 rounded-xl text-xs font-semibold"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Exigences / Prérequis</Label>
                            <Input 
                              value={editingDraftData?.requirements || ""} 
                              onChange={(e) => setEditingDraftData(prev => ({ ...prev, requirements: e.target.value }))}
                              className="h-9 rounded-xl text-xs font-semibold"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Contacts de candidature</Label>
                            <Input 
                              value={editingDraftData?.contactInfo || ""} 
                              onChange={(e) => setEditingDraftData(prev => ({ ...prev, contactInfo: e.target.value }))}
                              className="h-9 rounded-xl text-xs font-semibold"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2">
                            <Button 
                              variant="ghost" 
                              onClick={() => setEditingDraftIndex(null)}
                              className="text-xs h-8 rounded-lg font-bold"
                            >
                              Annuler
                            </Button>
                            <Button 
                              onClick={handleSaveDraftEdit}
                              className="bg-orange-600 hover:bg-orange-700 text-white font-black text-xs h-8 rounded-lg px-3"
                            >
                              Valider modifs
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Normal read view of draft card */
                        <>
                          <div className="flex items-start justify-between">
                            <div>
                              <Badge className="bg-amber-100 text-amber-700 font-black text-[9px] uppercase tracking-wider mb-1.5 hover:bg-amber-100">EXTRAIT PAR L'IA</Badge>
                              <h4 className="text-sm font-black text-slate-900 leading-snug">{draft.title}</h4>
                              <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mt-1">
                                <Building2 className="h-3 w-3 shrink-0" /> {draft.companyName}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-slate-450 hover:text-slate-800 rounded-lg"
                                onClick={() => handleEditDraft(idx)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                onClick={() => handleDeleteDraft(idx)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 font-medium line-clamp-3 leading-relaxed">
                            {draft.description}
                          </p>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              <span>{draft.location || 'Lieu non spécifié'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Coins className="h-3.5 w-3.5 text-slate-400" />
                              <span>{draft.salary || 'Salaire non spécifié'}</span>
                            </div>
                            {draft.contactInfo && (
                              <div className="col-span-2 flex items-center gap-1.5 text-orange-600">
                                <Phone className="h-3.5 w-3.5" />
                                <span className="font-semibold truncate">{draft.contactInfo}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100/50">
                            <Button 
                              variant="outline"
                              onClick={() => handleSaveDraftToBank(draft, idx)}
                              className="text-[10px] font-black uppercase tracking-wider h-8 rounded-xl border-slate-200 text-slate-600"
                            >
                              Banque d'offres (Brouillon)
                            </Button>
                            <Button
                              onClick={() => handlePublishOffer(draft, idx)}
                              className="bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-black uppercase tracking-wider h-8 rounded-xl px-3 shadow-sm shadow-orange-600/10 flex items-center gap-1"
                            >
                              <Send className="h-3.5 w-3.5" />
                              Valider & Publier
                            </Button>
                          </div>
                        </>
                      )}

                    </div>
                  ))}
                </div>
              )}
            </Card>

          </div>
        </div>
      )}

      {/* --- TAB 2: EDITORIAL JOBS BANK --- */}
      {activeTab === 'bank' && (
        <Card className="border-none shadow-sm rounded-3xl p-6 bg-white space-y-6">
          
          {/* Filters, search, counters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-6">
            <div>
              <h3 className="text-base font-black text-slate-900">📰 Banque des offres éditoriales</h3>
              <p className="text-slate-400 text-xs font-semibold mt-0.5">Centralisez et pilotez le reformatage, la programmation et la diffusion de toutes les offres externes collectées.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={offerSearch}
                  onChange={(e) => setOfferSearch(e.target.value)}
                  placeholder="Rechercher une offre..."
                  className="pl-9 pr-4 h-10 w-full sm:w-64 rounded-xl text-xs font-bold"
                />
              </div>

              {/* Status Selector */}
              <div className="w-full sm:w-48">
                <Select value={offerStatusFilter} onValueChange={(val) => setOfferStatusFilter(val)}>
                  <SelectTrigger className="h-10 rounded-xl text-xs font-black uppercase tracking-wide">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tous les statuts</SelectItem>
                    <SelectItem value="Nouvelle">Nouvelle</SelectItem>
                    <SelectItem value="À reformater">À reformater</SelectItem>
                    <SelectItem value="Prête">Prête</SelectItem>
                    <SelectItem value="Programmée">Programmée</SelectItem>
                    <SelectItem value="Publiée">Publiée</SelectItem>
                    <SelectItem value="Archivée">Archivée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Table or Grid of editorial listings */}
          {loadingOffers ? (
            <div className="text-center py-10 font-bold text-slate-400">Chargement de la banque d'offres...</div>
          ) : filteredOffers.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-3xl">
              <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-500">Aucune offre éditoriale trouvée</p>
              <p className="text-slate-400 text-xs mt-1">Utilisez l'onglet Boîte de réception pour extraire et enregistrer de nouvelles offres.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOffers.map((offer) => {
                const cands = getCandidatesForJob(offer.title);
                return (
                  <div key={offer.id} className="p-6 border border-slate-100 bg-white rounded-2xl hover:border-orange-500 hover:shadow-lg transition-all space-y-4 group">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 group-hover:text-orange-600 transition-colors leading-tight">{offer.title}</h4>
                        <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mt-1">
                          <Building2 className="h-3 w-3" /> {offer.companyName}
                        </p>
                      </div>

                      <Badge className={`px-2.5 h-6 rounded-full font-black text-[9px] uppercase tracking-wider
                        ${offer.status === 'Nouvelle' ? 'bg-orange-50 text-orange-600 border border-orange-200' : ''}
                        ${offer.status === 'À reformat' || offer.status === 'À reformater' ? 'bg-amber-50 text-amber-700 border border-amber-200' : ''}
                        ${offer.status === 'Prête' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : ''}
                        ${offer.status === 'Programmée' ? 'bg-blue-50 text-blue-700 border border-blue-200' : ''}
                        ${offer.status === 'Publiée' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : ''}
                        ${offer.status === 'Archivée' ? 'bg-slate-100 text-slate-500 border border-slate-200' : ''}
                      `}>
                        {offer.status}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-semibold line-clamp-2">
                      {offer.description}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-400 border-t border-slate-50 pt-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-350" />
                        <span className="truncate">{offer.location || 'Côte d\'Ivoire'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Coins className="h-3 w-3 text-slate-350" />
                        <span className="truncate">{offer.salary || 'Non spécifié'}</span>
                      </div>
                    </div>

                    {/* Auto-matching Candidate alert */}
                    {cands.length > 0 && (
                      <div className="bg-orange-50/50 border border-orange-100/40 p-2.5 rounded-xl flex items-center justify-between text-[11px] font-bold text-orange-800">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                          <span>{cands.length} candidat(s) d'accompagnement ciblé(s)</span>
                        </div>
                        <button 
                          onClick={() => {
                            setActiveTab('candidates');
                            setCandidateSearch(offer.title.split(' ')[0] || "");
                          }}
                          className="text-orange-600 hover:underline flex items-center gap-0.5 font-black uppercase text-[9px] tracking-wider"
                        >
                          Voir <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    )}

                    {/* Actions panel */}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-50">
                      
                      {/* Direct status modifier */}
                      <div className="w-32">
                        <Select 
                          value={offer.status} 
                          onValueChange={(val: any) => handleUpdateOfferStatus(offer.id, val)}
                        >
                          <SelectTrigger className="h-8 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-50 border-none p-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Nouvelle">Nouvelle</SelectItem>
                            <SelectItem value="À reformater">À reformater</SelectItem>
                            <SelectItem value="Prête">Prête</SelectItem>
                            <SelectItem value="Programmée">Programmée</SelectItem>
                            <SelectItem value="Publiée">Publiée</SelectItem>
                            <SelectItem value="Archivée">Archivée</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => {
                            setSelectedOffer(offer);
                            setIsOfferEditOpen(true);
                          }}
                          className="h-8 w-8 text-slate-550 hover:bg-slate-50 hover:text-slate-900 rounded-lg"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleDeleteOffer(offer.id)}
                          className="h-8 w-8 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        {/* Publish live button */}
                        {offer.status !== 'Publiée' && (
                          <Button
                            onClick={() => handlePublishOffer(offer, undefined, offer.id)}
                            className="h-8 rounded-lg bg-slate-950 text-white font-black text-[10px] uppercase tracking-wider px-3 hover:bg-slate-800 flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                            Diffuser en Ligne
                          </Button>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* --- TAB 3: SUPPORTED CANDIDATES --- */}
      {activeTab === 'candidates' && (
        <Card className="border-none shadow-sm rounded-3xl p-6 bg-white space-y-6">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-6">
            <div>
              <h3 className="text-base font-black text-slate-900">👥 Base des candidats à accompagner</h3>
              <p className="text-slate-400 text-xs font-semibold mt-0.5">Enregistrez et gérez les personnes qui vous contactent directement par WhatsApp, téléphone, ou réseaux sociaux.</p>
            </div>
            
            <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0 items-center">
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  placeholder="Rechercher par nom ou métier..."
                  className="pl-9 pr-4 h-10 w-full sm:w-60 rounded-xl text-xs font-bold"
                />
              </div>

              {/* Add Candidate Button */}
              <Button
                onClick={() => setIsCandidateCreateOpen(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white font-black text-xs h-10 px-4 rounded-xl flex items-center gap-1.5 shadow-lg shadow-orange-600/10"
              >
                <Plus className="h-4 w-4 shrink-0" />
                Enregistrer Candidat
              </Button>
            </div>
          </div>

          {/* Grid of Assisted Candidates */}
          {loadingCandidates ? (
            <div className="text-center py-10 font-bold text-slate-400">Chargement de la base d'accompagnement...</div>
          ) : filteredCandidates.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-3xl">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-500">Aucun candidat enregistré</p>
              <p className="text-slate-400 text-xs mt-1">Créez votre première fiche de candidat en haut à droite.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredCandidates.map((candidate) => {
                const candidateMatches = getMatchesForCandidate(candidate.profession);
                return (
                  <div key={candidate.id} className="p-5 border border-slate-100 bg-white rounded-2xl hover:border-orange-500 hover:shadow-lg transition-all space-y-4 group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {/* Channel badge representation */}
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 font-black text-lg
                          ${candidate.contactMethod === 'WhatsApp' ? 'bg-emerald-50 text-emerald-600' : ''}
                          ${candidate.contactMethod === 'Phone' ? 'bg-orange-50 text-orange-600' : ''}
                          ${candidate.contactMethod === 'Facebook' ? 'bg-blue-50 text-blue-600' : ''}
                          ${candidate.contactMethod === 'Other' ? 'bg-slate-50 text-slate-500' : ''}
                        `}>
                          {candidate.contactMethod === 'WhatsApp' && <MessageSquare className="h-5 w-5" />}
                          {candidate.contactMethod === 'Phone' && <Phone className="h-5 w-5" />}
                          {candidate.contactMethod === 'Facebook' && <Facebook className="h-5 w-5" />}
                          {candidate.contactMethod === 'Other' && <Users className="h-5 w-5" />}
                        </div>

                        <div>
                          <h4 className="text-sm font-black text-slate-900 leading-tight">{candidate.fullName}</h4>
                          <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-50 px-2 py-0.5 rounded mt-1.5 inline-block tracking-wide">
                            {candidate.profession}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => {
                            setSelectedCandidate(candidate);
                            setIsCandidateEditOpen(true);
                          }}
                          className="h-8 w-8 text-slate-450 hover:bg-slate-50 hover:text-slate-800 rounded-lg"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleDeleteCandidate(candidate.id)}
                          className="h-8 w-8 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-xs font-semibold text-slate-650 space-y-1.5 bg-slate-50/50 p-3 rounded-xl border border-slate-50/50">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[10px] uppercase font-black w-20">Canal :</span>
                        <Badge variant="outline" className="text-[9px] font-black uppercase py-0">{candidate.contactMethod}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[10px] uppercase font-black w-20">Contact :</span>
                        <span className="text-slate-800 font-bold">{candidate.contactValue || "Non renseigné"}</span>
                      </div>
                      {candidate.experience && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-[10px] uppercase font-black w-20">Expérience :</span>
                          <span className="text-slate-800 font-bold">{candidate.experience}</span>
                        </div>
                      )}
                      {candidate.skills && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-[10px] uppercase font-black w-20">Atouts :</span>
                          <span className="text-slate-800 font-bold">{candidate.skills}</span>
                        </div>
                      )}
                    </div>

                    {candidate.notes && (
                      <div className="p-3 bg-amber-50/30 border border-amber-100/50 rounded-xl">
                        <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Notes de suivi :
                        </p>
                        <p className="text-xs font-bold text-slate-600 leading-relaxed italic">"{candidate.notes}"</p>
                      </div>
                    )}

                    {/* Matching Jobs widget */}
                    {candidateMatches.length > 0 ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2">
                        <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          {candidateMatches.length} offre(s) correspondante(s) dans la banque :
                        </p>
                        <div className="space-y-1">
                          {candidateMatches.slice(0, 3).map(j => (
                            <div key={j.id} className="flex items-center justify-between text-[11px] font-bold text-slate-700 bg-white px-2 py-1.5 rounded-lg border border-emerald-100">
                              <span className="truncate max-w-xs">{j.title} ({j.companyName})</span>
                              <span className={`text-[9px] font-bold uppercase rounded px-1
                                ${j.status === 'Publiée' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}
                              `}>
                                {j.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-2.5 bg-slate-50 rounded-xl border border-dashed border-slate-100 text-[10px] font-bold text-slate-450">
                        Aucune offre ne correspond exactement à ce métier pour le moment.
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* --- DIALOG MODALS --- */}

      {/* Offer Edit Modal */}
      <Dialog open={isOfferEditOpen} onOpenChange={(open) => { if(!open) setIsOfferEditOpen(false); }}>
        <DialogContent className="max-w-xl rounded-[32px] p-8 border-none shadow-2xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Modifier l'offre éditoriale</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs font-bold">Modifiez les caractéristiques de l'offre avant sa mise en ligne.</DialogDescription>
          </DialogHeader>

          {selectedOffer && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-black text-slate-750">Titre de l'emploi</Label>
                  <Input
                    value={selectedOffer.title}
                    onChange={(e) => setSelectedOffer(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                    className="h-10 rounded-xl font-bold text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-black text-slate-750">Nom de l'entreprise</Label>
                  <Input
                    value={selectedOffer.companyName}
                    onChange={(e) => setSelectedOffer(prev => prev ? ({ ...prev, companyName: e.target.value }) : null)}
                    className="h-10 rounded-xl font-bold text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-black text-slate-750">Description du poste</Label>
                <Textarea
                  value={selectedOffer.description}
                  onChange={(e) => setSelectedOffer(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                  className="min-h-[120px] rounded-xl text-xs font-medium leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-black text-slate-750">Exigences / Prérequis</Label>
                <Input
                  value={selectedOffer.requirements || ""}
                  onChange={(e) => setSelectedOffer(prev => prev ? ({ ...prev, requirements: e.target.value }) : null)}
                  className="h-10 rounded-xl font-semibold text-xs"
                  placeholder="Ex : Permis B, 2 ans d'expérience, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-black text-slate-750">Lieu</Label>
                  <Input
                    value={selectedOffer.location || ""}
                    onChange={(e) => setSelectedOffer(prev => prev ? ({ ...prev, location: e.target.value }) : null)}
                    className="h-10 rounded-xl font-bold text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-black text-slate-750">Salaire / Rémunération</Label>
                  <Input
                    value={selectedOffer.salary || ""}
                    onChange={(e) => setSelectedOffer(prev => prev ? ({ ...prev, salary: e.target.value }) : null)}
                    className="h-10 rounded-xl font-bold text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-black text-slate-750">Moyens de contact</Label>
                <Input
                  value={selectedOffer.contactInfo || ""}
                  onChange={(e) => setSelectedOffer(prev => prev ? ({ ...prev, contactInfo: e.target.value }) : null)}
                  className="h-10 rounded-xl font-semibold text-xs"
                  placeholder="Ex: WhatsApp +225 0102030405 ou email"
                />
              </div>

              <DialogFooter className="pt-4 border-t border-slate-50 flex gap-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsOfferEditOpen(false)}
                  className="h-11 rounded-xl text-xs font-bold text-slate-500"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleUpdateOffer}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-black text-xs h-11 px-5 rounded-xl shadow-lg shadow-orange-600/10"
                >
                  Enregistrer modifications
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Candidate Registration Modal */}
      <Dialog open={isCandidateCreateOpen} onOpenChange={(open) => { if(!open) setIsCandidateCreateOpen(false); }}>
        <DialogContent className="max-w-xl rounded-[32px] p-8 border-none shadow-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Enregistrer un nouveau candidat</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs font-bold">Fiche d'accompagnement direct pour le suivi.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCandidate} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-black text-slate-750">Nom Complet</Label>
              <Input
                required
                value={newCandidate.fullName || ""}
                onChange={(e) => setNewCandidate(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Ex: Konan Koffi Jean"
                className="h-10 rounded-xl font-bold text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-black text-slate-750">Canal de contact</Label>
                <Select 
                  value={newCandidate.contactMethod} 
                  onValueChange={(val: any) => setNewCandidate(prev => ({ ...prev, contactMethod: val }))}
                >
                  <SelectTrigger className="h-10 rounded-xl text-xs font-bold bg-slate-50/50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    <SelectItem value="Phone">Appel Téléphonique</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Other">Autre / Physique</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-black text-slate-750">Identifiant de contact</Label>
                <Input
                  value={newCandidate.contactValue || ""}
                  onChange={(e) => setNewCandidate(prev => ({ ...prev, contactValue: e.target.value }))}
                  placeholder="Ex : N° de téléphone, lien profil..."
                  className="h-10 rounded-xl font-semibold text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-black text-slate-750">Métier recherché</Label>
                <Input
                  required
                  value={newCandidate.profession || ""}
                  onChange={(e) => setNewCandidate(prev => ({ ...prev, profession: e.target.value }))}
                  placeholder="Ex: chauffeur, magasinier..."
                  className="h-10 rounded-xl font-bold text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-black text-slate-750">Expérience (années/niveau)</Label>
                <Input
                  value={newCandidate.experience || ""}
                  onChange={(e) => setNewCandidate(prev => ({ ...prev, experience: e.target.value }))}
                  placeholder="Ex: 5 ans, Débutant..."
                  className="h-10 rounded-xl font-semibold text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black text-slate-750">Atouts / Compétences particulières</Label>
              <Input
                value={newCandidate.skills || ""}
                onChange={(e) => setNewCandidate(prev => ({ ...prev, skills: e.target.value }))}
                placeholder="Ex : Permis de conduire poids lourd, habitant Yopougon"
                className="h-10 rounded-xl font-semibold text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black text-slate-750">Notes explicatives / Suivi d'accompagnement</Label>
              <Textarea
                value={newCandidate.notes || ""}
                onChange={(e) => setNewCandidate(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notez ici l'historique des échanges, les propositions d'offres, etc."
                className="min-h-[80px] rounded-xl text-xs font-medium leading-relaxed"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-slate-50 flex gap-2">
              <Button 
                type="button"
                variant="ghost" 
                onClick={() => setIsCandidateCreateOpen(false)}
                className="h-11 rounded-xl text-xs font-bold text-slate-500"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700 text-white font-black text-xs h-11 px-5 rounded-xl shadow-lg shadow-orange-600/10"
              >
                Enregistrer le candidat
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Candidate Edit Modal */}
      <Dialog open={isCandidateEditOpen} onOpenChange={(open) => { if(!open) setIsCandidateEditOpen(false); }}>
        <DialogContent className="max-w-xl rounded-[32px] p-8 border-none shadow-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Modifier la fiche candidat</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs font-bold">Mettez à jour les données du candidat.</DialogDescription>
          </DialogHeader>

          {selectedCandidate && (
            <div className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-black text-slate-750">Nom Complet</Label>
                <Input
                  required
                  value={selectedCandidate.fullName}
                  onChange={(e) => setSelectedCandidate(prev => prev ? ({ ...prev, fullName: e.target.value }) : null)}
                  className="h-10 rounded-xl font-bold text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-black text-slate-750">Canal de contact</Label>
                  <Select 
                    value={selectedCandidate.contactMethod} 
                    onValueChange={(val: any) => setSelectedCandidate(prev => prev ? ({ ...prev, contactMethod: val }) : null)}
                  >
                    <SelectTrigger className="h-10 rounded-xl text-xs font-bold bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                      <SelectItem value="Phone">Appel Téléphonique</SelectItem>
                      <SelectItem value="Facebook">Facebook</SelectItem>
                      <SelectItem value="Other">Autre / Physique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-black text-slate-750">Identifiant de contact</Label>
                  <Input
                    value={selectedCandidate.contactValue}
                    onChange={(e) => setSelectedCandidate(prev => prev ? ({ ...prev, contactValue: e.target.value }) : null)}
                    className="h-10 rounded-xl font-semibold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-black text-slate-750">Métier recherché</Label>
                  <Input
                    required
                    value={selectedCandidate.profession}
                    onChange={(e) => setSelectedCandidate(prev => prev ? ({ ...prev, profession: e.target.value }) : null)}
                    className="h-10 rounded-xl font-bold text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-black text-slate-750">Expérience (années/niveau)</Label>
                  <Input
                    value={selectedCandidate.experience || ""}
                    onChange={(e) => setSelectedCandidate(prev => prev ? ({ ...prev, experience: e.target.value }) : null)}
                    className="h-10 rounded-xl font-semibold text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-black text-slate-750">Atouts / Compétences particulières</Label>
                <Input
                  value={selectedCandidate.skills || ""}
                  onChange={(e) => setSelectedCandidate(prev => prev ? ({ ...prev, skills: e.target.value }) : null)}
                  className="h-10 rounded-xl font-semibold text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-black text-slate-750">Notes explicatives / Suivi d'accompagnement</Label>
                <Textarea
                  value={selectedCandidate.notes || ""}
                  onChange={(e) => setSelectedCandidate(prev => prev ? ({ ...prev, notes: e.target.value }) : null)}
                  className="min-h-[80px] rounded-xl text-xs font-medium leading-relaxed"
                />
              </div>

              <DialogFooter className="pt-4 border-t border-slate-50 flex gap-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsCandidateEditOpen(false)}
                  className="h-11 rounded-xl text-xs font-bold text-slate-500"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleUpdateCandidate}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-black text-xs h-11 px-5 rounded-xl shadow-lg shadow-orange-600/10"
                >
                  Enregistrer modifications
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Custom Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={(open) => { if(!open) { setDeleteConfirmOpen(false); setDeleteTarget(null); } }}>
        <DialogContent className="max-w-md rounded-[32px] p-8 border-none shadow-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs font-bold pt-2 leading-relaxed">
              Êtes-vous absolument sûr de vouloir supprimer définitivement {deleteTarget?.label} ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-6 border-t border-slate-50 flex gap-2 justify-end">
            <Button 
              variant="ghost" 
              onClick={() => { setDeleteConfirmOpen(false); setDeleteTarget(null); }}
              className="h-11 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50"
            >
              Annuler
            </Button>
            <Button
              onClick={handleExecuteDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-black text-xs h-11 px-5 rounded-xl shadow-lg shadow-red-600/10"
            >
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
