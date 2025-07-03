'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, Image, BarChart3, Settings, Home } from 'lucide-react';
import { SignedIn, UserButton } from '@clerk/nextjs';
import PostsManager from '@/components/dashboard/posts-manager';
import EventsManager from '@/components/dashboard/events-manager';
import MediaManager from '@/components/dashboard/media-manager';
import DashboardStats from '@/components/dashboard/dashboard-stats';
import Link from 'next/link';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('posts');

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50">
      {/* Header */}
      <header className="border-b border-pink-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-pink-900">
                  NGO CMS Dashboard
                </h1>
                <p className="text-sm text-pink-700">
                  Content Management for sitaramsevasansthan.org
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" className="border-pink-300 text-pink-700 hover:bg-pink-50">
                  <Home className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <DashboardStats />

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white border-pink-200 shadow-sm">
            <TabsTrigger 
              value="posts" 
              className="flex items-center gap-2 data-[state=active]:bg-pink-100 data-[state=active]:text-pink-900 data-[state=active]:shadow-sm"
            >
              <FileText className="w-4 h-4" />
              Posts
            </TabsTrigger>
            <TabsTrigger 
              value="events"
              className="flex items-center gap-2 data-[state=active]:bg-pink-100 data-[state=active]:text-pink-900 data-[state=active]:shadow-sm"
            >
              <Calendar className="w-4 h-4" />
              Events
            </TabsTrigger>
            <TabsTrigger 
              value="media"
              className="flex items-center gap-2 data-[state=active]:bg-pink-100 data-[state=active]:text-pink-900 data-[state=active]:shadow-sm"
            >
              <Image className="w-4 h-4" />
              Media
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-6">
            <PostsManager />
          </TabsContent>
          
          <TabsContent value="events" className="space-y-6">
            <EventsManager />
          </TabsContent>
          
          <TabsContent value="media" className="space-y-6">
            <MediaManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t border-pink-200 bg-white/50 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-pink-700">
            <p className="text-sm">
              NGO CMS Dashboard &copy; 2025 | Managing content for{' '}
              <a 
                href="https://sitaramsevasansthan.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-pink-600 hover:text-pink-800 underline"
              >
                sitaramsevasansthan.org
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}