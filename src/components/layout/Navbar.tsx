import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { User, LogOut, Menu, X, ShieldAlert, ChevronDown, Building, Briefcase, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import PromoBanner from './PromoBanner';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'login' | 'signup' | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const { config } = useSiteConfig();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'recruiter') return '/recruiter';
    return '/candidate';
  };

  const navLinks = [
    { name: 'Accueil', href: '/' },
    { name: 'Services', href: '/services' },
    { name: 'Opportunités', href: '/opportunites' },
    { name: 'Rédiger CV/Lettre (IA)', href: '/cvlm' },
    { name: 'Entreprises', href: '/entreprises' },
    { name: 'À Propos', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 w-full flex flex-col">
      <PromoBanner />
      <nav className={`w-full transition-all duration-300 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-xl border-b border-slate-200/50 shadow-sm py-4' 
          : 'bg-white/70 backdrop-blur-md border-b border-slate-100/30 py-5'
      }`}>
      <div className="container mx-auto px-4 sm:px-6 md:px-10">
        <div className="flex h-12 items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              {config.logoUrl ? (
                <img src={config.logoUrl} alt={config.siteName} className="h-10 w-auto object-contain transition-transform group-hover:scale-105" />
              ) : (
                <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-black text-xl transition-all duration-300 group-hover:scale-105 group-hover:bg-orange-700 shadow-lg shadow-orange-600/20">
                  {config.siteName ? config.siteName[0] : '2'}
                </div>
              )}
              <span className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter">
                {config.siteName || '2NG Groupe Entreprises'}<span className="text-orange-600">.</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Center */}
          <div className="hidden lg:block">
            <div className="flex items-center space-x-7">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    to={link.href}
                    className={`text-sm font-bold transition-all duration-300 hover:text-orange-600 hover:scale-[1.02] cursor-pointer ${
                      isActive ? 'text-orange-600 font-extrabold' : 'text-slate-600'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Desktop Actions Right */}
          <div className="hidden lg:block">
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-3">
                  <Link 
                    to={getDashboardLink()} 
                    title="Mon Espace" 
                    className="relative group rounded-full transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none"
                  >
                    {user.photoUrl ? (
                      <img 
                        src={user.photoUrl} 
                        alt="Photo de profil" 
                        className="h-10 w-10 rounded-full object-cover shadow-sm ring-2 ring-orange-500/80 hover:ring-orange-600 transition-all" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-black text-sm shadow-sm ring-2 ring-orange-500/80 hover:bg-orange-200 transition-all">
                        {user.role === 'admin' ? (
                          <ShieldAlert className="h-5 w-5 text-orange-600" />
                        ) : (
                          <User className="h-5 w-5 text-orange-600" />
                        )}
                      </div>
                    )}
                  </Link>
                  <Button 
                    variant="ghost" 
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl h-10 w-10 p-0 transition-all duration-300" 
                    onClick={handleLogout}
                    title="Déconnexion"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  {/* Connexion Button */}
                  <Link to="/login">
                    <Button 
                      variant="ghost" 
                      className="px-5 py-2.5 text-sm font-extrabold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-2xl h-11 border-none shadow-none flex items-center gap-1.5 transition-all duration-300 hover:scale-[1.02]"
                    >
                      Connexion
                    </Button>
                  </Link>

                  {/* Inscription Button */}
                  <Link to="/signup">
                    <Button 
                      className="px-5 py-2.5 text-sm font-extrabold text-white bg-orange-600 rounded-2xl hover:bg-orange-700 shadow-lg shadow-orange-600/20 hover:shadow-orange-600/30 h-11 border-none flex items-center gap-1.5 transition-all duration-300 hover:scale-[1.02]"
                    >
                      Inscription
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden animate-none">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center rounded-2xl p-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors focus:outline-none"
              title="Toggle mobile menu"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Floating Compact Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute top-full left-3 right-3 sm:left-auto sm:right-6 sm:w-88 mt-2 z-50 bg-white/98 backdrop-blur-2xl border border-slate-200/90 rounded-2xl shadow-2xl p-3 sm:p-4 text-slate-800 lg:hidden overflow-hidden"
          >
            {/* Compact 2-column Nav Grid */}
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    to={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`px-3 py-2 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-between cursor-pointer ${
                      isActive 
                        ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20' 
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-orange-600 border border-slate-100/80'
                    }`}
                  >
                    <span className="truncate">{link.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Compact Action Footer */}
            <div className="pt-2.5 border-t border-slate-100">
              {user ? (
                <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                  <Link to={getDashboardLink()} onClick={() => setIsOpen(false)} className="flex items-center gap-2.5 flex-1 px-1">
                    {user.photoUrl ? (
                      <img 
                        src={user.photoUrl} 
                        alt="Photo de profil" 
                        className="h-9 w-9 rounded-full object-cover ring-2 ring-orange-500 shrink-0" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 ring-2 ring-orange-500 font-black text-xs">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                    <span className="font-black text-xs text-slate-800">Mon Espace</span>
                  </Link>
                  <Button 
                    variant="ghost" 
                    className="h-8 w-8 p-0 rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0" 
                    onClick={handleLogout}
                    title="Déconnexion"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Link to="/login" onClick={() => setIsOpen(false)} className="w-full">
                      <Button variant="outline" className="w-full h-10 rounded-xl font-black text-xs text-slate-800 bg-slate-100 hover:bg-slate-200 border-none">
                        Connexion
                      </Button>
                    </Link>
                    <Link to="/signup" onClick={() => setIsOpen(false)} className="w-full">
                      <Button className="w-full h-10 rounded-xl font-black text-xs text-white bg-orange-600 hover:bg-orange-700 shadow-md shadow-orange-600/20 border-none">
                        Inscription
                      </Button>
                    </Link>
                  </div>
                  {/* Subtle Role Direct Shortcuts */}
                  <div className="flex items-center justify-between px-1 text-[10px] font-bold text-slate-400">
                    <Link to="/auth/login/member" onClick={() => setIsOpen(false)} className="hover:text-orange-600 transition-colors">
                      Espace Candidat ➔
                    </Link>
                    <Link to="/auth/login/company" onClick={() => setIsOpen(false)} className="hover:text-orange-600 transition-colors">
                      Espace Entreprise ➔
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </nav>
    </div>
  );
}
