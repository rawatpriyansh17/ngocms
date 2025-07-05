'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Save, X, Loader2, Languages, Calendar, Eye, ExternalLink, Image as ImageIcon, Video } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface Event {
  id?: number;
  slug: string;
  heading_en: string;
  heading_hi: string;
  description1_en: string;
  description1_hi: string;
  description2_en: string;
  description2_hi: string;
  photoSubheading_en: string;
  photoSubheading_hi: string;
  videoSubheading_en: string;
  videoSubheading_hi: string;
  isActive: boolean;
}

interface Media {
  id: number;
  type: 'photo' | 'video';
  url: string;
  heading_en?: string;
  videoType?: 'interview' | 'distribution';
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

export default function EventsManager() {
  const [events, setEvents] = useState<Event[]>([]);
  const [linkedPosts, setLinkedPosts] = useState<Post[]>([]);
  const [availablePostSlugs, setAvailablePostSlugs] = useState<PostSlug[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewEventId, setPreviewEventId] = useState<number | null>(null);
  const [previewMedia, setPreviewMedia] = useState<Media[]>([]);
  const { translateContent, isTranslating } = useTranslation();

  const [formData, setFormData] = useState<Partial<Event>>({
    slug: '',
    heading_en: '',
    heading_hi: '',
    description1_en: '',
    description1_hi: '',
    description2_en: '',
    description2_hi: '',
    photoSubheading_en: 'Photo/News Coverage:-',
    photoSubheading_hi: 'फोटो/समाचार कवरेज:-',
    videoSubheading_en: 'Video Coverage:-',
    videoSubheading_hi: 'वीडियो कवरेज:-',
    isActive: true,
  });

  const [sourceLang, setSourceLang] = useState<'en' | 'hi'>('en');

  // Fetch events
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch media for preview
  const fetchPreviewMedia = async (eventId: number) => {
    try {
      const response = await fetch(`/api/events/${eventId}/media`);
      if (response.ok) {
        const data = await response.json();
        setPreviewMedia(data);
      }
    } catch (error) {
      console.error('Failed to fetch preview media:', error);
      setPreviewMedia([]);
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
        // Get posts that have eventPageSlug defined
        const postsWithSlugs = allPosts
          .filter((post: any) => post.eventPageSlug && post.eventPageSlug.trim())
          .map((post: any) => ({
            id: post.id,
            title_en: post.title_en,
            eventPageSlug: post.eventPageSlug
          }));
        setAvailablePostSlugs(postsWithSlugs);
      }
    } catch (error) {
      console.error('Failed to fetch post slugs:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchLinkedPosts();
    fetchAvailablePostSlugs();
  }, []);

  useEffect(() => {
    if (previewEventId) {
      fetchPreviewMedia(previewEventId);
    }
  }, [previewEventId]);

  // Generate slug from heading
  const generateSlug = (heading: string) => {
    return heading
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  };

  // Auto-translate content
  const handleAutoTranslate = async () => {
    const sourceHeading = sourceLang === 'en' ? formData.heading_en : formData.heading_hi;
    if (!sourceHeading) return;

    try {
      const content = {
        heading: sourceHeading,
        description1: sourceLang === 'en' ? formData.description1_en : formData.description1_hi,
        description2: sourceLang === 'en' ? formData.description2_en : formData.description2_hi,
        photoSubheading: sourceLang === 'en' ? formData.photoSubheading_en : formData.photoSubheading_hi,
        videoSubheading: sourceLang === 'en' ? formData.videoSubheading_en : formData.videoSubheading_hi,
      };

      const translated = await translateContent(content, sourceLang);
      setFormData(prev => ({ 
        ...prev, 
        ...translated,
        slug: prev.slug || generateSlug(sourceHeading)
      }));
    } catch (error) {
      console.error('Translation failed:', error);
    }
  };

  // Save event
  const handleSave = async () => {
    try {
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

      if (response.ok) {
        await fetchEvents();
        await fetchAvailablePostSlugs(); // Add this line
        resetForm();
      }
    } catch (error) {
      console.error('Failed to save event:', error);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      slug: '',
      heading_en: '',
      heading_hi: '',
      description1_en: '',
      description1_hi: '',
      description2_en: '',
      description2_hi: '',
      photoSubheading_en: 'Photo/News Coverage:-',
      photoSubheading_hi: 'फोटो/समाचार कवरेज:-',
      videoSubheading_en: 'Video Coverage:-',
      videoSubheading_hi: 'वीडियो कवरेज:-',
      isActive: true,
    });
    setIsCreating(false);
    setEditingId(null);
  };

