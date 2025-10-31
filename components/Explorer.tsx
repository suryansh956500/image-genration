import React, { useState, useEffect } from 'react';
import { GenerateContentResponse } from '@google/genai';
import { groundedSearch } from '../services/geminiService';
import GroundedResultDisplay from './GroundedResultDisplay';
import Loader from './Loader';

const WebIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9V3m0 18a9 9 0 009-9M3 12a9 9 0 019-9m0 18a9 9 0 00-9-9m9-9h9" />
    </svg>
);

const MapIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

export default function Explorer() {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<GenerateContentResponse | null>(null);
    const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            () => {
                console.warn("Could not get user location. 'Nearby' searches may be less accurate.");
            }
        );
    }, []);

    const handleSearch = async (tool: 'googleSearch' | 'googleMaps') => {
        if (!prompt) {
            setError('Please enter a question.');
            return;
        }
        if (tool === 'googleMaps' && !userLocation) {
            setError("Could not get your location. Please enable location services to use Maps search.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await groundedSearch(prompt, tool, userLocation);
            setResult(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <p className="text-center text-lg md:text-xl mb-8 text-gray-600 dark:text-gray-400">
                Ask questions and get up-to-date answers grounded in Google Search and Maps.
            </p>

            <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl shadow-lg">
                <div className="flex flex-col gap-4">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ask anything... e.g., Who won the most medals in the last Olympics? or What are some good cafes near me?"
                        className="w-full px-5 py-3 bg-light-bg dark:bg-dark-bg border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent transition-colors"
                        rows={3}
                    />
                    <div className="flex flex-col md:flex-row gap-4">
                        <button onClick={() => handleSearch('googleSearch')} disabled={isLoading} className="flex-1 flex items-center justify-center bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 px-6 rounded-full hover:opacity-90 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100">
                            <WebIcon />
                            Search Web
                        </button>
                        <button onClick={() => handleSearch('googleMaps')} disabled={isLoading || !userLocation} className="flex-1 flex items-center justify-center bg-green-500 text-white font-bold py-3 px-6 rounded-full hover:bg-green-600 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100">
                            <MapIcon />
                            Search Maps
                        </button>
                    </div>
                </div>
            </div>

            {error && <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mt-6 text-center" role="alert">
                <span className="block sm:inline">{error}</span>
            </div>}

            <div className="mt-8">
                {isLoading ? (
                    <div className="text-center">
                        <Loader />
                        <p className="mt-2">Searching...</p>
                    </div>
                ) : (
                    result && <GroundedResultDisplay result={result} />
                )}
            </div>
        </div>
    );
}