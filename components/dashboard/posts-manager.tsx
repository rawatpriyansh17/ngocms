'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
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
import { Plus, Edit, Trash2, Save, X, Loader2, Eye, GripVertical, Play, Video } from 'lucide-react';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone';
import { upload } from '@imagekit/next';
import NextImage from 'next/image';
import { toast } from 'sonner';
import {
  idleSaveProgress,
  SaveProgress,
  type SaveProgressState,
} from '@/components/dashboard/save-progress';
interface Post {
  id?: number;
  title_en: string;
  description_en: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  thumbnailUrl?: string;
  eventPageSlug?: string;
  isActive: boolean;
  order: number;
}

const availableThumbnails = [
  { 
    id: 'event-highlights1', 
    name: 'Event Highlights 1', 
    path: '/event-highlights1.png',
    category: 'event'
  },
  { 
    id: 'event-highlights2', 
    name: 'Event Highlights 2', 
    path: '/event-highlights2.png',
    category: 'event'
  },
];

const fallbackPreviewImage = '/placeholder.jpg';

const getSafeImageSrc = (src?: string | null) => src?.trim() || fallbackPreviewImage;

const scrollToManagerSection = (id: string) => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  });
};

const uploadPostToImageKit = async (
  file: File,
  onProgress?: (progress: number) => void,
): Promise<string> => {
  const authResponse = await fetch('/api/upload-auth');
  if (!authResponse.ok) {
    throw new Error('Could not prepare the upload. Please try again later.');
  }
  const { token, expire, signature, publicKey } = await authResponse.json();

  const uploadResponse = await upload({
    file,
    fileName: `post-${Date.now()}-${file.name}`,
    token,
    expire,
    signature,
    publicKey,
    folder: '/posts',
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
};

export default function PostsManager() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [saveProgress, setSaveProgress] = useState<SaveProgressState>(idleSaveProgress);
  const [formData, setFormData] = useState<Partial<Post>>({
    title_en: '',
    description_en: '',
    mediaType: 'image',
    mediaUrl: '',
    thumbnailUrl: '',
    eventPageSlug: '',
    isActive: true,
    order: 0,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewPost, setPreviewPost] = useState<Post | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);

  // Fetch posts
  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts');
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      const data = await response.json();
      setPosts(data.sort((a: Post, b: Post) => a.order - b.order));
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      toast.error('Could not load posts. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPosts();
  }, []);

  // Handle drag and drop reordering
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(posts);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index + 1
    }));

    setPosts(updatedItems);

    try {
      await Promise.all(
        updatedItems.map(item => 
          fetch(`/api/posts/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item, order: item.order }),
          })
        )
      );
    } catch (error) {
      console.error('Failed to update order:', error);
      fetchPosts();
    }
  };

  const handleFileDrop = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      setSaveProgress(idleSaveProgress);
      setSelectedFile(file);
      const fileType = file.type.startsWith('video/') ? 'video' : 'image';
      setFormData(prev => ({ 
        ...prev, 
        mediaType: fileType,
        thumbnailUrl: fileType === 'image' ? '' : prev.thumbnailUrl
      }));

      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    setFormData(prev => ({ ...prev, mediaUrl: '' }));
    setSaveProgress(idleSaveProgress);
  };

  const handleSave = async () => {
    try {
      setUploadingFile(true);
      setSaveProgress({
        status: selectedFile ? 'uploading' : 'saving',
        progress: selectedFile ? 5 : 35,
        message: selectedFile ? 'Preparing media upload...' : 'Saving post...',
      });
      
      let mediaUrl = formData.mediaUrl || '';
      
      if (selectedFile) {
        mediaUrl = await uploadPostToImageKit(selectedFile, (progress) => {
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
        message: editingId ? 'Updating post...' : 'Adding post at the top...',
      });

      const postData = {
        ...formData,
        mediaUrl,
        order: editingId ? formData.order : 1,
      };

      const url = editingId ? `/api/posts/${editingId}` : '/api/posts';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        throw new Error(editingId ? 'Failed to update post' : 'Failed to create post');
      }

      if (!editingId) {
        const orderResponses = await Promise.all(
          posts.map((post) =>
            fetch(`/api/posts/${post.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...post, order: post.order + 1 }),
            }),
          ),
        );
        if (orderResponses.some((orderResponse) => !orderResponse.ok)) {
          throw new Error('Post was created, but existing post order could not be shifted');
        }
      }

      setSaveProgress({
        status: 'success',
        progress: 100,
        message: editingId ? 'Post updated successfully.' : 'Post saved at #1.',
      });
      toast.success(editingId ? 'Post updated successfully.' : 'Post saved at the top.');
      await fetchPosts();
      resetForm();
    } catch (error) {
      console.error('Failed to save post:', error);
      setSaveProgress({
        status: 'error',
        progress: 100,
        message: 'Post save failed. Try again later.',
      });
      toast.error('Post save failed. Try again later.');
    } finally {
      setUploadingFile(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title_en: '',
      description_en: '',
      mediaType: 'image',
      mediaUrl: '',
      thumbnailUrl: '',
      eventPageSlug: '',
      isActive: true,
      order: 0,
    });
    removeSelectedFile();
    setIsCreating(false);
    setEditingId(null);
    setSaveProgress(idleSaveProgress);
    if (!editingId) {
      setPreviewUrl('');
    }
  };

  const handleEdit = (post: Post) => {
    setSaveProgress(idleSaveProgress);
    setFormData(post);
    setEditingId(post.id!);
    setIsCreating(true);
    
    if (post.mediaUrl) {
      setPreviewUrl(post.mediaUrl);
      setSelectedFile(null);
    }

    scrollToManagerSection('edit-post');
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchPosts();
        setDeleteTarget(null);
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

  const handlePreviewPost = (post: Post) => {
    setPreviewPost(post);
    requestAnimationFrame(() => {
      document.getElementById('live-postpreview')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

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
    <div className="space-y-3 sm:space-y-5">
      {/* Header */}
      <motion.div 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4"
      >
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-pink-900">Posts Management</h2>
          <p className="text-sm sm:text-base text-pink-700">Drag posts to reorder • Auto-saves order changes</p>
        </div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={() => {
              setSaveProgress(idleSaveProgress);
              setIsCreating(true);
            }}
            className="bg-gradient-to-b from-pink-400 via-pink-600 to-pink-500 hover:bg-pink-700 text-white w-full sm:w-auto font-semibold text-md"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Post
          </Button>
        </motion.div>
      </motion.div>

      {/* Individual Post Preview */}
      <AnimatePresence>
        {previewPost && (
          <motion.div
            id="live-postpreview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card  className="border-blue-200 bg-blue-50">
              <CardHeader >
                <div className="flex sm:items-center sm:justify-between gap-2">
                  <CardTitle className="text-blue-900 flex items-center gap-2 text-base sm:text-lg">
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="truncate text-wrap text-xs md:text-base">Preview: {previewPost.title_en}</span>
                                 
                  </CardTitle>
                     <motion.div
                    whileHover={{ scale: 1.1 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewPost(null)}
                      className="text-blue-700 hover:bg-blue-100"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>

                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-white rounded-lg p-3 sm:p-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-1/2 relative">
                      {previewPost.mediaType === 'video' ? (
                        <motion.div 
                          initial={{ scale: 0.95 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.2 }}
                          className="relative"
                        >
                          <NextImage
                            src={getSafeImageSrc(previewPost.thumbnailUrl)}
                            alt="Video thumbnail"
                            width={640}
                            height={360}
                            className="w-full h-auto rounded-lg"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-opacity-30 rounded-lg">
                            <motion.div 
                              whileHover={{ scale: 1.1 }}
                              className="w-12 h-12 sm:w-16 sm:h-16 bg-white bg-opacity-90 rounded-full flex items-center justify-center"
                            >
                              <Play className="w-6 h-6 sm:w-8 sm:h-8 text-gray-800" />
                            </motion.div>
                          </div>
                          <span className="absolute bottom-2 right-2 bg-black text-white px-2 py-1 text-xs rounded">VIDEO</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ scale: 0.95 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <NextImage
                            src={getSafeImageSrc(previewPost.mediaUrl)}
                            alt={previewPost.title_en}
                            width={400}
                            height={300}
                            className="w-full h-auto rounded-lg"
                          />
                        </motion.div>
                      )}
                    </div>
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="w-full md:w-1/2 bg-pink-100 p-4 sm:p-6 rounded-lg"
                    >
                      <h3 className="text-lg sm:text-xl font-bold mb-3 text-pink-800">{previewPost.title_en}</h3>
                      <p className="text-sm sm:text-base text-pink-700 mb-4">{previewPost.description_en}</p>
                      {previewPost.eventPageSlug && (
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="inline-block bg-pink-500 text-white px-4 py-2 rounded-lg cursor-pointer"
                        >
                          Know More...
                        </motion.div>
                      )}
                    </motion.div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Form */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            id='edit-post'
          >
            <Card className="border-pink-200">
              <CardHeader >
                <CardTitle className="text-pink-900 text-base sm:text-lg">
                  {editingId ? 'Edit Post' : 'Create New Post'}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Fill in the details for your post.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 pt-4 sm:pt-6">
                {/* Title Fields */}
                <div className="grid grid-cols-1 gap-4">
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="title_en" className="text-sm">Title  </Label>
                    <Input
                      id="title_en"
                      value={formData.title_en}
                      onChange={(e) => setFormData(prev => ({ ...prev, title_en: e.target.value }))}
                      placeholder="Enter English title"
                      className="border-pink-200 focus:border-pink-400 text-sm"
                    />
                  </motion.div>
                </div>

                {/* Description Fields */}
                <div className="grid grid-cols-1 gap-4">
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: 0.3 }}
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

                {/* Media Upload with Preview */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.5 }}
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
                      maxSize={100 * 1024 * 1024}
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
                          {formData.mediaType === 'video' ? (
                            <div className="w-24 h-18 sm:w-32 sm:h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Play className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" />
                            </div>
                          ) : (
                            <NextImage
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
                            <>
                              <p className="font-medium text-pink-800 text-sm sm:text-base truncate">{selectedFile.name}</p>
                              <p className="text-xs sm:text-sm text-pink-600">
                                {formData.mediaType?.toUpperCase()} • {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="font-medium text-pink-800 text-sm sm:text-base">Current Media</p>
                              <p className="text-xs sm:text-sm text-pink-600">
                                {formData.mediaType?.toUpperCase()} • Already uploaded
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
                                setPreviewUrl('');
                                setFormData(prev => ({ ...prev, mediaUrl: '' }));
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

                {/* Video Thumbnail Selection */}
                <AnimatePresence>
                  {formData.mediaType === 'video' && (
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
                                <NextImage
                                  src={getSafeImageSrc(formData.thumbnailUrl)}
                                  alt="Selected thumbnail" 
                                  width={64}
                                  height={48}
                                  className="w-12 h-9 sm:w-16 sm:h-12 object-cover rounded border"
                                />
                                <div className="flex-1">
                                  <p className="text-xs sm:text-sm font-medium">
                                    {availableThumbnails.find(t => t.path === formData.thumbnailUrl)?.name || 'Custom thumbnail'}
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

                        {/* Thumbnail Options */}
                        <div className="space-y-3">
                          <p className="text-xs sm:text-sm text-blue-700">Select from available thumbnails:</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                            {availableThumbnails.map((thumbnail, index) => (
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
                                <NextImage
                                  src={thumbnail.path} 
                                  alt={thumbnail.name}
                                  width={240}
                                  height={120}
                                  className="w-full h-16 sm:h-24 object-cover"
                                />
                                <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-20 transition-all" />
                                <div className="p-1 sm:p-2 bg-white">
                                  <p className="text-xs font-medium text-gray-800 truncate">
                                    {thumbnail.name}
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

                {/* Event Page Link */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.6 }}
                  className="space-y-2"
                >
                  <Label className="text-sm">Event Page Integration</Label>
                  
                  {/* Toggle for linking */}
                  <div className="flex items-center space-x-2 p-3 bg-pink-50 rounded-lg border border-pink-200">
                    <Switch
                      checked={!!formData.eventPageSlug}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          const slug = (formData.title_en || 'event-page')
                            .toLowerCase()
                            .replace(/[^\w\s-]/g, '')
                            .replace(/\s+/g, '-')
                            .trim();
                          setFormData(prev => ({ ...prev, eventPageSlug: slug || 'event-page' }));
                        } else {
                          setFormData(prev => ({ ...prev, eventPageSlug: '' }));
                        }
                      }}
                    />
                    <Label className="text-pink-800 font-medium text-sm">
                      Add &quot;Know More&quot; button that links to an event page
                    </Label>
                  </div>

                  {/* Slug input when enabled */}
                  <AnimatePresence>
                    {formData.eventPageSlug && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-3 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-green-800">Event Page Configuration</span>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="eventSlug" className="text-green-800 text-sm">Event Page Slug (URL)</Label>
                          <Input
                            id="eventSlug"
                            value={formData.eventPageSlug}
                            onChange={(e) => {
                              const slug = e.target.value
                                .toLowerCase()
                                .replace(/[^\w\s-]/g, '')
                                .replace(/\s+/g, '-')
                                .trim();
                              setFormData(prev => ({ ...prev, eventPageSlug: slug }));
                            }}
                            placeholder="my-event-name"
                            className="border-green-200 focus:border-green-400 text-sm"
                          />
                          <p className="text-xs text-green-600">
                            📍 Event page URL will be: <code className="bg-green-100 px-1 rounded text-xs">/events/{formData.eventPageSlug}</code>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 p-2 bg-white border border-green-200 rounded">
                          <span className="text-xs sm:text-sm text-green-700">
                            ✅ This post will show a &quot;Know More&quot; button → leads to event page
                          </span>
                        </div>

                        <div className="text-xs text-green-600 bg-white p-2 rounded border border-green-200">
                          💡 <strong>Next steps:</strong> After saving this post, go to Events tab and create the event page using this slug
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Help text when disabled */}
                  {!formData.eventPageSlug && (
                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
                      ℹ️ When enabled, this post will have a &quot;Know More&quot; button that links to a detailed event page
                    </div>
                  )}
                </motion.div>

                {/* Active Toggle */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.7 }}
                  className="flex items-center space-x-2"
                >
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label className="text-sm">Active Post</Label>
                </motion.div>

                {/* Action Buttons */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.8 }}
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
                      {uploadingFile ? 'Saving...' : 'Save Post'}
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

                {/* Preview Button in Form */}
                <AnimatePresence>
                  {formData.title_en && formData.mediaUrl && 
                   (formData.mediaType === 'image' || (formData.mediaType === 'video' && formData.thumbnailUrl)) && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="pt-4 border-t border-pink-200"
                    >
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className='cursor-pointer'
                        >
                          <Button
                            variant="outline"
                            onClick={() => {
                              const previewData: Post = {
                                id: editingId || 0,
                                title_en: formData.title_en || '',
                                description_en: formData.description_en || '',
                                mediaType: formData.mediaType || 'image',
                                mediaUrl: formData.mediaUrl || '',
                                thumbnailUrl: formData.thumbnailUrl,
                                eventPageSlug: formData.eventPageSlug,
                                isActive: formData.isActive || true,
                                order: formData.order || 0,
                              };
                              handlePreviewPost(previewData);
                            }}
                            className="border-blue-300 text-blue-700 hover:bg-blue-50 w-full sm:w-auto"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Preview This Post
                          </Button>
                        </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Draggable Posts List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="posts">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3 sm:space-y-4">
                {posts.map((post, index) => (
                  <Draggable key={post.id} draggableId={post.id!.toString()} index={index}>
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
                              <div className="flex  lg:items-start gap-3 lg:gap-4">
                              {/* Drag Handle */}
                              <div
                                {...provided.dragHandleProps}
                                className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 text-gray-400 hover:text-gray-600 cursor-grab mx-auto lg:mx-0"
                              >
                                <GripVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                              </div>

                              {/* Post Content */}
                              <div  className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded">
                                      #{post.order}
                                    </span>
                                    <h3 className="font-semibold text-pink-900 text-sm sm:text-base truncate">{post.title_en}</h3>
                                  </div>
                                  <div className="flex flex-wrap gap-1 sm:gap-2">
                                    <Badge variant={post.isActive ? "default" : "secondary"} className="bg-pink-100 text-pink-800 text-xs">
                                      {post.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                    <Badge variant="outline" className="border-pink-300 text-pink-700 text-xs">
                                      {post.mediaType}
                                    </Badge>
                                    {post.eventPageSlug && (
                                      <Badge variant="outline" className="border-blue-300 text-blue-700 text-xs">
                                        Links to: ../{post.eventPageSlug}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">{post.description_en}</p>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex flex-col gap-1 sm:gap-2 justify-center lg:justify-start">
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePreviewPost(post)}
                                    className="border-blue-300 text-blue-700 hover:bg-blue-50 p-2"
                                  >
                                    <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </Button>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(post)}
                                    className="border-pink-300 text-pink-700 hover:bg-pink-50 p-2"
                                  >
                                    <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </Button>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDeleteTarget(post)}
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
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </motion.div>
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteTarget?.title_en ? `"${deleteTarget.title_en}"` : 'this post'}.
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
