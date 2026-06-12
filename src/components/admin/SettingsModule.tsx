import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Settings, 
  Shield, 
  Lock, 
  HelpCircle, 
  Mail, 
  Building,
  Key
} from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SettingsProps {
  addLog?: (action: string, target: string, type: string) => Promise<void>;
}

export default function SettingsModule({ addLog }: SettingsProps) {
  const [supportEmail, setSupportEmail] = useState("support@2ngentreprises.com");
  const [supportPhone, setSupportPhone] = useState("+225 05 40 50 47 90");
  const [registrationsOpen, setRegistrationsOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.supportEmail) setSupportEmail(data.supportEmail);
          if (data.supportPhone) setSupportPhone(data.supportPhone);
          if (data.registrationsOpen !== undefined) setRegistrationsOpen(data.registrationsOpen);
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des paramètres :", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Firestore integration
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), {
        supportEmail,
        supportPhone,
        registrationsOpen,
        updatedAt: new Date()
      });
      if (addLog) {
        await addLog("Paramètres sauvegardés", "Mise à jour des coordonnées support", "info");
      }
      alert("Paramètres d'entreprise sauvegardés avec succès !");
    } catch (e) {
      console.error(e);
      alert("Erreur d'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white max-w-2xl">
      <CardHeader className="p-6 md:p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-orange-600" />
            Configuration des Services Généraux
          </CardTitle>
          <CardDescription className="text-xs font-semibold text-slate-400 mt-1">Gérez les coordonnées d'assistance de 2NG Groupe ou ajustez les accès régulateurs.</CardDescription>
        </div>
        <Button 
          onClick={handleSaveSettings}
          disabled={saving}
          className="h-11 rounded-xl bg-orange-600 font-black text-xs text-white uppercase px-6 hover:bg-orange-700 shadow-xl shadow-orange-600/15"
        >
          {saving ? "Sauvegarde..." : "Enregistrer"}
        </Button>
      </CardHeader>

      <CardContent className="p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase text-slate-800">Email d'Assistance Public *</Label>
            <Input 
              value={supportEmail} 
              onChange={(e) => setSupportEmail(e.target.value)}
              className="h-11 rounded-lg border-slate-100 bg-slate-50 font-semibold"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase text-slate-800 font-sans">Téléphone d'Assistance *</Label>
            <Input 
              value={supportPhone} 
              onChange={(e) => setSupportPhone(e.target.value)}
              className="h-11 rounded-lg border-slate-100 bg-slate-50 font-semibold"
            />
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-slate-800 uppercase">Ouverture des inscriptions publiques</p>
            <p className="text-[10px] text-slate-400 font-bold mt-1">
              {registrationsOpen ? "Autoriser les nouveaux adhérents à soumettre des formulaires" : "Verrouiller temporairement la signature de contrats"}
            </p>
          </div>

          <Button 
            className={`h-9 text-[10px] font-black uppercase rounded-lg px-4 ${
              registrationsOpen ? 'bg-orange-600 text-white' : 'bg-slate-950 text-white'
            }`}
            onClick={() => setRegistrationsOpen(!registrationsOpen)}
          >
            {registrationsOpen ? "Inscriptions Ouvertes" : "Dossier Fermé"}
          </Button>
        </div>

        {/* Security / Admin Panel notes */}
        <div className="p-4 bg-orange-50/20 border border-orange-100 rounded-2xl space-y-2">
          <p className="text-xs font-black text-slate-800 uppercase flex items-center gap-1">
            <Shield className="h-4.5 w-4.5 text-orange-600" />
            Sécurité SSL & Secrets
          </p>
          <p className="text-xs text-slate-600 leading-relaxed font-semibold">
            Vos variables d'environnement (comme les clés Firebase et clés Gemini API) sont gérées de manière invisible et chiffrée par le framework d'exécution Cloud. Ne divulguez jamais vos clés secrètes dans l'éditeur de fichiers.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
