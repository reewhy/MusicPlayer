<script setup lang="ts">
import { useOverlayStore } from "@/stores/overlayStore";
import { useDatabase } from "@/composables/useDatabase";
import {ref, nextTick, watch} from "vue";
import { useConfirm } from "@/composables/useConfirm";
import { reloadPage } from '@/utils/reloadPage';

// Setups
const {
  confirmSave
} = useConfirm();

const {
  createPlaylist,
  updatePlaylistName
} = useDatabase();
const overlay = useOverlayStore();

const props = defineProps({
  enabled: Boolean
})

const playlistName = ref("");
const isCreating = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

// Create or edit function (to-do change the name of the function lazy asshole)
const createNewPlaylist = async () => {
  if (!playlistName.value.trim()) return;

  console.log("Playlist editing: ", JSON.stringify(overlay.editingPlaylist, null, 2));

  // Start loading animation
  isCreating.value = true;
  try {
    // No playlist editing: Create new playlist
    if(overlay.editingPlaylist === null){
      await createPlaylist(playlistName.value.trim());
    } else {
      // Playlist editing: Change playlist name
      const confirmed = await confirmSave();
      if (confirmed) {
        await updatePlaylistName(overlay.editingPlaylist.id!, playlistName.value.trim());
      }
      overlay.editingPlaylist = null;
    }
    // Remove chached infos
    overlay.closeOver();
    playlistName.value = "";
  } catch (error) {
    console.error("Error creating playlist:", error);
  } finally {
    isCreating.value = false;
    reloadPage();
  }
}

// I do not remember
const updatePlaylist = async (name: string) => {
  playlistName.value = name;
}

// Check if there's a playlist to edit to to to
watch(() => overlay.editingPlaylist, () => {
  if(overlay.editingPlaylist !== null && overlay.editingPlaylist.name !== undefined) updatePlaylist(overlay.editingPlaylist?.name);
})

// Close overlay when clicking outside the content
const closeOverlay = (event: Event) => {
  if (event.target === event.currentTarget) {
    overlay.closeOver()
  }
}

// Focus input when overlay opens
const onEnter = async () => {
  await nextTick();
  if (inputRef.value) {
    inputRef.value.focus();
  }
}
</script>

<template>
  <Transition name="overlay">
    <main
        v-show="props.enabled"
        class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        @click="closeOverlay"
    >
      <Transition name="slide-up" @enter="onEnter">
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
                  Create New Playlist
                </span>
              </h2>
              <p class="text-slate-400 text-sm mt-1">Give your playlist a name</p>
            </div>

            <!-- Form -->
            <form class="p-6 space-y-6" @submit.prevent="createNewPlaylist">
              <div class="space-y-2">
                <label for="playlist-name" class="block text-sm font-medium text-slate-300">
                  Playlist Name
                </label>
                <input
                    ref="inputRef"
                    id="playlist-name"
                    v-model="playlistName"
                    type="text"
                    placeholder="Enter playlist name..."
                    class="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    :disabled="isCreating"
                    required
                >
              </div>

              <!-- Buttons -->
              <div class="flex gap-3 pt-2">
                <button
                    type="button"
                    @click="overlay.closeOver()"
                    class="flex-1 px-4 py-3 bg-slate-800/60 text-slate-300 rounded-xl hover:bg-slate-700/60 transition-all duration-200 font-medium"
                    :disabled="isCreating"
                >
                  Cancel
                </button>
                <button
                    type="submit"
                    class="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    :disabled="isCreating || !playlistName.trim()"
                >
                  <div v-if="isCreating" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{{ isCreating ? 'Creating...' : 'Create' }}</span>
                </button>
              </div>
            </form>
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