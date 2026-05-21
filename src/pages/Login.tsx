/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Lock, Mail, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, loginWithGoogle, loginWithEmail, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'recruiter') {
        if (user.status === 'pending') {
          navigate('/pending-approval');
        } else {
          navigate('/recruiter');
        }
      } else if (user.role === 'candidate') {
        navigate('/candidate');
      } else {
        navigate('/');
      }
    }
  }, [user, authLoading, navigate]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      console.error(error);
      setError(error.message || "Erreur lors de la connexion Google");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await loginWithEmail(email, password);
    } catch (error: any) {
      console.error(error);
      setError("Email ou mot de passe incorrect");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container relative min-h-[calc(100vh-64px)] flex items-center justify-center py-12 text-slate-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md px-4"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-orange-50 text-orange-600 rounded-[24px] mb-6 shadow-sm">
            <Briefcase className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Bon retour !</h1>
          <p className="text-slate-500 mt-2 font-medium">Connectez-vous pour accéder à votre espace.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-bold text-center animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[40px] overflow-hidden bg-white">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-2xl font-black">Connexion</CardTitle>
            <CardDescription className="font-medium text-slate-500">
              Entrez vos identifiants pour continuer.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="p-8 pt-4 space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-bold text-slate-700 ml-1">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="exemple@mail.com" 
                    className="pl-12 h-14 rounded-2xl border-slate-200 focus-visible:ring-orange-600 font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" title="password label" className="text-sm font-bold text-slate-700">Mot de passe</Label>
                  <Link to="/forgot-password" size="sm" className="text-xs font-bold text-orange-600 hover:orange-700 transition-colors">
                    Oublié ?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input 
                    id="password" 
                    type="password" 
                    className="pl-12 h-14 rounded-2xl border-slate-200 focus-visible:ring-orange-600"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-8 pt-0 flex flex-col gap-6">
              <Button type="submit" className="w-full h-16 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 text-lg font-black shadow-xl transition-all" disabled={isLoading}>
                {isLoading ? "Connexion en cours..." : "Se connecter"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-4 text-slate-400 font-bold">OU</span>
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-14 rounded-2xl border-slate-200 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
                onClick={handleGoogleLogin}
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
                Google Sign In
              </Button>

              <div className="text-sm font-bold text-center text-slate-500">
                Pas encore de compte ?{" "}
                <Link to="/signup" className="text-orange-600 hover:orange-700 transition-colors ml-1">
                  Inscrivez-vous
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
      
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-600/5 rounded-full blur-[120px] -z-10" />
    </div>
  );
}
