<script setup lang="ts">
import { useOverlayStore } from "@/stores/overlayStore";
import { useDatabase } from "@/composables/useDatabase";
import {ref, nextTick, watch} from "vue";
import { useConfirm } from "@/composables/useConfirm";
import { reloadPage } from '@/utils/reloadPage';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const DEFAULT_DIRECTORY = Directory.Documents; // Adjust this to match your app's directory

// Setups
const {
  confirmSave
} = useConfirm();

const {
  createPlaylist,
  updatePlaylistName,
} = useDatabase();
const overlay = useOverlayStore();

const props = defineProps({
  enabled: Boolean
})

const playlistName = ref("");
const playlistImageUrl = ref("");
const selectedFile = ref<File | null>(null);
const imagePreview = ref("");
const isCreating = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

// Save image locally from file
const savePlaylistImageFromFile = async (playlistId: number, file: File): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Image saving only available on native platforms');
    return false;
  }

  try {
    // Check if playlists directory exists, create if not
    try {
      await Filesystem.stat({
        path: 'playlists',
        directory: DEFAULT_DIRECTORY
      });
    } catch (error) {
      // Directory doesn't exist, create it
      await Filesystem.mkdir({
        path: 'playlists',
        directory: DEFAULT_DIRECTORY,
        recursive: true
      });
    }

    // Convert file to base64
    const base64Data = await fileToBase64(file);

    // Remove the data:image/jpeg;base64, prefix if present
    const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');

    // Save the image file
    await Filesystem.writeFile({
      path: `playlists/${playlistId}.jpg`,
      data: cleanBase64,
      directory: DEFAULT_DIRECTORY
    });

    console.log(`Playlist image saved successfully for playlist ${playlistId}`);
    return true;

  } catch (error) {
    console.error('Error saving playlist image:', error);
    return false;
  }
}

// Save image locally from URL
const savePlaylistImageFromUrl = async (playlistId: number, imageUrl: string): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Image saving only available on native platforms');
    return false;
  }

  try {
    // Check if playlists directory exists, create if not
    try {
      await Filesystem.stat({
        path: 'playlists',
        directory: DEFAULT_DIRECTORY
      });
    } catch (error) {
      // Directory doesn't exist, create it
      await Filesystem.mkdir({
        path: 'playlists',
        directory: DEFAULT_DIRECTORY,
        recursive: true
      });
    }

    // Fetch the image from the URL
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    // Convert response to blob then to base64
    const blob = await response.blob();
    const base64Data = await blobToBase64(blob);

    // Remove the data:image/jpeg;base64, prefix if present
    const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');

    // Save the image file
    await Filesystem.writeFile({
      path: `playlists/${playlistId}.jpg`,
      data: cleanBase64,
      directory: DEFAULT_DIRECTORY
    });

    console.log(`Playlist image saved successfully for playlist ${playlistId}`);
    return true;

  } catch (error) {
    console.error('Error saving playlist image:', error);
    return false;
  }
}

// Helper function to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

// Helper function to convert blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

// Handle file selection
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be less than 5MB');
      return;
    }

    selectedFile.value = file;
    playlistImageUrl.value = ""; // Clear URL input when file is selected

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
}

// Clear image selection
const clearImageSelection = () => {
  selectedFile.value = null;
  playlistImageUrl.value = "";
  imagePreview.value = "";
  if (fileInputRef.value) {
    fileInputRef.value.value = "";
  }
}

// Create or edit function
const createNewPlaylist = async () => {
  if (!playlistName.value.trim()) return;

  console.log("Playlist editing: ", JSON.stringify(overlay.editingPlaylist, null, 2));

  // Start loading animation
  isCreating.value = true;
  try {
    // No playlist editing: Create new playlist
    if(overlay.editingPlaylist === null){
      const newPlaylistId = await createPlaylist(playlistName.value.trim());

      // Check if playlist was created successfully
      if (newPlaylistId !== false) {
        // Save image if provided
        if (selectedFile.value) {
          await savePlaylistImageFromFile(newPlaylistId, selectedFile.value);
        } else if (playlistImageUrl.value.trim()) {
          await savePlaylistImageFromUrl(newPlaylistId, playlistImageUrl.value.trim());
        }
      } else {
        throw new Error('Failed to create playlist');
      }
    } else {
      // Playlist editing: Change playlist name and/or image
      const confirmed = await confirmSave();
      if (confirmed) {
        await updatePlaylistName(overlay.editingPlaylist.id!, playlistName.value.trim());

        // Save image if provided
        if (selectedFile.value) {
          await savePlaylistImageFromFile(overlay.editingPlaylist.id!, selectedFile.value);
        } else if (playlistImageUrl.value.trim()) {
          await savePlaylistImageFromUrl(overlay.editingPlaylist.id!, playlistImageUrl.value.trim());
        }
      }
      overlay.editingPlaylist = null;
    }

    // Clear form
    overlay.closeOver();
    playlistName.value = "";
    clearImageSelection();

  } catch (error) {
    console.error("Error creating/updating playlist:", error);
  } finally {
    isCreating.value = false;
    reloadPage();
  }
}

