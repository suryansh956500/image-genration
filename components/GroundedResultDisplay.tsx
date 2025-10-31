import React from 'react';
import { GenerateContentResponse } from '@google/genai';

interface GroundedResultDisplayProps {
    result: GenerateContentResponse;
}

const GroundedResultDisplay: React.FC<GroundedResultDisplayProps> = ({ result }) => {
    const text = result.text;
    const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return (
        <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl shadow-lg animate-fade-in">
            <div 
                className="prose dark:prose-invert max-w-none" 
                dangerouslySetInnerHTML={{ __html: window.marked.parse(text) }}
            />

            {groundingChunks.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-lg mb-2">Sources:</h4>
                    <ul className="list-disc list-inside space-y-1">
                        {groundingChunks.map((chunk, index) => {
                            const source = chunk.web || chunk.maps;
                            if (!source || !source.uri) return null;
                            return (
                                <li key={index}>
                                    <a 
                                        href={source.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:underline"
                                    >
                                        {source.title || source.uri}
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default GroundedResultDisplay;
