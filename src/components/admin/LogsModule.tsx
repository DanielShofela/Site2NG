import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Clock, 
  Search, 
  Trash2, 
  Check, 
  Info, 
  AlertTriangle,
  History
} from 'lucide-react';
import { collection, addDoc, getDocs, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface LogsProps {
  logs: any[];
}

export default function LogsModule({ logs }: LogsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const action = (l.action || "").toLowerCase();
      const target = (l.target || "").toLowerCase();
      const matchSearch = action.includes(searchTerm.toLowerCase()) || target.includes(searchTerm.toLowerCase());
      
      const matchType = typeFilter === "all" || l.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [logs, searchTerm, typeFilter]);

  const handleClearLogs = async () => {
    if (!confirm("Voulez-vous vider l'ensemble de l'historique d'audit ainsi que les logs d'activité administrateur ?")) {
      return;
    }
    try {
      // Clear logs from firestore in batch
      const snapshot = await getDocs(collection(db, 'admin_logs'));
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      alert("Historique des logs purgé avec succès !");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
      <CardHeader className="p-6 md:p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
            <History className="h-6 w-6 text-orange-600" />
            Audit de Securité & Activités (Logs)
          </CardTitle>
          <CardDescription className="text-xs font-semibold text-slate-400 mt-1">
            Visualisez la traçabilité des actions administratives, modifications de configurations et validations juridiques récentes.
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Chercher log ou cible..." 
              className="pl-9 h-11 rounded-xl border-slate-100 bg-slate-50 text-xs font-semibold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select 
            className="h-11 px-4 rounded-xl border border-slate-100 bg-slate-50 text-xs font-black uppercase text-slate-600 outline-none cursor-pointer"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">Tous les types</option>
            <option value="info">Information (Info)</option>
            <option value="warning">Modération (Warning)</option>
            <option value="error">Erreur d'accès</option>
          </select>

          <Button 
            variant="ghost" 
            onClick={handleClearLogs}
            className="h-11 rounded-xl text-xs font-black uppercase border border-slate-100 hover:bg-slate-50 text-red-500 hover:text-red-650"
          >
            Vider l'Historique
          </Button>
        </div>
      </CardHeader>

      <div className="divide-y divide-slate-50 min-h-[350px]">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => {
            const dateLabel = log.timestamp?.seconds 
              ? new Date(log.timestamp.seconds * 1000).toLocaleString('fr-FR')
              : (log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR') : "Aujourd'hui");
            
            return (
              <div key={log.id} className="p-6 hover:bg-slate-50/20 transition-all flex items-start justify-between gap-4 group">
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    log.type === 'warning' 
                      ? 'bg-amber-100 text-amber-600' 
                      : log.type === 'error' 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-blue-100 text-blue-600'
                  }`}>
                    {log.type === 'warning' ? (
                      <AlertTriangle className="h-5 w-5" />
                    ) : (
                      <Info className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 leading-tight">{log.action}</h4>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{log.target || "Système"}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Renseigné le : {dateLabel}
                    </p>
                  </div>
                </div>

                <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                  log.type === 'warning' 
                    ? 'border-amber-100 text-amber-700 bg-amber-50' 
                    : log.type === 'error' 
                      ? 'border-red-100 text-red-700 bg-red-50' 
                      : 'border-blue-100 text-blue-700 bg-blue-50'
                }`}>
                  {log.type}
                </Badge>
              </div>
            );
          })
        ) : (
          <div className="py-24 text-center space-y-3">
            <div className="h-16 w-16 bg-slate-50 text-slate-305 rounded-full flex items-center justify-center mx-auto">
              <History className="h-8 w-8" />
            </div>
            <p className="text-xs font-black text-slate-400">Aucun log enregistré ou ne correspondant au filtre.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
