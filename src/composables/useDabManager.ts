import {Album, Song} from "@/types/common";
import {Capacitor, CapacitorHttp} from "@capacitor/core";

let state: ReturnType<typeof createDabManager> | null = null;

function createDabManager() {
    const ROOT_URL = Capacitor.isNativePlatform()
        ? "https://dab.yeet.su/api"
        : "/api"

    async function searchTracks(query: string, offset: number = 0): Promise<Song[] | null> {
        const finalUrl = `${ROOT_URL}/search?q=${encodeURIComponent(query)}&offset=${offset}&type=track`;
        const response = await fetchData(finalUrl);

        console.log(response);
        return response.tracks || null;
    }

    async function searchAlbums(query: string, offset: number = 0): Promise<Album[] | null> {
        const finalUrl = `${ROOT_URL}/search?q=${encodeURIComponent(query)}&offset=${offset}&type=album`;
        const response = await fetchData(finalUrl);

        console.log(response);
        return response.albums || null;
    }

    async function fetchAlbum(albumId: string): Promise<Album> {
        const finalUrl = `${ROOT_URL}/album?albumId=${albumId}`;
        const response = await fetchData(finalUrl);
        return await response.album;
    }

    async function fetchData(url: string) {
        if (Capacitor.isNativePlatform()) {
            const response = await CapacitorHttp.get({
                url: url,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } else {
            const response = await fetch(url);
            return await response.json();
        }
    }

    return {
        searchTracks,
        searchAlbums,
        fetchAlbum
    };
}

export function useDabManager() {
    if(!state) {
        state = createDabManager();
    }
    return state;
}