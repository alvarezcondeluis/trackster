/**
 * Hook to monitor Spotify SDK preloading state
 * Use this in components to know when SDK is ready
 */

import { useEffect, useState } from "react";
import {
  getPreloadState,
  subscribeToPreload,
  waitForSdk,
} from "@/services/sdkPreloader";

interface UseSdkPreloadReturn {
  isLoading: boolean;
  isReady: boolean;
  error: Error | null;
  waitForReady: () => Promise<void>;
}

export function useSdkPreload(): UseSdkPreloadReturn {
  const [state, setState] = useState(() => getPreloadState());

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = subscribeToPreload(() => {
      setState(getPreloadState());
    });

    return unsubscribe;
  }, []);

  return {
    isLoading: state.isLoading,
    isReady: state.isLoaded,
    error: state.error,
    waitForReady: waitForSdk,
  };
}
