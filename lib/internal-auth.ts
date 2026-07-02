import { timingSafeEqual } from 'crypto';

export function isInternalRequestAuthorized(request: Request) {
  const expectedSecret = process.env.CMS_AI_API_SECRET;
  const internalSecret = request.headers.get('x-cms-ai-secret')?.trim() ?? '';
  const authHeader = request.headers.get('authorization') ?? '';
  const providedSecret = internalSecret || (authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : '');

  if (!expectedSecret || !providedSecret) {
    return false;
  }

  const expected = Buffer.from(expectedSecret);
  const provided = Buffer.from(providedSecret);

  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
