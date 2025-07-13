<script setup lang="ts">
import { useDabManager } from "@/composables/useDabManager";
import {ref, shallowRef, useTemplateRef} from "vue";
import {ProgressStatus} from "@capacitor/filesystem";
import {onLongPress} from "@vueuse/core";
import { useOverlayStore } from "@/stores/overlayStore";

const overlay = useOverlayStore();

const props = defineProps({
  result: Object,
  image: String,
  compact: Boolean,
  inPlaylist: Boolean
})


const {
  downloadSong
} = useDabManager();

const downloadProgress = ref(0);
const isDownloading = ref(false);
const isDownloaded = ref(false);

const callbackProgress = async (progress: ProgressStatus) => {
  if (progress.lengthComputable && progress.contentLength > 0) {
    downloadProgress.value = Math.round((progress.bytes / progress.contentLength) * 100);
  }
}

const download = async () => {
  if (isDownloading.value || isDownloaded.value) return;

  isDownloading.value = true;
  downloadProgress.value = 0;

  try {
    await downloadSong(props.result!, callbackProgress);
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
</script>

<template>
  <div
      class="group relative overflow-hidden rounded-2xl bg-slate-800/60 border border-slate-600/50 p-4 transition-all duration-300
      hover:bg-slate-700/60 hover:border-slate-500/50 hover:shadow-lg hover:shadow-indigo-500/10
      active:bg-slate-700/60 active:border-slate-500/50 active:shadow-lg active:shadow-indigo-500/10
      cursor-pointer"
      :class="{
        'bg-green-900/20 border-green-500/50': isDownloaded,
        'bg-indigo-900/20 border-indigo-500/50': isDownloading
      }"
      ref="htmlRefHook"
      @click="download"
  >
    <!-- Background gradient overlay -->
    <div class="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-transparent to-purple-900/20 opacity-0 group-hover:opacity-100  group-active:opacity-100 transition-opacity duration-300"></div>

    <!-- Content grid -->
    <div class="relative z-10 grid grid-cols-[1fr_60px] gap-4">
      <!-- Text content -->
      <div class="flex flex-col justify-center space-y-2">
        <h4 class="text-base font-semibold text-white group-hover:text-indigo-300 group-active:text-indigo-300 transition-colors duration-300 line-clamp-2">
          {{ props.result?.title }}
        </h4>
        <p class="text-sm text-slate-400 group-hover:text-slate-300 group-active:text-slate-300 transition-colors duration-300">
          {{ props.result?.artist }}
        </p>
        <p class="text-sm text-slate-500" v-if="!props.compact">
          {{ props.result?.albumTitle }}
        </p>

        <!-- Additional metadata row -->
        <div class="flex items-center gap-3 text-xs text-slate-500">
          <!-- Duration -->
          <div v-if="props.result?.duration" class="flex items-center gap-1">
            <v-icon name="md-timelapse" scale="0.9"></v-icon>
            <span>{{ formatDuration(props.result.duration) }}</span>
          </div>

          <!-- Audio quality -->
          <div v-if="props.result?.audioQuality?.isHiRes && !props.compact" class="flex items-center gap-1 text-purple-400">
            <v-icon name="md-highquality" scale="0.9"></v-icon>
            <span>Hi-Res</span>
          </div>

          <!-- Release year -->
          <div v-if="props.result?.releaseDate && !props.compact" class="flex items-center gap-1">
            <v-icon name="md-calendarmonth" scale="0.9"></v-icon>
            <span>{{ new Date(props.result.releaseDate).getFullYear() }}</span>
          </div>
        </div>

        <!-- Genre badge -->
        <div v-if="props.result?.genre && !props.compact" class="inline-flex">
          <span class="px-2 py-1 rounded-full bg-indigo-600/20 text-indigo-300 text-xs font-medium">
            {{ props.result.genre }}
          </span>
        </div>
      </div>

      <!-- Album cover & download button -->
      <div class="relative" v-if="!props.compact">
        <div class="aspect-square rounded-xl overflow-hidden bg-slate-700/50 group-hover:shadow-lg group-hover:shadow-indigo-500/20 group-active:shadow-lg group-active:shadow-indigo-500/20 transition-shadow duration-300">
          <img
              class="w-full h-full object-cover"
              :src="image || props.result?.images?.large"
              :alt="`${props.result?.title} cover`"
              loading="lazy"
          />
        </div>

        <!-- Download status overlay -->
        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-xl"
             :class="{
               'opacity-100 bg-green-900/40': isDownloaded,
               'opacity-100 bg-indigo-900/40': isDownloading
             }">
          <!-- Download icon -->
          <div v-if="!isDownloading && !isDownloaded" class="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
            <v-icon name="md-download" scale="1.2" class="text-white"></v-icon>
          </div>

          <!-- Loading spinner -->
          <div v-else-if="isDownloading" class="w-8 h-8 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin"></div>

          <!-- Success checkmark -->
          <div v-else class="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
            <v-icon name="md-check" scale="1.2" class="text-white"></v-icon>
          </div>
        </div>
      </div>

      <div class="relative" v-else>
        <div class="aspect-square rounded-xl overflow-hidden group-hover:shadow-lg group-hover:shadow-indigo-500/20 group-active:shadow-lg group-active:shadow-indigo-500/20 transition-shadow duration-300 w-full h-full">
          <v-icon name="hi-dots-vertical" scale="1.5" class="text-white h-full w-full"></v-icon>
        </div>
      </div>

    </div>

    <!-- Download Progress Bar -->
    <div class="relative z-10 mt-4" v-if="isDownloading">
      <div class="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
        <div
            class="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
            :style="{ width: downloadProgress + '%' }"
        ></div>
      </div>
      <div class="flex items-center justify-between mt-2">
        <p class="text-xs text-slate-400">Downloading...</p>
        <p class="text-xs text-indigo-300 font-medium">{{ downloadProgress }}%</p>
      </div>
    </div>

    <!-- Success message -->
    <div v-if="isDownloaded" class="relative z-10 mt-4 flex items-center gap-2 text-xs text-green-400">
      <v-icon name="md-check-circle" scale="1.1"></v-icon>
      <span>Downloaded successfully</span>
    </div>
  </div>
</template>