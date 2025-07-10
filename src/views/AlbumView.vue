<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useDabManager } from "@/composables/useDabManager";
import {onMounted, ref, watch} from "vue";
import {Album} from "@/types/common";
import SongItem from "@/components/SongItem.vue";
import {ProgressStatus} from "@capacitor/filesystem";

const {
  fetchAlbum,
  downloadSong
} = useDabManager();

const route = useRoute();

const album = ref<Album>()
const downloadProgress = ref(0);
const isDownloading = ref(false);
const downloadingSong = ref<string>();

const callbackProgress = async (progress: ProgressStatus) => {
  if (progress.lengthComputable && progress.contentLength > 0) {
    downloadProgress.value = Math.round((progress.bytes / progress.contentLength) * 100);
  }
}

const download = async () => {
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

    isDownloading.value = false;
    downloadProgress.value = 0;
  } catch(error) {
    console.error(error);
  }
}

const fetchAlbumData = async (albumId: string) => {
  album.value = await fetchAlbum(albumId);
  console.log(album.value.title)
}

onMounted(async () => {
  fetchAlbumData(route.params.id);
})

watch(() => route.params.id, (newId) => {
  if (newId) fetchAlbumData(newId);
})
</script>

<template>
  <main class="p-8">
    <div class="mb-8 grid grid-cols-2 grid-rows-4 gap-4 bg-slate-700 p-4 rounded-lg">
      <img class="rounded-2xl object-cover row-span-3 col-start-1 row-start-1" :src="album?.cover" alt="result image"/>
      <div class="row-span-3 col-start-2 row-start-1">
        <h1 class="font-bold text-2xl">{{ album?.title }}</h1>
        <p class="underline text-lg">{{ album?.artist }}</p>
        <p>{{ album?.genre }}</p>
        <button
            class="w-full px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
            :disabled="isDownloading"
            @click="download"
        >Download album</button>
      </div>
      <!-- Download Progress Bar -->
      <div class="col-span-2 row-start-4 mt-3" v-if="isDownloading">
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div
              class="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              :style="{ width: downloadProgress + '%' }"
          ></div>
        </div>
        <p class="text-xs text-gray-200 mt-1 text-center">{{ downloadingSong }} - {{ downloadProgress }}%</p>
      </div>
    </div>
    <div class="grid grid-cols-1 gap-4">
      <SongItem
        v-for="(item, index) in album?.tracks"
        :key="index"
        :result="item"
        :image="album?.cover"
        ></SongItem>
    </div>
  </main>
</template>

<style scoped>

</style>