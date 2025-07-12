import { defineStore } from "pinia";
import { ref } from 'vue';
import {Album, Playlist, Song} from "@/types/common";

export const useOverlayStore = defineStore('overlay', () => {
    const isOptionsOpen = ref<boolean>(false);
    const isOverOpen = ref<boolean>(false);
    const isPlaylistOpen = ref<boolean>(false);

    const editingPlaylist = ref<Playlist | null>(null);
    const objData = ref<Song | Album>({});

    function openOverlay(obj: any) {
        objData.value = obj;
        isOptionsOpen.value = true;
    }

    function closeOverlay() {
        isOptionsOpen.value = false;
        objData.value = {};
    }

    function openOver() {
        isOverOpen.value = true;
    }

    function closeOver() {
        isOverOpen.value = false;
        editingPlaylist.value = null;
    }

    function openPlaylist(obj: Playlist) {
        editingPlaylist.value = obj;
        isPlaylistOpen.value = true;
    }

    function closePlaylist() {
        isPlaylistOpen.value = false;
    }

    return {
        openOverlay,
        closeOverlay,
        isOpen: isOptionsOpen,
        objData,
        isOverOpen,
        openOver,
        closeOver,
        editingPlaylist,
        isPlaylistOpen,
        openPlaylist,
        closePlaylist
    };
})