// Update playlist function
const updatePlaylist = async (name: string, imageUrl?: string) => {
  playlistName.value = name;
  if (imageUrl) {
    playlistImageUrl.value = imageUrl;
  }
}

// Watch for URL changes to clear file selection
watch(playlistImageUrl, (newUrl) => {
  if (newUrl && selectedFile.value) {
    selectedFile.value = null;
    imagePreview.value = "";
    if (fileInputRef.value) {
      fileInputRef.value.value = "";
    }
  }
})

// Check if there's a playlist to edit
watch(() => overlay.editingPlaylist, () => {
  if(overlay.editingPlaylist !== null && overlay.editingPlaylist.name !== undefined) {
    updatePlaylist(overlay.editingPlaylist?.name, overlay.editingPlaylist?.image);
  }
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

// Validate URL format
const isValidUrl = (url: string): boolean => {
  if (!url) return true; // Empty is valid (optional)
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Get current preview image
const getCurrentPreview = () => {
  if (imagePreview.value) return imagePreview.value;
  if (playlistImageUrl.value && isValidUrl(playlistImageUrl.value)) return playlistImageUrl.value;
  return null;
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
          <div class="w-full max-w-sm bg-slate-900/90 backdrop-blur-xl backdrop-saturate-150 border border-slate-700/50 shadow-2xl rounded-2xl max-h-[80vh] overflow-y-auto">
            <!-- Header -->
            <div class="px-6 py-4 border-b border-slate-700/50">
              <h2 class="text-xl font-bold text-white">
                <span class="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  {{ overlay.editingPlaylist ? 'Edit Playlist' : 'Create New Playlist' }}
                </span>
              </h2>
              <p class="text-slate-400 text-sm mt-1">
                {{ overlay.editingPlaylist ? 'Modify your playlist details' : 'Give your playlist a name and image' }}
              </p>
            </div>

            <!-- Form -->
            <form class="p-6 space-y-6" @submit.prevent="createNewPlaylist">
              <!-- Playlist Name -->
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

              <!-- Image Upload Options -->
              <div class="space-y-4">
                <label class="block text-sm font-medium text-slate-300">
                  Playlist Image
                  <span class="text-slate-500 text-xs font-normal">(optional)</span>
                </label>

                <!-- File Upload -->
                <div class="space-y-2">
                  <label for="file-upload" class="block text-xs font-medium text-slate-400">
                    Upload from device
                  </label>
                  <input
                      ref="fileInputRef"
                      id="file-upload"
                      type="file"
                      accept="image/*"
                      @change="handleFileSelect"
                      class="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 file:cursor-pointer transition-all duration-200"
                      :disabled="isCreating"
                  >
                </div>

                <!-- URL Input -->
                <div class="space-y-2">
                  <label for="playlist-image" class="block text-xs font-medium text-slate-400">
                    Or enter image URL
                  </label>
                  <input
                      id="playlist-image"
                      v-model="playlistImageUrl"
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      class="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                      :class="{ 'border-red-500 focus:ring-red-500': playlistImageUrl && !isValidUrl(playlistImageUrl) }"
                      :disabled="isCreating"
                  >
                  <p v-if="playlistImageUrl && !isValidUrl(playlistImageUrl)" class="text-red-400 text-xs mt-1">
                    Please enter a valid URL
                  </p>
                </div>
              </div>

              <!-- Image Preview -->
              <div v-if="getCurrentPreview()" class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="block text-sm font-medium text-slate-300">Preview</label>
                  <button
                      type="button"
                      @click="clearImageSelection"
                      class="text-slate-400 hover:text-slate-300 text-sm"
                      :disabled="isCreating"
                  >
                    Clear
                  </button>
                </div>
                <div class="flex justify-center">
                  <img
                      :src="getCurrentPreview()"
                      alt="Playlist cover preview"
                      class="w-24 h-24 object-cover rounded-xl border border-slate-700/50"
                      @error="$event.target.style.display = 'none'"
                  >
                </div>
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
                    :disabled="isCreating || !playlistName.trim() || (!!playlistImageUrl && !isValidUrl(playlistImageUrl))"
                >
                  <div v-if="isCreating" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{{ isCreating ? (overlay.editingPlaylist ? 'Updating...' : 'Creating...') : (overlay.editingPlaylist ? 'Update' : 'Create') }}</span>
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