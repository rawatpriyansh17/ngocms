'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, Image, BarChart3, Settings, Home, BarChart2, BarChart4 } from 'lucide-react';
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
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="border-b border-pink-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10"
      >
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-8 h-8 sm:w-10 sm:h-10 bg-pink-600 rounded-lg flex items-center justify-center"
              >
                <BarChart3 className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-pink-900">
                  CMS Dashboard
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Stats Cards */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <DashboardStats />
        </motion.div>

        {/* Main Content Tabs */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-white border-2 border-r-4 border-b-4 border-pink-700 shadow-sm h-auto p-1">
              <TabsTrigger 
                value="posts" 
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-pink-300 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-sm py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm transition-all duration-200"
              >
                <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Posts</span>
                <span className="sm:hidden">Posts</span>
              </TabsTrigger>
              <TabsTrigger 
                value="events"
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-pink-300 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-sm py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm transition-all duration-200"
              >
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Events</span>
                <span className="sm:hidden">Events</span>
              </TabsTrigger>
              <TabsTrigger 
                value="media"
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-pink-300 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-sm py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm transition-all duration-200"
              >
                <Image className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Event's Media</span>
                <span className="sm:hidden">Media</span>
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <TabsContent value="posts" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                  <PostsManager />
                </TabsContent>
                
                <TabsContent value="events" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                  <EventsManager />
                </TabsContent>
                
                <TabsContent value="media" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                  <MediaManager />
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="border-t border-pink-200 bg-white/50 mt-8 sm:mt-16"
      >
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="text-center text-pink-700">
            <p className="text-xs sm:text-sm">
              NGO CMS Dashboard &copy; 2025 | Managing content for{' '}
              <motion.a 
                href="https://sitaramsevasansthan.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-pink-600 hover:text-pink-800 underline"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.1 }}
              >
                sitaramsevasansthan.org
              </motion.a>
            </p>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}