'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Save, X, Loader2, Calendar, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  idleSaveProgress,
  SaveProgress,
  type SaveProgressState,
} from '@/components/dashboard/save-progress';
import { SlugCombobox } from '@/components/dashboard/slug-combobox';
interface Event {
  id?: number;
  slug: string;
  heading_en: string;
  description1_en: string;
  description2_en: string;
  photoSubheading_en: string;
  videoSubheading_en: string;
  isActive: boolean;
}

interface Post {
  id: number;
  title_en: string;
  eventPageSlug: string;
  isActive: boolean;
}

interface PostSlug {
  id: number;
  title_en: string;
  eventPageSlug: string;
}

type PostWithSlug = {
  id: number;
  title_en: string;
  eventPageSlug?: string;
};

const generateSlug = (heading: string) => {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
};

export default function EventsManager() {
  const [events, setEvents] = useState<Event[]>([]);
  const [linkedPosts, setLinkedPosts] = useState<Post[]>([]);
  const [availablePostSlugs, setAvailablePostSlugs] = useState<PostSlug[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<SaveProgressState>(idleSaveProgress);
  const [formData, setFormData] = useState<Partial<Event>>({
    slug: '',
    heading_en: '',
    description1_en: '',
    description2_en: '',
    photoSubheading_en: 'Photo/News Coverage:-',
    videoSubheading_en: 'Video Coverage:-',
    isActive: true,
  });

  // Fetch events
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      toast.error('Could not load events. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch linked posts
  const fetchLinkedPosts = async () => {
    try {
      const response = await fetch('/api/posts');
      if (response.ok) {
        const allPosts = await response.json();
        // Filter posts that have eventPageSlug
        const postsWithEventLinks = allPosts.filter((post: Post) => post.eventPageSlug && post.isActive);
        setLinkedPosts(postsWithEventLinks);
      }
    } catch (error) {
      console.error('Failed to fetch linked posts:', error);
    }
  };

  // Fetch available post slugs
  const fetchAvailablePostSlugs = async () => {
    try {
      const response = await fetch('/api/posts');
      if (response.ok) {
        const allPosts = await response.json();
        const postsWithSlugs = allPosts.reduce((slugs: PostSlug[], post: PostWithSlug) => {
          if (!post.eventPageSlug?.trim()) {
            return slugs;
          }

          slugs.push({
            id: post.id,
            title_en: post.title_en,
            eventPageSlug: post.eventPageSlug,
          });

          return slugs;
        }, []);
        setAvailablePostSlugs(postsWithSlugs);
      }
    } catch (error) {
      console.error('Failed to fetch post slugs:', error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvents();
    fetchLinkedPosts();
    fetchAvailablePostSlugs();
  }, []);

  // Save event
  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveProgress({
        status: 'saving',
        progress: 35,
        message: editingId ? 'Updating event...' : 'Creating event...',
      });

      // Auto-generate slug if empty
      const eventData = {
        ...formData,
        slug: formData.slug || generateSlug(formData.heading_en || ''),
      };

      const url = editingId ? `/api/events/${editingId}` : '/api/events';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        throw new Error(editingId ? 'Failed to update event' : 'Failed to create event');
      }

      setSaveProgress({
        status: 'saving',
        progress: 80,
        message: 'Refreshing event lists...',
      });
      await fetchEvents();
      await fetchAvailablePostSlugs();
      setSaveProgress({
        status: 'success',
        progress: 100,
        message: editingId ? 'Event updated successfully.' : 'Event created successfully.',
      });
      toast.success(editingId ? 'Event updated successfully.' : 'Event created successfully.');
      resetForm();
    } catch (error) {
      console.error('Failed to save event:', error);
      setSaveProgress({
        status: 'error',
        progress: 100,
        message: 'Event save failed. Try again later.',
      });
      toast.error('Event save failed. Try again later.');
    } finally {
      setSaving(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      slug: '',
      heading_en: '',
      description1_en: '',
      description2_en: '',
      photoSubheading_en: 'Photo/News Coverage:-',
      videoSubheading_en: 'Video Coverage:-',
      isActive: true,
    });
    setIsCreating(false);
    setEditingId(null);
    setSaveProgress(idleSaveProgress);
  };

  // Edit event
  const handleEdit = (event: Event) => {
    setSaveProgress(idleSaveProgress);
    setFormData(event);
    setEditingId(event.id!);
    setIsCreating(true);
  };

  // Delete event
  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchEvents();
        setDeleteTarget(null);
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const postSlugOptions = useMemo(
    () =>
      availablePostSlugs.map((postSlug) => ({
        value: postSlug.eventPageSlug,
        label: postSlug.title_en,
        description: postSlug.eventPageSlug,
      })),
    [availablePostSlugs],
  );

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center h-64"
      >
        <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
      </motion.div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4"
      >
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-pink-900">Events Management</h2>
          <p className="text-sm sm:text-base text-pink-700">Manage event pages and their content</p>
        </div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className='text-center sm:text-right'
        >
          <Button
            onClick={() => {
              setSaveProgress(idleSaveProgress);
              setIsCreating(true);
            }}
            className="bg-gradient-to-b from-pink-400 via-pink-600 to-pink-500 hover:bg-pink-700 text-white w-full sm:w-auto font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
        </motion.div>
      </motion.div>

      {/* Create/Edit Form */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-pink-200">
              <CardHeader id='edit-event'>
                <CardTitle className="text-pink-900 flex items-center gap-2 text-base sm:text-lg">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                  {editingId ? 'Edit Event' : 'Create New Event'}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Create event pages with English content.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 pt-4 sm:pt-6">
                {/* Slug Field with Dropdown - Made responsive */}
                <div className="space-y-2">
                  <Label htmlFor="slug" className="text-sm">Event Slug (URL)</Label>
                  
                  {availablePostSlugs.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mb-3"
                    >
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <div className="flex-1">
                          <Label className="text-xs sm:text-sm text-blue-700 mb-1 block">📋 Use slug from your posts:</Label>
                          <SlugCombobox
                            value={formData.slug || ""}
                            options={postSlugOptions}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, slug: value }))}
                            placeholder="Search or select a slug from your posts..."
                            searchPlaceholder="Type post title or slug..."
                            emptyMessage="No matching post slugs found."
                            className="border-blue-200 hover:bg-blue-50"
                          />
                        </div>
                        <div className="flex items-end">
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setFormData(prev => ({ ...prev, slug: '' }))}
                              className="border-red-600 bg-red-500 text-white hover:bg-gradient-to-r from-red-500 to-red-700 hover:text-white cursor-pointer"
                            >
                              Clear Slug
                            </Button>
                          </motion.div>
                        </div>
                      </div>
                      <div className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded border border-blue-200">
                        💡 Select a slug from posts with &quot;Know More&quot; buttons, or type your own below
                      </div>
                    </motion.div>
                  )}

                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="event-name (or select from dropdown above)"
                    className="border-pink-200 focus:border-pink-400 text-sm"
                  />
                  <p className="text-xs text-pink-600">
                    URL will be: sitaramsevasansthan.org/events/{formData.slug}
                  </p>
                  
      
                </div>

                {/* Responsive Form Fields */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Heading Fields */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="heading_en" className="text-sm">Event Heading  </Label>
                      <Input
                        id="heading_en"
                        value={formData.heading_en}
                        onChange={(e) => {
                          setFormData(prev => ({ 
                            ...prev, 
                            heading_en: e.target.value,
                            slug: prev.slug || generateSlug(e.target.value)
                          }));
                        }}
                        placeholder="Enter English heading"
                        className="border-pink-200 focus:border-pink-400 text-sm"
                      />
                    </div>
                  </div>

                  {/* Description Fields - Made responsive */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="desc1_en" className="text-sm">Description 1  </Label>
                      <Textarea
                        id="desc1_en"
                        value={formData.description1_en}
                        onChange={(e) => setFormData(prev => ({ ...prev, description1_en: e.target.value }))}
                        placeholder="Enter first description paragraph"
                        className="border-pink-200 focus:border-pink-400 min-h-20 text-sm"
                      />
                    </div>
                  </div>

                  {/* Description 2 Fields */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="desc2_en" className="text-sm">Description 2  </Label>
                      <Textarea
                        id="desc2_en"
                        value={formData.description2_en}
                        onChange={(e) => setFormData(prev => ({ ...prev, description2_en: e.target.value }))}
                        placeholder="Enter second description paragraph (optional)"
                        className="border-pink-200 focus:border-pink-400 min-h-20 text-sm"
                      />
                    </div>
                  </div>

                  {/* Section Headings */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="photo_heading_en" className="text-sm">Photo Section Heading  </Label>
                      <Input
                        id="photo_heading_en"
                        value={formData.photoSubheading_en}
                        onChange={(e) => setFormData(prev => ({ ...prev, photoSubheading_en: e.target.value }))}
                        placeholder="Photo/News Coverage:-"
                        className="border-pink-200 focus:border-pink-400 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="video_heading_en" className="text-sm">Video Section Heading  </Label>
                      <Input
                        id="video_heading_en"
                        value={formData.videoSubheading_en}
                        onChange={(e) => setFormData(prev => ({ ...prev, videoSubheading_en: e.target.value }))}
                        placeholder="Video Coverage:-"
                        className="border-pink-200 focus:border-pink-400 text-sm"
                      />
                    </div>
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label className="text-sm">Active Event</Label>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-start">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full sm:w-auto"
                    >
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-pink-600 hover:bg-pink-700 text-white w-full sm:w-auto"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        {saving ? 'Saving...' : 'Save Event'}
                      </Button>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full sm:w-auto"
                    >
                      <Button
                        variant="outline"
                        onClick={resetForm}
                        className="border-pink-300 text-pink-700 hover:bg-pink-50 w-full sm:w-auto"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </motion.div>
                    <SaveProgress state={saveProgress} className="sm:ml-auto" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Events List - Made responsive */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid gap-3 sm:gap-4"
      >
        {events.map((event, index) => {
          const connectedPosts = linkedPosts.filter(post => post.eventPageSlug === event.slug);
          
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              whileHover={{ scale: 1.01 }}
              className='min-w-0'
            >
              <Card className="border-pink-500  ">
                <CardContent className="p-5 sm:p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <h3 className="font-semibold text-wrap text-pink-900 text-xs sm:text-base truncate">{event.heading_en}</h3>
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          <Badge variant={event.isActive ? "default" : "secondary"} className="bg-pink-100 text-pink-800 text-xs">
                            {event.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {connectedPosts.length > 0 && (
                            <Badge variant="outline" className="border-green-300 text-green-700 text-xs">
                              🔗 {connectedPosts.length} post{connectedPosts.length !== 1 ? 's' : ''} linked
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-1 text-wrap">{event.description1_en}</p>
                      <p className="text-xs text-pink-600 mb-2">Link-sitaramsevasansthan.org/events/{event.slug}</p>
                      
                      {/* Show connected posts */}
                      <AnimatePresence>
                        {connectedPosts.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-3 p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200"
                          >
                            <p className="text-xs font-semibold text-green-800 mb-2">
                               Title of Post linking to this event-
                            </p>
                            <div className="space-y-1">
                              {connectedPosts.map(post => (
                                <div key={post.id} className="flex items-center gap-2 text-xs">
                                  <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></span>
                                  <span className="text-green-700 font-medium truncate">{post.title_en}</span>
                                
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    {/* Action Buttons - Responsive layout */}
                    <div className="flex flex-row lg:flex-col gap-1 sm:gap-2 justify-end lg:justify-start">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`https://sitaramsevasansthan.org/events/${event.slug}`, '_blank')}
                          className="border-green-300 text-green-700 hover:bg-green-50 p-2"
                        >
                          <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </motion.div>
                      <Link href="#edit-event">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(event)}
                            className="border-pink-300 text-pink-700 hover:bg-pink-50 p-2"
                          >
                            <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </motion.div>
                      </Link>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteTarget(event)}
                          className="border-red-300 text-red-700 hover:bg-red-50 p-2"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteTarget?.heading_en ? `"${deleteTarget.heading_en}"` : 'this event'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={(event) => {
                event.preventDefault();
                if (deleteTarget?.id) {
                  void handleDelete(deleteTarget.id);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
