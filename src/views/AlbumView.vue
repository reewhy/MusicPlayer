<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useDabManager } from "@/composables/useDabManager";
import {onMounted, ref, watch, computed} from "vue";
import {Album} from "@/types/common";
import SongItem from "@/components/SongItem.vue";
import {ProgressStatus} from "@capacitor/filesystem";
import SongPlaylistItem from "@/components/SongPlaylistItem.vue";

const {
  fetchAlbum,
  downloadSong
} = useDabManager();

const route = useRoute();

const album = ref<Album>()
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
    if (album.value?.tracks) {
      for (const track of album.value.tracks) {
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

const fetchAlbumData = async (albumId: string) => {
  album.value = await fetchAlbum(albumId);
  console.log(album.value.title)
}

// Format duration from seconds to mm:ss
// To-Do: put this function in utils
const formatDuration = (seconds: number | undefined) => {
  if (!seconds) return '';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Calculate total album duration
const totalDuration = computed(() => {
  if (!album.value?.tracks) return 0;
  return album.value.tracks.reduce((total, track) => total + (track.duration || 0), 0);
});

onMounted(async () => {
  fetchAlbumData(route.params.id);
})

watch(() => route.params.id, (newId) => {
  if (newId) fetchAlbumData(newId);
})
</script>

<template>
  <main class="max-w-6xl mx-auto p-2 pb-24">
    <!-- Album Header -->
    <div class="mb-8 relative overflow-hidden rounded-2xl bg-slate-800/60 backdrop-blur-xl border border-slate-600/50 p-4">
      <!-- Background gradient -->
      <div class="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-slate-800/50 to-purple-900/30"></div>

      <!-- Content -->
      <div class="relative z-10 grid grid-cols-2 md:grid-cols-[300px_1fr] gap-6">
        <!-- Album Cover -->
        <div class="relative group">
          <div class="aspect-square rounded-2xl overflow-hidden bg-slate-700/50 shadow-2xl shadow-black/50">
            <img
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                :src="album?.cover || album?.images?.large"
                :alt="`${album?.title} album cover`"
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
                {{ album?.title }}
              </h1>
              <p class="text-xl text-indigo-300 font-medium hover:text-indigo-200 transition-colors cursor-pointer">
                {{ album?.artist }}
              </p>
            </div>

            <!-- Album metadata -->
            <div class="flex flex-wrap gap-4 text-sm text-slate-400">
              <div v-if="album?.releaseDate" class="flex items-center gap-2">
                <v-icon name="md-calendarmonth" scale="1"></v-icon>
                <span>{{ new Date(album.releaseDate).getFullYear() }}</span>
              </div>

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
          {{ album?.tracks?.length || 0 }} songs
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        <SongPlaylistItem
            v-for="(item, index) in album?.tracks"
            :key="item.id || index"
            :result="item"
            :image="album?.cover || album?.images?.large"
            :compact="true"
            class="transform hover:scale-105 transition-transform duration-200"
        />
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!album?.tracks?.length && album" class="text-center py-16">
      <div class="mb-4">
        <v-icon name="md-musicnote" scale="3" class="text-slate-600"></v-icon>
      </div>
      <h3 class="text-xl font-semibold text-slate-400 mb-2">No Tracks Found</h3>
      <p class="text-slate-500">This album doesn't have any tracks available</p>
    </div>
  </main>
</template>