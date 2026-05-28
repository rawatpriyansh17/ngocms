import React from 'react'
import Loader from './loader'

interface LoadingPageProps {
  message?: string
  spinnerSize?: number
  className?: string
}

export default function LoadingPage({ 
  message = "Loading...", 
  spinnerSize = 100,
  className = ""
}: LoadingPageProps) {
  return (
    <div className={`flex flex-col items-center justify-center min-h-screen bg-lattice ${className}`}>
      <div className="flex flex-col items-center gap-6">
        <Loader size={spinnerSize} />
        <p 
          className="text-lg font-poppins font-bold text-foreground text-center max-w-md"
        >
          {message}
        </p>
      </div>
    </div>
  )
}