<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useOverlayStore } from "@/stores/overlayStore";
import { useMusicManager } from "@/composables/useMusicManager";
import { useDatabase } from "@/composables/useDatabase";
import type { Song } from "@/types/common";
import { OhVueIcon } from 'oh-vue-icons';
import { onLongPress } from "@vueuse/core";

const overlay = useOverlayStore();
const musicManager = useMusicManager();
const { checkIfTrackLiked } = useDatabase();

const props = defineProps({
  enabled: Boolean
});

// Reactive state
const queue = ref<Song[]>([]);
const currentSong = ref<Song | null>(null);
const currentIndex = ref(-1);
const isPlaying = ref(false);
const shuffle = ref(false);
const repeat = ref<'none' | 'one' | 'all'>('none');
const draggedItem = ref<number | null>(null);
const draggedOverItem = ref<number | null>(null);
const likedSongs = ref<Set<string>>(new Set());

// Update state from music manager
const updateState = async () => {
  const state = musicManager.getState();
  queue.value = musicManager.getQueue();
  currentSong.value = state.currentSong;
  currentIndex.value = state.currentIndex;
  isPlaying.value = state.isPlaying;
  shuffle.value = state.shuffle;
  repeat.value = state.repeat;

  // Update liked songs
  for (const song of queue.value) {
    if (song.id) {
      const isLiked = await checkIfTrackLiked(song);
      if (isLiked) {
        likedSongs.value.add(song.id);
      } else {
        likedSongs.value.delete(song.id);
      }
    }
  }
};

// Computed properties
const queueStats = computed(() => {
  const totalDuration = queue.value.reduce((total, song) => total + (song.duration || 0), 0);
  const hours = Math.floor(totalDuration / 3600);
  const minutes = Math.floor((totalDuration % 3600) / 60);

  return {
    count: queue.value.length,
    duration: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  };
});

const currentPosition = computed(() => {
  return currentIndex.value + 1;
});

const repeatIcon = computed(() => {
  return repeat.value === 'one' ? 'md-repeatone' : 'md-repeat';
});

const repeatColor = computed(() => {
  return repeat.value !== 'none' ? 'text-purple-400' : 'text-slate-400';
});

// Helper functions
const formatDuration = (seconds: number | undefined) => {
  if (!seconds) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const isCurrentSong = (index: number) => {
  return index === currentIndex.value;
};

const isSongLiked = (song: Song) => {
  return song.id ? likedSongs.value.has(song.id) : false;
};

// Playback controls
const playFromQueue = async (index: number) => {
  await musicManager.playFromQueue(index);
  await updateState();
};

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
  const currentModeIndex = modes.indexOf(repeat.value);
  const nextMode = modes[(currentModeIndex + 1) % modes.length];
  musicManager.setRepeat(nextMode);
  updateState();
};

const removeFromQueue = async (index: number) => {
  await musicManager.removeFromQueue(index);
  await updateState();
};

const clearQueue = async () => {
  await musicManager.clearQueue();
  await updateState();
};

// Drag and drop functionality
const handleDragStart = (event: DragEvent, index: number) => {
  draggedItem.value = index;
  console.log("Drag start");
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', index.toString());
  }
};

const handleDragEnd = () => {
  console.log("Drag end");
  draggedItem.value = null;
  draggedOverItem.value = null;
};

const handleDragOver = (event: DragEvent, index: number) => {
  event.preventDefault();
  console.log("Drag over");
  draggedOverItem.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
};

const handleDragLeave = () => {
  console.log("Left");
  draggedOverItem.value = null;
};

const handleDrop = async (event: DragEvent, dropIndex: number) => {
  event.preventDefault();

  console.log("Dropped");
  try{
    if (draggedItem.value === null || draggedItem.value === dropIndex) return;

    const dragIndex = draggedItem.value;
    const newQueue = [...queue.value];
    const draggedSong = newQueue[dragIndex];

    // Remove from original position
    newQueue.splice(dragIndex, 1);

    // Insert at new position
    const insertIndex = dropIndex > dragIndex ? dropIndex - 1 : dropIndex;
    newQueue.splice(insertIndex, 0, draggedSong);

    // Update current index if needed
    let newCurrentIndex = currentIndex.value;
    if (dragIndex === currentIndex.value) {
      newCurrentIndex = insertIndex;
    } else if (dragIndex < currentIndex.value && insertIndex >= currentIndex.value) {
      newCurrentIndex--;
    } else if (dragIndex > currentIndex.value && insertIndex <= currentIndex.value) {
      newCurrentIndex++;
    }

    // Update the queue in music manager
    musicManager.setQueue(newQueue, newCurrentIndex);
    await updateState();

    draggedItem.value = null;
    draggedOverItem.value = null;
  } catch(error){
    console.log("Error while reordering: ", error);
  }
};

