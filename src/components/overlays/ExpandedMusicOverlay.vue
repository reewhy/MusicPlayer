<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useMusicManager } from "@/composables/useMusicManager";
import type { Song } from "@/types/common";
import { OhVueIcon } from 'oh-vue-icons';
import {useOverlayStore} from "@/stores/overlayStore";
import {useDatabase} from "@/composables/useDatabase";
import {getImagePath} from "@/utils/getFilePath";
import { formatDuration } from "@/utils/formatDuration";

const {
  likeSong,
  unlikeSong,
  checkIfTrackLiked
} = useDatabase();

const overlay = useOverlayStore();

// Props
interface Props {
  isVisible?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isVisible: true
});

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

// Update state periodically with real data from music manager
const updateState = async () => {
  const state = musicManager.getState();
  currentSong.value = state.currentSong;
  isPlaying.value = state.isPlaying;
  isLoading.value = state.isLoading;
  shuffle.value = state.shuffle;
  repeat.value = state.repeat;

  // Get real duration and current time from audio player
  if (currentSong.value) {
    try {
      const realDuration = await musicManager.getDuration();
      const realCurrentTime = await musicManager.getCurrentTime();

      if (realDuration > 0) {
        duration.value = realDuration;
      }

      currentTime.value = realCurrentTime;

      // Update playing state from actual audio player
      const actuallyPlaying = await musicManager.checkIsPlaying();
      isPlaying.value = actuallyPlaying;
    } catch (error) {
      console.error('Error updating player state:', error);
    }
  }
};

// Computed properties
const progressPercentage = computed(() => {
  if (duration.value === 0) return 0;
  return (currentTime.value / duration.value) * 100;
});

const formattedCurrentTime = computed(() => {
  return formatDuration(currentTime.value);
});

const formattedDuration = computed(() => {
  return formatDuration(duration.value);
});

const cover_url = ref<string | undefined>('assets/placeholder.jpg');

const songImage = computed(() => {
  return currentSong.value?.images?.large ||
      currentSong.value?.images?.small ||
      '/assets/placeholder.png';
});

const repeatIcon = computed(() => {
  return repeat.value === 'one' ? 'md-repeatone' : 'md-repeat';
});

const repeatColor = computed(() => {
  return repeat.value !== 'none' ? 'text-purple-400' : 'text-slate-400';
});

// Open overlay with playlist selection
const addToPlaylist = () => {
  if(currentSong.value !== null){
    overlay.objData = currentSong.value;
    overlay.openAdd();
  }
}

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

