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
  
  // Banner fields
  bannerEnabled?: boolean;
  bannerContent?: string;
  bannerBgColor?: string;
  bannerTextColor?: string;
  bannerImages?: string[];
  bannerBgType?: 'color' | 'image';
  bannerAutoChangeInterval?: number;

  // New Jobs (Oeuvres/Albums) Banner configurations
  jobsBannerEnabled?: boolean;
  jobsBannerImages?: string[];
  jobsBannerInterval?: number;
  jobsInBetweenBannersEnabled?: boolean;
  jobsInBetweenBannersImages?: string[];
  jobsInBetweenBannersInterval?: number;
  jobsInBetweenFrequency?: number;
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
  founderVision: "",
  bannerEnabled: false,
  bannerContent: "🌟 Offre Élite 2NG : Recrutez de nouveaux talents dès aujourd'hui !",
  bannerBgColor: "#ea580c",
  bannerTextColor: "#ffffff",
  bannerImages: [],
  bannerBgType: "color",
  bannerAutoChangeInterval: 5000,
  
  // New Jobs Banner defaults
  jobsBannerEnabled: false,
  jobsBannerImages: [],
  jobsBannerInterval: 5000,
  jobsInBetweenBannersEnabled: false,
  jobsInBetweenBannersImages: [],
  jobsInBetweenBannersInterval: 5000,
  jobsInBetweenFrequency: 3
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
            
            // Update OG:Title
            let ogTitle = document.querySelector('meta[property="og:title"]');
            if (ogTitle) ogTitle.setAttribute('content', `${data.siteName} | Emploi & Recrutement`);
            
            // Update Twitter Title
            let twTitle = document.querySelector('meta[property="twitter:title"]');
            if (twTitle) twTitle.setAttribute('content', `${data.siteName} | Emploi & Recrutement`);
            
            // Update OG Site Name
            let ogSiteName = document.querySelector('meta[property="og:site_name"]');
            if (ogSiteName) ogSiteName.setAttribute('content', data.siteName);
        }

        // Dynamic Subtitle / Description Update
        if (data.heroSubtitle) {
            let metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) metaDesc.setAttribute('content', data.heroSubtitle);
            
            let ogDesc = document.querySelector('meta[property="og:description"]');
            if (ogDesc) ogDesc.setAttribute('content', data.heroSubtitle);
            
            let twDesc = document.querySelector('meta[property="twitter:description"]');
            if (twDesc) twDesc.setAttribute('content', data.heroSubtitle);
        }

        // Dynamic Logo / Social Share Image Update
        if (data.logoUrl) {
            let ogImage = document.querySelector('meta[property="og:image"]');
            if (ogImage) ogImage.setAttribute('content', data.logoUrl);
            
            let twImage = document.querySelector('meta[property="twitter:image"]');
            if (twImage) twImage.setAttribute('content', data.logoUrl);
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
