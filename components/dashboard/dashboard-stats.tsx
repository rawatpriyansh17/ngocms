'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Calendar, Image } from 'lucide-react';

export default function DashboardStats() {
  const [stats, setStats] = useState({
    posts: 0,
    events: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [postsRes, eventsRes] = await Promise.all([
          fetch('/api/posts'),
          fetch('/api/events'),
        ]);

        const posts = await postsRes.json();
        const events = await eventsRes.json();

        setStats({
          posts: posts.length || 0,
          events: events.filter((e: any) => e.isActive).length || 0,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    }

    fetchStats();
  }, []);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 mb-6 sm:mb-8">
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border-2 border-r-4 border-b-4 border-pink-700 bg-gradient-to-br from-pink-50 to-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="py-1 sm:py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-pink-700">Total Posts</p>
                <motion.p 
                  className="text-xl sm:text-2xl font-bold text-pink-900"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2, delay: 0.3 }}
                >
                  {stats.posts}
                </motion.p>
              </div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.2 }}
              >
                <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-pink-600" />
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className=" bg-gradient-to-br from-pink-50 to-white hover:shadow-md transition-shadow duration-200 border-2 border-r-4 border-b-4 border-pink-700">
          <CardContent className="py-1 sm:py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-pink-700">Active Events</p>
                <motion.p 
                  className="text-xl sm:text-2xl font-bold text-pink-900"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2, delay: 0.4 }}
                >
                  {stats.events}
                </motion.p>
              </div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.2 }}
              >
                <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-pink-600" />
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}