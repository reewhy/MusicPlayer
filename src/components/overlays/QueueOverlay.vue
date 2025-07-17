<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useOverlayStore } from "@/stores/overlayStore";
import { useMusicManager } from "@/composables/useMusicManager";
import { useDatabase } from "@/composables/useDatabase";
import type { Song } from "@/types/common";
import { OhVueIcon } from 'oh-vue-icons';
import { Haptics } from "@capacitor/haptics";
import {getImagePath} from "@/utils/getFilePath";
import { formatDuration } from "@/utils/formatDuration";

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
const likedSongs = ref<Set<string>>(new Set());

// Mobile drag and drop state
const dragState = ref({
  isDragging: false,
  draggedIndex: null as number | null,
  draggedOverIndex: null as number | null,
  draggedElement: null as HTMLElement | null,
  placeholder: null as HTMLElement | null,
  insertBefore: true as boolean // Track whether to insert before or after
});

// Touch tracking
const touchState = ref({
  startY: 0,
  currentY: 0,
  isDragging: false,
  longPressTimer: null as NodeJS.Timeout | null,
  scrollContainer: null as HTMLElement | null,
  autoScrollTimer: null as NodeJS.Timeout | null
});

// Update state from music manager
const updateState = async () => {
  const state = musicManager.getState();
  queue.value = musicManager.getQueue();
  currentSong.value = state.currentSong;
  currentIndex.value = state.currentIndex;
  isPlaying.value = state.isPlaying;
  shuffle.value = state.shuffle;
  repeat.value = state.repeat;
  cover_url.value = await getImagePath(state.currentSong);

  // Update liked songs
  for (const song of queue.value) {
    song.albumCover = await getImagePath(song.albumId);
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

const isCurrentSong = (index: number) => {
  return index === currentIndex.value;
};

const isSongLiked = (song: Song) => {
  return song.id ? likedSongs.value.has(song.id) : false;
};

// Playback controls
const playFromQueue = async (index: number) => {
  if (dragState.value.isDragging) return;
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
  if (dragState.value.isDragging) return;
  await musicManager.removeFromQueue(index);
  await updateState();
};

const clearQueue = async () => {
  await musicManager.clearQueue();
  await updateState();
};

// Mobile drag and drop functionality
const createPlaceholder = (originalElement: HTMLElement) => {
  const placeholder = originalElement.cloneNode(true) as HTMLElement;
  placeholder.style.opacity = '0.3';
  placeholder.style.pointerEvents = 'none';
  placeholder.style.backgroundColor = 'rgba(168, 85, 247, 0.1)';
  placeholder.style.border = '1px dashed rgba(168, 85, 247, 0.5)';
  placeholder.classList.add('drag-placeholder');
  placeholder.setAttribute('data-placeholder', 'true');
  return placeholder;
};

const findNearestDropTarget = (y: number) => {
  const container = document.querySelector('.queue-list');
  if (!container) return { index: -1, insertBefore: true };

  const items = Array.from(container.querySelectorAll('.queue-item:not([data-placeholder])'));
  let nearestIndex = -1;
  let nearestDistance = Infinity;
  let insertBefore = true;

  // If dragging below all items, insert at the end
  if (items.length > 0) {
    const lastItem = items[items.length - 1];
    const lastRect = lastItem.getBoundingClientRect();
    if (y > lastRect.bottom) {
      return { index: items.length - 1, insertBefore: false };
    }
  }

  // If dragging above all items, insert at the beginning
  if (items.length > 0) {
    const firstItem = items[0];
    const firstRect = firstItem.getBoundingClientRect();
    if (y < firstRect.top) {
      return { index: 0, insertBefore: true };
    }
  }

  items.forEach((item, index) => {
    const rect = item.getBoundingClientRect();
    const itemCenter = rect.top + rect.height / 2;

    if (y <= itemCenter) {
      // Above center - insert before this item
      const distance = Math.abs(y - rect.top);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
        insertBefore = true;
      }
    } else {
      // Below center - insert after this item
      const distance = Math.abs(y - rect.bottom);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
        insertBefore = false;
      }
    }
  });

  return { index: nearestIndex, insertBefore };
};

const handleAutoScroll = (y: number) => {
  const container = touchState.value.scrollContainer;
  if (!container) return;

  const containerRect = container.getBoundingClientRect();
  const scrollThreshold = 100;
  const scrollSpeed = 10;

  if (y < containerRect.top + scrollThreshold) {
    container.scrollTop = Math.max(0, container.scrollTop - scrollSpeed);
  } else if (y > containerRect.bottom - scrollThreshold) {
    container.scrollTop = Math.min(
        container.scrollHeight - container.clientHeight,
        container.scrollTop + scrollSpeed
    );
  }
};

