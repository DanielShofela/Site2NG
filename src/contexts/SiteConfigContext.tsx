import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';

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
  founderFonction?: string;
  founderSpecialisation?: string;
  founderPoste?: string;
  founderBio?: string;
  heroBgUrl?: string;
  heroVisualUrl?: string;
  
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
  founderFonction: "",
  founderSpecialisation: "",
  founderPoste: "",
  founderBio: "",
  heroBgUrl: "",
  heroVisualUrl: "",
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
  supportEmail: string;
  supportPhone: string;
  registrationsOpen: boolean;
  loading: boolean;
  quotaExceeded: boolean;
}>({
  config: defaultContent,
  maintenanceEnabled: false,
  maintenanceMessage: "",
  supportEmail: "support@2ngentreprises.com",
  supportPhone: "+225 05 40 50 47 90",
  registrationsOpen: true,
  loading: true,
  quotaExceeded: false
});

export function SiteConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(() => {
    const cached = safeGetItem('cached_site_config');
    if (cached) {
      try { return { ...defaultContent, ...JSON.parse(cached) }; } catch (e) {}
    }
    return defaultContent;
  });
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(() => {
    return safeGetItem('cached_maintenance_enabled') === 'true';
  });
  const [maintenanceMessage, setMaintenanceMessage] = useState(() => {
    return safeGetItem('cached_maintenance_message') || "";
  });
  const [supportEmail, setSupportEmail] = useState(() => {
    return safeGetItem('cached_support_email') || "support@2ngentreprises.com";
  });
  const [supportPhone, setSupportPhone] = useState(() => {
    return safeGetItem('cached_support_phone') || "+225 05 40 50 47 90";
  });
  const [registrationsOpen, setRegistrationsOpen] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'site_config', 'home'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SiteConfig;
        const merged = { ...defaultContent, ...data };
        setConfig(merged);
        safeSetItem('cached_site_config', JSON.stringify(merged));
        
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
      const msg = error?.message || String(error);
      if (msg.includes('Quota') || msg.includes('quota') || msg.includes('resource-exhausted')) {
        setQuotaExceeded(true);
      }
      console.warn("Notice reading site config (using cached config):", msg);
      setConfigLoading(false);
    });

    const unsubMaintenance = onSnapshot(doc(db, 'maintenance', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const enabled = !!data?.enabled;
        const message = data?.message || "";
        setMaintenanceEnabled(enabled);
        setMaintenanceMessage(message);
        safeSetItem('cached_maintenance_enabled', String(enabled));
        safeSetItem('cached_maintenance_message', message);
      } else {
        setMaintenanceEnabled(false);
        setMaintenanceMessage("");
      }
      setMaintenanceLoading(false);
    }, (error) => {
      const msg = error?.message || String(error);
      if (msg.includes('Quota') || msg.includes('quota') || msg.includes('resource-exhausted')) {
        setQuotaExceeded(true);
      }
      console.warn("Notice reading maintenance state (using cached state):", msg);
      setMaintenanceLoading(false);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.supportEmail) {
          setSupportEmail(data.supportEmail);
          safeSetItem('cached_support_email', data.supportEmail);
        }
        if (data.supportPhone) {
          setSupportPhone(data.supportPhone);
          safeSetItem('cached_support_phone', data.supportPhone);
        }
        if (data.registrationsOpen !== undefined) setRegistrationsOpen(data.registrationsOpen);
      }
      setSettingsLoading(false);
    }, (error) => {
      const msg = error?.message || String(error);
      if (msg.includes('Quota') || msg.includes('quota') || msg.includes('resource-exhausted')) {
        setQuotaExceeded(true);
      }
      console.warn("Notice reading general settings (using cached settings):", msg);
      setSettingsLoading(false);
    });

    return () => {
      unsubConfig();
      unsubMaintenance();
      unsubSettings();
    };
  }, []);

  const loading = configLoading || maintenanceLoading || settingsLoading;

  return (
    <SiteConfigContext.Provider value={{ 
      config, 
      maintenanceEnabled, 
      maintenanceMessage, 
      supportEmail, 
      supportPhone, 
      registrationsOpen, 
      loading,
      quotaExceeded
    }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export const useSiteConfig = () => useContext(SiteConfigContext);
