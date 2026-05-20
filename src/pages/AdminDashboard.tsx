import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ShieldCheck, 
  UserCheck, 
  AlertTriangle, 
  FileBarChart, 
  Check, 
  X, 
  Building2, 
  Eye, 
  FileText, 
  MapPin, 
  Globe, 
  Users, 
  Briefcase, 
  LayoutDashboard, 
  Settings, 
  MessageSquare, 
  Image as ImageIcon, 
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Lock,
  Unlock,
  TrendingUp,
  Clock,
  LogOut,
  ChevronRight,
  Menu,
  Database,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import React, { useState, useEffect, useMemo, ChangeEvent, FormEvent } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
  Timestamp,
  addDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { UserProfile, Job } from '@/types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

type AdminModule = 'overview' | 'users' | 'approvals' | 'jobs' | 'applications' | 'cms' | 'support' | 'analytics' | 'settings' | 'logs';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeModule, setActiveModule] = useState<AdminModule>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default to false for better mobile initial state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Data States
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [pendingRecruiters, setPendingRecruiters] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    recruiters: 0,
    candidates: 0,
    jobs: 0,
    applications: 0,
    pendingApprovals: 0
  });

  // CMS State
  const [cmsData, setCmsData] = useState({
    siteName: "2NG Groupe Entreprises",
    logoUrl: "",
    iconUrl: "",
    heroTitle: "Trouvez le talent qui propulsera votre entreprise",
    heroSubtitle: "La plateforme de recrutement nouvelle génération pour l'Afrique.",
    primaryColor: "#ea580c"
  });

  // Adjust sidebar state based on window size on mount
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    handleResize(); // Initial check
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

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    // Real-time listeners for stats and lists
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

    const jobsUnsub = onSnapshot(collection(db, 'jobs'), (snapshot) => {
      const jobsList = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Job[];
      setAllJobs(jobsList);
      setStats(prev => ({ ...prev, jobs: jobsList.length }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'jobs');
    });

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

    // Fetch CMS Config
    const cmsUnsub = onSnapshot(doc(db, 'site_config', 'home'), (snapshot) => {
      if (snapshot.exists()) {
        setCmsData(snapshot.data() as any);
      }
    });

    setLoading(false);

    return () => {
      usersUnsub();
      jobsUnsub();
      logsUnsub();
      cmsUnsub();
    };
  }, [user]);

  const handleUserAction = async (uid: string, action: 'suspend' | 'activate' | 'delete' | 'approve' | 'reject' | 'correction', message?: string) => {
    const path = 'users';
    try {
      const userRef = doc(db, path, uid);
      if (action === 'delete') {
        await deleteDoc(userRef);
        await addLog("Suppression utilisateur", `UID: ${uid}`, "danger");
      } else if (action === 'approve') {
        await updateDoc(userRef, { 
          status: 'approved', 
          accountStatus: 'active',
          adminNotes: null
        });
        await addLog("Approbation recruteur", `UID: ${uid}`, "success");
      } else if (action === 'reject') {
        await updateDoc(userRef, { 
          status: 'rejected',
          adminNotes: message || "Votre compte a été refusé."
        });
        await addLog("Rejet recruteur", `UID: ${uid}`, "danger");
      } else if (action === 'correction') {
        await updateDoc(userRef, { 
          status: 'draft',
          adminNotes: message || "Des corrections sont nécessaires sur votre profil."
        });
        await addLog("Demande correction", `UID: ${uid}`, "warning");
      } else {
        await updateDoc(userRef, {
          accountStatus: action === 'suspend' ? 'suspended' : 'active',
          status: action === 'suspend' ? 'suspended' : 'approved'
        });
        await addLog(action === 'suspend' ? "Suspension" : "Activation", `UID: ${uid}`, "warning");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${uid}`);
    }
  };

  const handleJobAction = async (jobId: string, action: 'suspend' | 'delete') => {
      const path = 'jobs';
      try {
          const jobRef = doc(db, path, jobId);
          if (action === 'delete') {
              await deleteDoc(jobRef);
          } else {
              await updateDoc(jobRef, { status: 'suspended' });
          }
      } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `${path}/${jobId}`);
      }
  };

  const recruiterNames = useMemo(() => {
    const map: Record<string, string> = {};
    allUsers.forEach(u => {
      if (u.role === 'recruiter') {
        map[u.uid] = u.companyName || u.tradeName || u.displayName || "Entreprise";
      }
    });
    return map;
  }, [allUsers]);

  const menuItems = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'approvals', label: 'Validations', icon: ShieldCheck, badge: stats.pendingApprovals },
    { id: 'jobs', label: 'Offres d\'emploi', icon: Briefcase },
    { id: 'cms', label: 'Gestion du Site', icon: ImageIcon },
    { id: 'analytics', label: 'Statistiques', icon: TrendingUp },
    { id: 'support', label: 'Support & Tickets', icon: MessageSquare },
    { id: 'settings', label: 'Paramètres', icon: Settings },
    { id: 'logs', label: 'Journaux d\'accès', icon: Clock },
  ];

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md w-full border-none shadow-2xl rounded-[32px] p-8 text-center">
          <div className="h-20 w-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Lock className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Accès Refusé</h2>
          <p className="text-slate-500 mt-4 leading-relaxed font-medium">Vous n'avez pas les permissions nécessaires pour accéder à cette console.</p>
          <Button className="mt-8 w-full h-12 rounded-2xl bg-slate-900 font-bold" onClick={() => window.location.href = '/'}>
            Retour à l'accueil
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop & Mobile */}
      <aside 
        className={`bg-white border-r border-slate-100 transition-all duration-300 flex flex-col z-[70] 
          ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0 lg:block'} 
          ${isSidebarOpen ? 'lg:w-72' : 'lg:w-20'}
          absolute lg:static h-full shadow-2xl lg:shadow-none`}
      >
        <div className="p-6 flex items-center justify-between">
          {(isSidebarOpen || isMobileMenuOpen) && (
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg overflow-hidden border border-slate-700">
                {cmsData.iconUrl ? (
                    <img src={cmsData.iconUrl} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                    <Database className="h-5 w-5 text-white" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-black text-slate-900 tracking-tighter uppercase whitespace-nowrap text-xs">{cmsData.siteName || "2NG Groupe Entreprises"}</span>
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest leading-none">Admin Portal</span>
              </div>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              if (window.innerWidth < 1024) {
                setIsMobileMenuOpen(false);
              } else {
                setIsSidebarOpen(!isSidebarOpen);
              }
            }} 
            className="rounded-xl"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveModule(item.id as AdminModule);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group relative ${activeModule === item.id ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <item.icon className={`h-5 w-5 shrink-0 ${activeModule === item.id ? 'text-white' : 'group-hover:scale-110 transition-transform'}`} />
              {(isSidebarOpen || isMobileMenuOpen) && (
                <>
                  <span className="font-bold flex-1 text-left whitespace-nowrap">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeModule === item.id ? 'bg-white text-orange-600' : 'bg-orange-100 text-orange-600'}`}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {(!isSidebarOpen && !isMobileMenuOpen) && item.badge && item.badge > 0 && (
                <div className="absolute top-2 right-2 h-2 w-2 bg-orange-600 rounded-full border-2 border-white" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-50 mt-auto">
          <Button 
            variant="ghost" 
            className="w-full h-12 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 font-bold flex justify-start gap-4 px-4 focus:bg-red-50"
            onClick={logout}
          >
            <LogOut className="h-5 w-5" />
            {(isSidebarOpen || isMobileMenuOpen) && <span>Déconnexion</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsMobileMenuOpen(true)}
            className="rounded-xl"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-600/20">
              <Database className="h-4 w-4 text-white" />
            </div>
            <span className="font-black text-slate-800 text-xs uppercase tracking-tighter">Admin</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
            {user.displayName?.[0] || user.email?.[0] || 'A'}
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8">
          <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 lg:mb-8">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 capitalize">
                {menuItems.find(m => m.id === activeModule)?.label}
              </h1>
              <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">
                Bon retour, {user.displayName || 'Admin'}. État plateforme : 
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-black text-[9px] uppercase">Normal</span>
              </p>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-xs font-black flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                SYSTÈME OPÉRATIONNEL
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-[1600px] mx-auto"
            >
              {activeModule === 'overview' && <OverviewModule stats={stats} jobs={allJobs} users={allUsers} />}
              {activeModule === 'users' && <UsersModule users={allUsers} onAction={handleUserAction} addLog={addLog} />}
              {activeModule === 'approvals' && <ApprovalsModule pending={pendingRecruiters} onAction={handleUserAction} />}
              {activeModule === 'jobs' && <JobsModule jobs={allJobs} onAction={handleJobAction} recruiterNames={recruiterNames} />}
              {activeModule === 'cms' && <CMSModule currentData={cmsData} onSave={setCmsData} />}
              {activeModule === 'analytics' && <AnalyticsModule stats={stats} />}
              {activeModule === 'support' && <SupportModule />}
              {activeModule === 'settings' && <SettingsModule />}
              {activeModule === 'logs' && <LogsModule logs={logs} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// --- MODULE COMPONENTS ---

function OverviewModule({ stats, jobs, users }: { stats: any, jobs: Job[], users: UserProfile[] }) {
  const chartData = useMemo(() => {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (6 - i));
      return {
        name: days[d.getDay()],
        dateStr: d.toDateString(),
        users: 0,
        jobs: 0
      };
    });

    users.forEach(u => {
      if (!u.createdAt) return;
      const d = u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
      const idx = last7Days.findIndex(day => day.dateStr === d.toDateString());
      if (idx !== -1) last7Days[idx].users++;
    });

    jobs.forEach(j => {
      if (!j.createdAt) return;
      const d = j.createdAt.toDate ? j.createdAt.toDate() : new Date(j.createdAt);
      const idx = last7Days.findIndex(day => day.dateStr === d.toDateString());
      if (idx !== -1) last7Days[idx].jobs++;
    });

    return last7Days;
  }, [users, jobs]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: "Candidats", value: stats.candidates, icon: UserCheck, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Recruteurs", value: stats.recruiters, icon: Building2, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Offres Actives", value: stats.jobs, icon: Briefcase, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Validations", value: stats.pendingApprovals, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm rounded-[32px] overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-2xl md:text-3xl font-black text-slate-900 mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-5 w-5 md:h-6 md:w-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
                <TrendingUp className="h-3 w-3" /> +{Math.floor(Math.random() * 20)}%
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-black text-slate-900 text-sm md:text-base">Inscriptions & Offres</h3>
             <Select defaultValue="7d">
                 <option value="7d">7 derniers jours</option>
                 <option value="30d">30 derniers jours</option>
             </Select>
          </div>
          <div className="h-[250px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10}} />
                <Tooltip cursor={{fill: '#F1F5F9'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="users" name="Inscriptions" fill="#ea580c" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="jobs" name="Offres" fill="#334155" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
          <h3 className="font-black text-slate-900 text-sm md:text-base mb-6">Secteurs Porteurs</h3>
          <div className="h-[200px] md:h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Tech', value: 400 },
                    { name: 'BTP', value: 300 },
                    { name: 'Santé', value: 200 },
                    { name: 'Commerce', value: 278 },
                  ]}
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#ea580c" />
                  <Cell fill="#4f46e5" />
                  <Cell fill="#06b6d4" />
                  <Cell fill="#10b981" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4">
             {['Informatique', 'Génie Civil', 'Finance'].map(s => (
                 <div key={s} className="flex justify-between items-center text-xs">
                     <span className="font-bold text-slate-500">{s}</span>
                     <span className="font-black text-slate-900">+{Math.floor(Math.random()*100)}%</span>
                 </div>
             ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function UsersModule({ users, onAction, addLog }: { users: UserProfile[], onAction: any, addLog: any }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editData, setEditData] = useState<Partial<UserProfile> | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const name = u.displayName || u.companyName || u.email || "";
      const matchSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, searchTerm, roleFilter]);

  return (
    <>
    <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
      <CardHeader className="border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 md:p-8">
        <div>
          <CardTitle className="text-lg md:text-xl font-black">Gestion des Comptes</CardTitle>
          <CardDescription className="text-xs">Visualisez, modifiez ou suspendez les accès utilisateurs.</CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Rechercher..." 
              className="pl-10 h-11 rounded-xl border-slate-100 bg-slate-50 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="h-11 px-4 rounded-xl border border-slate-100 bg-slate-50 text-xs font-bold text-slate-600 outline-none w-full sm:w-auto"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">Tous les rôles</option>
            <option value="candidate">Candidats</option>
            <option value="recruiter">Recruteurs</option>
          </select>
        </div>
      </CardHeader>
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Utilisateur</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Type</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Statut</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredUsers.map((u) => (
              <tr key={u.uid} className="hover:bg-slate-50/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <div className="h-10 w-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">
                      {u.photoUrl ? <img src={u.photoUrl} className="w-full h-full object-cover rounded-xl" /> : (u.displayName?.[0] || u.companyName?.[0] || 'U')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 leading-tight truncate">{u.displayName || u.companyName}</p>
                      <p className="text-[10px] font-bold text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${u.role === 'recruiter' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 ${u.accountStatus === 'suspended' ? 'border-red-100 text-red-600 bg-red-50' : 'border-emerald-100 text-emerald-600 bg-emerald-50'}`}>
                    {u.accountStatus || 'active'}
                  </Badge>
                </td>
                  <td className="px-6 py-4 text-right space-x-1 shrink-0 whitespace-nowrap">
                    <Dialog open={isEditOpen && editData?.uid === u.uid} onOpenChange={(open) => { if (!open) setIsEditOpen(false); }}>
                      <DialogTrigger asChild nativeButton={true}>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 rounded-lg text-slate-400 hover:text-orange-600 transition-colors"
                          onClick={() => { setEditData(u); setIsEditOpen(true); }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-xl rounded-[32px] p-8 border-none shadow-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black">Modifier le Profil</DialogTitle>
                          <DialogDescription>Corrigez les informations de l'utilisateur.</DialogDescription>
                        </DialogHeader>
                        {editData && (
                          <div className="py-6 space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                              <div className="space-y-2">
                                <Label className="text-sm font-bold text-slate-700 ml-1">Nom Complet / Responsable</Label>
                                <Input 
                                  value={editData.displayName || ""} 
                                  onChange={e => setEditData({...editData, displayName: e.target.value})}
                                  className="h-12 rounded-xl border-slate-200"
                                />
                              </div>
                              
                              {editData.role === 'recruiter' && (
                                <>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-slate-700 ml-1">Nom de l'entreprise</Label>
                                    <Input 
                                      value={editData.companyName || ""} 
                                      onChange={e => setEditData({...editData, companyName: e.target.value})}
                                      className="h-12 rounded-xl border-slate-200"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-bold text-slate-700 ml-1">Nom Commercial</Label>
                                    <Input 
                                      value={editData.tradeName || ""} 
                                      onChange={e => setEditData({...editData, tradeName: e.target.value})}
                                      className="h-12 rounded-xl border-slate-200"
                                    />
                                  </div>
                                </>
                              )}

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-sm font-bold text-slate-700 ml-1">Ville</Label>
                                  <Input 
                                    value={editData.city || ""} 
                                    onChange={e => setEditData({...editData, city: e.target.value})}
                                    className="h-12 rounded-xl border-slate-200"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-bold text-slate-700 ml-1">Téléphone</Label>
                                  <Input 
                                    value={editData.phone || ""} 
                                    onChange={e => setEditData({...editData, phone: e.target.value})}
                                    className="h-12 rounded-xl border-slate-200"
                                  />
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-3 pt-4">
                              <Button variant="ghost" className="flex-1 rounded-xl h-12 font-bold" onClick={() => setIsEditOpen(false)}>
                                Annuler
                              </Button>
                              <Button 
                                className="flex-1 rounded-xl h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold" 
                                onClick={async () => {
                                  try {
                                    await updateDoc(doc(db, 'users', editData.uid!), {
                                      displayName: editData.displayName,
                                      companyName: editData.companyName || "",
                                      tradeName: editData.tradeName || "",
                                      city: editData.city || "",
                                      phone: editData.phone || ""
                                    });
                                    setIsEditOpen(false);
                                    addLog("Modification profil", `UID: ${editData.uid}`, "info");
                                    alert("Profil mis à jour avec succès");
                                  } catch (e) {
                                    handleFirestoreError(e, OperationType.UPDATE, `users/${editData.uid}`);
                                  }
                                }}
                              >
                                Enregistrer
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <Dialog open={isViewOpen && selectedUser?.uid === u.uid} onOpenChange={(open) => { if (!open) setIsViewOpen(false); }}>
                      <DialogTrigger asChild nativeButton={true}>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 rounded-lg text-slate-400 hover:text-orange-600 transition-colors"
                          onClick={() => { setSelectedUser(u); setIsViewOpen(true); }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-xl rounded-[32px] p-8 border-none shadow-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black">Profil Utilisateur</DialogTitle>
                          <DialogDescription>Détails complets du compte.</DialogDescription>
                        </DialogHeader>
                        {selectedUser && (
                          <div className="py-6 space-y-6">
                            <div className="flex items-center gap-4">
                              <div className="h-20 w-20 rounded-3xl bg-orange-100 text-orange-600 flex items-center justify-center text-3xl font-black">
                                {selectedUser.photoUrl ? <img src={selectedUser.photoUrl} className="w-full h-full object-cover rounded-3xl" /> : (selectedUser.displayName?.[0] || selectedUser.companyName?.[0] || 'U')}
                              </div>
                              <div>
                                <h3 className="text-xl font-black text-slate-900">{selectedUser.displayName || selectedUser.companyName}</h3>
                                <p className="text-slate-500 font-bold">{selectedUser.email}</p>
                                <Badge className="mt-2 text-[10px] font-black uppercase">{selectedUser.role}</Badge>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-slate-50 rounded-2xl">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Localisation</p>
                                <p className="font-bold">{selectedUser.city || selectedUser.location || 'Non spécifié'}</p>
                              </div>
                              <div className="p-4 bg-slate-50 rounded-2xl">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Téléphone</p>
                                <p className="font-bold">{selectedUser.phone || 'Non spécifié'}</p>
                              </div>
                              {selectedUser.role === 'recruiter' && (
                                <div className="col-span-2 p-4 bg-slate-50 rounded-2xl">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Secteur d'Activité</p>
                                  <p className="font-bold">{selectedUser.sectorActivity || 'Non spécifié'}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className={`h-8 w-8 rounded-lg ${u.accountStatus === 'suspended' ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:text-slate-900'}`}
                      onClick={async () => {
                        const newAction = u.accountStatus === 'suspended' ? 'activate' : 'suspend';
                        await onAction(u.uid!, newAction);
                        alert(`Compte ${newAction === 'suspend' ? 'suspendu' : 'activé'} avec succès`);
                      }}
                    >
                      {u.accountStatus === 'suspended' ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </Button>

                    <Dialog open={isDeleteOpen && userToDelete?.uid === u.uid} onOpenChange={(open) => { if (!open) setIsDeleteOpen(false); }}>
                      <DialogTrigger asChild nativeButton={true}>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 rounded-lg text-red-400 hover:bg-red-50" 
                          onClick={() => { setUserToDelete(u); setIsDeleteOpen(true); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md rounded-[32px] p-8 border-none shadow-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black text-red-600">Suppression Définitive</DialogTitle>
                          <DialogDescription className="font-bold">
                            Êtes-vous sûr de vouloir supprimer <strong>{userToDelete?.displayName || userToDelete?.companyName}</strong> ? Cette action est irréversible.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-3 mt-6">
                          <Button variant="ghost" className="rounded-xl font-black uppercase text-xs" onClick={() => setIsDeleteOpen(false)}>Annuler</Button>
                          <Button 
                            className="rounded-xl bg-red-600 hover:bg-red-700 font-black uppercase text-xs px-8" 
                            onClick={async () => {
                              if (userToDelete) {
                                await onAction(userToDelete.uid, 'delete');
                                setIsDeleteOpen(false);
                                alert("Compte supprimé définitivement");
                              }
                            }}
                          >
                            Confirmer
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
    </>
  );
}

function RecruiterReviewCard({ r, onAction }: { r: UserProfile, onAction: any, key?: string }) {
    const [isReviewOpen, setIsReviewOpen] = useState(false);

    const handleActionWithReason = (action: 'reject' | 'correction') => {
        const promptMsg = action === 'reject' ? "Motif du refus ?" : "Motif de la correction ?";
        const msg = window.prompt(promptMsg);
        if (msg !== null) {
            onAction(r.uid, action, msg || undefined);
            setIsReviewOpen(false);
        }
    };

    return (
        <Card key={r.uid} className="border-none shadow-sm rounded-[32px] p-4 md:p-6 bg-white group hover:shadow-md transition-all">
            <div className="flex flex-col lg:flex-row items-center lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4 flex-1 w-full text-slate-900">
                    <div className="h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-slate-50 border border-slate-100 p-2 flex items-center justify-center shrink-0">
                       <Building2 className="h-7 w-7 md:h-8 md:w-8 text-slate-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="text-base md:text-lg font-black truncate">{r.companyName}</h4>
                        <p className="text-xs md:text-sm font-bold text-slate-500 mt-1 truncate">{r.sectorActivity} • {r.city}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                            <Badge variant="ghost" className="text-[9px] font-black uppercase text-orange-600 bg-orange-50 px-2 h-5">RCCM: {r.registrationNumber || 'N/A'}</Badge>
                            <Badge variant="ghost" className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-2 h-5">Validation Prioritaire</Badge>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                        <DialogTrigger asChild nativeButton={true}>
                            <Button variant="outline" className="rounded-xl font-bold border-slate-200 px-6 h-11 flex-1 lg:flex-none">
                                <Eye className="mr-2 h-4 w-4" /> Examiner
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl w-full sm:w-[95vw] rounded-none sm:rounded-[40px] p-0 border-none shadow-2xl overflow-hidden flex flex-col h-full sm:h-[90vh] relative">
                             <button 
                                 onClick={() => setIsReviewOpen(false)}
                                 className="absolute right-4 top-4 md:right-8 md:top-8 rounded-full p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all z-50 focus:outline-none bg-white border border-slate-200 shadow-sm"
                                 aria-label="Fermer la page"
                                 type="button"
                             >
                                 <X className="h-5 w-5 stroke-[2.5]" />
                             </button>
                             <DialogHeader className="p-5 md:p-10 pb-0 shrink-0 pr-16">
                                 <DialogTitle className="text-xl md:text-3xl font-black text-slate-900">Revue Recruteur</DialogTitle>
                                 <DialogDescription className="font-bold text-xs md:text-base text-slate-500">Vérification approfondie du dossier : {r.companyName}</DialogDescription>
                             </DialogHeader>
                             
                             <div className="flex-1 overflow-y-auto p-5 md:p-10 space-y-8 scrollbar-hide text-slate-900">
                                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                     <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Responsable / Manager</p>
                                         <p className="text-sm font-black">
                                           {r.manager?.firstName ? `${r.manager.firstName} ${r.manager.lastName}` : (r.displayName || 'Non renseigné')}
                                         </p>
                                         <p className="text-[10px] font-bold text-slate-500 mt-1">{r.manager?.role || 'Manager'}</p>
                                     </div>
                                     <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email Contact</p>
                                         <p className="text-sm font-black truncate">{r.email}</p>
                                         <p className="text-[10px] font-bold text-slate-500 mt-1">Professionnel</p>
                                     </div>
                                     <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Localisation</p>
                                         <p className="text-sm font-black">{r.city || 'N/A'}, {r.commune || 'N/A'}</p>
                                         <p className="text-[10px] font-bold text-slate-500 mt-1 truncate">{r.location}</p>
                                     </div>
                                 </div>

                                 <div className="space-y-4">
                                     <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                         <FileText className="h-4 w-4 text-orange-600" />
                                         Documents de Vérification
                                     </h4>
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {r.legalDocuments?.rccmUrl ? (
                                          <a 
                                            href={r.legalDocuments.rccmUrl} 
                                            target="_blank" 
                                            rel="noopener"
                                            className="flex items-center justify-between p-5 bg-white rounded-3xl group/doc border-2 border-orange-100 hover:border-orange-500 hover:shadow-lg hover:shadow-orange-100 transition-all cursor-pointer"
                                          >
                                              <div className="flex items-center gap-4">
                                                  <div className="h-10 w-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 font-bold italic text-xs">DOC</div>
                                                  <div>
                                                    <p className="font-black text-xs md:text-sm">Registre Commerce (RCCM)</p>
                                                    <p className="text-[10px] font-bold text-slate-400">N° {r.registrationNumber || 'Non renseigné'}</p>
                                                  </div>
                                              </div>
                                              <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center group-hover/doc:bg-orange-600 group-hover/doc:text-white transition-colors">
                                                <Eye className="h-5 w-5" />
                                              </div>
                                          </a>
                                        ) : (
                                          <div className="p-5 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center min-h-[80px]">
                                            <p className="text-xs font-bold text-slate-400">RCCM non fourni</p>
                                            <p className="text-[10px] text-slate-300">Indiqué: {r.registrationNumber || 'N/A'}</p>
                                          </div>
                                        )}

                                        {r.legalDocuments?.taxStatusUrl ? (
                                          <a 
                                            href={r.legalDocuments.taxStatusUrl} 
                                            target="_blank" 
                                            rel="noopener"
                                            className="flex items-center justify-between p-5 bg-white rounded-3xl group/doc border-2 border-blue-100 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-100 transition-all cursor-pointer"
                                          >
                                              <div className="flex items-center gap-4">
                                                  <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold italic text-xs">TAX</div>
                                                  <div>
                                                    <p className="font-black text-xs md:text-sm">Attestation Fiscale</p>
                                                    <p className="text-[10px] font-bold text-slate-400">DGI / Impôts</p>
                                                  </div>
                                              </div>
                                              <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center group-hover/doc:bg-blue-600 group-hover/doc:text-white transition-colors">
                                                <Eye className="h-5 w-5" />
                                              </div>
                                          </a>
                                        ) : (
                                          <div className="p-5 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center min-h-[80px]">
                                            <p className="text-xs font-bold text-slate-400">Attestation DGI non fournie</p>
                                          </div>
                                        )}
                                     </div>
                                 </div>
                             </div>

                                 <div className="space-y-4">
                                     <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                         <Building2 className="h-4 w-4 text-purple-600" />
                                         Présentation & Profil
                                     </h4>
                                     <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-6">
                                         <div>
                                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description / Mission</p>
                                             <p className="text-sm font-medium text-slate-700 leading-relaxed">
                                               {r.companyDescription || r.branding?.mission || 'Aucune description disponible.'}
                                             </p>
                                         </div>
                                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                             <div>
                                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Secteur</p>
                                                 <p className="text-sm font-bold">{r.sectorActivity || 'N/A'}</p>
                                             </div>
                                             <div>
                                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Taille / Employés</p>
                                                 <p className="text-sm font-bold">{r.companySize || 'N/A'}</p>
                                             </div>
                                             <div>
                                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Site Web</p>
                                                 {r.website ? (
                                                   <a href={r.website} target="_blank" rel="noopener" className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-2">{r.website.replace('https://', '')} <ExternalLink className="h-3 w-3" /></a>
                                                 ) : <p className="text-sm font-bold text-slate-400 italic">Aucun site renseigné</p>}
                                             </div>
                                         </div>
                                     </div>
                                 </div>

                             <DialogFooter className="p-4 md:p-8 pt-3 md:pt-4 bg-white border-t border-slate-100 gap-3 flex flex-col sm:flex-row items-stretch sm:items-center shrink-0 mt-auto">
                                 <div className="flex gap-2 flex-1">
                                   <Button 
                                     variant="ghost" 
                                     className="rounded-xl font-black text-[10px] text-slate-500 uppercase h-11 px-4 hover:bg-orange-50 hover:text-orange-600 flex-1 sm:flex-none"
                                     onClick={() => handleActionWithReason('correction')}
                                   >
                                     <AlertCircle className="mr-2 h-4 w-4" /> CORRECTION
                                   </Button>
                                   <Button 
                                     variant="outline" 
                                     className="rounded-xl font-black text-[10px] text-red-600 border-red-100 hover:bg-red-50 uppercase h-11 flex-1 px-6 sm:ml-auto"
                                     onClick={() => handleActionWithReason('reject')}
                                   >
                                     REFUSER
                                   </Button>
                                 </div>
                                 <Button 
                                   className="rounded-2xl font-black text-[10px] bg-slate-900 text-white hover:bg-slate-800 uppercase h-12 px-10 shadow-xl w-full sm:w-auto transition-all"
                                   onClick={() => {
                                       onAction(r.uid, 'approve');
                                       setIsReviewOpen(false);
                                   }}
                                 >
                                   APPROUVER LE COMPTE
                                 </Button>
                             </DialogFooter>
                         </DialogContent>
                    </Dialog>
                </div>
            </div>
        </Card>
    );
}

function ApprovalsModule({ pending, onAction }: { pending: UserProfile[], onAction: any }) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
                {pending.length === 0 ? (
                    <div className="bg-white rounded-[32px] p-10 md:p-20 text-center border-2 border-dashed border-slate-100">
                        <ShieldCheck className="h-12 w-12 md:h-16 md:w-16 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-lg md:text-xl font-bold text-slate-800">Aucune demande en attente</h3>
                        <p className="text-xs md:text-sm text-slate-400 mt-2">Tous les recruteurs sont à jour dans leurs validations.</p>
                    </div>
                ) : (
                    pending.map(r => (
                        <RecruiterReviewCard key={r.uid} r={r} onAction={onAction} />
                    ))
                )}
            </div>
        </div>
    );
}

function JobsModule({ jobs, onAction, recruiterNames }: { jobs: Job[], onAction: any, recruiterNames: Record<string, string> }) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  return (
    <>
    <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
      <CardHeader className="border-b border-slate-50 p-6 md:p-8">
        <CardTitle className="text-lg md:text-xl font-black">Modération des Offres</CardTitle>
        <CardDescription className="text-xs">Gérez la visibilité des opportunités publiées sur le marché.</CardDescription>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Offre d'emploi</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Entreprise</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Statut</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {jobs.map((j) => (
              <tr key={j.id} className="hover:bg-slate-50/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="min-w-[180px]">
                    <p className="text-sm font-black text-slate-900 leading-tight mb-1">{j.title}</p>
                    <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400">
                        <span className="flex items-center gap-1 shrink-0"><MapPin className="h-3 w-3" /> {j.location}</span>
                        <span className="flex items-center gap-1 capitalize shrink-0"><Clock className="h-3 w-3" /> {j.type}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-bold text-slate-600 whitespace-nowrap">
                  {recruiterNames[j.recruiterId] || j.companyName}
                </td>
                <td className="px-6 py-4">
                  <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 py-0.5 ${j.status === 'suspended' ? 'border-orange-100 text-orange-600 bg-orange-50' : 'border-emerald-100 text-emerald-600 bg-emerald-50'}`}>
                    {j.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right shrink-0 whitespace-nowrap">
                   <div className="flex justify-end gap-1 text-slate-400">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg hover:text-slate-900"
                          onClick={() => { setSelectedJob(j); setIsViewOpen(true); }}
                        >
                             <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50" onClick={() => onAction(j.id!, 'delete')}>
                             <Trash2 className="h-4 w-4" />
                        </Button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>

    <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
      <DialogContent className="max-w-2xl rounded-[32px] p-8 border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Aperçu de l'Offre</DialogTitle>
          <DialogDescription>Détails de l'opportunité publiée par {recruiterNames[selectedJob?.recruiterId!] || selectedJob?.companyName}.</DialogDescription>
        </DialogHeader>
        {selectedJob && (
          <div className="py-6 space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-slate-900">{selectedJob.title}</h3>
                <p className="text-slate-500 font-bold">{recruiterNames[selectedJob.recruiterId] || selectedJob.companyName} • {selectedJob.location}</p>
              </div>
              <Badge variant="outline" className="font-black uppercase">{selectedJob.type}</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Salaire</p>
                  <p className="font-bold">{selectedJob.salary || 'Non spécifié'}</p>
               </div>
               <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Domaine</p>
                  <p className="font-bold">{selectedJob.category || 'Non spécifié'}</p>
               </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-900 uppercase">Description</h4>
              <p className="text-sm text-slate-600 leading-relaxed">{selectedJob.description}</p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-900 uppercase">Exigences</h4>
              <p className="text-sm text-slate-600 leading-relaxed">{selectedJob.requirements}</p>
            </div>
          </div>
        )}
        <DialogFooter className="mt-6">
           <Button className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 font-black uppercase text-xs h-12" onClick={() => setIsViewOpen(false)}>Fermer l'aperçu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function CMSModule({ currentData, onSave }: any) {
    const [localData, setLocalData] = useState(currentData);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setLocalData(currentData);
    }, [currentData]);

    const handleSave = async () => {
        const path = 'site_config/home';
        setSaving(true);
        try {
            const configRef = doc(db, 'site_config', 'home');
            await setDoc(configRef, localData);
            onSave(localData);
            alert("Contenu du site mis à jour avec succès !");
        } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, path);
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'iconUrl') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLocalData({ ...localData, [field]: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
            <CardHeader className="p-6 md:p-8 border-b border-slate-50">
                <CardTitle className="text-lg md:text-xl font-black">Identité & Contenu</CardTitle>
                <CardDescription className="text-xs">Personnalisez le nom, le logo et les textes de votre plateforme.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 md:p-8 space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-6">
                         <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identité du Site</h4>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-900 ml-1 uppercase">Nom de la plateforme</label>
                                <Input 
                                    value={localData.siteName || ""} 
                                    onChange={(e) => setLocalData({...localData, siteName: e.target.value})}
                                    placeholder="Ex: 2NG Groupe Entreprises"
                                    className="h-12 rounded-xl border-slate-100 bg-slate-50 font-black text-base"
                                />
                            </div>
                         </div>

                         <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Section Hero</h4>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-900 ml-1 uppercase">Titre Principal</label>
                                <Input 
                                    value={localData.heroTitle} 
                                    onChange={(e) => setLocalData({...localData, heroTitle: e.target.value})}
                                    className="h-12 rounded-xl border-slate-100 bg-slate-50 font-black text-base"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-900 ml-1 uppercase">Description</label>
                                <textarea 
                                    rows={3}
                                    className="w-full p-4 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold text-slate-600 outline-none focus:border-orange-500"
                                    value={localData.heroSubtitle}
                                    onChange={(e) => setLocalData({...localData, heroSubtitle: e.target.value})}
                                />
                            </div>
                         </div>
                    </div>

                    <div className="space-y-6">
                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Branding Visual</h4>
                         
                         <div className="space-y-3">
                             <label className="text-[10px] font-black text-slate-900 ml-1 uppercase">Logo Principal</label>
                                <div 
                                    onClick={() => document.getElementById('logo-upload-input')?.click()}
                                    className="relative group aspect-video bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden hover:border-orange-500 hover:bg-slate-50/50 transition-all cursor-pointer p-4"
                                >
                                    {localData.logoUrl ? (
                                        <img src={localData.logoUrl} className="max-h-full max-w-full object-contain" alt="Logo preview" />
                                    ) : (
                                        <div className="text-center space-y-2">
                                            <ImageIcon className="h-8 w-8 text-slate-300 mx-auto" />
                                            <p className="text-[10px] font-black uppercase text-slate-400">Importer un logo JPEG/PNG</p>
                                        </div>
                                    )}
                                    <input 
                                        id="logo-upload-input"
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={(e) => handleImageUpload(e, 'logoUrl')}
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <span className="text-[10px] font-black text-white uppercase bg-orange-600 px-3 py-1.5 rounded-lg shadow-xl">Changer le logo</span>
                                    </div>
                                </div>
                                <Button 
                                    type="button"
                                    variant="outline"
                                    className="w-full h-10 rounded-xl font-bold text-xs"
                                    onClick={() => document.getElementById('logo-upload-input')?.click()}
                                >
                                    Sélectionner un fichier
                                </Button>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-900 ml-1 uppercase">Favicon / Icône</label>
                                <div 
                                    onClick={() => document.getElementById('icon-upload-input')?.click()}
                                    className="relative group aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden hover:border-orange-500 hover:bg-slate-50/50 transition-all cursor-pointer p-4"
                                >
                                    {localData.iconUrl ? (
                                        <img src={localData.iconUrl} className="h-16 w-16 object-contain" alt="Icon preview" />
                                    ) : (
                                        <div className="h-10 w-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 font-bold text-xl">A</div>
                                    )}
                                    <input 
                                        id="icon-upload-input"
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={(e) => handleImageUpload(e, 'iconUrl')}
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <span className="text-[10px] font-black text-white uppercase bg-orange-600 px-2 py-1 rounded-lg">Changer</span>
                                    </div>
                                </div>
                                <Button 
                                    type="button"
                                    variant="outline"
                                    className="w-full h-10 rounded-xl font-bold text-xs"
                                    onClick={() => document.getElementById('icon-upload-input')?.click()}
                                >
                                    Sélectionner un fichier
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                             <div className="space-y-0.5">
                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Thème Visuel</span>
                                <p className="text-[9px] font-bold text-slate-400">Couleur d'accentuation globale</p>
                             </div>
                             <div className="flex items-center gap-3">
                                 <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded">#EA580C</span>
                                 <div className="h-8 w-8 rounded-xl bg-orange-600 shadow-lg shadow-orange-600/20 cursor-pointer border-2 border-white ring-1 ring-slate-100" />
                             </div>
                         </div>

                    <div className="pt-8 border-t border-slate-50 flex justify-end">
                    <Button 
                        disabled={saving}
                        onClick={handleSave}
                        className="w-full sm:w-auto h-14 px-12 rounded-[22px] bg-slate-900 text-white font-black hover:bg-slate-800 shadow-xl shadow-slate-900/10 uppercase text-[10px] tracking-widest transition-all hover:not-disabled:-translate-y-1"
                    >
                         {saving ? "PUBLICATION..." : "Enregistrer les modifications"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function AnalyticsModule({ stats }: { stats: any }) {
    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm rounded-3xl p-8 bg-white">
                     <h3 className="font-black text-slate-900 mb-6">Répartition par Villes Actives</h3>
                     <div className="space-y-5">
                        {[
                            { city: 'Abidjan', count: 75, color: 'bg-orange-600' },
                            { city: 'Bouaké', count: 12, color: 'bg-indigo-600' },
                            { city: 'Yamoussoukro', count: 8, color: 'bg-emerald-600' },
                            { city: 'San Pedro', count: 5, color: 'bg-slate-300' },
                        ].map(c => (
                            <div key={c.city} className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span>{c.city}</span>
                                    <span className="text-slate-900">{c.count}%</span>
                                </div>
                                <div className="h-2.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                     <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${c.count}%` }}
                                        transition={{ duration: 1 }}
                                        className={`h-full ${c.color}`} 
                                     />
                                </div>
                            </div>
                        ))}
                     </div>
                </Card>
                <Card className="border-none shadow-sm rounded-3xl p-8 bg-white">
                     <h3 className="font-black text-slate-900 mb-6">Objectifs Mensuels</h3>
                     <div className="flex justify-center items-center h-full pb-8">
                         <div className="relative h-48 w-48 flex items-center justify-center">
                             <svg className="h-full w-full rotate-[-90deg]">
                                 <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-slate-50" />
                                 <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="16" fill="transparent" strokeDasharray="502" strokeDashoffset={502 * (1-0.68)} className="text-orange-600 transition-all duration-1000" />
                             </svg>
                             <div className="absolute inset-0 flex flex-col items-center justify-center">
                                 <span className="text-4xl font-black text-slate-900">68%</span>
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cross-Over</span>
                             </div>
                         </div>
                     </div>
                </Card>
            </div>
        </div>
    );
}

function SupportModule() {
    const tickets = [
        { id: '#TK-1025', user: "Moussa Sylla", subject: "Impossible de valider mon KYC", time: "Il y a 1h", status: "open" },
        { id: '#TK-0985', user: "Sarah Lamine", subject: "Modification de mon RIB", time: "Il y a 4h", status: "closed" },
        { id: '#TK-0842', user: "John DOE", subject: "Signalement offre frauduleuse", time: "Hier", status: "open" },
    ];

    return (
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="p-8 border-b border-slate-50">
                <CardTitle className="text-xl font-black">Tickets & Support Technique</CardTitle>
                <CardDescription>Répondez aux problématiques des utilisateurs de la plateforme.</CardDescription>
            </CardHeader>
            <div className="p-8 space-y-4">
                {tickets.map(t => (
                    <div key={t.id} className="flex flex-col md:flex-row items-center justify-between p-6 border border-slate-100 rounded-[28px] bg-white hover:border-orange-500 hover:shadow-lg transition-all gap-4 cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-2xl ${t.status === 'open' ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-300'}`}>
                                <MessageSquare className="h-6 w-6" />
                            </div>
                            <div>
                                <h5 className="font-black text-slate-900 text-lg group-hover:text-orange-600 transition-colors">{t.subject}</h5>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Émis par <span className="text-slate-900">{t.user}</span> • {t.id} • {t.time}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Badge className={`px-4 h-7 rounded-full font-black text-[10px] uppercase ${t.status === 'open' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                                {t.status}
                            </Badge>
                            <Button className="rounded-xl font-black text-[10px] px-6 h-10 uppercase tracking-widest bg-slate-900">RÉPONDRE</Button>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

function SettingsModule() {
  return (
    <div className="max-w-2xl space-y-6">
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white p-8">
            <h3 className="font-black text-slate-900 mb-6 text-lg">Disponibilité du Service</h3>
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Active le Mode Maintenance</p>
                        <p className="text-[11px] font-bold text-slate-400 mt-0.5">Le site affichera une page d'attente pour tous les publics.</p>
                    </div>
                    <Switch />
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Inscriptions Publiques</p>
                        <p className="text-[11px] font-bold text-slate-400 mt-0.5">Autoriser la création de nouveaux comptes Candidat/Recruteur.</p>
                    </div>
                    <Switch defaultChecked={true} />
                </div>
            </div>
        </Card>

        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white p-8">
            <h3 className="font-black text-slate-900 mb-6 text-lg">Audit & Sécurité</h3>
            <div className="space-y-4">
                <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100 flex items-center justify-between hover:bg-white transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <ShieldCheck className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                            <span className="text-sm font-black text-slate-900 uppercase">Signature Numérique Admin</span>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Activé • Sécurisé par Gemini Guard</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-lg font-black text-[10px] uppercase px-4">Paramètres</Button>
                </div>
            </div>
        </Card>
    </div>
  );
}

function LogsModule({ logs }: { logs: any[] }) {
    return (
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
            <div className="p-10 border-b border-slate-50 bg-[#FCFDFF]">
                <h3 className="text-xl font-black text-slate-900">Journal d'Audit Système</h3>
                <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Tracking complet des actions administratives majeures</p>
            </div>
            <div className="divide-y divide-slate-50">
                {logs.map(log => (
                    <div key={log.id} className="p-8 flex items-center justify-between hover:bg-slate-50/40 transition-all group">
                        <div className="flex items-center gap-5">
                            <div className="h-12 w-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                                <Clock className="h-5 w-5 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-base font-bold text-slate-800 tracking-tight leading-none mb-1.5">
                                    <span className="text-orange-600 font-black">{log.user}</span> <span className="font-medium text-slate-400 lowercase">a exécuté</span> {log.action.toLowerCase()} <span className="font-black text-slate-900 italic">"{log.target}"</span>
                                </p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{log.time} • IP: 192.168.1.XX</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                             <Badge variant="ghost" className="text-[10px] uppercase font-black bg-slate-50 text-slate-500 px-3 h-6 border-slate-100">LOG-ID-0{log.id*1024}</Badge>
                             <div className={`h-2 w-2 rounded-full ${log.type === 'danger' ? 'bg-red-500' : log.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

function Switch({ defaultChecked = false }: { defaultChecked?: boolean }) {
    const [checked, setChecked] = useState(defaultChecked);
    return (
        <button 
            onClick={() => setChecked(!checked)}
            className={`w-14 h-7 rounded-full transition-all duration-300 relative cursor-pointer outline-none focus:ring-4 focus:ring-orange-100 ${checked ? 'bg-orange-600' : 'bg-slate-200'}`}
        >
            <div className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300 ${checked ? 'translate-x-7' : 'translate-x-0'}`} />
        </button>
    );
}

function Select({ defaultValue, children }: any) {
    return (
        <select defaultValue={defaultValue} className="bg-slate-50 border border-slate-100 rounded-xl px-5 py-2.5 text-[10px] font-black uppercase text-slate-600 outline-none focus:border-orange-600 cursor-pointer transition-colors shadow-sm">
            {children}
        </select>
    );
}