const reorderQueue = async (fromIndex: number, toIndex: number) => {
  if (fromIndex === toIndex) return;

  console.log(`Reordering: moving item from ${fromIndex} to ${toIndex}`);

  const newQueue = [...queue.value];
  const draggedSong = newQueue[fromIndex];

  // Remove from original position
  newQueue.splice(fromIndex, 1);

  // Insert at new position
  newQueue.splice(toIndex, 0, draggedSong);

  // Update current index if needed
  let newCurrentIndex = currentIndex.value;
  if (fromIndex === currentIndex.value) {
    // Currently playing song was moved
    newCurrentIndex = toIndex;
  } else if (fromIndex < currentIndex.value && toIndex >= currentIndex.value) {
    // Song moved from before current to after current
    newCurrentIndex--;
  } else if (fromIndex > currentIndex.value && toIndex <= currentIndex.value) {
    // Song moved from after current to before current
    newCurrentIndex++;
  }

  // Update the queue in music manager
  musicManager.setQueue(newQueue, newCurrentIndex);
  await updateState();
};

// Touch drag and drop handlers
const handleTouchStart = (event: TouchEvent, index: number) => {
  const touch = event.touches[0];
  touchState.value.startY = touch.clientY;
  touchState.value.currentY = touch.clientY;

  // Set up long press for drag initiation
  touchState.value.longPressTimer = setTimeout(() => {
    if (!touchState.value.isDragging) {
      initiateTouchDrag(event, index);
    }
  }, 500); // 500ms long press
};

const handleTouchMove = (event: TouchEvent, index: number) => {
  const touch = event.touches[0];
  touchState.value.currentY = touch.clientY;

  if (touchState.value.isDragging) {
    event.preventDefault();

    // Handle auto-scroll
    handleAutoScroll(touch.clientY);

    // Update drag position and move placeholder
    const dropTarget = findNearestDropTarget(touch.clientY);
    const targetIndex = dropTarget.index;
    const insertBefore = dropTarget.insertBefore;

    if (targetIndex !== -1 &&
        (targetIndex !== dragState.value.draggedOverIndex ||
            insertBefore !== dragState.value.insertBefore)) {

      dragState.value.draggedOverIndex = targetIndex;
      dragState.value.insertBefore = insertBefore;

      // Move placeholder to new position
      if (dragState.value.placeholder) {
        const container = document.querySelector('.queue-list');
        const items = container?.querySelectorAll('.queue-item:not([data-placeholder])');

        if (items && items[targetIndex] && container) {
          const targetItem = items[targetIndex];

          if (insertBefore) {
            container.insertBefore(dragState.value.placeholder, targetItem);
          } else {
            container.insertBefore(dragState.value.placeholder, targetItem.nextSibling);
          }
        }
      }

      // Update visual feedback
      document.querySelectorAll('.queue-item:not([data-placeholder])').forEach((item, idx) => {
        item.classList.remove('drag-over-top', 'drag-over-bottom');
        if (idx === targetIndex) {
          item.classList.add(insertBefore ? 'drag-over-top' : 'drag-over-bottom');
        }
      });
    }
  } else {
    // Check if we've moved too far for a tap
    const deltaY = Math.abs(touch.clientY - touchState.value.startY);
    if (deltaY > 10 && touchState.value.longPressTimer) {
      clearTimeout(touchState.value.longPressTimer);
      touchState.value.longPressTimer = null;
    }
  }
};

const handleTouchEnd = async (event: TouchEvent, index: number) => {
  if (touchState.value.longPressTimer) {
    clearTimeout(touchState.value.longPressTimer);
    touchState.value.longPressTimer = null;
  }

  if (touchState.value.autoScrollTimer) {
    clearInterval(touchState.value.autoScrollTimer);
    touchState.value.autoScrollTimer = null;
  }

  if (touchState.value.isDragging) {
    event.preventDefault();

    // Complete the drag operation
    if (dragState.value.draggedIndex !== null && dragState.value.draggedOverIndex !== null) {
      try {
        // Calculate final drop position
        let dropIndex = dragState.value.draggedOverIndex;
        if (!dragState.value.insertBefore) {
          dropIndex++;
        }

        // Adjust for the fact that we're removing an item first
        if (dragState.value.draggedIndex < dropIndex) {
          dropIndex--;
        }

        await reorderQueue(dragState.value.draggedIndex, dropIndex);
      } catch (error) {
        console.error('Error reordering queue:', error);
      }
    }

    // Clean up
    finishTouchDrag();
  } else {
    // This was a tap, not a drag
    const deltaY = Math.abs(touchState.value.currentY - touchState.value.startY);
    if (deltaY < 10) {
      playFromQueue(index);
    }
  }
};

const initiateTouchDrag = (event: TouchEvent, index: number) => {
  touchState.value.isDragging = true;
  dragState.value.isDragging = true;
  dragState.value.draggedIndex = index;

  // Get scroll container
  touchState.value.scrollContainer = document.querySelector('.queue-list-container');

  // Add visual feedback and create placeholder
  const target = event.target as HTMLElement;
  const item = target.closest('.queue-item') as HTMLElement;
  if (item) {
    item.classList.add('dragging');

    // Create and insert placeholder
    const placeholder = createPlaceholder(item);
    dragState.value.placeholder = placeholder;
    item.parentNode?.insertBefore(placeholder, item.nextSibling);
  }

  // Store reference to dragged element
  dragState.value.draggedElement = item;

  // Provide haptic feedback if available
  Haptics.vibrate({ duration: 100 });

  // Start auto-scroll timer
  touchState.value.autoScrollTimer = setInterval(() => {
    handleAutoScroll(touchState.value.currentY);
  }, 16); // ~60fps
};

