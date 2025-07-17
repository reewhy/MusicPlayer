import {Capacitor} from "@capacitor/core";
import {Directory, Filesystem} from "@capacitor/filesystem";
import {Album, Song} from "@/types/common";

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

export async function getImagePath(obj: Song | Album | object): Promise<string> {
    if(obj === null) return 'assets/placeholder.png';

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
        // Fallback logic for both native and web platforms
        if(obj.images){
            return obj.images?.large || obj.images?.small || 'assets/placeholder.png';
        } else {
            return obj.albumCover || obj.cover || 'assets/placeholder.png';
        }
    }

    // Fallback for web platform (when not native)
    if(obj.images){
        return obj.images?.large || obj.images?.small || 'assets/placeholder.png';
    } else {
        return obj.albumCover || obj.cover || 'assets/placeholder.png';
    }
}