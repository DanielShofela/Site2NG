/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, FileText, CheckCircle, Clock, MapPin, ExternalLink, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function CandidateDashboard() {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('applied');
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Profile edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [cvBlobUrl, setCvBlobUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let url: string | null = null;
    
    if (user?.cvUrl?.startsWith('data:')) {
      try {
        const base64Data = user.cvUrl;
        const parts = base64Data.split(',');
        if (parts.length === 2) {
          // Clean the base64 string to avoid atob errors
          const pureBase64 = parts[1].replace(/\s/g, '');
          const byteString = atob(pureBase64);
          const mimeString = parts[0].split(':')[1].split(';')[0];
          
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          
          const blob = new Blob([ab], { type: mimeString });
          url = URL.createObjectURL(blob);
          setCvBlobUrl(url);
        }
      } catch (e) {
        console.error('Error creating Blob URL:', e);
        setCvBlobUrl(user.cvUrl || null);
      }
    } else if (user?.cvUrl) {
      setCvBlobUrl(user.cvUrl);
    } else {
      setCvBlobUrl(null);
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [user?.cvUrl]);

  useEffect(() => {
    if (!user) return;
    
    // Initialize form with user data
    setEditName(user.displayName || '');
    setEditTitle(user.jobTitle || '');
    setEditLocation(user.location || '');

    const fetchApplications = async () => {
      try {
        const q = query(
          collection(db, 'applications'),
          where('candidateId', '==', user.uid),
          orderBy('appliedAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const apps = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setApplications(apps);
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [user]);

  const handleCvUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Optional: check file size (max 600KB to stay safe with Firestore 1MB limit after base64 encoding)
    if (file.size > 600 * 1024) {
      alert("Le fichier est trop volumineux (max 600Ko).");
      return;
    }

    try {
      setIsSaving(true);
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          await updateProfile({
            cvName: file.name,
            cvUrl: base64String,
            cvUpdatedAt: new Date()
          });
        } catch (error) {
          console.error('Error updating CV in Firestore:', error);
        } finally {
          setIsSaving(false);
        }
      };
      
      reader.onerror = () => {
        console.error('Error reading file');
        setIsSaving(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error in handleCvUpdate:', error);
      setIsSaving(false);
    }
  };

  if (!user || user.role !== 'candidate') {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-2xl font-bold">Accès restreint</h2>
        <p className="text-muted-foreground mt-2">Vous devez être connecté en tant que candidat pour voir cette page.</p>
      </div>
    );
  }

  const getStatusBadgeProps = (status: string) => {
    switch (status) {
      case 'viewed': return { color: 'bg-blue-100 text-blue-700', label: 'Vue' };
      case 'shortlisted': return { color: 'bg-green-100 text-green-700', label: 'Sélectionné' };
      case 'rejected': return { color: 'bg-red-100 text-red-700', label: 'Refusé' };
      case 'pending':
      default: return { color: 'bg-yellow-100 text-yellow-700', label: 'En attente' };
    }
  };

  return (
    <div className="container py-10 px-4">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar / Profile Summary */}
        <div className="w-full md:w-80 space-y-6">
          <Card className="border-none shadow-xl shadow-primary/5">
            <CardContent className="pt-8 text-center">
              <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-primary/10">
                <AvatarImage src={user.photoUrl} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {(user.displayName || '?').split(' ').map(n => n?.[0] || '').join('')}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">{user.displayName}</h2>
              <p className="text-sm text-muted-foreground">{user.jobTitle || 'Candidat'}</p>
              <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {user.location}
              </div>

              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger asChild nativeButton={true}>
                  <Button variant="outline" className="w-full mt-6 rounded-full">Modifier le profil</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Modifier le profil</DialogTitle>
                    <DialogDescription>
                      Mettez à jour vos informations personnelles ici.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nom complet</Label>
                      <Input
                        id="name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="title">Titre professionnel</Label>
                      <Input
                        id="title"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="location">Localisation</Label>
                      <Input
                        id="location"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      onClick={async () => {
                        setIsSaving(true);
                        try {
                          await updateProfile({
                            displayName: editName,
                            jobTitle: editTitle,
                            location: editLocation
                          });
                          setIsEditing(false);
                        } catch (error) {
                          console.error(error);
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      disabled={isSaving}
                    >
                      {isSaving ? "Enregistrement..." : "Enregistrer"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl shadow-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Mon CV</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                <FileText className="h-8 w-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{user.cvName || 'Aucun CV'}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(() => {
                      if (!user.cvUpdatedAt) return 'Non renseigné';
                      try {
                        const date = user.cvUpdatedAt.seconds 
                          ? new Date(user.cvUpdatedAt.seconds * 1000) 
                          : new Date(user.cvUpdatedAt);
                        
                        if (isNaN(date.getTime())) return 'Date invalide';
                        
                        return `Mis à jour ${formatDistanceToNow(date, { addSuffix: true, locale: fr })}`;
                      } catch (e) {
                        return 'Date invalide';
                      }
                    })()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="flex-1 text-[10px] h-8"
                  onClick={() => setIsPreviewOpen(true)}
                  disabled={!user.cvUrl || user.cvUrl === '#'}
                >
                  <Eye className="mr-1 h-3 w-3" /> Voir
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="flex-1 text-[10px] h-8"
                  asChild
                  nativeButton={false}
                >
                  <a 
                    href={cvBlobUrl || user.cvUrl || '#'} 
                    download={user.cvName || 'Mon_CV.pdf'}
                    className="flex items-center justify-center"
                  >
                    <FileText className="mr-1 h-3 w-3" /> Télécharger
                  </a>
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="flex-1 text-[10px] h-8"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSaving}
                >
                  {isSaving ? '...' : 'Actualiser'}
                </Button>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={handleCvUpdate}
              />
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card className="border-none shadow-xl shadow-primary/5 bg-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Candidatures</p>
                    <h3 className="text-2xl font-bold mt-1">{applications.length}</h3>
                  </div>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-xl shadow-primary/5 bg-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vues Profil</p>
                    <h3 className="text-2xl font-bold mt-1">{user.profileViews || 0}</h3>
                  </div>
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                    <Eye className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-xl shadow-primary/5 bg-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Offres Enregistrées</p>
                    <h3 className="text-2xl font-bold mt-1">0</h3>
                  </div>
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Mes Candidatures</h1>
            <Link to="/jobs">
              <Button variant="link" className="text-primary pr-0 flex items-center">
                Explorer plus d'offres <Search className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-accent/50 p-1 mb-6">
              <TabsTrigger value="applied">Postulées ({applications.length})</TabsTrigger>
              <TabsTrigger value="saved">Enregistrées (0)</TabsTrigger>
            </TabsList>

            <TabsContent value="applied">
              <div className="grid gap-4">
                {applications.length > 0 ? (
                  applications.map((app) => {
                    const statusProps = getStatusBadgeProps(app.status);
                    return (
                      <Card key={app.id} className="hover:border-primary/20 transition-all border border-transparent shadow-sm">
                        <CardContent className="py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-accent rounded-xl flex items-center justify-center font-bold text-muted-foreground">
                              {app.companyName?.[0] || 'J'}
                            </div>
                            <div>
                              <h3 className="font-bold">{app.jobTitle}</h3>
                              <p className="text-sm text-muted-foreground tracking-tight">{app.companyName}</p>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> 
                              {(() => {
                                try {
                                  if (!app.appliedAt) return 'Récemment';
                                  const date = app.appliedAt.seconds 
                                    ? new Date(app.appliedAt.seconds * 1000) 
                                    : new Date(app.appliedAt);
                                  if (isNaN(date.getTime())) return 'Récemment';
                                  return `Postulé ${formatDistanceToNow(date, { addSuffix: true, locale: fr })}`;
                                } catch (e) {
                                  return 'Récemment';
                                }
                              })()}
                            </div>
                            <Badge className={`${statusProps.color} border-none px-3`}>{statusProps.label}</Badge>
                            <Button variant="ghost" size="sm">Détails</Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="text-center py-10 bg-accent/20 rounded-2xl">
                    <p className="text-muted-foreground">Vous n'avez pas encore postulé à des offres.</p>
                    <Link to="/jobs">
                      <Button variant="link">Voir les offres disponibles</Button>
                    </Link>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <section className="pt-6">
            <h2 className="text-xl font-bold mb-4">Conseils pour booster votre profil</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="bg-primary/5 border-none shadow-none">
                <CardContent className="pt-6">
                  <CheckCircle className="h-6 w-6 text-primary mb-2" />
                  <h4 className="font-bold mb-1 italic">Ajoutez vos compétences</h4>
                  <p className="text-xs text-muted-foreground">Les profils avec des compétences précises attirent 3x plus les recruteurs.</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none shadow-none">
                <CardContent className="pt-6">
                  <ExternalLink className="h-6 w-6 text-primary mb-2" />
                  <h4 className="font-bold mb-1 italic">Profil public</h4>
                  <p className="text-xs text-muted-foreground">Partagez votre profil AfriJob sur les réseaux sociaux professionnels.</p>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </div>

      {/* CV Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[800px] h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Aperçu de mon CV</DialogTitle>
            <DialogDescription>{user.cvName}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 w-full h-full p-4">
            {(() => {
              if (!user.cvUrl || user.cvUrl === '#') {
                return (
                  <div className="flex flex-col items-center justify-center h-full space-y-4 bg-accent/10 rounded-md border-2 border-dashed">
                    <FileText className="h-16 w-16 text-muted-foreground" />
                    <div className="text-center">
                      <p className="font-semibold text-lg">Aperçu non disponible</p>
                      <p className="text-sm text-muted-foreground max-w-[300px]">
                        L'aperçu sera disponible une fois que vous aurez téléchargé un fichier.
                      </p>
                    </div>
                  </div>
                );
              }

              // Use an embed. For base64, it's often better to show it via Blob URL
              return (
                <div className="w-full h-[calc(90vh-140px)] rounded-md border shadow-inner bg-white overflow-hidden relative">
                  <embed 
                    src={cvBlobUrl || ''} 
                    type="application/pdf"
                    className="w-full h-full"
                  />
                  <div className="absolute bottom-4 right-4 z-10">
                    <Button size="sm" asChild variant="secondary" className="shadow-md" nativeButton={false}>
                      <a href={cvBlobUrl || ''} target="_blank" rel="noopener noreferrer">
                        Ouvrir en plein écran
                      </a>
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
