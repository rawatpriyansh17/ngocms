import TestUpload from '@/app/test-upload/test-upload';
import ImageKitContextProvider from '@/components/imagekit-provider';

export default function TestUploadPage() {
  return (
    <ImageKitContextProvider>
      <div className="min-h-screen bg-gray-100 py-12">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">
            ImageKit Storage Test
          </h1>
          <TestUpload />
        </div>
      </div>
    </ImageKitContextProvider>
  );
}