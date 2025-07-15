<script setup lang="ts">
import { useDatabase } from "@/composables/useDatabase";

const {
  dropAllTables
} = useDatabase();
</script>

<template>
  <h1>
    <button @click="dropAllTables">
      Reset app
    </button>
  </h1>
</template>

<style scoped>

</style>