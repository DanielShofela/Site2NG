import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft, Home, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';

export default function NotFound() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getDashboardLink = () => {
    if (!user) return '/';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'recruiter') return '/recruiter';
    return '/candidate';
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] text-slate-900 flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden relative">
      {/* Decorative blurs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-orange-100/40 rounded-full blur-[100px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-md space-y-8"
      >
        <div className="inline-flex items-center justify-center p-6 bg-orange-50 text-orange-600 rounded-[32px] shadow-lg shadow-orange-600/5 animate-bounce">
          <ShieldAlert className="h-14 w-14" />
        </div>

        <div className="space-y-3">
          <h1 className="text-8xl font-black font-mono tracking-tighter text-slate-900 leading-none">
            <span className="text-orange-600">4</span>0<span className="text-orange-600">4</span>
          </h1>
          <h2 className="text-2xl font-black text-slate-900">Page Introuvable</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            Désolé, la page que vous recherchez n'existe pas ou a été déplacée. Utilisez les boutons ci-dessous pour retourner en lieu sûr.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Button 
            onClick={() => navigate(-1)}
            variant="outline" 
            className="w-full sm:w-auto h-12 px-6 border-slate-200 hover:border-orange-200 hover:text-orange-600 font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <Link to="/" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto h-12 px-6 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-600/15 transition-all">
              <Home className="h-4 w-4" />
              Accueil
            </Button>
          </Link>
          {user && (
            <Link to={getDashboardLink()} className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full sm:w-auto h-12 px-6 bg-slate-900 text-white hover:bg-slate-800 font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all">
                <Sparkles className="h-4 w-4 text-orange-400" />
                Mon Espace
              </Button>
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}
