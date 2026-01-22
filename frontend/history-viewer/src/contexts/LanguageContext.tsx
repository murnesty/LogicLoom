import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface LanguageContextType {
  lang: string;
  setLang: (lang: string) => void;
  t: (en: string, zh: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<string>('en');

  const t = useCallback((en: string, zh: string) => {
    return lang === 'zh' ? zh : en;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
