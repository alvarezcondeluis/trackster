/**
 * Minimal ambient types for the Spotify Web Playback SDK global namespace.
 * Covers the surface we actually use in spotifyWebSdk.ts. For the full types,
 * `npm i -D @types/spotify-web-playback-sdk` and delete this file.
 */
declare namespace Spotify {
  interface Player {
    connect(): Promise<boolean>;
    disconnect(): void;
    addListener(event: string, cb: (arg: any) => void): boolean;
    removeListener(event: string): boolean;
    getCurrentState(): Promise<any>;
    setName(name: string): Promise<void>;
    getVolume(): Promise<number>;
    setVolume(volume: number): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    togglePlay(): Promise<void>;
    seek(positionMs: number): Promise<void>;
    previousTrack(): Promise<void>;
    nextTrack(): Promise<void>;
  }
}