// Long press handler for song options
const handleLongPress = (song: Song) => {
  overlay.openOverlay(song, false);
};

// Initialize and cleanup
let stateInterval: NodeJS.Timeout;

onMounted(async () => {
  await updateState();
  stateInterval = setInterval(updateState, 2000);
});

onUnmounted(() => {
  if (stateInterval) {
    clearInterval(stateInterval);
  }
});

// Watch for prop changes
watch(() => props.enabled, (enabled) => {
  if (enabled) {
    updateState();
  }
});
</script>

<template>
  <Transition
      name="queue-slide"
      enter-active-class="transition-transform duration-300 ease-out"
      leave-active-class="transition-transform duration-300 ease-in"
      enter-from-class="transform translate-x-full"
      leave-to-class="transform translate-x-full"
  >
    <main
        v-show="props.enabled"
        class="fixed inset-0 z-55 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-4 pb-0 pt-7 border-b border-slate-700/50">
        <div class="flex items-center space-x-3">
          <button
              @click="overlay.closeQueue()"
              class="p-2 rounded-full hover:bg-slate-700/50 transition-colors"
          >
            <OhVueIcon name="fa-chevron-down" class="w-6 h-6" />
          </button>
          <div>
            <h1 class="text-xl font-bold">Queue</h1>
            <p class="text-sm text-slate-400">{{ queueStats.count }} songs • {{ queueStats.duration }}</p>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <button
              @click="clearQueue"
              class="p-2 rounded-full hover:bg-slate-700/50 transition-colors"
              title="Clear queue"
              :disabled="queue.length === 0"
          >
            <OhVueIcon name="md-clearall" class="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>

      <!-- Control Bar -->
      <div class="flex items-center justify-between p-4 border-b border-slate-700/50">
        <div class="flex items-center space-x-4">
          <!-- Shuffle -->
          <button
              @click="toggleShuffle"
              class="p-2 rounded-full hover:bg-slate-700/50 transition-colors"
              :title="shuffle ? 'Disable shuffle' : 'Enable shuffle'"
          >
            <OhVueIcon
                name="bi-shuffle"
                :class="shuffle ? 'w-5 h-5 text-purple-400' : 'w-5 h-5 text-slate-400'"
            />
          </button>

          <!-- Repeat -->
          <button
              @click="toggleRepeat"
              class="p-2 rounded-full hover:bg-slate-700/50 transition-colors relative"
              :title="repeat === 'none' ? 'Enable repeat' : repeat === 'all' ? 'Repeat all' : 'Repeat one'"
          >
            <OhVueIcon
                :name="repeatIcon"
                :class="`w-5 h-5 ${repeatColor}`"
            />
            <span
                v-if="repeat === 'one'"
                class="absolute -top-1 -right-1 w-2 h-2 bg-purple-400 rounded-full"
            ></span>
          </button>
        </div>

        <!-- Mini Player Controls -->
        <div class="flex items-center space-x-3">
          <button
              @click="playPrevious"
              class="p-2 rounded-full hover:bg-slate-700/50 transition-colors"
              :disabled="currentIndex <= 0 && repeat !== 'all'"
          >
            <OhVueIcon name="md-skipprevious-round" class="w-5 h-5" />
          </button>

          <button
              @click="togglePlayPause"
              class="p-2 bg-white text-black rounded-full hover:scale-105 transition-all duration-200"
              :disabled="!currentSong"
          >
            <OhVueIcon
                :name="isPlaying ? 'md-pause' : 'md-playarrow'"
                class="w-5 h-5"
            />
          </button>

          <button
              @click="playNext"
              class="p-2 rounded-full hover:bg-slate-700/50 transition-colors"
              :disabled="currentIndex >= queue.length - 1 && repeat !== 'all'"
          >
            <OhVueIcon name="md-skipnext-round" class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Now Playing Section -->
      <div v-if="currentSong" class="p-4 border-b border-slate-700/50 bg-slate-800/30">
        <div class="flex items-center space-x-3">
          <div class="relative">
            <img
                :src="currentSong.images?.large || currentSong.images?.small"
                :alt="currentSong.title"
                class="w-12 h-12 rounded-lg object-cover"
            />
            <div
                v-if="isPlaying"
                class="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center"
            >
              <div class="w-4 h-4 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-medium truncate text-white">{{ currentSong.title }}</h3>
            <p class="text-sm text-slate-400 truncate">{{ currentSong.artist }}</p>
          </div>
          <div class="text-sm text-slate-400">
            <span class="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs">
              {{ currentPosition }} / {{ queue.length }}
            </span>
          </div>
        </div>
      </div>

      <!-- Queue List -->
      <div class="flex-1 overflow-y-auto px-4 py-2">
        <div v-if="queue.length === 0" class="flex flex-col items-center justify-center h-full text-slate-400">
          <OhVueIcon name="md-list" class="w-16 h-16 mb-4 opacity-50" />
          <h3 class="text-lg font-medium mb-2">No songs in queue</h3>
          <p class="text-center">Add songs to your queue to see them here</p>
        </div>

        <div v-else class="space-y-1">
          <div
              v-for="(song, index) in queue"
              :key="`${song.id}-${index}`"
              :draggable="true"
              @dragstart="handleDragStart($event, index)"
              @dragend="handleDragEnd"
              @dragover="handleDragOver($event, index)"
              @dragleave="handleDragLeave"
              @drop="handleDrop($event, index)"
              class="group relative rounded-lg p-3 transition-all duration-200 cursor-pointer select-none"
              :class="[
              isCurrentSong(index)
                ? 'bg-purple-900/30 border border-purple-500/50'
                : 'bg-slate-800/40 hover:bg-slate-700/60 border border-transparent',
              draggedItem === index ? 'opacity-50' : '',
              draggedOverItem === index ? 'border-purple-400' : ''
            ]"
              @click="playFromQueue(index)"
          >
            <!-- Drag indicator -->
            <div
                v-if="draggedOverItem === index"
                class="absolute inset-0 border-2 border-purple-400 rounded-lg pointer-events-none"
            ></div>

            <div class="flex items-center space-x-3">
              <!-- Queue position / Playing indicator -->
              <div class="w-6 flex items-center justify-center">
                <div
                    v-if="isCurrentSong(index)"
                    class="flex items-center justify-center"
                >
                  <div
                      v-if="isPlaying"
                      class="w-4 h-4 bg-purple-400 rounded-full animate-pulse"
                  ></div>
                  <OhVueIcon
                      v-else
                      name="md-pause"
                      class="w-4 h-4 text-purple-400"
                  />
                </div>
                <span
                    v-else
                    class="text-xs text-slate-500 font-medium"
                >
                  {{ index + 1 }}
                </span>
              </div>

              <!-- Album Art -->
              <div class="relative">
                <img
                    :src="song.images?.large || song.images?.small"
                    :alt="song.title"
                    class="w-12 h-12 rounded-lg object-cover"
                    loading="lazy"
                />
              </div>

              <!-- Song Info -->
              <div class="flex-1 min-w-0">
                <h4
                    class="font-medium truncate transition-colors"
                    :class="isCurrentSong(index) ? 'text-purple-300' : 'text-white'"
                >
                  {{ song.title }}
                </h4>
                <p class="text-sm text-slate-400 truncate">{{ song.artist }}</p>
              </div>

              <!-- Duration and Controls -->
              <div class="flex items-center space-x-2">
                <!-- Like indicator -->
                <div
                    v-if="isSongLiked(song)"
                    class="w-4 h-4 text-purple-400"
                >
                  <OhVueIcon name="md-favorite" scale="0.8" />
                </div>

                <!-- Duration -->
                <span class="text-xs text-slate-500">
                  {{ formatDuration(song.duration) }}
                </span>

                <!-- Drag handle -->
                <div class="opacity-0 group-hover:opacity-100 max-md:opacity-100 transition-opacity p-1 cursor-grab active:cursor-grabbing">
                  <OhVueIcon name="md-dragindicator" class="w-4 h-4 text-slate-400" />
                </div>

                <!-- More options -->
                <button
                    @click.stop="handleLongPress(song)"
                    class="opacity-0 group-hover:opacity-100 max-md:opacity-100 transition-opacity p-1 rounded hover:bg-slate-600/50"
                >
                  <OhVueIcon name="io-ellipsis-vertical-sharp" class="w-4 h-4 text-slate-400" />
                </button>

                <!-- Remove from queue -->
                <button
                    @click.stop="removeFromQueue(index)"
                    class="opacity-0 group-hover:opacity-100 max-md:opacity-100 transition-opacity p-1 rounded hover:bg-red-600/50"
                >
                  <OhVueIcon name="md-delete-outlined" class="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </Transition>
</template>

<style scoped>
.queue-slide-enter-active,
.queue-slide-leave-active {
  transition: transform 0.3s ease;
}

.queue-slide-enter-from,
.queue-slide-leave-to {
  transform: translateX(100%);
}

/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: rgba(51, 65, 85, 0.3);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.5);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.7);
}

/* Drag and drop visual feedback */
.cursor-grab:active {
  cursor: grabbing;
}

/* Animations for drag and drop */
.group:hover .opacity-0 {
  opacity: 1;
}

/* Smooth transitions for all interactive elements */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Current song highlighting */
.bg-purple-900\/30 {
  background-color: rgba(88, 28, 135, 0.3);
}

.border-purple-500\/50 {
  border-color: rgba(168, 85, 247, 0.5);
}
</style>