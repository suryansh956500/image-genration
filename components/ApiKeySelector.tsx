
import React from 'react';

interface ApiKeySelectorProps {
    onKeySelected: () => void;
}

const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onKeySelected }) => {
    
    const handleSelectKey = async () => {
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            await window.aistudio.openSelectKey();
            // Optimistically assume key was selected to enable the generate button
            onKeySelected();
        } else {
            console.error('aistudio.openSelectKey() is not available.');
            alert('API key selection is not available in this environment.');
        }
    };
    
    return (
        <div className="bg-indigo-100 dark:bg-indigo-900/30 border-l-4 border-indigo-500 dark:border-indigo-400 text-indigo-700 dark:text-indigo-200 p-4 rounded-lg" role="alert">
            <p className="font-bold">API Key Required for Video</p>
            <p className="text-sm mb-3">Video generation with Veo requires you to select an API key. This may incur costs.</p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <button
                    onClick={handleSelectKey}
                    className="bg-indigo-500 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-600 transition-colors w-full sm:w-auto"
                >
                    Select API Key
                </button>
                <a 
                    href="https://ai.google.dev/gemini-api/docs/billing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-600 dark:text-indigo-300 hover:underline"
                >
                    Learn about billing
                </a>
            </div>
        </div>
    );
};

export default ApiKeySelector;
