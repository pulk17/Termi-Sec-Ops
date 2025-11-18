"use client";

import { useEffect } from 'react';

export function AppInitializer() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    let cleanup: (() => void) | undefined;

    const initializeApp = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const { AppInitializationService } = await import('@/lib/app-initialization');
        await AppInitializationService.initialize();

        cleanup = () => {
          AppInitializationService.cleanup();
        };
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  return null; // This component doesn't render anything
}