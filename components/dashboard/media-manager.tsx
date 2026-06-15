'use client';

import { useState, useEffect, useMemo, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Plus, Edit, Trash2, Save, X, Loader2, Image as ImageIcon, Video, Play, GripVertical } from 'lucide-react';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone';
import { upload } from '@imagekit/next';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  idleSaveProgress,
  SaveProgress,
  type SaveProgressState,
} from '@/components/dashboard/save-progress';
import { SlugCombobox } from '@/components/dashboard/slug-combobox';

interface Media {
  id?: number;
  eventId: number;
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl?: string;
  heading_en?: string;
  description_en?: string;
  videoType?: 'interview' | 'distribution';
  order: number;
}

interface Event {
  id: number;
  slug: string;
  heading_en: string;
  isActive: boolean;
}

const availableVideoThumbnails = [
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
];

const fallbackPreviewImage = '/placeholder.jpg';

const getSafeImageSrc = (src?: string | null) => src?.trim() || fallbackPreviewImage;

export default function MediaManager() {
  const [media, setMedia] = useState<Media[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [saveProgress, setSaveProgress] = useState<SaveProgressState>(idleSaveProgress);
  const [formData, setFormData] = useState<Partial<Media>>({
    type: 'photo',
    url: '',
    thumbnailUrl: '',
    heading_en: '',
    description_en: '',
    videoType: 'interview',
    order: 0,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<Media | null>(null);

  // Fetch events
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const data = await response.json();
      setEvents(data.filter((event: Event) => event.isActive));
    } catch (error) {
      console.error('Failed to fetch events:', error);
      toast.error('Could not load event slugs. Please refresh and try again.');
    }
  };

  // Fetch media for selected event
  const fetchMedia = async (eventId: number) => {
    try {
      const response = await fetch(`/api/events/${eventId}/media`);
      if (!response.ok) {
        throw new Error('Failed to fetch media');
      }
      const data = await response.json();
      setMedia(data.sort((a: Media, b: Media) => a.order - b.order));
    } catch (error) {
      console.error('Failed to fetch media:', error);
      toast.error('Could not load event media. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvents();
  }, []);

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
  const uploadToImageKit = async (
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<string> => {
    try {
      const authResponse = await fetch('/api/upload-auth');
      if (!authResponse.ok) {
        throw new Error('Could not prepare the upload. Please try again later.');
      }
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
        onProgress: (event) => {
          if (!event.lengthComputable) return;
          onProgress?.(Math.round((event.loaded / event.total) * 100));
        },
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
      setSaveProgress(idleSaveProgress);
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
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    // Clear url when removing file
    setFormData(prev => ({ ...prev, url: '' }));
    setSaveProgress(idleSaveProgress);
  };

  // Save media
  const handleSave = async () => {
    if (!selectedEventId) return;

    try {
      setUploadingFile(true);
      setSaveProgress({
        status: selectedFile ? 'uploading' : 'saving',
        progress: selectedFile ? 5 : 35,
        message: selectedFile ? 'Preparing media upload...' : 'Saving media...',
      });
      
      let mediaUrl = formData.url || '';
      if (selectedFile) {
        mediaUrl = await uploadToImageKit(selectedFile, (progress) => {
          setSaveProgress({
            status: 'uploading',
            progress: Math.min(85, Math.max(8, progress)),
            message: `Uploading ${selectedFile.name}`,
          });
        });
      }

      setSaveProgress({
        status: 'saving',
        progress: 90,
        message: editingId ? 'Updating media...' : 'Saving media to event...',
      });

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

      if (!response.ok) {
        throw new Error(editingId ? 'Failed to update media' : 'Failed to create media');
      }

      setSaveProgress({
        status: 'success',
        progress: 100,
        message: editingId ? 'Media updated successfully.' : 'Media saved successfully.',
      });
      toast.success(editingId ? 'Media updated successfully.' : 'Media saved successfully.');
      await fetchMedia(selectedEventId);
      resetForm();
    } catch (error) {
      console.error('Failed to save media:', error);
      setSaveProgress({
        status: 'error',
        progress: 100,
        message: 'Media save failed. Try again later.',
      });
      toast.error('Media save failed. Try again later.');
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
      description_en: '',
      videoType: 'interview',
      order: 0,
    });
    removeSelectedFile();
    setIsCreating(false);
    setEditingId(null);
    setSaveProgress(idleSaveProgress);
  };

  // Edit media
  const handleEdit = (mediaItem: Media) => {
    setSaveProgress(idleSaveProgress);
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
    try {
      const response = await fetch(`/api/media/${id}`, { method: 'DELETE' });
      if (response.ok && selectedEventId) {
        await fetchMedia(selectedEventId);
        setDeleteTarget(null);
      }
    } catch (error) {
      console.error('Failed to delete media:', error);
    }
  };

  const eventOptions = useMemo(
    () =>
      events.map((event) => ({
        value: event.id.toString(),
        label: event.heading_en,
        description: `/events/${event.slug}`,
      })),
    [events],
  );

  const handleSelectEvent = (value: string) => {
    resetForm();

    if (!value) {
      setSelectedEventId(null);
      setMedia([]);
      setLoading(false);
      return;
    }

    const nextEventId = parseInt(value);
    setSelectedEventId(nextEventId);
    setLoading(true);
    void fetchMedia(nextEventId);
  };

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
          <h2 className="text-xl sm:text-2xl font-bold text-pink-900">Event Media Management</h2>
          <p className="text-sm sm:text-base text-pink-700">Drag media to reorder • Auto-saves order changes</p>
        </div>
      </motion.div>

      {/* Event Selection */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border-pink-200">
          <CardHeader >
            <CardTitle className="text-pink-900 text-base sm:text-lg">Select Event</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Choose an event to manage its media content</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex-1">
                <SlugCombobox
                  value={selectedEventId?.toString() || ""}
                  options={eventOptions}
                  onValueChange={handleSelectEvent}
                  placeholder="Search or select an event slug..."
                  searchPlaceholder="Type event heading or slug..."
                  emptyMessage="No matching events found."
                  className="focus:border-pink-400"
                />
              </div>
              
              {/* Clear Button */}
              {selectedEventId && (
                <div className="flex items-end">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectEvent('')}
                      className="border-red-600 bg-red-500 text-white hover:bg-gradient-to-r from-red-500 to-red-700 hover:text-white cursor-pointer"
                    >
                      Clear
                    </Button>
                  </motion.div>
                </div>
              )}
            </div>
            
      
          </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence>
        {selectedEventId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Add Media Button */}
            <div className="flex justify-end">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={() => {
                    setSaveProgress(idleSaveProgress);
                    setIsCreating(true);
                  }}
                  className="bg-pink-600 hover:bg-pink-700 text-white w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Media
                </Button>
              </motion.div>
            </div>

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
                    <CardHeader >
                      <CardTitle className="text-pink-900 flex items-center gap-2 text-base sm:text-lg">
                        <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        {editingId ? 'Edit Media' : 'Add New Media'}
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Upload and manage media content with English descriptions
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 sm:space-y-6 pt-4 sm:pt-6">
                      {/* Media Upload with Preview */}
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: 0.1 }}
                        className="space-y-2"
                      >
                        <Label className="text-sm">Media Upload</Label>
                        {!selectedFile && !previewUrl ? (
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
                          <div className="border-2 border-dashed border-pink-300 rounded-lg p-3 sm:p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                              {/* File Preview */}
                              <div className="relative mx-auto sm:mx-0">
                                {formData.type === 'video' ? (
                                  <div className="w-24 h-18 sm:w-32 sm:h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                                    <Play className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" />
                                  </div>
                                ) : (
                                  <Image
                                    src={getSafeImageSrc(previewUrl)}
                                    alt="Preview"
                                    width={128}
                                    height={96}
                                    className="w-24 h-18 sm:w-32 sm:h-24 object-cover rounded-lg"
                                    unoptimized={previewUrl.startsWith('blob:')}
                                  />
                                )}
                                <motion.div
                                  className="absolute -top-2 -right-2"
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="size-6 rounded-full p-0"
                                    onClick={removeSelectedFile}
                                    aria-label="Remove selected media"
                                  >
                                    <X className="size-3" />
                                  </Button>
                                </motion.div>
                              </div>
                              
                              {/* File Info */}
                              <div className="flex-1 text-center sm:text-left">
                                {selectedFile ? (
                                  // New file being uploaded
                                  <>
                                    <p className="font-medium text-pink-800 text-sm sm:text-base truncate">{selectedFile.name}</p>
                                    <p className="text-xs sm:text-sm text-pink-600">
                                      {formData.type?.toUpperCase()} • {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  </>
                                ) : (
                                  // Existing uploaded file
                                  <>
                                    <p className="font-medium text-pink-800 text-sm sm:text-base">Current Media</p>
                                    <p className="text-xs sm:text-sm text-pink-600">
                                      {formData.type?.toUpperCase()} • Already uploaded
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Click X to remove and upload new media
                                    </p>
                                  </>
                                )}
                              </div>
                              
                              {/* Replace button for existing media */}
                              {!selectedFile && previewUrl && (
                                <motion.div
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  className="w-full sm:w-auto"
                                >
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      // Clear current preview and show dropzone
                                      setPreviewUrl('');
                                      setFormData(prev => ({ ...prev, url: '' }));
                                    }}
                                    className="border-pink-300 text-pink-700 hover:bg-pink-50 w-full sm:w-auto"
                                  >
                                    Replace
                                  </Button>
                                </motion.div>
                              )}
                            </div>
                            
                            {/* Drop new file hint for existing media */}
                            {!selectedFile && previewUrl && (
                              <div className="mt-3 pt-3 border-t border-pink-200">
                                <p className="text-xs text-center text-pink-600">
                                  Or drag & drop a new file here to replace
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>

                      {/* Media Type & Video Options */}
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: 0.2 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
                      >
                        <div className="space-y-2">
                          <Label className="text-sm">Media Type</Label>
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
                        
                        <AnimatePresence>
                          {formData.type === 'video' && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="space-y-2"
                            >
                              <Label className="text-sm">Video Type</Label>
                              <Select value={formData.videoType} onValueChange={(value: 'interview' | 'distribution') => setFormData(prev => ({ ...prev, videoType: value }))}>
                                <SelectTrigger className="border-pink-200 focus:border-pink-400">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="interview">Interview</SelectItem>
                                  <SelectItem value="distribution">Distribution</SelectItem>
                                </SelectContent>
                              </Select>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>

                      {/* Heading Fields */}
                      <div className="grid grid-cols-1 gap-4">
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: 0.3 }}
                          className="space-y-2"
                        >
                          <Label htmlFor="heading_en" className="text-sm">Heading  </Label>
                          <Input
                            id="heading_en"
                            value={formData.heading_en}
                            onChange={(e) => setFormData(prev => ({ ...prev, heading_en: e.target.value }))}
                            placeholder="Enter English heading"
                            className="border-pink-200 focus:border-pink-400 text-sm"
                          />
                        </motion.div>
                      </div>

                      {/* Description Fields */}
                      <div className="grid grid-cols-1 gap-4">
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: 0.5 }}
                          className="space-y-2"
                        >
                          <Label htmlFor="desc_en" className="text-sm">Description  </Label>
                          <Textarea
                            id="desc_en"
                            value={formData.description_en}
                            onChange={(e) => setFormData(prev => ({ ...prev, description_en: e.target.value }))}
                            placeholder="Enter English description"
                            className="border-pink-200 focus:border-pink-400 min-h-20 text-sm"
                          />
                        </motion.div>
                      </div>

                      {/* Video Thumbnail Selection */}
                      <AnimatePresence>
                        {formData.type === 'video' && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-2"
                          >
                            <Label className="text-sm">Video Thumbnail</Label>
                            <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center gap-2 mb-3">
                                <Video className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                <span className="font-medium text-blue-800 text-sm sm:text-base">Choose a thumbnail for your video</span>
                              </div>
                              
                              {/* Current Selection */}
                              <AnimatePresence>
                                {formData.thumbnailUrl?.trim() && (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="mb-4 p-3 bg-white border border-blue-200 rounded-lg"
                                  >
                                    <p className="text-sm font-medium text-blue-800 mb-2">Current Selection:</p>
                                    <div className="flex items-center gap-3">
                                      <Image
                                        src={getSafeImageSrc(formData.thumbnailUrl)}
                                        alt="Selected thumbnail" 
                                        width={64}
                                        height={48}
                                        className="w-12 h-9 sm:w-16 sm:h-12 object-cover rounded border"
                                      />
                                      <div className="flex-1">
                                        <p className="text-xs sm:text-sm font-medium">
                                          {availableVideoThumbnails.find(t => t.path === formData.thumbnailUrl)?.name || 'Custom thumbnail'}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                          Type: {availableVideoThumbnails.find(t => t.path === formData.thumbnailUrl)?.type || 'Custom'}
                                        </p>
                                        <motion.div
                                          whileHover={{ scale: 1.05 }}
                                          whileTap={{ scale: 0.95 }}
                                        >
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setFormData(prev => ({ ...prev, thumbnailUrl: '' }))}
                                            className="text-xs text-red-600 hover:text-red-800 p-0 h-auto mt-1"
                                          >
                                            Remove
                                          </Button>
                                        </motion.div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {/* Auto-select based on video type */}
                              <AnimatePresence>
                                {formData.videoType && !formData.thumbnailUrl && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-yellow-600">💡</span>
                                      <span className="text-sm font-medium text-yellow-800">Auto-suggestion based on video type</span>
                                    </div>
                                    <motion.div
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                    >
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
                                    </motion.div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {/* Thumbnail Options */}
                              <div className="space-y-3">
                                <p className="text-xs sm:text-sm text-blue-700">Select from available thumbnails:</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                                  {availableVideoThumbnails.map((thumbnail, index) => (
                                    <motion.button
                                      key={thumbnail.id}
                                      initial={{ opacity: 0, scale: 0.9 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ duration: 0.2, delay: index * 0.05 }}
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      type="button"
                                      onClick={() => setFormData(prev => ({ ...prev, thumbnailUrl: thumbnail.path }))}
                                      className={`relative group border-2 rounded-lg overflow-hidden transition-all hover:shadow-md ${
                                        formData.thumbnailUrl === thumbnail.path 
                                          ? 'border-blue-500 shadow-lg' 
                                          : 'border-gray-200 hover:border-blue-300'
                                      }`}
                                    >
                                      <Image
                                        src={thumbnail.path} 
                                        alt={thumbnail.name}
                                        width={360}
                                        height={180}
                                        className="w-full h-16 sm:h-24 object-cover"
                                      />
                                      <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-20 transition-all" />
                                      <div className="p-1 sm:p-2 bg-white">
                                        <p className="text-xs font-medium text-gray-800 truncate">
                                          {thumbnail.name}
                                        </p>
                                        <p className="text-xs text-gray-600 capitalize">
                                          For {thumbnail.type} videos
                                        </p>
                                      </div>
                                      <AnimatePresence>
                                        {formData.thumbnailUrl === thumbnail.path && (
                                          <motion.div 
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute top-1 right-1 w-4 h-4 sm:w-5 sm:h-5 bg-blue-500 rounded-full flex items-center justify-center"
                                          >
                                            <svg className="w-2 h-2 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </motion.button>
                                  ))}
                                </div>
                              </div>

                         
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Action Buttons */}
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: 0.7 }}
                        className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-start"
                      >
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full sm:w-auto"
                        >
                            <Button
                              onClick={handleSave}
                            disabled={uploadingFile}
                            className="bg-pink-600 hover:bg-pink-700 text-white w-full sm:w-auto"
                          >
                            {uploadingFile ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Save className="w-4 h-4 mr-2" />
                            )}
                            {uploadingFile ? 'Saving...' : 'Save Media'}
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
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Draggable Media List */}
            {loading ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center h-64"
              >
                <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="media">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3 sm:space-y-4">
                        {media.length === 0 ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            <Card className="border-pink-200">
                              <CardContent className="flex items-center justify-center h-32">
                                <p className="text-pink-600 text-center text-sm sm:text-base">No media found for this event. Add some media to get started!</p>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ) : (
                          media.map((mediaItem, index) => (
                            <Draggable key={mediaItem.id} draggableId={mediaItem.id!.toString()} index={index}>
                              {(provided, snapshot) => {
                                const { style, ...draggableProps } = provided.draggableProps;

                                return (
                                <div
                                  ref={provided.innerRef}
                                  {...draggableProps}
                                  style={style as CSSProperties | undefined}
                                >
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: index * 0.05 }}
                                    whileHover={{ scale: 1.01 }}
                                  >
                                    <Card
                                      className={`border-pink-200 transition-shadow ${
                                        snapshot.isDragging ? 'shadow-lg' : ''
                                      }`}
                                    >
                                      <CardContent className="p-3 sm:p-4">
                                        <div className="flex  lg:items-start gap-2 lg:gap-4">
                                        {/* Drag Handle */}
                                        <div
                                          {...provided.dragHandleProps}
                                          className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 text-gray-400 hover:text-gray-600 cursor-grab mx-auto lg:mx-0"
                                        >
                                          <GripVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </div>

                                        {/* Media Preview */}
                                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-pink-50 rounded-lg flex items-center justify-center overflow-hidden mx-auto lg:mx-0">
                                          {mediaItem.type === 'photo' ? (
                                            <Image
                                              src={getSafeImageSrc(mediaItem.url)}
                                              alt={mediaItem.heading_en || 'Media'} 
                                              width={160}
                                              height={160}
                                              className="w-full h-full object-cover rounded-lg"
                                            />
                                          ) : (
                                            <div className="relative w-full h-full">
                                              {mediaItem.thumbnailUrl?.trim() ? (
                                                <Image
                                                  src={getSafeImageSrc(mediaItem.thumbnailUrl)}
                                                  alt={mediaItem.heading_en || 'Video thumbnail'} 
                                                  width={160}
                                                  height={160}
                                                  className="w-full h-full object-cover rounded-lg"
                                                />
                                              ) : (
                                                <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                                                  <Video className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" />
                                                </div>
                                              )}
                                              <div className="absolute inset-0 flex items-center justify-center bg-opacity-20 rounded-lg">
                                                <Play className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                                              </div>
                                              <Badge variant="outline" className="absolute bottom-1 right-1 text-xs border-pink-300 bg-white">
                                                {mediaItem.videoType}
                                              </Badge>
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Media Details */}
                                        <div className="flex-1 min-w-0 text-center lg:text-left">
                                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 justify-center lg:justify-start">
                                            <div className="flex items-center gap-2 flex-wrap justify-center lg:justify-start">
                                              <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded">
                                                #{mediaItem.order}
                                              </span>
                                              <h3 className="font-semibold text-pink-900 text-sm sm:text-base truncate">
                                                {mediaItem.heading_en || 'Untitled Media'}
                                              </h3>
                                            </div>
                                            <div className="flex flex-wrap gap-1 justify-center lg:justify-start">
                                              <Badge variant="outline" className="border-pink-300 text-pink-700 text-xs">
                                                {mediaItem.type}
                                              </Badge>
                                              {mediaItem.type === 'video' && mediaItem.thumbnailUrl && (
                                                <Badge variant="outline" className="border-blue-300 text-blue-700 text-xs">
                                                  📷 Custom thumb
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                          <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">
                                            {mediaItem.description_en || 'No description'}
                                          </p>
                                          {mediaItem.type === 'video' && (
                                            <p className="text-xs text-pink-600">
                                              Type: {mediaItem.videoType} • 
                                              Thumbnail: {mediaItem.thumbnailUrl ? '✅ Set' : '❌ Not set'}
                                            </p>
                                          )}
                                        </div>
                                        
                                        {/* Action Buttons */}
                                        <div className="flex flex-row lg:flex-col gap-1 sm:gap-2 justify-center lg:justify-start">
                                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleEdit(mediaItem)}
                                              className="border-pink-300 text-pink-700 hover:bg-pink-50 p-2"
                                            >
                                              <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                            </Button>
                                          </motion.div>
                                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => setDeleteTarget(mediaItem)}
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
                                </div>
                              )}}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete media?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteTarget?.heading_en ? `"${deleteTarget.heading_en}"` : 'this media item'}.
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
