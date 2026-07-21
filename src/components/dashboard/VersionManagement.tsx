import React from 'react';
import { CVVersion } from '@/types/cvlm';
import { deleteVersion, duplicateVersion, getAllVersions } from '@/services/cvVersionService';
import { Trash2, Copy, FileEdit, Check, X } from 'lucide-react';
import { showToast } from './toast';

interface VersionManagementProps {
  onVersionsChange: () => void;
  onEditVersion: (version: CVVersion) => void;
}

export default function VersionManagement({ onVersionsChange, onEditVersion }: VersionManagementProps) {
  const [versions, setVersions] = React.useState<CVVersion[]>([]);

  const loadVersions = () => {
    setVersions(getAllVersions());
  };

  React.useEffect(() => {
    loadVersions();
  }, []);

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le brouillon "${name}" ?`)) {
      deleteVersion(id);
      showToast('Brouillon supprimé', 'success');
      loadVersions();
      onVersionsChange();
    }
  };

  const handleDuplicate = (id: string) => {
    const copy = duplicateVersion(id);
    if (copy) {
      showToast('Brouillon dupliqué avec succès', 'success');
      loadVersions();
      onVersionsChange();
    } else {
      showToast('Erreur lors de la duplication', 'error');
    }
  };

  if (versions.length === 0) {
    return (
      <div className="p-8 text-center text-slate-450 font-semibold text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
        Aucun brouillon de CV trouvé. Créez un CV depuis la galerie de modèles.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-4">
      <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
        📂 Gestion de vos Brouillons ({versions.length})
      </h3>
      
      <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
        {versions.map((v) => (
          <div key={v.id} className="py-3 flex items-center justify-between gap-4 group">
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black text-slate-800 truncate">{v.name}</h4>
              <p className="text-[10px] text-slate-450 font-semibold mt-0.5">
                Template: {v.templateName} • Modifié le {new Date(v.updatedAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onEditVersion(v)}
                className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all cursor-pointer"
                title="Éditer le brouillon"
              >
                <FileEdit className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDuplicate(v.id)}
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                title="Dupliquer"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(v.id, v.name)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
