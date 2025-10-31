export type Theme = 'light' | 'dark';

export type ActiveTab = 'image' | 'video'; // For TimelessEmbrace component
export type MainTab = 'timeless' | 'studio' | 'companion' | 'explorer';

export interface PhotoState {
  file: File | null;
  preview: string;
  base64: string;
}

declare global {
  // FIX: Define AIStudio as a global interface to be merged with other definitions, resolving conflicts.
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  // FIX: Declare aistudio as a global variable to avoid modifier conflicts with other declarations.
  var aistudio: AIStudio;

  interface Window {
    // aistudio is now available globally, and thus on the window object.
    marked: {
      parse: (markdownString: string) => string;
    };
  }
}