const playPrevious = async () => {
  await musicManager.playPrevious();
  await updateState();
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

const toggleMute = async () => {
  if (isMuted.value) {
    // Unmute - restore previous volume
    await musicManager.setVolume(volume.value / 100);
    isMuted.value = false;
  } else {
    // Mute - set volume to 0
    await musicManager.setVolume(0);
    isMuted.value = true;
  }
};

const toggleLike = async () => {
  if(currentSong.value){
    isLiked.value = !isLiked.value;
    isLiked.value ? await likeSong(currentSong.value) : await unlikeSong(currentSong.value)
  }
};

const seekTo = async (event: MouseEvent) => {
  const progressBar = event.currentTarget as HTMLElement;
  const rect = progressBar.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const percentage = (clickX / rect.width) * 100;
  const newTime = (percentage / 100) * duration.value;

  // Actually seek in the audio player
  await musicManager.seekTo(Math.round(newTime));
  currentTime.value = newTime;
};

const setVolume = async (event: MouseEvent) => {
  const volumeBar = event.currentTarget as HTMLElement;
  const rect = volumeBar.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const percentage = (clickX / rect.width) * 100;
  const newVolume = Math.max(0, Math.min(100, percentage));

  volume.value = newVolume;
  isMuted.value = newVolume === 0;

  // Actually set volume in the audio player
  await musicManager.setVolume(newVolume / 100);
};

// Playback rate control
const playbackRate = ref(1);
const setPlaybackRate = async (rate: number) => {
  playbackRate.value = rate;
  await musicManager.setRate(rate);
};

// Stop playback
const stopPlayback = async () => {
  await musicManager.stopSong();
  await updateState();
};

// Initialize and cleanup
let stateInterval: NodeJS.Timeout;

onMounted(async () => {
  await updateState();
  stateInterval = setInterval(updateState, 1000);
});

onUnmounted(() => {
  if (stateInterval) {
    clearInterval(stateInterval);
  }
});

// Watch for song changes
watch(currentSong, async (newSong) => {
  if (newSong) {
    // Get real duration from the audio player
    try {
      const realDuration = await musicManager.getDuration();
      duration.value = realDuration > 0 ? realDuration : (newSong.duration || 180);
    } catch (error) {
      duration.value = newSong.duration || 180;
    }

    currentTime.value = 0;
    checkIfTrackLiked(newSong).then((val) => {
      console.log('Track is liked:', val);
      isLiked.value = val;
    });
    cover_url.value = await getImagePath(newSong);
    console.log("Cover object: ", JSON.stringify(newSong, null, 2));
    console.log("Cover url: ", cover_url.value);
  }
});

// Watch for volume changes to update mute state
watch(volume, async (newVolume) => {
  if (newVolume > 0 && isMuted.value) {
    isMuted.value = false;
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

        <div class="flex items-center space-x-2">
          <!-- Stop button -->
          <button
              @click="stopPlayback"
              class="p-2 rounded-full hover:bg-slate-700/50 transition-colors"
              title="Stop"
          >
            <OhVueIcon name="md-stop" class="w-5 h-5 text-slate-400" />
          </button>

          <button class="p-2 rounded-full hover:bg-slate-700/50 transition-colors" @click="overlay.openOverlay(currentSong)">
            <OhVueIcon name="io-ellipsis-horizontal-sharp" class="w-6 h-6 text-white"  />
          </button>
        </div>
      </div>

      <!-- Album Art -->
      <div class="flex justify-center px-8 mb-16">
        <div class="relative w-80 h-80 max-w-[80vw] max-h-[80vw]">
          <img
              :src="cover_url || songImage"
              :alt="currentSong.title || 'Album cover'"
              class="w-full h-full rounded-lg shadow-2xl object-cover"
          />
          <div v-if="isLoading" class="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
            <OhVueIcon name="io-refresh-outline" class="w-8 h-8 animate-spin" />
          </div>

          <!-- Playback rate indicator -->
          <div v-if="playbackRate !== 1" class="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded-md text-xs">
            {{ playbackRate }}x
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
            <div class="w-6 h-6 flex items-center justify-center">
              <OhVueIcon
                  :name="isLiked ? 'md-favorite' : 'md-favoriteborder'"
                  scale="1.1"
                  :class="isLiked ? 'text-purple-400' : 'text-slate-400'"
              />
            </div>
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
              :title="shuffle ? 'Disable shuffle' : 'Enable shuffle'"
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
              title="Previous track"
          >
            <OhVueIcon name="md-skipprevious-round" class="w-8 h-8" />
          </button>

          <!-- Play/Pause -->
          <button
              @click="togglePlayPause"
              :disabled="isLoading"
              class="p-4 bg-white text-black rounded-full hover:scale-105 transition-all duration-200 disabled:opacity-50"
              :title="isPlaying ? 'Pause' : 'Play'"
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
              title="Next track"
          >
            <OhVueIcon name="md-skipnext-round" class="w-8 h-8" />
          </button>

          <!-- Repeat -->
          <button
              @click="toggleRepeat"
              class="p-2 rounded-full hover:bg-slate-700/50 transition-colors relative"
              :title="repeat === 'none' ? 'Enable repeat' : repeat === 'all' ? 'Repeat all' : 'Repeat one'"
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

      <!-- Playback Rate Controls -->
      <div class="px-8 mb-4">
        <div class="flex items-center justify-center space-x-2">
          <span class="text-xs text-slate-400">Speed:</span>
          <button
              v-for="rate in [0.5, 0.75, 1, 1.25, 1.5, 2]"
              :key="rate"
              @click="setPlaybackRate(rate)"
              :class="[
              'px-2 py-1 rounded text-xs transition-colors',
              playbackRate === rate
                ? 'bg-purple-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            ]"
          >
            {{ rate }}x
          </button>
        </div>
      </div>

      <!-- Bottom Controls -->
      <div class="px-8">
        <div class="flex items-center justify-between">
          <!-- Volume -->
          <div class="flex items-center space-x-3 flex-1">
            <button @click="toggleMute" class="p-1" title="Toggle mute">
              <OhVueIcon
                  :name="isMuted || volume === 0 ? 'md-volumeoff' : volume < 50 ? 'md-volumedown' : 'md-volumeup'"
                  class="w-5 h-5 text-slate-400"
              />
            </button>
            <div
                class="w-20 h-1 bg-slate-600 rounded-full cursor-pointer"
                @click="setVolume"
                title="Volume control"
            >
              <div
                  class="h-full bg-white rounded-full transition-all duration-300"
                  :style="{ width: `${isMuted ? 0 : volume}%` }"
              ></div>
            </div>
            <span class="text-xs text-slate-400 w-8">{{ Math.round(isMuted ? 0 : volume) }}%</span>
          </div>

          <!-- Additional Controls -->
          <div class="flex items-center space-x-4">
            <button class="p-2 rounded-full hover:bg-slate-700/50 transition-colors" title="Add to playlist" @click="addToPlaylist">
              <OhVueIcon name="md-add" class="w-5 h-5 text-slate-400" />
            </button>
            <button
                @click="overlay.openQueue()"
                class="p-2 rounded-full hover:bg-slate-700/50 transition-colors"
                title="Show queue"
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