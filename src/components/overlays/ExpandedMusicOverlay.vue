<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useMusicManager } from "@/composables/useMusicManager";
import type { Song } from "@/types/common";
import { OhVueIcon } from 'oh-vue-icons';
import {useOverlayStore} from "@/stores/overlayStore";
import {useDatabase} from "@/composables/useDatabase";
import {useRoute} from "vue-router";
import { reloadPage } from "@/utils/reloadPage";

const {
  likeSong,
  unlikeSong,
    checkIfTrackLiked
} = useDatabase();

const overlay = useOverlayStore();

const route = useRoute();

// Props
interface Props {
  isVisible?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isVisible: false
});

// Emits
const emit = defineEmits<{
  close: [];
  openQueue: [];
}>();

const musicManager = useMusicManager();

// Reactive state
const currentSong = ref<Song | null>(null);
const isPlaying = ref(false);
const isLoading = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(80);
const isMuted = ref(false);
const isLiked = ref(false);
const shuffle = ref(false);
const repeat = ref<'none' | 'one' | 'all'>('none');

// Update state periodically
const updateState = () => {
  const state = musicManager.getState();
  currentSong.value = state.currentSong;
  isPlaying.value = state.isPlaying;
  isLoading.value = state.isLoading;
  shuffle.value = state.shuffle;
  repeat.value = state.repeat;

  // Mock current time update - you'll need to get this from your audio system
  if (isPlaying.value && currentTime.value < duration.value) {
    currentTime.value += 1;
  }
};

// Computed properties
const progressPercentage = computed(() => {
  if (duration.value === 0) return 0;
  return (currentTime.value / duration.value) * 100;
});

const formattedCurrentTime = computed(() => {
  return formatTime(currentTime.value);
});

const formattedDuration = computed(() => {
  return formatTime(duration.value);
});

const songImage = computed(() => {
  return currentSong.value?.images?.large ||
      currentSong.value?.images?.small ||
      '/assets/placeholder.png';
});

const repeatIcon = computed(() => {
  return repeat.value === 'one' ? 'md-repeat-one' : 'md-repeat';
});

const repeatColor = computed(() => {
  return repeat.value !== 'none' ? 'text-purple-400' : 'text-slate-400';
});

// Helper functions
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Player controls
const togglePlayPause = async () => {
  if (isPlaying.value) {
    await musicManager.pauseSong();
  } else {
    await musicManager.resumeSong();
  }
  updateState();
};

const playNext = async () => {
  await musicManager.playNext();
  updateState();
};

const playPrevious = async () => {
  await musicManager.playPrevious();
  updateState();
};

const toggleShuffle = () => {
  musicManager.toggleShuffle();
  updateState();
};

const toggleRepeat = () => {
  const modes: Array<'none' | 'one' | 'all'> = ['none', 'all', 'one'];
  const currentIndex = modes.indexOf(repeat.value);
  const nextMode = modes[(currentIndex + 1) % modes.length];
  musicManager.setRepeat(nextMode);
  updateState();
};

const toggleMute = () => {
  isMuted.value = !isMuted.value;
};

const toggleLike = async () => {
  isLiked.value = !isLiked.value;
  // Here you would typically save to favorites
  isLiked.value ? await likeSong(overlay.objData) : await unlikeSong(overlay.objData)
};

const seekTo = (event: MouseEvent) => {
  const progressBar = event.currentTarget as HTMLElement;
  const rect = progressBar.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const percentage = (clickX / rect.width) * 100;
  const newTime = (percentage / 100) * duration.value;
  currentTime.value = Math.floor(newTime);
  // Here you would typically seek in your audio system
};

const setVolume = (event: MouseEvent) => {
  const volumeBar = event.currentTarget as HTMLElement;
  const rect = volumeBar.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const percentage = (clickX / rect.width) * 100;
  volume.value = Math.max(0, Math.min(100, percentage));
  isMuted.value = volume.value === 0;
};

// Initialize and cleanup
let stateInterval: NodeJS.Timeout;

onMounted(() => {
  updateState();
  stateInterval = setInterval(updateState, 1000);

  // Mock duration
  duration.value = currentSong.value?.duration || 180;
});

onUnmounted(() => {
  if (stateInterval) {
    clearInterval(stateInterval);
  }
});

// Watch for song changes
watch(currentSong,  (newSong) => {
  if (newSong) {
    duration.value = newSong.duration || 180;
    currentTime.value = 0;
    const trackExists = checkIfTrackLiked(overlay.objData)
    console.log('Track is liked:', trackExists)

    isLiked.value = trackExists
  }
});
</script>

