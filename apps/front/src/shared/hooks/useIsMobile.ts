import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const getValue = () =>
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false;

  const [isMobile, setIsMobile] = useState(getValue);

  useEffect(() => {
    const handleResize = () => setIsMobile(getValue());
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}
