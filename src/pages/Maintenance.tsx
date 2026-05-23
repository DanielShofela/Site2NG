import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Mail, ShieldAlert, Phone, Clock } from 'lucide-react';

export default function Maintenance() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden relative">
      {/* Premium glowing backgrounds */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-amber-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Dynamic particles using framer-motion */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden/ opacity-40">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-orange-500/30"
            style={{
              left: `${15 + i * 16}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.7, 0.2],
            }}
            transition={{
              duration: 5 + i * 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 max-w-xl space-y-10"
      >
        {/* Animated Main Icon */}
        <div className="inline-flex relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 rounded-[32px] bg-gradient-to-tr from-orange-600 to-amber-500 p-[2px]"
          >
            <div className="w-full h-full bg-slate-950 rounded-[30px] flex items-center justify-center overflow-hidden">
              <span className="text-4xl font-black text-orange-500 font-sans tracking-tighter">2NG</span>
            </div>
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-1 -right-1 bg-orange-600 text-white p-2.5 rounded-2xl shadow-lg ring-4 ring-slate-950"
          >
            <Clock className="h-5 w-5" />
          </motion.div>
        </div>

        {/* Text & Status */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono text-xs uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
            Améliorations en cours
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none font-sans">
            Nous revenons <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-400">bientôt</span>
          </h1>
          <p className="text-slate-400 font-medium text-lg max-w-md mx-auto leading-relaxed">
            La plateforme 2NG Groupe Entreprises fait peau neuve pour optimiser vos recrutements et opportunités en Afrique.
          </p>
        </div>

        {/* Support Section */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-[28px] p-6 max-w-md mx-auto space-y-4 shadow-2xl backdrop-blur-md">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Besoin d'assistance urgente ?</p>
          <div className="flex flex-col gap-3">
            <a 
              href="mailto:2ng.groupeentreprise@gmail.com" 
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-orange-500/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 group-hover:bg-orange-500/20">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-400 font-black uppercase tracking-wider">Email Support</p>
                  <p className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">2ng.groupeentreprise@gmail.com</p>
                </div>
              </div>
            </a>
          </div>
        </div>

        {/* Humble Footer info */}
        <p className="text-xs text-slate-500 font-mono">
          &copy; 2026 2NG Groupe Entreprises. Tous droits réservés.
        </p>
      </motion.div>
    </div>
  );
}
