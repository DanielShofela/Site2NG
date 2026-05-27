import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { User, LogOut, Menu, X, ShieldAlert, ChevronDown, Building, Briefcase, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';

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
    { name: 'Entreprises', href: '/entreprises' },
    { name: 'À Propos', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
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
                <div className="flex items-center space-x-4">
                  <Link to={getDashboardLink()}>
                    <Button variant="outline" className="text-slate-700 hover:text-orange-600 border-slate-200 hover:border-orange-200 font-extrabold rounded-2xl h-11 px-5 shadow-sm transition-all duration-300 hover:scale-[1.02]">
                      {user.role === 'admin' ? (
                        <ShieldAlert className="mr-2 h-4.5 w-4.5 text-orange-600" />
                      ) : (
                        <User className="mr-2 h-4.5 w-4.5 text-orange-600" />
                      )}
                      Mon Espace
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl h-11 w-11 p-0 transition-all duration-300" 
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

      {/* Fullscreen Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="fixed inset-x-0 top-[68px] z-40 bg-white block lg:hidden overflow-y-auto shadow-xl border-b border-slate-200/80 max-h-[85vh] pb-10"
          >
            <div className="space-y-1 px-5 py-4">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    to={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`block rounded-xl px-4 py-2.5 text-xs font-black transition-all uppercase tracking-wider border-b border-dashed border-slate-100 last:border-0 ${
                      isActive ? 'bg-orange-50 text-orange-600' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
              
              <div className="mt-4 border-t border-slate-100 pt-5 px-1">
                {user ? (
                  <div className="space-y-4">
                    <Link to={getDashboardLink()} onClick={() => setIsOpen(false)} className="block w-full">
                       <Button className="w-full justify-center font-extrabold h-14 rounded-2xl bg-slate-900 text-white flex items-center gap-2">
                         <User className="h-5 w-5" /> Accéder à mon Espace
                       </Button>
                    </Link>
                    <Button variant="outline" className="w-full h-14 rounded-2xl justify-center font-extrabold text-red-600 border-red-200 bg-red-50 hover:bg-red-100 flex items-center gap-2" onClick={handleLogout}>
                      <LogOut className="h-5 w-5" /> Déconnexion
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Collapsible/Group Login */}
                    <div className="space-y-3">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Se Connecter :</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Link to="/auth/login/member" onClick={() => setIsOpen(false)} className="block w-full">
                          <Button variant="outline" className="w-full h-14 rounded-2xl font-black text-xs uppercase bg-slate-50 border-slate-200 text-slate-800">Candidat</Button>
                        </Link>
                        <Link to="/auth/login/company" onClick={() => setIsOpen(false)} className="block w-full">
                          <Button variant="outline" className="w-full h-14 rounded-2xl font-black text-xs uppercase bg-slate-50 border-slate-200 text-slate-800">Recruteur</Button>
                        </Link>
                      </div>
                    </div>

                    {/* S'inscrire options */}
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">S'enregistrer :</p>
                      <div className="flex flex-col gap-3">
                        <Link to="/auth/register/member" onClick={() => setIsOpen(false)} className="block w-full">
                          <Button className="w-full h-14 rounded-2xl font-extrabold bg-orange-600 text-white shadow-lg shadow-orange-600/10 flex items-center justify-center gap-1.5">
                            Créer mon profil Adhérent
                          </Button>
                        </Link>
                        <Link to="/auth/register/company" onClick={() => setIsOpen(false)} className="block w-full">
                          <Button variant="secondary" className="w-full h-14 rounded-2xl font-extrabold bg-slate-100 text-slate-800 border-none flex items-center justify-center gap-1.5">
                            Créer un espace Entreprise
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
