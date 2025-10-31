
import React, { useState, useEffect } from 'react';
import { PhotoState, ActiveTab } from '../types';
import { generateHugImage, generateHugVideo } from '../services/geminiService';
import ImageUploader from './ImageUploader';
import ResultDisplay from './ResultDisplay';
import ApiKeySelector from './ApiKeySelector';

const TimelessEmbrace: React.FC = () => {
  const [childPhoto, setChildPhoto] = useState<PhotoState>({ file: null, preview: '', base64: '' });
  const [adultPhoto, setAdultPhoto] = useState<PhotoState>({ file: null, preview: '', base64: '' });
  const [activeTab, setActiveTab] = useState<ActiveTab>('image');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const keyStatus = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(keyStatus);
      }
    };
    if (activeTab === 'video') {
      checkApiKey();
    }
  }, [activeTab]);

  const handleFileSelect = (setter: React.Dispatch<React.SetStateAction<PhotoState>>) => (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter({
          file,
          preview: URL.createObjectURL(file),
          base64: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    } else {
      setter({ file: null, preview: '', base64: '' });
    }
  };

  const handleGenerateImage = async () => {
    if (!childPhoto.base64 || !adultPhoto.base64) {
      setError('Please upload both photos.');
      return;
    }
    setIsLoading(true);
    setLoadingMessage('Crafting your timeless moment... This may take a moment.');
    setError(null);
    setResultImage(null);
    setResultVideo(null);
    try {
      const imageUrl = await generateHugImage(childPhoto.base64, adultPhoto.base64);
      setResultImage(imageUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during image generation.';
      setError(errorMessage);
      if (errorMessage.includes("Requested entity was not found.")) {
          setHasApiKey(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!childPhoto.base64 || !adultPhoto.base64) {
      setError('Please upload both photos to generate the base image for the video.');
      return;
    }
    setIsLoading(true);
    setLoadingMessage('Animating your memory... This process can take a few minutes.');
    setError(null);
    setResultImage(null);
    setResultVideo(null);
    try {
      const videoUrl = await generateHugVideo(childPhoto.base64, adultPhoto.base64);
      setResultVideo(videoUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during video generation.';
      setError(errorMessage);
      if (errorMessage.includes("Requested entity was not found.")) {
          setHasApiKey(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isGenerateDisabled = !childPhoto.file || !adultPhoto.file || isLoading;

  return (
    <div>
      <p className="text-center text-lg md:text-xl mb-8 text-gray-600 dark:text-gray-400">
        Upload a childhood photo and a recent one to create a powerful image or video of your present self embracing your past.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <ImageUploader label="Your Childhood Photo" onFileSelect={handleFileSelect(setChildPhoto)} previewUrl={childPhoto.preview} />
        <ImageUploader label="Your Adult Photo" onFileSelect={handleFileSelect(setAdultPhoto)} previewUrl={adultPhoto.preview} />
      </div>
      
      <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl shadow-lg">
        <div className="flex justify-center border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-6">
                <button onClick={() => setActiveTab('image')} className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-base focus:outline-none ${activeTab === 'image' ? 'border-light-accent dark:border-dark-accent text-light-accent dark:text-dark-accent' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    Generate Image
                </button>
                <button onClick={() => setActiveTab('video')} className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-base focus:outline-none ${activeTab === 'video' ? 'border-light-accent dark:border-dark-accent text-light-accent dark:text-dark-accent' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    Generate Video
                </button>
            </nav>
        </div>

        {activeTab === 'image' && (
             <div className="text-center">
                <p className="mb-4">Create a beautiful, static image of the embrace.</p>
                <button
                    onClick={handleGenerateImage}
                    disabled={isGenerateDisabled}
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 px-8 rounded-full hover:opacity-90 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                >
                    {isLoading ? 'Generating...' : 'Generate Image'}
                </button>
            </div>
        )}

        {activeTab === 'video' && (
            <div className="text-center">
                <p className="mb-4">Bring the moment to life with a short, subtle animation.</p>
                {hasApiKey ? (
                    <button
                        onClick={handleGenerateVideo}
                        disabled={isGenerateDisabled}
                        className="bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-3 px-8 rounded-full hover:opacity-90 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                    >
                        {isLoading ? 'Generating...' : 'Generate Video'}
                    </button>
                ) : (
                    <ApiKeySelector onKeySelected={() => setHasApiKey(true)} />
                )}
            </div>
        )}
      </div>

      {error && <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mt-6 text-center" role="alert">
        <span className="block sm:inline">{error}</span>
      </div>}
      
      <ResultDisplay 
        isLoading={isLoading} 
        loadingMessage={loadingMessage} 
        imageUrls={resultImage ? [resultImage] : null} 
        videoUrl={resultVideo}
        title="Your Timeless Embrace" 
      />
    </div>
  );
};

export default TimelessEmbrace;
