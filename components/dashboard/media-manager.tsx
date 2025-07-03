'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Save, X, Loader2, Languages, Image as ImageIcon, Video, Play, GripVertical } from 'lucide-react';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone';
import { useTranslation } from '@/hooks/useTranslation';
import { upload } from '@imagekit/next';
import Image from 'next/image';

interface Media {
  id?: number;
  eventId: number;
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl?: string;
  heading_en?: string;
  heading_hi?: string;
  description_en?: string;
  description_hi?: string;
  videoType?: 'interview' | 'distribution';
  order: number;
}

interface Event {
  id: number;
  slug: string;
  heading_en: string;
  isActive: boolean;
}

export default function MediaManager() {
  const [media, setMedia] = useState<Media[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const { translateContent, isTranslating } = useTranslation();

  const [formData, setFormData] = useState<Partial<Media>>({
    type: 'photo',
    url: '',
    thumbnailUrl: '',
    heading_en: '',
    heading_hi: '',
    description_en: '',
    description_hi: '',
    videoType: 'interview',
    order: 0,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [sourceLang, setSourceLang] = useState<'en' | 'hi'>('en');

  const [showThumbnailSelector, setShowThumbnailSelector] = useState(false);
  const [availableVideoThumbnails] = useState([
    { 
      id: 'interview-thumb', 
      name: 'Interview Thumbnail', 
      path: '/interview.png',
      type: 'interview'
    },
    { 
      id: 'distribution-thumb', 
      name: 'Distribution Thumbnail', 
      path: '/distribution.png',
      type: 'distribution'
    },
  ]);

  // Fetch events
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data.filter((event: Event) => event.isActive));
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  // Fetch media for selected event
  const fetchMedia = async (eventId: number) => {
    try {
      const response = await fetch(`/api/events/${eventId}/media`);
      if (response.ok) {
        const data = await response.json();
        setMedia(data.sort((a: Media, b: Media) => a.order - b.order));
      }
    } catch (error) {
      console.error('Failed to fetch media:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      setLoading(true);
      fetchMedia(selectedEventId);
    }
  }, [selectedEventId]);

  // Handle drag and drop reordering
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !selectedEventId) return;

    const items = Array.from(media);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order values
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index + 1
    }));

    setMedia(updatedItems);

    // Update orders in database
    try {
      await Promise.all(
        updatedItems.map(item => 
          fetch(`/api/media/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item, order: item.order }),
          })
        )
      );
    } catch (error) {
      console.error('Failed to update order:', error);
      fetchMedia(selectedEventId); // Refresh on error
    }
  };

  // Upload file to ImageKit
  const uploadToImageKit = async (file: File): Promise<string> => {
    try {
      const authResponse = await fetch('/api/upload-auth');
      const { token, expire, signature, publicKey } = await authResponse.json();

      const uploadResponse = await upload({
        file,
        fileName: `media-${Date.now()}-${file.name}`,
        token,
        expire,
        signature,
        publicKey,
        folder: `/events/${selectedEventId}`,
        useUniqueFileName: true,
      });

      if (!uploadResponse.url) {
        throw new Error('Upload did not return a URL.');
      }
      return uploadResponse.url;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  };

  // Handle file drop with preview
  const handleFileDrop = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      const fileType = file.type.startsWith('video/') ? 'video' : 'photo';
      setFormData(prev => ({ ...prev, type: fileType }));

      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  // Remove selected file
  const removeSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  // Auto-translate content
  const handleAutoTranslate = async () => {
    if (!formData.heading_en && !formData.heading_hi) return;

    try {
      const content = {
        heading: sourceLang === 'en' ? formData.heading_en : formData.heading_hi,
        description: sourceLang === 'en' ? formData.description_en : formData.description_hi,
      };

      const translated = await translateContent(content, sourceLang);
      setFormData(prev => ({ ...prev, ...translated }));
    } catch (error) {
      console.error('Translation failed:', error);
    }
  };

  // Save media
  const handleSave = async () => {
    if (!selectedEventId) return;

    try {
      setUploadingFile(true);
      
      let mediaUrl = formData.url || '';
      if (selectedFile) {
        mediaUrl = await uploadToImageKit(selectedFile);
      }

      const mediaData = {
        ...formData,
        url: mediaUrl,
        eventId: selectedEventId,
        order: editingId ? formData.order : (media.length + 1),
      };

      const url = editingId ? `/api/media/${editingId}` : `/api/events/${selectedEventId}/media`;
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mediaData),
      });

      if (response.ok) {
        await fetchMedia(selectedEventId);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to save media:', error);
    } finally {
      setUploadingFile(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      type: 'photo',
      url: '',
      thumbnailUrl: '',
      heading_en: '',
      heading_hi: '',
      description_en: '',
      description_hi: '',
      videoType: 'interview',
      order: 0,
    });
    removeSelectedFile();
    setShowThumbnailSelector(false);
    setIsCreating(false);
    setEditingId(null);
  };

  // Edit media
  const handleEdit = (mediaItem: Media) => {
    setFormData(mediaItem);
    setEditingId(mediaItem.id!);
    setIsCreating(true);
      // Set preview for existing media
  if (mediaItem.url) {
    setPreviewUrl(mediaItem.url);
    // Don't set selectedFile since it's already uploaded
    setSelectedFile(null);
  }
  };

  // Delete media
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this media?')) return;

    try {
      const response = await fetch(`/api/media/${id}`, { method: 'DELETE' });
      if (response.ok && selectedEventId) {
        await fetchMedia(selectedEventId);
      }
    } catch (error) {
      console.error('Failed to delete media:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-pink-900">Media Management</h2>
          <p className="text-pink-700">Drag media to reorder • Auto-saves order changes</p>
        </div>
      </div>

      {/* Event Selection */}
{/* Event Selection */}
<Card className="border-pink-200">
  <CardHeader className="bg-pink-50">
    <CardTitle className="text-pink-900">Select Event</CardTitle>
    <CardDescription>Choose an event to manage its media content</CardDescription>
  </CardHeader>
  <CardContent className="pt-6">
    <Select 
      value={selectedEventId?.toString() || ""} 
      onValueChange={(value) => setSelectedEventId(value ? parseInt(value) : null)}
    >
      <SelectTrigger className="border-pink-200 focus:border-pink-400">
        <SelectValue placeholder="Select an event..." />
      </SelectTrigger>
      <SelectContent>
        {events.map((event) => (
          <SelectItem key={event.id} value={event.id.toString()}>
            {event.heading_en} (/events/{event.slug})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </CardContent>
</Card>

      {selectedEventId && (
        <>
          {/* Add Media Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => setIsCreating(true)}
              className="bg-pink-600 hover:bg-pink-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Media
            </Button>
          </div>

          {/* Create/Edit Form */}
          {isCreating && (
            <Card className="border-pink-200">
              <CardHeader className="bg-pink-50">
                <CardTitle className="text-pink-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  {editingId ? 'Edit Media' : 'Add New Media'}
                </CardTitle>
                <CardDescription>
                  Upload and manage media content with bilingual descriptions
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

                {/* Media Upload with Preview */}
                <div className="space-y-2">
                  <Label>Media Upload</Label>
                  {!selectedFile ? (
                    <Dropzone
                      onDrop={handleFileDrop}
                      accept={{
                        'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
                        'video/*': ['.mp4', '.webm', '.mov']
                      }}
                      maxSize={100 * 1024 * 1024} // 100MB
                      className="border-pink-200 hover:border-pink-400"
                    >
                      <DropzoneContent />
                      <DropzoneEmptyState />
                    </Dropzone>
                  ) : (
                    <div className="border-2 border-dashed border-pink-300 rounded-lg p-4">
                      <div className="flex items-center gap-4">
                        {/* File Preview */}
                        <div className="relative">
                          {formData.type === 'video' ? (
                            <div className="w-32 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Play className="w-8 h-8 text-gray-500" />
                            </div>
                          ) : (
                            <Image
                              src={previewUrl}
                              alt="Preview"
                              width={128}
                              height={96}
                              className="w-32 h-24 object-cover rounded-lg"
                            />
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                            onClick={removeSelectedFile}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        {/* File Info */}
                        <div className="flex-1">
                          <p className="font-medium text-pink-800">{selectedFile.name}</p>
                          <p className="text-sm text-pink-600">
                            {formData.type?.toUpperCase()} • {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Media Type & Video Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Media Type</Label>
                    <Select value={formData.type} onValueChange={(value: 'photo' | 'video') => setFormData(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger className="border-pink-200 focus:border-pink-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="photo">Photo</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {formData.type === 'video' && (
                    <div className="space-y-2">
                      <Label>Video Type</Label>
                      <Select value={formData.videoType} onValueChange={(value: 'interview' | 'distribution') => setFormData(prev => ({ ...prev, videoType: value }))}>
                        <SelectTrigger className="border-pink-200 focus:border-pink-400">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="interview">Interview</SelectItem>
                          <SelectItem value="distribution">Distribution</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Heading Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="heading_en">Heading (English)</Label>
                    <Input
                      id="heading_en"
                      value={formData.heading_en}
                      onChange={(e) => setFormData(prev => ({ ...prev, heading_en: e.target.value }))}
                      placeholder="Enter English heading"
                      className="border-pink-200 focus:border-pink-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heading_hi">Heading (Hindi)</Label>
                    <Input
                      id="heading_hi"
                      value={formData.heading_hi}
                      onChange={(e) => setFormData(prev => ({ ...prev, heading_hi: e.target.value }))}
                      placeholder="Enter Hindi heading"
                      className="border-pink-200 focus:border-pink-400"
                    />
                  </div>
                </div>

                {/* Description Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="desc_en">Description (English)</Label>
                    <Textarea
                      id="desc_en"
                      value={formData.description_en}
                      onChange={(e) => setFormData(prev => ({ ...prev, description_en: e.target.value }))}
                      placeholder="Enter English description"
                      className="border-pink-200 focus:border-pink-400 min-h-20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desc_hi">Description (Hindi)</Label>
                    <Textarea
                      id="desc_hi"
                      value={formData.description_hi}
                      onChange={(e) => setFormData(prev => ({ ...prev, description_hi: e.target.value }))}
                      placeholder="Enter Hindi description"
                      className="border-pink-200 focus:border-pink-400 min-h-20"
                    />
                  </div>
                </div>

                {/* Video Thumbnail Selection */}
                {formData.type === 'video' && (
                  <div className="space-y-2">
                    <Label>Video Thumbnail</Label>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Video className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-blue-800">Choose a thumbnail for your video</span>
                      </div>
                      
                      {/* Current Selection */}
                      {formData.thumbnailUrl && (
                        <div className="mb-4 p-3 bg-white border border-blue-200 rounded-lg">
                          <p className="text-sm font-medium text-blue-800 mb-2">Current Selection:</p>
                          <div className="flex items-center gap-3">
                            <img 
                              src={formData.thumbnailUrl} 
                              alt="Selected thumbnail" 
                              className="w-16 h-12 object-cover rounded border"
                            />
                            <div>
                              <p className="text-sm font-medium">
                                {availableVideoThumbnails.find(t => t.path === formData.thumbnailUrl)?.name || 'Custom thumbnail'}
                              </p>
                              <p className="text-xs text-gray-600">
                                Type: {availableVideoThumbnails.find(t => t.path === formData.thumbnailUrl)?.type || 'Custom'}
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setFormData(prev => ({ ...prev, thumbnailUrl: '' }))}
                                className="text-xs text-red-600 hover:text-red-800 p-0 h-auto mt-1"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Auto-select based on video type */}
                      {formData.videoType && !formData.thumbnailUrl && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-yellow-600">💡</span>
                            <span className="text-sm font-medium text-yellow-800">Auto-suggestion based on video type</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const suggestedThumbnail = availableVideoThumbnails.find(t => t.type === formData.videoType);
                              if (suggestedThumbnail) {
                                setFormData(prev => ({ ...prev, thumbnailUrl: suggestedThumbnail.path }));
                              }
                            }}
                            className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                          >
                            Use {formData.videoType} thumbnail
                          </Button>
                        </div>
                      )}

                      {/* Thumbnail Options */}
                      <div className="space-y-3">
                        <p className="text-sm text-blue-700">Select from available thumbnails:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {availableVideoThumbnails.map((thumbnail) => (
                            <button
                              key={thumbnail.id}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, thumbnailUrl: thumbnail.path }))}
                              className={`relative group border-2 rounded-lg overflow-hidden transition-all hover:shadow-md ${
                                formData.thumbnailUrl === thumbnail.path 
                                  ? 'border-blue-500 shadow-lg' 
                                  : 'border-gray-200 hover:border-blue-300'
                              }`}
                            >
                              <img 
                                src={thumbnail.path} 
                                alt={thumbnail.name}
                                className="w-full h-24 object-cover"
                              />
                              <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-20 transition-all" />
                              <div className="p-2 bg-white">
                                <p className="text-xs font-medium text-gray-800">
                                  {thumbnail.name}
                                </p>
                                <p className="text-xs text-gray-600 capitalize">
                                  For {thumbnail.type} videos
                                </p>
                              </div>
                              {formData.thumbnailUrl === thumbnail.path && (
                                <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Help Text */}
                      <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-700">
                        💡 <strong>Tip:</strong> The thumbnail will be displayed on the event page when the video is not playing. Choose based on your video type: Interview or Distribution.
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={uploadingFile || isTranslating}
                    className="bg-pink-600 hover:bg-pink-700 text-white"
                  >
                    {uploadingFile ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {uploadingFile ? 'Saving...' : 'Save Media'}
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
              </CardContent>
            </Card>
          )}

          {/* Draggable Media List */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="media">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                    {media.length === 0 ? (
                      <Card className="border-pink-200">
                        <CardContent className="flex items-center justify-center h-32">
                          <p className="text-pink-600">No media found for this event. Add some media to get started!</p>
                        </CardContent>
                      </Card>
                    ) : (
                      media.map((mediaItem, index) => (
                        <Draggable key={mediaItem.id} draggableId={mediaItem.id!.toString()} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`border-pink-200 transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg' : ''
                              }`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                  {/* Drag Handle */}
                                  <div
                                    {...provided.dragHandleProps}
                                    className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 cursor-grab"
                                  >
                                    <GripVertical className="w-5 h-5" />
                                  </div>

                                  {/* Media Preview */}
                                  <div className="w-24 h-24 bg-pink-50 rounded-lg flex items-center justify-center overflow-hidden">
                                    {mediaItem.type === 'photo' ? (
                                      <img 
                                        src={mediaItem.url} 
                                        alt={mediaItem.heading_en || 'Media'} 
                                        className="w-full h-full object-cover rounded-lg"
                                      />
                                    ) : (
                                      <div className="relative w-full h-full">
                                        {mediaItem.thumbnailUrl ? (
                                          <img 
                                            src={mediaItem.thumbnailUrl} 
                                            alt={mediaItem.heading_en || 'Video thumbnail'} 
                                            className="w-full h-full object-cover rounded-lg"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                                            <Video className="w-8 h-8 text-gray-500" />
                                          </div>
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center bg-opacity-20 rounded-lg">
                                          <Play className="w-4 h-4 text-white" />
                                        </div>
                                        <Badge variant="outline" className="absolute bottom-1 right-1 text-xs border-pink-300 bg-white">
                                          {mediaItem.videoType}
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Media Details */}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded">
                                        #{mediaItem.order}
                                      </span>
                                      <h3 className="font-semibold text-pink-900">
                                        {mediaItem.heading_en || 'Untitled Media'}
                                      </h3>
                                      <Badge variant="outline" className="border-pink-300 text-pink-700">
                                        {mediaItem.type}
                                      </Badge>
                                      {mediaItem.type === 'video' && mediaItem.thumbnailUrl && (
                                        <Badge variant="outline" className="border-blue-300 text-blue-700 text-xs">
                                          📷 Custom thumb
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600">
                                      {mediaItem.description_en || 'No description'}
                                    </p>
                                    {mediaItem.type === 'video' && (
                                      <p className="text-xs text-pink-600 mt-1">
                                        Type: {mediaItem.videoType} • 
                                        Thumbnail: {mediaItem.thumbnailUrl ? '✅ Set' : '❌ Not set'}
                                      </p>
                                    )}
                                  </div>
                                  
                                  {/* Action Buttons */}
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEdit(mediaItem)}
                                      className="border-pink-300 text-pink-700 hover:bg-pink-50"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDelete(mediaItem.id!)}
                                      className="border-red-300 text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </>
      )}
    </div>
  );
}