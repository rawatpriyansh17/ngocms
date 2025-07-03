import { NextRequest, NextResponse } from 'next/server';
import { translateText, translateContent } from '@/lib/translation';

export async function POST(request: NextRequest) {
  try {
    const { text, content, sourceLang, targetLang } = await request.json();
    
    if (text && targetLang) {
      // Single text translation
      const translated = await translateText(text, targetLang);
      return NextResponse.json({ translated });
    }
    
    if (content && sourceLang) {
      // Content object translation
      const translated = await translateContent(content, sourceLang);
      return NextResponse.json(translated);
    }
    
    return NextResponse.json(
      { error: 'Invalid request parameters' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Translation API error:', error);
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500 }
    );
  }
}