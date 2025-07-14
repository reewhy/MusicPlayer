import {Song} from "@/types/common.d.js";
import {Directory, Filesystem} from "@capacitor/filesystem";

export async function isDownloaded(song: Song): Promise<boolean> {
    try {
        if (!song.id) {
            return false;
        }

        // Check if songs directory exists first
        try {
            await Filesystem.stat({
                path: 'songs',
                directory: Directory.Documents
            });
        } catch (error) {
            // Directory doesn't exist, so file can't be downloaded
            return false;
        }

        // Now check for the specific file
        const result = await Filesystem.stat({
            path: `songs/${song.id}.flac`,
            directory: Directory.Documents
        });

        // Check if it's actually a file (not a directory)
        return result.type === 'file';
    } catch (error) {
        // File doesn't exist or other error
        return false;
    }
}