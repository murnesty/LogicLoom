import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

function getEnv(name: string): string {
  const v = (import.meta.env as Record<string, string | undefined>)[name];
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Optional monetization: set VITE_SUPPORT_URL (Ko-fi, Buy Me a Coffee, etc.)
 * and/or VITE_ADSENSE_CLIENT + VITE_ADSENSE_SLOT after AdSense approval.
 */
export default function AppFooter() {
  const supportUrl = getEnv('VITE_SUPPORT_URL');
  const adsenseClient = getEnv('VITE_ADSENSE_CLIENT');
  const adsenseSlot = getEnv('VITE_ADSENSE_SLOT');
  const showAd = Boolean(adsenseClient && adsenseSlot);
  const insRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!showAd || !insRef.current) return;

    const push = () => {
      const el = insRef.current;
      if (!el || pushedRef.current) return;
      pushedRef.current = true;
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch {
        pushedRef.current = false;
      }
    };

    const scriptId = 'adsense-lib-receipt-calc';
    const existingById = document.getElementById(scriptId) as HTMLScriptElement | null;
    const existingGlobal = document.querySelector(
      'script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]',
    ) as HTMLScriptElement | null;

    const existing = existingById || existingGlobal;
    if (existing) {
      if (window.adsbygoogle) push();
      else existing.addEventListener('load', push, { once: true });
      return;
    }

    const s = document.createElement('script');
    s.id = scriptId;
    s.async = true;
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseClient)}`;
    s.crossOrigin = 'anonymous';
    s.addEventListener('load', push, { once: true });
    document.head.appendChild(s);
  }, [showAd, adsenseClient]);

  if (!supportUrl && !showAd) {
    return null;
  }

  return (
    <footer className="app-footer">
      {showAd && (
        <div className="app-footer-ad" aria-label="Advertisement">
          <ins
            ref={insRef}
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client={adsenseClient}
            data-ad-slot={adsenseSlot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      )}
      {supportUrl && (
        <>
          <p className="app-footer-support">
            <a href={supportUrl} target="_blank" rel="noopener noreferrer">
              Support this project
            </a>
          </p>
          <p className="app-footer-support-hint">
            Please consider supporting — it helps cover hosting costs.
          </p>
        </>
      )}
    </footer>
  );
}