const finishTouchDrag = () => {
  touchState.value.isDragging = false;
  dragState.value.isDragging = false;
  dragState.value.draggedIndex = null;
  dragState.value.draggedOverIndex = null;
  dragState.value.insertBefore = true;

  // Remove visual feedback
  document.querySelectorAll('.queue-item').forEach(item => {
    item.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
  });

  // Clean up placeholder and dragged element reference
  if (dragState.value.placeholder) {
    dragState.value.placeholder.remove();
    dragState.value.placeholder = null;
  }
  dragState.value.draggedElement = null;

  if (touchState.value.autoScrollTimer) {
    clearInterval(touchState.value.autoScrollTimer);
    touchState.value.autoScrollTimer = null;
  }
};

// Long press handler for song options
const handleLongPress = (song: Song) => {
  if (dragState.value.isDragging) return;
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
  if (touchState.value.longPressTimer) {
    clearTimeout(touchState.value.longPressTimer);
  }
  if (touchState.value.autoScrollTimer) {
    clearInterval(touchState.value.autoScrollTimer);
  }
});

const cover_url = ref<string | undefined>('assets/placeholder.jpg');
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
                :src="cover_url"
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
      <div class="flex-1 overflow-y-auto px-4 py-2 queue-list-container">
        <div v-if="queue.length === 0" class="flex flex-col items-center justify-center h-full text-slate-400">
          <OhVueIcon name="md-list" class="w-16 h-16 mb-4 opacity-50" />
          <h3 class="text-lg font-medium mb-2">No songs in queue</h3>
          <p class="text-center">Add songs to your queue to see them here</p>
        </div>

        <div v-else class="space-y-1 queue-list">
          <div
              v-for="(song, index) in queue"
              :key="`${song.id}-${index}`"
              @touchstart="handleTouchStart($event, index)"
              @touchmove="handleTouchMove($event, index)"
              @touchend="handleTouchEnd($event, index)"
              class="group queue-item relative rounded-lg p-3 transition-all duration-200 cursor-pointer select-none touch-manipulation"
              :class="[
                isCurrentSong(index)
                  ? 'bg-purple-900/30 border border-purple-500/50'
                  : 'bg-slate-800/40 hover:bg-slate-700/60 border border-transparent',
                dragState.draggedIndex === index ? 'dragging' : ''
              ]"
          >
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
                    :src="song.albumCover"
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
                <div class="transition-opacity p-1 cursor-grab active:cursor-grabbing drag-handle">
                  <OhVueIcon name="md-dragindicator" class="w-4 h-4 text-slate-400" />
                </div>

                <!-- More options -->
                <button
                    @click.stop="handleLongPress(song)"
                    class="transition-opacity p-1 rounded hover:bg-slate-600/50"
                >
                  <OhVueIcon name="io-ellipsis-vertical-sharp" class="w-4 h-4 text-slate-400" />
                </button>

                <!-- Remove from queue -->
                <button
                    @click.stop="removeFromQueue(index)"
                    class="transition-opacity p-1 rounded hover:bg-red-600/50"
                >
                  <OhVueIcon name="md-delete-outlined" class="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>

            <!-- Drag indicator lines -->
            <div
                v-if="dragState.draggedOverIndex === index && dragState.isDragging"
                class="absolute left-0 right-0 h-0.5 bg-purple-400 rounded-full z-10"
                :class="dragState.insertBefore ? 'top-0' : 'bottom-0'"
            ></div>
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

/* Mobile drag and drop styles */
.queue-item {
  position: relative;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.queue-item.dragging {
  opacity: 0.8;
  transform: scale(1.02);
  z-index: 1000;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  border-color: rgba(168, 85, 247, 0.6) !important;
}

.queue-item.drag-over-top::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -1px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.8), transparent);
  border-radius: 1px;
  z-index: 10;
}

.queue-item.drag-over-bottom::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.8), transparent);
  border-radius: 1px;
  z-index: 10;
}

/* Placeholder styles */
.drag-placeholder {
  opacity: 0.3 !important;
  background-color: rgba(168, 85, 247, 0.1) !important;
  border: 1px dashed rgba(168, 85, 247, 0.5) !important;
}

/* Touch-specific styles */
.touch-manipulation {
  touch-action: manipulation;
}

/* Drag handle styles */
.drag-handle {
  cursor: grab;
  user-select: none;
}

.drag-handle:active {
  cursor: grabbing;
}

/* Mobile-only styles */
.queue-item {
  padding: 0.75rem;
}

.queue-item .drag-handle,
.queue-item button {
  opacity: 1;
}
</style>