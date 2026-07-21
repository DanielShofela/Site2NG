import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutGrid, FileText, Users, Settings, Sparkles, Heart, Eye, 
  Share2, Search, Award, HelpCircle, LogIn, Compass, ArrowRight,
  LogOut, CheckCircle, Bell, Shield, Info, Copy, UserCheck, Edit, Trash2
} from 'lucide-react';
import { CVLMScreen, CVLMTemplate, CVVersion, LMVersion, CVLMUserProfile } from '@/types/cvlm';
import { getCVTemplates, getLMTemplates, getTemplates, toggleFavorite } from '@/services/templateService';
import { getAllVersions, duplicateVersion, deleteVersion } from '@/services/cvVersionService';
import { getAllLMVersions, duplicateLMVersion, deleteLMVersion } from '@/services/lmVersionService';
import { showToast, ToastMessage } from '@/components/dashboard/toast';

import GlassCard from '@/components/dashboard/GlassCard';
import Button from '@/components/dashboard/Button';
import ImageCarousel from '@/components/dashboard/ImageCarousel';
import BottomNav from '@/components/dashboard/BottomNav';
import CVForm from '@/components/dashboard/CVForm';
import LMForm from '@/components/dashboard/LMForm';
import VersionManagement from '@/components/dashboard/VersionManagement';

import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

const DEFAULT_PROFILE = (email: string = '', name: string = ''): CVLMUserProfile => ({
  name: name,
  email: email,
  phone: '',
  jobTitle: '',
  locationCity: 'Abidjan',
  locationCountry: 'Côte d\'Ivoire',
  linkedinUrl: '',
  portfolioUrl: '',
  websiteUrl: '',
  bio: 'Candidat déterminé à la recherche de nouvelles opportunités professionnelles.',
  openToWork: true,
  languages: ['Français', 'Anglais'],
  points: 120,
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces'
});

interface TemplateCardProps {
  key?: string | number;
  template: CVLMTemplate;
  onPreview: (template: CVLMTemplate) => void;
  onToggleFav: (id: string, e: React.MouseEvent) => void;
  onShare: (template: CVLMTemplate, e: React.MouseEvent) => void;
  onUse: (template: CVLMTemplate) => void;
}

