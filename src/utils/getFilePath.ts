import {Capacitor} from "@capacitor/core";
import {Directory, Filesystem} from "@capacitor/filesystem";
import {Album, Playlist, Song} from "@/types/common";

const DEFAULT_DIRECTORY = Directory.Documents;

export async function getFilePath(song: Song) {
    if(Capacitor.isNativePlatform()){
        const pathResult = await Filesystem.getUri({
            path: `songs/${song.id}.flac`,
            directory: DEFAULT_DIRECTORY
        })

        return pathResult.uri
    }
}

export async function returnImagePath(obj: Song | Album){
    try{
        // Determine the correct ID to use
        const fileId = obj.albumId || obj.id;

        if (!fileId) {
            throw new Error("No valid ID found for file path");
        }

        const pathResult = await Filesystem.getUri({
            path: `covers/${fileId}.jpg`,
            directory: DEFAULT_DIRECTORY
        });
        return pathResult.uri;
    } catch(error){
        return null;
    }
}


export async function getPlaylistImage(obj: Playlist, save: boolean = false): Promise<string | undefined>{
    try{
        console.log("Checking playlist: ", JSON.stringify(obj, null, 2));
        const pathResult = await Filesystem.getUri({
            path: `playlists/${obj.id}.jpg`,
            directory: DEFAULT_DIRECTORY
        });
        if(save){
            return pathResult.uri;
        } else {
            return Capacitor.convertFileSrc(pathResult.uri);
        }
    } catch(error){
        console.log("Error while getting playlist image: ", error);
        return undefined;
    }
}

export async function getImagePath(obj: Song | Album | object): Promise<string> {
    if (!obj) return 'assets/placeholder.png';

    // Helper function to safely get image URL
    const getImageUrl = (imageProperty: any): string | null => {
        if (!imageProperty) return null;

        if (typeof imageProperty === 'string') {
            return imageProperty;
        }

        if (typeof imageProperty === 'function') {
            try {
                const result = imageProperty();
                return typeof result === 'string' ? result.replace(/<\/?small>/g, '') : null;
            } catch (error) {
                console.warn('Error calling image function:', error);
                return null;
            }
        }

        return null;
    };

    try {
        if (Capacitor.isNativePlatform()) {
            // Check if covers directory exists first
            try {
                await Filesystem.stat({
                    path: 'covers',
                    directory: DEFAULT_DIRECTORY
                });
            } catch (error) {
                // Directory doesn't exist, fall back to fallback logic
                throw new Error("Covers directory not found");
            }

            // Determine the correct ID to use
            const fileId = obj.albumId || obj.id;

            if (!fileId) {
                throw new Error("No valid ID found for file path");
            }

            // Now check for the specific file
            const result = await Filesystem.stat({
                path: `covers/${fileId}.jpg`,
                directory: DEFAULT_DIRECTORY
            });

            if (result.type !== "file") {
                throw new Error("File not found or not a file");
            }

            const pathResult = await Filesystem.getUri({
                path: `covers/${fileId}.jpg`,
                directory: DEFAULT_DIRECTORY
            });

            return Capacitor.convertFileSrc(pathResult.uri);
        }
    } catch (err) {
        // Continue to fallback logic
        console.warn('Native platform image loading failed:', err);
    }

    // Fallback logic for both native and web platforms
    if (obj.images) {
        const large = getImageUrl(obj.images.large);
        const small = getImageUrl(obj.images.small);
        const fallback = getImageUrl(obj.images);

        return large || small || fallback || 'assets/placeholder.png';
    }

    // Check other possible image properties
    const albumCover = getImageUrl(obj.albumCover);
    const cover = getImageUrl(obj.cover);

    return albumCover || cover || 'assets/placeholder.png';
}