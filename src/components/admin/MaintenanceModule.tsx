import React, { useState, useEffect } from 'react';
import { safeSetItem } from '@/lib/safeStorage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  Check, 
  ShieldAlert, 
  Clock, 
  Cpu, 
  Key,
  Database,
  Eye,
  Settings
} from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface MaintenanceProps {
  addLog?: (action: string, target: string, type: string) => Promise<void>;
}

export default function MaintenanceModule({ addLog }: MaintenanceProps) {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [isBypassed, setIsBypassed] = useState(false);

  useEffect(() => {
    // Check local bypass
    const bypass = localStorage.getItem('bypass_maintenance');
    setIsBypassed(bypass === 'true');

    // Subscribe to current configuration
    const unsub = onSnapshot(doc(db, 'maintenance', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setEnabled(!!data.enabled);
        setMessage(data.message || "");
      }
    }, (error) => {
      console.error(error);
    });

    return () => unsub();
  }, []);

  const handleUpdateMaintenance = async (nextState: boolean) => {
    setSaving(true);
    try {
      const configRef = doc(db, 'maintenance', 'config');
      const textToUse = message.trim() || "La plateforme 2NG fait peau neuve afin d'optimiser l'expérience. Nous revenons dans quelques minutes.";
      await setDoc(configRef, {
        enabled: nextState,
        message: textToUse,
        updatedAt: new Date()
      });

      setEnabled(nextState);
      if (addLog) {
        await addLog("Maintenance statut modifié", `Maintenance configuré à : ${nextState ? 'ACTIF' : 'INACTIF'}`, "warning");
      }
      alert(`Mode Maintenance configuré avec succès ! Statut actuel : ${nextState ? 'ACTIVÉ (Site public bloqué)' : 'DÉSACTIVÉ (Site public en ligne)'}`);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la mise à jour de la maintenance.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBypass = () => {
    const nextBypass = !isBypassed;
    safeSetItem('bypass_maintenance', nextBypass ? 'true' : 'false');
    setIsBypassed(nextBypass);
    alert(nextBypass 
      ? "Clé de contournement temporaire activée dans votre navigateur ! Vous pourrez naviguer sur la plateforme même si le mode maintenance est actif."
      : "Contournement désactivé. Vous serez soumis aux restrictions de maintenance ordinaires."
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Real switch controller */}
      <Card className="border-none shadow-sm rounded-[32px] p-6 md:p-8 bg-white flex flex-col justify-between">
        <div>
          <CardHeader className="p-0 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className={`h-3 w-3 rounded-full ${enabled ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
              <CardTitle className="text-base font-black text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Contrôle du Statut Réel
              </CardTitle>
            </div>
            <CardDescription className="text-xs">Activez ou désactivez l'écran de restriction générale pour les visiteurs publics.</CardDescription>
          </CardHeader>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <div>
                <p className="text-xs font-black text-slate-800 uppercase">Verrouillage Général (Maintenance)</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">
                  {enabled ? "Statut : ACTIVÉ (Visiteurs déroutés)" : "Statut : INACTIF (Plateforme publique)"}
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  disabled={saving || !enabled}
                  className="h-10 text-xs font-black uppercase rounded-lg border border-slate-100 bg-white hover:bg-slate-100 text-slate-800"
                  onClick={() => handleUpdateMaintenance(false)}
                >
                  Couper restriction
                </Button>
                <Button 
                  disabled={saving || enabled}
                  className="h-10 text-xs font-black uppercase rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/10"
                  onClick={() => handleUpdateMaintenance(true)}
                >
                  Activer
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-800">Texte d'explication publique</Label>
              <Textarea 
                rows={3}
                placeholder="Rédigez la raison ou la durée indicative..." 
                value={message} 
                onChange={(e) => setMessage(e.target.value)}
                className="rounded-lg border-slate-100 bg-slate-50 font-semibold text-xs leading-relaxed"
                disabled={saving}
              />
              <Button 
                onClick={() => handleUpdateMaintenance(enabled)}
                disabled={saving}
                className="h-9 px-4 rounded-lg bg-slate-900 text-white font-black hover:bg-slate-800 text-[10px] uppercase. mt-2"
              >
                Actualiser Message
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-50 pt-5 mt-6">
          <p className="text-[10px] font-bold text-slate-400 italic">Configurez les restrictions directement. La modification impacte Google Firestore instantanément de manière synchrone.</p>
        </div>
      </Card>

      {/* Bypass / Dev Help card */}
      <Card className="border-none shadow-sm rounded-[32px] p-6 md:p-8 bg-white flex flex-col justify-between">
        <div>
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-base font-black text-slate-900 flex items-center gap-1.5">
              <Key className="h-5 w-5 text-orange-600" />
              Accès Spécial Administrateur
            </CardTitle>
            <CardDescription className="text-xs">Contournez l'écran de restriction ou générez un jeton de cookies de session.</CardDescription>
          </CardHeader>

          <div className="space-y-5">
            <div className="p-4 bg-orange-50/20 border-2 border-dashed border-orange-100/50 rounded-2xl">
              <p className="text-xs font-black text-slate-800 uppercase flex items-center gap-1">
                <Cpu className="h-4 w-4 text-orange-600" />
                Instructions de Contournement
              </p>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold mt-2">
                Pour éviter d'être bloqué par le mode maintenance que vous activez vous-même, vous pouvez injecter une autorisation locale dans le stockage de votre navigateur. Ce dispositif simule le profil d'accès administrateur de contournement.
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <div>
                <p className="text-xs font-black text-slate-850 uppercase">Session Privilège</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">
                  {isBypassed ? "Autorisé temporairement" : "Non configuré"}
                </p>
              </div>

              <Button 
                onClick={handleToggleBypass}
                className={`h-10 text-xs font-black uppercase rounded-lg ${
                  isBypassed ? 'bg-orange-600 text-white' : 'bg-slate-950 text-white hover:bg-slate-800'
                }`}
              >
                {isBypassed ? "Bétonner bypass (Couper)" : "Bypass maintenant"}
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-50 pt-5 mt-6">
          <p className="text-[10px] font-bold text-slate-400 italic">Seul votre navigateur actuel profitera de ce contournement. Les visiteurs extérieurs généraux feront face à la page d'interruption.</p>
        </div>
      </Card>
    </div>
  );
}
