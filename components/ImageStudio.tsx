
import React, { useState, useEffect, useRef } from 'react';
import { PhotoState } from '../types';
import { generateImageWithImagen, editImage } from '../services/geminiService';
import ImageUploader from './ImageUploader';
import ResultDisplay from './ResultDisplay';

type StudioTab = 'generate' | 'edit';

interface ImageStudioProps {
  commandedPrompt: string | null;
  onCommandExecuted: () => void;
}

const ImageStudio: React.FC<ImageStudioProps> = ({ commandedPrompt, onCommandExecuted }) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('generate');
  const [prompt, setPrompt] = useState('');
  const [editImageState, setEditImageState] = useState<PhotoState>({ file: null, preview: '', base64: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[] | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isCompareMode, setIsCompareMode] = useState(false);

  // State for zoom and pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const startPanPointRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (commandedPrompt) {
      setPrompt(commandedPrompt);
      setActiveTab('generate');
      // Use a timeout to allow state to update before triggering generation
      setTimeout(() => {
        handleGenerate();
        onCommandExecuted();
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commandedPrompt]);
  
  // Reset zoom and pan when the image to be edited changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [editImageState.preview]);

  const handleFileSelect = (file: File | null) => {
    setIsCompareMode(false);
    setEditedImage(null);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImageState({
          file,
          preview: URL.createObjectURL(file),
          base64: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    } else {
      setEditImageState({ file: null, preview: '', base64: '' });
    }
  };

  const handleGenerate = async () => {
    if (!prompt) {
      setError('Please enter a prompt to generate an image.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImages(null);
    setEditedImage(null);
    try {
      const images = await generateImageWithImagen(prompt);
      setGeneratedImages(images);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editImageState.base64) {
        setError('Please upload an image to edit.');
        return;
    }
    if (!prompt) {
      setError('Please enter a prompt to describe your edit.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImages(null);
    setEditedImage(null);
    setIsCompareMode(false);
    try {
      const image = await editImage(editImageState.base64, prompt);
      setEditedImage(image);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTabChange = (tab: StudioTab) => {
    setActiveTab(tab);
    setError(null);
    setPrompt('');
    setGeneratedImages(null);
    setEditedImage(null);
    setIsCompareMode(false);
  };
  
  // Handlers for zoom and pan
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 1));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsPanning(true);
    startPanPointRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    e.preventDefault();
    const newX = e.clientX - startPanPointRef.current.x;
    const newY = e.clientY - startPanPointRef.current.y;
    setPan({ x: newX, y: newY });
  };

  const handleMouseUpOrLeave = () => {
    setIsPanning(false);
  };
  
  const ZoomControls = ({ onZoomIn, onZoomOut, onReset }: { onZoomIn: () => void; onZoomOut: () => void; onReset: () => void; }) => (
    <div className="absolute top-2 right-2 z-10 bg-black/50 rounded-lg p-1 flex flex-col space-y-1">
      <button onClick={onZoomIn} className="text-white h-8 w-8 text-xl font-bold flex items-center justify-center hover:bg-white/20 rounded-md transition-colors" title="Zoom In">+</button>
      <button onClick={onZoomOut} className="text-white h-8 w-8 text-xl font-bold flex items-center justify-center hover:bg-white/20 rounded-md transition-colors" title="Zoom Out">-</button>
      <button onClick={onReset} className="text-white h-8 w-8 flex items-center justify-center hover:bg-white/20 rounded-md transition-colors" title="Reset Zoom">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l16 16" /></svg>
      </button>
    </div>
  );

  return (
    <div>
      <p className="text-center text-lg md:text-xl mb-8 text-gray-600 dark:text-gray-400">
        Unleash your creativity. Generate stunning visuals from text or edit your existing images with AI.
      </p>

      <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl shadow-lg">
        <div className="flex justify-center border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-6">
                <button onClick={() => handleTabChange('generate')} className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-base focus:outline-none ${activeTab === 'generate' ? 'border-light-accent dark:border-dark-accent text-light-accent dark:text-dark-accent' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    Generate
                </button>
                <button onClick={() => handleTabChange('edit')} className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-base focus:outline-none ${activeTab === 'edit' ? 'border-light-accent dark:border-dark-accent text-light-accent dark:text-dark-accent' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    Edit
                </button>
            </nav>
        </div>

        {activeTab === 'edit' && (
            <div className="mb-6">
                 <ImageUploader label="Upload Image to Edit" onFileSelect={handleFileSelect} previewUrl={editImageState.preview} />
                 {editImageState.preview && !editedImage && (
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold text-center mb-2">Zoom & Pan Image</h3>
                        <div 
                            className="relative w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUpOrLeave}
                            onMouseLeave={handleMouseUpOrLeave}
                        >
                            <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleResetZoom} />
                            <div 
                                style={{ 
                                    transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                                    cursor: isPanning ? 'grabbing' : (zoom > 1 ? 'grab' : 'default'),
                                }}
                                className="w-full h-full flex items-center justify-center transition-transform duration-100"
                            >
                                <img
                                    src={editImageState.preview}
                                    alt="Image to edit"
                                    className="max-w-full max-h-full object-contain pointer-events-none"
                                />
                            </div>
                        </div>
                    </div>
                 )}
            </div>
        )}

        <div className="flex flex-col gap-4">
             <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={activeTab === 'generate' ? "e.g., A photorealistic portrait of a cat wearing a tiny wizard hat" : "e.g., Make the background a futuristic city"}
                className="w-full px-5 py-3 bg-light-bg dark:bg-dark-bg border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent transition-colors"
                rows={3}
            />
            <button 
                onClick={activeTab === 'generate' ? handleGenerate : handleEdit} 
                disabled={isLoading}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 px-6 rounded-full hover:opacity-90 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            >
                {isLoading ? 'Working...' : activeTab === 'generate' ? 'Generate' : 'Apply Edit'}
            </button>
        </div>
      </div>
      
      {error && <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mt-6 text-center" role="alert">
        <span className="block sm:inline">{error}</span>
      </div>}

      {isCompareMode && activeTab === 'edit' && editedImage && editImageState.preview ? (
          <div className="mt-10 bg-light-card dark:bg-dark-card p-6 rounded-2xl shadow-lg animate-fade-in">
              <h3 className="text-2xl font-semibold text-center mb-6">Side-by-Side Comparison</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-center">
                      <h4 className="font-bold mb-2">Original</h4>
                      <img src={editImageState.preview} alt="Original" className="rounded-lg shadow-md mx-auto max-h-96" />
                  </div>
                  <div className="text-center">
                      <h4 className="font-bold mb-2">Edited</h4>
                      <img src={editedImage} alt="Edited" className="rounded-lg shadow-md mx-auto max-h-96" />
                  </div>
              </div>
              <div className="text-center mt-6">
                  <button onClick={() => setIsCompareMode(false)} className="bg-gray-500 text-white font-bold py-2 px-6 rounded-full hover:bg-gray-600 transition-colors">
                      Close Comparison
                  </button>
              </div>
          </div>
      ) : (
        <>
            {(!isLoading && (generatedImages || editedImage)) && (
                 <div className="mt-4 text-center">
                    {activeTab === 'edit' && editedImage && (
                        <button 
                            onClick={() => setIsCompareMode(true)} 
                            className="mb-4 bg-blue-500 text-white font-bold py-2 px-6 rounded-full hover:bg-blue-600 transition-colors"
                        >
                           Compare with Original
                        </button>
                    )}
                 </div>
            )}
            <ResultDisplay
                isLoading={isLoading}
                loadingMessage={activeTab === 'generate' ? "Generating images..." : "Applying your edit..."}
                imageUrls={generatedImages || (editedImage ? [editedImage] : null)}
                videoUrl={null}
                title={activeTab === 'generate' ? "Generated Images" : "Edited Image"}
            />
        </>
      )}
    </div>
  );
};

export default ImageStudio;
