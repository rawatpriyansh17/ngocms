'use client';

import { SignIn } from '@clerk/nextjs'
import { neobrutalism } from '@clerk/themes'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import LoadingPage from '@/components/loading-page'

export default function Page() {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()
  const isRedirecting = isLoaded && isSignedIn

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return
    }

    const redirectTimer = window.setTimeout(() => {
      router.replace('/')
    }, 500)

    return () => window.clearTimeout(redirectTimer)
  }, [isSignedIn, isLoaded, router])

  // Loading state while checking authentication
  if (!isLoaded) {
    return (
      <LoadingPage 
        message="Initializing authentication..." 
        spinnerSize={100}
      />
    )
  }

  // Loading state during redirect
  if (isRedirecting) {
    return (
      <LoadingPage 
        message="Sign in successful! Redirecting to dashboard..." 
        spinnerSize={120}
      />
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-lattice">
      <SignIn appearance={{
        theme: neobrutalism,
        variables: {
          colorPrimary:'#FF009D',
          fontSize: '15px',
          fontFamily: 'var(--font-poppins)',
          fontWeight: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold:700
          }
        },
        elements: {
          logoImage: {
            width: '85px',
            height: 'auto'
          },
        }
      }} />
    </div>
  )
}
