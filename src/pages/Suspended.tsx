import React, { useState, useEffect } from 'react';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Send, AlertTriangle, ShieldCheck } from 'lucide-react';

interface Feather {
  id: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  rotate: number;
}

export default function Suspended() {
  const { user, logout } = useAuth();
  const [animationState, setAnimationState] = useState<'idle' | 'flying' | 'hit' | 'falling' | 'dizzy'>('flying');
  const [feathers, setFeathers] = useState<Feather[]>([]);
  const [impactEmoji, setImpactEmoji] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  // Controls for animated sub-elements
  const owlControls = useAnimation();
  const shadowControls = useAnimation();
  const wallControls = useAnimation();

  // Track active animation cycles to avoid concurrent overlapping runs
  const activeCycleId = React.useRef(0);
  const timeoutIdsRef = React.useRef<number[]>([]);

  // Function to clear all scheduled timeouts
  const clearCurrentTimeouts = () => {
    timeoutIdsRef.current.forEach((id) => clearTimeout(id));
    timeoutIdsRef.current = [];
  };

  // Run the sequence with a specific cycle identifier
  const startSequence = async (cycleId: number) => {
    if (cycleId !== activeCycleId.current) return;

    // Reset state
    setAnimationState('flying');
    setFeathers([]);
    setImpactEmoji(false);

    // Coordinate maps
    // Start of trajectory (off-screen left inside container)
    await Promise.all([
      owlControls.set({ x: -180, y: -20, rotate: 0, scale: 1 }),
      shadowControls.set({ x: -180, scaleX: 1, opacity: 0.3, filter: 'blur(3px)' })
    ]);

    if (cycleId !== activeCycleId.current) return;

    // Flying smoothly to the wall
    await Promise.all([
      owlControls.start({
        x: 40,
        y: [-25, -35, -20, -30],
        transition: {
          x: { duration: 1.8, ease: 'easeOut' },
          y: { duration: 1.8, ease: 'easeInOut' }
        }
      }),
      shadowControls.start({
        x: 40,
        scaleX: [1, 0.8, 1.1, 0.9],
        opacity: [0.3, 0.2, 0.4, 0.25],
        transition: { duration: 1.8, ease: 'easeInOut' }
      })
    ]);

    if (cycleId !== activeCycleId.current) return;

    // Hit event !
    setAnimationState('hit');
    setImpactEmoji(true);

    // Trigger wall shaking, feathers bursting, and sound waves
    const burstFeathers = Array.from({ length: 6 }).map((_, i) => ({
      id: Date.now() + i,
      startX: 40,
      startY: -30,
      targetX: 40 + (Math.random() * 80 - 45),
      targetY: -30 + (Math.random() * 60 - 40),
      rotate: Math.random() * 360
    }));
    setFeathers(burstFeathers);

    await Promise.all([
      wallControls.start({
        x: [0, 8, -6, 5, -3, 0],
        transition: { duration: 0.4 }
      }),
      owlControls.start({
        scaleY: 0.65,
        scaleX: 1.25,
        x: 35,
        rotate: -15,
        transition: { duration: 0.1 }
      })
    ]);

    if (cycleId !== activeCycleId.current) return;

    // Restore shape briefly and start rotating as it falls
    await owlControls.start({
      scaleY: 1,
      scaleX: 1,
      rotate: 150,
      transition: { duration: 0.15 }
    });

    if (cycleId !== activeCycleId.current) return;

    // Falling down to ground shadow
    setAnimationState('falling');
    await Promise.all([
      owlControls.start({
        y: 65,
        rotate: 195,
        transition: { type: 'spring', stiffness: 160, damping: 9 }
      }),
      shadowControls.start({
        scaleX: 1.3,
        opacity: 0.7,
        transition: { duration: 0.5, ease: 'linear' }
      })
    ]);

    if (cycleId !== activeCycleId.current) return;

    // Hit the ground & bounce slightly
    setAnimationState('dizzy');
    await Promise.all([
      owlControls.start({
        y: [65, 52, 60],
        rotate: [195, 185, 180],
        x: 30,
        transition: { duration: 0.4, ease: 'easeOut' }
      }),
      shadowControls.start({
        scaleX: [1.3, 1.4, 1.2],
        opacity: [0.7, 0.85, 0.8],
        transition: { duration: 0.4 }
      })
    ]);

    if (cycleId !== activeCycleId.current) return;

    // Auto fade impact emoji text after 2 seconds
    const impactTimeout = window.setTimeout(() => {
      if (cycleId === activeCycleId.current) {
        setImpactEmoji(false);
      }
    }, 2000);

    // Stay dizzy on the ground for a short while, then loop to start again!
    const nextCycleTimeout = window.setTimeout(() => {
      if (cycleId === activeCycleId.current) {
        triggerNewCycle();
      }
    }, 3500);

    timeoutIdsRef.current.push(impactTimeout, nextCycleTimeout);
  };

  const triggerNewCycle = () => {
    clearCurrentTimeouts();
    activeCycleId.current += 1;
    startSequence(activeCycleId.current);
  };

  useEffect(() => {
    triggerNewCycle();
    return () => {
      clearCurrentTimeouts();
      activeCycleId.current += 1;
    };
  }, []);

  const handleOwlClick = () => {
    setClickCount((prev) => prev + 1);
    // Restart flight cycle immediately
    triggerNewCycle();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans">
      {/* Background patterns */}
      <div className="absolute inset-0 z-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
      
      {/* Decorative large glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-100/45 rounded-full blur-3xl -z-10" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-[580px] bg-white border border-slate-100 shadow-[0_32px_80px_rgba(15,23,42,0.08)] rounded-[40px] p-8 md:p-10 text-center flex flex-col items-center"
      >
        {/* Status indicator pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-100 text-red-600 text-[10px] font-black uppercase tracking-widest mb-6">
          <AlertTriangle className="h-3 w-3 animate-pulse" />
          Statut Administratif : Suspendu
        </div>

        {/* Animated Owlstacle Stage */}
        <div className="relative w-full h-52 bg-slate-50 rounded-[28px] border border-slate-100/60 overflow-hidden mb-8 flex items-center justify-center">
          
          {/* Subtle clouds in background */}
          <div className="absolute top-6 left-12 opacity-25 flex gap-1.5 items-center">
            <div className="w-8 h-3.5 bg-slate-300 rounded-full" />
            <div className="w-4 h-4 bg-slate-300 rounded-full -mt-2 -ml-3" />
          </div>
          <div className="absolute top-12 right-24 opacity-20 flex gap-1 items-center">
            <div className="w-10 h-4 bg-slate-300 rounded-full" />
            <div className="w-5 h-5 bg-slate-300 rounded-full -mt-2 -ml-3" />
          </div>

          {/* Sparkles / Shock Lines */}
          <AnimatePresence>
            {impactEmoji && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5, y: -20, x: 20 }}
                animate={{ opacity: 1, scale: 1, y: -45, x: 45 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute z-30 font-black tracking-tighter text-orange-600 text-xs bg-orange-100 border border-orange-200 px-3 py-1 rounded-full flex items-center gap-1 shadow-sm"
              >
                💥 OUCH!
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bursting Feathers */}
          {feathers.map((f) => (
            <motion.div
              key={f.id}
              initial={{ x: f.startX, y: f.startY, rotate: 0, opacity: 1, scale: 1 }}
              animate={{ 
                x: f.targetX, 
                y: [f.startY, f.targetY - 20, f.targetY], 
                rotate: f.rotate, 
                opacity: 0, 
                scale: 0.5 
              }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute z-20 w-3 h-1.5 bg-orange-400 rounded-full opacity-60 pointer-events-none"
              style={{ transformOrigin: 'center' }}
            />
          ))}

          {/* The Sol (Shadow Area) */}
          <motion.div 
            animate={shadowControls}
            className="absolute z-10 bottom-6 left-[140px] w-20 h-3.5 bg-slate-200/90 rounded-full mix-blend-multiply flex items-center justify-center pointer-events-none"
          />

          {/* The Wall (Black/White minimal chic element) */}
          <motion.div
            animate={wallControls}
            className="absolute z-20 right-28 top-8 bottom-8 w-4.5 bg-slate-800 rounded-full shadow-lg border border-slate-900/10 flex flex-col justify-between p-1 items-center"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
          </motion.div>

          {/* Interactive animated Owl */}
          <motion.div
            animate={owlControls}
            onClick={handleOwlClick}
            className={`absolute z-20 w-16 h-16 cursor-pointer transform-gpu ${animationState === 'dizzy' ? 'hover:scale-105 transition-transform' : ''}`}
            style={{ transformOrigin: 'center bottom' }}
          >
            {/* SVG Owl illustration */}
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
              {/* Ears / Plumes */}
              <path d="M 25,25 L 35,10 L 45,20 Z" fill="#ea580c" />
              <path d="M 75,25 L 65,10 L 55,20 Z" fill="#ea580c" />

              {/* Main Body */}
              <rect x="25" y="20" width="50" height="60" rx="25" fill="#f97316" />
              
              {/* Stomach Patch (Crème / Beige) */}
              <ellipse cx="50" cy="55" rx="18" ry="20" fill="#fef3c7" />

              {/* Stomach Plumes details */}
              <path d="M 45,45 Q 50,48 55,45" stroke="#ea580c" strokeWidth="2" fill="none" />
              <path d="M 42,53 Q 50,56 58,53" stroke="#ea580c" strokeWidth="2" fill="none" />
              <path d="M 45,61 Q 50,64 55,61" stroke="#ea580c" strokeWidth="2" fill="none" />

              {/* Eyebrows */}
              <path d="M 23,26 Q 38,20 48,32" stroke="#ea580c" strokeWidth="3" fill="none" />
              <path d="M 77,26 Q 62,20 52,32" stroke="#ea580c" strokeWidth="3" fill="none" />

              {/* Eyes */}
              <g>
                {/* Left Eye background */}
                <circle cx="38" cy="35" r="10" fill="white" />
                {animationState === 'dizzy' || animationState === 'hit' ? (
                  // KO / Dizzy eyes
                  <g stroke="#334155" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="34" y1="31" x2="42" y2="39" />
                    <line x1="42" y1="31" x2="34" y2="39" />
                  </g>
                ) : (
                  // Normal eyes
                  <>
                    <circle cx="38" cy="35" r="6" fill="#1e293b" />
                    <circle cx="36" cy="33" r="2" fill="white" />
                  </>
                )}

                {/* Right Eye background */}
                <circle cx="62" cy="35" r="10" fill="white" />
                {animationState === 'dizzy' || animationState === 'hit' ? (
                  // KO / Dizzy eyes
                  <g stroke="#334155" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="58" y1="31" x2="66" y2="39" />
                    <line x1="66" y1="31" x2="58" y2="39" />
                  </g>
                ) : (
                  // Normal eyes
                  <>
                    <circle cx="62" cy="35" r="6" fill="#1e293b" />
                    <circle cx="60" cy="33" r="2" fill="white" />
                  </>
                )}
              </g>

              {/* Cute little beak */}
              <polygon points="46,42 54,42 50,49" fill="#fbbf24" />

              {/* Cute little feet */}
              <rect x="33" y="78" width="10" height="5" rx="2" fill="#d97706" />
              <rect x="57" y="78" width="10" height="5" rx="2" fill="#d97706" />

              {/* Animated wings */}
              <g>
                {animationState === 'flying' ? (
                  <>
                    {/* Flapping Wings animation based on flying sequence */}
                    <motion.path 
                      d="M 25,48 L 10,40 L 25,32 Z" 
                      fill="#ea580c" 
                      animate={{ rotate: [0, -35, 0] }}
                      transition={{ repeat: Infinity, duration: 0.3 }}
                      style={{ transformOrigin: '25px 48px' }}
                    />
                    <motion.path 
                      d="M 75,48 L 90,40 L 75,32 Z" 
                      fill="#ea580c" 
                      animate={{ rotate: [0, 35, 0] }}
                      transition={{ repeat: Infinity, duration: 0.3 }}
                      style={{ transformOrigin: '75px 48px' }}
                    />
                  </>
                ) : (
                  <>
                    {/* Drooping/tired wings */}
                    <path d="M 25,48 L 18,65 L 25,58 Z" fill="#ea580c" />
                    <path d="M 75,48 L 82,65 L 75,58 Z" fill="#ea580c" />
                  </>
                )}
              </g>
            </svg>
          </motion.div>

          {/* Ground shadow label helper */}
          {animationState === 'dizzy' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white/70 backdrop-blur-sm px-2.5 py-0.5 rounded-full shadow-xs"
            >
              Cliquez sur le hibou pour le faire voler !
            </motion.div>
          )}
        </div>

        {/* Text Area */}
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none mb-3">
          Accès Interrompu
        </h1>
        
        <p className="text-sm font-medium text-slate-500 max-w-md leading-relaxed mb-8">
          Votre compte (<strong>{user?.email}</strong>) a été temporairement suspendu par notre équipe de modération. Cela est généralement dû à l'un des facteurs suivants : un profil non conforme aux règles communautaires, des informations de validation faussées ou une activité inhabituelle.
        </p>

        {/* Action button container */}
        <div className="w-full flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => {
              // Easily trigger mailto with system and email context
              const subject = encodeURIComponent("Demande de réactivation de compte - AfricaJob");
              const body = encodeURIComponent(`Bonjour,\n\nMon compte (${user?.email}) a été suspendu.\nJe souhaiterais clarifier ma situation et demander l'examen de cette suspension.\n\nCordialement,\n${user?.displayName || ''}`);
              window.location.href = `mailto:2ng.groupeentreprise@gmail.com?subject=${subject}&body=${body}`;
            }}
            className="flex-1 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl h-12 font-black text-[12px] uppercase tracking-wider shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Send className="h-4 w-4 mr-2 text-orange-500" />
            Contacter le Support
          </Button>

          <Button 
            variant="outline"
            onClick={logout}
            className="bg-transparent hover:bg-slate-50 text-slate-800 border-2 border-slate-150 rounded-2xl h-12 font-black text-[12px] uppercase tracking-wider transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <LogOut className="h-4 w-4 mr-2 text-slate-500" />
            Se Déconnecter
          </Button>
        </div>

        {/* Small fun feedback footer */}
        {clickCount > 2 && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            className="text-[10px] text-slate-400 font-bold mt-6 select-none"
          >
            Nombre de lancements : {clickCount} 🦉 Prêt pour le décollage !
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
