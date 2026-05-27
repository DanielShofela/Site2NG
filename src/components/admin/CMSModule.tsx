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
  ArrowRight
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface CMSProps {
  currentData: any;
  onSave: (newData: any) => void;
}

export default function CMSModule({ currentData, onSave }: CMSProps) {
  const [localData, setLocalData] = useState<any>(currentData || {});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'branding' | 'hero' | 'founder' | 'testimonials'>('branding');

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
      const configRef = doc(db, 'site_config', 'home');
      await setDoc(configRef, localData);
      onSave(localData);
      alert("La configuration globale du CMS a été mise à jour en direct ! Les visiteurs verront immédiatement ces modifications.");
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'enregistrement de la configuration.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalData({ ...localData, [field]: reader.result as string });
      };
      reader.readAsDataURL(file);
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
        {(['branding', 'hero', 'founder', 'testimonials'] as const).map((tab) => (
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
            {tab === 'testimonials' && 'Carrousel Témoignages'}
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
              <Label className="text-[10px] font-black uppercase text-slate-800">Texte / Discours rédigé du dirigeant</Label>
              <Textarea 
                rows={9}
                value={localData.founderVision || ""} 
                onChange={(e) => setLocalData({ ...localData, founderVision: e.target.value })}
                placeholder="Rédigez le texte d'accueil qui sera affiché en première page publique..."
                className="rounded-lg border-slate-100 bg-slate-50 font-semibold text-xs leading-relaxed"
              />
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
      </CardContent>
    </Card>
  );
}
