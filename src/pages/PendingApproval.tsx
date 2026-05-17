/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, ShieldCheck, Mail, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function PendingApproval() {
  const { logout, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
      } else if (user.role === 'recruiter') {
        if (user.status === 'approved') {
          navigate('/recruiter');
        } else if (user.status === 'draft') {
          navigate('/recruiter-onboarding');
        }
      } else if (user.role === 'candidate') {
        navigate('/candidate');
      }
    }
  }, [user, loading, navigate]);

  if (loading) return null;

  const isRejected = user?.status === 'rejected';

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[40px] overflow-hidden bg-white text-center">
          <div className={`${isRejected ? 'bg-red-600' : 'bg-slate-900'} h-32 relative flex items-center justify-center transition-colors duration-500`}>
            <div className="absolute -bottom-10 bg-white p-4 rounded-full shadow-xl">
              <div className={`${isRejected ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'} p-4 rounded-full`}>
                {isRejected ? (
                  <ShieldCheck className="h-12 w-12" />
                ) : (
                  <Clock className="h-12 w-12 animate-pulse" />
                )}
              </div>
            </div>
          </div>
          
          <CardContent className="p-12 pt-16 space-y-8">
            <div className="space-y-4">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                {isRejected ? "Votre compte a été refusé" : "Compte en attente de validation"}
              </h1>
              <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-md mx-auto">
                {isRejected 
                  ? "Malheureusement, votre profil entreprise n'a pas pu être validé par notre équipe. Veuillez nous contacter pour plus d'informations."
                  : `Merci ${user?.displayName} ! Votre demande d'accès Recruteur est en cours d'examen par notre équipe.`
                }
              </p>
            </div>

            {!isRejected && (
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center gap-3">
                  <ShieldCheck className="h-8 w-8 text-orange-600" />
                  <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Sécurité</p>
                  <p className="text-[11px] text-slate-500 font-medium">Vérification de vos informations légales.</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-orange-600" />
                  <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Qualité</p>
                  <p className="text-[11px] text-slate-500 font-medium">Audit de la conformité de l'entreprise.</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center gap-3">
                  <Mail className="h-8 w-8 text-orange-600" />
                  <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Réponse</p>
                  <p className="text-[11px] text-slate-500 font-medium">Notification par email sous 24h.</p>
                </div>
              </div>
            )}

            <div className={`p-8 rounded-[32px] border ${isRejected ? 'bg-red-50 border-red-100/50' : 'bg-orange-50 border-orange-100/50'}`}>
              <p className={`text-sm font-bold ${isRejected ? 'text-red-800' : 'text-orange-800'}`}>
                {isRejected 
                  ? "Contact support: support@afrijob.ci"
                  : "Une fois validé, vous pourrez publier des offres et accéder à notre CVthèque."
                }
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="outline" 
                className="rounded-2xl h-14 border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                onClick={() => logout()}
              >
                <LogOut className="mr-2 h-5 w-5" /> Se déconnecter
              </Button>
              <Link to="/">
                <Button className="w-full sm:w-auto rounded-2xl h-14 px-8 bg-slate-900 text-white font-black shadow-xl hover:bg-slate-800 transition-all">
                  Retour à l'accueil
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
