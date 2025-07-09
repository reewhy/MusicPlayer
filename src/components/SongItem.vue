<script setup lang="ts">
const props = defineProps({
  result: Object,
  image: String
})
</script>

<template>
  <div
      class="border border-gray-300 rounded-lg p-4 bg-gray-50 grid grid-cols-[70%_30%]"
  >
    <div>
      <h4 class="text-base font-semibold mb-2 text-gray-800">{{ props.result!!.title }}</h4>
      <p class="text-sm text-gray-600 mb-1">{{ props.result!!.artist }}</p>
      <p class="text-sm text-gray-600">{{ props.result!!.albumTitle }}</p>
    </div>
    <div>
      <img class="rounded-2xl object-cover" :src="image || props.result!!.images.large"  alt="result image"/>
    </div>
  </div>
</template>