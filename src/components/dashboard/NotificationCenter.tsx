import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Clock, 
  Sparkles, 
  Building2, 
  Play, 
  X, 
  Check, 
  ChevronRight,
  User,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { safeSetItem } from '@/lib/safeStorage';
import { useAuth } from '@/contexts/AuthContext';

export interface MockNotification {
  id: string;
  title: string;
  message: string;
  type: 'profile_view' | 'application_status' | 'system' | 'new_application';
  status: 'read' | 'unread';
  timestamp: string; // ISO String
  companyName?: string;
  jobTitle?: string;
  candidateName?: string;
}

const DEFAULT_CANDIDATE_NOTIFS: MockNotification[] = [
  {
    id: 'notif-1',
    title: 'Profil consulté 👁️',
    message: 'Votre profil a été consulté par Orange Côte d\'Ivoire via la CVthèque.',
    type: 'profile_view',
    status: 'unread',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    companyName: 'Orange Côte d\'Ivoire'
  },
  {
    id: 'notif-2',
    title: 'Candidature retenue ! 🎉',
    message: 'Félicitations, votre candidature pour le poste de Développeur Fullstack chez 2NG Groupe a été présélectionnée !',
    type: 'application_status',
    status: 'unread',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    companyName: '2NG Groupe',
    jobTitle: 'Développeur Fullstack'
  },
  {
    id: 'notif-3',
    title: 'Profil consulté 👁️',
    message: 'Wave Côte d\'Ivoire a consulté vos informations et téléchargé votre CV PDF.',
    type: 'profile_view',
    status: 'read',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    companyName: 'Wave Côte d\'Ivoire'
  },
  {
    id: 'notif-4',
    title: 'Candidature consultée 📂',
    message: 'Votre candidature pour le poste de Designer UI/UX chez MTN Côte d\'Ivoire a été ouverte par le recruteur.',
    type: 'application_status',
    status: 'read',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    companyName: 'MTN Côte d\'Ivoire',
    jobTitle: 'Designer UI/UX'
  }
];

const DEFAULT_RECRUITER_NOTIFS: MockNotification[] = [
  {
    id: 'notif-r1',
    title: 'Nouvelle candidature ! 📂',
    message: 'Jean-Marc Kouadio a postulé à votre offre : Développeur React & TypeScript.',
    type: 'new_application',
    status: 'unread',
    timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    candidateName: 'Jean-Marc Kouadio',
    jobTitle: 'Développeur React & TypeScript'
  },
  {
    id: 'notif-r2',
    title: 'Profil entreprise consulté 🏢',
    message: 'Votre page profil entreprise a été consultée par 12 candidats qualifiés aujourd\'hui.',
    type: 'profile_view',
    status: 'unread',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'notif-r3',
    title: 'Nouvelle candidature ! 📂',
    message: 'Awa Diop a postulé à votre offre : Community Manager Senior.',
    type: 'new_application',
    status: 'read',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    candidateName: 'Awa Diop',
    jobTitle: 'Community Manager Senior'
  }
];

const COMPANIES = [
  'Orange Côte d\'Ivoire',
  '2NG Groupe',
  'Wave Côte d\'Ivoire',
  'MTN Côte d\'Ivoire',
  'Moov Africa',
  'Société Générale CI',
  'CFAO Motors',
  'Brassivoire',
  'Weblogy',
  'NSIA Banque'
];

const JOBS = [
  'Développeur React Junior',
  'Chef de Projet Digital',
  'Administrateur Systèmes & Cloud',
  'Spécialiste IA & Data Science',
  'UI/UX Designer',
  'Analyste Financier',
  'Responsable RH'
];

const STATUSES = [
  { label: 'Consultée', color: 'text-blue-600', val: 'viewed' },
  { label: 'Présélectionnée', color: 'text-emerald-600', val: 'shortlisted' },
  { label: 'Non retenue', color: 'text-rose-600', val: 'rejected' }
];

const CANDIDATES = [
  'Koffi Amenan',
  'Yao N\'Guessan',
  'Aïcha Koné',
  'Marc-Antoine Touré',
  'Sonia Bakayoko',
  'Gilles Oulai',
  'Marie-Noëlle Diallo'
];

