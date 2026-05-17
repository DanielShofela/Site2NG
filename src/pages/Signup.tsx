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
import { Briefcase, Building2, User, Mail, Lock, Phone, MapPin, Upload, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { UserRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export default function Signup() {
  const [searchParams] = useSearchParams();
  const initialRole = (searchParams.get('role') as UserRole) || 'candidate';
  
  const [role, setRole] = useState<UserRole>(initialRole);
  const [isLoading, setIsLoading] = useState(false);
  const { user, loginWithGoogle, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'recruiter') {
        navigate('/recruiter');
      } else if (user.role === 'candidate') {
        navigate('/candidate');
      } else {
        navigate('/');
      }
    }
  }, [user, authLoading, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await loginWithGoogle(role);
      navigate('/');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container relative min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Créer un compte</h1>
          <p className="text-muted-foreground mt-2">Rejoignez la plus grande communauté emploi en Afrique.</p>
        </div>

        <Tabs value={role} onValueChange={(v) => setRole(v as UserRole)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-accent/50 p-1 rounded-full h-14">
            <TabsTrigger value="candidate" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <User className="mr-2 h-4 w-4" /> Candidat
            </TabsTrigger>
            <TabsTrigger value="recruiter" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Building2 className="mr-2 h-4 w-4" /> Recruteur
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSignup}>
            <Card className="border-none shadow-2xl shadow-primary/5">
              <CardHeader>
                <CardTitle>
                  {role === 'candidate' ? "Informations personnelles" : "Votre Entreprise"}
                </CardTitle>
                <CardDescription>
                  {role === 'candidate' 
                    ? "Inscrivez-vous pour postuler et être visible par les recruteurs."
                    : "Votre compte sera soumis à validation sous 24h."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">{role === 'candidate' ? "Nom complet" : "Nom entreprise"}</Label>
                    <Input id="displayName" placeholder={role === 'candidate' ? "Jean Dupont" : "AfriCorp Sarl"} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email professionnel</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="email" type="email" placeholder="contact@entreprise.com" className="pl-9" required />
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="phone" type="tel" placeholder="+225 07 00 00 00 00" className="pl-9" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Ville / Pays</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="location" placeholder="Abidjan, Côte d'Ivoire" className="pl-9" required />
                    </div>
                  </div>
                </div>

                {role === 'recruiter' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="registrationNumber">Registre de commerce (RCCM)</Label>
                      <Input id="registrationNumber" placeholder="N° RCCM CI-ABJ-..." required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="registrationFile">Preuve d'enregistrement (PDF / Image)</Label>
                      <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors cursor-pointer">
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Cliquez ou glissez votre justificatif ici</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyDescription">Description de l'entreprise</Label>
                      <Textarea id="companyDescription" placeholder="Décrivez votre activité..." className="min-h-[100px]" required />
                    </div>
                  </>
                )}

                <div className="grid sm:grid-cols-2 gap-4 border-t pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="password" type="password" className="pl-9" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmer</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="confirmPassword" type="password" className="pl-9" required />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full h-12" disabled={isLoading}>
                  {isLoading ? "Création en cours..." : "S'inscrire gratuitement"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <div className="text-sm text-center text-muted-foreground">
                  Vous avez déjà un compte ?{" "}
                  <Link to="/login" className="text-primary font-medium hover:underline">
                    Connectez-vous
                  </Link>
                </div>
              </CardFooter>
            </Card>
          </form>
        </Tabs>
      </motion.div>
    </div>
  );
}
