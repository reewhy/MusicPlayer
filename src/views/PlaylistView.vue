<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useDabManager } from "@/composables/useDabManager";
import {onMounted, ref, watch, computed, useTemplateRef, shallowRef} from "vue";
import {Playlist} from "@/types/common";
import SongItem from "@/components/SongItem.vue";
import {ProgressStatus} from "@capacitor/filesystem";
import { useDatabase } from "@/composables/useDatabase";
import { useOverlayStore } from "@/stores/overlayStore";
import {onLongPress} from "@vueuse/core";

const overlay = useOverlayStore();

const {
  downloadSong,
} = useDabManager();

const {
  fetchPlaylist
} = useDatabase();

const route = useRoute();

const playlist = ref<Playlist | null>()
const downloadProgress = ref(0);
const isDownloading = ref(false);
const downloadingSong = ref<string>();
const isDownloaded = ref(false);

const callbackProgress = async (progress: ProgressStatus) => {
  if (progress.lengthComputable && progress.contentLength > 0) {
    downloadProgress.value = Math.round((progress.bytes / progress.contentLength) * 100);
  }
}

const download = async () => {
  if (isDownloading.value) return;

  isDownloading.value = true;
  downloadProgress.value = 0;

  console.log(isDownloading.value);

  try {
    if (playlist.value?.tracks) {
      for (const track of playlist.value.tracks) {
        downloadingSong.value = track.title;
        await downloadSong(track, callbackProgress);
      }
    }

    isDownloaded.value = true;
    isDownloading.value = false;
    downloadProgress.value = 0;
  } catch(error) {
    console.error(error);
    isDownloading.value = false;
    downloadProgress.value = 0;
  }
}

const fetchPlaylistData = async (playlistId: number) => {
  playlist.value = await fetchPlaylist(playlistId);
}

// Format duration from seconds to mm:ss
const formatDuration = (seconds: number | undefined) => {
  if (!seconds) return '';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Calculate total album duration
const totalDuration = computed(() => {
  if (!playlist.value?.tracks) return 0;
  return playlist.value.tracks.reduce((total, track) => total + (track.duration || 0), 0);
});

onMounted(async () => {
  fetchPlaylistData(parseInt(route.params.id));
})

watch(() => route.params.id, (newId) => {
  if (newId) fetchPlaylistData(parseInt(newId));
})


const playlistRefHook = useTemplateRef<HTMLElement>('playlistRefHook')
const longPressHook = shallowRef(false)

function onLongPressCallbackHook() {
  longPressHook.value = true;
  overlay.openPlaylist(playlist.value!);

  console.log("Long pressed")
}

onLongPress(
    playlistRefHook,
    onLongPressCallbackHook,
    {
      modifiers: {
        prevent: true
      }
    }
)
</script>

<template>
  <main class="max-w-6xl mx-auto p-2 pb-24">
    <!-- Album Header -->
    <div
        class="
          mb-8 relative overflow-hidden rounded-2xl bg-slate-800/60 backdrop-blur-xl border border-slate-600/50 p-4
          hover:bg-slate-700/60 hover:border-slate-500/50 hover:shadow-lg hover:shadow-indigo-500/10
          active:bg-slate-700/60 active:border-slate-500/50 active:shadow-lg active:shadow-indigo-500/10
        "
        ref="playlistRefHook"
    >
      <!-- Background gradient -->
      <div class="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-slate-800/50 to-purple-900/30"></div>

      <!-- Content -->
      <div class="relative z-10 grid grid-cols-2 md:grid-cols-[300px_1fr] gap-6">
        <!-- Album Cover -->
        <div class="relative group">
          <div class="aspect-square rounded-2xl overflow-hidden bg-slate-700/50 shadow-2xl shadow-black/50">
            <img
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                :src="playlist?.image || 'assets/placeholder.png'"
                :alt="`${playlist?.name} album cover`"
                loading="lazy"
            />
          </div>

          <!-- Play overlay -->
          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-2xl">
            <div class="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <v-icon name="md-playarrow" scale="2" class="text-white ml-1"></v-icon>
            </div>
          </div>
        </div>

        <!-- Album Info -->
        <div class="flex flex-col justify-between space-y-6">
          <!-- Title and Artist -->
          <div class="space-y-4">
            <div>
              <h1 class="text-3xl md:text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                {{ playlist?.name }}
              </h1>
            </div>

            <!-- Album metadata -->
            <div class="flex flex-wrap gap-4 text-sm text-slate-400">
              <div v-if="totalDuration" class="flex items-center gap-2">
                <v-icon name="md-timelapse" scale="1"></v-icon>
                <span>{{ formatDuration(totalDuration) }}</span>
              </div>
            </div>
          </div>

          <!-- Download Button -->
          <div class="space-y-4">
            <button
                class="w-full px-6 py-4 rounded-2xl font-semibold text-white transition-all duration-300 shadow-lg relative overflow-hidden group disabled:cursor-not-allowed"
                :class="{
                  'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:shadow-xl hover:shadow-indigo-500/25 transform hover:scale-105': !isDownloading && !isDownloaded,
                  'bg-gradient-to-r from-blue-600 to-indigo-600': isDownloading,
                  'bg-gradient-to-r from-green-600 to-emerald-600': isDownloaded
                }"
                :disabled="isDownloading"
                @click="download"
            >
              <!-- Button background animation -->
              <div class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

              <!-- Button content -->
              <div class="relative flex items-center justify-center gap-3">
                <v-icon
                    :name="isDownloaded ? 'md-check' : isDownloading ? 'md-download' : 'md-download'"
                    scale="1.2"
                    :class="{ 'animate-bounce': isDownloading }"
                ></v-icon>
                <span>
                  {{ isDownloaded ? 'Album Downloaded' : isDownloading ? 'Downloading...' : 'Download' }}
                </span>
              </div>
            </button>

            <!-- Download Progress -->
            <div v-if="isDownloading" class="space-y-3">
              <div class="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
                <div
                    class="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 h-3 rounded-full transition-all duration-500 ease-out relative"
                    :style="{ width: downloadProgress + '%' }"
                >
                  <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2 text-slate-300">
                  <div class="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                  <span class="font-medium">{{ downloadingSong }}</span>
                </div>
                <span class="text-indigo-300 font-semibold">{{ downloadProgress }}%</span>
              </div>
            </div>

            <!-- Success message -->
            <div v-if="isDownloaded" class="flex items-center gap-2 text-green-400 text-sm">
              <v-icon name="md-checkcircleoutline" scale="1.1"></v-icon>
              <span>All tracks downloaded successfully!</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Track List -->
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold text-white">
          Tracks
        </h2>
        <span class="px-3 py-1 rounded-full bg-slate-700/50 text-slate-300 text-sm font-medium">
          {{ playlist?.tracks?.length || 0 }} songs
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        <SongItem
            v-for="(item, index) in playlist?.tracks"
            :key="item.id || index"
            :result="item"
            :image="item?.images?.large"
            class="transform hover:scale-105 transition-transform duration-200"
        />
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!playlist?.tracks?.length && playlist" class="text-center py-16">
      <div class="mb-4">
        <v-icon name="md-musicnote" scale="3" class="text-slate-600"></v-icon>
      </div>
      <h3 class="text-xl font-semibold text-slate-400 mb-2">No Tracks Found</h3>
      <p class="text-slate-500">This album doesn't have any tracks available</p>
    </div>
  </main>
</template>