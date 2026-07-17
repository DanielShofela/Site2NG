import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Folder, 
  ImageIcon, 
  Trash2, 
  Download, 
  Plus, 
  Copy, 
  FileText, 
  Search, 
  ExternalLink,
  HardDrive,
  AlertCircle
} from 'lucide-react';
import { collection, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface MediaProps {
  addLog?: (action: string, target: string, type: string) => Promise<void>;
}

export default function MediaModule({ addLog }: MediaProps) {
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [customTitle, setCustomTitle] = useState("");

  // Custom Delete Confirmation Dialog State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteMediaId, setDeleteMediaId] = useState<string | null>(null);
  const [deleteMediaName, setDeleteMediaName] = useState<string>("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'media'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMediaList(items);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const titleToUse = customTitle.trim() || file.name.split('.')[0];
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        
        const payload = {
          name: titleToUse,
          fileName: file.name,
          type: file.type,
          size: `${Math.round(file.size / 1024)} KB`,
          url: base64Data,
          uploadedAt: new Date()
        };

        await addDoc(collection(db, 'media'), payload);
        if (addLog) {
          await addLog("Fichier téléversé", `Fichier ${file.name} ajouté à la médiathèque`, "info");
        }
        
        alert("Fichier importé avec succès dans votre Médiathèque 2NG !");
        setCustomTitle("");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'upload du fichier.");
      setUploading(false);
    }
  };

  const handleDeleteMedia = (id: string, name: string) => {
    setDeleteMediaId(id);
    setDeleteMediaName(name);
    setDeleteConfirmOpen(true);
  };

  const handleExecuteDeleteMedia = async () => {
    if (!deleteMediaId) return;
    try {
      await deleteDoc(doc(db, 'media', deleteMediaId));
      if (addLog) {
        await addLog("Média supprimé", `Destruction du fichier ${deleteMediaName} dans la médiathèque`, "warning");
      }
      alert("Fichier média supprimé définitivement.");
      setDeleteConfirmOpen(false);
      setDeleteMediaId(null);
      setDeleteMediaName("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    alert("Données du fichier / Base64 copiées dans le presse-papier ! Vous pouvez les coller comme adresses d'images.");
  };

  const filteredMedia = mediaList.filter(m => 
    (m.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (m.fileName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
      <CardHeader className="p-6 md:p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
            <HardDrive className="h-6 w-6 text-orange-600" />
            Bibliothèque d'Actifs Médias
          </CardTitle>
          <CardDescription className="text-xs font-semibold text-slate-400 mt-1">Gérez vos brochures de recrutement, visuels récréatifs d'entreprises, bannières et logos.</CardDescription>
        </div>
        
        {/* Quick Uploader interface */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-end sm:items-center">
          <div className="space-y-1 w-full sm:w-44">
            <Input 
              placeholder="Titre personnalisé..." 
              value={customTitle} 
              onChange={(e) => setCustomTitle(e.target.value)}
              className="h-10 rounded-lg text-xs font-bold"
              disabled={uploading}
            />
          </div>
          <Button 
            disabled={uploading}
            onClick={() => document.getElementById('mediatheque-file-uploader')?.click()}
            className="h-10 px-5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 w-full sm:w-auto shrink-0 shadow-lg shadow-orange-600/10"
          >
            <Plus className="h-4.5 w-4.5" />
            {uploading ? "Importation..." : "Ajouter un fichier"}
          </Button>
          <input 
            id="mediatheque-file-uploader"
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </CardHeader>

      <div className="p-6 md:p-8 space-y-6">
        {/* Search bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Rechercher fichier par nom..." 
            className="pl-9 h-11 rounded-xl border-slate-100 bg-slate-50 text-xs font-semibold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Gallery grid view */}
        {loading ? (
          <div className="py-24 text-center">
            <p className="text-xs font-bold text-slate-400">Synchronisation avec Firestore...</p>
          </div>
        ) : filteredMedia.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredMedia.map((media) => {
              const isImage = media.type?.startsWith('image/');
              
              return (
                <Card key={media.id} className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between bg-slate-50/50 group/card">
                  {/* File preview */}
                  <div className="aspect-video bg-slate-100 flex items-center justify-center relative overflow-hidden shrink-0">
                    {isImage ? (
                      <img src={media.url} className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="text-center space-y-1.5">
                        <FileText className="h-10 w-10 text-orange-600 mx-auto" />
                        <span className="text-[10px] font-black uppercase text-slate-400">DOCUMENTPDF</span>
                      </div>
                    )}
                    
                    <div className="absolute top-2.5 right-2.5 flex gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 bg-white/90 rounded-lg text-slate-600 hover:text-orange-600 p-0 shadow-sm"
                        onClick={() => handleCopyLink(media.url)}
                        title="Copier le Base64 / URL"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 bg-white/90 rounded-lg text-red-500 hover:text-red-600 p-0 shadow-sm"
                        onClick={() => handleDeleteMedia(media.id, media.name)}
                        title="Supprimer définitivement"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* File Details footer */}
                  <div className="p-4 bg-white border-t border-slate-100/60 grow flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-900 truncate leading-none" title={media.name}>
                        {media.name}
                      </p>
                      <p className="text-[9px] font-bold text-slate-450 uppercase tracking-wide mt-1 justify-between flex">
                        <span>{media.size}</span>
                        <span>{media.fileName.split('.').pop()?.toUpperCase()}</span>
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-50 flex gap-2">
                      <a href={media.url} target="_blank" rel="noopener" className="flex-1">
                        <Button 
                          variant="outline" 
                          className="w-full h-9 rounded-lg font-black text-[9px] uppercase border-slate-100 text-slate-500"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" /> Ouvrir actif
                        </Button>
                      </a>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-[32px] space-y-3">
            <div className="h-16 w-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
              <Folder className="h-8 w-8" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-450">Aucun fichier présent dans la médiathèque.</p>
              <p className="text-[10px] text-slate-350 mt-1">Uploadez des visuels ou brochures d'entreprises pour démarrer.</p>
            </div>
          </div>
        )}
      </div>

      {/* Custom Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={(open) => { if(!open) { setDeleteConfirmOpen(false); setDeleteMediaId(null); } }}>
        <DialogContent className="max-w-md rounded-[32px] p-8 border-none shadow-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs font-bold pt-2 leading-relaxed">
              Voulez-vous détruire l'actif média <span className="font-extrabold text-slate-800">"{deleteMediaName}"</span> ? Les liens ou logos l'utilisant ne s'afficheront plus. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-6 border-t border-slate-50 flex gap-2 justify-end">
            <Button 
              variant="ghost" 
              onClick={() => { setDeleteConfirmOpen(false); setDeleteMediaId(null); }}
              className="h-11 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50"
            >
              Annuler
            </Button>
            <Button
              onClick={handleExecuteDeleteMedia}
              className="bg-red-600 hover:bg-red-700 text-white font-black text-xs h-11 px-5 rounded-xl shadow-lg shadow-red-600/10"
            >
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
