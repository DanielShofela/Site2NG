import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { User, LogOut, Menu, X, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navLinks = [
    { name: 'Parcourir les Offres', href: '/jobs' },
    { name: 'À Propos', href: '/about' },
  ];

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

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md border-slate-100">
      <div className="container mx-auto px-4 sm:px-6 md:px-10">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl transition-transform group-hover:scale-105">
                A
              </div>
              <span className="text-2xl font-extrabold text-slate-800 tracking-tight">
                AfriJob<span className="text-orange-600 underline underline-offset-4 decoration-2">.</span>
              </span>
            </Link>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-10">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-sm font-semibold text-slate-600 transition-colors hover:text-orange-600"
                >
                  {link.name}
                </Link>
              ))}
              <div className="w-px h-6 bg-slate-200" />
              {user ? (
                <div className="flex items-center space-x-4">
                  <Link to={getDashboardLink()}>
                    <Button variant="ghost" className="text-slate-700 font-bold hover:bg-slate-100 rounded-lg h-10 px-4">
                      {user.role === 'admin' ? (
                        <ShieldAlert className="mr-2 h-4 w-4" />
                      ) : (
                        <User className="mr-2 h-4 w-4" />
                      )}
                      Mon Espace
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    className="text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg h-10" 
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link to="/signup">
                    <Button className="px-5 py-2.5 text-sm font-bold text-white bg-orange-600 rounded-lg hover:bg-orange-700 shadow-lg shadow-orange-600/20 h-10 border-none">
                      S'inscrire
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border-b md:hidden bg-white"
          >
            <div className="space-y-1 px-4 py-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block rounded-lg px-4 py-3 text-base font-bold text-slate-600 hover:bg-slate-50 hover:text-orange-600 transition-colors"
                >
                  {link.name}
                </Link>
              ))}
              <div className="mt-6 border-t border-slate-100 pt-6">
                {user ? (
                  <div className="space-y-3">
                    <Link to={getDashboardLink()} onClick={() => setIsOpen(false)} className="block w-full">
                       <Button variant="ghost" className="w-full justify-start font-bold h-12 rounded-xl">Tableau de bord</Button>
                    </Link>
                    <Button variant="outline" className="w-full h-12 rounded-xl justify-start font-bold text-red-600 border-red-100 bg-red-50" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" /> Déconnexion
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Link to="/signup" onClick={() => setIsOpen(false)} className="block w-full">
                      <Button className="w-full h-12 rounded-xl font-bold bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/20">S'inscrire</Button>
                    </Link>
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

