<script setup lang="ts">
import { useOverlayStore } from "@/stores/overlayStore";
import { useDatabase } from "@/composables/useDatabase";
import {ref, onMounted, watch} from "vue";
import { useConfirm } from "@/composables/useConfirm";
import { Playlist, Song } from "@/types/common";

const overlay = useOverlayStore();

const {
  getAllPlaylists,
  addToPlaylist,
  fetchPlaylistTracks,
} = useDatabase();

const { confirmSave } = useConfirm();

const props = defineProps({
  enabled: Boolean
});

const isCreating = ref(false);
const selectedPlaylists = ref<Set<string>>(new Set());
const playlistTracks = ref<Map<string, Song[]>>(new Map());

const playlists = ref<Playlist[]>([]);

// Close overlay when clicking outside the content
const closeOverlay = (event: Event) => {
  if (event.target === event.currentTarget) {
    overlay.closeAdd();
    overlay.closeOverlay();
  }
};

// Check if song already exists in playlist
const isSongInPlaylist = (song: Song, playlistId: string): boolean => {
  const tracks = playlistTracks.value.get(playlistId);
  if (!tracks) return false;

  // Compare by ID if available, otherwise by title and artist
  return tracks.some(track =>
      track.id === song.id ||
      (track.title === song.title && track.artist === song.artist)
  );
};

// Get playlists where song already exists - FIXED
const getPlaylistsWithSong = (song: Song, selectedPlaylistIds: string[]): Playlist[] => {
  return playlists.value.filter(playlist => {
    if (playlist.id) {
      return selectedPlaylistIds.includes(playlist.id.toString()) &&
          isSongInPlaylist(song, playlist.id.toString());
    }
    return false;
  });
};

// Load playlist tracks for selected playlists
const loadPlaylistTracks = async (playlistIds: string[]) => {
  const loadPromises = playlistIds.map(async (playlistId) => {
    if (!playlistTracks.value.has(playlistId)) {
      try {
        const tracks = await fetchPlaylistTracks(parseInt(playlistId));
        playlistTracks.value.set(playlistId, tracks);
      } catch (error) {
        console.error(`Error loading tracks for playlist ${playlistId}:`, error);
        playlistTracks.value.set(playlistId, []);
      }
    }
  });

  await Promise.all(loadPromises);
};

// NEW: Load tracks when playlist is selected/deselected
const togglePlaylist = async (playlistId: string) => {
  if (selectedPlaylists.value.has(playlistId)) {
    selectedPlaylists.value.delete(playlistId);
  } else {
    selectedPlaylists.value.add(playlistId);
    // Load tracks immediately when playlist is selected
    await loadPlaylistTracks([playlistId]);
  }
};

// Handle form submission
const playlistSelected = async () => {
  if (selectedPlaylists.value.size === 0) {
    return; // No playlists selected
  }

  isCreating.value = true;

  try {
    const track: Song = overlay.objData as Song; // Assuming objData contains the track/song
    const selectedPlaylistIds = Array.from(selectedPlaylists.value);

    // Load tracks for all selected playlists (in case some weren't loaded yet)
    await loadPlaylistTracks(selectedPlaylistIds);

    // Check for duplicates
    const playlistsWithSong = getPlaylistsWithSong(track, selectedPlaylistIds);

    // If there are duplicates, show confirmation dialog
    if (playlistsWithSong.length > 0) {
      const playlistNames = playlistsWithSong.map(p => p.name).join(', ');
      const message = playlistsWithSong.length === 1
          ? `This song is already in "${playlistNames}". Do you want to add it anyway?`
          : `This song is already in these playlists: ${playlistNames}. Do you want to add it anyway?`;

      const shouldProceed = await confirmSave(message);
      if (!shouldProceed) {
        isCreating.value = false;
        return;
      }
    }

    const promises: Promise<boolean>[] = [];

    // Add track to each selected playlist
    for (const playlistId of selectedPlaylists.value) {
      const playlist = playlists.value.find(p => p.id?.toString() === playlistId);
      if (playlist) {
        promises.push(addToPlaylist(track, playlist));
      }
    }

    // Wait for all operations to complete
    const results = await Promise.all(promises);

    // Check if all operations were successful
    const allSuccessful = results.every(result => result === true);

    if (allSuccessful) {
      // Success - close overlay and reset selections
      selectedPlaylists.value.clear();
      playlistTracks.value.clear(); // Clear cached tracks
      overlay.closeAdd();
      overlay.closeOverlay();

      // Optional: Show success message
      console.log(`Track added to ${selectedPlaylistIds.length} playlist(s) successfully`);
    } else {
      // Some operations failed
      console.error('Some playlist additions failed');
      // You might want to show an error message to the user
    }
  } catch (error) {
    console.error('Error adding track to playlists:', error);
    // Handle error - show user feedback
  } finally {
    isCreating.value = false;
  }
};

// Focus input when overlay opens
watch(() => overlay.isAddOpen ,async () => {
  try {
    console.log("Getting playlists");
    playlists.value = await getAllPlaylists();

    playlists.value = playlists.value.filter(playlist => playlist.id !== 0);

    console.log('Playlists found: ', JSON.stringify(playlists.value, null, 2));
  } catch (error) {
    console.error('Error loading playlists:', error);
    playlists.value = [];
  }
});

