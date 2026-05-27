import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  Send, 
  Trash2, 
  Check, 
  ShieldAlert, 
  Plus, 
  Clock,
  Volume2
} from 'lucide-react';
import { collection, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface NotificationsModuleProps {
  logs?: any[];
  pendingRecruiters?: any[];
  applications?: any[];
}

export default function NotificationsModule({ logs, pendingRecruiters, applications }: NotificationsModuleProps) {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNoticeTitle, setNewNoticeTitle] = useState("");
  const [newNoticeBody, setNewNoticeBody] = useState("");
  const [targetAudience, setTargetAudience] = useState("all"); // all, recruiter, candidate
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'system_notifications'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotices(items.sort((a: any, b: any) => {
        const tA = a.createdAt?.seconds ? a.createdAt.seconds : 0;
        const tB = b.createdAt?.seconds ? b.createdAt.seconds : 0;
        return tB - tA;
      }));
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleBroadcastNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeTitle.trim() || !newNoticeBody.trim()) {
      alert("Veuillez remplir le titre et le corps de l'alerte broad.");
      return;
    }

    setSending(true);
    try {
      const payload = {
        title: newNoticeTitle,
        content: newNoticeBody,
        target: targetAudience,
        createdAt: new Date(),
        active: true
      };

      await addDoc(collection(db, 'system_notifications'), payload);
      alert("Avis administratif diffusé à l'ensemble de l'auditoire ciblé !");
      setNewNoticeTitle("");
      setNewNoticeBody("");
    } catch (e) {
      console.error(e);
      alert("Erreur de transmission.");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm("Voulez-vous révoquer et détruire cet avis système ?")) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'system_notifications', id));
      alert("Avis système détruit.");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Broadcast Form */}
      <Card className="border-none shadow-sm rounded-[32px] p-6 md:p-8 bg-white lg:col-span-1">
        <CardHeader className="p-0 mb-6">
          <CardTitle className="text-base font-black text-slate-900 flex items-center gap-1.5">
            <Volume2 className="h-5 w-5 text-orange-600" />
            Créer Avis Système
          </CardTitle>
          <CardDescription className="text-xs">Rédigez un bulletin ou avertissement important pour les utilisateurs du site.</CardDescription>
        </CardHeader>

        <form onSubmit={handleBroadcastNotice} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase text-slate-800">Cibler l'audience</Label>
            <select 
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-100 bg-slate-50 text-xs font-black uppercase text-slate-600 outline-none"
            >
              <option value="all">Diffuser à Tous (Adhérents)</option>
              <option value="recruiter">Uniquement aux Recruteurs</option>
              <option value="candidate">Uniquement aux Candidats</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase text-slate-800">Titre de l'avis *</Label>
            <Input 
              required
              placeholder="Ex: Mise à jour juridique des CGU" 
              value={newNoticeTitle} 
              onChange={(e) => setNewNoticeTitle(e.target.value)}
              className="h-10 rounded-lg text-xs font-bold border-slate-100 bg-slate-50"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase text-slate-800">Message / Corps du bulletin *</Label>
            <textarea 
              required
              rows={4}
              placeholder="Saisissez des détails clairs sur l'avis de maintenance générale, règles de dépôts de formulaires, etc..." 
              value={newNoticeBody} 
              onChange={(e) => setNewNoticeBody(e.target.value)}
              className="w-full p-3.5 rounded-lg border border-slate-100 bg-slate-50 text-xs font-semibold outline-none focus:border-orange-500"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-orange-600/10 flex items-center justify-center gap-1"
            disabled={sending}
          >
            <Send className="h-4 w-4" />
            {sending ? "Diffusion..." : "Diffuser l'Avis"}
          </Button>
        </form>
      </Card>

      {/* Broadcast History lists */}
      <Card className="border-none shadow-sm rounded-[32px] p-6 md:p-8 bg-white lg:col-span-2">
        <CardHeader className="p-0 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-black text-slate-900 flex items-center gap-1.5">
              <Bell className="h-5 w-5 text-purple-600" />
              Diffusion Administrative Actuelle
            </CardTitle>
            <CardDescription className="text-xs">Avis système en diffusion active sur la plateforme.</CardDescription>
          </div>
        </CardHeader>

        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {loading ? (
            <p className="text-xs text-slate-400 font-bold text-center py-20">Synchronisation...</p>
          ) : notices.length > 0 ? (
            notices.map((notice) => {
              const dateLabel = notice.createdAt?.seconds 
                ? new Date(notice.createdAt.seconds * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : "Récemment";
              
              return (
                <div key={notice.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start justify-between gap-4 group">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <p className="text-xs font-black text-slate-900 leading-none">{notice.title}</p>
                      <Badge className="text-[8px] tracking-wider uppercase font-black bg-purple-100 text-purple-700 rounded-md py-0 px-1.5">
                        Cible: {notice.target}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed">{notice.content}</p>
                    <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {dateLabel}
                    </p>
                  </div>

                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteNotice(notice.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })
          ) : (
            <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-2xl">
              <p className="text-xs font-black text-slate-400">Aucun avis broad n'est diffusé en ce moment.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
