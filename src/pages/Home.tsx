import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Briefcase, 
  Building2, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  Globe2, 
  LayoutDashboard, 
  Sparkles, 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  ChevronRight, 
  Award, 
  BookOpen, 
  Star, 
  MapPin, 
  Clock, 
  Handshake, 
  Mail, 
  Phone, 
  Send,
  Building,
  ArrowUpRight,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { collection, query, limit, getDocs, where, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import JobCard from '@/components/JobCard';

interface Job {
  id: string;
  title: string;
  companyName: string;
  location: string;
  contractType: string;
  salary?: string;
  createdAt?: any;
}

export default function Home() {
  const { user } = useAuth();
  const { config } = useSiteConfig();
  const navigate = useNavigate();

  // Offers Query State
  const [allHomeOffers, setAllHomeOffers] = useState<any[]>([]);
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);

  const [rapidOffers, setRapidOffers] = useState<any[]>([]);
  const [popularOffers, setPopularOffers] = useState<any[]>([]);
  const [uniqueOffers, setUniqueOffers] = useState<any[]>([]);
  const [activeSegmentFilter, setActiveSegmentFilter] = useState<'popular' | 'unique'>('popular');
  const [dbPartnerLogos, setDbPartnerLogos] = useState<any[]>([]);
  const [selectedContractFilter, setSelectedContractFilter] = useState<string>('all');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('all');
  const [loadingJobs, setLoadingJobs] = useState(true);
  
  // Real database recruiters/companies states
  const [companiesMap, setCompaniesMap] = useState<Record<string, any>>({});
  const [registeredCompanies, setRegisteredCompanies] = useState<any[]>([]);

  // Partnership Modal State
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [partnerFormData, setPartnerFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    message: ''
  });
  const [partnerSubmitted, setPartnerSubmitted] = useState(false);

  // Newsletter State
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  // Testimonial Carousel State
  const [currentTestimonialIdx, setCurrentTestimonialIdx] = useState(0);

  // Helper to extract timestamp millis
  const getOfferCreatedAtTime = (o: any) => {
    if (!o.createdAt) return 0;
    if (typeof o.createdAt.toMillis === 'function') {
      return o.createdAt.toMillis();
    }
    if (typeof o.createdAt.seconds === 'number') {
      return o.createdAt.seconds * 1000;
    }
    return new Date(o.createdAt).getTime();
  };

  // Fetch categorized Offers from Firestore on mount
  useEffect(() => {
    async function loadFeaturedJobs() {
      try {
        // 1. Fetch registered recruiters first to link profiles and logos
        const recruitersQuery = query(collection(db, 'users'), where('role', '==', 'recruiter'));
        const recruitersSnap = await getDocs(recruitersQuery);
        const compMap: Record<string, any> = {};
        const compList: any[] = [];
        
        recruitersSnap.forEach((doc) => {
          const profile = doc.data();
          const uid = doc.id;
          const mapped = { uid, ...profile };
          compMap[uid] = mapped;
          if (profile.companyName) {
            compList.push(mapped);
          }
        });
        
        setCompaniesMap(compMap);
        setRegisteredCompanies(compList);

        // 2. Fetch active job offers
        const offersRef = collection(db, 'offers');
        const q = query(offersRef, where('status', '==', 'active'));
        const snap = await getDocs(q);
        const fetchedOffers: any[] = [];
        
        snap.forEach((doc) => {
          const d = doc.data();
          fetchedOffers.push({ id: doc.id, ...d });
        });

        // Function to detect if there's less than 48 hours remaining
        const isOfferRapid = (o: any) => {
          if (o.type === 'rapid') return true;
          if (!o.expiresAt) return false;
          let expTime = 0;
          try {
            if (typeof o.expiresAt.toMillis === 'function') {
              expTime = o.expiresAt.toMillis();
            } else if (typeof o.expiresAt.seconds === 'number') {
              expTime = o.expiresAt.seconds * 1000; // Use seconds to ms mapping
            } else {
              expTime = new Date(o.expiresAt).getTime();
            }
          } catch (e) {
            return false;
          }
          const diff = expTime - Date.now();
          return diff > 0 && diff <= 48 * 60 * 60 * 1000;
        };

        const rapid: any[] = [];
        const popular: any[] = [];
        const unique: any[] = [];

        fetchedOffers.forEach(o => {
          if (isOfferRapid(o)) {
            rapid.push(o);
          } else {
            const byAdmin = o.createdBy === 'admin' || !o.recruiterId || o.recruiterId === 'admin';
            const isPop = o.isFeatured === true || o.type === 'popular';
            if (byAdmin && isPop) {
              popular.push(o);
            } else {
              unique.push(o);
            }
          }
        });

        rapid.sort((a, b) => getOfferCreatedAtTime(b) - getOfferCreatedAtTime(a));
        setRapidOffers(rapid);
        setPopularOffers(popular);
        setUniqueOffers(unique);

        const combined = [...fetchedOffers].sort((a, b) => getOfferCreatedAtTime(b) - getOfferCreatedAtTime(a));
        setAllHomeOffers(combined);

        // 4. Fallback for partner logos - we now use the actual registered recruiters!
        // But also check 'partner_logos' collection just as a backup
        try {
          const partnersSnap = await getDocs(query(collection(db, 'partner_logos'), where('isVisible', '==', true), orderBy('order', 'asc')));
          const loadedLogos = partnersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setDbPartnerLogos(loadedLogos);
        } catch (logoErr) {
          console.log("No custom partner_logos found", logoErr);
        }

      } catch (e) {
        console.error("Error loading offers:", e);
      } finally {
        setLoadingJobs(false);
      }
    }
    loadFeaturedJobs();
  }, []);

  // Fetch candidate's applications to display "Applied / Postulé" real state on the homepage
  useEffect(() => {
    if (user && user.role === 'candidate') {
      const fetchUserApplications = async () => {
        try {
          const appsQ = query(
            collection(db, 'applications'),
            where('candidateId', '==', user.uid)
          );
          const snap = await getDocs(appsQ);
          const ids = new Set<string>();
          snap.forEach(docSnap => {
            ids.add(docSnap.data().jobId);
          });
          setAppliedJobIds(ids);
        } catch (err) {
          console.error("Error loading user applications:", err);
        }
      };
      fetchUserApplications();
    }
  }, [user]);

  // Handle Apply execution from the homepage carousel card
  const handleApplyHomeJob = async (job: any) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'candidate') {
      return;
    }
    
    setIsApplying(true);
    try {
      const rId = job.recruiterId || job.companyId || 'admin_popular';
      const companyNameStr = job.companyName || (rId && companiesMap[rId]?.companyName) || 'Entreprise Partenaire';

      const applicationData = {
        jobId: job.id,
        candidateId: user.uid,
        recruiterId: rId,
        jobTitle: job.title,
        companyName: companyNameStr,
        status: 'pending',
        appliedAt: serverTimestamp(),
        candidateProfile: {
          uid: user.uid,
          displayName: user.displayName || '',
          email: user.email || '',
          photoUrl: user.photoUrl || '',
          jobTitle: job.title || '',
          skills: user.skills || [],
          cvUrl: user.cvUrl || '',
          cvName: user.cvName || ''
        }
      };

      await addDoc(collection(db, 'applications'), applicationData);
      setAppliedJobIds(prev => {
        const next = new Set(prev);
        next.add(job.id);
        return next;
      });
    } catch (error) {
      console.error('Error applying from carousel:', error);
    } finally {
      setIsApplying(false);
    }
  };

  // Filter based on selected tag for segments
  const filteredPopularOffers = popularOffers.filter(offer => {
    if (selectedContractFilter !== 'all') {
      const cType = offer.contractType || offer.type || 'CDI';
      if (cType.toLowerCase() !== selectedContractFilter.toLowerCase()) return false;
    }
    if (selectedSectorFilter !== 'all') {
      const field = (offer.field || '').toLowerCase();
      const title = (offer.title || '').toLowerCase();
      const desc = (offer.description || '').toLowerCase();
      const target = selectedSectorFilter.toLowerCase();
      
      if (target === 'tech') {
        if (!field.includes('tech') && !field.includes('web') && !field.includes('informatique') && !field.includes('code') && !field.includes('développeur') && !title.includes('développeur') && !title.includes('tech')) return false;
      } else if (target === 'btp') {
        if (!field.includes('btp') && !field.includes('construction') && !field.includes('bâtiment')) return false;
      } else if (target === 'rh') {
        if (!field.includes('rh') && !field.includes('ressources') && !field.includes('recrutement')) return false;
      } else if (target === 'finance') {
        if (!field.includes('finance') && !field.includes('banque') && !field.includes('comptabilité')) return false;
      } else if (target === 'marketing') {
        if (!field.includes('marketing') && !field.includes('com') && !field.includes('vent') && !field.includes('business')) return false;
      } else if (target === 'sante') {
        if (!field.includes('santé') && !field.includes('médic') && !field.includes('social')) return false;
      } else if (target === 'logistique') {
        if (!field.includes('logis') && !field.includes('transport')) return false;
      }
    }
    return true;
  });

  const filteredUniqueOffers = uniqueOffers.filter(offer => {
    if (selectedContractFilter !== 'all') {
      const cType = offer.contractType || offer.type || 'CDI';
      if (cType.toLowerCase() !== selectedContractFilter.toLowerCase()) return false;
    }
    if (selectedSectorFilter !== 'all') {
      const field = (offer.field || '').toLowerCase();
      const title = (offer.title || '').toLowerCase();
      const desc = (offer.description || '').toLowerCase();
      const target = selectedSectorFilter.toLowerCase();
      
      if (target === 'tech') {
        if (!field.includes('tech') && !field.includes('web') && !field.includes('informatique') && !field.includes('code') && !field.includes('développeur') && !title.includes('développeur') && !title.includes('tech')) return false;
      } else if (target === 'btp') {
        if (!field.includes('btp') && !field.includes('construction') && !field.includes('bâtiment')) return false;
      } else if (target === 'rh') {
        if (!field.includes('rh') && !field.includes('ressources') && !field.includes('recrutement')) return false;
      } else if (target === 'finance') {
        if (!field.includes('finance') && !field.includes('banque') && !field.includes('comptabilité')) return false;
      } else if (target === 'marketing') {
        if (!field.includes('marketing') && !field.includes('com') && !field.includes('vent') && !field.includes('business')) return false;
      } else if (target === 'sante') {
        if (!field.includes('santé') && !field.includes('médic') && !field.includes('social')) return false;
      } else if (target === 'logistique') {
        if (!field.includes('logis') && !field.includes('transport')) return false;
      }
    }
    return true;
  });

  const getDashboardLink = () => {
    if (!user) return '/';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'recruiter') return '/recruiter';
    return '/candidate';
  };

  const handlePartnerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPartnerSubmitted(true);
    setTimeout(() => {
      setPartnerSubmitted(false);
      setIsPartnerModalOpen(false);
      setPartnerFormData({ name: '', company: '', email: '', phone: '', message: '' });
    }, 2500);
  };

  const services = [
    {
      icon: <Users className="h-6 w-6 text-orange-600" />,
      title: "Recrutement de Pointe",
      description: "Identification méticuleuse et sélection d’experts qualifiés répondant précisément aux besoins structurels de votre entreprise.",
      glowColor: "rgba(255, 102, 0, 0.15)"
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-orange-600" />,
      title: "Placement Professionnel",
      description: "Accélération immédiate de votre insertion professionnelle grâce à notre réseau dynamique de décideurs en Afrique.",
      glowColor: "rgba(255, 102, 0, 0.15)"
    },
    {
      icon: <Award className="h-6 w-6 text-orange-600" />,
      title: "Accompagnement Carrière",
      description: "Coaching intensif, optimisation personnalisée de votre CV et simulation d'entretiens pour vous démarquer.",
      glowColor: "rgba(255, 102, 0, 0.15)"
    },
    {
      icon: <Building2 className="h-6 w-6 text-orange-600" />,
      title: "Conseil aux Entreprises",
      description: "Audit organisationnel complet, ingénierie salariale et optimisation de vos stratégies d'acquisition de talents.",
      glowColor: "rgba(255, 102, 0, 0.15)"
    },
    {
      icon: <Handshake className="h-6 w-6 text-orange-600" />,
      title: "Partenariats Stratégiques",
      description: "Connexion directe avec notre écosystème d'investisseurs et d'entreprises leaders pour stimuler votre croissance.",
      glowColor: "rgba(255, 102, 0, 0.15)"
    },
    {
      icon: <BookOpen className="h-6 w-6 text-orange-600" />,
      title: "Formations Certifiées",
      description: "Programmes intensifs axés sur l'innovation digitale, le leadership d'équipe et les techniques métiers d'avenir.",
      glowColor: "rgba(255, 102, 0, 0.15)"
    }
  ];

  const testimonials = [
    {
      quote: "Grâce à 2NG Groupe Entreprises, nous avons recruté trois collaborateurs clés en moins de deux semaines. La plateforme est ergonomique et le vivier de profils est incroyablement qualifié.",
      author: "Mame Diarra Sow",
      role: "Directrice RH",
      company: "Samba Pay Abidjan",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120"
    },
    {
      quote: "Un accompagnement sur mesure exceptionnel. J'ai pu refaire mon CV et décrocher un entretien exclusif en CDI qui s'est concrétisé immédiatement. Je recommande à tous les professionnels d'Afrique !",
      author: "Ibrahima Diallo",
      role: "Ingénieur Cloud senior",
      company: "Aveni Group Senegal",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=120"
    },
    {
      quote: "Une révolution pour l'écosystème RH. Le suivi tactile et mobile-first nous permet d'examiner et d'évaluer les dossiers des postulants très simplement depuis n'importe où.",
      author: "Koffi Mensah",
      role: "Co-fondateur",
      company: "TechCorp Labs",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120"
    }
  ];

  const advantages = [
    {
      num: "01",
      title: "Recrutement Intelligent",
      desc: "Filtrage multicritères innovant et algorithmes d'adéquation pour garantir un ciblage optimal s'alignant sur votre culture d'entreprise."
    },
    {
      num: "02",
      title: "Accompagnement Humain",
      desc: "Des conseillers et experts RH dédiés pour vous orienter individuellement à chaque étape clé du processus de placement."
    },
    {
      num: "03",
      title: "Réseau Professionnel Privé",
      desc: "Un écosystème fermé reliant directement porteurs de projets, dirigeants d'entreprises et talents certifiés africains."
    },
    {
      num: "04",
      title: "Sécurité & Transparence",
      desc: "Toutes les données juridiques et personnelles des candidats sont cryptées et validées manuellement par nos modérateurs sous 72h."
    },
    {
      num: "05",
      title: "Rapidité d'Exécution",
      desc: "Une interface fluide qui divise par trois le délai de recrutement traditionnel grâce à des outils collaboratifs instantanés."
    },
    {
      num: "06",
      title: "Innovation Digitale",
      desc: "Suivi en temps réel des étapes de sélection, exports intelligents de rapports d'entretien, et tableaux de bord Stripe-style."
    }
  ];

  const scrollSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfbf9] text-slate-900 pt-0 overflow-x-hidden">
      
      {/* 1. HERO SECTION */}
      <section className="relative px-6 md:px-10 py-12 lg:py-24 bg-gradient-to-b from-orange-50/15 via-[#fcfbf9] to-transparent overflow-hidden">
        {/* Futuristic glowing blur elements */}
        <div className="absolute top-1/4 left-0 -translate-x-1/2 w-[350px] h-[350px] bg-orange-200/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 right-0 translate-x-1/3 w-[450px] h-[450px] bg-orange-100/30 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center relative z-10">
          
          {/* Hero Left Content */}
          <div className="lg:col-span-7 flex flex-col items-start space-y-6 md:space-y-8 text-left select-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-orange-500/10 bg-orange-50 flex-wrap rounded-full"
            >
              <div className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></div>
              <span className="text-[10px] md:text-xs font-black text-orange-600 uppercase tracking-widest leading-none">
                Bienvenue chez 2NG Groupe Entreprises
              </span>
            </motion.div>

            <motion.h1 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.05] tracking-tighter"
            >
              Des opportunités <br />
              professionnelles, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-500 underline decoration-orange-200/60 decoration-wavy underline-offset-8">
                recrutement intelligent
              </span> <br />
              et un réseau d'avenir.
            </motion.h1>

            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-slate-500 text-base md:text-lg max-w-2xl font-medium leading-relaxed"
            >
              {config.heroSubtitle || "Nous propulsons les carrières des talents exceptionnels tout en simplifiant le processus d’embauche des plus grandes entreprises de la région ouest-africaine."}
            </motion.p>
            
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              <Button 
                onClick={() => navigate('/jobs')}
                className="h-14 px-8 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-2xl shadow-xl shadow-orange-600/20 text-md transition-all duration-300 hover:scale-[1.03]"
              >
                Explorer les offres
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                onClick={() => navigate('/signup')}
                variant="outline" 
                className="h-14 px-8 border-slate-200 hover:border-orange-200 hover:text-orange-600 bg-white hover:bg-orange-50/20 text-slate-700 font-extrabold rounded-2xl shadow-sm text-md transition-all duration-300 hover:scale-[1.03]"
              >
                Rejoindre le réseau
              </Button>
            </motion.div>
          </div>

          {/* Hero Right Visual: Elegant Mockup & Floating Cards */}
          <div className="lg:col-span-12 xl:col-span-5 flex justify-center relative select-none">
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative w-full max-w-[500px]"
            >
              {/* Central Premium Mockup Dashboard */}
              <div className="bg-white/70 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-slate-200" />
                    <div className="w-3 h-3 rounded-full bg-slate-200" />
                    <div className="w-3 h-3 rounded-full bg-slate-200" />
                  </div>
                  <span className="text-[10px] font-black tracking-widest text-[#a855f7] bg-[#f3e8ff] px-2.5 py-1 rounded-full uppercase">Talent Matcher Pro</span>
                </div>

                <div className="space-y-4">
                  {/* Item 1 */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center font-black text-orange-600 text-sm">
                        AD
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 leading-none">Amadou DIALLO</p>
                        <p className="text-[10px] text-[#22c55e] font-bold mt-1">Match Rate : 98%</p>
                      </div>
                    </div>
                    <Badge className="bg-[#e0f2fe] hover:bg-[#bae6fd] border-none text-sky-700 text-[10px] rounded-lg px-2">Entretien</Badge>
                  </div>

                  {/* Item 2 */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center font-black text-white text-sm">
                        KD
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 leading-none">Kadiatou DIOP</p>
                        <p className="text-[10px] text-slate-400 mt-1">Développeur Symfony</p>
                      </div>
                    </div>
                    <Badge className="bg-[#dcfce7] hover:bg-[#bbf7d0] border-none text-[#166534] text-[10px] rounded-lg px-2">Sélectionné</Badge>
                  </div>
                </div>

                {/* Floating Metric 1 */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="absolute -top-6 -right-5 bg-orange-500 text-white rounded-2xl p-3 shadow-xl flex items-center gap-3 border border-orange-400"
                >
                  <TrendingUp className="h-5 w-5" />
                  <div className="text-left">
                    <p className="text-[8px] uppercase tracking-widest font-black opacity-80 leading-none">Recrutements</p>
                    <p className="text-sm font-black mt-0.5">+140%</p>
                  </div>
                </motion.div>

                {/* Floating Recruiter Card */}
                <motion.div 
                  animate={{ y: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                  className="absolute -bottom-6 -left-8 bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 shadow-xl flex items-center gap-3 max-w-[200px]"
                >
                  <div className="p-2.5 rounded-xl bg-orange-600 text-white">
                    <Building className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 leading-none">Entreprises</p>
                    <p className="text-xs font-semibold mt-1 truncate">840+ Partenaires</p>
                  </div>
                </motion.div>
                
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. STATS SECTION (TRUST) */}
      <section className="border-y border-slate-200/50 bg-[#f4ede7]/20 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {[
            { label: "Membres Adhérents", value: "12 450+", desc: "Profils actifs qualifiés" },
            { label: "Entreprises", value: "840+", desc: "Recruteurs enregistrés" },
            { label: "Offres Archivées / Live", value: "3 120+", desc: "Postes pourvus" },
            { label: "Dossiers Valides", value: "9 840+", desc: "CV analysés et certifiés" }
          ].map((stat, i) => (
            <motion.div 
              key={i} 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center group"
            >
              <p className="text-3xl md:text-4xl font-black text-slate-900 leading-tight group-hover:text-orange-600 transition-colors duration-300">
                {stat.value}
              </p>
              <p className="text-xs font-black uppercase tracking-widest text-slate-800 mt-2">
                {stat.label}
              </p>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                {stat.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3. RAPID OFFERS SECTION (HORIZONTAL SCROLL SNAPPING) */}
      <section className="bg-slate-950 py-20 text-white overflow-hidden relative border-t border-slate-900">
        <div className="absolute top-0 left-12 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-12 w-96 h-96 bg-orange-600/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex flex-col md:flex-row md:items-end justify-between text-left mb-12 gap-6">
          <div>
            <Badge className="bg-orange-600 hover:bg-orange-650 text-white font-black uppercase tracking-widest text-[10px] px-3.5 py-1.5 rounded-full border-none mb-4 animate-pulse">
              ⏱️ Candidatures Express (Moins de 48h restantes)
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none">
              Offres ultra-rapides d'Afrique
            </h2>
            <p className="text-slate-400 font-semibold text-xs md:text-sm max-w-xl mt-3">
              Ces opportunités d'emploi expirent sous 48 heures. Préparez votre CV et postulez immédiatement pour maximiser vos chances de sélection.
            </p>
          </div>
          <Link to="/jobs">
            <Button variant="outline" className="border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900 font-black text-xs uppercase rounded-xl h-11 px-5">
              Toutes les offres ➔
            </Button>
          </Link>
        </div>

        {/* Fullscreen horizontal scroll snapping row */}
        <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory px-6 md:px-10 pb-8 scrollbar-hide no-scrollbar w-full max-w-7xl mx-auto">
          {rapidOffers.map((job) => {
            return (
              <div 
                key={job.id} 
                className="snap-start shrink-0 w-[85vw] sm:w-[420px] bg-slate-900/60 backdrop-blur border border-slate-800/80 rounded-[32px] p-8 flex flex-col justify-between relative hover:border-orange-500/50 transition-all duration-350 hover:shadow-2xl hover:shadow-orange-900/5 group"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3 items-center">
                      <div className="w-12 h-12 rounded-2xl bg-orange-600/10 border border-orange-500/20 text-orange-500 flex items-center justify-center font-black text-sm uppercase">
                        {job.companyName ? job.companyName.substring(0, 2) : "EP"}
                      </div>
                      <div className="text-left">
                        <h4 className="font-extrabold text-sm text-white">{job.companyName}</h4>
                        <span className="text-[10px] uppercase font-black tracking-widest text-orange-500 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-ping" />
                          Urgent
                        </span>
                      </div>
                    </div>
                    <Badge className="bg-slate-800 text-slate-300 border border-slate-700 font-black text-[9px] uppercase rounded-full px-2.5 py-1">
                      {job.contractType || 'CDI'}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-black text-white text-left mt-6 leading-snug tracking-tight group-hover:text-orange-500 transition-colors">
                    {job.title}
                  </h3>

                  <div className="flex flex-wrap items-center mt-4 gap-4 text-xs font-bold text-slate-400">
                    <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-orange-500" /> {job.location}</span>
                    <span className="flex items-center gap-1"><TrendingUp className="h-4 w-4 text-emerald-500" /> {job.salary || "Salaire Standard"}</span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-850 flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[9px] text-slate-500 block uppercase font-black tracking-wider">Temps restant</span>
                    <span className="text-xs font-black text-amber-500 animate-pulse">
                      {(() => {
                        if (!job.expiresAt) return "Moins de 48 heures";
                        try {
                          const exp = job.expiresAt.toDate ? job.expiresAt.toDate() : new Date(job.expiresAt);
                          const diffHours = Math.ceil((exp.getTime() - Date.now()) / (3600 * 1000));
                          return diffHours > 0 ? `${diffHours} heures restantes` : "Dépêchez-vous !";
                        } catch (e) {
                          return "Moins de 36 heures";
                        }
                      })()}
                    </span>
                  </div>
                  <Button 
                    onClick={() => navigate('/login')}
                    className="h-10 px-5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-lg shadow-orange-600/10 border-none hover:scale-[1.03] transition-all"
                  >
                    Postuler express
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. PREMIUM SINGLE-CARD OPPORTUNITIES CAROUSEL */}
      <section className="px-4 sm:px-6 md:px-10 py-16 max-w-4xl mx-auto text-center" id="jobs" style={{ contentVisibility: 'auto' }}>
        <div className="max-w-xl mx-auto mb-8">
          <Badge variant="outline" className="border-orange-200/80 text-orange-600 bg-orange-50 font-black uppercase tracking-widest text-[9px] px-3 py-1.5 rounded-full mb-3">
            Recrutement Agile 2NG
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 leading-none">
            Opportunités du Moment
          </h2>
          <p className="text-slate-500 font-bold text-xs sm:text-sm mt-3 leading-relaxed">
            Consultez les dernières offres d'emploi certifiées en exclusivité. Glissez d'un poste à l'autre pour trouver votre futur emploi.
          </p>
        </div>

        {loadingJobs ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-600"></div>
          </div>
        ) : allHomeOffers.length > 0 ? (
          <div className="relative w-full max-w-xl mx-auto py-4">
            
            {/* Visual Touch Pad Sandbox Container */}
            <div className="overflow-visible relative touch-pan-y min-h-[380px] sm:min-h-[400px]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentOfferIndex}
                  custom={direction}
                  variants={{
                    enter: (dir: number) => ({
                      x: dir > 0 ? 120 : -120,
                      opacity: 0,
                      scale: 0.96
                    }),
                    center: {
                      x: 0,
                      opacity: 1,
                      scale: 1,
                      transition: {
                        type: "spring",
                        stiffness: 380,
                        damping: 28
                      }
                    },
                    exit: (dir: number) => ({
                      x: dir > 0 ? -120 : 120,
                      opacity: 0,
                      scale: 0.96,
                      transition: {
                        duration: 0.18
                      }
                    })
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.4}
                  onDragEnd={(e, info) => {
                    const swipeThreshold = 50;
                    if (info.offset.x < -swipeThreshold) {
                      setDirection(1);
                      setCurrentOfferIndex((prevIdx) => (prevIdx + 1) % allHomeOffers.length);
                    } else if (info.offset.x > swipeThreshold) {
                      setDirection(-1);
                      setCurrentOfferIndex((prevIdx) => (prevIdx - 1 + allHomeOffers.length) % allHomeOffers.length);
                    }
                  }}
                  className="cursor-grab active:cursor-grabbing w-full"
                >
                  {(() => {
                    const job = allHomeOffers[currentOfferIndex];
                    const partnerProfile = job.recruiterId ? companiesMap[job.recruiterId] : null;
                    const isRegistered = partnerProfile && partnerProfile.role === 'recruiter' && partnerProfile.companyName;
                    const finalLogo = isRegistered ? (partnerProfile.photoUrl || job.companyLogo) : job.companyLogo;
                    const finalName = isRegistered ? (partnerProfile.companyName || job.companyName) : job.companyName;

                    const revisedJob = {
                      ...job,
                      companyLogo: finalLogo,
                      companyName: finalName
                    };

                    return (
                      <JobCard
                        job={revisedJob}
                        companyName={finalName}
                        isApplied={appliedJobIds.has(job.id)}
                        onApply={() => handleApplyHomeJob(job)}
                        isApplying={isApplying}
                        onNext={() => {
                          setDirection(1);
                          setCurrentOfferIndex((prevIdx) => (prevIdx + 1) % allHomeOffers.length);
                        }}
                        showNextArrow={allHomeOffers.length > 1}
                        loggedIn={!!user}
                        userRole={user?.role}
                      />
                    );
                  })()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Smart Navigation Aids underneath */}
            {allHomeOffers.length > 1 && (
              <div className="flex flex-col items-center justify-center gap-3.5 mt-4">
                
                {/* Dots indicator */}
                <div className="flex items-center gap-1.5">
                  {allHomeOffers.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setDirection(idx > currentOfferIndex ? 1 : -1);
                        setCurrentOfferIndex(idx);
                      }}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentOfferIndex ? 'w-4.5 bg-orange-600' : 'w-1.5 bg-slate-200 hover:bg-slate-300'
                      }`}
                      aria-label={`Aller au poste ${idx + 1}`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-4 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest bg-slate-50/55 px-4.5 py-1.5 rounded-full border border-slate-100/35">
                  <button 
                    onClick={() => {
                      setDirection(-1);
                      setCurrentOfferIndex((prevIdx) => (prevIdx - 1 + allHomeOffers.length) % allHomeOffers.length);
                    }}
                    className="hover:text-slate-700 transition-colors"
                  >
                    ❮ Précédent
                  </button>
                  <span className="text-slate-300">|</span>
                  <span>{currentOfferIndex + 1} sur {allHomeOffers.length}</span>
                  <span className="text-slate-300">|</span>
                  <button 
                    onClick={() => {
                      setDirection(1);
                      setCurrentOfferIndex((prevIdx) => (prevIdx + 1) % allHomeOffers.length);
                    }}
                    className="hover:text-slate-700 transition-colors"
                  >
                    Suivant ❯
                  </button>
                </div>

              </div>
            )}
          </div>
        ) : (
          <div className="max-w-md mx-auto py-12 bg-slate-50 rounded-[28px] border border-dashed border-slate-200">
            <p className="text-slate-550 font-extrabold text-sm">Aucun poste actif disponible pour le moment.</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to="/jobs">
            <Button variant="ghost" className="font-extrabold text-slate-600 hover:text-orange-600 transition-colors uppercase gap-1 text-[10px] sm:text-xs">
              Découvrir toutes les opportunités d'emploi
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* 4. SERVICES SECTION */}
      <section className="bg-slate-900 text-white py-20 md:py-28 px-6 md:px-10" id="services">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16 md:mb-20">
            <Badge className="bg-orange-600 text-white font-black uppercase tracking-widest text-[10px] px-3.5 py-1.5 rounded-full border-none mb-4">
              Notre Savoir-Faire Élite
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tighter">
              Une Gamme Complète de Services Innovants
            </h2>
            <p className="text-slate-400 text-sm md:text-base mt-4 font-medium">
              Nous soutenons les professionnels d'Afrique de l'Ouest et les entreprises à travers des méthodologies de recrutement et de coaching éprouvées.
            </p>
          </div>

          {/* Grid Cards with Hover Glow */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {services.map((service, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                className="bg-slate-800/40 backdrop-blur-md border border-slate-800 rounded-3xl p-8 hover:border-orange-500/50 transition-all duration-500 group relative overflow-hidden text-left"
              >
                {/* Micro glow effect inside */}
                <div 
                  className="absolute inset-x-0 top-0 h-40 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(circle at top, ${service.glowColor}, transparent 70%)`
                  }}
                />

                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700/80 flex items-center justify-center mb-6 relative z-10 group-hover:scale-110 group-hover:bg-slate-700/60 transition-all duration-300">
                  {service.icon}
                </div>

                <h3 className="text-lg font-extrabold text-white mb-3 relative z-10">
                  {service.title}
                </h3>
                <p className="text-sm text-slate-400 font-medium leading-relaxed relative z-10">
                  {service.description}
                </p>

                <div className="mt-6 flex items-center gap-1.5 text-xs font-black text-orange-500 relative z-10">
                  En savoir plus
                  <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1.5 transition-transform" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. ENTERPRISE / PARTNER SECTION */}
      <section className="px-6 md:px-10 py-20 bg-[#f4ede7]/10" id="partners">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          
          <Badge className="bg-orange-50 border-orange-200/50 text-orange-600 font-black uppercase tracking-widest text-[10px] px-3 py-1.5 rounded-full mb-4">
            Ils nous font confiance
          </Badge>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 text-center leading-none">
            Rejoignez notre réseau d’entreprises partenaires
          </h2>
          <p className="text-slate-500 font-semibold text-center text-sm md:text-base max-w-2xl mt-4">
            Bénéficiez de remises clés, d'outils ERP de placement et de l'expertise de 2NG pour transformer vos ressources humaines.
          </p>

          <style>{`
            @keyframes marquee {
              0% { transform: translateX(0%); }
              100% { transform: translateX(-50%); }
            }
            .animate-marquee {
              display: flex;
              gap: 1.5rem;
              animation: marquee 20s linear infinite;
            }
            .animate-marquee:hover {
              animation-play-state: paused;
            }
          `}</style>

          {/* Partner visual Scrolling marquee or static row depending on count */}
          {(() => {
            if (registeredCompanies.length === 0) {
              return (
                <div className="bg-white/80 backdrop-blur rounded-[32px] p-8 md:p-12 text-center border-2 border-dashed border-slate-200/60 max-w-md w-full mt-10 mb-8 animate-fade-in">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <Building className="h-6 w-6 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Écosystème local</h3>
                  <p className="text-xs md:text-sm text-slate-400 font-semibold mt-2">Aucune entreprise partenaire enregistrée pour le moment.</p>
                </div>
              );
            }

            // Marquee starts only if there are enough elements to exceed standard viewports (>4)
            return registeredCompanies.length > 4 ? (
              <div className="w-full overflow-hidden relative py-6 mt-12 mb-10">
                {/* Fade transitions left and right */}
                <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#fcfbf9] to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#fcfbf9] to-transparent z-10 pointer-events-none" />
                
                <div className="animate-marquee flex gap-6">
                  {[...registeredCompanies, ...registeredCompanies].map((p, i) => (
                    <Link 
                      key={i}
                      to={`/company/${p.uid}`}
                      className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col items-center justify-center min-w-[220px] hover:border-orange-500 hover:shadow-xl hover:shadow-orange-100/20 transition-all duration-300 filter grayscale hover:grayscale-0 text-center"
                    >
                      <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs uppercase mb-3 overflow-hidden border border-slate-800">
                        {p.photoUrl ? (
                          <img src={p.photoUrl} alt={p.companyName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          (p.companyName || "EP").substring(0, 2)
                        )}
                      </div>
                      <p className="text-xs font-black text-slate-800 truncate max-w-[180px]">{p.companyName || p.tradeName}</p>
                      <span className="text-[10px] text-orange-600 font-black mt-1 truncate max-w-[180px]">
                        {p.sectorActivity || "Secteur Élite"}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-6 w-full mt-12 mb-10">
                {registeredCompanies.map((p, i) => (
                  <Link 
                    key={p.uid || i}
                    to={`/company/${p.uid}`}
                    className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col items-center justify-center min-w-[220px] hover:border-orange-500 hover:shadow-xl hover:shadow-orange-100/20 transition-all duration-300 filter grayscale hover:grayscale-0 text-center animate-fade-in"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs uppercase mb-3 overflow-hidden border border-slate-800">
                      {p.photoUrl ? (
                        <img src={p.photoUrl} alt={p.companyName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        (p.companyName || "EP").substring(0, 2)
                      )}
                    </div>
                    <p className="text-xs font-black text-slate-800 truncate max-w-[180px]">{p.companyName || p.tradeName}</p>
                    <span className="text-[10px] text-orange-600 font-black mt-1 truncate max-w-[180px]">
                      {p.sectorActivity || "Secteur Élite"}
                    </span>
                  </Link>
                ))}
              </div>
            );
          })()}

          <Button 
            onClick={() => {
              if (user && user.role === 'recruiter') {
                navigate('/dashboard/company');
              } else {
                navigate('/signup?role=recruiter');
              }
            }}
            className="h-12 px-8 bg-slate-900 border-none hover:bg-orange-600 text-white font-extrabold rounded-2xl text-xs flex items-center gap-1.5 shadow-md transition-all duration-300 hover:scale-[1.03]"
          >
            Devenir partenaire d’affaires
            <ArrowRight className="h-4.5 w-4.5" />
          </Button>
        </div>
      </section>

      {/* 6. MEMBER DASHBOARD PREVIEW */}
      <section className="px-6 md:px-10 py-20 max-w-7xl mx-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-[50px] p-8 md:p-12 lg:p-16 text-white grid grid-cols-1 lg:grid-cols-12 gap-10 items-center overflow-hidden relative">
          
          <div className="absolute top-0 right-0 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="lg:col-span-6 text-left space-y-6">
            <Badge className="bg-orange-600 text-white font-black uppercase tracking-widest text-[10px] px-3.5 py-1.5 rounded-full border-none">
              Outil tout-en-un
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
              Un Tableau de Bord Futuriste pour Votre Recrutement
            </h2>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed font-medium">
              Suivez vos candidatures par étape, générez des CV professionnels certifiés en PDF au format requis pour l'Afrique, et restez notifié à chaque étape.
            </p>

            <ul className="space-y-3">
              {[
                "Export PDF de CV pré-rempli instantané",
                "Suivi d'étapes visuel par code couleur",
                "Conversations cryptées avec les recruteurs",
                "Espace documents RCCM/NINEA dédié"
              ].map((adv, idx) => (
                <li key={idx} className="flex items-center gap-3 text-sm text-slate-300 font-bold">
                  <CheckCircle2 className="h-5 w-5 text-orange-500 inline-block shrink-0" />
                  {adv}
                </li>
              ))}
            </ul>

            <div className="pt-4">
              <Button 
                onClick={() => navigate('/signup')}
                className="h-12 px-6 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-2xl text-xs transition-all duration-300 hover:scale-[1.02]"
              >
                Tester l'espace membre
              </Button>
            </div>
          </div>

          {/* Interactive Mockup Panel */}
          <div className="lg:col-span-6 bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
                <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
              </div>
              <span className="text-[10px] text-slate-400 font-mono">2ng_workspace_env.yaml</span>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-black leading-none">Candidature au poste de :</p>
                <div className="flex justify-between items-center mt-2 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                  <span className="font-extrabold text-sm">Manager Financier Senior</span>
                  <span className="text-[10px] font-black uppercase text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-lg">En Cours</span>
                </div>
              </div>

              {/* Steps status tracker */}
              <div className="space-y-2 mt-4 select-none">
                <p className="text-xs text-slate-400 font-black">Processus :</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-orange-500 text-white text-[10px] font-extrabold py-1.5 rounded-lg">Dossier</div>
                  <div className="bg-orange-500 text-white text-[10px] font-extrabold py-1.5 rounded-lg">Validation</div>
                  <div className="bg-slate-800 text-slate-500 text-[10px] font-extrabold py-1.5 rounded-lg">Entretien</div>
                  <div className="bg-slate-800 text-slate-500 text-[10px] font-extrabold py-1.5 rounded-lg">Fait</div>
                </div>
              </div>
            </div>
            
          </div>

        </div>
      </section>

      {/* 7. WHY CHOOSE US SECTION */}
      <section className="px-6 md:px-10 py-20 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge className="bg-orange-50 text-orange-600 font-black uppercase tracking-widest text-[10px] px-3 py-1.5 rounded-full border-none mb-3">
            Pourquoi choisir 2NG ?
          </Badge>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-none">
            La Garantie de l'Excellence RH
          </h2>
          <p className="text-slate-500 font-semibold mt-4 text-sm md:text-base">
            Découvrez nos points clés et notre engagement à long terme.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {advantages.map((adv, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.05 }}
              className="bg-white border border-slate-200/80 rounded-3xl p-6.5 hover:border-orange-500 hover:shadow-xl hover:shadow-orange-100/10 transition-all duration-300 text-left relative flex flex-col justify-between"
            >
              <div>
                <span className="font-serif text-3xl font-black text-orange-200 block mb-4 group-hover:text-orange-500 transition-colors">
                  {adv.num}
                </span>
                <h3 className="font-black text-lg text-slate-800 mb-2">
                  {adv.title}
                </h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  {adv.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 8. TESTIMONIALS SECTION */}
      <section className="px-6 md:px-10 py-16 bg-[#f4ede7]/25 border-y border-slate-200/50">
        <div className="max-w-4xl mx-auto text-center relative">
          
          <Badge className="bg-orange-50 border-orange-200/50 text-orange-600 font-black uppercase tracking-widest text-[10px] px-3 py-1.5 rounded-full border-none mb-4">
            Avis & Témoignages
          </Badge>
          
          {/* Slider content */}
          <div className="min-h-[220px] flex items-center justify-center relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonialIdx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <p className="text-lg md:text-xl font-medium text-slate-700 italic max-w-2xl mx-auto leading-relaxed">
                  “ {testimonials[currentTestimonialIdx].quote} ”
                </p>

                {/* Rating Stars */}
                <div className="flex justify-center gap-1">
                  {[...Array(testimonials[currentTestimonialIdx].rating)].map((_, i) => (
                    <Star key={i} className="h-4.5 w-4.5 text-amber-500 fill-amber-500" />
                  ))}
                </div>

                {/* Author Info */}
                <div className="flex items-center justify-center gap-3">
                  <img 
                    src={testimonials[currentTestimonialIdx].avatar} 
                    alt={testimonials[currentTestimonialIdx].author} 
                    className="w-11 h-11 rounded-full object-cover border border-orange-100"
                  />
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{testimonials[currentTestimonialIdx].author}</p>
                    <p className="text-[10px] text-slate-400 font-bold leading-none mt-0.5">
                      {testimonials[currentTestimonialIdx].role} • {testimonials[currentTestimonialIdx].company}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots Indicator */}
          <div className="mt-8 flex justify-center gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentTestimonialIdx(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  currentTestimonialIdx === i ? 'bg-orange-600 px-3.5' : 'bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 9. CTA SECTION */}
      <section className="px-6 md:px-10 py-16 md:py-24 max-w-5xl mx-auto text-center" id="contact">
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-[44px] p-8 md:p-14 relative overflow-hidden shadow-2xl shadow-orange-600/10">
          
          <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          <h2 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight max-w-3xl mx-auto">
            Prêt à rejoindre un réseau professionnel innovant ?
          </h2>
          <p className="text-slate-100 text-sm md:text-base mt-4 font-bold max-w-xl mx-auto opacity-90">
            Créez un compte rapidement aujourd'hui et trouvez un contrat adapté ou recrutez des talents réactifs en Afrique de l'Ouest.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={() => {
                if (user) {
                  if (user.role === 'recruiter') navigate('/recruiter-dashboard');
                  else if (user.role === 'candidate') navigate('/candidate-dashboard');
                  else if (user.role === 'admin') navigate('/admin-dashboard');
                } else {
                  window.location.href = '/signup';
                }
              }}
              className="w-full sm:w-auto h-14 px-8 bg-slate-900 border-none hover:bg-slate-800 text-white font-extrabold rounded-2xl shadow-xl hover:scale-[1.02] transition-transform"
            >
              Créer un compte
            </Button>
            <Button 
              onClick={() => {
                if (user) {
                  if (user.role === 'recruiter') navigate('/recruiter-dashboard?create=true');
                  else if (user.role === 'admin') navigate('/admin-dashboard?create=true');
                  else navigate('/signup?role=recruiter');
                } else {
                  window.location.href = '/signup?role=recruiter';
                }
              }}
              className="w-full sm:w-auto h-14 px-8 bg-white border-none text-orange-600 hover:bg-orange-50 font-extrabold rounded-2xl shadow-md hover:scale-[1.02] transition-transform"
            >
              Publier une offre
            </Button>
          </div>
        </div>
      </section>

      {/* 10. NEWSLETTER & FOOTER */}
      <footer className="bg-slate-900 text-white mt-auto pt-16 px-6 md:px-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          
          {/* Upper Footer: Branding + Newsletter */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pb-12 border-b border-slate-800 items-start">
            
            <div className="lg:col-span-5 space-y-4 text-left">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-black text-xl">
                  {config.siteName ? config.siteName[0] : '2'}
                </div>
                <span className="text-xl md:text-2xl font-black tracking-tighter text-white">
                  {config.siteName || '2NG Groupe Entreprises'}<span className="text-orange-600">.</span>
                </span>
              </Link>
              <p className="text-slate-400 text-xs md:text-sm font-medium max-w-sm leading-relaxed">
                Leader de l'orientation stratégique, de la dotation en capital humain et de l'innovation de recrutement technologique pour les professionnels d'Afrique de l'Ouest.
              </p>
              
              <div className="pt-2 flex flex-col gap-2 font-semibold text-xs text-slate-400">
                <a href="mailto:support@2ngentreprises.com" className="flex items-center gap-2 hover:text-orange-500 transition-colors">
                  <Mail className="h-4 w-4 text-orange-500" />
                  support@2ngentreprises.com
                </a>
                <a href="tel:+2250540504790" className="flex items-center gap-2 hover:text-orange-500 transition-colors">
                  <Phone className="h-4 w-4 text-orange-500" />
                  +225 054 050 47 90
                </a>
              </div>
            </div>

            <div className="lg:col-span-3 text-left space-y-4">
              <h4 className="font-extrabold text-[#f1f5f9] text-xs uppercase tracking-widest">Liens Utiles</h4>
              <ul className="space-y-2 text-xs font-semibold text-slate-400">
                <li><Link to="/jobs" className="hover:text-orange-500 transition-colors">Explorer les Offres</Link></li>
                <li><Link to="/about" className="hover:text-orange-500 transition-colors">A Propos de Nous</Link></li>
                <li><a href="#services" onClick={(e) => { e.preventDefault(); scrollSection('services'); }} className="hover:text-orange-500 transition-colors cursor-pointer">Nos Services Élite</a></li>
                <li><a href="#partners" onClick={(e) => { e.preventDefault(); scrollSection('partners'); }} className="hover:text-orange-500 transition-colors cursor-pointer">Entreprises Partenaires</a></li>
              </ul>
            </div>

            <div className="lg:col-span-4 text-left space-y-4">
              <h4 className="font-extrabold text-[#f1f5f9] text-xs uppercase tracking-widest">Newsletter d'experts</h4>
              <p className="text-slate-400 text-xs font-medium">Rejoignez de nombreux professionnels en recevant directement nos analyses RH mensuelles.</p>
              
              <AnimatePresence mode="wait">
                {!newsletterSubscribed ? (
                  <motion.form 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={(e) => { e.preventDefault(); if (newsletterEmail) setNewsletterSubscribed(true); }}
                    className="flex gap-2"
                  >
                    <input 
                      type="email" 
                      placeholder="votre_mail@domaine.com"
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      required
                      className="bg-slate-850 border border-slate-800 rounded-xl px-4 py-3 text-xs w-full text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                    <Button type="submit" className="bg-orange-600 hover:bg-orange-700 h-[42px] px-4 rounded-xl flex items-center justify-center">
                      <Send className="h-4 w-4" />
                    </Button>
                  </motion.form>
                ) : (
                  <motion.p 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-xs font-black text-orange-500 font-serif whitespace-nowrap"
                  >
                    Inscription validée ! Merci de votre fidélité.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Lower Footer */}
          <div className="py-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              © 2026 {config.siteName || '2NG Groupe Entreprises'}. Tous droits réservés.
            </p>
            <div className="flex gap-6 text-[10px] font-black uppercase text-slate-500">
              <Link to="/about" className="hover:text-orange-500 transition-colors">Mentions Légales</Link>
              <span>•</span>
              <Link to="/about" className="hover:text-orange-500 transition-colors">Politique RGPD</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* =======================================================
          11. DEVENIR PARTENAIRE MODAL (INLINE FORM OVERLAY)
          ======================================================= */}
      <AnimatePresence>
        {isPartnerModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6.5 md:p-8 max-w-lg w-full shadow-2xl relative border border-slate-100"
            >
              <button 
                onClick={() => setIsPartnerModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors duration-300"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="text-left space-y-2 mb-6">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                  <Handshake className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-black text-slate-900 leading-tight">Devenir Entreprise Partenaire</h3>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                  Renseignez ce formulaire rapide. Nos chargés d'affaires d'Afrique de l'Ouest vous recontacteront sous 24 heures ouvrées.
                </p>
              </div>

              <AnimatePresence mode="wait">
                {!partnerSubmitted ? (
                  <motion.form 
                    key="partner-form"
                    onSubmit={handlePartnerSubmit} 
                    className="space-y-4 text-left"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div>
                      <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1 mb-1">Votre Nom & Prénom *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Ex: Amara Touré"
                        value={partnerFormData.name}
                        onChange={(e) => setPartnerFormData({...partnerFormData, name: e.target.value})}
                        className="w-full text-xs h-11 px-4 border border-slate-200 bg-slate-50 hover:border-orange-200 focus:border-orange-500 rounded-xl transition-colors focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1 mb-1">Nom de l'entreprise *</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="Ex: Kira Consulting"
                          value={partnerFormData.company}
                          onChange={(e) => setPartnerFormData({...partnerFormData, company: e.target.value})}
                          className="w-full text-xs h-11 px-4 border border-slate-200 bg-slate-50 hover:border-orange-200 focus:border-orange-500 rounded-xl transition-colors focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1 mb-1">Téléphone *</label>
                        <input 
                          type="tel" 
                          required 
                          placeholder="Ex: +221 77 000 00 00"
                          value={partnerFormData.phone}
                          onChange={(e) => setPartnerFormData({...partnerFormData, phone: e.target.value})}
                          className="w-full text-xs h-11 px-4 border border-slate-200 bg-slate-50 hover:border-orange-200 focus:border-orange-500 rounded-xl transition-colors focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1 mb-1">Courriel Professionnel *</label>
                      <input 
                        type="email" 
                        required 
                        placeholder="Ex: contact@entreprise.com"
                        value={partnerFormData.email}
                        onChange={(e) => setPartnerFormData({...partnerFormData, email: e.target.value})}
                        className="w-full text-xs h-11 px-4 border border-slate-200 bg-slate-50 hover:border-orange-200 focus:border-orange-500 rounded-xl transition-colors focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1 mb-1">Présentez brièvement votre entreprise *</label>
                      <textarea 
                        required 
                        rows={3}
                        placeholder="Quels sont vos besoins en matière de recrutement ou de placement de talents ?"
                        value={partnerFormData.message}
                        onChange={(e) => setPartnerFormData({...partnerFormData, message: e.target.value})}
                        className="w-full text-xs p-4 border border-slate-200 bg-slate-50 hover:border-orange-200 focus:border-orange-500 rounded-xl transition-colors focus:outline-none"
                      />
                    </div>

                    <Button type="submit" className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-2xl text-xs uppercase shadow-md shadow-orange-600/10">
                      Envoyer la demande de partenariat
                    </Button>
                  </motion.form>
                ) : (
                  <motion.div 
                    key="partner-success"
                    className="py-8 text-center"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <div className="w-14 h-14 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h4 className="text-base font-black text-slate-900 uppercase">Demande bien reçue !</h4>
                    <p className="text-slate-500 text-xs font-bold leading-normal mt-2 max-w-sm mx-auto">
                      Merci pour votre confiance. Un chargé d'affaires va prendre contact avec vous sous 24h par email ou téléphone.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
