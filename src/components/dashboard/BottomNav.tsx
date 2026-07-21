import React from 'react';
import { CVLMScreen } from '@/types/cvlm';
import { LayoutGrid, FileText, Users, Settings } from 'lucide-react';

interface BottomNavProps {
  currentScreen: CVLMScreen;
  onScreenChange: (screen: CVLMScreen) => void;
}

export default function BottomNav({ currentScreen, onScreenChange }: BottomNavProps) {
  const tabs = [
    {
      screen: CVLMScreen.DASHBOARD,
      label: 'Galerie',
      icon: <LayoutGrid className="h-5 w-5" />
    },
    {
      screen: CVLMScreen.MY_CVS,
      label: 'Mes CVs',
      icon: <FileText className="h-5 w-5" />
    },
    {
      screen: CVLMScreen.COMMUNITY,
      label: 'Commu',
      icon: <Users className="h-5 w-5" />
    },
    {
      screen: CVLMScreen.SETTINGS,
      label: 'Profil',
      icon: <Settings className="h-5 w-5" />
    }
  ];

  // Do not show bottom nav on Onboarding, Login, or Form editors
  const hideNav = 
    currentScreen === CVLMScreen.ONBOARDING || 
    currentScreen === CVLMScreen.LOGIN || 
    currentScreen === CVLMScreen.CV_FORM || 
    currentScreen === CVLMScreen.LM_FORM;

  if (hideNav) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200/60 shadow-2xl flex items-center justify-around py-2 px-3 pb-safe">
      {tabs.map((tab) => {
        const isActive = currentScreen === tab.screen;
        return (
          <button
            key={tab.screen}
            onClick={() => onScreenChange(tab.screen)}
            className={`flex flex-col items-center justify-center gap-1.5 py-1 px-4.5 rounded-2xl transition-all cursor-pointer ${
              isActive 
                ? 'text-orange-600 font-extrabold scale-105 bg-orange-50/50' 
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            {tab.icon}
            <span className="text-[10px] tracking-wide uppercase font-bold">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
