import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const handleNavigation = () => {
      if (pathname === '/services') {
        const element = document.getElementById('services');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      } else if (pathname === '/entreprises') {
        const element = document.getElementById('partners');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      } else if (pathname === '/contact') {
        const element = document.getElementById('contact');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }

      if (hash) {
        const element = document.getElementById(hash.substring(1));
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }

      // Default fallback scroll to top
      window.scrollTo(0, 0);
    };

    // Small delay ensures component is rendered
    const timer = setTimeout(handleNavigation, 150);
    return () => clearTimeout(timer);
  }, [pathname, hash]);

  return null;
}
