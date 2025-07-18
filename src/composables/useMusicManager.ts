import { Song } from "@/types/common";
import { AudioPlayer } from "@mediagrid/capacitor-native-audio";
import {getFilePath, getImagePath} from "@/utils/getFilePath";
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
        originalQueue: [],
    };

    // Working
    const loadSong = async (song: Song): Promise<boolean> => {
        try {
            // Destroy previous song if exists
            if (musicState.currentSong && musicState.currentSong.id !== song.id) {
                try {
                    await AudioPlayer.destroy({ audioId: musicState.currentSong.id });
                } catch (error) {
                    console.warn("Error destroying previous song:", error);
                }
            }

            const filePath = new URL(await getFilePath(song) || '', import.meta.url).href;
            // Create the audio source with proper error handling
            await AudioPlayer.create({
                    audioSource: filePath,
                    audioId: song.id || 0,
                    friendlyTitle: song.title || 'Unknown Title',
                    artistName: song.artist || 'Unknown Artist',
                    albumTitle: song.albumTitle || 'Unknown Album',
                    artworkSource: await getImagePath(song) || song.images?.large || undefined,
                    useForNotification: true,
                    isBackgroundMusic: false,
                    loop: false,
                    showSeekForward: true,
                    showSeekBackward: true,
                }).catch(err => console.error("Error while creating audio: ", err))

            // Check if createResult is valid
            // if (!createResult || typeof createResult !== 'object') {
            //     console.error("Invalid response from AudioPlayer.create:", createResult);
            //     return false;
            // }
            //
            // // Handle different response formats
            // if (createResult.success === false) {
            //     console.error("Failed to create audio source:", createResult);
            //     return false;
            // }
            //
            // // If no explicit success property, assume success if no error was thrown
            // if (createResult.success === undefined) {
            //     console.log("AudioPlayer.create completed without explicit success flag");
            // }

            try {
                AudioPlayer.initialize({audioId: song.id});
            } catch (error) {
                console.error("Error initializing audio source:", error);
                return false;
            }
            return true;
        } catch (error) {
            console.error("Error while loading song:", error);
            return false;
        }
    };

    // Not tested
    const downloadIfNeeded = async (song: Song, callback?: (progress: ProgressStatus) => void): Promise<boolean> => {
        try {
            const downloaded = await isDownloaded(song);
            if (!downloaded) {
                if (callback) {
                    await downloadSong(song, callback);
                } else {
                    await downloadSong(song, () => {});
                }
            }
            return true;
        } catch (error) {
            console.error("Error while downloading:", error);
            return false;
        }
    };

    // Semi-working
    // Bug: doesn't update media control
    const playSong = async (song: Song, callback?: (progress: ProgressStatus) => void): Promise<boolean> => {
        try {
            musicState.isLoading = true;

            // Download if needed
            const downloadSuccess = await downloadIfNeeded(song, callback);
            if (!downloadSuccess) {
                console.error("Failed to download song");
                musicState.isLoading = false;
                return false;
            }

            // Stop current song if playing
            if (musicState.isPlaying && musicState.currentSong) {
                await AudioPlayer.stop({ audioId: musicState.currentSong.id });
            }

            // Load the new song
            const loadSuccess = await loadSong(song);
            if (!loadSuccess) {
                console.error("Failed to load song");
                musicState.isLoading = false;
                return false;
            }

            // Play the song
            try {
                await AudioPlayer.play({ audioId: song.id });
                if(song.id) setupEventListeners(song.id);
            } catch (error) {
                console.error("Error playing song:", error);
                musicState.isLoading = false;
                return false;
            }

            musicState.currentSong = song;
            musicState.isPlaying = true;
            musicState.isLoading = false;

            return true;
        } catch (error) {
            console.error("Error while playing:", error);
            musicState.isLoading = false;
            return false;
        }
    };

    // Working
    const pauseSong = async (): Promise<boolean> => {
        try {
            if (musicState.currentSong && musicState.isPlaying) {
                await AudioPlayer.pause({ audioId: musicState.currentSong.id });
                musicState.isPlaying = false;
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error while pausing:", error);
            return false;
        }
    };

    // Working
    const resumeSong = async (): Promise<boolean> => {
        try {
            if (musicState.currentSong && !musicState.isPlaying) {
                await AudioPlayer.play({ audioId: musicState.currentSong.id });
                musicState.isPlaying = true;
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error while resuming:", error);
            return false;
        }
    };

    // Working
    const stopSong = async (): Promise<boolean> => {
        try {
            if (musicState.currentSong) {
                await AudioPlayer.stop({ audioId: musicState.currentSong.id });
                musicState.isPlaying = false;
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error while stopping:", error);
            return false;
        }
    };

    // Working
    const seekTo = async (timeInSeconds: number): Promise<boolean> => {
        try {
            if (musicState.currentSong) {
                await AudioPlayer.seek({
                    audioId: musicState.currentSong.id,
                    timeInSeconds
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error while seeking:", error);
            return false;
        }
    };

    // Working
    const setVolume = async (volume: number): Promise<boolean> => {
        try {
            if (musicState.currentSong) {
                await AudioPlayer.setVolume({
                    audioId: musicState.currentSong.id,
                    volume
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error while setting volume:", error);
            return false;
        }
    };

    // Working
    const setRate = async (rate: number): Promise<boolean> => {
        try {
            if (musicState.currentSong) {
                await AudioPlayer.setRate({
                    audioId: musicState.currentSong.id,
                    rate
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error while setting rate:", error);
            return false;
        }
    };

    // Working
    const getDuration = async (): Promise<number> => {
        try {
            if (musicState.currentSong) {
                const result = await AudioPlayer.getDuration({ audioId: musicState.currentSong.id });
                return result?.duration || 0;
            }
            return 0;
        } catch (error) {
            console.error("Error while getting duration:", error);
            return 0;
        }
    };

    // Working
    const getCurrentTime = async (): Promise<number> => {
        try {
            if (musicState.currentSong) {
                const result = await AudioPlayer.getCurrentTime({ audioId: musicState.currentSong.id });
                return result?.currentTime || 0;
            }
            return 0;
        } catch (error) {
            console.error("Error while getting current time:", error);
            return 0;
        }
    };

    // Working
    const checkIsPlaying = async (): Promise<boolean> => {
        try {
            if (musicState.currentSong) {
                const result = await AudioPlayer.isPlaying({ audioId: musicState.currentSong.id });
                return result?.isPlaying || false;
            }
            return false;
        } catch (error) {
            console.error("Error while checking if playing:", error);
            return false;
        }
    };

    // Queue Management Functions
    // Working
    const setQueue = (songs: Song[], startIndex: number = 0) => {
        songs.forEach(async (song) => {
            if(song.images)
                song.images.large = await getImagePath(song);
        })
        musicState.queue = [...songs];
        musicState.originalQueue = [...songs];
        musicState.currentIndex = startIndex;

        if (musicState.shuffle) {
            shuffleQueue();
        }
    };

    // Working
    const addToQueue = async (song: Song, position?: number) => {
        if(song.images)
            song.images.large = await getImagePath(song);
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

    // Working
    const removeFromQueue = async (index: number) => {
        if (index >= 0 && index < musicState.queue.length) {
            const removedSong = musicState.queue[index];
            musicState.queue.splice(index, 1);

            const originalIndex = musicState.originalQueue.findIndex(s => s.id === removedSong.id);
            if (originalIndex !== -1) {
                musicState.originalQueue.splice(originalIndex, 1);
            }

            if (index < musicState.currentIndex) {
                musicState.currentIndex--;
            } else if (index === musicState.currentIndex) {
                // If current song is removed, stop playing
                await stopSong();
                musicState.currentSong = null;
            }
        }
    };

    // Working
    const clearQueue = async () => {
        await stopSong();
        musicState.queue = [];
        musicState.originalQueue = [];
        musicState.currentIndex = -1;
        musicState.currentSong = null;
    };

    // Working
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

    // Working
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

    // Semi-working
    // Bugs: Implement all
    const setRepeat = (mode: 'none' | 'one' | 'all') => {
        musicState.repeat = mode;
    };

    // Working
    const playNext = async (callback?: (progress: ProgressStatus) => void): Promise<boolean> => {
        if (musicState.queue.length === 0) {
            return false;
        }

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

    // Semi-working
    // Bugs: Only prev of one
    const playPrevious = async (callback?: (progress: ProgressStatus) => void): Promise<boolean> => {
        if (musicState.queue.length === 0) {
            return false;
        }

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

    // Working
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

    // Set up event listeners with better error handling
    const setupEventListeners = (id: string) => {
        try {
            // Listen for when audio is ready
            AudioPlayer.onAudioReady({ audioId: id }, () => {
                // AudioPlayer.changeMetadata({ audioId: id});
            });

            // Listen for when audio ends
            // Not tested
            AudioPlayer.onAudioEnd({ audioId: id }, async () => {
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

            // Listen for playback status changes (from external controls)
            AudioPlayer.onPlaybackStatusChange({ audioId: id }, (result) => {
                musicState.isPlaying = result.status === 'playing';
                // AudioPlayer.changeMetadata({ audioId: id});
            });
        } catch (error) {
            console.error("Error setting up event listeners:", error);
        }
    };

    return {
        // Playback controls
        playSong,
        pauseSong,
        resumeSong,
        stopSong,
        seekTo,
        setVolume,
        setRate,

        // Info getters
        getDuration,
        getCurrentTime,
        checkIsPlaying,

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