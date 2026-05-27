import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  doc, 
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { UserProfile, Job } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  ShieldCheck, 
  Briefcase, 
  FileText, 
  Globe, 
  TrendingUp, 
  Bell, 
  AlertTriangle, 
  Settings, 
  History, 
  MessageSquare,
  Lock,
  LogOut,
  Menu,
  X,
  ChevronRight,
  HardDrive
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Admin Sub-modules imports
import OverviewModule from '@/components/admin/OverviewModule';
import UsersModule from '@/components/admin/UsersModule';
import ApprovalsModule from '@/components/admin/ApprovalsModule';
import JobsModule from '@/components/admin/JobsModule';
import ApplicationsModule from '@/components/admin/ApplicationsModule';
import CMSModule from '@/components/admin/CMSModule';
import MediaModule from '@/components/admin/MediaModule';
import AnalyticsModule from '@/components/admin/AnalyticsModule';
import NotificationsModule from '@/components/admin/NotificationsModule';
import MaintenanceModule from '@/components/admin/MaintenanceModule';
import SettingsModule from '@/components/admin/SettingsModule';
import LogsModule from '@/components/admin/LogsModule';
import SupportModule from '@/components/admin/SupportModule';

type AdminModule = 'overview' | 'users' | 'approvals' | 'jobs' | 'applications' | 'cms' | 'media' | 'analytics' | 'notifications' | 'maintenance' | 'settings' | 'logs' | 'support';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  GET = 'get',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeModule, setActiveModule] = useState<AdminModule>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Synced Firestore Data States
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [allApplications, setAllApplications] = useState<any[]>([]);
  const [pendingRecruiters, setPendingRecruiters] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Real maintenance state
  const [maintenanceModeActive, setMaintenanceModeActive] = useState(false);

  const [stats, setStats] = useState({
    totalUsers: 0,
    recruiters: 0,
    candidates: 0,
    jobs: 0,
    applications: 0,
    pendingApprovals: 0
  });

  const [cmsData, setCmsData] = useState({
    siteName: "2NG Groupe Entreprises",
    logoUrl: "",
    iconUrl: "",
    heroTitle: "Trouvez le talent qui propulsera votre entreprise",
    heroSubtitle: "La plateforme de recrutement nouvelle génération pour l'Afrique.",
    primaryColor: "#ea580c"
  });

  const [goals, setGoals] = useState({
    targetUsers: 100,
    targetJobs: 50,
    targetApplications: 200
  });

  // Responsive Sidebar auto-collapse behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const addLog = async (action: string, target: string, type: string) => {
    const path = 'system_logs';
    try {
      await addDoc(collection(db, path), {
        action,
        target,
        type,
        user: user?.displayName || user?.email || 'Admin',
        timestamp: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  };

  // Hydration real-time listeners block
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    // Users
    const usersUnsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList = snapshot.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[];
      setAllUsers(usersList);
      
      const recruiters = usersList.filter(u => u.role === 'recruiter');
      const candidates = usersList.filter(u => u.role === 'candidate');
      const pending = recruiters.filter(r => r.status === 'submitted' || r.status === 'verifying' || r.status === 'pending');
      
      setStats(prev => ({
        ...prev,
        totalUsers: usersList.length,
        recruiters: recruiters.length,
        candidates: candidates.length,
        pendingApprovals: pending.length
      }));
      setPendingRecruiters(pending);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });

    // Jobs
    const jobsUnsub = onSnapshot(collection(db, 'offers'), (snapshot) => {
      const jobsList = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Job[];
      setAllJobs(jobsList);
      setStats(prev => ({ ...prev, jobs: jobsList.length }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'offers');
    });

    // Applications
    const appsUnsub = onSnapshot(collection(db, 'applications'), (snapshot) => {
      const appsList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllApplications(appsList);
      setStats(prev => ({ ...prev, applications: appsList.length }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'applications');
    });

    // Audit logs
    const logsUnsub = onSnapshot(
      query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(50)),
      (snapshot) => {
        const logsList = snapshot.docs.map(d => ({ 
          id: d.id, 
          ...d.data(),
          time: d.data().timestamp?.toDate ? d.data().timestamp.toDate().toLocaleTimeString('fr-FR') : 'À l\'instant'
        }));
        setLogs(logsList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'system_logs');
      }
    );

    // CMS config
    const cmsUnsub = onSnapshot(doc(db, 'site_config', 'home'), (snapshot) => {
      if (snapshot.exists()) {
        setCmsData(snapshot.data() as any);
      }
    });

    // Maintenance sync
    const maintUnsub = onSnapshot(doc(db, 'maintenance', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setMaintenanceModeActive(!!data.enabled);
      }
    });

    // Goals sync
    const goalsUnsub = onSnapshot(doc(db, 'settings', 'goals'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGoals({
          targetUsers: data.targetUsers || 100,
          targetJobs: data.targetJobs || 50,
          targetApplications: data.targetApplications || 200
        });
      }
    });

    setLoading(false);

    return () => {
      usersUnsub();
      jobsUnsub();
      appsUnsub();
      logsUnsub();
      cmsUnsub();
      maintUnsub();
      goalsUnsub();
    };
  }, [user]);

  // Handle actions proxying to the modular sub-components
  const handleUserAction = async (uid: string, action: 'suspend' | 'activate' | 'delete' | 'approve' | 'reject' | 'correction', message?: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      if (action === 'delete') {
        await deleteDoc(userRef);
        await addLog("Suppression utilisateur", `UID: ${uid}`, "warning");
      } else if (action === 'approve') {
        await updateDoc(userRef, { 
          status: 'approved', 
          accountStatus: 'active',
          adminNotes: null,
          approvedAt: serverTimestamp()
        });
        await addLog("Approbation recruteur", `Compte approuvé de l'UID: ${uid}`, "info");
      } else if (action === 'reject') {
        await updateDoc(userRef, { 
          status: 'rejected',
          adminNotes: message || "Dossier refusé par le Conseil."
        });
        await addLog("Rejet recruteur", `Compte refusé de l'UID: ${uid}`, "warning");
      } else if (action === 'correction') {
        await updateDoc(userRef, { 
          status: 'draft',
          adminNotes: message || "Des pièces justificatives complémentaires sont demandées."
        });
        await addLog("Demande de corrections", `Modifications requises pour l'UID: ${uid}`, "warning");
      } else {
        await updateDoc(userRef, {
          accountStatus: action === 'suspend' ? 'suspended' : 'active',
          status: action === 'suspend' ? 'suspended' : 'approved',
        });
        await addLog(action === 'suspend' ? "Utilisateur suspendu" : "Abonnement réactivé", `UID modifié: ${uid}`, "warning");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleJobAction = async (jobId: string, action: 'approve' | 'suspend' | 'delete' | 'toggleFeatured', reason?: string) => {
    try {
      const jobRef = doc(db, 'offers', jobId);
      if (action === 'delete') {
        await deleteDoc(jobRef);
        await addLog("Offre supprimée", `ID: ${jobId}`, "warning");
      } else if (action === 'approve') {
        await updateDoc(jobRef, { 
          status: 'active',
          approvedAt: serverTimestamp(),
          suspensionReason: null
        });
        await addLog("Offre d'emploi publiée", `Offre ID: ${jobId} passée en statut actif`, "info");
      } else if (action === 'suspend') {
        await updateDoc(jobRef, { 
          status: 'suspended', 
          suspensionReason: reason || "Non-conformité de l'offre.",
          suspendedAt: serverTimestamp()
        });
        await addLog("Offre d'emploi masquée", `Suspension de l'offre ID: ${jobId}. Motif: ${reason}`, "warning");
      } else if (action === 'toggleFeatured') {
        // Find existing Job state
        const jobMatch = allJobs.find(j => j.id === jobId);
        const nextFeatured = !(jobMatch?.isFeatured);
        await updateDoc(jobRef, { isFeatured: nextFeatured });
        await addLog("Modification offre à la une", `Offre ID: ${jobId} configurée Featured: ${nextFeatured}`, "info");
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `offers/${jobId}`);
    }
  };

  const recruiterNames = useMemo(() => {
    const map: Record<string, string> = {};
    allUsers.forEach(u => {
      if (u.role === 'recruiter') {
        map[u.uid] = u.companyName || u.tradeName || u.displayName || "Société Partenaire";
      }
    });
    return map;
  }, [allUsers]);

  // Sidebar Menu Items Definition
  const sidebarItems = [
    { id: 'overview', label: "Vue d'ensemble", icon: LayoutDashboard },
    { id: 'users', label: "Utilisateurs", icon: Users },
    { id: 'approvals', label: "File d'attente", icon: ShieldCheck, badge: stats.pendingApprovals },
    { id: 'jobs', label: "Offres d'emploi", icon: Briefcase },
    { id: 'applications', label: "Candidatures", icon: FileText },
    { id: 'cms', label: "Homepage CMS", icon: Globe },
    { id: 'media', label: "Médiathèque", icon: HardDrive },
    { id: 'analytics', label: "Statistiques & Cibles", icon: TrendingUp },
    { id: 'support', label: "Assistance", icon: MessageSquare },
    { id: 'notifications', label: "Bulletins Broad", icon: Bell },
    { id: 'maintenance', label: "Verrou Maintenance", icon: AlertTriangle, alert: maintenanceModeActive },
    { id: 'settings', label: "Paramètres", icon: Settings },
    { id: 'logs', label: "Logs d'audit", icon: History },
  ];

  // Access check
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f7f4] p-6 text-slate-900">
        <Card className="max-w-md w-full border-none shadow-2xl rounded-[32px] p-8 text-center bg-white">
          <div className="h-20 w-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Lock className="h-10 w-10 flex-shrink-0" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Console Réservée</h2>
          <p className="text-slate-450 text-xs font-semibold leading-relaxed mt-4">Vous n'avez pas l'accréditation administrative requise pour accéder à cette zone.</p>
          <Button 
            className="mt-8 w-full h-12 rounded-xl bg-slate-950 text-white font-black text-xs uppercase" 
            onClick={() => window.location.href = '/'}
          >
            Retour au Portail public 2NG
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden text-slate-800">
      
      {/* Slideout overlay for mobile sizes */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 xl:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar navigation panel */}
      <aside 
        className={`bg-slate-950 text-white border-r border-slate-900 flex flex-col z-50 shrink-0 transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-0 xl:w-20'
        } fixed xl:relative h-full ${isMobileMenuOpen ? 'w-64' : ''}`}
      >
        {/* Brand Banner */}
        <div className="h-20 border-b border-slate-900 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="h-9 w-9 bg-orange-600 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 shadow-lg shadow-orange-600/20">
              2N
            </span>
            {isSidebarOpen && (
              <span className="font-extrabold text-sm tracking-tight text-white select-none whitespace-nowrap">
                2NG Groupe Console
              </span>
            )}
          </div>
          {/* Close for mobile scale */}
          <Button 
            size="icon" 
            variant="ghost" 
            className="xl:hidden text-slate-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Menu Scroller area */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 my-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveModule(item.id as AdminModule);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative ${
                  isActive 
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/15' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 shrink-0" />
                  {isSidebarOpen && <span className="truncate">{item.label}</span>}
                </div>
                
                {/* Visual Alert Dot/Badges */}
                {isSidebarOpen && (
                  <>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-orange-600 text-[10px] font-bold text-white flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                    {item.alert === true && (
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sign out footer block */}
        <div className="p-4 border-t border-slate-900 shrink-0">
          <button
            type="button"
            onClick={logout}
            className="w-full h-11 rounded-xl bg-slate-900 hover:bg-red-950/20 text-xs font-black uppercase text-red-400 hover:text-red-500 flex items-center gap-3 justify-center transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {isSidebarOpen && <span>Déconnection</span>}
          </button>
        </div>
      </aside>

      {/* Main Panel frame */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
        {/* Topbar navigation metrics */}
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Button 
              size="icon" 
              variant="ghost" 
              className="xl:hidden hover:bg-slate-50"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5 text-slate-800" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="hidden xl:flex hover:bg-slate-50"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu className="h-5 w-5 text-slate-800" />
            </Button>

            {/* Title indication */}
            <div className="hidden sm:block">
              <h1 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                Tableau Administratif Principal
                <ChevronRight className="h-4 w-4 text-slate-350" />
                <span className="text-orange-600 uppercase text-xs font-black tracking-widest">{activeModule}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Status indicator */}
            <span className="hidden md:flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full text-[10px] font-black uppercase text-slate-650 tracking-wider">
              <span className={`h-2 w-2 rounded-full ${maintenanceModeActive ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              {maintenanceModeActive ? 'Restriction active (Maint)' : 'Portail en ligne'}
            </span>

            {/* Profile widget */}
            <div className="flex items-center gap-2 border-l border-slate-100 pl-4">
              <div className="h-9 w-9 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center font-bold font-sans text-sm select-none">
                {user.displayName?.[0] || 'A'}
              </div>
              <div className="hidden lg:block text-left leading-none">
                <p className="text-xs font-black text-slate-905">{user.displayName || 'Directeur Support'}</p>
                <p className="text-[9px] font-bold text-slate-400 mt-0.5">Admin 2NG Groupe</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic content view renderer */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
          {loading ? (
            <div className="py-24 text-center">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Chargement de la Console 2NG...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeModule}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
              >
                {activeModule === 'overview' && (
                  <OverviewModule 
                    stats={stats} 
                    jobs={allJobs} 
                    users={allUsers} 
                    applications={allApplications} 
                    onNavigate={(mod) => setActiveModule(mod)}
                  />
                )}
                {activeModule === 'users' && (
                  <UsersModule 
                    users={allUsers} 
                    onAction={handleUserAction} 
                    addLog={addLog}
                  />
                )}
                {activeModule === 'approvals' && (
                  <ApprovalsModule 
                    pending={pendingRecruiters} 
                    onAction={handleUserAction} 
                  />
                )}
                {activeModule === 'jobs' && (
                  <JobsModule 
                    jobs={allJobs} 
                    onAction={handleJobAction} 
                    recruiterNames={recruiterNames}
                  />
                )}
                {activeModule === 'applications' && (
                  <ApplicationsModule 
                    applications={allApplications} 
                    users={allUsers}
                    jobs={allJobs}
                  />
                )}
                {activeModule === 'cms' && (
                  <CMSModule 
                    currentData={cmsData} 
                    onSave={(newData) => setCmsData(newData)} 
                  />
                )}
                {activeModule === 'media' && (
                  <MediaModule 
                    addLog={addLog}
                  />
                )}
                {activeModule === 'analytics' && (
                  <AnalyticsModule 
                    stats={stats} 
                    jobs={allJobs} 
                    users={allUsers} 
                    applications={allApplications}
                    goals={goals}
                  />
                )}
                {activeModule === 'support' && (
                  <SupportModule 
                    addLog={addLog}
                  />
                )}
                {activeModule === 'notifications' && (
                  <NotificationsModule 
                    logs={logs}
                    pendingRecruiters={pendingRecruiters}
                    applications={allApplications}
                  />
                )}
                {activeModule === 'maintenance' && (
                  <MaintenanceModule 
                    addLog={addLog}
                  />
                )}
                {activeModule === 'settings' && (
                  <SettingsModule 
                    addLog={addLog}
                  />
                )}
                {activeModule === 'logs' && (
                  <LogsModule 
                    logs={logs}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

    </div>
  );
}
