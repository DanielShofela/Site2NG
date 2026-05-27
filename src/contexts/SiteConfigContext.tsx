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
  founderPhotoUrl?: string;
  founderName?: string;
  founderTitle?: string;
  founderVision?: string;
}

const defaultContent: SiteConfig = {
  siteName: "2NG Groupe Entreprises",
  logoUrl: "",
  iconUrl: "",
  heroTitle: "Trouvez le talent qui propulsera votre entreprise",
  heroSubtitle: "La plateforme de recrutement nouvelle génération pour l'Afrique.",
  primaryColor: "#ea580c",
  founderPhotoUrl: "",
  founderName: "",
  founderTitle: "",
  founderVision: ""
};

const SiteConfigContext = createContext<{
  config: SiteConfig;
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  loading: boolean;
}>({
  config: defaultContent,
  maintenanceEnabled: false,
  maintenanceMessage: "",
  loading: true
});

export function SiteConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(defaultContent);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [configLoading, setConfigLoading] = useState(true);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'site_config', 'home'), (snapshot) => {
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
        
        // Dynamic Title Update
        if (data.siteName) {
            document.title = `${data.siteName} | Emploi & Recrutement`;
        }
      }
      setConfigLoading(false);
    }, (error) => {
      console.error("Error reading site config:", error);
      setConfigLoading(false);
    });

    const unsubMaintenance = onSnapshot(doc(db, 'maintenance', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setMaintenanceEnabled(!!data?.enabled);
        setMaintenanceMessage(data?.message || "");
      } else {
        setMaintenanceEnabled(false);
        setMaintenanceMessage("");
      }
      setMaintenanceLoading(false);
    }, (error) => {
      console.error("Error reading maintenance state:", error);
      setMaintenanceLoading(false);
    });

    return () => {
      unsubConfig();
      unsubMaintenance();
    };
  }, []);

  const loading = configLoading || maintenanceLoading;

  return (
    <SiteConfigContext.Provider value={{ config, maintenanceEnabled, maintenanceMessage, loading }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export const useSiteConfig = () => useContext(SiteConfigContext);
