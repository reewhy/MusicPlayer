<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useDabManager } from "@/composables/useDabManager";
import {onMounted, ref, watch} from "vue";
import {Album} from "@/types/common";
import SongItem from "@/components/SongItem.vue";

const {
  fetchAlbum
} = useDabManager();

const route = useRoute();

const album = ref<Album>()

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
  <main>
    <h1>{{ album?.title }}</h1>
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