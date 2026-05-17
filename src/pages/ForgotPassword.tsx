/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sendPasswordReset } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await sendPasswordReset(email);
      setIsSent(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Une erreur est survenue lors de l'envoi de l'email.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container relative min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4 text-slate-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
        className="w-full max-w-[500px] z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-orange-50 text-orange-600 rounded-[28px] mb-6 shadow-sm border border-orange-100/50">
            <Mail className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Mot de passe oublié ?</h1>
          <p className="text-slate-500 mt-2 font-medium max-w-sm mx-auto">
            Pas de panique ! Entrez votre email pour recevoir un lien de réinitialisation.
          </p>
        </div>

        {isSent ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[40px] overflow-hidden bg-white p-12 text-center">
              <div className="flex justify-center mb-6">
                <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-4">Email Envoyé !</h2>
              <p className="text-slate-500 font-medium mb-10">
                Nous avons envoyé un lien de réinitialisation à <span className="text-slate-900 font-bold">{email}</span>. 
                Vérifiez votre boîte de réception et vos spams.
              </p>
              <Link to="/login">
                <Button className="w-full h-16 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 text-lg font-black shadow-xl transition-all">
                  Retour à la connexion
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </Card>
          </motion.div>
        ) : (
          <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[40px] overflow-hidden bg-white">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-2xl font-black">Réinitialisation</CardTitle>
              <CardDescription className="font-medium text-slate-500">
                Vous recevrez un lien valide pendant 1 heure.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="p-8 pt-4 space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold leading-relaxed flex items-start gap-3">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {error}
                  </div>
                )}
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-sm font-bold text-slate-700 ml-1">Email professionnel</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="votre@email.com" 
                      className="pl-12 h-14 rounded-2xl border-slate-200 focus-visible:ring-orange-600 font-medium"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-8 pt-0 flex flex-col gap-6">
                <Button type="submit" className="w-full h-16 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 text-lg font-black shadow-xl transition-all" disabled={isLoading}>
                  {isLoading ? "Envoi en cours..." : "Envoyer le lien"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>

                <div className="text-sm font-bold text-center text-slate-500 flex items-center justify-center gap-2">
                  <Link to="/login" className="text-orange-600 hover:text-orange-700 transition-colors flex items-center gap-1 group">
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Retour à la connexion
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Card>
        )}
      </motion.div>
      
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-600/5 rounded-full blur-[120px] -z-10" />
    </div>
  );
}
