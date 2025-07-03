'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Calendar, Image } from 'lucide-react';

export default function DashboardStats() {
  const [stats, setStats] = useState({
    posts: 0,
    events: 0,
    media: 0,
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
          media: 0, // Will be calculated from events
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-pink-700">Total Posts</p>
              <p className="text-2xl font-bold text-pink-900">{stats.posts}</p>
            </div>
            <FileText className="w-8 h-8 text-pink-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-pink-700">Active Events</p>
              <p className="text-2xl font-bold text-pink-900">{stats.events}</p>
            </div>
            <Calendar className="w-8 h-8 text-pink-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-pink-700">Media Files</p>
              <p className="text-2xl font-bold text-pink-900">{stats.media}</p>
            </div>
            <Image className="w-8 h-8 text-pink-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}