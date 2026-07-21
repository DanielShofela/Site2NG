import React from 'react';
import { CVVersion } from '@/types/cvlm';
import { History, ChevronDown, Check } from 'lucide-react';

interface VersionSelectorProps {
  versions: CVVersion[];
  selectedVersionId: string | null;
  onSelect: (versionId: string) => void;
}

export default function VersionSelector({ versions, selectedVersionId, onSelect }: VersionSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const selected = versions.find(v => v.id === selectedVersionId);

  if (versions.length === 0) return null;

  return (
    <div className="relative inline-block w-full sm:w-64 text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-between gap-2 shadow-sm font-semibold text-xs text-slate-700 transition-all cursor-pointer"
      >
        <span className="flex items-center gap-2 truncate">
          <History className="h-4 w-4 text-orange-600 shrink-0" />
          <span className="truncate">
            {selected ? `Draft: ${selected.name}` : 'Sélectionner un brouillon'}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-full bg-white border border-slate-150 rounded-2xl shadow-xl z-40 max-h-60 overflow-y-auto py-1.5">
            {versions.map((v) => {
              const isSelected = v.id === selectedVersionId;
              return (
                <button
                  key={v.id}
                  onClick={() => {
                    onSelect(v.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected 
                      ? 'bg-orange-50 text-orange-600' 
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate flex flex-col">
                    <span className="font-extrabold truncate">{v.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Modifié le {new Date(v.updatedAt).toLocaleDateString('fr-FR')}</span>
                  </span>
                  {isSelected && <Check className="h-4 w-4 text-orange-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
