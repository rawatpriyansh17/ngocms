import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, FileText, Calendar, Image, ArrowRight, Shield } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 font-poppins">
      {/* Header */}
      <header className="border-b border-pink-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-pink-900">NGO CMS</h1>
                <p className="text-xs text-pink-700">Content Management System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <SignedOut>
                <SignInButton>
                  <Button className="bg-pink-600 hover:bg-pink-700 text-white">
                    Sign In
                  </Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard">
                  <Button className="bg-pink-600 hover:bg-pink-700 text-white">
                    Go to Dashboard
                  </Button>
                </Link>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-pink-900 mb-4">
            NGO CMS Dashboard
          </h1>
          <p className="text-xl text-pink-700 mb-8 max-w-2xl mx-auto">
            Powerful content management system for{' '}
            <span className="font-semibold">sitaramsevasansthan.org</span>
          </p>
          
          <SignedOut>
            <SignInButton>
              <Button size="lg" className="bg-pink-600 hover:bg-pink-700 text-white">
                <Shield className="w-5 h-5 mr-2" />
                Sign In to Access Dashboard
              </Button>
            </SignInButton>
          </SignedOut>
          
          <SignedIn>
            <Link href="/dashboard">
              <Button size="lg" className="bg-pink-600 hover:bg-pink-700 text-white">
                Open Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </SignedIn>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="border-pink-200 hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <FileText className="w-12 h-12 text-pink-600 mx-auto mb-4" />
              <CardTitle className="text-pink-900">Posts Management</CardTitle>
              <CardDescription className="text-pink-700">
                Create and manage homepage posts with bilingual content and media upload
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="border-pink-200 hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <Calendar className="w-12 h-12 text-pink-600 mx-auto mb-4" />
              <CardTitle className="text-pink-900">Events Management</CardTitle>
              <CardDescription className="text-pink-700">
                Create event pages with descriptions, photo coverage, and video content
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="border-pink-200 hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <Image className="w-12 h-12 text-pink-600 mx-auto mb-4" />
              <CardTitle className="text-pink-900">Media Library</CardTitle>
              <CardDescription className="text-pink-700">
                Upload and organize photos and videos with automatic optimization
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Features List */}
        <div className="bg-white rounded-lg border border-pink-200 p-8">
          <h2 className="text-2xl font-bold text-pink-900 mb-6 text-center">
            Key Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-pink-600 rounded-full"></div>
              </div>
              <div>
                <h3 className="font-semibold text-pink-900">Auto Translation</h3>
                <p className="text-pink-700 text-sm">English ↔ Hindi content translation</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-pink-600 rounded-full"></div>
              </div>
              <div>
                <h3 className="font-semibold text-pink-900">ImageKit Integration</h3>
                <p className="text-pink-700 text-sm">Optimized image and video delivery</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-pink-600 rounded-full"></div>
              </div>
              <div>
                <h3 className="font-semibold text-pink-900">Drag & Drop Upload</h3>
                <p className="text-pink-700 text-sm">Easy file upload with progress tracking</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-pink-600 rounded-full"></div>
              </div>
              <div>
                <h3 className="font-semibold text-pink-900">Real-time Updates</h3>
                <p className="text-pink-700 text-sm">Changes reflect immediately on live site</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
