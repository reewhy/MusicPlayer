<script setup lang="ts">
import { useOverlayStore } from "@/stores/overlayStore";
import { useConfirm } from "@/composables/useConfirm";
import { useDatabase } from "@/composables/useDatabase";
import { reloadPage } from '@/utils/reloadPage';

const {
  confirmDelete
} = useConfirm();

const {
  deletePlaylist
} = useDatabase();

const overlay = useOverlayStore();

const props = defineProps({
  enabled: Boolean
})

// Close overlay when clicking outside the content
const closeOverlay = (event: Event) => {
  if (event.target === event.currentTarget) {
    overlay.closePlaylist()
  }
}

const editPlaylist = () => {
  overlay.openOver()
  overlay.closePlaylist()
}

const deleteOpenPlaylist = async () => {
  const confirmed = await confirmDelete(`playlist "${overlay.editingPlaylist.name}"`);
  if (confirmed) {
    await deletePlaylist(overlay.editingPlaylist.id);
    overlay.closeOver()
    overlay.editingPlaylist = null;
    overlay.closePlaylist()

    reloadPage();
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
                    :src="overlay.editingPlaylist?.image || '/assets/placeholder.png'"
                    :alt="`${overlay.editingPlaylist?.name} playlist image`"
                    class="w-full h-full object-cover"
                    loading="lazy"
                />
              </div>

              <!-- Track details -->
              <div class="flex-1 min-w-0">
                <h3 class="text-base font-semibold text-white truncate">
                  {{ overlay.editingPlaylist?.name || 'Unknown Playlist' }}
                </h3>
              </div>
            </div>
          </div>

          <!-- Action menu -->
          <div class="px-2 py-4">
            <button
                @click="editPlaylist"
                class="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-800/60 transition-all duration-200 active:bg-slate-700/60"
            >
              <div class="w-6 h-6 flex items-center justify-center">
                <v-icon name="fa-edit" scale="1.1" class="text-slate-400" />
              </div>
              <span class="text-white text-base font-medium">Edit Playlist</span>
            </button>

            <button
                @click="deleteOpenPlaylist"
                class="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-800/60 transition-all duration-200 active:bg-slate-700/60"
            >
              <div class="w-6 h-6 flex items-center justify-center">
                <v-icon name="md-delete-outlined" scale="1.1" class="text-slate-400" />
              </div>
              <span class="text-white text-base font-medium">Delete playlist</span>
            </button>

            <!-- Bottom safe area -->
            <div class="h-6"></div>
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