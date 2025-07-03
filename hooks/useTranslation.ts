import { useState } from 'react';

export function useTranslation() {
  const [isTranslating, setIsTranslating] = useState(false);
  
  const translateText = async (text: string, targetLang: 'en' | 'hi'): Promise<string> => {
    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang }),
      });
      
      if (!response.ok) throw new Error('Translation failed');
      
      const { translated } = await response.json();
      return translated;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original text on error
    } finally {
      setIsTranslating(false);
    }
  };
  
  const translateContent = async (content: any, sourceLang: 'en' | 'hi'): Promise<any> => {
    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, sourceLang }),
      });
      
      if (!response.ok) throw new Error('Content translation failed');
      
      return await response.json();
    } catch (error) {
      console.error('Content translation error:', error);
      throw error;
    } finally {
      setIsTranslating(false);
    }
  };
  
  return { translateText, translateContent, isTranslating };
}