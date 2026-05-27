import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Briefcase, 
  FileText, 
  ShieldCheck, 
  TrendingUp, 
  Clock, 
  ExternalLink, 
  ChevronRight,
  UserCheck,
  AlertTriangle,
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';
import { UserProfile, Job } from '@/types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { motion } from 'motion/react';

interface OverviewProps {
  stats: any;
  jobs: Job[];
  users: UserProfile[];
  applications: any[];
  onNavigate?: (module: any) => void;
}

export default function OverviewModule({ stats, jobs, users, applications, onNavigate }: OverviewProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('30d');

  // Calculates percentage trends dynamically
  const usersGrowth = useMemo(() => {
    if (!users || users.length === 0) return 0;
    const now = new Date();
    const threshold = new Date(now.getTime() - (timeRange === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000);
    const recent = users.filter((u: any) => {
      if (!u.createdAt) return false;
      const d = u.createdAt.seconds ? new Date(u.createdAt.seconds * 1000) : new Date(u.createdAt);
      return d >= threshold;
    });
    const recentCount = recent.length;
    const pastCount = users.length - recentCount;
    if (pastCount === 0) return 100;
    return Math.round((recentCount / pastCount) * 100);
  }, [users, timeRange]);

  const jobsGrowth = useMemo(() => {
    if (!jobs || jobs.length === 0) return 0;
    const now = new Date();
    const threshold = new Date(now.getTime() - (timeRange === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000);
    const recent = jobs.filter((j: any) => {
      if (!j.createdAt) return false;
      const d = j.createdAt.seconds ? new Date(j.createdAt.seconds * 1000) : new Date(j.createdAt);
      return d >= threshold;
    });
    const recentCount = recent.length;
    const pastCount = jobs.length - recentCount;
    if (pastCount === 0) return 100;
    return Math.round((recentCount / pastCount) * 100);
  }, [jobs, timeRange]);

  const applicationsGrowth = useMemo(() => {
    if (!applications || applications.length === 0) return 0;
    const now = new Date();
    const threshold = new Date(now.getTime() - (timeRange === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000);
    const recent = applications.filter((app: any) => {
      if (!app.appliedAt) return false;
      const d = app.appliedAt.seconds ? new Date(app.appliedAt.seconds * 1000) : new Date(app.appliedAt);
      return d >= threshold;
    });
    const recentCount = recent.length;
    const pastCount = applications.length - recentCount;
    if (pastCount === 0) return 100;
    return Math.round((recentCount / pastCount) * 100);
  }, [applications, timeRange]);

  const recruitersGrowth = useMemo(() => {
    const recruiters = users.filter(u => u.role === 'recruiter');
    if (recruiters.length === 0) return 0;
    const now = new Date();
    const threshold = new Date(now.getTime() - (timeRange === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000);
    const recent = recruiters.filter((u: any) => {
      if (!u.createdAt) return false;
      const d = u.createdAt.seconds ? new Date(u.createdAt.seconds * 1000) : new Date(u.createdAt);
      return d >= threshold;
    });
    const recentCount = recent.length;
    const pastCount = recruiters.length - recentCount;
    if (pastCount === 0) return 100;
    return Math.round((recentCount / pastCount) * 100);
  }, [users, timeRange]);

  const chartData = useMemo(() => {
    const dataPoints: { date: string, inscriptions: number, offres: number, applications: number }[] = [];
    const now = new Date();
    const days = timeRange === '7d' ? 7 : 30;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const label = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      dataPoints.push({
        date: label,
        inscriptions: 0,
        offres: 0,
        applications: 0
      });
    }

    // Populate inscriptions
    users.forEach(u => {
      if (!u.createdAt) return;
      try {
        const cDate = u.createdAt.seconds ? new Date(u.createdAt.seconds * 1000) : new Date(u.createdAt);
        const dayDiff = Math.floor((now.getTime() - cDate.getTime()) / (24 * 60 * 60 * 1000));
        if (dayDiff >= 0 && dayDiff < days) {
          const idx = (days - 1) - dayDiff;
          if (dataPoints[idx]) dataPoints[idx].inscriptions++;
        }
      } catch (e) {}
    });

    // Populate offers
    jobs.forEach(j => {
      if (!j.createdAt) return;
      try {
        const cDate = j.createdAt.seconds ? new Date(j.createdAt.seconds * 1000) : new Date(j.createdAt);
        const dayDiff = Math.floor((now.getTime() - cDate.getTime()) / (24 * 60 * 60 * 1000));
        if (dayDiff >= 0 && dayDiff < days) {
          const idx = (days - 1) - dayDiff;
          if (dataPoints[idx]) dataPoints[idx].offres++;
        }
      } catch (e) {}
    });

    // Populate applications
    applications.forEach(app => {
      if (!app.appliedAt) return;
      try {
        const cDate = app.appliedAt.seconds ? new Date(app.appliedAt.seconds * 1000) : new Date(app.appliedAt);
        const dayDiff = Math.floor((now.getTime() - cDate.getTime()) / (24 * 60 * 60 * 1000));
        if (dayDiff >= 0 && dayDiff < days) {
          const idx = (days - 1) - dayDiff;
          if (dataPoints[idx]) dataPoints[idx].applications++;
        }
      } catch (e) {}
    });

    return dataPoints;
  }, [users, jobs, applications, timeRange]);

  const cards = [
    { label: "Utilisateurs Globaux", value: stats.totalUsers || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50/70", growth: usersGrowth, tab: "users" },
    { label: "Partenaires Entreprises", value: stats.recruiters || 0, icon: ShieldCheck, color: "text-purple-600", bg: "bg-purple-50/70", growth: recruitersGrowth, tab: "approvals" },
    { label: "Offres en Ligne", value: stats.jobs || 0, icon: Briefcase, color: "text-orange-600", bg: "bg-orange-50/70", growth: jobsGrowth, tab: "jobs" },
    { label: "Candidatures Reçues", value: stats.applications || 0, icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50/70", growth: applicationsGrowth, tab: "applications" },
  ];

  // Recently registered candidates/recruiters
  const recentRegistrations = useMemo(() => {
    return [...users]
      .sort((a, b) => {
        const dateA = a.createdAt?.seconds ? a.createdAt.seconds : (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
        const dateB = b.createdAt?.seconds ? b.createdAt.seconds : (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [users]);

  return (
    <div className="space-y-8">
      {/* Banner Intro */}
      <div className="bg-gradient-to-r from-slate-900 via-orange-950 to-slate-950 text-white rounded-[32px] p-6 md:p-10 relative overflow-hidden shadow-xl border border-orange-500/10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] bg-orange-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3.5 py-1.5 rounded-full">
              SaaS Control Panel ➔ Live
            </span>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight">Bonjour, Administrateur 2NG</h2>
            <p className="text-slate-400 text-xs md:text-sm font-medium max-w-xl">
              Bienvenue dans votre interface de gestion de nouvelle génération. Surveillez l'écosystème, validez les entreprises partenaires, modérez les offres d'emploi et modifiez le contenu du site en temps réel.
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setTimeRange('7d')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${timeRange === '7d' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/25' : 'bg-white/10 text-slate-300 hover:bg-white/15'}`}
            >
              7 Jours
            </button>
            <button 
              onClick={() => setTimeRange('30d')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${timeRange === '30d' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/25' : 'bg-white/10 text-slate-300 hover:bg-white/15'}`}
            >
              30 Jours
            </button>
          </div>
        </div>
      </div>

      {/* Grid Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ y: -4 }}
            className="cursor-pointer"
            onClick={() => onNavigate && onNavigate(card.tab)}
          >
            <Card className="border-none shadow-sm hover:shadow-lg rounded-[28px] overflow-hidden bg-white p-6 transition-all group relative">
              <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-orange-500/5 to-transparent rounded-bl-[100px] pointer-events-none" />
              <div className="flex items-center justify-between">
                <div className={`${card.bg} ${card.color} h-14 w-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm duration-300`}>
                  <card.icon className="h-6 w-6 stroke-[2]" />
                </div>
                {card.growth > 0 ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-none font-black text-[10px] uppercase py-1 px-2.5 rounded-lg flex items-center gap-1">
                    <ArrowUpRight className="h-3.5 w-3.5" /> +{card.growth}%
                  </Badge>
                ) : card.growth === 0 ? (
                  <Badge className="bg-slate-50 text-slate-500 border-none font-black text-[10px] uppercase py-1 px-2.5 rounded-lg">
                    Neutre
                  </Badge>
                ) : (
                  <Badge className="bg-red-50 text-red-700 border-none font-black text-[10px] uppercase py-1 px-2.5 rounded-lg flex items-center gap-1">
                    <TrendingDown className="h-3.5 w-3.5" /> {card.growth}%
                  </Badge>
                )}
              </div>
              <div className="mt-6">
                <p className="text-3xl font-black text-slate-900 tracking-tight">{card.value}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1.5">{card.label}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts & Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Growth Area Chart */}
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white p-6 md:p-8 lg:col-span-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <CardTitle className="text-lg font-black text-slate-900">Activité de la Plateforme</CardTitle>
              <CardDescription className="text-xs">Croissance globale des flux d'inscriptions, d'offres et d'applications en ligne.</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                <span className="text-[10px] font-black uppercase text-slate-400">Inscriptions</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
                <span className="text-[10px] font-black uppercase text-slate-400">Offres</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                <span className="text-[10px] font-black uppercase text-slate-400">Directs</span>
              </div>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInscriptions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOffres" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ea580c" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} fontWeight="600" axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} fontWeight="600" axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }} 
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="inscriptions" name="Inscriptions" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorInscriptions)" />
                <Area type="monotone" dataKey="offres" name="Offres" stroke="#ea580c" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOffres)" />
                <Area type="monotone" dataKey="applications" name="Candidatures" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorApps)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Recent Registrations Widgets */}
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white p-6 md:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <CardTitle className="text-lg font-black text-slate-900">Inscriptions Récentes</CardTitle>
                <CardDescription className="text-xs">Derniers arrivants sur la plateforme.</CardDescription>
              </div>
              <Clock className="h-5 w-5 text-slate-300" />
            </div>
            
            <div className="space-y-4">
              {recentRegistrations.length > 0 ? (
                recentRegistrations.map((u: any, idx: number) => (
                  <div key={u.uid || idx} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-none group">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-black text-xs uppercase ${u.role === 'recruiter' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                        {u.displayName?.[0] || u.companyName?.[0] || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 leading-none truncate group-hover:text-orange-600 transition-colors">
                          {u.displayName || u.companyName || u.email}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                          {u.role === 'recruiter' ? 'Entreprise Partner' : 'Candidat'}
                        </p>
                      </div>
                    </div>
                    
                    <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                      u.status === 'approved' || u.status === 'verified' ? 'bg-emerald-50 text-emerald-700 border-none' : 'bg-amber-50 text-amber-700 border-none'
                    }`}>
                      {u.status || 'Nouveau'}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center space-y-2">
                  <p className="text-xs font-bold text-slate-400">Aucune inscription</p>
                </div>
              )}
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            className="w-full h-11 rounded-2xl hover:bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-orange-600 border border-slate-100 mt-6"
            onClick={() => onNavigate && onNavigate('users')}
          >
            Tous les utilisateurs
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </Card>
      </div>

      {/* Advanced Queue & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white p-6 relative">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-600 animate-pulse" />
            Accès Rapide CMS
          </h3>
          <p className="text-xs font-bold text-slate-400 leading-relaxed mb-6">Modifiez l'appellation du site, changez la charte graphique et ajustez la bannière d'accueil.</p>
          <Button 
            className="w-full h-12 bg-slate-950 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-950/20"
            onClick={() => onNavigate && onNavigate('cms')}
          >
            Ouvrir la Homepage CMS
          </Button>
        </Card>

        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white p-6 relative">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
            Validations Requises
          </h3>
          <p className="text-xs font-bold text-slate-400 leading-relaxed mb-6">Vous avez actuellement <span className="text-orange-600 font-extrabold">{stats.pendingApprovals || 0}</span> entreprises en attente de validation juridique.</p>
          <Button 
            className="w-full h-12 bg-white border border-slate-100 hover:border-purple-600/30 text-slate-800 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all"
            onClick={() => onNavigate && onNavigate('approvals')}
          >
            Voir les Dossiers ({stats.pendingApprovals || 0})
          </Button>
        </Card>

        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white p-6 relative md:col-span-2 lg:col-span-1">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
            Vigilance Maintenance
          </h3>
          <p className="text-xs font-bold text-slate-400 leading-relaxed mb-6">Le mode maintenance bloque l'accès public immédiat au site. Utile en cas d'intervention technique.</p>
          <Button 
            className="w-full h-12 bg-red-50 text-red-700 hover:bg-red-100/60 font-black text-xs uppercase tracking-widest rounded-2xl border border-red-100 transition-all"
            onClick={() => onNavigate && onNavigate('maintenance')}
          >
            Configurer la Maintenance
          </Button>
        </Card>
      </div>
    </div>
  );
}
