/**
 * Hook for managing Spotify Web Playback SDK
 */

import { useEffect, useState } from "react";
import { initializeSpotifySDK, createSpotifyPlayer } from "@/services/spotify";

export function useSpotifyPlayer(accessToken?: string) {
  const [player, setPlayer] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize SDK on mount
  useEffect(() => {
    initializeSpotifySDK().then(() => {
      console.log("SDK initialized");
    });
  }, []);

  // Create player when access token is available
  useEffect(() => {
    if (!accessToken || !window.Spotify) return;

    try {
      const newPlayer = createSpotifyPlayer(accessToken);

      newPlayer.addListener("player_state_changed", (state: any) => {
        if (state) {
          setIsPlaying(!state.paused);
        }
      });

      newPlayer.addListener("ready", ({ device_id }: any) => {
        console.log("Player ready with device ID:", device_id);
        setDeviceId(device_id);
        setIsReady(true);
      });

      newPlayer.connect();
      setPlayer(newPlayer);

      return () => {
        newPlayer.disconnect();
      };
    } catch (error) {
      console.error("Failed to create player:", error);
    }
  }, [accessToken]);

  const play = async (spotifyUri: string) => {
    if (!player || !deviceId) {
      console.error("Player not ready");
      return;
    }

    try {
      await player.play({
        context_uri: null,
        uris: [spotifyUri],
        offset: { position: 0 },
      });
    } catch (error) {
      console.error("Failed to play:", error);
    }
  };

  const pause = async () => {
    if (!player) return;
    try {
      await player.pause();
    } catch (error) {
      console.error("Failed to pause:", error);
    }
  };

  return {
    player,
    isReady,
    deviceId,
    isPlaying,
    play,
    pause,
  };
}
