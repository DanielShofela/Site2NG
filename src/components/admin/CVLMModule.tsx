import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  getTemplates, 
  addTemplate, 
  updateTemplate, 
  deleteTemplate, 
  resetTemplates, 
  saveTemplates,
  subscribeToTemplates,
  getTemplateThumbnail,
  getPromoSlides,
  addPromoSlide,
  updatePromoSlide,
  deletePromoSlide,
  resetPromoSlides
} from '@/services/templateService';
import { CVLMTemplate, CVLMPromoSlide } from '@/types/cvlm';
import { compressImage, uploadImageToStorage } from '@/lib/imageUtils';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';
import { showToast } from '@/components/dashboard/toast';

import { 
  Search, 
  Plus, 
  Sparkles, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  FileText, 
  Crown, 
  Check, 
  X, 
  Eye, 
  Tag, 
  Layers,
  Upload,
  UploadCloud,
  Image as ImageIcon,
  Award,
  Zap,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  Copy,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Printer,
  Send,
  MessageCircle,
  FileCheck,
  Filter,
  Building2,
  GraduationCap,
  BookOpen,
  Download,
  Globe,
  Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface CVLMRequest {
  id: string;
  userId?: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  templateId?: string;
  templateName?: string;
  type: 'cv' | 'lm';
  formData: any;
  status: 'submitted' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
}

interface CVLMModuleProps {
  addLog: (action: string, target: string, type: string) => Promise<void>;
}

interface ImageUploaderProps {
  value: string;
  onChange: (base64: string) => void;
}

function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Veuillez sélectionner un fichier image valide (PNG, JPG, WEBP, GIF).");
      return;
    }
    setIsUploading(true);
    try {
      const storageUrl = await uploadImageToStorage(file, 'cvlm/thumbnails');
      if (storageUrl) {
        onChange(storageUrl);
      } else {
        const compressed = await compressImage(file, 600, 800, 0.75);
        onChange(compressed);
      }
    } catch (err) {
      console.error("Error uploading image to Firebase Storage:", err);
      try {
        const compressed = await compressImage(file, 600, 800, 0.75);
        onChange(compressed);
      } catch (e2) {
        console.error("Error compressing image:", e2);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    onChange('');
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />

      {value ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 aspect-[4/3] flex items-center justify-center group">
          <img
            src={value}
            alt="Miniature du modèle"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onButtonClick}
              className="bg-white text-slate-800 hover:bg-slate-100 rounded-xl h-9 text-[10px] font-bold"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Remplacer
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={removeImage}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-9 text-[10px] font-bold border-none"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Supprimer
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] space-y-2 ${
            dragActive
              ? 'border-orange-500 bg-orange-50/50'
              : 'border-slate-250 hover:border-orange-500 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <div className="p-3 bg-white rounded-xl shadow-sm text-slate-400">
            <UploadCloud className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">
              Glissez-déposez une image ici ou <span className="text-orange-600">parcourez vos fichiers</span>
            </p>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
              PNG, JPG, WEBP ou GIF (Max. 2 Mo)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

const DEFAULT_THUMBNAIL = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60';

const GRADIENT_PRESETS = [
  { name: 'Orange Chaud', value: 'from-orange-650 to-amber-550' },
  { name: 'Nuit Sombre / Accent Orange', value: 'from-slate-900 via-slate-950 to-orange-900' },
  { name: 'Bleu Profond', value: 'from-blue-900 to-indigo-950' },
  { name: 'Émeraude / Vert', value: 'from-emerald-800 to-teal-950' },
  { name: 'Aubergine / Pourpre', value: 'from-purple-900 to-indigo-950' },
  { name: 'Feu Sombre', value: 'from-red-900 to-amber-950' }
];

const ICON_PRESETS = [
  { name: 'Étoiles / Élégance', value: 'Sparkles' },
  { name: 'Médaille / Premium', value: 'Award' },
  { name: 'Éclair / Rapidité', value: 'Zap' },
  { name: 'Mallette / Emploi', value: 'Briefcase' },
  { name: 'Document / CV', value: 'FileText' }
];

const getIcon = (name: string) => {
  switch (name) {
    case 'Sparkles':
      return <Sparkles className="h-4 w-4" />;
    case 'Award':
      return <Award className="h-4 w-4" />;
    case 'Zap':
      return <Zap className="h-4 w-4" />;
    case 'Briefcase':
      return <Briefcase className="h-4 w-4" />;
    case 'FileText':
      return <FileText className="h-4 w-4" />;
    default:
      return <Sparkles className="h-4 w-4" />;
  }
};

export default function CVLMModule({ addLog }: CVLMModuleProps) {
  const [templates, setTemplates] = useState<CVLMTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'cv' | 'lm'>('all');
  const [filterPremium, setFilterPremium] = useState<'all' | 'free' | 'premium'>('all');
  
  // Requests State
  const [requests, setRequests] = useState<CVLMRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CVLMRequest | null>(null);

  // Request filters
  const [reqSearchQuery, setReqSearchQuery] = useState('');
  const [reqFilterType, setReqFilterType] = useState<'all' | 'cv' | 'lm'>('all');
  const [reqFilterStatus, setReqFilterStatus] = useState<'all' | 'submitted' | 'processing' | 'completed' | 'cancelled'>('all');

  // Navigation activeTab
  const [activeTab, setActiveTab] = useState<'requests' | 'templates' | 'promo_slides'>('requests');

  // Slides State
  const [slides, setSlides] = useState<CVLMPromoSlide[]>([]);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CVLMTemplate | null>(null);

  // Slide modal states
  const [isSlideModalOpen, setIsSlideModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<CVLMPromoSlide | null>(null);

  // Custom Confirmation Modal state
  const [confirmAdminAction, setConfirmAdminAction] = useState<{
    type: 'delete_template' | 'reset_templates' | 'delete_slide' | 'reset_slides' | 'delete_request';
    id?: string;
    name?: string;
  } | null>(null);
  
  // Form states for Add/Edit
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'cv' | 'lm'>('cv');
  const [formThumbnail, setFormThumbnail] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formIsPremium, setFormIsPremium] = useState(false);

  // Form states for Add/Edit Slide
  const [slideTitle, setSlideTitle] = useState('');
  const [slideDescription, setSlideDescription] = useState('');
  const [slideBadge, setSlideBadge] = useState('');
  const [slideBgGradient, setSlideBgGradient] = useState('from-orange-650 to-amber-550');
  const [slideImagePath, setSlideImagePath] = useState('');
  const [slideIconName, setSlideIconName] = useState<'Sparkles' | 'Award' | 'Zap' | 'Briefcase' | 'FileText'>('Sparkles');

  // Load templates, slides, and requests on mount & listen to real-time Firestore updates
  useEffect(() => {
    setTemplates(getTemplates());
    setSlides(getPromoSlides());

    const unsubTemplates = subscribeToTemplates((updated) => setTemplates(updated));

    let unsubRequests: (() => void) | undefined;
    try {
      const q = query(collection(db, 'cv_requests'));
      unsubRequests = onSnapshot(q, (snapshot) => {
        const list: CVLMRequest[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as CVLMRequest);
        });

        // Merge with local storage cached requests
        const cachedStr = safeGetItem('cvlm_all_requests');
        let cachedList: CVLMRequest[] = [];
        if (cachedStr) {
          try { cachedList = JSON.parse(cachedStr); } catch (e) {}
        }

        const map = new Map<string, CVLMRequest>();
        cachedList.forEach(r => map.set(r.id, r));
        list.forEach(r => map.set(r.id, r));

        const combined = Array.from(map.values()).sort((a, b) => 
          (b.createdAt || '').localeCompare(a.createdAt || '')
        );

        setRequests(combined);
        setLoadingRequests(false);
      }, (err) => {
        console.warn('Error subscribing to cv_requests:', err);
        const cachedStr = safeGetItem('cvlm_all_requests');
        if (cachedStr) {
          try { setRequests(JSON.parse(cachedStr)); } catch (e) {}
        }
        setLoadingRequests(false);
      });
    } catch (e) {
      console.warn('Firestore subscription exception:', e);
      const cachedStr = safeGetItem('cvlm_all_requests');
      if (cachedStr) {
        try { setRequests(JSON.parse(cachedStr)); } catch (e) {}
      }
      setLoadingRequests(false);
    }

    return () => {
      unsubTemplates();
      if (unsubRequests) unsubRequests();
    };
  }, []);

  // Request actions
  const handleUpdateRequestStatus = async (reqId: string, newStatus: CVLMRequest['status']) => {
    try {
      await updateDoc(doc(db, 'cv_requests', reqId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn("Firestore status update notice:", e);
    }

    setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: newStatus } : r));
    if (selectedRequest && selectedRequest.id === reqId) {
      setSelectedRequest(prev => prev ? { ...prev, status: newStatus } : null);
    }

    const cachedStr = safeGetItem('cvlm_all_requests');
    if (cachedStr) {
      try {
        const list: CVLMRequest[] = JSON.parse(cachedStr);
        const updated = list.map(r => r.id === reqId ? { ...r, status: newStatus } : r);
        safeSetItem('cvlm_all_requests', JSON.stringify(updated));
      } catch (e) {}
    }

    showToast(`Statut de la demande mis à jour (${newStatus})`, 'success');
    await addLog("Mise à jour statut demande", `Demande ID ${reqId} passée à ${newStatus}`, "info");
  };

  const handleDeleteRequest = (reqId: string, userName: string) => {
    setConfirmAdminAction({
      type: 'delete_request',
      id: reqId,
      name: userName
    });
  };

  // Sync templates list
  const refreshList = () => {
    setTemplates(getTemplates());
  };

  // Stats calculations for Templates
  const safeTemplates = Array.isArray(templates) ? templates : [];
  const totalCount = safeTemplates.length;
  const cvCount = safeTemplates.filter(t => t?.type === 'cv').length;
  const lmCount = safeTemplates.filter(t => t?.type === 'lm').length;
  const premiumCount = safeTemplates.filter(t => t?.isPremium).length;
  const freeCount = totalCount - premiumCount;
  const premiumPercent = totalCount > 0 ? Math.round((premiumCount / totalCount) * 100) : 0;

  // Stats calculations for Requests
  const safeRequests = Array.isArray(requests) ? requests : [];
  const reqTotalCount = safeRequests.length;
  const reqCvCount = safeRequests.filter(r => r?.type === 'cv').length;
  const reqLmCount = safeRequests.filter(r => r?.type === 'lm').length;
  const reqSubmittedCount = safeRequests.filter(r => r?.status === 'submitted').length;
  const reqProcessingCount = safeRequests.filter(r => r?.status === 'processing').length;
  const reqCompletedCount = safeRequests.filter(r => r?.status === 'completed').length;

  // Requests Filter logic
  const filteredRequests = safeRequests.filter(r => {
    if (!r) return false;
    const q = reqSearchQuery.toLowerCase().trim();
    const nameMatch = (r.userName || '').toLowerCase().includes(q);
    const emailMatch = (r.userEmail || '').toLowerCase().includes(q);
    const phoneMatch = (r.userPhone || '').toLowerCase().includes(q);
    const jobMatch = (r.formData?.jobTitle || r.formData?.subject || r.formData?.recipientCompany || '').toLowerCase().includes(q);
    const templateMatch = (r.templateName || '').toLowerCase().includes(q);
    const matchesSearch = !q || nameMatch || emailMatch || phoneMatch || jobMatch || templateMatch;

    const matchesType = reqFilterType === 'all' || r.type === reqFilterType;
    const matchesStatus = reqFilterStatus === 'all' || r.status === reqFilterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Templates Filter logic
  const filteredTemplates = safeTemplates.filter(t => {
    if (!t) return false;
    const matchesSearch = (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (t.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesPremium = filterPremium === 'all' || 
                           (filterPremium === 'premium' && t.isPremium) || 
                           (filterPremium === 'free' && !t.isPremium);
    return matchesSearch && matchesType && matchesPremium;
  });

  // Action: Toggle Premium status
  const handleTogglePremium = async (id: string, current: boolean) => {
    const updated = updateTemplate(id, { isPremium: !current });
    setTemplates(updated);
    await addLog("Modification d'accès modèle", `Modèle ID ${id} passé en ${!current ? 'Premium' : 'Standard'}`, "info");
  };

  // Action: Delete Template
  const handleDeleteTemplate = (id: string, name: string) => {
    setConfirmAdminAction({
      type: 'delete_template',
      id,
      name
    });
  };

  // Action: Reset defaults
  const handleResetDefaults = () => {
    setConfirmAdminAction({
      type: 'reset_templates'
    });
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormName('');
    setFormType('cv');
    setFormThumbnail('');
    setFormTags('Moderne, Professionnel, Recrutement');
    setFormIsPremium(false);
    setIsAddModalOpen(true);
  };

  // Save New Template
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const thumbnailToUse = formThumbnail.trim() || DEFAULT_THUMBNAIL;
    const tagArray = formTags.split(',').map(t => t.trim()).filter(Boolean);

    const updated = await addTemplate({
      name: formName.trim(),
      type: formType,
      thumbnail: thumbnailToUse,
      tags: tagArray,
      isPremium: formIsPremium
    });

    setTemplates(updated);
    setIsAddModalOpen(false);
    await addLog("Création de modèle CVLM", `Nouveau modèle "${formName}" créé (${formType === 'cv' ? 'CV' : 'Lettre'})`, "info");
  };

  // Open Edit Modal
  const handleOpenEditModal = (template: CVLMTemplate) => {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormType(template.type);
    setFormThumbnail(template.thumbnail);
    setFormTags(template.tags.join(', '));
    setFormIsPremium(template.isPremium);
  };

  // Save Edited Template
  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !formName.trim()) return;

    const tagArray = formTags.split(',').map(t => t.trim()).filter(Boolean);

    const updated = await updateTemplate(editingTemplate.id, {
      name: formName.trim(),
      type: formType,
      thumbnail: formThumbnail.trim(),
      tags: tagArray,
      isPremium: formIsPremium
    });

    setTemplates(updated);
    setEditingTemplate(null);
    await addLog("Mise à jour de modèle CVLM", `Modèle "${formName}" (ID: ${editingTemplate.id}) mis à jour`, "info");
  };

  // Slide Handlers
  const handleOpenAddSlideModal = () => {
    setEditingSlide(null);
    setSlideTitle('');
    setSlideDescription('');
    setSlideBadge('Nouveau');
    setSlideBgGradient('from-orange-650 to-amber-550');
    setSlideImagePath('');
    setSlideIconName('Sparkles');
    setIsSlideModalOpen(true);
  };

  const handleOpenEditSlideModal = (slide: CVLMPromoSlide) => {
    setEditingSlide(slide);
    setSlideTitle(slide.title);
    setSlideDescription(slide.description);
    setSlideBadge(slide.badge);
    setSlideBgGradient(slide.bgGradient);
    setSlideImagePath(slide.imagePath || '');
    setSlideIconName(slide.iconName);
    setIsSlideModalOpen(true);
  };

  const handleSaveSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slideTitle.trim() || !slideDescription.trim()) return;

    if (editingSlide) {
      // update
      const updated = await updatePromoSlide(editingSlide.id, {
        title: slideTitle.trim(),
        description: slideDescription.trim(),
        badge: slideBadge.trim(),
        bgGradient: slideBgGradient,
        imagePath: slideImagePath,
        iconName: slideIconName
      });
      setSlides(updated);
      await addLog("Mise à jour bannière CVLM", `Bannière "${slideTitle}" mise à jour`, "info");
    } else {
      // create
      const updated = await addPromoSlide({
        title: slideTitle.trim(),
        description: slideDescription.trim(),
        badge: slideBadge.trim(),
        bgGradient: slideBgGradient,
        imagePath: slideImagePath,
        iconName: slideIconName
      });
      setSlides(updated);
      await addLog("Création bannière CVLM", `Nouvelle bannière "${slideTitle}" créée`, "info");
    }
    setIsSlideModalOpen(false);
  };

  const handleDeleteSlide = (id: string, title: string) => {
    setConfirmAdminAction({
      type: 'delete_slide',
      id,
      name: title
    });
  };

  const handleResetSlides = () => {
    setConfirmAdminAction({
      type: 'reset_slides'
    });
  };

  return (
    <div className="space-y-8">
      {/* Introduction Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-orange-500 animate-pulse" />
            Gestionnaire CVLM & Demandes de Rédaction
          </h2>
          <p className="text-slate-450 text-xs font-semibold leading-relaxed mt-1">
            Consultez toutes les demandes de CV et Lettres transmises par les candidats, gérez les modèles et administrez les bannières publicitaires.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {activeTab === 'requests' && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200/60 px-3.5 py-2 rounded-xl">
              <Inbox className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-black text-orange-950">
                {reqSubmittedCount} demande{reqSubmittedCount > 1 ? 's' : ''} en attente
              </span>
            </div>
          )}
          {activeTab === 'templates' && (
            <>
              <Button 
                onClick={handleResetDefaults}
                variant="outline" 
                className="h-11 px-4 border-amber-200 text-amber-700 bg-amber-50/50 hover:bg-amber-100/60 rounded-xl text-xs font-bold transition-all"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Réinitialiser défauts
              </Button>
              <Button 
                onClick={handleOpenAddModal}
                className="h-11 px-5 bg-gradient-to-r from-orange-600 to-amber-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-orange-600/10 hover:opacity-95"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Nouveau Modèle
              </Button>
            </>
          )}
          {activeTab === 'promo_slides' && (
            <>
              <Button 
                onClick={handleResetSlides}
                variant="outline" 
                className="h-11 px-4 border-amber-200 text-amber-700 bg-amber-50/50 hover:bg-amber-100/60 rounded-xl text-xs font-bold transition-all"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Réinitialiser bannières
              </Button>
              <Button 
                onClick={handleOpenAddSlideModal}
                className="h-11 px-5 bg-gradient-to-r from-orange-600 to-amber-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-orange-600/10 hover:opacity-95"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Nouvelle Bannière
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border border-slate-200 bg-slate-50 p-1 rounded-2xl gap-1 max-w-md">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'requests'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Inbox className="h-3.5 w-3.5" />
          Demandes ({reqTotalCount})
          {reqSubmittedCount > 0 && (
            <span className="h-4 min-w-[16px] px-1 bg-white text-orange-600 rounded-full text-[9px] font-black flex items-center justify-center shadow-xs">
              {reqSubmittedCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'templates'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-150/50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="h-3.5 w-3.5 text-orange-500" />
          Modèles ({totalCount})
        </button>

        <button
          onClick={() => setActiveTab('promo_slides')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'promo_slides'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-150/50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5 text-orange-500" />
          Bannières ({slides.length})
        </button>
      </div>

      {/* TAB 1: REQUESTS LIST */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Stats Board */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="border-none shadow-sm rounded-2xl bg-white p-5">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Demandes</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-slate-900">{reqTotalCount}</span>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Reçues</span>
              </div>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl bg-white p-5">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">En Attente</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-amber-600">{reqSubmittedCount}</span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded animate-pulse">Action requise</span>
              </div>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl bg-white p-5">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">En Cours de Rédaction</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-blue-600">{reqProcessingCount}</span>
                <span className="text-[10px] font-bold text-slate-400">experts RH</span>
              </div>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl bg-white p-5">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Terminées / Transmises</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-emerald-600">{reqCompletedCount}</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Livrées</span>
              </div>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl bg-white p-5 col-span-2 lg:col-span-1">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Répartition</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
                  {reqCvCount} CV
                </div>
                <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                  {reqLmCount} Lettres
                </div>
              </div>
            </Card>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                value={reqSearchQuery}
                onChange={(e) => setReqSearchQuery(e.target.value)}
                placeholder="Rechercher par candidat, email, téléphone, poste..."
                className="pl-10 h-11 bg-slate-50 border-slate-200/80 rounded-xl text-xs font-semibold focus-visible:ring-orange-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-150/80">
                <button 
                  onClick={() => setReqFilterType('all')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    reqFilterType === 'all' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tous
                </button>
                <button 
                  onClick={() => setReqFilterType('cv')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    reqFilterType === 'cv' ? 'bg-orange-600 text-white shadow-sm font-black' : 'text-slate-500 hover:text-orange-600'
                  }`}
                >
                  CV
                </button>
                <button 
                  onClick={() => setReqFilterType('lm')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    reqFilterType === 'lm' ? 'bg-blue-600 text-white shadow-sm font-black' : 'text-slate-500 hover:text-blue-600'
                  }`}
                >
                  Lettres
                </button>
              </div>

              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-150/80">
                <button 
                  onClick={() => setReqFilterStatus('all')}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    reqFilterStatus === 'all' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tous Statuts
                </button>
                <button 
                  onClick={() => setReqFilterStatus('submitted')}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    reqFilterStatus === 'submitted' ? 'bg-amber-500 text-white shadow-sm font-black' : 'text-slate-500 hover:text-amber-600'
                  }`}
                >
                  En attente
                </button>
                <button 
                  onClick={() => setReqFilterStatus('processing')}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    reqFilterStatus === 'processing' ? 'bg-blue-600 text-white shadow-sm font-black' : 'text-slate-500 hover:text-blue-600'
                  }`}
                >
                  En cours
                </button>
                <button 
                  onClick={() => setReqFilterStatus('completed')}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    reqFilterStatus === 'completed' ? 'bg-emerald-600 text-white shadow-sm font-black' : 'text-slate-500 hover:text-emerald-600'
                  }`}
                >
                  Terminé
                </button>
              </div>
            </div>
          </div>

          {/* Requests Grid */}
          {loadingRequests ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
              <RefreshCw className="h-8 w-8 text-orange-500 animate-spin mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Chargement des demandes en temps réel...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <Inbox className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">Aucune demande trouvée</h3>
              <p className="text-xs text-slate-400 mt-1">Ajustez vos filtres ou attendez de nouvelles soumissions de candidats.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRequests.map((req) => {
                const dateFormatted = req.createdAt ? new Date(req.createdAt).toLocaleDateString('fr-FR', {
                  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                }) : 'Récemment';

                const targetJob = req.formData?.jobTitle || req.formData?.subject || 'Candidat';
                const phoneClean = (req.userPhone || '').replace(/\s+/g, '');

                return (
                  <div 
                    key={req.id} 
                    className="bg-white rounded-3xl border border-slate-150 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative"
                  >
                    <div className="space-y-3">
                      {/* Top badges bar */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          req.type === 'cv' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {req.type === 'cv' ? '📄 CV Professionnel' : '✉️ Lettre de Motivation'}
                        </span>

                        <select
                          value={req.status || 'submitted'}
                          onChange={(e) => handleUpdateRequestStatus(req.id, e.target.value as any)}
                          className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border outline-none cursor-pointer transition-all ${
                            req.status === 'completed' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : req.status === 'processing'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : req.status === 'cancelled'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                          }`}
                        >
                          <option value="submitted">⏳ En attente</option>
                          <option value="processing">⚙️ En cours</option>
                          <option value="completed">✅ Terminé</option>
                          <option value="cancelled">❌ Annulé</option>
                        </select>
                      </div>

                      {/* Candidate info block */}
                      <div className="flex items-start gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-slate-900 text-orange-500 font-black text-base flex items-center justify-center shrink-0 shadow-sm">
                          {req.userName?.[0] || 'C'}
                        </div>
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <h4 className="text-sm font-black text-slate-900 truncate">{req.userName || 'Candidat Anonyme'}</h4>
                          <p className="text-xs font-bold text-orange-600 truncate">{targetJob}</p>
                          <p className="text-[10px] text-slate-400 font-semibold truncate flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" /> {dateFormatted}
                          </p>
                        </div>
                      </div>

                      {/* Contact metadata */}
                      <div className="bg-slate-50 p-3 rounded-2xl space-y-1.5 border border-slate-100 text-xs text-slate-600 font-medium">
                        <div className="flex items-center gap-2 truncate">
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{req.userEmail || 'Non spécifié'}</span>
                        </div>
                        <div className="flex items-center gap-2 truncate">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate font-semibold">{req.userPhone || 'Non spécifié'}</span>
                        </div>
                        {req.templateName && (
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate font-bold text-slate-700">Modèle : {req.templateName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons footer */}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <Button
                        onClick={() => setSelectedRequest(req)}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 text-orange-400" /> Inspecter détails
                      </Button>

                      <button
                        onClick={() => handleDeleteRequest(req.id, req.userName)}
                        className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center shrink-0 transition-all cursor-pointer"
                        title="Supprimer la demande"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'templates' ? (
        <>
          {/* Stats Board */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="border-none shadow-sm rounded-2xl bg-white p-5">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Modèles totaux</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-slate-900">{totalCount}</span>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Actifs</span>
              </div>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl bg-white p-5">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Modèles de CV</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-orange-600">{cvCount}</span>
                <span className="text-[10px] font-bold text-slate-400">fichiers</span>
              </div>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl bg-white p-5">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Modèles de Lettres</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-blue-600">{lmCount}</span>
                <span className="text-[10px] font-bold text-slate-400">motifs</span>
              </div>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl bg-white p-5">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Membres Premium</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-amber-500 flex items-center gap-1">
                  <Crown className="h-5 w-5 text-amber-500" />
                  {premiumCount}
                </span>
                <span className="text-[10px] font-bold text-slate-400">verrouillés</span>
              </div>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl bg-white p-5 col-span-2 lg:col-span-1">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Taux Premium</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-slate-800">{premiumPercent}%</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{freeCount} Standards</span>
              </div>
            </Card>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par titre ou mot-clé..."
                className="pl-10 h-11 bg-slate-50 border-slate-200/80 rounded-xl text-xs font-semibold focus-visible:ring-orange-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-150/80">
                <button 
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    filterType === 'all' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tous ({totalCount})
                </button>
                <button 
                  onClick={() => setFilterType('cv')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    filterType === 'cv' ? 'bg-orange-600 text-white shadow-sm font-black' : 'text-slate-500 hover:text-orange-600'
                  }`}
                >
                  CV ({cvCount})
                </button>
                <button 
                  onClick={() => setFilterType('lm')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    filterType === 'lm' ? 'bg-blue-600 text-white shadow-sm font-black' : 'text-slate-500 hover:text-blue-600'
                  }`}
                >
                  Lettres ({lmCount})
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-150/80">
                <button 
                  onClick={() => setFilterPremium('all')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    filterPremium === 'all' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tous Accès
                </button>
                <button 
                  onClick={() => setFilterPremium('free')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    filterPremium === 'free' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Standard ({freeCount})
                </button>
                <button 
                  onClick={() => setFilterPremium('premium')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    filterPremium === 'premium' ? 'bg-amber-500 text-white shadow-sm font-black' : 'text-slate-500 hover:text-amber-600'
                  }`}
                >
                  👑 Premium ({premiumCount})
                </button>
              </div>
            </div>
          </div>

          {/* Templates List Grid */}
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">Aucun modèle ne correspond</h3>
              <p className="text-xs text-slate-400 mt-1">Ajustez vos filtres ou lancez une autre recherche.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredTemplates.map((template) => (
                <div 
                  key={template.id}
                  className="bg-white rounded-3xl border border-slate-150/70 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between"
                >
                  {/* Image Frame */}
                  <div className="aspect-[3/4] bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
                    <img 
                      src={getTemplateThumbnail(template.thumbnail, template.type, template.id)} 
                      alt={template.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                      onError={(e) => {
                        (e.target as any).src = getTemplateThumbnail('', template.type, template.id);
                      }}
                    />

                    {/* Tags over image */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-full pointer-events-auto shadow-sm ${
                        template.type === 'cv' ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        {template.type === 'cv' ? 'CV' : 'Lettre'}
                      </span>

                      <button
                        onClick={() => handleTogglePremium(template.id, template.isPremium)}
                        className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider pointer-events-auto shadow-sm flex items-center gap-1 transition-all ${
                          template.isPremium 
                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90' 
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                        title="Changer le statut d'accès"
                      >
                        {template.isPremium ? (
                          <>
                            <Crown className="h-2.5 w-2.5" /> Premium
                          </>
                        ) : (
                          'Standard'
                        )}
                      </button>
                    </div>

                    {/* Operations drawer */}
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
                      <button
                        onClick={() => handleOpenEditModal(template)}
                        className="h-10 w-10 bg-white hover:bg-orange-600 text-slate-800 hover:text-white rounded-xl flex items-center justify-center shadow-lg transition-all animate-in zoom-in-75 duration-150"
                        title="Modifier le modèle"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id, template.name)}
                        className="h-10 w-10 bg-white hover:bg-red-600 text-slate-800 hover:text-white rounded-xl flex items-center justify-center shadow-lg transition-all animate-in zoom-in-75 duration-150"
                        title="Supprimer le modèle"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title info footer */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 truncate">{template.name}</h4>
                      <p className="text-[9px] text-slate-400 mt-0.5">ID: {template.id}</p>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {template.tags.map((tag) => (
                        <span 
                          key={tag} 
                          className="text-[8px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-0.5"
                        >
                          <Tag className="h-1.5 w-1.5 text-slate-400" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="bg-white p-6 rounded-3xl border border-slate-150/70 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 mb-1 flex items-center gap-2">
              <ImageIcon className="h-4.5 w-4.5 text-orange-500" />
              Bannières publicitaires d'accueil personnalisées
            </h3>
            <p className="text-slate-450 text-xs font-semibold leading-relaxed">
              Ces bannières s'affichent en haut de l'espace candidat. Vous pouvez ajouter, modifier ou supprimer des bannières, définir leur badge, icône, dégradé, et télécharger vos propres images d'arrière-plan d'une taille allant jusqu'à 2 Mo.
            </p>
          </div>

          {slides.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-150/75 shadow-sm">
              <ImageIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">Aucune bannière configurée</h3>
              <p className="text-xs text-slate-400 mt-1">Cliquez sur "Nouvelle Bannière" pour configurer un premier message.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {slides.map((slide) => (
                <div 
                  key={slide.id}
                  className="bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden flex flex-col justify-between group transition-all hover:shadow-md"
                >
                  {/* Live Render Area */}
                  <div className="relative w-full h-44 overflow-hidden bg-slate-900">
                    <div className="absolute inset-0 w-full h-full">
                      {slide.imagePath ? (
                        <>
                          <img
                            src={slide.imagePath}
                            alt={slide.title}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          {/* Elegant dark gradient overlay to ensure white text is perfectly legible */}
                          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-transparent" />
                        </>
                      ) : (
                        <div className={`absolute inset-0 w-full h-full bg-gradient-to-r ${slide.bgGradient}`} />
                      )}
                    </div>

                    {/* Content overlays */}
                    <div className="absolute inset-0 p-5 flex flex-col justify-between text-white z-10 select-none">
                      <div>
                        {slide.badge && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-wider text-white">
                            {getIcon(slide.iconName)}
                            {slide.badge}
                          </span>
                        )}
                        <h3 className="text-sm sm:text-base font-black mt-2 tracking-tight drop-shadow-sm leading-tight max-w-md line-clamp-2">
                          {slide.title}
                        </h3>
                        <p className="text-[10px] text-slate-100 font-medium mt-1 leading-relaxed max-w-sm line-clamp-2">
                          {slide.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions & details panel */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 truncate">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Image & Icône</span>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-650">
                        <span className={`h-2 w-2 rounded-full ${slide.imagePath ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span className="truncate max-w-[120px]">{slide.imagePath ? "Image personnalisée" : "Sans image"}</span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1">
                          {getIcon(slide.iconName)}
                          {slide.iconName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        onClick={() => handleOpenEditSlideModal(slide)}
                        variant="outline"
                        className="h-9 px-3 border-slate-200 hover:border-orange-200 text-slate-700 hover:text-orange-600 rounded-xl text-[10px] font-bold bg-white cursor-pointer"
                      >
                        <Edit3 className="mr-1 h-3.5 w-3.5" /> Modifier
                      </Button>
                      <Button
                        onClick={() => handleDeleteSlide(slide.id, slide.title)}
                        variant="outline"
                        className="h-9 px-3 border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-700 hover:text-red-600 rounded-xl text-[10px] font-bold bg-white cursor-pointer"
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Supprimer
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADD TEMPLATE MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] w-full max-w-lg p-8 shadow-2xl relative space-y-6 animate-in fade-in-50 duration-200"
            >
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-800 rounded-full bg-slate-50 hover:bg-slate-100 transition-all"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-orange-600" />
                  Créer un Modèle de Document
                </h3>
                <p className="text-xs text-slate-400 font-semibold">Créez un nouveau modèle de CV ou de Lettre de Motivation.</p>
              </div>

              <form onSubmit={handleCreateTemplate} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Nom du Modèle</Label>
                  <Input 
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: CV Modèle 042H"
                    className="h-11 bg-slate-50 border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Type de Document</Label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as 'cv' | 'lm')}
                      className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-semibold focus-visible:ring-orange-500 outline-none"
                    >
                      <option value="cv">Curriculum Vitae (CV)</option>
                      <option value="lm">Lettre de Motivation (LM)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Accès Premium</Label>
                    <div className="flex items-center h-11 bg-slate-50 border border-slate-200 rounded-xl px-4">
                      <label className="flex items-center gap-2 cursor-pointer w-full justify-between">
                        <span className="text-xs font-semibold text-slate-700">👑 Réservé Premium</span>
                        <input 
                          type="checkbox" 
                          checked={formIsPremium}
                          onChange={(e) => setFormIsPremium(e.target.checked)}
                          className="h-4.5 w-4.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Image miniature du modèle</Label>
                  <ImageUploader 
                    value={formThumbnail} 
                    onChange={setFormThumbnail} 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Mots-clés / Tags (séparés par des virgules)</Label>
                  <Input 
                    required
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="Moderne, Créatif, Tech, Simple"
                    className="h-11 bg-slate-50 border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    variant="outline"
                    className="w-1/2 h-11 rounded-xl text-xs font-bold"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="w-1/2 h-11 bg-orange-600 text-white font-black rounded-xl text-xs uppercase hover:bg-orange-700"
                  >
                    Enregistrer le modèle
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT TEMPLATE MODAL */}
      <AnimatePresence>
        {editingTemplate && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] w-full max-w-lg p-8 shadow-2xl relative space-y-6 animate-in fade-in-50 duration-200"
            >
              <button 
                onClick={() => setEditingTemplate(null)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-800 rounded-full bg-slate-50 hover:bg-slate-100 transition-all"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-orange-600" />
                  Modifier le Modèle CVLM
                </h3>
                <p className="text-xs text-slate-400 font-semibold">Identifiant unique du document : {editingTemplate.id}</p>
              </div>

              <form onSubmit={handleUpdateTemplate} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Nom du Modèle</Label>
                  <Input 
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: CV Modèle 042H"
                    className="h-11 bg-slate-50 border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Type de Document</Label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as 'cv' | 'lm')}
                      className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-semibold focus-visible:ring-orange-500 outline-none"
                    >
                      <option value="cv">Curriculum Vitae (CV)</option>
                      <option value="lm">Lettre de Motivation (LM)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Accès Premium</Label>
                    <div className="flex items-center h-11 bg-slate-50 border border-slate-200 rounded-xl px-4">
                      <label className="flex items-center gap-2 cursor-pointer w-full justify-between">
                        <span className="text-xs font-semibold text-slate-700">👑 Réservé Premium</span>
                        <input 
                          type="checkbox" 
                          checked={formIsPremium}
                          onChange={(e) => setFormIsPremium(e.target.checked)}
                          className="h-4.5 w-4.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Image miniature du modèle</Label>
                  <ImageUploader 
                    value={formThumbnail} 
                    onChange={setFormThumbnail} 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Mots-clés / Tags (séparés par des virgules)</Label>
                  <Input 
                    required
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="Moderne, Créatif, Tech, Simple"
                    className="h-11 bg-slate-50 border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setEditingTemplate(null)}
                    variant="outline"
                    className="w-1/2 h-11 rounded-xl text-xs font-bold"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="w-1/2 h-11 bg-orange-600 text-white font-black rounded-xl text-xs uppercase hover:bg-orange-700"
                  >
                    Mettre à jour le modèle
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SLIDE MODAL (ADD/EDIT) */}
      <AnimatePresence>
        {isSlideModalOpen && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] w-full max-w-lg p-8 shadow-2xl relative space-y-6 animate-in fade-in-50 duration-200"
            >
              <button 
                type="button"
                onClick={() => setIsSlideModalOpen(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-800 rounded-full bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-orange-600" />
                  {editingSlide ? 'Modifier la Bannière' : 'Créer une Nouvelle Bannière'}
                </h3>
                <p className="text-xs text-slate-400 font-semibold">
                  {editingSlide ? 'Modifiez les informations et l\'image de votre bannières.' : 'Configurez une nouvelle bannière d\'accueil.'}
                </p>
              </div>

              <form onSubmit={handleSaveSlide} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Titre de la Bannière</Label>
                  <Input 
                    required
                    value={slideTitle}
                    onChange={(e) => setSlideTitle(e.target.value)}
                    placeholder="Ex: Boostez votre recherche d'emploi !"
                    className="h-11 bg-slate-50 border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Description</Label>
                  <textarea
                    required
                    value={slideDescription}
                    onChange={(e) => setSlideDescription(e.target.value)}
                    placeholder="Ex: Découvrez nos nouveaux outils d'aide à la rédaction."
                    className="w-full min-h-[80px] p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus-visible:ring-orange-500 outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Badge texte</Label>
                    <Input 
                      value={slideBadge}
                      onChange={(e) => setSlideBadge(e.target.value)}
                      placeholder="Ex: Nouveau, Premium, Info..."
                      className="h-11 bg-slate-50 border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Icône</Label>
                    <select
                      value={slideIconName}
                      onChange={(e) => setSlideIconName(e.target.value as any)}
                      className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-semibold focus-visible:ring-orange-500 outline-none"
                    >
                      {ICON_PRESETS.map(icon => (
                        <option key={icon.value} value={icon.value}>{icon.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Image d'illustration (Télécharger)</Label>
                  <ImageUploader 
                    value={slideImagePath} 
                    onChange={setSlideImagePath} 
                  />
                  <p className="text-[9px] font-bold text-slate-400">
                    L'image d'illustration s'affiche en arrière-plan avec une légère superposition sombre pour assurer la lisibilité du texte (taille limite : 2 Mo).
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <Button 
                    type="button"
                    onClick={() => setIsSlideModalOpen(false)}
                    variant="outline"
                    className="flex-1 h-11 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit"
                    className="flex-1 h-11 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    {editingSlide ? 'Mettre à jour' : 'Ajouter la bannière'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REQUEST DETAIL INSPECTION MODAL */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[32px] w-full max-w-4xl max-h-[92vh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden relative"
            >
              {/* Modal Header */}
              <div className="p-6 bg-slate-900 text-white flex items-start justify-between gap-4 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-orange-600 text-white font-black text-2xl flex items-center justify-center shrink-0 shadow-lg shadow-orange-600/20">
                    {selectedRequest.userName?.[0] || 'C'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-white">{selectedRequest.userName || 'Candidat Anonyme'}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        selectedRequest.type === 'cv' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {selectedRequest.type === 'cv' ? 'CV Professionnel' : 'Lettre de Motivation'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium mt-0.5 flex items-center gap-3">
                      <span>Poste / Sujet : <strong className="text-orange-400">{selectedRequest.formData?.jobTitle || selectedRequest.formData?.subject || 'Non spécifié'}</strong></span>
                      {selectedRequest.templateName && <span>• Modèle : {selectedRequest.templateName}</span>}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-8 flex-1 bg-slate-50/50">
                {/* Section 1: Candidate Contact & Identity */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <User className="h-4 w-4 text-orange-600" />
                    Coordonnées du Candidat
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Nom complet</span>
                      <p className="font-bold text-slate-900">{selectedRequest.userName || 'Non renseigné'}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Adresse Email</span>
                      <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <a href={`mailto:${selectedRequest.userEmail}`} className="hover:underline text-blue-600">
                          {selectedRequest.userEmail}
                        </a>
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Téléphone</span>
                      <p className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {selectedRequest.userPhone || 'Non renseigné'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Ville / Adresse</span>
                      <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {selectedRequest.formData?.address || selectedRequest.formData?.personalInfo?.address || selectedRequest.formData?.personalInfo?.city || 'Non renseigné'}
                      </p>
                    </div>

                    {(selectedRequest.formData?.birthYear || selectedRequest.formData?.personalInfo?.birthYear) && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Année de naissance</span>
                        <p className="font-semibold text-slate-800">{selectedRequest.formData?.birthYear || selectedRequest.formData?.personalInfo?.birthYear}</p>
                      </div>
                    )}

                    {(selectedRequest.formData?.nationality || selectedRequest.formData?.personalInfo?.nationality) && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Nationalité</span>
                        <p className="font-semibold text-slate-800">{selectedRequest.formData?.nationality || selectedRequest.formData?.personalInfo?.nationality}</p>
                      </div>
                    )}

                    {selectedRequest.formData?.portfolioUrl && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Portfolio / LinkedIn</span>
                        <p className="font-semibold text-slate-800 truncate">
                          <a href={selectedRequest.formData.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                            <Globe className="h-3.5 w-3.5 shrink-0" /> {selectedRequest.formData.portfolioUrl}
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 2: Full Content Details */}
                {selectedRequest.type === 'cv' ? (
                  <div className="space-y-6">
                    {/* Experiences */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-orange-600" />
                        Expériences Professionnelles
                      </h4>
                      {selectedRequest.formData?.experiences?.length > 0 ? (
                        <div className="space-y-4 divide-y divide-slate-100">
                          {selectedRequest.formData.experiences.map((exp: any, idx: number) => (
                            <div key={idx} className={`${idx > 0 ? 'pt-4' : ''} space-y-1`}>
                              <div className="flex items-center justify-between">
                                <h5 className="text-sm font-bold text-slate-900">{exp.position || 'Poste occupé'}</h5>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                  {exp.startDate} - {exp.endDate || 'Présent'}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-orange-600">{exp.company || 'Entreprise'}</p>
                              {exp.description && (
                                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap pt-1">{exp.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Aucune expérience renseignée.</p>
                      )}
                    </div>

                    {/* Educations */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-orange-600" />
                        Formations & Diplômes
                      </h4>
                      {selectedRequest.formData?.educations?.length > 0 ? (
                        <div className="space-y-4 divide-y divide-slate-100">
                          {selectedRequest.formData.educations.map((edu: any, idx: number) => (
                            <div key={idx} className={`${idx > 0 ? 'pt-4' : ''} space-y-1`}>
                              <div className="flex items-center justify-between">
                                <h5 className="text-sm font-bold text-slate-900">{edu.degree || 'Diplôme / Formation'}</h5>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                  {edu.startDate} - {edu.endDate || 'Présent'}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-blue-600">{edu.school || 'Établissement'}</p>
                              {edu.description && (
                                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap pt-1">{edu.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Aucune formation renseignée.</p>
                      )}
                    </div>

                    {/* Skills & Languages */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                          <Zap className="h-4 w-4 text-orange-600" />
                          Compétences & Outils
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Compétences clés :</span>
                            <p className="font-medium text-slate-800">{selectedRequest.formData?.skillsTechnical || 'Non spécifié'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Outils & Logiciels :</span>
                            <p className="font-medium text-slate-800">{selectedRequest.formData?.skillsTools || 'Non spécifié'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                          <Globe className="h-4 w-4 text-orange-600" />
                          Langues & Intérêts
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Langues :</span>
                            <p className="font-medium text-slate-800">{selectedRequest.formData?.skillsLanguages || 'Non spécifié'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Centres d'intérêt :</span>
                            <p className="font-medium text-slate-800">{selectedRequest.formData?.interestsHobbies || 'Non spécifié'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Lettre de Motivation Details */
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        Détails de la Lettre de Motivation
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Entreprise Destinataire</span>
                          <p className="font-bold text-slate-900">{selectedRequest.formData?.recipientCompany || 'Non spécifiée'}</p>
                          <p className="text-slate-600">{selectedRequest.formData?.recipientName}</p>
                          <p className="text-slate-500">{selectedRequest.formData?.recipientAddress}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Objet de la demande</span>
                          <p className="font-bold text-orange-600">{selectedRequest.formData?.subject || 'Candidature'}</p>
                          <p className="text-slate-500 mt-1">Date d'envoi : {selectedRequest.formData?.date || 'Date du jour'}</p>
                        </div>
                      </div>

                      {/* Content Letter Text */}
                      <div className="space-y-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Contenu complet de la lettre :</span>
                        <div className="p-6 bg-slate-50/80 border border-slate-200/60 rounded-2xl font-serif text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
                          {selectedRequest.formData?.openingSalutation && (
                            <p className="font-bold mb-4 font-sans">{selectedRequest.formData.openingSalutation}</p>
                          )}
                          <p>{selectedRequest.formData?.content || 'Aucun contenu texte'}</p>
                          {selectedRequest.formData?.closingSalutation && (
                            <p className="mt-6 font-sans font-medium">{selectedRequest.formData.closingSalutation}</p>
                          )}
                          {selectedRequest.formData?.signature && (
                            <p className="mt-4 font-bold font-sans text-slate-950">{selectedRequest.formData.signature}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="p-6 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500">Statut :</span>
                  <select
                    value={selectedRequest.status || 'submitted'}
                    onChange={(e) => handleUpdateRequestStatus(selectedRequest.id, e.target.value as any)}
                    className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase text-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="submitted">⏳ En attente</option>
                    <option value="processing">⚙️ En cours de traitement</option>
                    <option value="completed">✅ Terminé / Livré</option>
                    <option value="cancelled">❌ Annulé</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedRequest.formData, null, 2));
                      showToast("Données brutes copiées dans le presse-papier", "info");
                    }}
                    variant="outline"
                    className="h-10 px-3 rounded-xl border-slate-200 text-slate-700 text-xs font-bold"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copier
                  </Button>

                  <Button
                    onClick={() => window.print()}
                    variant="outline"
                    className="h-10 px-3 rounded-xl border-slate-200 text-slate-700 text-xs font-bold"
                  >
                    <Printer className="h-3.5 w-3.5 mr-1" /> Imprimer
                  </Button>

                  <Button
                    onClick={() => setSelectedRequest(null)}
                    className="h-10 px-5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold"
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal for Admin Actions */}
      <AnimatePresence>
        {confirmAdminAction && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] w-full max-w-sm p-6 shadow-2xl border border-slate-100 space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 ${
                  confirmAdminAction.type.startsWith('delete') ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-950">
                    {confirmAdminAction.type.startsWith('delete') ? 'Confirmer la suppression' : 'Confirmer l\'action'}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Cette action est définitive</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {confirmAdminAction.type === 'delete_request' && (
                  <>Êtes-vous sûr de vouloir supprimer la demande de <strong className="text-slate-900">"{confirmAdminAction.name}"</strong> ?</>
                )}
                {confirmAdminAction.type === 'delete_template' && (
                  <>Êtes-vous sûr de vouloir supprimer définitivement le modèle <strong className="text-slate-900">"{confirmAdminAction.name}"</strong> ?</>
                )}
                {confirmAdminAction.type === 'reset_templates' && (
                  <>Attention: Cette action réinitialisera la base de données de modèles aux 84 templates par défaut. Vos ajouts et personnalisations seront écrasés.</>
                )}
                {confirmAdminAction.type === 'delete_slide' && (
                  <>Êtes-vous sûr de vouloir supprimer définitivement la bannière <strong className="text-slate-900">"{confirmAdminAction.name}"</strong> ?</>
                )}
                {confirmAdminAction.type === 'reset_slides' && (
                  <>Attention: Réinitialisera toutes les bannières publicitaires aux valeurs par défaut.</>
                )}
              </p>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => setConfirmAdminAction(null)}
                  variant="outline"
                  className="flex-1 h-10 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    const actionType = confirmAdminAction.type;
                    const actionId = confirmAdminAction.id;
                    const actionName = confirmAdminAction.name;
                    setConfirmAdminAction(null);

                    if (actionType === 'delete_request' && actionId) {
                      try {
                        await deleteDoc(doc(db, 'cv_requests', actionId));
                        setRequests(prev => prev.filter(r => r.id !== actionId));
                        if (selectedRequest?.id === actionId) setSelectedRequest(null);
                        showToast("Demande supprimée", "info");
                        await addLog("Suppression de demande", `Demande de "${actionName}" (ID: ${actionId}) supprimée`, "warning");
                      } catch (e) {
                        console.error("Error deleting request:", e);
                        showToast("Erreur lors de la suppression de la demande", "error");
                      }
                    } else if (actionType === 'delete_template' && actionId && actionName) {
                      const updated = deleteTemplate(actionId);
                      setTemplates(updated);
                      await addLog("Suppression de modèle CVLM", `Modèle "${actionName}" (ID: ${actionId}) supprimé`, "warning");
                    } else if (actionType === 'reset_templates') {
                      const fresh = resetTemplates();
                      setTemplates(fresh);
                      await addLog("Réinitialisation modèles CVLM", "Base de modèles restaurée aux valeurs d'usine", "warning");
                    } else if (actionType === 'delete_slide' && actionId && actionName) {
                      const updated = deletePromoSlide(actionId);
                      setSlides(updated);
                      await addLog("Suppression bannière CVLM", `Bannière "${actionName}" supprimée`, "warning");
                    } else if (actionType === 'reset_slides') {
                      const fresh = resetPromoSlides();
                      setSlides(fresh);
                      await addLog("Réinitialisation bannières CVLM", "Bannières restaurées aux valeurs d'usine", "warning");
                    }
                  }}
                  className={`flex-1 h-10 text-white font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer ${
                    confirmAdminAction.type.startsWith('delete') ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  Confirmer
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
