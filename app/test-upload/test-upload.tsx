'use client';

import { useState, useRef } from 'react';
import { upload, type UploadResponse } from '@imagekit/next';
import Image from 'next/image';

async function authenticator() {
  try {
    const response = await fetch('/api/upload-auth');
    if (!response.ok) {
      throw new Error(`Auth failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

export default function TestUpload() {
  const [uploadStatus, setUploadStatus] = useState<string>('Ready to upload');
  const [uploadedFile, setUploadedFile] = useState<UploadResponse | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    const fileInput = fileInputRef.current;
    if (!fileInput?.files?.[0]) {
      alert('Please select a file first');
      return;
    }

    const file = fileInput.files[0];
    setUploadStatus('Authenticating...');
    setProgress(0);

    try {
      // Get auth parameters
      const { token, expire, signature, publicKey } = await authenticator();
      
      setUploadStatus('Uploading...');

      // Upload the file
      const uploadResponse = await upload({
        file,
        fileName: `test-${Date.now()}-${file.name}`,
        token,
        expire,
        signature,
        publicKey,
        folder: '/test-uploads', // Organize in folders
        useUniqueFileName: true,
        onProgress: (event) => {
          const percentage = (event.loaded / event.total) * 100;
          setProgress(percentage);
          setUploadStatus(`Uploading... ${Math.round(percentage)}%`);
        },
      });

      console.log('Upload Success:', uploadResponse);
      setUploadedFile(uploadResponse);
      setUploadStatus('Upload successful!');

      // Log detailed info to check storage location
      console.log('🔍 Upload Analysis:', {
        url: uploadResponse.url,
        fileId: uploadResponse.fileId,
        name: uploadResponse.name,
        filePath: uploadResponse.filePath,
        size: uploadResponse.size,
        fileType: uploadResponse.fileType,
        height: uploadResponse.height,
        width: uploadResponse.width,
        thumbnailUrl: uploadResponse.thumbnailUrl,
        AITags: uploadResponse.AITags,
      });

    } catch (error) {
      console.error('Upload failed:', error);
      setUploadStatus(`Upload failed: ${error}`);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">ImageKit Upload Test</h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="test-upload-file" className="block text-sm font-medium mb-2">Select File:</label>
          <input 
            id="test-upload-file"
            type="file" 
            ref={fileInputRef}
            className="w-full p-2 border border-gray-300 rounded"
            accept="image/*,video/*"
          />
        </div>

        <button 
          type="button"
          onClick={handleUpload}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          Upload File
        </button>

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Status: {uploadStatus}</p>
          {progress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
        </div>

        {uploadedFile && (
          <div className="mt-4 p-4 bg-gray-50 rounded border">
            <h3 className="font-bold mb-2">Upload Results:</h3>
            <div className="text-xs space-y-1">
              <p><strong>URL:</strong> <span className="break-all">{uploadedFile.url}</span></p>
              <p><strong>File ID:</strong> {uploadedFile.fileId}</p>
              <p><strong>File Path:</strong> {uploadedFile.filePath}</p>
              <p><strong>Size:</strong> {uploadedFile.size} bytes</p>
              <p><strong>Type:</strong> {uploadedFile.fileType}</p>
            </div>
            
            {uploadedFile.url && uploadedFile.fileType?.startsWith('image') && (
              <Image
                src={uploadedFile.url} 
                alt="Uploaded file" 
                width={480}
                height={320}
                className="mt-2 max-w-full h-auto rounded"
              />
            )}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-yellow-50 rounded border">
        <h4 className="font-bold text-sm">What to check:</h4>
        <ul className="text-xs mt-1 space-y-1">
          <li>• Check browser console for detailed upload info</li>
          <li>• Check your ImageKit Dashboard → Media Library</li>
          <li>• Check your AWS S3 console (if configured)</li>
          <li>• Note the URL pattern in the result</li>
        </ul>
      </div>
    </div>
  );
}
