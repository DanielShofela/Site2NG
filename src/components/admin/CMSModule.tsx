import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ImageIcon, 
  Save, 
  Sparkles, 
  Globe, 
  Volume2, 
  Sliders, 
  Plus, 
  Trash2, 
  CheckCircle,
  Eye,
  ArrowRight,
  Megaphone
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadImageToStorage } from '@/lib/imageUtils';


interface CMSProps {
  currentData: any;
  onSave: (newData: any) => void;
}

const compressImage = (base64Str: string, maxWidth = 900, maxHeight = 900, quality = 0.70): Promise<string> => {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image/')) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

export default function CMSModule({ currentData, onSave }: CMSProps) {
  const [localData, setLocalData] = useState<any>(currentData || {});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'branding' | 'hero' | 'founder' | 'banner' | 'testimonials' | 'jobs_banner'>('branding');

  // Slide testimonial creator state
  const [testimName, setTestimName] = useState("");
  const [testimRole, setTestimRole] = useState("");
  const [testimQuote, setTestimQuote] = useState("");

  useEffect(() => {
    if (currentData) {
      setLocalData(currentData);
    }
  }, [currentData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Proactively compress any long uncompressed base64 images in localData before saving to prevent Firestore 1MB limits!
      const dataToSave = { ...localData };
      
      const compressListIfNecessary = async (list: string[] | undefined) => {
        if (!list) return undefined;
        return Promise.all(list.map(async (img) => {
          if (img && img.startsWith('data:image/') && img.length > 150000) {
            return await compressImage(img, 900, 900, 0.65);
          }
          return img;
        }));
      };

      if (dataToSave.jobsBannerImages) {
        dataToSave.jobsBannerImages = await compressListIfNecessary(dataToSave.jobsBannerImages);
      }
      if (dataToSave.jobsInBetweenBannersImages) {
        dataToSave.jobsInBetweenBannersImages = await compressListIfNecessary(dataToSave.jobsInBetweenBannersImages);
      }
      if (dataToSave.bannerImages) {
        dataToSave.bannerImages = await compressListIfNecessary(dataToSave.bannerImages);
      }
      
      const fieldsToCompress = ['founderPhotoUrl', 'logoUrl', 'iconUrl', 'heroBgUrl', 'heroVisualUrl'];
      for (const field of fieldsToCompress) {
        if (dataToSave[field] && dataToSave[field].startsWith('data:image/') && dataToSave[field].length > 150000) {
          dataToSave[field] = await compressImage(dataToSave[field], 700, 700, 0.70);
        }
      }

      const configRef = doc(db, 'site_config', 'home');
      await setDoc(configRef, dataToSave);
      onSave(dataToSave);
      setLocalData(dataToSave);
      alert("La configuration globale du CMS a été mise à jour en direct ! Les visiteurs verront immédiatement ces modifications.");
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'enregistrement de la configuration. Conseil : assurez-vous de ne pas dépasser la taille autorisée et que vos images ne soient pas excessivement lourdes.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const storageUrl = await uploadImageToStorage(file, 'cms');
        setLocalData((prev: any) => ({ ...prev, [field]: storageUrl }));
      } catch (err) {
        console.error("Error uploading image to storage:", err);
      }
    }
  };

  const handleAddTestimonial = () => {
    if (!testimName.trim() || !testimQuote.trim()) {
      alert("Veuillez remplir au moins le nom et le témoignage.");
      return;
    }

    const currentTestimonials = localData.testimonials || [];
    const updated = [
      ...currentTestimonials,
      {
        id: Math.random().toString(36).substring(7),
        name: testimName,
        role: testimRole || "Adhérent 2NG",
        quote: testimQuote,
        photoUrl: "https://lh3.googleusercontent.com/d/1O58k8ZpXqgXW-9_H-Hk3V-e4I5V_H_R3=w100-h100"
      }
    ];

    setLocalData({ ...localData, testimonials: updated });
    setTestimName("");
    setTestimRole("");
    setTestimQuote("");
  };

  const handleDeleteTestimonial = (id: string) => {
    const currentTestimonials = localData.testimonials || [];
    const filtered = currentTestimonials.filter((t: any) => t.id !== id);
    setLocalData({ ...localData, testimonials: filtered });
  };

  return (
    <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
      <CardHeader className="p-6 md:p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Globe className="h-6 w-6 text-orange-600" />
            Homepage CMS Studio
          </CardTitle>
          <CardDescription className="text-xs font-semibold text-slate-400 mt-1">Personnalisez les slogans, le branding et la charte graphique de la vitrine publique.</CardDescription>
        </div>
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="h-11 rounded-xl bg-orange-600 font-black text-xs text-white uppercase px-6 hover:bg-orange-700 shadow-xl shadow-orange-600/15 flex items-center gap-2 self-end md:self-center"
        >
          <Save className="h-4.5 w-4.5" />
          {saving ? "Sauvegarde..." : "Publier l'édition"}
        </Button>
      </CardHeader>
      
      {/* Sub-tabs menu */}
      <div className="bg-slate-50 border-b border-slate-100 flex p-2 gap-1 overflow-x-auto">
        {(['branding', 'hero', 'founder', 'banner', 'testimonials', 'jobs_banner'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === tab 
                ? 'bg-white text-orange-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            {tab === 'branding' && 'Logo & Branding'}
            {tab === 'hero' && 'Section d\'accueil'}
            {tab === 'founder' && 'Le Fondateur'}
            {tab === 'banner' && 'Bannière Promotionnelle'}
            {tab === 'testimonials' && 'Carrousel Témoignages'}
            {tab === 'jobs_banner' && 'Bannières d’Offres (Œuvres)'}
          </button>
        ))}
      </div>

      <CardContent className="p-6 md:p-8">
        {activeTab === 'branding' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-50 pb-2">
                <Sparkles className="h-4 w-4 text-orange-600" /> Identité Principale
              </h4>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-800 ml-1">Nom commercial de l'application *</Label>
                <Input 
                  value={localData.siteName || ""} 
                  onChange={(e) => setLocalData({ ...localData, siteName: e.target.value })}
                  placeholder="Ex: 2NG Groupe Entreprises"
                  className="h-11 rounded-lg border-slate-100 bg-slate-50 font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-800 ml-1">Couleur Principale (Thème hex)</Label>
                <div className="flex gap-2">
                  <Input 
                    type="color"
                    value={localData.primaryColor || "#ea580c"}
                    onChange={(e) => setLocalData({ ...localData, primaryColor: e.target.value })}
                    className="h-11 w-14 rounded-lg cursor-pointer p-1 shrink-0"
                  />
                  <Input 
                    value={localData.primaryColor || "#ea580c"} 
                    onChange={(e) => setLocalData({ ...localData, primaryColor: e.target.value })}
                    className="h-11 rounded-lg border-slate-100 bg-slate-50 font-mono text-xs font-extrabold uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-50 pb-2">
                <ImageIcon className="h-4 w-4 text-purple-600" /> Logos Médias
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-800">Logo du Site (Rectangle/Carré)</Label>
                  <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center aspect-video overflow-hidden">
                    {localData.logoUrl ? (
                      <img src={localData.logoUrl} className="max-h-full object-contain" />
                    ) : (
                      <p className="text-[10px] font-bold text-slate-350 select-none">Pas de logo</p>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full h-9 rounded-lg font-black text-[10px] uppercase border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100 p-0"
                    onClick={() => document.getElementById('logo-upload-input')?.click()}
                  >
                    Uploader Logo
                  </Button>
                  <input 
                    id="logo-upload-input"
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleImageUpload(e, 'logoUrl')}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-800">Favicon / Icône (Carré)</Label>
                  <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center aspect-square max-w-[100px] mx-auto overflow-hidden">
                    {localData.iconUrl ? (
                      <img src={localData.iconUrl} className="max-h-full object-contain" />
                    ) : (
                      <p className="text-[10px] font-bold text-slate-350 select-none">Pas d'icône</p>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full h-9 rounded-lg font-black text-[10px] uppercase border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100 p-0"
                    onClick={() => document.getElementById('icon-upload-input')?.click()}
                  >
                    Uploader Favicon
                  </Button>
                  <input 
                    id="icon-upload-input"
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleImageUpload(e, 'iconUrl')}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'hero' && (
          <div className="space-y-6 max-w-2xl">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-50 pb-2">
              Bannière de garde & Slogan d'entête
            </h4>
            
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-800 ml-1">Grand Titre (Accroche principale) *</Label>
              <Input 
                value={localData.heroTitle || ""} 
                onChange={(e) => setLocalData({ ...localData, heroTitle: e.target.value })}
                placeholder="Ex: Trouvez le talent idéal qui boostera votre potentiel"
                className="h-11 rounded-lg border-slate-100 bg-slate-50 font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-850 ml-1">Sous-Titre descriptif *</Label>
              <Textarea 
                rows={3}
                value={localData.heroSubtitle || ""} 
                onChange={(e) => setLocalData({ ...localData, heroSubtitle: e.target.value })}
                placeholder="Ex: La plateforme de recrutement de premier ordre pour accélérer l'émergence des talents d'Afrique."
                className="rounded-lg border-slate-100 bg-slate-50 font-semibold text-xs leading-relaxed"
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h5 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5 pb-2">
                <ImageIcon className="h-4.5 w-4.5 text-orange-600" /> Options de fond d'écran & Visuel
              </h5>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Hero Background */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-800">Image de fond de l'accueil (Hero Background)</Label>
                  <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center h-44 overflow-hidden relative">
                    {localData.heroBgUrl ? (
                      <>
                        <img src={localData.heroBgUrl} className="max-h-full max-w-full object-cover rounded-lg" />
                        <Button 
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 rounded-lg"
                          type="button"
                          onClick={() => setLocalData((prev: any) => ({ ...prev, heroBgUrl: "" }))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <div className="text-center p-2">
                        <ImageIcon className="h-8 w-8 text-slate-300 mx-auto mb-1" />
                        <p className="text-[10px] font-bold text-slate-400">Aucun arrière-plan personnalisé</p>
                        <p className="text-[9px] text-slate-350 mt-0.5">Le fond dégradé par défaut de l'application sera utilisé.</p>
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    type="button"
                    className="w-full h-9 rounded-lg font-black text-[10px] uppercase border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    onClick={() => document.getElementById('hero-bg-upload-input')?.click()}
                  >
                    Uploader un arrière-plan
                  </Button>
                  <input 
                    id="hero-bg-upload-input"
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleImageUpload(e, 'heroBgUrl')}
                  />
                  <p className="text-[9px] text-slate-400 italic">Recommandation : Choisissez une image peu contrastée et sombre/floutée ou abstraite pour conserver la parfaite lisibilité des textes noirs en premier plan.</p>
                </div>

                {/* Hero Visual (Right side Mockup helper/replacement) */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-800">Visuel principal de droite (Illustration/Remplacer Dashboard)</Label>
                  <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center h-44 overflow-hidden relative">
                    {localData.heroVisualUrl ? (
                      <>
                        <img src={localData.heroVisualUrl} className="max-h-full max-w-full object-cover rounded-lg" />
                        <Button 
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 rounded-lg"
                          type="button"
                          onClick={() => setLocalData((prev: any) => ({ ...prev, heroVisualUrl: "" }))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <div className="text-center p-2">
                        <ImageIcon className="h-8 w-8 text-slate-300 mx-auto mb-1" />
                        <p className="text-[10px] font-bold text-slate-400">Tableau de bord par défaut (Mockup)</p>
                        <p className="text-[9px] text-slate-350 mt-0.5">L'illustration animée interactive de droite s'affichera par défaut.</p>
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    type="button"
                    className="w-full h-9 rounded-lg font-black text-[10px] uppercase border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    onClick={() => document.getElementById('hero-visual-upload-input')?.click()}
                  >
                    Uploader un visuel de remplacement
                  </Button>
                  <input 
                    id="hero-visual-upload-input"
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleImageUpload(e, 'heroVisualUrl')}
                  />
                  <p className="text-[9px] text-slate-400 italic">Recommandation : Une belle image Corporate, Bureau, ou Equipe professionnelle qui incarne le recrutement et l'Afrique ouest.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'founder' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-2">
                Fiche d'identité
              </h4>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-800 ml-1">Nom complet du Fondateur</Label>
                <Input 
                  value={localData.founderName || ""} 
                  onChange={(e) => setLocalData({ ...localData, founderName: e.target.value })}
                  placeholder="Ex: Jean-Louis Traoré"
                  className="h-11 rounded-lg border-slate-100 bg-slate-50 font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-800 ml-1">Slogan ou Titre / Rôle du Fondateur</Label>
                <Input 
                  value={localData.founderTitle || ""} 
                  onChange={(e) => setLocalData({ ...localData, founderTitle: e.target.value })}
                  placeholder="Ex: Fondateur & Visionnaire, 2NG Groupe"
                  className="h-11 rounded-lg border-slate-100 bg-slate-50 font-semibold"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-800">Photo Officielle (Upload)</Label>
                <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center h-44 max-w-[176px] overflow-hidden">
                  {localData.founderPhotoUrl ? (
                    <img src={localData.founderPhotoUrl} className="max-h-full max-w-full object-cover rounded-lg" />
                  ) : (
                    <p className="text-[10px] font-bold text-slate-350 select-none">Pas de photo chargée</p>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  className="h-9 px-4 rounded-lg font-black text-[10px] uppercase border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  onClick={() => document.getElementById('founder-upload-input')?.click()}
                >
                  Sélectionner Photo
                </Button>
                <input 
                  id="founder-upload-input"
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handleImageUpload(e, 'founderPhotoUrl')}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-2">
                Mot d'accueil & Vision stratégique
              </h4>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-800">Texte / Discours rédigé du dirigeant</Label>
                <Textarea 
                  rows={6}
                  value={localData.founderVision || ""} 
                  onChange={(e) => setLocalData({ ...localData, founderVision: e.target.value })}
                  placeholder="Rédigez le texte d'accueil qui sera affiché en première page publique..."
                  className="rounded-lg border-slate-100 bg-slate-50 font-semibold text-xs leading-relaxed"
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h5 className="text-[10px] font-black uppercase text-slate-900 tracking-wider">
                  Attributs Spécifiques (Leadership)
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-800">Fonction du dirigeant</Label>
                    <Input 
                      value={localData.founderFonction || ""} 
                      onChange={(e) => setLocalData({ ...localData, founderFonction: e.target.value })}
                      placeholder="Ex: Formateur, Enseignant supérieur"
                      className="h-10 rounded-lg border-slate-100 bg-slate-50 font-semibold text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-800">Spécialisation</Label>
                    <Input 
                      value={localData.founderSpecialisation || ""} 
                      onChange={(e) => setLocalData({ ...localData, founderSpecialisation: e.target.value })}
                      placeholder="Ex: Ingénieur électromécanique, Consultant"
                      className="h-10 rounded-lg border-slate-100 bg-slate-50 font-semibold text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-800">Poste exact / Titre</Label>
                    <Input 
                      value={localData.founderPoste || ""} 
                      onChange={(e) => setLocalData({ ...localData, founderPoste: e.target.value })}
                      placeholder="Ex: Directeur Général"
                      className="h-10 rounded-lg border-slate-100 bg-slate-50 font-semibold text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-800">Biographie courte / Parcours</Label>
                    <Textarea 
                      rows={4}
                      value={localData.founderBio || ""} 
                      onChange={(e) => setLocalData({ ...localData, founderBio: e.target.value })}
                      placeholder="Biographie courte ou parcours clé du dirigeant..."
                      className="rounded-lg border-slate-100 bg-slate-50 font-semibold text-xs leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'banner' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-orange-600" />
                Configuration de la Bannière Promotionnelle
              </h4>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => setLocalData({ ...localData, bannerEnabled: !localData.bannerEnabled })}
                  className={`h-9 px-4 rounded-xl text-xs font-black uppercase transition-all ${
                    localData.bannerEnabled 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/10' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {localData.bannerEnabled ? "● Activée" : "○ Désactivée"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Content & Colors */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase text-slate-800">Contenu de la Bannière (Soutient le code HTML/Balises ou Texte Brut)</Label>
                  <Textarea 
                    rows={4}
                    value={localData.bannerContent || ""} 
                    onChange={(e) => setLocalData({ ...localData, bannerContent: e.target.value })}
                    placeholder="Ex: 🌟 Offre Spéciale 2NG : &lt;strong&gt;Profitez de -20%&lt;/strong&gt; sur tous nos recrutements Élite cette semaine ! &lt;a href='/opportunites' class='underline font-bold text-yellow-350 ml-1'&gt;Découvrir →&lt;/a&gt;"
                    className="rounded-lg border-slate-150 bg-slate-50 font-medium text-xs leading-relaxed"
                  />
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Vous pouvez insérer du texte simple ou coder avec des balises HTML comme <code>&lt;strong&gt;</code> pour mettre en gras, ou <code>&lt;a href="..." class="underline"&gt;</code> pour insérer un bouton de redirection ou de contact cliquable.
                  </p>
                </div>

                <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Style visuel & Arrière-plan</h5>
                  
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-700">Type d'arrière-plan de la bannière</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() => setLocalData({ ...localData, bannerBgType: 'color' })}
                        className={`flex-1 h-9 rounded-lg text-xs font-bold ${
                          localData.bannerBgType !== 'image' 
                            ? 'bg-slate-900 text-white' 
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                      >
                        Couleur unie / Dégradé
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setLocalData({ ...localData, bannerBgType: 'image' })}
                        className={`flex-1 h-9 rounded-lg text-xs font-bold ${
                          localData.bannerBgType === 'image' 
                            ? 'bg-slate-900 text-white' 
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                      >
                        Images Rollover (Diaporama)
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-700">Couleur d'arrière-plan</Label>
                      <div className="flex gap-1.5">
                        <Input 
                          type="color"
                          value={localData.bannerBgColor || "#ea580c"}
                          onChange={(e) => setLocalData({ ...localData, bannerBgColor: e.target.value })}
                          className="h-10 w-11 rounded-lg cursor-pointer p-0.5 shrink-0"
                        />
                        <Input 
                          value={localData.bannerBgColor || "#ea580c"} 
                          onChange={(e) => setLocalData({ ...localData, bannerBgColor: e.target.value })}
                          className="h-10 rounded-lg border-slate-200 bg-white font-mono text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-700">Couleur du texte</Label>
                      <div className="flex gap-1.5">
                        <Input 
                          type="color"
                          value={localData.bannerTextColor || "#ffffff"}
                          onChange={(e) => setLocalData({ ...localData, bannerTextColor: e.target.value })}
                          className="h-10 w-11 rounded-lg cursor-pointer p-0.5 shrink-0"
                        />
                        <Input 
                          value={localData.bannerTextColor || "#ffffff"} 
                          onChange={(e) => setLocalData({ ...localData, bannerTextColor: e.target.value })}
                          className="h-10 rounded-lg border-slate-200 bg-white font-mono text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {localData.bannerBgType === 'image' && (
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <Label className="text-[10px] font-black uppercase text-slate-700">Intervalle de transition automatique (ms)</Label>
                      <Input 
                        type="number"
                        min={1000}
                        step={500}
                        value={localData.bannerAutoChangeInterval || 5000}
                        onChange={(e) => setLocalData({ ...localData, bannerAutoChangeInterval: parseInt(e.target.value) || 5000 })}
                        className="h-10 rounded-lg bg-white border-slate-200 font-bold text-xs"
                        placeholder="Ex: 5000"
                      />
                      <p className="text-[9px] text-slate-400 italic">Temps d'affichage de chaque image d'arrière-plan avant le défilement automatique (1000 ms = 1 seconde).</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Rollover Background Images Management */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                    <ImageIcon className="h-4.5 w-4.5 text-purple-600" />
                    Images d'Arrière-plan Rollover ({localData.bannerImages?.length || 0})
                  </h5>
                  
                  <div className="relative">
                    <Button
                      type="button"
                      onClick={() => document.getElementById('banner-bg-uploader')?.click()}
                      className="h-8 px-3 rounded-lg bg-orange-600 text-white font-black text-[10px] uppercase hover:bg-orange-700 shadow-sm flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Ajouter une Image
                    </Button>
                    <input
                      id="banner-bg-uploader"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          const uploadsArr = Array.from(files).map((file: any) => uploadImageToStorage(file, 'cms/banners'));
                          Promise.all(uploadsArr).then(results => {
                            const existing = localData.bannerImages || [];
                            setLocalData({
                              ...localData,
                              bannerImages: [...existing, ...results]
                            });
                          });
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="border border-slate-100 bg-slate-50/50 p-4 rounded-2xl min-h-[220px] max-h-[380px] overflow-y-auto space-y-3">
                  {localData.bannerImages && localData.bannerImages.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {localData.bannerImages.map((imgUrl: string, idx: number) => (
                        <div key={idx} className="relative group bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col gap-2 shadow-sm">
                          <span className="absolute top-1.5 left-1.5 bg-black/75 backdrop-blur-sm text-white font-extrabold text-[9px] px-2 py-0.5 rounded-md z-10">
                            {idx === 0 ? "Image Principale (Rollover 1)" : `Image n°${idx + 1} (Rollover ${idx + 1})`}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (localData.bannerImages || []).filter((_: any, i: number) => i !== idx);
                              setLocalData({ ...localData, bannerImages: updated });
                            }}
                            className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-700 text-white p-1 rounded-md transition-colors z-10"
                            title="Supprimer cette image"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <div className="h-28 rounded-lg overflow-hidden bg-slate-100 border border-slate-100 flex items-center justify-center">
                            <img src={imgUrl} className="h-full w-full object-cover" alt={`Rollover ${idx}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center space-y-2 select-none">
                      <ImageIcon className="h-10 w-10 text-slate-300" />
                      <div>
                        <p className="text-xs font-bold text-slate-700">Aucune image d'arrière-plan rollover</p>
                        <p className="text-[10px] text-slate-400 max-w-xs mt-1">
                          Si aucune image n'est ajoutée, la bannière utilisera la couleur d'arrière-plan choisie à gauche. Importez au moins deux images pour voir le changement automatique du fond !
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-orange-50/70 p-4 rounded-xl border border-orange-100 text-[10px] text-orange-800 font-semibold space-y-1 leading-normal text-left">
                  <p className="font-bold flex items-center gap-1 uppercase tracking-wide text-[10px] text-orange-900 mb-1">
                    💡 Fonctionnement du Rollover et d'Arrière-plan
                  </p>
                  <ul className="list-disc pl-3.5 space-y-1">
                    <li>Si vous sélectionnez un mode d'arrière-plan <strong>"Images Rollover"</strong>, le système affiche les visuels importés en arrière-plan.</li>
                    <li>S'il y a <strong>plusieurs images</strong>, le fond changera automatiquement à intervalle régulier avec une transition en fondu esthétique.</li>
                    <li>S'il n'y a <strong>aucune image</strong> (ou si elles sont toutes supprimées), l'image est retirée de l'arrière-plan et le fond basculera proprement sur la couleur de marque.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'testimonials' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Add form */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-2">
                  Ajouter un témoignage
                </h4>
                
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-800">Nom Complet Soumettant *</Label>
                  <Input 
                    placeholder="Ex: Sali Diallo" 
                    value={testimName} 
                    onChange={(e) => setTestimName(e.target.value)}
                    className="h-11 rounded-lg border-slate-100 bg-slate-50 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-800">Job ou Responsabilité</Label>
                  <Input 
                    placeholder="Ex: Directrice RH chez Orange CI" 
                    value={testimRole} 
                    onChange={(e) => setTestimRole(e.target.value)}
                    className="h-11 rounded-lg border-slate-100 bg-slate-50 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-800">Note ou Témoignage *</Label>
                  <Textarea 
                    rows={3}
                    placeholder="Ex: Grâce à l'annuaire de 2NG, nous avons sourcé et recruté 5 experts techniques en moins de 48h ! Une plateforme extrêmement performante." 
                    value={testimQuote} 
                    onChange={(e) => setTestimQuote(e.target.value)}
                    className="rounded-lg border-slate-100 bg-slate-50 font-semibold text-xs leading-relaxed"
                  />
                </div>

                <Button 
                  type="button"
                  className="h-11 rounded-lg bg-orange-600 text-white text-xs font-black uppercase tracking-wider w-full hover:bg-orange-700 shadow-xl shadow-orange-600/10"
                  onClick={handleAddTestimonial}
                >
                  Insérer dans le Carrousel
                </Button>
              </div>

              {/* Slider lists preview */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-2">
                  Éléments Actifs du Carrousel ({localData.testimonials?.length || 0})
                </h4>
                <div className="space-y-3 max-h-[350px] overflow-y-auto">
                  {localData.testimonials && localData.testimonials.length > 0 ? (
                    localData.testimonials.map((t: any, idx: number) => (
                      <div key={t.id || idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-900 leading-none">{t.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{t.role}</p>
                          <p className="text-[11px] text-slate-600 font-semibold leading-relaxed mt-1.5 italic">"{t.quote}"</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteTestimonial(t.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs font-semibold text-slate-400 text-center py-10 select-none">Aucun témoignage client actif dans le slider d'accueil.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'jobs_banner' && (
          <div className="space-y-10">
            {/* 1. TOP JOBS PAGE BANNER SECTION */}
            <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/50 pb-4 gap-4">
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-orange-600" />
                    Bannière de l'Espace des Offres (œuvres)
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-400 mt-1">
                    Gérez la bannière principale apparaissant tout en haut de la page des offres d'emploi publiques.
                  </p>
                </div>
                <div>
                  <Button
                    type="button"
                    onClick={() => setLocalData({ ...localData, jobsBannerEnabled: !localData.jobsBannerEnabled })}
                    className={`h-9 px-4 rounded-xl text-xs font-black uppercase transition-all ${
                      localData.jobsBannerEnabled 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/10' 
                        : 'bg-slate-250 hover:bg-slate-300 text-slate-700'
                    }`}
                  >
                    {localData.jobsBannerEnabled ? "● Activée" : "○ Désactivée"}
                  </Button>
                </div>
              </div>

              {localData.jobsBannerEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left block: interval slider setting */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-700">Intervalle du diaporama automatique (ms)</Label>
                      <Input 
                        type="number"
                        min={1000}
                        step={500}
                        value={localData.jobsBannerInterval || 5000}
                        onChange={(e) => setLocalData({ ...localData, jobsBannerInterval: parseInt(e.target.value) || 5000 })}
                        className="h-10 rounded-lg bg-white border-slate-200 font-bold text-xs"
                        placeholder="Ex: 5000"
                      />
                      <p className="text-[10px] text-slate-400 font-medium">Temps d'affichage de chaque image avant la rotation (1000 ms = 1 seconde).</p>
                    </div>

                    <div className="bg-white border border-slate-200 p-5 rounded-2xl">
                      <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider mb-2">Instructions d'affichage</h5>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                        Ajoutez plusieurs images pour former une liste d'images déroulantes de manière fluide. Les dimensions idéales pour cette bannière d'en-tête sont de <strong className="text-slate-800">1200 x 300 pixels</strong> (paysage).
                      </p>
                    </div>
                  </div>

                  {/* Right block: jobsBannerImages uploader */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                        <ImageIcon className="h-4 w-4 text-purple-600" />
                        Images de la Bannière ({localData.jobsBannerImages?.length || 0})
                      </h5>
                      <div>
                        <Button
                          type="button"
                          onClick={() => document.getElementById('jobs-banner-uploader')?.click()}
                          className="h-8 px-3 rounded-lg bg-orange-600 text-white font-black text-[10px] uppercase hover:bg-orange-700 shadow-sm flex items-center gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Ajouter
                        </Button>
                        <input
                          id="jobs-banner-uploader"
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files && files.length > 0) {
                              const uploadsArr = Array.from(files).map((file: any) => uploadImageToStorage(file, 'cms/jobs_banners'));
                              Promise.all(uploadsArr).then(results => {
                                const existing = localData.jobsBannerImages || [];
                                setLocalData({
                                  ...localData,
                                  jobsBannerImages: [...existing, ...results]
                                });
                              });
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="bg-white border border-slate-250 p-4 rounded-2xl min-h-[160px] max-h-[300px] overflow-y-auto">
                      {localData.jobsBannerImages && localData.jobsBannerImages.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {localData.jobsBannerImages.map((imgUrl: string, idx: number) => (
                            <div key={idx} className="relative group bg-slate-50 border border-slate-100 rounded-xl p-1.5 flex flex-col gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (localData.jobsBannerImages || []).filter((_: any, i: number) => i !== idx);
                                  setLocalData({ ...localData, jobsBannerImages: updated });
                                }}
                                className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-md transition-colors z-10"
                                title="Supprimer cette image"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                              <div className="h-20 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                                <img src={imgUrl} className="h-full w-full object-cover" alt={`Offre Banner ${idx}`} />
                              </div>
                              <span className="text-[9px] text-center font-bold text-slate-500">Image {idx + 1}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-10 text-slate-400">
                          <ImageIcon className="h-8 w-8 text-slate-300 mx-auto mb-1" />
                          <p className="text-[10px] font-bold">Aucune image configurée.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. IN-BETWEEN LIST BANNER SECTION */}
            <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/50 pb-4 gap-4">
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-orange-600" />
                    Bannière Interne (Entre deux albums / offres)
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-400 mt-1">
                    Configurez l'apparition d'un encart publicitaire ou décoratif déroulant directement entre les fiches d'offres d'emploi.
                  </p>
                </div>
                <div>
                  <Button
                    type="button"
                    onClick={() => setLocalData({ ...localData, jobsInBetweenBannersEnabled: !localData.jobsInBetweenBannersEnabled })}
                    className={`h-9 px-4 rounded-xl text-xs font-black uppercase transition-all ${
                      localData.jobsInBetweenBannersEnabled 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/10' 
                        : 'bg-slate-250 hover:bg-slate-300 text-slate-700'
                    }`}
                  >
                    {localData.jobsInBetweenBannersEnabled ? "● Activée" : "○ Désactiveé"}
                  </Button>
                </div>
              </div>

              {localData.jobsInBetweenBannersEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left block: settings */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-slate-700">Fréquence d'apparition</Label>
                        <select
                          value={localData.jobsInBetweenFrequency || 3}
                          onChange={(e) => setLocalData({ ...localData, jobsInBetweenFrequency: parseInt(e.target.value) || 3 })}
                          className="w-full h-10 rounded-lg border-slate-200 bg-white font-bold text-xs px-3 focus:ring-1 focus:ring-orange-500"
                        >
                          <option value={1}>Toutes les 1 offres</option>
                          <option value={2}>Toutes les 2 offres</option>
                          <option value={3}>Toutes les 3 offres (Recommandé)</option>
                          <option value={4}>Toutes les 4 offres</option>
                          <option value={5}>Toutes les 5 offres</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-slate-700">Intervalle de transition (ms)</Label>
                        <Input 
                          type="number"
                          min={1000}
                          step={500}
                          value={localData.jobsInBetweenBannersInterval || 5000}
                          onChange={(e) => setLocalData({ ...localData, jobsInBetweenBannersInterval: parseInt(e.target.value) || 5000 })}
                          className="h-10 rounded-lg bg-white border-slate-200 font-bold text-xs"
                          placeholder="Ex: 5000"
                        />
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 p-5 rounded-2xl">
                      <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider mb-2">Notice d'utilisation</h5>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                        Cette section insère une carte élégante au milieu des colonnes des offres, contenant un diaporama de vos bannières publicitaires téléversées. Des bannières au ratio <strong className="text-slate-850">800 x 200 pixels</strong> donneront un rendu optimal.
                      </p>
                    </div>
                  </div>

                  {/* Right block: images list */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                        <ImageIcon className="h-4 w-4 text-purple-600" />
                        Images Rollover ({localData.jobsInBetweenBannersImages?.length || 0})
                      </h5>
                      <div>
                        <Button
                          type="button"
                          onClick={() => document.getElementById('jobs-between-uploader')?.click()}
                          className="h-8 px-3 rounded-lg bg-orange-600 text-white font-black text-[10px] uppercase hover:bg-orange-700 shadow-sm flex items-center gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Ajouter
                        </Button>
                        <input
                          id="jobs-between-uploader"
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files && files.length > 0) {
                              const uploadsArr = Array.from(files).map((file: any) => uploadImageToStorage(file, 'cms/jobs_between_banners'));
                              Promise.all(uploadsArr).then(results => {
                                const existing = localData.jobsInBetweenBannersImages || [];
                                setLocalData({
                                  ...localData,
                                  jobsInBetweenBannersImages: [...existing, ...results]
                                });
                              });
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="bg-white border border-slate-250 p-4 rounded-2xl min-h-[160px] max-h-[300px] overflow-y-auto">
                      {localData.jobsInBetweenBannersImages && localData.jobsInBetweenBannersImages.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {localData.jobsInBetweenBannersImages.map((imgUrl: string, idx: number) => (
                            <div key={idx} className="relative group bg-slate-50 border border-slate-100 rounded-xl p-1.5 flex flex-col gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (localData.jobsInBetweenBannersImages || []).filter((_: any, i: number) => i !== idx);
                                  setLocalData({ ...localData, jobsInBetweenBannersImages: updated });
                                }}
                                className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-md transition-colors z-10"
                                title="Supprimer cette image"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                              <div className="h-20 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                                <img src={imgUrl} className="h-full w-full object-cover" alt={`Between Banner ${idx}`} />
                              </div>
                              <span className="text-[9px] text-center font-bold text-slate-500">Image {idx + 1}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-10 text-slate-400">
                          <ImageIcon className="h-8 w-8 text-slate-300 mx-auto mb-1" />
                          <p className="text-[10px] font-bold">Aucune image configurée.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
