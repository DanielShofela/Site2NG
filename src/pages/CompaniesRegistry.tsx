/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, Job } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, 
  Search, 
  MapPin, 
  Users, 
  Briefcase, 
  Globe, 
  ChevronRight, 
  ShieldCheck,
  CheckCircle2,
  X,
  Target,
  FileText,
  Mail,
  Phone
} from 'lucide-react';

export default function CompaniesRegistry() {
  const [companies, setCompanies] = useState<UserProfile[]>([]);
  const [jobsMap, setJobsMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState('all');
  const [selectedSize, setSelectedSize] = useState('all');
  const [recruitingOnly, setRecruitingOnly] = useState(false);
  const [selectedCity, setSelectedCity] = useState('all');

  useEffect(() => {
    const fetchCompaniesAndJobs = async () => {
      try {
        setLoading(true);
        // 1. Fetch recruiters
        const recruitersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'recruiter')
        );
        const snapshot = await getDocs(recruitersQuery);
        const rawCompanies: UserProfile[] = [];
        snapshot.forEach((doc) => {
          rawCompanies.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });

        // Filter out suspended or draft companies if administrative status exists
        const activeCompanies = rawCompanies.filter(c => 
          c.accountStatus !== 'suspended' && c.status !== 'suspended' && c.status !== 'draft'
        );

        // 2. Fetch all active offers to count them per company
        const offersQuery = query(
          collection(db, 'offers'),
          where('status', '==', 'active')
        );
        const offersSnap = await getDocs(offersQuery);
        const counts: Record<string, number> = {};
        offersSnap.forEach((doc) => {
          const offer = doc.data() as Job;
          const cid = offer.recruiterId || offer.createdBy;
          if (cid) {
            counts[cid] = (counts[cid] || 0) + 1;
          }
        });

        setCompanies(activeCompanies);
        setJobsMap(counts);
      } catch (error) {
        console.error("Error loading companies registry:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompaniesAndJobs();
  }, []);

  // Compute filtering lists dynamically
  const sectors = Array.from(new Set(companies.map(c => c.sectorActivity?.toLowerCase()).filter(Boolean))) as string[];
  const cities = Array.from(new Set(companies.map(c => c.city?.trim()).filter(Boolean))) as string[];

  // Filter logic
  const filteredCompanies = companies.filter(company => {
    // 1. Text search (Name, Slogan, Bio, Sector, Location, Phone)
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const nameMatch = company.companyName?.toLowerCase().includes(term);
      const shortDescMatch = company.companyShortDescription?.toLowerCase().includes(term);
      const descMatch = company.companyDescription?.toLowerCase().includes(term);
      const sectorMatch = company.sectorActivity?.toLowerCase().includes(term);
      const cityMatch = company.city?.toLowerCase().includes(term);
      const communeMatch = company.commune?.toLowerCase().includes(term);
      
      if (!nameMatch && !shortDescMatch && !descMatch && !sectorMatch && !cityMatch && !communeMatch) {
        return false;
      }
    }

    // 2. Sector Filter
    if (selectedSector !== 'all') {
      if (company.sectorActivity?.toLowerCase() !== selectedSector) return false;
    }

    // 3. Company Size Filter
    if (selectedSize !== 'all') {
      if (company.companySize !== selectedSize) return false;
    }

    // 4. Currently recruiting filter
    if (recruitingOnly) {
      if (!company.recruitmentNeeds?.currentlyRecruiting && !jobsMap[company.uid]) return false;
    }

    // 5. City Filter
    if (selectedCity !== 'all') {
      if (company.city?.trim().toLowerCase() !== selectedCity.toLowerCase()) return false;
    }

    return true;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSector('all');
    setSelectedSize('all');
    setSelectedCity('all');
    setRecruitingOnly(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white pt-16 pb-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/10 rounded-full blur-[110px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-[90px] translate-y-1/2 -translate-x-1/4"></div>
        
        <div className="container mx-auto px-4 sm:px-6 md:px-10 text-center relative z-10 max-w-5xl">
          <Badge className="bg-orange-600/20 text-orange-400 border-none font-black px-4 py-1.5 rounded-full text-xs uppercase tracking-wider mb-4">
            Espace Entrepreneuriat & Emploi
          </Badge>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tighter mb-4">
            Annuaire des <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-500">Entreprises</span>
          </h1>
          <p className="text-slate-300 font-medium text-sm md:text-lg max-w-2xl mx-auto leading-relaxed">
            Découvrez, filtrez et suivez les structures professionnelles en Côte d'Ivoire. Suivez de près vos employeurs potentiels et explorez leurs opportunités d'emploi actives.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="container mx-auto px-4 sm:px-6 md:px-10 -mt-10 relative z-20 max-w-7xl">
        {/* Search & Tool belt */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[32px] overflow-hidden bg-white mb-8 p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px_200px] gap-4 items-center">
            {/* Search Input bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom d'entreprise, spécialité, ville, slogan..."
                className="h-14 pl-12 pr-6 rounded-2xl border-slate-200 focus-visible:ring-orange-600 font-medium w-full text-slate-800"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Sector Selector */}
            <div>
              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger className="h-14 rounded-2xl border-slate-200 font-bold bg-white text-slate-700">
                  <SelectValue placeholder="Secteur d'activité" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl max-h-72">
                  <SelectItem value="all">Tous les secteurs</SelectItem>
                  {sectors.map(sector => (
                    <SelectItem key={sector} value={sector} className="capitalize">{sector}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* City Selector */}
            <div>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="h-14 rounded-2xl border-slate-200 font-bold bg-white text-slate-700">
                  <SelectValue placeholder="Ville" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl max-h-72">
                  <SelectItem value="all">Toutes les villes</SelectItem>
                  {cities.map(city => (
                    <SelectItem key={city} value={city.toLowerCase()}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-6 border-t border-slate-100">
            {/* Dynamic filter pills / checkboxes */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => setRecruitingOnly(!recruitingOnly)}
                className={`py-2 px-4 rounded-xl border-2 font-bold text-xs transition-all flex items-center gap-2 ${
                  recruitingOnly 
                    ? 'bg-orange-600 border-orange-600 text-white shadow-md' 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300'
                }`}
              >
                <Target className="h-4 w-4" /> Actuellement en recrutement
              </button>

              {/* Size Select button alternative */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest hidden sm:inline">Taille :</span>
                <Select value={selectedSize} onValueChange={setSelectedSize}>
                  <SelectTrigger className="h-9 w-40 rounded-xl border-slate-200 font-bold text-xs bg-white text-slate-600">
                    <SelectValue placeholder="Taille" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Toutes tailles</SelectItem>
                    <SelectItem value="1-10 employés">1-10 employés</SelectItem>
                    <SelectItem value="11-50 employés">11-50 employés</SelectItem>
                    <SelectItem value="51-200 employés">51-200 employés</SelectItem>
                    <SelectItem value="201-500 employés">201-500 employés</SelectItem>
                    <SelectItem value="Plus de 500 employés">Plus de 500 employés</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active filters display vs reset */}
            {(searchTerm || selectedSector !== 'all' || selectedSize !== 'all' || selectedCity !== 'all' || recruitingOnly) && (
              <Button 
                variant="ghost" 
                onClick={clearFilters}
                className="text-orange-600 hover:text-orange-700 font-black text-xs uppercase"
              >
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        </Card>

        {/* Counters & Grid */}
        <div className="flex justify-between items-center mb-6 px-1">
          <p className="text-sm text-slate-500 font-bold">
            <span className="text-slate-900 font-black">{filteredCompanies.length}</span> {filteredCompanies.length > 1 ? 'entreprises trouvées' : 'entreprise trouvée'}
          </p>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500 font-bold">Chargement de l'annuaire...</p>
          </div>
        ) : filteredCompanies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company, index) => {
              const activeOffers = jobsMap[company.uid] || 0;
              const isCurrentlyRecruiting = company.recruitmentNeeds?.currentlyRecruiting || activeOffers > 0;
              
              return (
                <motion.div
                  key={company.uid}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
                >
                  <Card className="border-none shadow-lg hover:shadow-2xl transition-all duration-300 rounded-[30px] overflow-hidden bg-white flex flex-col h-full group">
                     {/* Card Mini-Cover header */}
                     <div className="h-28 bg-slate-100 relative overflow-hidden shrink-0">
                       {company.branding?.bannerUrl ? (
                          <img 
                            src={company.branding.bannerUrl} 
                            alt={`${company.companyName} Cover`} 
                            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                          />
                       ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950/20" />
                       )}
                       <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-transparent" />
                       
                       {/* Recruitment status badge overlay */}
                       {isCurrentlyRecruiting && (
                         <div className="absolute top-4 right-4 z-10">
                           <Badge className="bg-orange-600 text-white border-none font-extrabold px-3 py-1 rounded-full text-[10px] shadow-sm animate-pulse">
                             RECRUTE
                           </Badge>
                         </div>
                       )}
                     </div>

                     {/* Main Content Area */}
                     <CardContent className="p-6 pt-0 flex-1 flex flex-col relative">
                       {/* Company Logo positioning offset */}
                       <div className="flex justify-between items-end mb-4 -translate-y-8 relative z-10">
                         <div className="h-16 w-16 bg-white rounded-2xl p-1 shadow-md border border-slate-100 shrink-0">
                           <div className="h-full w-full rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center">
                             {company.photoUrl ? (
                               <img src={company.photoUrl} alt={company.companyName} className="h-full w-full object-contain p-1" />
                             ) : (
                               <Building2 className="h-7 w-7 text-slate-300" />
                             )}
                           </div>
                         </div>
                         
                         {company.status === 'approved' && (
                           <Badge className="bg-blue-50 text-blue-600 border-none rounded-full px-2.5 py-0.5 flex items-center gap-1 text-[9px] font-black tracking-wider uppercase shadow-none h-6">
                             <ShieldCheck className="h-3 w-3" />
                             Vérifiée
                           </Badge>
                         )}
                       </div>

                       {/* Slogan & Detail text (shift back a bit due to logo offset) */}
                       <div className="-mt-6 flex-1 flex flex-col">
                         <h3 className="text-xl font-black text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                           {company.companyName}
                         </h3>
                         
                         <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1 capitalize">
                           {company.sectorActivity || 'Secteur non défini'}
                         </p>

                         <p className="text-slate-500 font-medium text-xs md:text-sm mt-3 leading-relaxed line-clamp-3 italic">
                           {company.companyShortDescription || "Découvrez nos ambitions et projets d'avenir sur notre profil d'entreprise."}
                         </p>

                         {/* Traceability properties meta list */}
                         <div className="grid grid-cols-2 gap-y-2 gap-x-4 border-t border-slate-50 pt-4 mt-4 text-xs font-bold text-slate-400">
                           <span className="flex items-center gap-1.5 min-w-0">
                             <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0" /> 
                             <span className="truncate">{company.city || 'Abidjan'}</span>
                           </span>
                           <span className="flex items-center gap-1.5 min-w-0">
                             <Users className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                             <span className="truncate">{company.companySize || '1-10 emp'}</span>
                           </span>
                         </div>
                       </div>

                       {/* Footer active jobs & view button */}
                       <div className="border-t border-slate-100 pt-4 mt-6 flex items-center justify-between gap-4 font-bold text-xs shrink-0">
                          <div className="flex flex-col">
                            <span className="text-slate-900 font-black text-sm">{activeOffers}</span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Offres Actives</span>
                          </div>

                          <Link to={`/company/${company.uid}`}>
                            <Button 
                              variant="outline"
                              className="border-slate-200 group-hover:border-orange-600 text-slate-700 group-hover:text-orange-600 hover:bg-orange-50 font-black text-xs rounded-xl h-10 px-4 transition-all"
                            >
                              Voir le profil <ChevronRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                            </Button>
                          </Link>
                       </div>
                     </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-slate-200 p-8 shadow-sm">
            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
              <Building2 className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">Aucune entreprise trouvée</h3>
            <p className="text-slate-400 font-medium max-w-sm mx-auto mt-2 leading-relaxed">
              Nous n'avons pas trouvé de structures correspondant à vos critères de recherche. Essayez d'ajuster ou de réinitialiser vos filtres.
            </p>
            <Button className="mt-6 h-12 rounded-xl bg-slate-900 text-white font-bold" onClick={clearFilters}>
              Voir toutes les entreprises
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