// NEW: Watch for overlay opening to preload tracks for immediate feedback
watch(() => props.enabled, async (newEnabled) => {
  try{
    if (newEnabled && playlists.value.length > 0) {
      // Preload tracks for all playlists when overlay opens
      const playlistIds = playlists.value
          .filter(p => p.id)
          .map(p => p.id!.toString());
      await loadPlaylistTracks(playlistIds);
    }
  } catch(e) {
    console.log(e);
  }

});

// Reset selections when overlay closes
const onLeave = () => {
  selectedPlaylists.value.clear();
  playlistTracks.value.clear(); // Clear cached tracks
};
</script>

<template>
  <Transition name="overlay">
    <main
        v-show="props.enabled"
        class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        @click="closeOverlay"
    >
      <Transition name="slide-up" @leave="onLeave">
        <div
            v-show="props.enabled"
            class="fixed inset-0 flex items-center justify-center p-4 z-10"
            @click.stop
        >
          <div class="w-full max-w-sm bg-slate-900/90 backdrop-blur-xl backdrop-saturate-150 border border-slate-700/50 shadow-2xl rounded-2xl max-h-[80vh] overflow-hidden">
            <!-- Header -->
            <div class="px-6 py-4 border-b border-slate-700/50">
              <h2 class="text-xl font-bold text-white">
                <span class="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Add to playlist
                </span>
              </h2>
              <p class="text-slate-400 text-sm mt-1">
                Select playlists ({{ selectedPlaylists.size }} selected)
              </p>
            </div>

            <!-- Content -->
            <div class="p-6 space-y-6">
              <!-- Playlists List -->
              <div class="space-y-3 max-h-60 overflow-y-auto">
                <div v-if="playlists?.length === 0" class="text-center text-slate-400 py-8">
                  No playlists available
                </div>

                <label
                    v-for="playlist in playlists"
                    :key="playlist.id"
                    class="flex items-center justify-between p-3 rounded-xl border border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-800/30 transition-all duration-200 cursor-pointer"
                    :class="{ 'bg-indigo-600/20 border-indigo-500/50': selectedPlaylists.has(playlist.id?.toString() || '') }"
                >
                  <div class="flex-1">
                    <span class="text-white font-medium">{{ playlist.name }}</span>
                    <div v-if="isSongInPlaylist(overlay.objData as Song, playlist.id?.toString() || '')"
                         class="text-yellow-400 text-xs mt-1 flex items-center gap-1">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                      </svg>
                      Already in playlist
                    </div>
                  </div>
                  <input
                      type="checkbox"
                      :checked="selectedPlaylists.has(playlist.id?.toString() || '')"
                      @change="togglePlaylist(playlist.id?.toString() || '')"
                      class="w-5 h-5 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-2 focus:ring-offset-0 focus:ring-offset-slate-800"
                  >
                </label>
              </div>

              <!-- Buttons -->
              <div class="flex gap-3 pt-2">
                <button
                    type="button"
                    @click="overlay.closeAdd(); overlay.closeOverlay();"
                    class="flex-1 px-4 py-3 bg-slate-800/60 text-slate-300 rounded-xl hover:bg-slate-700/60 transition-all duration-200 font-medium"
                    :disabled="isCreating"
                >
                  Cancel
                </button>
                <button
                    type="button"
                    @click="playlistSelected"
                    class="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    :disabled="isCreating || selectedPlaylists.size === 0"
                >
                  <div v-if="isCreating" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{{ isCreating ? 'Adding...' : `Add to playlist${selectedPlaylists.size !== 1 ? 's' : ''}` }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </main>
  </Transition>
</template>

<style scoped>
/* Backdrop filter support */
.backdrop-blur-xl {
  -webkit-backdrop-filter: blur(24px);
  backdrop-filter: blur(24px);
}

.backdrop-blur-sm {
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}

/* Fallback for browsers that don't support backdrop-filter */
@supports not (backdrop-filter: blur(24px)) {
  .backdrop-blur-xl {
    background-color: rgba(15, 23, 42, 0.95);
  }
}

@supports not (backdrop-filter: blur(8px)) {
  .backdrop-blur-sm {
    background-color: rgba(0, 0, 0, 0.6);
  }
}

/* Custom scrollbar for playlist list */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: rgba(51, 65, 85, 0.3);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.5);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.7);
}

/* Handle viewport changes for mobile keyboards */
@media (max-height: 500px) {
  .slide-up-enter-active div,
  .slide-up-leave-active div {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    bottom: auto;
    max-height: 80vh;
    overflow-y: auto;
  }
}

/* Ensure safe area spacing */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 1rem);
}

.overlay-enter-active, .overlay-leave-active {
  transition: all 0.3s ease;
}

.overlay-enter-from, .overlay-leave-to {
  opacity: 0;
}

.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.slide-up-enter-from, .slide-up-leave-to {
  transform: scale(0.9);
  opacity: 0;
}
</style>