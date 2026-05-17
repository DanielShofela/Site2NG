/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, UserCheck, AlertTriangle, FileBarChart, Check, X, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/types';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [pendingRecruiters, setPendingRecruiters] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    pending: 0,
    recruiters: 0,
    candidates: 0,
    jobs: 0
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const fetchData = async () => {
      try {
        // Fetch pending recruiters
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'recruiter'),
          where('status', '==', 'pending')
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[];
        setPendingRecruiters(list);

        // Fetch counts (simulated for now or real if desired, but let's do a few real counts)
        const recruitersQ = query(collection(db, 'users'), where('role', '==', 'recruiter'));
        const rSnapshot = await getDocs(recruitersQ);
        const candidatesQ = query(collection(db, 'users'), where('role', '==', 'candidate'));
        const cSnapshot = await getDocs(candidatesQ);
        const jobsQ = query(collection(db, 'jobs'));
        const jSnapshot = await getDocs(jobsQ);

        setStats({
          pending: list.length,
          recruiters: rSnapshot.size,
          candidates: cSnapshot.size,
          jobs: jSnapshot.size
        });
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleAction = async (uid: string, type: 'approve' | 'reject') => {
    setValidatingId(uid);
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        status: type === 'approve' ? 'approved' : 'rejected'
      });
      setPendingRecruiters(pendingRecruiters.filter(r => r.uid !== uid));
      setStats(prev => ({
        ...prev,
        pending: prev.pending - 1
      }));
    } catch (error) {
      console.error('Error updating user status:', error);
    } finally {
      setValidatingId(null);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-2xl font-bold">Accès réservé aux administrateurs</h2>
        <p className="text-muted-foreground mt-2">Veuillez vous connecter avec un compte admin.</p>
      </div>
    );
  }

  return (
    <div className="container py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Console Administration</h1>
        <p className="text-muted-foreground mt-1">Gérez la sécurité et le contenu de la plateforme.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "En attente", value: stats.pending, icon: AlertTriangle, color: "text-orange-600" },
          { label: "Recruteurs", value: stats.recruiters, icon: ShieldCheck, color: "text-green-600" },
          { label: "Candidats", value: stats.candidates, icon: UserCheck, color: "text-blue-600" },
          { label: "Offres", value: stats.jobs, icon: FileBarChart, color: "text-purple-600" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-lg shadow-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 bg-accent rounded-lg ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Validations Recruteurs Prioritaires</CardTitle>
            <CardDescription>Vérifiez les documents légaux avant d'autoriser la publication.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRecruiters.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground italic">
                Aucune validation en attente.
              </div>
            ) : (
              pendingRecruiters.map((rec) => (
                <div key={rec.uid} className="flex flex-col sm:flex-row items-center justify-between p-4 border rounded-xl hover:bg-accent/30 transition-colors gap-4">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="h-10 w-10 bg-primary/5 text-primary rounded-full flex items-center justify-center">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold">{rec.companyName || rec.displayName}</p>
                      <p className="text-xs text-muted-foreground">RCCM: {rec.registrationNumber || 'N/A'} • {rec.location}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 sm:flex-none text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleAction(rec.uid, 'reject')}
                      disabled={validatingId === rec.uid}
                    >
                      Refuser
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                      onClick={() => handleAction(rec.uid, 'approve')}
                      disabled={validatingId === rec.uid}
                    >
                      {validatingId === rec.uid ? "..." : "Approuver"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activités Récentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                { text: "Nouveau recruteur inscrit", time: "Il y a 5 min", color: "bg-blue-500" },
                { text: "15 candidatures soumises", time: "Il y a 12 min", color: "bg-green-500" },
                { text: "Offre signalée par un candidat", time: "Il y a 45 min", color: "bg-red-500" },
                { text: "Mise à jour CMS effectuée", time: "Il y a 1h", color: "bg-purple-500" },
              ].map((log, i) => (
                <div key={i} className="flex gap-3">
                  <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${log.color}`} />
                  <div>
                    <p className="text-sm font-medium">{log.text}</p>
                    <p className="text-[10px] text-muted-foreground">{log.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
