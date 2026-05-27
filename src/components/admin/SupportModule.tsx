import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Check } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SupportTicket } from '@/types';

interface SupportProps {
  addLog: (action: string, target: string, type: string) => Promise<void>;
}

export default function SupportModule({ addLog }: SupportProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'support_tickets'), (snapshot) => {
      const list: SupportTicket[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as SupportTicket);
      });
      setTickets(list);
      setLoading(false);
    }, (error) => {
      console.error("Error loading support tickets:", error);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;
    setIsReplying(true);
    try {
      const ticketRef = doc(db, 'support_tickets', selectedTicket.id);
      await updateDoc(ticketRef, {
        response: replyText,
        repliedAt: serverTimestamp(),
        status: 'closed'
      });
      await addLog(
        "Réponse au support",
        `Réponse envoyée à ${selectedTicket.userEmail} pour le sujet : "${selectedTicket.subject}"`,
        "success"
      );
      setSelectedTicket(null);
      setReplyText('');
      alert("La réponse de l'assistance a été transmise au client ! Le ticket est passé en statut : TRAITÉ.");
    } catch (err) {
      console.error("Error updating support ticket:", err);
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader className="p-6 md:p-8 border-b border-slate-50">
          <CardTitle className="text-xl font-black text-slate-900">Tickets & Assistance Technique</CardTitle>
          <CardDescription className="text-xs font-semibold text-slate-400 mt-1">Consultez et répondez en temps réel aux messages d'assistance des candidats et recruteurs d'Afrique.</CardDescription>
        </CardHeader>
        
        <div className="p-6 md:p-8 space-y-4">
          {loading ? (
            <div className="text-center py-10 font-bold text-slate-400">Chargement de la file d'assistance...</div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl">
              <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-500">Aucun ticket d'assistance pour le moment</p>
              <p className="text-slate-400 text-xs mt-1">Les messages de détresse de vos utilisateurs apparaîtront ici.</p>
            </div>
          ) : (
            tickets.map(t => (
              <div key={t.id} className="flex flex-col xl:flex-row items-start xl:items-center justify-between p-6 border border-slate-100 rounded-[28px] bg-white hover:border-orange-500 hover:shadow-lg transition-all gap-4 group">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-4 rounded-2xl shrink-0 ${t.status === 'open' ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 my-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h5 className="font-black text-slate-900 text-lg group-hover:text-orange-600 transition-colors leading-tight">{t.subject}</h5>
                      <Badge variant="outline" className={`text-[9px] font-black uppercase rounded-full ${t.userRole === 'recruiter' ? 'border-indigo-200 text-indigo-700 bg-indigo-50' : 'border-emerald-200 text-emerald-700 bg-emerald-50'}`}>
                        {t.userRole === 'recruiter' ? 'Recruteur' : 'Candidat'}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-slate-650 font-semibold leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-50 mt-1 max-w-2xl whitespace-pre-wrap">
                      "{t.message}"
                    </p>

                    {t.response && (
                      <div className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl max-w-2xl mt-2 space-y-1">
                        <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wide flex items-center gap-1">
                          <Check className="h-3 w-3" /> Votre Réponse :
                        </p>
                        <p className="text-xs text-slate-700 font-bold whitespace-pre-wrap">"{t.response}"</p>
                      </div>
                    )}
                    
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pt-1">
                      Émis par <span className="text-slate-900 font-extrabold">{t.userName} ({t.userEmail})</span> • {t.createdAt ? new Date(t.createdAt.seconds ? t.createdAt.seconds * 1000 : t.createdAt).toLocaleString('fr-FR') : 'Date inconnue'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 shrink-0 self-stretch xl:self-auto justify-end">
                  <Badge className={`px-4 h-7 rounded-full font-black text-[10px] uppercase ${t.status === 'open' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                    {t.status === 'open' ? 'En attente' : 'Traité'}
                  </Badge>
                  <Button 
                    className={`rounded-xl font-black text-[10px] px-5 h-10 uppercase tracking-widest ${t.status === 'open' ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'bg-slate-50 text-slate-600'}`} 
                    onClick={() => {
                      setSelectedTicket(t);
                      setReplyText(t.response || '');
                    }}
                  >
                    {t.status === 'open' ? 'Répondre' : 'Modifier Réponse'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Reply Dialog */}
      <Dialog open={selectedTicket !== null} onOpenChange={(open) => { if (!open) setSelectedTicket(null); }}>
        <DialogContent className="max-w-lg rounded-[32px] p-8 border-none shadow-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-950">
              {selectedTicket?.status === 'open' ? "Répondre au ticket d'assistance" : "Modifier la réponse"}
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-bold text-sm">
              La réponse sera immédiatement disponible pour l'utilisateur sur son espace d'assistance.
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <form onSubmit={handleSendReply} className="space-y-4 pt-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Message de {selectedTicket.userName} :</p>
                <p className="text-xs font-bold text-slate-700 whitespace-pre-wrap leading-relaxed">"{selectedTicket.message}"</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="replyContent" className="font-black text-slate-700 uppercase text-xs tracking-wider">Votre Message de Réponse</Label>
                <Textarea
                  id="replyContent"
                  placeholder="Rédigez votre réponse d'assistance ici..."
                  className="min-h-[140px] rounded-2xl border-slate-250 font-bold text-sm"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  required
                />
              </div>

              <DialogFooter className="pt-2 flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="rounded-xl font-bold text-xs h-12 uppercase" 
                  onClick={() => setSelectedTicket(null)}
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  className="rounded-xl font-black text-xs px-6 h-12 uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                  disabled={isReplying}
                >
                  {isReplying ? "Traitement..." : "Envoyer & Clôturer"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
