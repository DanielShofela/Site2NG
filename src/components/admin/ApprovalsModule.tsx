import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Building2, 
  MapPin, 
  Mail, 
  Phone, 
  Clock, 
  FileText, 
  Eye, 
  Check, 
  X, 
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  Download
} from 'lucide-react';
import { UserProfile } from '@/types';

interface ApprovalsProps {
  pending: UserProfile[];
  onAction: (uid: string, action: 'suspend' | 'activate' | 'delete' | 'promote' | 'approve' | 'reject' | 'correction', message?: string) => Promise<void>;
}

export default function ApprovalsModule({ pending, onAction }: ApprovalsProps) {
  const [selectedReview, setSelectedReview] = useState<UserProfile | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [correctionNotes, setCorrectionNotes] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  // Success and Error logs/states for safe in-app display (bypassing native UI alerts)
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [approvingProfile, setApprovingProfile] = useState<UserProfile | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string; filename?: string } | null>(null);

  const handleDownload = (url: string, defaultFilename: string) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = defaultFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.warn("Download exception:", e);
      window.open(url, '_blank');
    }
  };

  const handleApproveClick = (profile: UserProfile) => {
    setApprovingProfile(profile);
  };

  const handleConfirmApprove = async () => {
    if (!approvingProfile) return;
    try {
      await onAction(approvingProfile.uid, 'approve');
      setApprovingProfile(null);
      setIsReviewOpen(false);
      setSelectedReview(null);
      setSuccessMsg("L'organisation a été approuvée avec succès ! Un e-mail a été préparé pour ses représentants.");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (e: any) {
      console.error(e);
      alert("Une erreur s'est produite lors de l'approbation : " + (e.message || e));
    }
  };

  const handleAskCorrection = async () => {
    if (!selectedReview) return;
    if (!correctionNotes.trim()) {
      alert("Veuillez saisir des indications détaillées pour aider l'adhérent à corriger son dossier.");
      return;
    }
    setSubmittingNote(true);
    try {
      await onAction(selectedReview.uid, 'correction', correctionNotes);
      setIsReviewOpen(false);
      setSelectedReview(null);
      setShowRejectForm(false);
      setCorrectionNotes("");
      setSuccessMsg("Demande de correction transmise avec succès ! L'entreprise a été mise en statut 'brouillon/correction' avec vos notes explicatives.");
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingNote(false);
    }
  };

  return (
    <>
      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-sm animate-fade-in">
          <Check className="h-5 w-5 text-emerald-600 shrink-0" />
          <p>{successMsg}</p>
        </div>
      )}

      <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
        <CardHeader className="p-6 md:p-8 border-b border-slate-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black text-slate-900">Queue de Validation Juridique</CardTitle>
              <CardDescription className="text-xs font-semibold text-slate-400 mt-1">Examinez les attestations fiscales et les registres rccm des demandeurs de comptes recruteurs.</CardDescription>
            </div>
            <Badge className="bg-orange-50 text-orange-700 border-none px-4 py-1.5 font-black text-xs uppercase rounded-full">
              {pending.length} En Attente
            </Badge>
          </div>
        </CardHeader>

        <div className="divide-y divide-slate-50 min-h-[300px]">
          {pending.length > 0 ? (
            pending.map((r) => (
              <div key={r.uid} className="p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-slate-50/20 transition-all group">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black overflow-hidden shrink-0">
                      {r.photoUrl ? (
                        <img src={r.photoUrl} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        r.companyName?.[0] || 'E'
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 group-hover:text-orange-600 transition-colors">{r.companyName}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                        <Building2 className="h-3 w-3" /> Secteur : {r.sectorActivity || "Secteur non configuré"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                      <MapPin className="h-4 w-4 text-slate-300" /> Ville: {r.city || "Abidjan"}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                      <Mail className="h-4 w-4 text-slate-300" /> {r.email}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                      <Clock className="h-4 w-4 text-slate-300" /> Transmis: {r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleDateString('fr-FR') : 'Récemment'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end lg:self-center">
                  <Button 
                    className="h-11 px-6 rounded-xl bg-slate-950 font-black text-xs text-white hover:bg-slate-800 transition-all uppercase tracking-wider shadow-lg shadow-slate-950/10"
                    onClick={() => { setSelectedReview(r); setCorrectionNotes(r.adminNotes || ""); setIsReviewOpen(true); }}
                  >
                    Examiner Fiche
                  </Button>
                  <Button 
                    size="icon" 
                    className="h-11 w-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-xl shadow-orange-600/15"
                    onClick={() => handleApproveClick(r)}
                  >
                    <Check className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-24 text-center space-y-4">
              <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900">Zéro dossier en attente</h4>
                <p className="text-xs font-medium text-slate-400 mt-1 max-w-xs mx-auto">Toutes les demandes de comptes ont été examinées et auditées avec succès !</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Review Dossier Modal */}
      <Dialog open={isReviewOpen} onOpenChange={(open) => { setIsReviewOpen(open); if(!open) setShowRejectForm(false); }}>
        <DialogContent className="max-w-4xl w-full rounded-[32px] p-8 border-none shadow-2xl overflow-y-auto max-h-[90vh]">
          {selectedReview && (
            <div className="space-y-6">
              <DialogHeader className="border-b border-slate-50 pb-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center font-black">
                    {selectedReview.companyName?.[0] || 'C'}
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black text-slate-900">{selectedReview.companyName}</DialogTitle>
                    <DialogDescription className="font-bold text-xs text-slate-400 mt-1 uppercase tracking-widest">
                      Dossier Administratif Soumis • Créé le {selectedReview.createdAt?.seconds ? new Date(selectedReview.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Éléments de l'entreprise</h4>
                  <div className="space-y-3 bg-slate-50/70 p-5 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-600">Nom commercial : <span className="font-extrabold text-slate-800">{selectedReview.tradeName || selectedReview.companyName}</span></p>
                    <p className="text-xs font-bold text-slate-600">Forme juridique : <span className="font-extrabold text-slate-800">{selectedReview.legalForm || "Non renseigné"}</span></p>
                    <p className="text-xs font-bold text-slate-600">Numéro de Registre RCCM : <span className="font-extrabold text-slate-800">{selectedReview.registrationNumber || "Non renseigné"}</span></p>
                    <p className="text-xs font-bold text-slate-600">Taille de l'entreprise : <span className="font-extrabold text-slate-800">{selectedReview.companySize || "N/A"}</span></p>
                    <p className="text-xs font-bold text-slate-600">Numéro de Téléphone : <span className="font-extrabold text-slate-800">{selectedReview.phone || "Non renseigné"}</span></p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manager Répondant</h4>
                  <div className="space-y-3 bg-slate-50/70 p-5 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-600">Identité : <span className="font-extrabold text-slate-800">{selectedReview.manager?.firstName} {selectedReview.manager?.lastName}</span></p>
                    <p className="text-xs font-bold text-slate-600">Rôle Direct : <span className="font-extrabold text-slate-800">{selectedReview.manager?.role || "Non renseigné"}</span></p>
                    <p className="text-xs font-bold text-slate-600">Email Direct : <span className="font-extrabold text-slate-800">{selectedReview.manager?.email || selectedReview.email}</span></p>
                    <p className="text-xs font-bold text-slate-600 font-semibold mt-2.5 italic">Description de l'activité commerciale: "{selectedReview.companyShortDescription || selectedReview.companyDescription || 'Sans descriptif'}"</p>
                  </div>
                </div>
              </div>

              {/* Verified Documents Row */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pièces de vérification téléchargées</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedReview.legalDocuments?.rccmUrl ? (
                    <button 
                      type="button"
                      onClick={() => setPreviewDoc({ 
                        url: selectedReview.legalDocuments!.rccmUrl!, 
                        title: "Registre du Commerce (RCCM)", 
                        filename: selectedReview.legalDocuments!.rccmName || "RCCM.pdf" 
                      })}
                      className="w-full flex items-center justify-between p-4 bg-white border border-slate-150 rounded-2xl hover:border-orange-500 hover:shadow-sm transition-all group/doc text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-orange-50 font-black text-xs text-orange-600 rounded-xl flex items-center justify-center shrink-0">RCCM</div>
                        <div>
                          <p className="text-xs font-black text-slate-800">Registre du Commerce</p>
                          <p className="text-[10px] text-slate-400 font-bold">N° {selectedReview.registrationNumber || "RCCM File"}</p>
                        </div>
                      </div>
                      <Eye className="h-4 w-4 text-slate-300 group-hover/doc:text-orange-600 shrink-0" />
                    </button>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center text-xs font-bold text-slate-400">
                      Registre du Commerce non fourni
                    </div>
                  )}

                  {selectedReview.legalDocuments?.taxStatusUrl ? (
                    <button 
                      type="button"
                      onClick={() => setPreviewDoc({ 
                        url: selectedReview.legalDocuments!.taxStatusUrl!, 
                        title: "Attestation Fiscale", 
                        filename: selectedReview.legalDocuments!.taxStatusName || "Attestation_Fiscale.pdf" 
                      })}
                      className="w-full flex items-center justify-between p-4 bg-white border border-slate-150 rounded-2xl hover:border-blue-500 hover:shadow-sm transition-all group/doc text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-50 font-black text-xs text-blue-600 rounded-xl flex items-center justify-center shrink-0">TAX</div>
                        <div>
                          <p className="text-xs font-black text-slate-800">Attestation Fiscale</p>
                          <p className="text-[10px] text-slate-400 font-bold">Document Impôts</p>
                        </div>
                      </div>
                      <Eye className="h-4 w-4 text-slate-300 group-hover/doc:text-blue-600 shrink-0" />
                    </button>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center text-xs font-bold text-slate-400">
                      Attestation Impôts/DGI non fournie
                    </div>
                  )}
                </div>
              </div>

              {/* Option to show inputs */}
              {showRejectForm ? (
                <div className="p-5 bg-orange-50/50 border border-orange-200/50 rounded-2xl space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-900 uppercase">Description des éléments incorrects ou notes d'amélioration</Label>
                    <Textarea 
                      rows={3}
                      value={correctionNotes}
                      onChange={(e) => setCorrectionNotes(e.target.value)}
                      placeholder="Ex: Le document RCCM est tronqué, veuillez télécharger un PDF complet. De plus, la description contient des fautes de frappe."
                      className="rounded-xl border-slate-200 bg-white font-semibold text-xs leading-relaxed"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button 
                      variant="ghost" 
                      className="h-10 rounded-xl font-bold text-xs"
                      onClick={() => setShowRejectForm(false)}
                    >
                      Annuler
                    </Button>
                    <Button 
                      className="h-10 rounded-xl bg-orange-600 text-white font-black hover:bg-orange-700 text-xs px-5"
                      onClick={handleAskCorrection}
                      disabled={submittingNote}
                    >
                      {submittingNote ? "Enregistrement..." : "Transmettre correction"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-slate-100 pt-6 flex justify-between gap-3">
                  <Button 
                    variant="outline"
                    className="h-11 rounded-xl font-black text-xs text-orange-600 hover:bg-orange-50 border-orange-100"
                    onClick={() => setShowRejectForm(true)}
                  >
                    Demander des corrections
                  </Button>
                  <div className="flex gap-3">
                    <Button 
                      variant="ghost" 
                      className="h-11 rounded-xl font-bold text-xs px-5 text-slate-400"
                      onClick={() => setIsReviewOpen(false)}
                    >
                      Fermer
                    </Button>
                    <Button 
                      className="h-11 rounded-xl bg-orange-600 text-white font-black hover:bg-orange-700 text-xs px-6 shadow-xl shadow-orange-600/10"
                      onClick={() => handleApproveClick(selectedReview)}
                    >
                      Valider & Activer
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog (Bypasses window.confirm so it doesn't break under sandboxed iframe) */}
      <Dialog open={approvingProfile !== null} onOpenChange={(open) => { if(!open) setApprovingProfile(null); }}>
        <DialogContent className="max-w-md w-full rounded-[24px] p-6 border-none shadow-2xl">
          <DialogHeader className="pb-4">
            <div className="h-12 w-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-black text-slate-900 text-center">Approuver l'entreprise ?</DialogTitle>
            <DialogDescription className="text-center text-xs font-semibold text-slate-400 mt-2">
              Voulez-vous valider et approuver administrativement l'entreprise <strong>"{approvingProfile?.companyName}"</strong> ? Ses représentants recevront un plein accès aux dépôts d'offres d'emploi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-center">
            <Button 
              variant="ghost" 
              className="h-10 rounded-xl font-bold text-xs px-4"
              onClick={() => setApprovingProfile(null)}
            >
              Annuler
            </Button>
            <Button 
              className="h-10 rounded-xl bg-orange-600 text-white font-black hover:bg-orange-700 text-xs px-5 shadow-lg shadow-orange-600/10"
              onClick={handleConfirmApprove}
            >
              Confirmer & Activer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inside-App Document Preview Modal (Bypasses top-level target="_blank" restrictions for base64 PDFs and images) */}
      <Dialog open={previewDoc !== null} onOpenChange={(open) => { if(!open) setPreviewDoc(null); }}>
        <DialogContent className="max-w-4xl w-full rounded-[24px] p-6 border-none shadow-2xl flex flex-col max-h-[90vh]">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-black text-slate-900">{previewDoc?.title}</DialogTitle>
                <DialogDescription className="text-xs font-semibold text-slate-400 mt-1">
                  Nom du fichier original : {previewDoc?.filename || "Inconnu"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-6 flex items-center justify-center min-h-[350px] bg-slate-50 rounded-2xl border border-slate-100 p-4">
            {previewDoc?.url ? (
              previewDoc.url.startsWith("data:application/pdf") || previewDoc.url.includes(".pdf") ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                  <iframe 
                    src={previewDoc.url} 
                    title={previewDoc.title} 
                    className="w-full h-[55vh] rounded-xl border border-slate-200 shadow-inner bg-white" 
                  />
                  <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl w-full text-center flex items-center justify-between gap-4">
                    <div className="text-left">
                      <p className="text-xs font-black text-orange-800">Visualisation PDF Sécurisée</p>
                      <p className="text-[10px] font-bold text-orange-600">Si le document n'est pas ou mal affiché par votre navigateur, cliquez pour télécharger direct.</p>
                    </div>
                    <Button
                      onClick={() => handleDownload(previewDoc.url, previewDoc.filename || "document.pdf")}
                      className="bg-orange-600 hover:bg-orange-700 text-white font-black text-xs h-10 px-4 rounded-xl flex items-center gap-1.5 shadow-lg shadow-orange-600/10"
                    >
                      <Download className="h-4 w-4" />
                      Télécharger PDF
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
                    <img 
                      src={previewDoc.url} 
                      alt={previewDoc.title} 
                      className="max-h-[55vh] object-contain rounded-lg" 
                    />
                  </div>
                  <Button
                    onClick={() => handleDownload(previewDoc.url, previewDoc.filename || "document.png")}
                    className="bg-slate-950 hover:bg-slate-800 text-white font-black text-xs h-10 px-5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-slate-950/10"
                  >
                    <Download className="h-4 w-4" />
                    Télécharger Image
                  </Button>
                </div>
              )
            ) : (
              <p className="text-xs font-bold text-slate-400">Aucun document chargé ou format invalide.</p>
            )}
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 flex justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (previewDoc) {
                  handleDownload(previewDoc.url, previewDoc.filename || "document.dat");
                }
              }}
              className="h-10 rounded-xl font-black text-xs border-slate-200"
            >
              Télécharger l'original
            </Button>
            <Button 
              className="h-10 rounded-xl bg-slate-950 text-white font-black hover:bg-slate-800 text-xs px-5"
              onClick={() => setPreviewDoc(null)}
            >
              Fermer l'aperçu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

