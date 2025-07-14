<script setup lang="ts">
import {ref, watch} from 'vue'
import { useOverlayStore } from "@/stores/overlayStore";
import { useDatabase } from "@/composables/useDatabase";
import { useRoute } from "vue-router";
import { reloadPage } from '@/utils/reloadPage';

// Setups
const route = useRoute();

const {
  checkIfTrackLiked,
  likeSong,
  unlikeSong,
    removeFromPlaylist
} = useDatabase();

const overlay = useOverlayStore();

const props = defineProps({
  enabled: Boolean
})

// Liked state
const isLiked = ref(false)

watch(() => overlay.isOpen, async () => {
  const trackExists = await checkIfTrackLiked(overlay.objData)
  console.log('Track is liked:', trackExists)

  isLiked.value = trackExists
})

// Functions
const toggleLike = async () => {
  isLiked.value = !isLiked.value

  isLiked.value ? await likeSong(overlay.objData) : await unlikeSong(overlay.objData)

  if(route.params.id === "0") reloadPage();

  console.log('Like toggled:', isLiked.value)
}

// To implement xd
const shareTrack = () => {
  console.log('Share track')
  overlay.closeOverlay()
}

// Open overlay with playlist selection
const addToPlaylist = () => {
  overlay.openAdd()
}

// Remove track from playlist
const removeFromThePlaylist = async () => {
  if(overlay.objData.id !== undefined){
    await removeFromPlaylist(overlay.objData.id, parseInt(route.params.id))
  }
  reloadPage();
  overlay.closeOverlay()
}

// To implement
const addToQueue = () => {
  console.log('Add to queue')
  overlay.closeOverlay()
}

// To implement
const goToArtist = () => {
  console.log('Go to artist')
  overlay.closeOverlay()
}

// To implement
const goToAlbum = () => {
  console.log('Go to artist')
  overlay.closeOverlay()
}

// To implement (you already have the function dumbass)
const downloadTrack = () => {
  console.log('Download track')
  overlay.closeOverlay()
}

// Close overlay when clicking outside the content
const closeOverlay = (event: Event) => {
  if (event.target === event.currentTarget) {
    overlay.closeOverlay()
  }
}
</script>

<template>
  <Transition name="overlay">
    <main
        v-show="props.enabled"
        class="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm"
        @click="closeOverlay"
    >
      <Transition name="slide-up">
        <div
            v-show="props.enabled"
            class="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl backdrop-saturate-150 border-t border-slate-700/50 shadow-2xl rounded-t-3xl"
            @click.stop
        >
          <!-- Drag handle -->
          <div class="flex justify-center py-3">
            <div class="w-10 h-1 bg-slate-600 rounded-full"></div>
          </div>

          <!-- Track info header -->
          <div class="px-6 pb-6 border-b border-slate-700/50">
            <div class="flex items-center gap-4">
              <!-- Album artwork -->
              <div class="w-12 h-12 rounded-xl overflow-hidden bg-slate-700/50 shadow-md flex-shrink-0">
                <img
                    :src="overlay.objData?.images?.large || 'assets/placeholder.png'"
                    :alt="`${overlay.objData?.title} album cover`"
                    class="w-full h-full object-cover"
                    loading="lazy"
                />
              </div>

              <!-- Track details -->
              <div class="flex-1 min-w-0">
                <h3 class="text-base font-semibold text-white truncate">
                  {{ overlay.objData?.title || 'Unknown Track' }}
                </h3>
                <p class="text-sm text-slate-400 truncate">
                  {{ overlay.objData?.artist || 'Unknown Artist' }} • {{ overlay.objData?.title || 'Unknown Album' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Action menu -->
          <div class="px-2 py-4">
            <!-- Like/Unlike -->
            <button
                @click="toggleLike"
                class="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-800/60 transition-all duration-200 active:bg-slate-700/60"
            >
              <div class="w-6 h-6 flex items-center justify-center">
                <v-icon
                    :name="isLiked ? 'md-favorite' : 'md-favoriteborder'"
                    scale="1.1"
                    :class="isLiked ? 'text-purple-400' : 'text-slate-400'"
                />
              </div>
              <span class="text-white text-base font-medium">
                {{ isLiked ? 'Remove from Goonable Tracks' : 'Add to Goonable Tracks' }}
              </span>
            </button>

            <!-- Share -->
            <button
                @click="shareTrack"
                class="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-800/60 transition-all duration-200 active:bg-slate-700/60"
            >
              <div class="w-6 h-6 flex items-center justify-center">
                <v-icon name="md-share" scale="1.1" class="text-slate-400" />
              </div>
              <span class="text-white text-base font-medium">Share</span>
            </button>

            <!-- Add to playlist -->
            <button
                @click="addToPlaylist"
                class="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-800/60 transition-all duration-200 active:bg-slate-700/60"
            >
              <div class="w-6 h-6 flex items-center justify-center">
                <v-icon name="md-playlistadd" scale="1.1" class="text-slate-400" />
              </div>
              <span class="text-white text-base font-medium">Add to playlist</span>
            </button>

            <!-- Remove from playlist -->
            <button
                @click="removeFromThePlaylist"
                class="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-800/60 transition-all duration-200 active:bg-slate-700/60"
                v-if="overlay.inPlaylist"
            >
              <div class="w-6 h-6 flex items-center justify-center">
                <v-icon name="md-delete-outlined" scale="1.1" class="text-slate-400" />
              </div>
              <span class="text-white text-base font-medium">Remove from playlist</span>
            </button>
            
            <!-- Add to queue -->
            <button
                @click="addToQueue"
                class="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-800/60 transition-all duration-200 active:bg-slate-700/60"
            >
              <div class="w-6 h-6 flex items-center justify-center">
                <v-icon name="md-queuemusic" scale="1.1" class="text-slate-400" />
              </div>
              <span class="text-white text-base font-medium">Add to queue</span>
            </button>

            <!-- Go to artist -->
            <button
                @click="goToArtist"
                class="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-800/60 transition-all duration-200 active:bg-slate-700/60"
            >
              <div class="w-6 h-6 flex items-center justify-center">
                <v-icon name="md-person" scale="1.1" class="text-slate-400" />
              </div>
              <span class="text-white text-base font-medium">Go to artist</span>
            </button>

            <!-- Go to album -->
            <button
                @click="goToAlbum"
                class="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-800/60 transition-all duration-200 active:bg-slate-700/60"
            >
              <div class="w-6 h-6 flex items-center justify-center">
                <v-icon name="md-librarymusic" scale="1.1" class="text-slate-400" />
              </div>
              <span class="text-white text-base font-medium">Go to album</span>
            </button>

            <!-- Download -->
            <button
                @click="downloadTrack"
                class="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-800/60 transition-all duration-200 active:bg-slate-700/60"
            >
              <div class="w-6 h-6 flex items-center justify-center">
                <v-icon name="md-download" scale="1.1" class="text-slate-400" />
              </div>
              <span class="text-white text-base font-medium">Download</span>
            </button>
          </div>

          <!-- Bottom safe area -->
          <div class="h-6"></div>
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

/* Transitions */
.overlay-enter-active,
.overlay-leave-active {
  transition: all 0.3s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>