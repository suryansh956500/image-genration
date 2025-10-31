
// FIX: The original file contained raw HTML instead of a React component.
// It has been replaced with a proper ResultDisplay component to resolve all TypeScript and module errors.
// This component handles loading states and displays generated images or videos.
import React from 'react';
import Loader from './Loader';

interface ResultDisplayProps {
  isLoading: boolean;
  loadingMessage: string;
  imageUrls: string[] | null;
  videoUrl: string | null;
  title: string;
}

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const ResultDisplay: React.FC<ResultDisplayProps> = ({ isLoading, loadingMessage, imageUrls, videoUrl, title }) => {
  if (isLoading) {
    return (
      <div className="mt-10 bg-light-card dark:bg-dark-card p-6 rounded-2xl shadow-lg text-center animate-fade-in">
        <Loader />
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">{loadingMessage}</p>
      </div>
    );
  }

  if (!imageUrls && !videoUrl) {
    return null;
  }

  return (
    <div className="mt-10 bg-light-card dark:bg-dark-card p-6 rounded-2xl shadow-lg animate-fade-in">
      <h3 className="text-2xl font-semibold text-center mb-6">{title}</h3>
      {videoUrl && (
        <div className="flex justify-center">
          <video src={videoUrl} controls autoPlay loop className="max-w-full h-auto rounded-lg shadow-md" />
        </div>
      )}
      {imageUrls && (
        <div className={`grid gap-4 ${imageUrls.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
          {imageUrls.map((url, index) => (
            <div key={index} className="relative group flex justify-center overflow-hidden rounded-lg shadow-md">
                <img 
                    src={url} 
                    alt={`Generated result ${index + 1}`} 
                    className="max-w-full h-auto transition-transform duration-300 ease-in-out group-hover:scale-105" 
                />
                <a
                    href={url}
                    download={`gemini-image-${Date.now()}-${index}.png`}
                    className="absolute bottom-4 bg-black/60 text-white font-bold py-2 px-4 rounded-full flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                    <DownloadIcon />
                    Save Image
                </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResultDisplay;
