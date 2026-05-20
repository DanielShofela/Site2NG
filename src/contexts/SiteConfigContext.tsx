import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SiteConfig {
  siteName: string;
  logoUrl: string;
  iconUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryColor: string;
}

const defaultContent: SiteConfig = {
  siteName: "2NG Groupe Entreprises",
  logoUrl: "",
  iconUrl: "",
  heroTitle: "Trouvez le talent qui propulsera votre entreprise",
  heroSubtitle: "La plateforme de recrutement nouvelle génération pour l'Afrique.",
  primaryColor: "#ea580c"
};

const SiteConfigContext = createContext<{
  config: SiteConfig;
  loading: boolean;
}>({
  config: defaultContent,
  loading: true
});

export function SiteConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(defaultContent);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'site_config', 'home'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SiteConfig;
        setConfig({ ...defaultContent, ...data });
        
        // Dynamic Favicon Update
        if (data.iconUrl) {
          const favicon = document.querySelector('link[rel="icon"]');
          if (favicon) {
            favicon.setAttribute('href', data.iconUrl);
          } else {
            const newFavicon = document.createElement('link');
            newFavicon.rel = 'icon';
            newFavicon.href = data.iconUrl;
            document.head.appendChild(newFavicon);
          }
        }
        
        // Dynamic Title Update (Optional, usually better on specific pages, but site name is global)
        if (data.siteName) {
            document.title = `${data.siteName} | Emploi & Recrutement`;
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return (
    <SiteConfigContext.Provider value={{ config, loading }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export const useSiteConfig = () => useContext(SiteConfigContext);
