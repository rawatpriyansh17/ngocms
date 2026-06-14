import { getUploadAuthParams } from '@imagekit/next/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Add any authentication logic here if needed
    // For example, check if user is signed in via Clerk
    
    const { token, expire, signature } = getUploadAuthParams({
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY as string,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY as string,
      // Optional: set custom expire time (max 1 hour)
      // expire: 30 * 60, // 30 minutes
    });

    return NextResponse.json({
      token,
      expire,
      signature,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    });
  } catch (error) {
    console.error('Upload auth error:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload parameters' },
      { status: 500 }
    );
  }
}
