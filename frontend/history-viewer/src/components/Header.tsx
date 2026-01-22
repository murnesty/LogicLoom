import { useLanguage } from '../contexts/LanguageContext';
import './Header.css';

interface HeaderProps {
  onLanguageChange?: (lang: string) => void;
}

export function Header({ onLanguageChange }: HeaderProps) {
  const { lang, setLang, t } = useLanguage();

  const handleLanguageChange = (newLang: string) => {
    setLang(newLang);
    onLanguageChange?.(newLang);
  };

  return (
    <header className="header">
      <div className="header-left">
        <span className="header-logo">🗺️</span>
        <h1 className="header-title">
          {t('China History Viewer', '中国历史浏览器')}
        </h1>
      </div>
      
      <div className="header-right">
        <div className="language-selector">
          <span className="language-icon">🌐</span>
          <select 
            value={lang} 
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="language-select"
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </div>
      </div>
    </header>
  );
}