export default function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<MockNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showSimPanel, setShowSimPanel] = useState(false);
  const [autoSimEnabled, setAutoSimEnabled] = useState(false);
  const [activeToast, setActiveToast] = useState<MockNotification | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isCandidate = user?.role === 'candidate';

  // Load notifications from localStorage or load defaults
  useEffect(() => {
    if (!user) return;
    const key = `2ng_notifications_${user.uid}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setNotifications(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing notifications', e);
        const defaults = isCandidate ? DEFAULT_CANDIDATE_NOTIFS : DEFAULT_RECRUITER_NOTIFS;
        setNotifications(defaults);
        safeSetItem(key, JSON.stringify(defaults));
      }
    } else {
      const defaults = isCandidate ? DEFAULT_CANDIDATE_NOTIFS : DEFAULT_RECRUITER_NOTIFS;
      setNotifications(defaults);
      safeSetItem(key, JSON.stringify(defaults));
    }
  }, [user?.uid, isCandidate]);

  // Persist notifications helper
  const saveNotifications = (newNotifs: MockNotification[]) => {
    if (!user) return;
    setNotifications(newNotifs);
    safeSetItem(`2ng_notifications_${user.uid}`, JSON.stringify(newNotifs));
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-simulation of mock views/updates
  useEffect(() => {
    if (!autoSimEnabled) return;

    const interval = setInterval(() => {
      triggerRandomNotification();
    }, 18000); // simulation interval

    return () => clearInterval(interval);
  }, [autoSimEnabled, notifications, isCandidate]);

  const triggerRandomNotification = () => {
    const isProfileView = Math.random() > 0.5;
    
    if (isCandidate) {
      if (isProfileView) {
        simulateCandidateProfileView();
      } else {
        simulateCandidateStatusChange();
      }
    } else {
      if (isProfileView) {
        simulateRecruiterProfileView();
      } else {
        simulateRecruiterNewApp();
      }
    }
  };

  // Notification Toast display helper
  const showToast = (notif: MockNotification) => {
    setActiveToast(notif);
    // Auto clear toast after 5 seconds
    setTimeout(() => {
      setActiveToast(prev => prev?.id === notif.id ? null : prev);
    }, 5500);
  };

  // Candidates Simulation Actions
  const simulateCandidateProfileView = () => {
    const company = COMPANIES[Math.floor(Math.random() * COMPANIES.length)];
    const notif: MockNotification = {
      id: `sim-view-${Date.now()}`,
      title: 'Profil consulté 👁️',
      message: `${company} a consulté votre profil candidat pour évaluer vos compétences.`,
      type: 'profile_view',
      status: 'unread',
      timestamp: new Date().toISOString(),
      companyName: company
    };
    saveNotifications([notif, ...notifications]);
    showToast(notif);
  };

  const simulateCandidateStatusChange = () => {
    const company = COMPANIES[Math.floor(Math.random() * COMPANIES.length)];
    const job = JOBS[Math.floor(Math.random() * JOBS.length)];
    const statusObj = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    
    const notif: MockNotification = {
      id: `sim-status-${Date.now()}`,
      title: 'Statut de candidature mis à jour 📋',
      message: `Votre candidature pour le poste de "${job}" chez ${company} est passée au statut : ${statusObj.label}.`,
      type: 'application_status',
      status: 'unread',
      timestamp: new Date().toISOString(),
      companyName: company,
      jobTitle: job
    };
    saveNotifications([notif, ...notifications]);
    showToast(notif);
  };

  // Recruiter Simulation Actions
  const simulateRecruiterProfileView = () => {
    const count = Math.floor(Math.random() * 8) + 3;
    const notif: MockNotification = {
      id: `sim-rec-view-${Date.now()}`,
      title: 'Vues en hausse ! 📈',
      message: `Votre fiche d'entreprise a reçu ${count} nouvelles visites de candidats intéressés ce midi.`,
      type: 'profile_view',
      status: 'unread',
      timestamp: new Date().toISOString(),
    };
    saveNotifications([notif, ...notifications]);
    showToast(notif);
  };

  const simulateRecruiterNewApp = () => {
    const candidate = CANDIDATES[Math.floor(Math.random() * CANDIDATES.length)];
    const job = JOBS[Math.floor(Math.random() * JOBS.length)];
    const notif: MockNotification = {
      id: `sim-rec-app-${Date.now()}`,
      title: 'Nouvelle candidature ! 📂',
      message: `${candidate} vient de postuler pour le poste de : ${job}. Consultez son dossier.`,
      type: 'new_application',
      status: 'unread',
      timestamp: new Date().toISOString(),
      candidateName: candidate,
      jobTitle: job
    };
    saveNotifications([notif, ...notifications]);
    showToast(notif);
  };

  // Actions
  const markAsRead = (id: string) => {
    saveNotifications(
      notifications.map(n => n.id === id ? { ...n, status: 'read' as const } : n)
    );
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveNotifications(notifications.filter(n => n.id !== id));
  };

  const markAllRead = () => {
    saveNotifications(notifications.map(n => ({ ...n, status: 'read' as const })));
  };

  const clearAll = () => {
    saveNotifications([]);
  };

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  const getNotifIcon = (type: MockNotification['type']) => {
    switch (type) {
      case 'profile_view':
        return <Eye className="h-4 w-4 text-purple-500" />;
      case 'application_status':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'new_application':
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
    }
  };

  const getFormattedTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      
      if (diffMins < 1) return 'À l\'instant';
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      if (diffHours < 24) return `Il y a ${diffHours} h`;
      return new Date(isoString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef} id="notification-center-module">
      {/* Dynamic Toast Alert (Floats on Top) */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: -20, scale: 0.95, x: '-50%' }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm sm:max-w-md bg-slate-900 text-white rounded-2xl shadow-2xl shadow-slate-950/40 p-4 border border-slate-800/80 flex gap-3.5 items-start"
          >
            <div className="h-9 w-9 bg-orange-600/20 text-orange-500 rounded-xl flex items-center justify-center shrink-0 border border-orange-500/10">
              <Bell className="h-4.5 w-4.5 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wider text-orange-500">Nouveau Signal !</p>
                <span className="text-[9px] text-slate-400 font-semibold">{getFormattedTime(activeToast.timestamp)}</span>
              </div>
              <h4 className="text-xs font-bold text-white mt-1 leading-snug">{activeToast.title}</h4>
              <p className="text-[11px] font-medium text-slate-300 mt-1.5 leading-relaxed">{activeToast.message}</p>
            </div>
            <button 
              onClick={() => setActiveToast(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative h-11 w-11 sm:h-12 sm:w-12 p-0 rounded-xl md:rounded-2xl border border-slate-200 hover:bg-slate-50 shadow-md flex items-center justify-center transition-all cursor-pointer ${
          isOpen ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-white text-slate-600'
        }`}
        title="Notifications"
      >
        <Bell className={`h-5 w-5 sm:h-5.5 sm:w-5.5 ${unreadCount > 0 ? 'animate-none text-orange-600' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute right-0 mt-3 w-80 sm:w-[380px] bg-white border border-slate-150 shadow-2xl rounded-3xl z-50 overflow-hidden origin-top-right flex flex-col max-h-[520px] text-left"
          >
            {/* Header Block */}
            <div className="bg-slate-950 text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5 text-white">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  Alertes & Activités
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {unreadCount} nouvelle(s) notification(s) simulée(s)
                </p>
              </div>
              <div className="flex gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg text-white font-extrabold uppercase tracking-wide transition-colors cursor-pointer"
                  >
                    Tout lire
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[280px]">
              {notifications.length === 0 ? (
                <div className="py-12 px-6 text-center space-y-3">
                  <div className="h-12 w-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                    <Bell className="h-6 w-6" />
                  </div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Aucun signal récent</h4>
                  <p className="text-[11px] font-semibold text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Utilisez le module expérimental ci-dessous pour simuler instantanément des alertes de vues de profil ou de changements de statut !
                  </p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={`p-4 hover:bg-slate-50 transition-colors flex gap-3 cursor-pointer relative group ${
                      notif.status === 'unread' ? 'bg-orange-50/20' : ''
                    }`}
                  >
                    {/* Unread indicator */}
                    {notif.status === 'unread' && (
                      <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-orange-600" />
                    )}

                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      notif.status === 'unread' ? 'bg-orange-100/60' : 'bg-slate-100'
                    }`}>
                      {getNotifIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-extrabold text-slate-800 truncate">{notif.title}</h4>
                        <span className="text-[9px] text-slate-400 font-semibold shrink-0">
                          {getFormattedTime(notif.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-600 mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => deleteNotification(notif.id, e)}
                      className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Simulated Lab / Testing Bench Controls */}
            <div className="bg-slate-50 border-t border-slate-150 p-4">
              <button 
                onClick={() => setShowSimPanel(!showSimPanel)}
                className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 font-black uppercase text-[10px] text-slate-600">
                  <Sparkles className="h-4 w-4 text-orange-500 animate-pulse" />
                  🔬 Test Lab : Simuler des signaux
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  {showSimPanel ? 'Masquer' : 'Afficher'}
                </span>
              </button>

              <AnimatePresence>
                {showSimPanel && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-3 space-y-3.5"
                  >
                    <p className="text-[10px] font-semibold text-slate-400 leading-normal">
                      Simulez de vrais événements systèmes. Ils déclencheront des alertes push/toast animées en temps réel sur votre écran.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={isCandidate ? simulateCandidateProfileView : simulateRecruiterProfileView}
                        className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-1 border-none shadow transition-colors cursor-pointer"
                      >
                        <Eye className="h-4 w-4 text-purple-400" />
                        <span>Vue de Profil</span>
                      </button>
                      <button
                        onClick={isCandidate ? simulateCandidateStatusChange : simulateRecruiterNewApp}
                        className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-1 border-none shadow transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span>{isCandidate ? 'Statut Offre' : 'Candidature'}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
                      <div>
                        <p className="text-[10px] font-black text-slate-700 uppercase">Simulation auto</p>
                        <p className="text-[9px] font-medium text-slate-450">Un signal aléatoire toutes les 18s</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={autoSimEnabled}
                          onChange={(e) => setAutoSimEnabled(e.target.checked)}
                          className="sr-only peer cursor-pointer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Clear Actions Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-slate-100 bg-white px-4 py-3 flex justify-between items-center text-xs font-bold text-slate-400">
                <span>{notifications.length} au total</span>
                <button
                  onClick={clearAll}
                  className="text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer font-bold"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Effacer tout
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
