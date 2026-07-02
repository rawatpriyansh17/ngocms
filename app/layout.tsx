import type { Metadata } from 'next'
import {
  ClerkProvider,
} from '@clerk/nextjs'
import { Geist, Geist_Mono,Poppins,DM_Sans } from 'next/font/google'
import '@/app/globals.css'
import { Toaster } from 'sonner'
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})
const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
})

export const metadata: Metadata = {
  title: 'CMS',
  description: 'CMS platform for sitaramsevasansthan.org',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider
   afterSignOutUrl="/"
   appearance={{
    variables: {
      colorPrimary:'#FF00BB',
      colorDanger: '#FF0000',
       fontFamily:'var(--font-dm-sans)',
       fontSize: '15px',
       fontWeight: {
         normal: 400,
         medium: 500,
         semibold: 600,
         bold:700
       }
     },
     elements: {
 userButtonAvatarBox: {
         width: '45px',
         height: '45px',
         borderRadius: '50%',
       },
       userButtonAvatarImage: {
         width: '100%',
         height: '100%',
         borderRadius: '50%',
       },
     }
   }}
    >
      <html lang="en" >
        <body className={`${geistMono.variable} ${poppins.variable} ${dmSans.variable} ${geistSans.variable} antialiased`}>
          {children}

          <Toaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{
              style: {
                fontFamily: 'var(--font-dm-sans)',
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  )
}
