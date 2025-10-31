
import React, { useCallback, useState } from 'react';

interface ImageUploaderProps {
  label: string;
  onFileSelect: (file: File | null) => void;
  previewUrl: string;
}

const UploadIcon = () => (
    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);


const ImageUploader: React.FC<ImageUploaderProps> = ({ label, onFileSelect, previewUrl }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };


  return (
    <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl shadow-lg">
      <h3 className="text-xl font-semibold text-center mb-4">{label}</h3>
      <label
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative flex justify-center w-full h-64 px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md cursor-pointer hover:border-light-accent dark:hover:border-dark-accent transition-colors duration-200 ${isDragging ? 'border-light-accent dark:border-dark-accent' : ''}`}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Preview" className="object-contain h-full w-full rounded-md" />
        ) : (
          <div className="space-y-1 text-center self-center">
            <UploadIcon />
            <div className="flex text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-light-accent dark:text-dark-accent">Upload a file</span>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500">PNG, JPG up to 10MB</p>
          </div>
        )}
        <input id={`file-upload-${label}`} name={`file-upload-${label}`} type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg" />
      </label>
    </div>
  );
};

export default ImageUploader;
