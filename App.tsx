
import React, { useState, useEffect } from 'react';
import { Theme, MainTab } from './types';
import Header from './components/Header';
import TimelessEmbrace from './components/TimelessEmbrace';
import ImageStudio from './components/ImageStudio';
import AICompanion from './components/AICompanion';
import Explorer from './components/Explorer';
import GlobalVoiceAssistant from './components/GlobalVoiceAssistant';

const tabConfig = {
    timeless: { title: 'Timeless Embrace', component: TimelessEmbrace },
    studio: { title: 'Image Studio', component: ImageStudio },
    companion: { title: 'AI Companion', component: AICompanion },
    explorer: { title: 'Explorer', component: Explorer },
};

export default function App() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [activeTab, setActiveTab] = useState<MainTab>('timeless');
  const [imageGenerationCommand, setImageGenerationCommand] = useState<string | null>(null);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const handleNavigate = (tab: MainTab) => {
    if (Object.keys(tabConfig).includes(tab)) {
      setActiveTab(tab);
    }
  };

  const handleGenerateImage = (prompt: string) => {
    setActiveTab('studio');
    setImageGenerationCommand(prompt);
  };
  
  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text transition-colors duration-300 font-sans">
      <Header theme={theme} setTheme={setTheme} />
      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
            <div className="mb-8 border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {Object.keys(tabConfig).map((tabKey) => (
                        <button
                            key={tabKey}
                            onClick={() => setActiveTab(tabKey as MainTab)}
                            className={`whitespace-nowrap py-4 px-2 border-b-2 font-medium text-lg focus:outline-none transition-all duration-300 transform hover:-translate-y-0.5 ${
                                activeTab === tabKey
                                ? 'border-light-accent dark:border-dark-accent text-light-accent dark:text-dark-accent'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                        >
                            {tabConfig[tabKey as MainTab].title}
                        </button>
                    ))}
                </nav>
            </div>
            
            {/* FIX: Replaced the dynamic component logic that caused a TypeScript error. This new explicit conditional rendering ensures the `ImageStudio` component always receives its required props, while other components are rendered correctly without them. */}
            {(() => {
                switch (activeTab) {
                    case 'timeless':
                        return <TimelessEmbrace />;
                    case 'studio':
                        return <ImageStudio 
                                    commandedPrompt={imageGenerationCommand}
                                    onCommandExecuted={() => setImageGenerationCommand(null)}
                                />;
                    case 'companion':
                        return <AICompanion />;
                    case 'explorer':
                        return <Explorer />;
                    default:
                        return null;
                }
            })()}
        </div>
      </main>
      <GlobalVoiceAssistant 
        onNavigate={handleNavigate}
        onGenerateImage={handleGenerateImage}
      />
    </div>
  );
}
