<script setup lang="ts">
import {ref, shallowRef, useTemplateRef, watch} from "vue";
import {ProgressStatus} from "@capacitor/filesystem";
import {onLongPress} from "@vueuse/core";
import { useOverlayStore } from "@/stores/overlayStore";
import { useMusicManager } from "@/composables/useMusicManager";
import {getImagePath} from "@/utils/getFilePath";
import {Song} from "@/types/common";

// Setups
const overlay = useOverlayStore();

const {
  playSong
} = useMusicManager();

const props = defineProps({
  result: Object,
  image: String,
  compact: Boolean,
  inPlaylist: Boolean
})

const downloadProgress = ref(0);
const isDownloading = ref(false);
const isDownloaded = ref(false);

// Check and update download progress
const callbackProgress = async (progress: ProgressStatus) => {
  if (progress.lengthComputable && progress.contentLength > 0) {
    downloadProgress.value = Math.round((progress.bytes / progress.contentLength) * 100);
  }
}

// Handle playlist click
const download = async () => {
  if (isDownloading.value || isDownloaded.value) return;

  isDownloading.value = true;
  downloadProgress.value = 0;

  try {
    playSong(props.result!, callbackProgress);
    isDownloaded.value = true;
  } finally {
    isDownloading.value = false;
    downloadProgress.value = 0;
  }
}

// Format duration from seconds to mm:ss
const formatDuration = (seconds: number | undefined) => {
  if (!seconds) return '';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

const htmlRefHook = useTemplateRef<HTMLElement>('htmlRefHook')
const longPressHook = shallowRef(false)

// Handle long press (show song infos)
function onLongPressCallbackHook() {
  longPressHook.value = true;
  overlay.openOverlay(props.result!, props.inPlaylist || false);
}

onLongPress(
    htmlRefHook,
    onLongPressCallbackHook,
    {
      modifiers: {
        prevent: true
      }
    }
)

const cover_url = ref<string | undefined>();
watch(() => props.result, async () => {
  if(props.result){
    cover_url.value = await getImagePath(props?.result as Song);

    console.log("Watched: ", JSON.stringify(props?.result));
  }
})
</script>

<template>
  <div
      class="group relative overflow-hidden rounded-xl bg-slate-800/60 border border-slate-600/50 p-3 transition-all duration-300
      hover:bg-slate-700/60 hover:border-slate-500/50 hover:shadow-md hover:shadow-indigo-500/10
      active:bg-slate-700/60 active:border-slate-500/50 active:shadow-md active:shadow-indigo-500/10
      cursor-pointer"
      :class="{
        'bg-green-900/20 border-green-500/50': isDownloaded,
        'bg-indigo-900/20 border-indigo-500/50': isDownloading
      }"
      ref="htmlRefHook"
      @click="download"
  >
    <!-- Background gradient overlay -->
    <div class="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-transparent to-purple-900/20 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300"></div>

    <!-- Content grid -->
    <div class="relative z-10 grid grid-cols-[48px_1fr_auto] gap-3 items-center">
      <!-- Album cover -->
      <div class="relative">
        <div class="aspect-square rounded-lg overflow-hidden bg-slate-700/50 group-hover:shadow-md group-hover:shadow-indigo-500/20 group-active:shadow-md group-active:shadow-indigo-500/20 transition-shadow duration-300">
          <img
              class="w-full h-full object-cover"
              :src="cover_url || image || props.result?.images?.large"
              :alt="`${props.result?.title} cover`"
              loading="lazy"
          />
        </div>

        <!-- Download status overlay -->
        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-lg"
             :class="{
               'opacity-100 bg-green-900/40': isDownloaded,
               'opacity-100 bg-indigo-900/40': isDownloading
             }">
          <!-- Download icon -->
          <div v-if="!isDownloading && !isDownloaded" class="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
            <v-icon name="md-download" scale="0.8" class="text-white"></v-icon>
          </div>

          <!-- Loading spinner -->
          <div v-else-if="isDownloading" class="w-5 h-5 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin"></div>

          <!-- Success checkmark -->
          <div v-else class="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
            <v-icon name="md-check" scale="0.8" class="text-white"></v-icon>
          </div>
        </div>
      </div>

      <!-- Text content -->
      <div class="flex flex-col justify-center min-w-0">
        <h4 class="text-sm font-semibold text-white group-hover:text-indigo-300 group-active:text-indigo-300 transition-colors duration-300 line-clamp-1">
          {{ props.result?.title }}
        </h4>
        <p class="text-xs text-slate-400 group-hover:text-slate-300 group-active:text-slate-300 transition-colors duration-300 line-clamp-1">
          {{ props.result?.artist }}
        </p>
      </div>

      <!-- Right side info -->
      <div class="flex flex-col items-end space-y-1 text-xs text-slate-500">
        <!-- Duration -->
        <div v-if="props.result?.duration" class="flex items-center gap-1">
          <v-icon name="md-timelapse" scale="0.8"></v-icon>
          <span>{{ formatDuration(props.result.duration) }}</span>
        </div>

        <!-- Audio quality badge -->
        <div v-if="props.result?.audioQuality?.isHiRes" class="flex items-center gap-1 text-purple-400">
          <v-icon name="md-highquality" scale="0.8"></v-icon>
          <span class="text-xs">Hi-Res</span>
        </div>

        <!-- Release year -->
        <div v-if="props.result?.releaseDate" class="flex items-center gap-1">
          <v-icon name="md-calendarmonth" scale="0.8"></v-icon>
          <span>{{ new Date(props.result.releaseDate).getFullYear() }}</span>
        </div>
      </div>
    </div>

    <!-- Download Progress Bar -->
    <div class="relative z-10 mt-3" v-if="isDownloading">
      <div class="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
        <div
            class="bg-gradient-to-r from-indigo-600 to-purple-600 h-1.5 rounded-full transition-all duration-300 ease-out"
            :style="{ width: downloadProgress + '%' }"
        ></div>
      </div>
      <div class="flex items-center justify-between mt-1">
        <p class="text-xs text-slate-400">Downloading...</p>
        <p class="text-xs text-indigo-300 font-medium">{{ downloadProgress }}%</p>
      </div>
    </div>

    <!-- Success message -->
    <div v-if="isDownloaded" class="relative z-10 mt-2 flex items-center gap-1 text-xs text-green-400">
      <v-icon name="md-check-circle" scale="0.9"></v-icon>
      <span>Downloaded</span>
    </div>
  </div>
</template>