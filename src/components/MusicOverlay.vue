<script setup lang="ts">
import {ref, computed, onMounted, onUnmounted, watch} from 'vue';
import { useMusicManager } from "@/composables/useMusicManager";
import type { Song } from "@/types/common";
import { OhVueIcon } from 'oh-vue-icons';
import {useOverlayStore} from "@/stores/overlayStore";
import {getImagePath} from "@/utils/getFilePath";

const {
  openMusic
} = useOverlayStore()

const musicManager = useMusicManager();

// Reactive state
const currentSong = ref<Song | null>(null);
const isPlaying = ref(false);
const isLoading = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const resolvedImagePath = ref<string>('/assets/placeholder.png');
const imageLoading = ref(false);

// Update state periodically
const updateState = async () => {
  const state = musicManager.getState();
  currentSong.value = state.currentSong;
  isPlaying.value = state.isPlaying;
  isLoading.value = state.isLoading;

  try {
    const realDuration = await musicManager.getDuration();
    if (realDuration > 0) {
      duration.value = realDuration;
    }

    const realCurrentTime = await musicManager.getCurrentTime();
    currentTime.value = realCurrentTime;
  } catch (error) {
    console.error('Error updating player state:', error);
  }
};

// Progress percentage
const progressPercentage = computed(() => {
  if (duration.value === 0) return 0;
  return (currentTime.value / duration.value) * 100;
});

// Song image with proper async handling
const songImage = computed(() => {
  return currentSong.value?.images?.large ||
      currentSong.value?.images?.small ||
      resolvedImagePath.value ||
      '/assets/placeholder.png';
});

// Player controls
const togglePlayPause = async () => {
  if (isPlaying.value) {
    await musicManager.pauseSong();
  } else {
    await musicManager.resumeSong();
  }
  await updateState();
};

const playNext = async () => {
  await musicManager.playNext();
  await updateState();
};

// Handle image loading when song changes
const loadSongImage = async (song: Song | null) => {
  if (!song) {
    resolvedImagePath.value = '/assets/placeholder.png';
    return;
  }

  // Check for immediate images first
  const immediateImage = song.images?.large ||
      song.images?.small;

  if (immediateImage) {
    // Set immediate image right away
    resolvedImagePath.value = immediateImage;

    // Still try to get better image asynchronously, but don't show loading
    try {
      const resolvedPath = await getImagePath(song);

      if (resolvedPath && resolvedPath !== '/assets/placeholder.png' && resolvedPath !== immediateImage) {
        resolvedImagePath.value = resolvedPath;
      }
    } catch (error) {
      console.warn('Error resolving image path:', error);
      // Keep the immediate image
    }
  } else {
    // No immediate image available, show loading and try async
    imageLoading.value = true;
    resolvedImagePath.value = '/assets/placeholder.png';

    try {
      const resolvedPath = await getImagePath(song);

      if (resolvedPath && resolvedPath !== '/assets/placeholder.png') {
        resolvedImagePath.value = resolvedPath;
      }
    } catch (error) {
      console.warn('Error resolving image path:', error);
      // Keep placeholder
    } finally {
      imageLoading.value = false;
    }
  }
};

// Initialize and cleanup
let stateInterval: NodeJS.Timeout;

onMounted(async () => {
  await updateState();

  // Load initial image if there's a current song
  if (currentSong.value) {
    await loadSongImage(currentSong.value);
  }

  // Update state every second
  stateInterval = setInterval(updateState, 1000);
});

onUnmounted(() => {
  if (stateInterval) {
    clearInterval(stateInterval);
  }
});

// Watch for song changes and update image
watch(currentSong, async (newSong) => {
  await loadSongImage(newSong);
}, { immediate: true });

// Show/hide based on current song
const showPlayer = computed(() => currentSong.value !== null);

// Expand to full player
const expandPlayer = () => {
  console.log('Expand player');
  openMusic();
};
</script>

<template>
  <Transition
      name="mini-player-slide"
      enter-active-class="transition-transform duration-300 ease-out"
      leave-active-class="transition-transform duration-300 ease-in"
      enter-from-class="transform translate-y-full"
      leave-to-class="transform translate-y-full"
  >
    <div
        v-if="showPlayer"
        class="z-40 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/50"
        @click="expandPlayer"
    >
      <!-- Progress bar -->
      <div class="h-0.5 bg-slate-700 relative">
        <div
            class="h-full bg-green-500 transition-all duration-300"
            :style="{ width: `${progressPercentage}%` }"
        ></div>
      </div>

      <!-- Mini player content -->
      <div class="px-4 py-2 flex items-center justify-between">

        <!-- Left side: Song info with album art -->
        <div class="flex items-center space-x-3 flex-1 min-w-0">
          <div class="relative">
            <img
                :src="songImage"
                :alt="currentSong?.title || 'Album cover'"
                class="w-10 h-10 rounded-md object-cover"
                :class="{ 'opacity-75': imageLoading }"
            />

            <!-- Loading overlay for main player loading -->
            <div v-if="isLoading" class="absolute inset-0 bg-black/50 rounded-md flex items-center justify-center">
              <OhVueIcon
                  name="md-refresh"
                  class="w-4 h-4 text-white animate-spin"
              />
            </div>

            <!-- Small loading indicator for image loading -->
            <div v-else-if="imageLoading" class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
              <OhVueIcon
                  name="md-refresh"
                  class="w-2 h-2 text-white animate-spin"
              />
            </div>
          </div>

          <div class="min-w-0 flex-1">
            <h3 class="text-white font-medium text-sm truncate">
              {{ currentSong?.title || 'Unknown Title' }}
            </h3>
            <p class="text-slate-400 text-xs truncate">
              {{ currentSong?.artist || 'Unknown Artist' }}
            </p>
          </div>
        </div>

        <!-- Right side: Controls -->
        <div class="flex items-center space-x-2 ml-4">
          <!-- Add to library button -->
          <button
              class="p-2 rounded-full text-slate-400 hover:text-white transition-colors"
              title="Add to library"
          >
            <OhVueIcon
                name="md-add"
                class="w-5 h-5"
            />
          </button>

          <!-- Play/Pause button -->
          <button
              @click.stop="togglePlayPause"
              :disabled="isLoading"
              class="p-2 rounded-full text-white hover:bg-slate-700/50 transition-all duration-200 disabled:opacity-50"
              :title="isPlaying ? 'Pause' : 'Play'"
          >
            <OhVueIcon
                v-if="isLoading"
                name="md-refresh"
                class="w-6 h-6 text-white animate-spin"
            />
            <OhVueIcon
                v-else-if="isPlaying"
                name="md-pause"
                class="w-6 h-6 text-white"
            />
            <OhVueIcon
                v-else
                name="md-playarrow"
                class="w-6 h-6 text-white"
            />
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.mini-player-slide-enter-active,
.mini-player-slide-leave-active {
  transition: transform 0.3s ease;
}

.mini-player-slide-enter-from,
.mini-player-slide-leave-to {
  transform: translateY(100%);
}
</style>