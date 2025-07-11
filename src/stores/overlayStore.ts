import { defineStore } from "pinia";
import { ref } from 'vue';
import {Album, Song} from "@/types/common";

export const useOverlayStore = defineStore('overlay', () => {
    const isOpen = ref<boolean>(false);
    const objData = ref<Song | Album>({});

    function openOverlay(obj: any) {
        objData.value = obj;
        isOpen.value = true;
    }

    function closeOverlay() {
        isOpen.value = false;
        objData.value = {};
    }

    return { openOverlay, closeOverlay, isOpen, objData };
})