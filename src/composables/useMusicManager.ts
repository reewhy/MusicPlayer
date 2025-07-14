import { Song } from "@/types/common";
import { NativeAudio } from '@capacitor-community/native-audio';
import { getFilePath } from "@/utils/getFilePath";
import { isDownloaded } from "@/utils/isDownloaded";
import { useDabManager } from "@/composables/useDabManager";
import { ProgressStatus } from "@capacitor/filesystem";

interface MusicState {
    currentSong: Song | null;
    queue: Song[];
    currentIndex: number;
    isPlaying: boolean;
    isLoading: boolean;
    shuffle: boolean;
    repeat: 'none' | 'one' | 'all';
    originalQueue: Song[]; // For shuffle functionality
}

let state: ReturnType<typeof createMusicManager> | null = null;

function createMusicManager() {
    const { downloadSong } = useDabManager();

    const musicState: MusicState = {
        currentSong: null,
        queue: [],
        currentIndex: -1,
        isPlaying: false,
        isLoading: false,
        shuffle: false,
        repeat: 'none',
        originalQueue: []
    };

    const loadSong = async (song: Song): Promise<boolean> => {
        try {
            // Unload previous song if exists
            if (musicState.currentSong && musicState.currentSong.id !== song.id) {
                await NativeAudio.unload({ assetId: musicState.currentSong.id });
            }

            const filePath = await getFilePath(song);

            await NativeAudio.preload({
                assetId: song.id,
                assetPath: filePath,
                isUrl: true,
                audioChannelNum: 1
            });

            return true;
        } catch (error) {
            console.error("Error while preloading: ", error);
            return false;
        }
    };

    const downloadIfNeeded = async (song: Song, callback?: (progress: ProgressStatus) => void): Promise<boolean> => {
        try {
            if (!(await isDownloaded(song))) {
                if (callback) {
                    await downloadSong(song, callback);
                } else {
                    await downloadSong(song, () => {});
                }
            }
            return true;
        } catch (error) {
            console.error("Error while downloading: ", error);
            return false;
        }
    };

    const playSong = async (song: Song, callback?: (progress: ProgressStatus) => void): Promise<boolean> => {
        try {
            musicState.isLoading = true;

            // Download if needed
            const downloadSuccess = await downloadIfNeeded(song, callback);
            if (!downloadSuccess) {
                musicState.isLoading = false;
                return false;
            }

            // Load the song
            const loadSuccess = await loadSong(song);
            if (!loadSuccess) {
                musicState.isLoading = false;
                return false;
            }

            // Stop current song if playing
            if (musicState.isPlaying && musicState.currentSong) {
                await NativeAudio.stop({ assetId: musicState.currentSong.id });
            }

            // Play the song
            await NativeAudio.play({ assetId: song.id });

            musicState.currentSong = song;
            musicState.isPlaying = true;
            musicState.isLoading = false;

            return true;
        } catch (error) {
            console.error("Error while playing: ", error);
            musicState.isLoading = false;
            return false;
        }
    };

    const pauseSong = async (): Promise<boolean> => {
        try {
            if (musicState.currentSong && musicState.isPlaying) {
                await NativeAudio.pause({ assetId: musicState.currentSong.id });
                musicState.isPlaying = false;
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error while pausing: ", error);
            return false;
        }
    };

    const resumeSong = async (): Promise<boolean> => {
        try {
            if (musicState.currentSong && !musicState.isPlaying) {
                await NativeAudio.resume({ assetId: musicState.currentSong.id });
                musicState.isPlaying = true;
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error while resuming: ", error);
            return false;
        }
    };

    const stopSong = async (): Promise<boolean> => {
        try {
            if (musicState.currentSong) {
                await NativeAudio.stop({ assetId: musicState.currentSong.id });
                musicState.isPlaying = false;
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error while stopping: ", error);
            return false;
        }
    };

    // Queue Management Functions
    const setQueue = (songs: Song[], startIndex: number = 0) => {
        musicState.queue = [...songs];
        musicState.originalQueue = [...songs];
        musicState.currentIndex = startIndex;

        if (musicState.shuffle) {
            shuffleQueue();
        }
    };

    const addToQueue = (song: Song, position?: number) => {
        if (position !== undefined) {
            musicState.queue.splice(position, 0, song);
            musicState.originalQueue.splice(position, 0, song);
            if (position <= musicState.currentIndex) {
                musicState.currentIndex++;
            }
        } else {
            musicState.queue.push(song);
            musicState.originalQueue.push(song);
        }
    };

    const removeFromQueue = (index: number) => {
        if (index >= 0 && index < musicState.queue.length) {
            musicState.queue.splice(index, 1);
            const originalIndex = musicState.originalQueue.findIndex(s => s.id === musicState.queue[index]?.id);
            if (originalIndex !== -1) {
                musicState.originalQueue.splice(originalIndex, 1);
            }

            if (index < musicState.currentIndex) {
                musicState.currentIndex--;
            } else if (index === musicState.currentIndex) {
                // If current song is removed, stop playing
                stopSong();
                musicState.currentSong = null;
            }
        }
    };

    const clearQueue = async () => {
        await stopSong();
        musicState.queue = [];
        musicState.originalQueue = [];
        musicState.currentIndex = -1;
        musicState.currentSong = null;
    };

    const shuffleQueue = () => {
        if (musicState.queue.length <= 1) return;

        const currentSong = musicState.queue[musicState.currentIndex];
        const otherSongs = musicState.queue.filter((_, index) => index !== musicState.currentIndex);

        // Fisher-Yates shuffle
        for (let i = otherSongs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [otherSongs[i], otherSongs[j]] = [otherSongs[j], otherSongs[i]];
        }

        if (currentSong) {
            musicState.queue = [currentSong, ...otherSongs];
            musicState.currentIndex = 0;
        } else {
            musicState.queue = otherSongs;
        }
    };

    const toggleShuffle = () => {
        musicState.shuffle = !musicState.shuffle;

        if (musicState.shuffle) {
            shuffleQueue();
        } else {
            // Restore original order
            musicState.queue = [...musicState.originalQueue];
            if (musicState.currentSong) {
                musicState.currentIndex = musicState.queue.findIndex(s => s.id === musicState.currentSong!.id);
            }
        }
    };

    const setRepeat = (mode: 'none' | 'one' | 'all') => {
        musicState.repeat = mode;
    };

    const playNext = async (callback?: (progress: ProgressStatus) => void): Promise<boolean> => {
        if (musicState.queue.length === 0) return false;

        let nextIndex = musicState.currentIndex + 1;

        if (nextIndex >= musicState.queue.length) {
            if (musicState.repeat === 'all') {
                nextIndex = 0;
            } else {
                return false;
            }
        }

        musicState.currentIndex = nextIndex;
        const nextSong = musicState.queue[nextIndex];

        if (nextSong) {
            return await playSong(nextSong, callback);
        }

        return false;
    };

    const playPrevious = async (callback?: (progress: ProgressStatus) => void): Promise<boolean> => {
        if (musicState.queue.length === 0) return false;

        let prevIndex = musicState.currentIndex - 1;

        if (prevIndex < 0) {
            if (musicState.repeat === 'all') {
                prevIndex = musicState.queue.length - 1;
            } else {
                return false;
            }
        }

        musicState.currentIndex = prevIndex;
        const prevSong = musicState.queue[prevIndex];

        if (prevSong) {
            return await playSong(prevSong, callback);
        }

        return false;
    };

    const playFromQueue = async (index: number, callback?: (progress: ProgressStatus) => void): Promise<boolean> => {
        if (index >= 0 && index < musicState.queue.length) {
            musicState.currentIndex = index;
            const song = musicState.queue[index];
            return await playSong(song, callback);
        }
        return false;
    };

    const getState = () => ({ ...musicState });

    const getCurrentSong = () => musicState.currentSong;

    const getQueue = () => [...musicState.queue];

    const isCurrentlyPlaying = () => musicState.isPlaying;

    const isLoading = () => musicState.isLoading;

    // Handle song completion
    NativeAudio.addListener('complete', async (event: { assetId: string }) => {
        await NativeAudio.unload({ assetId: event.assetId });

        if (musicState.repeat === 'one' && musicState.currentSong) {
            // Replay the same song
            await playSong(musicState.currentSong);
        } else {
            // Play next song
            const success = await playNext();
            if (!success) {
                // End of queue reached
                musicState.isPlaying = false;
                musicState.currentSong = null;
            }
        }
    });

    return {
        // Playback controls
        playSong,
        pauseSong,
        resumeSong,
        stopSong,

        // Queue management
        setQueue,
        addToQueue,
        removeFromQueue,
        clearQueue,
        playNext,
        playPrevious,
        playFromQueue,

        // Settings
        toggleShuffle,
        setRepeat,

        // State getters
        getState,
        getCurrentSong,
        getQueue,
        isCurrentlyPlaying,
        isLoading
    };
}

export function useMusicManager() {
    if (!state) {
        state = createMusicManager();
    }
    return state;
}