  // Edit event
  const handleEdit = (event: Event) => {
    setFormData(event);
    setEditingId(event.id!);
    setIsCreating(true);
  };

  // Delete event
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const response = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchEvents();
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  // Preview event
  const handlePreview = (event: Event) => {
    setPreviewEventId(event.id!);
    setShowPreview(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
      </div>
    );
  }

  const previewEvent = events.find(e => e.id === previewEventId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-pink-900">Events Management</h2>
          <p className="text-pink-700">Manage event pages and their content</p>
        </div>
        <Button
          onClick={() => setIsCreating(true)}
          className="bg-pink-600 hover:bg-pink-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Event
        </Button>
      </div>

      {/* Live Preview */}
      {showPreview && previewEvent && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader >
            <div className="flex justify-between items-center">
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Live Preview - {previewEvent.heading_en}
                          
            </CardTitle>
             <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(false)}
                className="text-blue-700 hover:bg-blue-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
</div>
          </CardHeader>
                       
          <CardContent>
            <div className="bg-white rounded-lg p-6 space-y-6">
              {/* Event Heading */}
              <h1 className="text-3xl font-bold text-pink-800 text-center">
                {previewEvent.heading_en}
              </h1>

              {/* Description 1 */}
              <div className="bg-white p-6 rounded-lg shadow-md border">
                <p className="text-purple-700 font-semibold">
                  {previewEvent.description1_en}
                </p>
              </div>

              {/* Description 2 */}
              {previewEvent.description2_en && (
                <div className="bg-white p-6 rounded-lg shadow-md border">
                  <p className="text-purple-700 font-semibold">
                    {previewEvent.description2_en}
                  </p>
                </div>
              )}

              {/* Photo Section */}
              {previewMedia.some(m => m.type === 'photo') && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-pink-800">
                    {previewEvent.photoSubheading_en}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {previewMedia
                      .filter(m => m.type === 'photo')
                      .slice(0, 4)
                      .map((photo) => (
                        <div key={photo.id} className="bg-white p-2 rounded-lg shadow-md">
                          <img
                            src={photo.url}
                            alt={photo.heading_en || 'Event Photo'}
                            className="w-full h-24 object-cover rounded"
                          />
                          {photo.heading_en && (
                            <p className="text-xs text-pink-800 mt-1 font-semibold">
                              {photo.heading_en}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                  {previewMedia.filter(m => m.type === 'photo').length > 4 && (
                    <p className="text-sm text-gray-600">
                      ...and {previewMedia.filter(m => m.type === 'photo').length - 4} more photos
                    </p>
                  )}
                </div>
              )}

              {/* Video Section */}
              {previewMedia.some(m => m.type === 'video') && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-pink-800">
                    {previewEvent.videoSubheading_en}
                  </h2>
                  
                  {/* Interviews */}
                  {previewMedia.some(m => m.type === 'video' && m.videoType === 'interview') && (
                    <div>
                      <h3 className="text-xl font-bold text-pink-700 mb-2">Interviews:-</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {previewMedia
                          .filter(m => m.type === 'video' && m.videoType === 'interview')
                          .slice(0, 2)
                          .map((video) => (
                            <div key={video.id} className="bg-white p-2 rounded-lg shadow-md">
                              <div className="bg-gray-200 rounded aspect-video flex items-center justify-center">
                                <Video className="w-12 h-12 text-gray-500" />
                              </div>
                              {video.heading_en && (
                                <p className="text-sm text-pink-800 mt-2 font-semibold">
                                  {video.heading_en}
                                </p>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Distribution Videos */}
                  {previewMedia.some(m => m.type === 'video' && m.videoType === 'distribution') && (
                    <div>
                      <h3 className="text-xl font-bold text-pink-700 mb-2">Distribution Coverage:-</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {previewMedia
                          .filter(m => m.type === 'video' && m.videoType === 'distribution')
                          .slice(0, 2)
                          .map((video) => (
                            <div key={video.id} className="bg-white p-2 rounded-lg shadow-md">
                              <div className="bg-gray-200 rounded aspect-video flex items-center justify-center">
                                <Video className="w-12 h-12 text-gray-500" />
                              </div>
                              {video.heading_en && (
                                <p className="text-sm text-pink-800 mt-2 font-semibold">
                                  {video.heading_en}
                                </p>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* No Media Message */}
              {previewMedia.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No media uploaded for this event yet.</p>
                  <p className="text-sm text-gray-500">Add photos and videos in the Media tab.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Form */}
      {isCreating && (
        <Card className="border-pink-200">
          <CardHeader className="bg-pink-50">
            <CardTitle className="text-pink-900 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {editingId ? 'Edit Event' : 'Create New Event'}
            </CardTitle>
            <CardDescription>
              Create event pages with bilingual content. Auto-translation available.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Language Selection & Translation */}
            <div className="flex items-center gap-4">
              <Label>Primary Language:</Label>
              <Select value={sourceLang} onValueChange={(value: 'en' | 'hi') => setSourceLang(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoTranslate}
                disabled={isTranslating}
                className="border-pink-300 text-pink-700 hover:bg-pink-50"
              >
                {isTranslating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Languages className="w-4 h-4 mr-2" />
                )}
                Auto Translate
              </Button>
            </div>

            {/* Slug Field with Suggestions */}
            <div className="space-y-2">
              <Label htmlFor="slug">Event Slug (URL)</Label>
              
              {availablePostSlugs.length > 0 && (
                <div className="mb-3">
                  <Label className="text-sm text-blue-700 mb-2 block">📋 Suggested slugs from your posts:</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {availablePostSlugs.map((postSlug) => (
                      <Button
                        key={postSlug.id}
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, slug: postSlug.eventPageSlug }))}
                        className="justify-start text-left border-blue-200 text-blue-700 hover:bg-blue-50 h-auto p-2"
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-medium text-xs">{postSlug.title_en}</span>
                          <code className="text-xs text-blue-600 bg-blue-100 px-1 rounded mt-1">
                            {postSlug.eventPageSlug}
                          </code>
                        </div>
                      </Button>
                    ))}
                  </div>
                  <div className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded border border-blue-200">
                    💡 Click any suggested slug above to use it, or type your own below
                  </div>
                </div>
              )}

              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="event-name (or select from suggestions above)"
                className="border-pink-200 focus:border-pink-400"
              />
              <p className="text-xs text-pink-600">
                URL will be: /events/{formData.slug}
              </p>
              
              {/* Show if slug matches a post */}
              {availablePostSlugs.some(ps => ps.eventPageSlug === formData.slug) && (
                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-700">
                    ✅ This slug matches a post with "Know More" button: 
                    <span className="font-medium">
                      {availablePostSlugs.find(ps => ps.eventPageSlug === formData.slug)?.title_en}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Heading Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="heading_en">Event Heading (English)</Label>
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
                  className="border-pink-200 focus:border-pink-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heading_hi">Event Heading (Hindi)</Label>
                <Input
                  id="heading_hi"
                  value={formData.heading_hi}
                  onChange={(e) => setFormData(prev => ({ ...prev, heading_hi: e.target.value }))}
                  placeholder="Enter Hindi heading"
                  className="border-pink-200 focus:border-pink-400"
                />
              </div>
            </div>

            {/* Description 1 Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="desc1_en">Description 1 (English)</Label>
                <Textarea
                  id="desc1_en"
                  value={formData.description1_en}
                  onChange={(e) => setFormData(prev => ({ ...prev, description1_en: e.target.value }))}
                  placeholder="Enter first description paragraph"
                  className="border-pink-200 focus:border-pink-400 min-h-24"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc1_hi">Description 1 (Hindi)</Label>
                <Textarea
                  id="desc1_hi"
                  value={formData.description1_hi}
                  onChange={(e) => setFormData(prev => ({ ...prev, description1_hi: e.target.value }))}
                  placeholder="Enter first description paragraph in Hindi"
                  className="border-pink-200 focus:border-pink-400 min-h-24"
                />
              </div>
            </div>

            {/* Description 2 Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="desc2_en">Description 2 (English)</Label>
                <Textarea
                  id="desc2_en"
                  value={formData.description2_en}
                  onChange={(e) => setFormData(prev => ({ ...prev, description2_en: e.target.value }))}
                  placeholder="Enter second description paragraph (optional)"
                  className="border-pink-200 focus:border-pink-400 min-h-24"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc2_hi">Description 2 (Hindi)</Label>
                <Textarea
                  id="desc2_hi"
                  value={formData.description2_hi}
                  onChange={(e) => setFormData(prev => ({ ...prev, description2_hi: e.target.value }))}
                  placeholder="Enter second description paragraph in Hindi (optional)"
                  className="border-pink-200 focus:border-pink-400 min-h-24"
                />
              </div>
            </div>

            {/* Section Headings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="photo_heading_en">Photo Section Heading (English)</Label>
                <Input
                  id="photo_heading_en"
                  value={formData.photoSubheading_en}
                  onChange={(e) => setFormData(prev => ({ ...prev, photoSubheading_en: e.target.value }))}
                  placeholder="Photo/News Coverage:-"
                  className="border-pink-200 focus:border-pink-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="photo_heading_hi">Photo Section Heading (Hindi)</Label>
                <Input
                  id="photo_heading_hi"
                  value={formData.photoSubheading_hi}
                  onChange={(e) => setFormData(prev => ({ ...prev, photoSubheading_hi: e.target.value }))}
                  placeholder="फोटो/समाचार कवरेज:-"
                  className="border-pink-200 focus:border-pink-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="video_heading_en">Video Section Heading (English)</Label>
                <Input
                  id="video_heading_en"
                  value={formData.videoSubheading_en}
                  onChange={(e) => setFormData(prev => ({ ...prev, videoSubheading_en: e.target.value }))}
                  placeholder="Video Coverage:-"
                  className="border-pink-200 focus:border-pink-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="video_heading_hi">Video Section Heading (Hindi)</Label>
                <Input
                  id="video_heading_hi"
                  value={formData.videoSubheading_hi}
                  onChange={(e) => setFormData(prev => ({ ...prev, videoSubheading_hi: e.target.value }))}
                  placeholder="वीडियो कवरेज:-"
                  className="border-pink-200 focus:border-pink-400"
                />
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label>Active Event</Label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSave}
                disabled={isTranslating}
                className="bg-pink-600 hover:bg-pink-700 text-white"
              >
                {isTranslating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Event
              </Button>
              <Button
                variant="outline"
                onClick={resetForm}
                className="border-pink-300 text-pink-700 hover:bg-pink-50"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>

            {/* Preview Button in Form */}
            {(formData.heading_en || formData.heading_hi) && (
              <div className="pt-4 border-t border-pink-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    const previewData: Event = {
                      id: editingId || 0,
                      slug: formData.slug || '',
                      heading_en: formData.heading_en || '',
                      heading_hi: formData.heading_hi || '',
                      description1_en: formData.description1_en || '',
                      description1_hi: formData.description1_hi || '',
                      description2_en: formData.description2_en || '',
                      description2_hi: formData.description2_hi || '',
                      photoSubheading_en: formData.photoSubheading_en || 'Photo/News Coverage:-',
                      photoSubheading_hi: formData.photoSubheading_hi || 'फोटो/समाचार कवरेज:-',
                      videoSubheading_en: formData.videoSubheading_en || 'Video Coverage:-',
                      videoSubheading_hi: formData.videoSubheading_hi || 'वीडियो कवरेज:-',
                      isActive: formData.isActive || true,
                    };
                    setPreviewEventId(previewData.id ?? null);
                    setShowPreview(true);
                  }}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview This Event
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Events List */}
      <div className="grid gap-4">
        {events.map((event) => {
          // Find posts that link to this event
          const connectedPosts = linkedPosts.filter(post => post.eventPageSlug === event.slug);
          
          return (
            <Card key={event.id} className="border-pink-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-pink-900">{event.heading_en}</h3>
                      <Badge variant={event.isActive ? "default" : "secondary"} className="bg-pink-100 text-pink-800">
                        {event.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {connectedPosts.length > 0 && (
                        <Badge variant="outline" className="border-green-300 text-green-700">
                          🔗 {connectedPosts.length} post{connectedPosts.length !== 1 ? 's' : ''} linked
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{event.description1_en}</p>
                    <p className="text-xs text-pink-600 mb-2">Slug: /events/{event.slug}</p>
                    
                    {/* Show connected posts */}
                    {connectedPosts.length > 0 && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-xs font-semibold text-green-800 mb-2">
                          Posts linking to this event:
                        </p>
                        <div className="space-y-1">
                          {connectedPosts.map(post => (
                            <div key={post.id} className="flex items-center gap-2 text-xs">
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              <span className="text-green-700 font-medium">{post.title_en}</span>
                              <span className="text-green-600">→ has "Know More" button</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(event)}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://sitaramsevasansthan.org/events/${event.slug}`, '_blank')}
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(event)}
                      className="border-pink-300 text-pink-700 hover:bg-pink-50"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(event.id!)}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}