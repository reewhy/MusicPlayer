<script setup lang="ts">
import { useDabManager } from "@/composables/useDabManager";
import { ref } from "vue";
import {ProgressStatus} from "@capacitor/filesystem";

const props = defineProps({
  result: Object,
  image: String
})

const {
  downloadSong
} = useDabManager();

const downloadProgress = ref(0);
const isDownloading = ref(false);

const callbackProgress = async (progress: ProgressStatus) => {
  if (progress.lengthComputable && progress.contentLength > 0) {
    downloadProgress.value = Math.round((progress.bytes / progress.contentLength) * 100);
  }
}

const download = async () => {
  isDownloading.value = true;
  downloadProgress.value = 0;

  try {
    await downloadSong(props.result!, callbackProgress);
  } finally {
    isDownloading.value = false;
    downloadProgress.value = 0;
  }
}
</script>

<template>
  <div
      class="border border-gray-300 rounded-lg p-4 bg-gray-50 grid grid-cols-[70%_30%]"
      @click="download"
  >
    <div>
      <h4 class="text-base font-semibold mb-2 text-gray-800">{{ props.result!!.title }}</h4>
      <p class="text-sm text-gray-600 mb-1">{{ props.result!!.artist }}</p>
      <p class="text-sm text-gray-600">{{ props.result!!.albumTitle }}</p>
    </div>
    <div>
      <img class="rounded-2xl object-cover" :src="image || props.result!!.images.large" alt="result image"/>
    </div>

    <!-- Download Progress Bar -->
    <div class="col-span-2 mt-3" v-if="isDownloading">
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div
            class="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            :style="{ width: downloadProgress + '%' }"
        ></div>
      </div>
      <p class="text-xs text-gray-500 mt-1 text-center">{{ downloadProgress }}%</p>
    </div>
  </div>
</template>