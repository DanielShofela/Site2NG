import { Briefcase, ShieldCheck, Globe2, HeartHandshake } from 'lucide-react';
import { motion } from 'motion/react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';

export default function About() {
  const { config } = useSiteConfig();
  const siteName = config.siteName || '2NG Groupe Entreprises';

  return (
    <div className="container py-24 px-6 mx-auto">
      <div className="max-w-3xl mx-auto text-center mb-20">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-8 leading-tight">
          Redéfinir le recrutement en <span className="text-orange-600 underline underline-offset-8 decoration-4">Afrique</span>
        </h1>
        <p className="text-lg text-slate-500 leading-relaxed font-medium">
          {siteName} est née d'une mission simple : connecter les talents africains exceptionnels aux opportunités qui leur correspondent vraiment, tout en simplifiant le processus pour les entreprises locales et internationales.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-16 mb-24">
        <motion.div 
          initial={{ opacity: 0, x: -25 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="bg-white p-10 rounded-[32px] border border-slate-100 shadow-sm space-y-6"
        >
          <div className="h-14 w-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
            <Globe2 className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Impact Local</h2>
          <p className="text-slate-500 leading-relaxed italic">
            Nous croyons au potentiel immense du continent. Notre plateforme est optimisée pour fonctionner même dans les zones où la connectivité est limitée.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 25 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="bg-slate-900 p-10 rounded-[32px] border border-slate-800 shadow-xl space-y-6"
        >
          <div className="h-14 w-14 bg-teal-500/20 text-teal-400 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Confiance & Sécurité</h2>
          <p className="text-slate-400 leading-relaxed italic">
            La sécurité est notre priorité. Nous vérifions scrupuleusement l'existence légale de chaque recruteur pour protéger nos candidats contre les fraudes.
          </p>
        </motion.div>
      </div>

      {/* SECTION FONDATEUR & VISION */}
      {(config.founderName || config.founderTitle || config.founderVision || config.founderPhotoUrl) && (
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 md:p-12 lg:p-16 mb-24 grid md:grid-cols-12 gap-8 md:gap-12 items-center"
        >
          {config.founderPhotoUrl && (
            <div className="md:col-span-4 flex justify-center">
              <div className="relative aspect-square w-full max-w-[280px] rounded-3xl overflow-hidden shadow-lg border border-slate-100">
                <img 
                  src={config.founderPhotoUrl} 
                  alt={config.founderName || "Fondateur"} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          )}
          <div className={config.founderPhotoUrl ? "md:col-span-8 space-y-6" : "md:col-span-12 space-y-6 max-w-3xl mx-auto text-center"}>
            <div className="space-y-2">
              <span className="text-[11px] font-black text-orange-600 uppercase tracking-widest inline-block mb-1">Mot du Fondateur</span>
              {config.founderName && (
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                  {config.founderName}
                </h2>
              )}
              {config.founderTitle && (
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{config.founderTitle}</p>
              )}
            </div>
            {config.founderVision && (
              <div className="relative">
                <span className="absolute -top-6 -left-4 text-7xl text-orange-200/50 font-serif pointer-events-none select-none">“</span>
                <p className="text-slate-600 leading-relaxed font-semibold italic text-base md:text-lg relative z-10 pl-2">
                  {config.founderVision}
                </p>
              </div>
            )}

            {/* Executive Badge Grid */}
            {(config.founderFonction || config.founderPoste || config.founderSpecialisation) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-y border-slate-100 py-4 my-2">
                {config.founderFonction && (
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fonction</span>
                    <span className="text-xs font-black text-slate-800">{config.founderFonction}</span>
                  </div>
                )}
                {config.founderPoste && (
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Poste Actuel</span>
                    <span className="text-xs font-black text-slate-800">{config.founderPoste}</span>
                  </div>
                )}
                {config.founderSpecialisation && (
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Spécialisation</span>
                    <span className="text-xs font-black text-slate-800">{config.founderSpecialisation}</span>
                  </div>
                )}
              </div>
            )}

            {config.founderBio && (
              <div className="space-y-1.5 pt-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Biographie & leadership</h4>
                <p className="text-slate-505 text-xs md:text-sm leading-relaxed font-medium">
                  {config.founderBio}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      <section className="bg-orange-600 rounded-[40px] p-12 text-center text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <HeartHandshake className="h-16 w-16 text-white/90 mx-auto mb-8" />
        <h3 className="text-3xl font-extrabold mb-6 tracking-tight">Notre Engagement</h3>
        <p className="max-w-2xl mx-auto text-orange-50 text-xl font-medium leading-relaxed italic">
          "La technologie ne remplace pas l'humain, elle le rapproche de ses aspirations profondes."
        </p>
      </section>
    </div>
  );
}

