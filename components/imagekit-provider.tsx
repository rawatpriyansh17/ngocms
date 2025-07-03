'use client';

import { ImageKitProvider } from '@imagekit/next';

export default function ImageKitContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!;
  
  return (
    <ImageKitProvider urlEndpoint={urlEndpoint}>
      {children}
    </ImageKitProvider>
  );
}