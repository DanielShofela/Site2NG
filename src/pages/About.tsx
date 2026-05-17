import { Briefcase, ShieldCheck, Globe2, HeartHandshake } from 'lucide-react';
import { motion } from 'motion/react';

export default function About() {
  return (
    <div className="container py-24 px-6 mx-auto">
      <div className="max-w-3xl mx-auto text-center mb-20">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-8 leading-tight">
          Redéfinir le recrutement en <span className="text-orange-600 underline underline-offset-8 decoration-4">Afrique</span>
        </h1>
        <p className="text-lg text-slate-500 leading-relaxed font-medium">
          AfriJob est née d'une mission simple : connecter les talents africains exceptionnels aux opportunités qui leur correspondent vraiment, tout en simplifiant le processus pour les entreprises locales et internationales.
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

