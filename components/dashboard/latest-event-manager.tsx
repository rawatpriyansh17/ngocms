'use client';

import { useEffect, useState } from 'react';
import { upload } from '@imagekit/next';
import Image from 'next/image';
import { motion } from 'motion/react';
import { CalendarDays, ImageIcon, Loader2, Save, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone';

interface LatestEvent {
  id: number;
  imageUrl: string;
  imageAlt: string;
  isActive: boolean;
}

const uploadLatestEventImage = async (file: File): Promise<string> => {
  const authResponse = await fetch('/api/upload-auth');
  const { token, expire, signature, publicKey } = await authResponse.json();

  const uploadResponse = await upload({
    file,
    fileName: `latest-event-${Date.now()}-${file.name}`,
    token,
    expire,
    signature,
    publicKey,
    folder: '/latest-event',
    useUniqueFileName: true,
  });

  if (!uploadResponse.url) {
    throw new Error('Upload did not return a URL.');
  }

  return uploadResponse.url;
};

export default function LatestEventManager() {
  const [latestEvent, setLatestEvent] = useState<LatestEvent>({
    id: 1,
    imageUrl: '',
    imageAlt: 'Upcoming program flyer',
    isActive: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchLatestEvent = async () => {
    try {
      const response = await fetch('/api/latest-event');
      if (!response.ok) {
        throw new Error('Failed to fetch latest event settings');
      }

      const data = await response.json();
      setLatestEvent({
        id: data.id ?? 1,
        imageUrl: data.imageUrl ?? '',
        imageAlt: data.imageAlt ?? 'Upcoming program flyer',
        isActive: Boolean(data.isActive),
      });
    } catch (error) {
      console.error('Failed to fetch latest event:', error);
      toast.error('Could not load latest event settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLatestEvent();
  }, []);

  const handleFileDrop = (files: File[]) => {
    const file = files[0];
    if (!file) return;

    if (previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      let imageUrl = latestEvent.imageUrl;
      if (selectedFile) {
        imageUrl = await uploadLatestEventImage(selectedFile);
      }

      const response = await fetch('/api/latest-event', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          imageAlt: latestEvent.imageAlt,
          isActive: latestEvent.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save latest event settings');
      }

      const saved = await response.json();
      setLatestEvent({
        id: saved.id,
        imageUrl: saved.imageUrl ?? '',
        imageAlt: saved.imageAlt ?? 'Upcoming program flyer',
        isActive: Boolean(saved.isActive),
      });
      removeSelectedFile();
      toast.success('Latest event settings saved.');
    } catch (error) {
      console.error('Failed to save latest event:', error);
      toast.error('Could not save latest event settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex h-64 items-center justify-center"
      >
        <Loader2 className="size-8 animate-spin text-pink-600" />
      </motion.div>
    );
  }

  const displayImage = previewUrl || latestEvent.imageUrl;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl font-bold text-pink-900 sm:text-2xl">Latest Event</h2>
        <p className="text-sm text-pink-700 sm:text-base">
          Manage the flyer shown on the public Upcoming Programs page.
        </p>
      </div>

      <Card className="border-pink-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-pink-900">
            <CalendarDays className="size-5" />
            Upcoming Program Flyer
          </CardTitle>
          <CardDescription>
            Upload one image and choose whether it should be shown on the website.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">

          <div className="rounded-xl border border-pink-100 bg-white p-3 shadow-sm">
            {displayImage ? (
              <Image
                src={displayImage}
                alt={latestEvent.imageAlt || 'Upcoming program flyer preview'}
                width={720}
                height={480}
                className="h-auto w-full rounded-lg object-contain"
              />
            ) : (
              <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-lg bg-pink-50 text-center text-pink-700">
                <ImageIcon className="mb-2 size-10" />
                <p className="font-semibold">No flyer uploaded yet</p>
                <p className="text-xs">Upload an image to preview it here.</p>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <Dropzone
              accept={{ 'image/*': [] }}
              maxFiles={1}
              maxSize={10 * 1024 * 1024}
              src={selectedFile ? [selectedFile] : undefined}
              onDrop={handleFileDrop}
              disabled={saving}
              className="border-pink-200 hover:border-pink-400"
            >
              <DropzoneEmptyState>
                <div className="flex flex-col items-center justify-center">
                  <UploadCloud className="mb-2 size-8 text-pink-600" />
                  <p className="font-medium text-sm">Upload latest event flyer</p>
                  <p className="text-muted-foreground text-xs">PNG, JPG, or WebP up to 10MB</p>
                </div>
              </DropzoneEmptyState>
              <DropzoneContent />
            </Dropzone>

            {selectedFile && (
              <Button
                type="button"
                variant="outline"
                onClick={removeSelectedFile}
                className="border-pink-200 text-white bg-red-600 hover:bg-pink-50"
              >
                <X className="mr-2 size-4" />
                Remove 
              </Button>
            )}

            <div className="space-y-2">
              <Label htmlFor="latest-event-alt">Image alt text</Label>
              <Input
                id="latest-event-alt"
                value={latestEvent.imageAlt}
                onChange={(event) =>
                  setLatestEvent((current) => ({ ...current, imageAlt: event.target.value }))
                }
                placeholder="Upcoming program flyer"
                className="border-pink-200 focus:border-pink-400"
              />
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-pink-100 bg-pink-50 p-3">
              <Switch
                checked={latestEvent.isActive}
                onCheckedChange={(checked) =>
                  setLatestEvent((current) => ({ ...current, isActive: checked }))
                }
              />
              <div>
                <Label className="text-sm font-semibold text-pink-900">Show on public site</Label>
                <p className="text-xs text-pink-700">
                  If disabled, website will show a no-upcoming-event message.
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-pink-600 text-white hover:bg-pink-700"
            >
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              {saving ? 'Saving...' : 'Save Latest Event'}
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
