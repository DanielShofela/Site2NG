import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  TrendingUp, 
  Users, 
  Briefcase, 
  FileText, 
  Award, 
  Check, 
  Target, 
  Sparkles,
  Percent,
  Compass
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  LineChart, 
  Line 
} from 'recharts';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AnalyticsProps {
  stats: any;
  jobs: any[];
  users: any[];
  applications: any[];
  goals: any;
}

export default function AnalyticsModule({ stats, jobs, users, applications, goals }: AnalyticsProps) {
  const [localGoals, setLocalGoals] = useState({
    targetUsers: 100,
    targetJobs: 50,
    targetApplications: 200
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (goals) {
      setLocalGoals({
        targetUsers: goals.targetUsers || 100,
        targetJobs: goals.targetJobs || 50,
        targetApplications: goals.targetApplications || 200
      });
    }
  }, [goals]);

  const handleSaveGoals = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'goals'), localGoals);
      alert("Objectifs annuels ajustés avec succès ! Les jauges de performance ont été adaptées.");
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la mise à jour des objectifs.");
    } finally {
      setSaving(false);
    }
  };

  // Sector distribution extraction
  const sectorData = useMemo(() => {
    const counts: Record<string, number> = {};
    jobs.forEach(j => {
      const field = j.field || "Autres";
      counts[field] = (counts[field] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({
      name: name.length > 15 ? `${name.substring(0, 15)}...` : name,
      valeur: value
    })).slice(0, 6);
  }, [jobs]);

  // Conversion Indicators
  const conversions = useMemo(() => {
    const totalViews = jobs.reduce((sum, j) => sum + (j.views || 0), 0);
    const totalApps = applications.length;
    
    // Conversion rate: applications / total views
    const conversionRate = totalViews > 0 ? Math.round((totalApps / totalViews) * 100) : 0;
    
    // Average application density per posted offer
    const avgAppsPerJob = jobs.length > 0 ? (totalApps / jobs.length).toFixed(1) : "0";

    return {
      totalViews,
      conversionRate,
      avgAppsPerJob
    };
  }, [jobs, applications]);

  // Jauges calculations
  const progressPercentUsers = Math.min(Math.round(((stats.totalUsers || 0) / localGoals.targetUsers) * 100), 100);
  const progressPercentJobs = Math.min(Math.round(((stats.jobs || 0) / localGoals.targetJobs) * 100), 100);
  const progressPercentApps = Math.min(Math.round(((stats.applications || 0) / localGoals.targetApplications) * 100), 100);

  const COLORS = ['#ea580c', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];

  return (
    <div className="space-y-8">
      {/* Intro Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm rounded-[28px] bg-white p-6 flex items-center justify-between group">
          <div className="space-y-1.5">
            <p className="text-[10px] font-black uppercase text-slate-400">Vues totales des offres</p>
            <p className="text-2xl font-black text-slate-900 leading-none">{conversions.totalViews}</p>
            <p className="text-[10px] text-slate-400 font-bold mt-1">Nombre d'affichages uniques</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Compass className="h-6 w-6" />
          </div>
        </Card>

        <Card className="border-none shadow-sm rounded-[28px] bg-white p-6 flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-black uppercase text-slate-400">Taux de conversion global</p>
            <p className="text-2xl font-black text-slate-900 leading-none">{conversions.conversionRate}%</p>
            <p className="text-[10px] text-emerald-600 font-black mt-1">Candidatures par clic</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Percent className="h-6 w-6" />
          </div>
        </Card>

        <Card className="border-none shadow-sm rounded-[28px] bg-white p-6 flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-black uppercase text-slate-400">Densité moyenne offres</p>
            <p className="text-2xl font-black text-slate-900 leading-none">{conversions.avgAppsPerJob}</p>
            <p className="text-[10px] text-slate-400 font-bold mt-1">Postulants par emploi en ligne</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Award className="h-6 w-6" />
          </div>
        </Card>
      </div>

      {/* Recharts Analytics Displays */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm rounded-[32px] p-6 md:p-8 bg-white">
          <CardTitle className="text-base font-black text-slate-900">Distribution par Secteurs (Offres d'emploi)</CardTitle>
          <CardDescription className="text-xs mb-6">Répartition par domaine commercial actif de l'Afrique de l'Ouest.</CardDescription>
          
          <div className="h-72 w-full">
            {sectorData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '10px' }} />
                  <Bar dataKey="valeur" radius={[8, 8, 0, 0]}>
                    {sectorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs font-bold text-slate-400 text-center py-20 select-none">Pas de données de secteurs disponibles.</p>
            )}
          </div>
        </Card>

        {/* Goals / Targets Config Card */}
        <Card className="border-none shadow-sm rounded-[32px] p-6 md:p-8 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <CardTitle className="text-base font-black text-slate-900 flex items-center gap-1.5">
                  <Target className="h-5 w-5 text-orange-600" /> Objectifs de Croissance Annuelle
                </CardTitle>
                <CardDescription className="text-xs">Configurez et suivez vos paliers d'inscriptions et de recrutement.</CardDescription>
              </div>
            </div>

            <div className="space-y-6">
              {/* Progress 1 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-slate-700 uppercase">Utilisateurs inscrits</span>
                  <span className="font-extrabold text-slate-500">{stats.totalUsers || 0} / {localGoals.targetUsers} ({progressPercentUsers}%)</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${progressPercentUsers}%` }} />
                </div>
              </div>

              {/* Progress 2 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-slate-700 uppercase">Jobs Postés</span>
                  <span className="font-extrabold text-slate-500">{stats.jobs || 0} / {localGoals.targetJobs} ({progressPercentJobs}%)</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${progressPercentJobs}%` }} />
                </div>
              </div>

              {/* Progress 3 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-slate-700 uppercase">Candidatures Déposées</span>
                  <span className="font-extrabold text-slate-500">{stats.applications || 0} / {localGoals.targetApplications} ({progressPercentApps}%)</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progressPercentApps}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-50 pt-5 mt-6 grid grid-cols-3 gap-3 items-end">
            <div>
              <Label className="text-[9px] font-black uppercase text-slate-500">Adhérents</Label>
              <Input 
                type="number" 
                value={localGoals.targetUsers} 
                onChange={(e) => setLocalGoals({ ...localGoals, targetUsers: parseInt(e.target.value) || 0 })}
                className="h-10 text-xs font-bold"
              />
            </div>
            <div>
              <Label className="text-[9px] font-black uppercase text-slate-500">Emplois</Label>
              <Input 
                type="number" 
                value={localGoals.targetJobs} 
                onChange={(e) => setLocalGoals({ ...localGoals, targetJobs: parseInt(e.target.value) || 0 })}
                className="h-10 text-xs font-bold"
              />
            </div>
            <Button 
              className="h-10 rounded-lg bg-slate-950 hover:bg-slate-850 text-xs text-white font-black uppercase"
              onClick={handleSaveGoals}
              disabled={saving}
            >
              Ajuster
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