function TemplateCard({ template, onPreview, onToggleFav, onShare, onUse }: TemplateCardProps) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div className="bg-white rounded-3xl border border-slate-150/70 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between">
      {/* Thumbnail frame */}
      <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
        {template.thumbnail && !imgErr ? (
          <img
            src={template.thumbnail}
            alt={template.name}
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
            onError={() => setImgErr(true)}
          />
        ) : (
          // High-fidelity fallback gradient placeholder
          <div className={`absolute inset-0 bg-gradient-to-br ${
            template.type === 'cv' 
              ? 'from-orange-500/20 via-amber-500/10 to-transparent' 
              : 'from-slate-800/10 to-slate-200/10'
          } flex flex-col items-center justify-center p-4 text-center space-y-2`}>
            <FileText className={`h-12 w-12 ${template.type === 'cv' ? 'text-orange-500' : 'text-slate-400'}`} />
            <p className="text-[10px] font-black uppercase text-slate-800">{template.name}</p>
            <span className="text-[8px] font-bold text-slate-400">Aperçu indisponible</span>
          </div>
        )}

        {/* Top quick badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-full pointer-events-auto shadow-sm ${
            template.type === 'cv' ? 'bg-orange-600 text-white' : 'bg-slate-900 text-white'
          }`}>
            {template.type === 'cv' ? 'CV' : 'Lettre'}
          </span>
          
          {template.isPremium && (
            <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[8px] font-black uppercase tracking-wider rounded-md pointer-events-auto shadow-sm">
              👑 Premium
            </span>
          )}
        </div>

        {/* Hover Overlay Buttons drawer */}
        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-250 flex items-center justify-center gap-2 z-10">
          <button
            onClick={() => onPreview(template)}
            className="p-3 bg-white/95 text-slate-800 hover:bg-orange-600 hover:text-white rounded-2xl transition-all shadow-md cursor-pointer"
            title="Aperçu rapide"
          >
            <Eye className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={(e) => onToggleFav(template.id, e)}
            className="p-3 bg-white/95 text-slate-800 hover:text-rose-600 rounded-2xl transition-all shadow-md cursor-pointer"
            title="Ajouter aux favoris"
          >
            <Heart className={`h-4.5 w-4.5 ${template.isFavorite ? 'text-rose-600 fill-rose-600' : ''}`} />
          </button>
          <button
            onClick={(e) => onShare(template, e)}
            className="p-3 bg-white/95 text-slate-800 hover:text-blue-600 rounded-2xl transition-all shadow-md cursor-pointer"
            title="Partager"
          >
            <Share2 className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Info & Use action */}
      <div className="p-4 space-y-3">
        <div>
          <h4 className="text-xs font-black text-slate-800 truncate">{template.name}</h4>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {template.tags.map((tag) => (
              <span key={tag} className="text-[8px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <Button 
          variant={template.isPremium ? 'premium' : 'primary'} 
          className="w-full h-10 text-[9px] font-black uppercase tracking-wider rounded-xl"
          onClick={() => onUse(template)}
        >
          Utiliser ce modèle
        </Button>
      </div>
    </div>
  );
}

export default function CVLM() {
  const { user, logout } = useAuth();
  const [screen, setScreen] = useState<CVLMScreen>(CVLMScreen.ONBOARDING);
  const [templates, setTemplates] = useState<CVLMTemplate[]>([]);
  const [filter, setFilter] = useState<'all' | 'cv' | 'lm' | 'favorite'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cvVersions, setCvVersions] = useState<CVVersion[]>([]);
  const [lmVersions, setLmVersions] = useState<LMVersion[]>([]);
  const [profile, setProfile] = useState<CVLMUserProfile>(DEFAULT_PROFILE('', ''));
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Custom Confirmation Modal state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete_cv' | 'delete_lm';
    id: string;
    name: string;
  } | null>(null);
  
  // Template Preview Modal
  const [previewTemplate, setPreviewTemplate] = useState<CVLMTemplate | null>(null);

  // Form State
  const [selectedTemplate, setSelectedTemplate] = useState<CVLMTemplate | null>(null);
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);

  // Toast Listener
  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastMessage>;
      const newToast = customEvent.detail;
      setToasts(prev => [...prev, newToast]);
      
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id));
      }, 3500);
    };

    window.addEventListener('cvlm_toast', handleToast);
    return () => window.removeEventListener('cvlm_toast', handleToast);
  }, []);

  // Sync / Load Initial Data
  const refreshData = () => {
    setTemplates(getTemplates());
    setCvVersions(getAllVersions());
    setLmVersions(getAllLMVersions());

    const storedProfile = localStorage.getItem('cvlm_profile');
    if (storedProfile) {
      try {
        setProfile(JSON.parse(storedProfile));
      } catch (e) {
        console.error(e);
      }
    } else if (user) {
      const initial = DEFAULT_PROFILE(user.email, user.displayName || '');
      localStorage.setItem('cvlm_profile', JSON.stringify(initial));
      setProfile(initial);
    }
  };

  useEffect(() => {
    refreshData();
  }, [user]);

  // Actions
  const handleToggleFav = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = toggleFavorite(id);
    setTemplates(updated);
    showToast('Favoris mis à jour !', 'success');
  };

  const handleShare = (template: CVLMTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/cvlm?template=${template.id}`;
    navigator.clipboard.writeText(shareUrl);
    showToast(`Lien de partage copié : ${template.name}`, 'success');
  };

  const handleUseTemplate = (template: CVLMTemplate) => {
    setPreviewTemplate(null);
    setSelectedTemplate(template);
    setEditingVersionId(null);
    if (template.type === 'cv') {
      setScreen(CVLMScreen.CV_FORM);
    } else {
      setScreen(CVLMScreen.LM_FORM);
    }
  };

  const handleEditCVVersion = (version: CVVersion) => {
    const matchedTemplate = templates.find(t => t.id === version.templateId) || {
      id: version.templateId || 'cv-1',
      name: version.templateName || 'Modèle Personnalisé',
      thumbnail: '',
      tags: [],
      isPremium: false,
      isFavorite: false,
      type: 'cv' as const
    };
    setSelectedTemplate(matchedTemplate);
    setEditingVersionId(version.id);
    setScreen(CVLMScreen.CV_FORM);
  };

  const handleEditLMVersion = (version: LMVersion) => {
    const matchedTemplate = templates.find(t => t.id === version.templateId) || {
      id: version.templateId || 'lm-1',
      name: version.templateName || 'Lettre Personnalisée',
      thumbnail: '',
      tags: [],
      isPremium: false,
      isFavorite: false,
      type: 'lm' as const
    };
    setSelectedTemplate(matchedTemplate);
    setEditingVersionId(version.id);
    setScreen(CVLMScreen.LM_FORM);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('cvlm_profile', JSON.stringify(profile));
    showToast('Profil enregistré avec succès !', 'success');
    // Increment points for completing profile
    setProfile(prev => {
      const updated = { ...prev, points: prev.points + 10 };
      localStorage.setItem('cvlm_profile', JSON.stringify(updated));
      return updated;
    });
  };

  // Filter & Search computation
  const filteredTemplates = templates.filter(t => {
    const matchesFilter = 
      filter === 'all' ? true :
      filter === 'favorite' ? t.isFavorite :
      t.type === filter;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50/75 pb-24 lg:pb-8 flex flex-col font-sans">
      
      {/* Toast Alert overlay container */}
      <div className="fixed top-24 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 border ${
                t.type === 'success' 
                  ? 'bg-emerald-500 text-white border-emerald-400' 
                  : t.type === 'error' 
                    ? 'bg-rose-500 text-white border-rose-400' 
                    : 'bg-slate-900 text-white border-slate-800'
              }`}
            >
              <div className="font-extrabold text-xs tracking-wide leading-snug flex-1">
                {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'} {t.message}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Responsive Workspace Layout Header */}
      <div className="hidden lg:block bg-white border-b border-slate-200/60 sticky top-[88px] z-20 py-2.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          {/* Desktop Navigation Links tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1.5 rounded-2xl">
            {[
              { scr: CVLMScreen.DASHBOARD, label: 'Galerie', icon: <LayoutGrid className="h-4 w-4" /> },
              { scr: CVLMScreen.MY_CVS, label: 'Mes Documents', icon: <FileText className="h-4 w-4" /> },
              { scr: CVLMScreen.COMMUNITY, label: 'Communauté', icon: <Users className="h-4 w-4" /> },
              { scr: CVLMScreen.SETTINGS, label: 'Mon Profil', icon: <Settings className="h-4 w-4" /> }
            ].map((tab) => {
              const active = screen === tab.scr;
              return (
                <button
                  key={tab.scr}
                  onClick={() => setScreen(tab.scr)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    active 
                      ? 'bg-white text-orange-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Screen Render Switch */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        
        {/* SCREEN 7: ONBOARDING */}
        {screen === CVLMScreen.ONBOARDING && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto py-12 text-center space-y-8"
          >
            <div className="space-y-4 max-w-xl mx-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                ✨ Propulsé par l'IA Gemini 2.5
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Créez des candidatures d'impact en <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-650 to-amber-500">quelques minutes</span>.
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed">
                Accédez à 41 templates de CV professionnels, 43 modèles de lettres de motivation, et optimisez votre style instantanément avec l'IA.
              </p>
            </div>

            {/* Quick benefits grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <GlassCard className="p-6 text-center space-y-3">
                <div className="h-11 w-11 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <LayoutGrid className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Bibliothèque Riche</h4>
                <p className="text-[11px] font-semibold text-slate-400">Plus de 80 gabarits haut de gamme conformes aux normes RH.</p>
              </GlassCard>
              <GlassCard className="p-6 text-center space-y-3">
                <div className="h-11 w-11 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Conseils IA en direct</h4>
                <p className="text-[11px] font-semibold text-slate-400">Génération de phrases d'impact, corrections stylistiques et ATS.</p>
              </GlassCard>
              <GlassCard className="p-6 text-center space-y-3">
                <div className="h-11 w-11 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <FileText className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Exportation Instantanée</h4>
                <p className="text-[11px] font-semibold text-slate-400">Téléchargez vos documents au format PDF standard A4 en un clic.</p>
              </GlassCard>
            </div>

            <div className="pt-6">
              <Button 
                variant="primary" 
                size="lg" 
                className="px-8 shadow-xl shadow-orange-650/20"
                onClick={() => setScreen(CVLMScreen.DASHBOARD)}
              >
                Commencer gratuitement <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* SCREEN 1: DASHBOARD (Galerie de Modèles) */}
        {screen === CVLMScreen.DASHBOARD && (
          <div className="space-y-8 animate-fade-in">
            {/* Promo automatic sliding banner carousel */}
            <ImageCarousel />

            {/* Dashboard stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <GlassCard className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">Brouillons CV</p>
                  <p className="text-sm font-black text-slate-800">{cvVersions.length} créés</p>
                </div>
              </GlassCard>
              <GlassCard className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">Lettres de Motiv.</p>
                  <p className="text-sm font-black text-slate-800">{lmVersions.length} créées</p>
                </div>
              </GlassCard>
              <GlassCard 
                onClick={() => setFilter('favorite')}
                className={`p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-all select-none ${
                  filter === 'favorite' ? 'ring-2 ring-rose-500 bg-rose-50/10' : ''
                }`}
              >
                <div className="h-10 w-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                  <Heart className="h-5 w-5 text-rose-500 fill-rose-500" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">Favoris</p>
                  <p className="text-sm font-black text-slate-800">
                    {templates.filter(t => t.isFavorite).length} modèles
                  </p>
                </div>
              </GlassCard>
              <GlassCard className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">Palier de Compte</p>
                  <p className="text-sm font-black text-slate-800">Candidat Élite</p>
                </div>
              </GlassCard>
            </div>

            {/* Filtering, Search & Layout configuration */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl shrink-0 w-max overflow-x-auto max-w-full">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    filter === 'all' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Tous ({templates.length})
                </button>
                <button
                  onClick={() => setFilter('cv')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    filter === 'cv' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  CV (41)
                </button>
                <button
                  onClick={() => setFilter('lm')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    filter === 'lm' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Lettres (43)
                </button>
                <button
                  onClick={() => setFilter('favorite')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    filter === 'favorite' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Favoris ({templates.filter(t => t.isFavorite).length})
                </button>
              </div>

              {/* Elegant Search Bar */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par tag, modèle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 focus:border-orange-500 rounded-2xl text-xs font-medium focus:outline-none"
                />
              </div>
            </div>

            {/* Templates Grid Renderer */}
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-16 text-slate-400 font-semibold text-xs bg-white rounded-3xl border">
                Aucun modèle ne correspond à votre recherche. Essayez d'autres mots-clés.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onPreview={setPreviewTemplate}
                    onToggleFav={handleToggleFav}
                    onShare={handleShare}
                    onUse={handleUseTemplate}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* SCREEN 2: CVForm Multi-step Editor */}
        {screen === CVLMScreen.CV_FORM && selectedTemplate && (
          <CVForm
            templateId={selectedTemplate.id}
            templateName={selectedTemplate.name}
            initialVersionId={editingVersionId}
            onBack={() => setScreen(CVLMScreen.DASHBOARD)}
            onSaveComplete={() => {
              refreshData();
              setScreen(CVLMScreen.MY_CVS);
            }}
            userProfile={profile}
          />
        )}

        {/* SCREEN 3: LMForm Multi-step Editor */}
        {screen === CVLMScreen.LM_FORM && selectedTemplate && (
          <LMForm
            templateId={selectedTemplate.id}
            templateName={selectedTemplate.name}
            initialVersionId={editingVersionId}
            onBack={() => setScreen(CVLMScreen.DASHBOARD)}
            onSaveComplete={() => {
              refreshData();
              setScreen(CVLMScreen.MY_CVS);
            }}
            userProfile={profile}
          />
        )}

        {/* SCREEN 4: MY_CVS (Historique et gestion des brouillons) */}
        {screen === CVLMScreen.MY_CVS && (
          <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">📂 Mes Documents récents</h3>
                <p className="text-[10px] font-bold text-slate-400">HISTORIQUE DES BROUILLONS DE CV ET LETTRES</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setScreen(CVLMScreen.DASHBOARD)}>
                + Nouveau document
              </Button>
            </div>

            {/* Split layout for CV drafts and Letters drafts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* CV Drafts */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-orange-600 flex items-center gap-1.5">
                  📝 Mes CVs sauvegardés ({cvVersions.length})
                </h4>

                {cvVersions.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-semibold text-xs border border-dashed rounded-2xl bg-white">
                    Aucun CV en cours. Visitez la Galerie pour en créer un !
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {cvVersions.map((v) => (
                      <div key={v.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate">{v.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold mt-0.5">Modèle: {v.templateName}</p>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md text-[8px] font-black uppercase mt-1.5">
                            ● Complété
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleEditCVVersion(v)}
                            className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                            title="Éditer"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setConfirmAction({ type: 'delete_cv', id: v.id, name: v.name })}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cover Letters drafts */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  ✉️ Mes Lettres sauvegardées ({lmVersions.length})
                </h4>

                {lmVersions.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-semibold text-xs border border-dashed rounded-2xl bg-white">
                    Aucune lettre rédigée. Visitez la Galerie pour en créer une !
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {lmVersions.map((v) => (
                      <div key={v.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate">{v.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold mt-0.5">Modèle: {v.templateName}</p>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md text-[8px] font-black uppercase mt-1.5">
                            ● Complété
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleEditLMVersion(v)}
                            className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                            title="Éditer"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setConfirmAction({ type: 'delete_lm', id: v.id, name: v.name })}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 5: SETTINGS (Profil & Préférences) */}
        {screen === CVLMScreen.SETTINGS && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div className="border-b pb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">👤 Mon Profil Professionnel</h3>
              <p className="text-[10px] font-bold text-slate-400">ÉDITER VOS INFORMATIONS DE PRE-REMPLISSAGE</p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <GlassCard className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-4 border-b border-slate-100 pb-5">
                  <div className="relative group shrink-0">
                    <img
                      src={profile.avatarUrl}
                      alt="Avatar"
                      className="h-20 w-20 rounded-full object-cover border-2 border-orange-500 shadow-sm"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                      <span className="text-[8px] font-black text-white uppercase tracking-wider">Éditer</span>
                    </div>
                  </div>
                  <div className="text-center sm:text-left">
                    <h4 className="text-sm font-black text-slate-800">{profile.name || "Candidat Invité"}</h4>
                    <p className="text-xs text-slate-400 font-semibold">{profile.email}</p>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-orange-50 text-orange-600 rounded-full text-[9px] font-black uppercase tracking-wider mt-1.5">
                      🔥 Niveau 24
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500">Nom Complet</label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full h-11 px-4 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-orange-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500">Adresse Email</label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full h-11 px-4 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none bg-slate-50 text-slate-400 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500">Poste ou Titre visé</label>
                    <input
                      type="text"
                      value={profile.jobTitle}
                      onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })}
                      className="w-full h-11 px-4 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-orange-500 bg-white"
                      placeholder="Développeur Frontend React"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500">Téléphone</label>
                    <input
                      type="text"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full h-11 px-4 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-orange-500 bg-white"
                      placeholder="+225 07 00 00 00 00"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500">Bio professionnelle</label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    rows={3}
                    className="w-full p-4 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-orange-500 bg-white"
                  />
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4.5 w-4.5 text-orange-600" />
                    <span className="text-xs font-black text-slate-700">Notifications par Email</span>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black uppercase">Activé</span>
                </div>

                <div className="pt-4 flex items-center justify-end">
                  <Button type="submit" variant="primary">
                    Enregistrer le Profil
                  </Button>
                </div>
              </GlassCard>
            </form>
          </div>
        )}

        {/* SCREEN 6: COMMUNITY (Futur) */}
        {screen === CVLMScreen.COMMUNITY && (
          <div className="max-w-2xl mx-auto text-center py-16 space-y-4 animate-fade-in">
            <div className="h-16 w-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Compass className="h-8 w-8 animate-spin" style={{ animationDuration: '20s' }} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Espace Communauté CVLM</h3>
            <p className="text-xs font-semibold text-slate-400 max-w-md mx-auto leading-relaxed">
              Le réseau de partage d'idées, d'avis de recruteurs et de templates collaboratifs est en cours de déploiement par l'équipe 2NG Groupe. Revenez très bientôt !
            </p>
          </div>
        )}

      </main>

      {/* Floating Template Preview Dialog Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Aperçu : {previewTemplate.name}
              </h4>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-extrabold cursor-pointer"
              >
                Fermer
              </button>
            </div>
            
            <div className="p-5 space-y-4 text-center">
              <div className="aspect-[3/4] bg-slate-100 rounded-2xl overflow-hidden shadow-inner border max-w-xs mx-auto">
                <img
                  src={previewTemplate.thumbnail}
                  alt={previewTemplate.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=300&h=400&fit=crop';
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-1.5 justify-center">
                {previewTemplate.tags.map(tag => (
                  <span key={tag} className="text-[9px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-150 flex items-center justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setPreviewTemplate(null)}>
                Annuler
              </Button>
              <Button variant="primary" size="sm" onClick={() => handleUseTemplate(previewTemplate)}>
                Utiliser ce Gabarit
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-950">Confirmer la suppression</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Cette action est irréversible</p>
                </div>
              </div>

              <p className="text-xs text-slate-650 font-medium leading-relaxed">
                Êtes-vous sûr de vouloir supprimer définitivement le document <strong className="text-slate-900">"{confirmAction.name}"</strong> ?
              </p>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  variant="outline"
                  className="flex-1 h-10 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (confirmAction.type === 'delete_cv') {
                      deleteVersion(confirmAction.id);
                      refreshData();
                      showToast('Brouillon supprimé !', 'success');
                    } else if (confirmAction.type === 'delete_lm') {
                      deleteLMVersion(confirmAction.id);
                      refreshData();
                      showToast('Lettre supprimée !', 'success');
                    }
                    setConfirmAction(null);
                  }}
                  className="flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer"
                >
                  Supprimer
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Persistent Bottom navigation for mobile layouts */}
      <BottomNav
        currentScreen={screen}
        onScreenChange={(scr) => setScreen(scr)}
      />

    </div>
  );
}
export { DEFAULT_PROFILE };
