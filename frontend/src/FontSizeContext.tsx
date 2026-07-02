import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const FONT_SIZES = [12, 14, 16, 18, 20, 22];
const DEFAULT_SIZE = 16;

interface FontSizeContextType {
  fontSize: number;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

function getInitialFontSize(): number {
  if (typeof window === 'undefined') return DEFAULT_SIZE;
  const stored = localStorage.getItem('lithium-font-size');
  if (stored) {
    const size = parseInt(stored, 10);
    if (!isNaN(size) && FONT_SIZES.includes(size)) return size;
  }
  return DEFAULT_SIZE;
}

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSize] = useState(getInitialFontSize);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
    localStorage.setItem('lithium-font-size', String(fontSize));
  }, [fontSize]);

  const increaseFontSize = () => {
    setFontSize(prev => {
      const currentIndex = FONT_SIZES.indexOf(prev);
      if (currentIndex < FONT_SIZES.length - 1) {
        return FONT_SIZES[currentIndex + 1];
      }
      return prev;
    });
  };

  const decreaseFontSize = () => {
    setFontSize(prev => {
      const currentIndex = FONT_SIZES.indexOf(prev);
      if (currentIndex > 0) {
        return FONT_SIZES[currentIndex - 1];
      }
      return prev;
    });
  };

  const resetFontSize = () => {
    setFontSize(DEFAULT_SIZE);
  };

  return (
    <FontSizeContext.Provider value={{ fontSize, increaseFontSize, decreaseFontSize, resetFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (!context) throw new Error('useFontSize must be used within FontSizeProvider');
  return context;
}