<template>
  <Transition
      name="player-slide"
      enter-active-class="transition-transform duration-300 ease-out"
      leave-active-class="transition-transform duration-300 ease-in"
      enter-from-class="transform translate-y-full"
      leave-to-class="transform translate-y-full"
  >
    <div
        v-if="isVisible && currentSong"
        class="fixed inset-0 z-50 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-4 pb-6 pt-7">
        <button
            @click="overlay.closeMusic()"
            class="p-2 rounded-full hover:bg-slate-700/50 transition-colors"
        >
          <OhVueIcon name="fa-chevron-down" class="w-6 h-6" />
        </button>

        <div class="text-center">
          <p class="text-sm text-slate-300">Playing from</p>
          <p class="text-sm font-medium">{{ currentSong.albumTitle || 'Unknown Album' }}</p>
        </div>

        <button class="p-2 rounded-full hover:bg-slate-700/50 transition-colors" @click="overlay.openOverlay(currentSong)">
          <OhVueIcon name="io-ellipsis-horizontal-sharp" class="w-6 h-6 text-white"  />
        </button>
      </div>

      <!-- Album Art -->
      <div class="flex justify-center px-8 mb-16">
        <div class="relative w-80 h-80 max-w-[80vw] max-h-[80vw]">
          <img
              :src="songImage"
              :alt="currentSong.title || 'Album cover'"
              class="w-full h-full rounded-lg shadow-2xl object-cover"
          />
          <div v-if="isLoading" class="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
            <OhVueIcon name="io-refresh-outline" class="w-8 h-8 animate-spin" />
          </div>
        </div>
      </div>

      <!-- Song Info -->
      <div class="px-8 mb-6">
        <div class="flex items-center justify-between mb-2">
          <div class="flex-1 min-w-0">
            <h1 class="text-2xl font-bold truncate">{{ currentSong.title || 'Unknown Title' }}</h1>
            <p class="text-slate-300 text-lg truncate">{{ currentSong.artist || 'Unknown Artist' }}</p>
          </div>
          <button
              @click="toggleLike"
              class="p-2 ml-4 rounded-full hover:bg-slate-700/50 transition-colors"
          >
            <button
                @click="toggleLike"
                class="flex items-center gap-4 p-2 rounded-full hover:bg-slate-800/60 transition-colors duration-200 active:bg-slate-700/60"
            >
              <div class="w-6 h-6 flex items-center justify-center">
                <v-icon
                    :name="isLiked ? 'md-favorite' : 'md-favoriteborder'"
                    scale="1.1"
                    :class="isLiked ? 'text-purple-400' : 'text-slate-400'"
                />
              </div>
            </button>
          </button>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="px-8 mb-6">
        <div
            class="h-1 bg-slate-600 rounded-full cursor-pointer mb-2"
            @click="seekTo"
        >
          <div
              class="h-full bg-white rounded-full transition-all duration-300 relative"
              :style="{ width: `${progressPercentage}%` }"
          >
            <div class="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 hover:opacity-100 transition-opacity"></div>
          </div>
        </div>
        <div class="flex justify-between text-xs text-slate-400">
          <span>{{ formattedCurrentTime }}</span>
          <span>{{ formattedDuration }}</span>
        </div>
      </div>

      <!-- Controls -->
      <div class="px-8 mb-6">
        <div class="flex items-center justify-center space-x-8">
          <!-- Shuffle -->
          <button
              @click="toggleShuffle"
              class="p-2 rounded-full hover:bg-slate-700/50 transition-colors"
          >
            <OhVueIcon
                name="bi-shuffle"
                :class="shuffle ? 'w-6 h-6 text-purple-400' : 'w-6 h-6 text-slate-400'"
            />
          </button>

          <!-- Previous -->
          <button
              @click="playPrevious"
              class="p-2 rounded-full hover:bg-slate-700/50 transition-colors"
          >
            <OhVueIcon name="md-skipprevious-round" class="w-8 h-8" />
          </button>

          <!-- Play/Pause -->
          <button
              @click="togglePlayPause"
              :disabled="isLoading"
              class="p-4 bg-white text-black rounded-full hover:scale-105 transition-all duration-200 disabled:opacity-50"
          >
            <OhVueIcon
                v-if="isLoading"
                name="md-refresh"
                class="w-8 h-8 animate-spin"
            />
            <OhVueIcon
                v-else-if="isPlaying"
                name="md-pause"
                class="w-8 h-8"
            />
            <OhVueIcon
                v-else
                name="md-playarrow"
                class="w-8 h-8"
            />
          </button>

          <!-- Next -->
          <button
              @click="playNext"
              class="p-2 rounded-full hover:bg-slate-700/50 transition-colors"
          >
            <OhVueIcon name="md-skipnext-round" class="w-8 h-8" />
          </button>

          <!-- Repeat -->
          <button
              @click="toggleRepeat"
              class="p-2 rounded-full hover:bg-slate-700/50 transition-colors relative"
          >
            <OhVueIcon
                :name="repeatIcon"
                :class="`w-6 h-6 ${repeatColor}`"
            />
            <span
                v-if="repeat === 'one'"
                class="absolute -top-1 -right-1 w-2 h-2 bg-purple-400 rounded-full"
            ></span>
          </button>
        </div>
      </div>

      <!-- Bottom Controls -->
      <div class="px-8">
        <div class="flex items-center justify-between">
          <!-- Volume -->
          <div class="flex items-center space-x-3 flex-1">
            <button @click="toggleMute" class="p-1">
              <OhVueIcon
                  :name="isMuted || volume === 0 ? 'md-volumeoff' : 'md-volumeup'"
                  class="w-5 h-5 text-slate-400"
              />
            </button>
            <div
                class="w-20 h-1 bg-slate-600 rounded-full cursor-pointer"
                @click="setVolume"
            >
              <div
                  class="h-full bg-white rounded-full transition-all duration-300"
                  :style="{ width: `${isMuted ? 0 : volume}%` }"
              ></div>
            </div>
          </div>

          <!-- Additional Controls -->
          <div class="flex items-center space-x-4">
            <button class="p-2 rounded-full hover:bg-slate-700/50 transition-colors">
              <OhVueIcon name="md-add" class="w-5 h-5 text-slate-400" />
            </button>
            <button
                @click="emit('openQueue')"
                class="p-2 rounded-full hover:bg-slate-700/50 transition-colors"
            >
              <OhVueIcon name="md-list" class="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.player-slide-enter-active,
.player-slide-leave-active {
  transition: transform 0.3s ease;
}

.player-slide-enter-from,
.player-slide-leave-to {
  transform: translateY(100%);
}
</style>