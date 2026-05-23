/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, Building2, User, Mail, Lock, Phone, MapPin, Upload, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { UserRole, UserProfile } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export default function Signup() {
  const [searchParams] = useSearchParams();
  const initialRole = (searchParams.get('role') as UserRole) || 'candidate';
  
  const [role, setRole] = useState<UserRole>(initialRole);
  const [isLoading, setIsLoading] = useState(false);
  const { user, loginWithGoogle, signupWithEmail, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Form states
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: '',
    location: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    registrationNumber: '',
    companyDescription: '',
    website: '',
    sectorActivity: '',
    companySize: '',
    companyType: 'PME',
    city: '',
    commune: '',
    address: '',
    manager: {
      firstName: '',
      lastName: '',
      role: '',
      phone: '',
      email: ''
    },
    branding: {
      mission: '',
      vision: '',
      values: [] as string[],
      perks: [] as string[]
    },
    legalDocuments: {} as any
  });

  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'recruiter') {
        if (user.status === 'submitted' || user.status === 'pending') {
          navigate('/pending-approval');
        } else {
          navigate('/dashboard/company');
        }
      } else if (user.role === 'candidate') {
        navigate('/dashboard/member');
      } else {
        navigate('/');
      }
    }
  }, [user, authLoading, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (role === 'recruiter' && (!formData.legalDocuments.rccmUrl || !formData.legalDocuments.taxStatusUrl)) {
      setError("Veuillez charger tous les documents obligatoires (RCCM & Attestation Fiscale)");
      return;
    }

    setError(null);
    setIsLoading(true);
    
    try {
      const userData: Partial<UserProfile> = {
        role,
        displayName: formData.displayName,
        firstName: role === 'candidate' ? formData.displayName.split(' ')[0] : formData.manager.firstName,
        lastName: role === 'candidate' ? formData.displayName.split(' ').slice(1).join(' ') : formData.manager.lastName,
        phone: formData.phone,
        location: formData.location,
        city: formData.city,
        commune: formData.commune,
        address: formData.address,
        companyName: role === 'recruiter' ? formData.displayName : undefined,
        registrationNumber: formData.registrationNumber,
        companyDescription: formData.companyDescription,
        website: formData.website,
        sectorActivity: formData.sectorActivity,
        companySize: formData.companySize,
        companyType: formData.companyType,
        manager: role === 'recruiter' ? {
          ...formData.manager,
          email: formData.manager.email || formData.email
        } : undefined,
        branding: role === 'recruiter' ? formData.branding : undefined,
        legalDocuments: formData.legalDocuments,
      };
      
      await signupWithEmail(formData.email, formData.password, userData);
    } catch (error: any) {
      console.error(error);
      setError(error.message || "Une erreur est survenue lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle(role);
    } catch (error: any) {
      console.error(error);
      setError(error.message || "Erreur lors de l'authentification Google");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container relative min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4 text-slate-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Créer un compte</h1>
          <p className="text-slate-500 mt-2 font-medium">Rejoignez la plus grande communauté emploi en Afrique.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-bold animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        <Tabs value={role} onValueChange={(v) => setRole(v as UserRole)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 p-1.5 rounded-3xl h-16 shadow-inner">
            <TabsTrigger value="candidate" className="rounded-2xl text-lg font-bold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-lg transition-all">
              <User className="mr-2 h-5 w-5" /> Candidat
            </TabsTrigger>
            <TabsTrigger value="recruiter" className="rounded-2xl text-lg font-bold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-lg transition-all">
              <Building2 className="mr-2 h-5 w-5" /> Recruteur
            </TabsTrigger>
          </TabsList>

          <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[40px] overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-8 pt-8 px-8">
              <CardTitle className="text-2xl font-black">
                {role === 'candidate' ? "Informations personnelles" : "Votre Entreprise"}
              </CardTitle>
              <CardDescription className="text-slate-500 font-medium text-base mt-2">
                {role === 'candidate' 
                  ? "Inscrivez-vous rapidement pour commencer votre recherche. Vous pourrez enrichir votre profil plus tard."
                  : "Le recrutement de qualité nécessite de la transparence. Préparez vos documents officiels (RCCM, etc.)."}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSignup}>
              <CardContent className="p-8 space-y-8">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700 ml-1">{role === 'candidate' ? "Nom complet" : "Nom de l'entreprise"}</Label>
                    <Input 
                      placeholder={role === 'candidate' ? "Jean Dupont" : "AfriCorp Sarl"} 
                      className="h-14 rounded-2xl border-slate-200 focus-visible:ring-orange-600 transition-all font-medium" 
                      value={formData.displayName}
                      onChange={e => setFormData({...formData, displayName: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700 ml-1">Email professionnel</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input 
                        type="email" 
                        placeholder="contact@exemple.com" 
                        className="pl-12 h-14 rounded-2xl border-slate-200 focus-visible:ring-orange-600 transition-all font-medium" 
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        required 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700 ml-1">Téléphone</Label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input 
                        type="tel" 
                        placeholder="+225 07 00 00 00 00" 
                        className="pl-12 h-14 rounded-2xl border-slate-200 focus-visible:ring-orange-600 transition-all font-medium" 
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        required 
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700 ml-1">Ville / Pays</Label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input 
                        placeholder="Abidjan, Côte d'Ivoire" 
                        className="pl-12 h-14 rounded-2xl border-slate-200 focus-visible:ring-orange-600 transition-all font-medium" 
                        value={formData.location}
                        onChange={e => setFormData({...formData, location: e.target.value})}
                        required 
                      />
                    </div>
                  </div>
                </div>

                {role === 'recruiter' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-12 pt-4"
                  >
                    {/* Section 1: Identité Professionnelle */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xs">01</div>
                        <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Identité Professionnelle</h3>
                      </div>
                      
                      <div className="p-6 bg-slate-50 border border-slate-100 rounded-[32px] space-y-6">
                        <div className="grid sm:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label className="text-sm font-bold text-slate-700 ml-1">RCCM (Registre Commerce)</Label>
                            <Input 
                              placeholder="N° CI-ABJ-..." 
                              className="h-14 rounded-2xl border-slate-200 bg-white" 
                              value={formData.registrationNumber}
                              onChange={e => setFormData({...formData, registrationNumber: e.target.value})}
                              required 
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-sm font-bold text-slate-700 ml-1">Site Web (Optionnel)</Label>
                            <Input 
                              placeholder="https://www.entreprise.com" 
                              className="h-14 rounded-2xl border-slate-200 bg-white" 
                              value={formData.website || ''}
                              onChange={e => setFormData({...formData, website: e.target.value})}
                            />
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label className="text-sm font-bold text-slate-700 ml-1">Secteur d'Activité</Label>
                            <Select onValueChange={(v) => setFormData({...formData, sectorActivity: v})} required>
                              <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white">
                                <SelectValue placeholder="Choisir un secteur" />
                              </SelectTrigger>
                              <SelectContent>
                                {["Informatique & Cloud", "Banque & Finance", "Assurance", "BTP & Construction", "Télécommunications", "Agriculture", "Santé", "Éducation", "Logistique", "Autre"].map(s => (
                                  <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-sm font-bold text-slate-700 ml-1">Type de structure</Label>
                            <Select onValueChange={(v) => setFormData({...formData, companyType: v})} defaultValue="PME">
                              <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white">
                                <SelectValue placeholder="Type" />
                              </SelectTrigger>
                              <SelectContent>
                                {["TPE", "PME", "Grande Entreprise", "Multinationale", "ONG", "Public"].map(s => (
                                  <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-6">
                           <div className="space-y-3">
                            <Label className="text-sm font-bold text-slate-700 ml-1">Commune / Zone</Label>
                            <Input 
                              placeholder="ex: Plateau, Cocody..." 
                              className="h-14 rounded-2xl border-slate-200 bg-white" 
                              value={formData.commune}
                              onChange={e => setFormData({...formData, commune: e.target.value})}
                              required 
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-sm font-bold text-slate-700 ml-1">Taille Entreprise</Label>
                            <Select onValueChange={(v) => setFormData({...formData, companySize: v})} required>
                              <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white">
                                <SelectValue placeholder="Employés" />
                              </SelectTrigger>
                              <SelectContent>
                                {["1-10", "11-50", "51-200", "201-500", "500+"].map(s => (
                                  <SelectItem key={s} value={s + " employés"}>{s} employés</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Administrateur / Manager */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xs">02</div>
                        <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Identité du Responsable</h3>
                      </div>
                      <div className="p-6 bg-slate-50 border border-slate-100 rounded-[32px] space-y-6">
                        <div className="grid sm:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label className="text-sm font-bold text-slate-700 ml-1">Prénom du responsable</Label>
                            <Input 
                              placeholder="Jean" 
                              className="h-14 rounded-2xl border-slate-200 bg-white" 
                              value={formData.manager.firstName}
                              onChange={e => setFormData({...formData, manager: {...formData.manager, firstName: e.target.value}})}
                              required 
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-sm font-bold text-slate-700 ml-1">Nom du responsable</Label>
                            <Input 
                              placeholder="Kouassi" 
                              className="h-14 rounded-2xl border-slate-200 bg-white" 
                              value={formData.manager.lastName}
                              onChange={e => setFormData({...formData, manager: {...formData.manager, lastName: e.target.value}})}
                              required 
                            />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-sm font-bold text-slate-700 ml-1">Poste / Fonction</Label>
                          <Input 
                            placeholder="ex: DRH, Directeur Général..." 
                            className="h-14 rounded-2xl border-slate-200 bg-white" 
                            value={formData.manager.role}
                            onChange={e => setFormData({...formData, manager: {...formData.manager, role: e.target.value}})}
                            required 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Documents de Vérification */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xs">03</div>
                        <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Documents Officiels (Obligatoires)</h3>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-orange-400 transition-all cursor-pointer bg-white group">
                          <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            accept=".pdf,image/*" 
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 350 * 1024) { 
                                alert("Document trop volumineux (Maximum 350 Ko requis pour ce document). Veuillez compresser votre PDF/Image avant l'envoi."); 
                                return; 
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setFormData({
                                  ...formData, 
                                  legalDocuments: { 
                                    ...(formData.legalDocuments || {}), 
                                    rccmUrl: reader.result as string,
                                    rccmName: file.name
                                  }
                                });
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                          <Upload className="h-6 w-6 text-slate-300 mx-auto mb-2 group-hover:text-orange-500 transition-colors" />
                          <p className="text-xs font-black text-slate-900">RCCM</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {formData.legalDocuments?.rccmUrl ? `✓ ${formData.legalDocuments.rccmName}` : "PDF ou Image"}
                          </p>
                        </div>

                        <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-orange-400 transition-all cursor-pointer bg-white group">
                          <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            accept=".pdf,image/*" 
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 350 * 1024) { 
                                alert("Document trop volumineux (Maximum 350 Ko requis pour ce document). Veuillez compresser votre PDF/Image avant l'envoi."); 
                                return; 
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setFormData({
                                  ...formData, 
                                  legalDocuments: { 
                                    ...(formData.legalDocuments || {}), 
                                    taxStatusUrl: reader.result as string,
                                    taxStatusName: file.name
                                  }
                                });
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                          <Upload className="h-6 w-6 text-slate-300 mx-auto mb-2 group-hover:text-orange-500 transition-colors" />
                          <p className="text-xs font-black text-slate-900">Attestation Fiscale</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {formData.legalDocuments?.taxStatusUrl ? `✓ ${formData.legalDocuments.taxStatusName}` : "PDF ou Image"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xs">04</div>
                        <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Description & Présentation</h3>
                      </div>
                      <div className="p-6 bg-slate-50 border border-slate-100 rounded-[32px] space-y-6">
                        <div className="space-y-3">
                          <Label className="text-sm font-bold text-slate-700 ml-1">Présentation de l'activité</Label>
                          <Textarea 
                            placeholder="Décrivez brièvement votre activité, vos services..." 
                            className="min-h-[120px] rounded-2xl border-slate-200 bg-white resize-none" 
                            value={formData.companyDescription}
                            onChange={e => setFormData({...formData, companyDescription: e.target.value})}
                            required 
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-sm font-bold text-slate-700 ml-1">Mission de l'entreprise (Optionnel)</Label>
                          <Textarea 
                            placeholder="Quelle est votre mission principale ?" 
                            className="min-h-[80px] rounded-2xl border-slate-200 bg-white resize-none text-sm" 
                            value={formData.branding.mission}
                            onChange={e => setFormData({...formData, branding: {...formData.branding, mission: e.target.value}})}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="space-y-6 pt-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-100" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-4 text-slate-400 font-black tracking-widest">SÉCURITÉ</span>
                    </div>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-bold text-slate-700 ml-1">Mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          className="pl-12 pr-12 h-14 rounded-2xl border-slate-200 focus-visible:ring-orange-600" 
                          value={formData.password}
                          onChange={e => setFormData({...formData, password: e.target.value})}
                          required 
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                          title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-bold text-slate-700 ml-1">Confirmer</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input 
                          type={showConfirmPassword ? "text" : "password"} 
                          className="pl-12 pr-12 h-14 rounded-2xl border-slate-200 focus-visible:ring-orange-600" 
                          value={formData.confirmPassword}
                          onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                          required 
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                          title={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-8 pt-0 flex flex-col gap-6">
                <Button type="submit" className="w-full h-16 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 text-lg font-black shadow-xl transition-all" disabled={isLoading}>
                  {isLoading ? "Création en cours..." : "S'inscrire gratuitement"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                
                <div className="relative w-full">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-100" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-4 text-slate-400 font-bold">OU CONTINUER AVEC</span>
                  </div>
                </div>

                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full h-14 rounded-2xl border-slate-200 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
                  onClick={handleGoogleSignup}
                  disabled={isLoading}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continuer avec Google
                </Button>

                <div className="text-sm font-bold text-center text-slate-500">
                  Vous avez déjà un compte ?{" "}
                  <Link to="/login" className="text-orange-600 hover:orange-700 transition-colors ml-1">
                    Connectez-vous
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Card>
        </Tabs>
      </motion.div>
    </div>
  );
}
