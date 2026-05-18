import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Briefcase, Building2, Search, ArrowRight, CheckCircle2, Globe2, LayoutDashboard } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';

export default function Home() {
  const { user } = useAuth();
  const { config } = useSiteConfig();
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'recruiter') return '/recruiter';
    return '/candidate';
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24 relative overflow-hidden">
        <div className="text-center mb-16 max-w-3xl relative z-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-6 flex justify-center"
          >
            <Badge variant="outline" className="px-4 py-1.5 border-orange-200 text-orange-600 bg-orange-50 rounded-full font-bold uppercase tracking-wider text-[10px]">
              Placements & Recrutement Pro 🌍
            </Badge>
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-4xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-6"
          >
            {config.heroTitle || "Trouvez le talent qui propulsera votre entreprise"}
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto"
          >
            {config.heroSubtitle || "La plateforme de recrutement nouvelle génération pour l'Afrique."}
          </motion.p>
          
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8"
            >
              <Button className="h-14 px-8 bg-slate-900 text-white rounded-2xl font-bold shadow-xl flex items-center gap-2 mx-auto" asChild nativeButton={false}>
                <Link to={getDashboardLink()}>
                  <LayoutDashboard className="h-5 w-5" /> Accéder à mon tableau de bord
                </Link>
              </Button>
            </motion.div>
          )}
        </div>

        {/* Main Choice Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl relative z-10 px-4">
          {/* Candidate Portal */}
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="group bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm hover:border-orange-500 transition-all cursor-default relative overflow-hidden"
          >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-50 rounded-full opacity-50 group-hover:scale-150 transition-transform"></div>
            <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6">
              <Briefcase className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Je cherche un emploi</h3>
            <p className="text-slate-500 mb-6 text-sm">Créez votre profil CV en 2 minutes, postulez aux meilleures offres et gérez votre carrière mobile-first.</p>
            <ul className="space-y-3 mb-8">
              {[
                "Inscription rapide par téléphone",
                "Suivi des candidatures en direct",
                "Export CV PDF automatisé"
              ].map((text, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-600 italic">
                  <div className="w-1.5 h-1.5 bg-orange-600 rounded-full"></div> {text}
                </li>
              ))}
            </ul>
            <Button className="w-full py-7 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl transition-colors text-lg shadow-lg shadow-orange-600/20" asChild nativeButton={false}>
              <Link to={user ? "/candidate" : "/signup?role=candidate"}>
                {user && user.role === 'candidate' ? "Mon Profil Candidat" : "Démarrer mon profil"}
              </Link>
            </Button>
          </motion.div>

          {/* Recruiter Portal */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="group bg-slate-900 p-8 rounded-[40px] border border-slate-800 shadow-xl hover:border-teal-500 transition-all cursor-default relative overflow-hidden"
          >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-teal-500/10 rounded-full opacity-50 group-hover:scale-150 transition-transform"></div>
            <div className="w-14 h-14 bg-teal-500/20 text-teal-400 rounded-2xl flex items-center justify-center mb-6">
              <Building2 className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Je recrute des talents</h3>
            <p className="text-slate-400 mb-6 text-sm">Accédez à une CVthèque vérifiée, publiez vos offres et gérez vos recrutements avec des outils pro.</p>
            <ul className="space-y-3 mb-8">
              {[
                "Validation par admin en 72h",
                "Gestion multi-offres",
                "Statistiques de performance"
              ].map((text, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-400 italic">
                  <div className="w-1.5 h-1.5 bg-teal-500 rounded-full"></div> {text}
                </li>
              ))}
            </ul>
            <Button className="w-full py-7 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-2xl transition-colors text-lg shadow-lg shadow-teal-600/20 border-none" asChild nativeButton={false}>
              <Link to={user ? "/recruiter" : "/signup?role=recruiter"}>
                {user && user.role === 'recruiter' ? "Mon Espace Recruteur" : "Publier une offre"}
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Market Stats Bar */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 flex flex-wrap justify-center gap-10 md:gap-16 border-t border-slate-200 pt-10"
        >
          {[
            { label: "Candidats", value: "12,450" },
            { label: "Recruteurs", value: "840" },
            { label: "Pays Africains", value: "15" },
            { label: "Recrutements", value: "4,100" }
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">{stat.label}</p>
            </div>
          ))}
        </motion.div>
        
        {/* Decorative elements */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-orange-100 rounded-full blur-3xl opacity-30 pointer-events-none" />
        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-teal-100 rounded-full blur-3xl opacity-20 pointer-events-none" />
      </main>

      {/* Footer */}
      <footer className="px-6 md:px-10 py-8 bg-white border-t border-slate-100 mt-auto">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Plateforme en ligne
            </span>
            <span className="text-xs font-medium text-slate-400">© 2026 {config.siteName || 'AfriJob'}. Tous droits réservés.</span>
          </div>
          <div className="flex gap-8 items-center">
            <Link to="/about" className="text-xs font-bold text-slate-500 hover:text-orange-600 uppercase tracking-tight">À Propos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

