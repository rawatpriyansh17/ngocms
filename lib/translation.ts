const translate = require('translate-google');

export async function translateText(text: string, targetLang: 'en' | 'hi'): Promise<string> {
  try {
    if (!text || text.trim() === '') return '';
    
    // Detect if text is already in target language (basic check)
    const isEnglish = /^[A-Za-z0-9\s.,!?;:'"()-]+$/.test(text);
    const isHindi = /[\u0900-\u097F]/.test(text);
    
    // If target is English and text is already English, return as is
    if (targetLang === 'en' && isEnglish && !isHindi) {
      return text;
    }
    
    // If target is Hindi and text is already Hindi, return as is
    if (targetLang === 'hi' && isHindi && !isEnglish) {
      return text;
    }
    
    // Translate the text
    const result = await translate(text, { to: targetLang });
    return result;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Return original text if translation fails
  }
}

export async function translateContent(content: {
  title?: string;
  description?: string;
  heading?: string;
  description1?: string;
  description2?: string;
}, sourceLang: 'en' | 'hi'): Promise<{
  title_en?: string;
  title_hi?: string;
  description_en?: string;
  description_hi?: string;
  heading_en?: string;
  heading_hi?: string;
  description1_en?: string;
  description1_hi?: string;
  description2_en?: string;
  description2_hi?: string;
}> {
  try {
    const targetLang = sourceLang === 'en' ? 'hi' : 'en';
    const result: any = {};
    
    // Translate each field
    for (const [key, value] of Object.entries(content)) {
      if (value && typeof value === 'string') {
        // Set source language field
        result[`${key}_${sourceLang}`] = value;
        
        // Translate to target language
        const translated = await translateText(value, targetLang);
        result[`${key}_${targetLang}`] = translated;
      }
    }
    
    return result;
  } catch (error) {
    console.error('Content translation error:', error);
    throw error;
  }
}