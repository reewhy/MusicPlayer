import {Album, AlbumsResponse, Song, TracksResponse} from "@/types/common";

let state: ReturnType<typeof createDabManager> | null = null;

function createDabManager() {
    const ROOT_URL = "/api";

    async function searchTracks(query: string, offset: number = 0): Promise<Song[] | null> {
        const response = await search(query, offset, "track");

        const tracksResponse: TracksResponse = JSON.parse(response);
        return tracksResponse.tracks || null;
    }

    async function searchAlbums(query: string, offset: number = 0): Promise<Album[] | null> {
        const response = await search(query, offset, "album");

        const albumsResponse: AlbumsResponse = JSON.parse(response);
        return albumsResponse.albums || null;
    }

    async function search(query: string, offset: number = 0, type: string) : Promise<string> {
        const searchQuery = query.replace(" ", "%20");
        const finalUrl = `${ROOT_URL}/search?q=${searchQuery}&offset=${offset}&type=${type}`;

        const response = await fetch(finalUrl);

        return response.text();
    }

    return {
        searchTracks,
        searchAlbums
    };
}

export function useDabManager() {
    if(!state) {
        state = createDabManager();
    }
    return state;
}