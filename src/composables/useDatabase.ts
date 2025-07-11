import {CapacitorSQLite, SQLiteConnection, SQLiteDBConnection} from "@capacitor-community/sqlite"
import {ref} from "vue"
import {Playlist, Song} from "@/types/common"
import { parseSong } from "@/utils/parseSong";

let state: ReturnType<typeof createDatabase> | null = null

const sqlite = new SQLiteConnection(CapacitorSQLite)
const db = ref<SQLiteDBConnection | null>(null)

function createDatabase() {
    const openDB = async () => {
        try {
            db.value = await sqlite.createConnection(
                "goon_db",
                false,
                "no-encryption",
                1,
                false
            )
            await db.value.open()
            console.log("Database opened!")
        } catch (e) {
            console.error(e)
        }
    }

    const createTable = async () => {
        if (!db.value) return

        const queries = [
            `
                CREATE TABLE IF NOT EXISTS albums (
                                                      id TEXT PRIMARY KEY,
                                                      title TEXT,
                                                      artist TEXT,
                                                      artistId TEXT,
                                                      releaseDate TEXT,
                                                      cover TEXT,
                                                      genre TEXT,
                                                      trackCount INTEGER,
                                                      audioQuality TEXT,
                                                      label TEXT,
                                                      genreId INTEGER,
                                                      images TEXT
                );
            `,
            `
                CREATE TABLE IF NOT EXISTS playlists (
                                                         id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                         name TEXT,
                                                         image TEXT
                );
            `,
            `
                CREATE TABLE IF NOT EXISTS playlists_tracks (
                                                                playlist INTEGER,
                                                                track TEXT
                );
            `,
            `
                CREATE TABLE IF NOT EXISTS songs (
                                                     id TEXT PRIMARY KEY,
                                                     title TEXT,
                                                     artist TEXT,
                                                     artistId TEXT,
                                                     albumTitle TEXT,
                                                     albumId TEXT,
                                                     releaseDate TEXT,
                                                     genre TEXT,
                                                     duration REAL,
                                                     audioQuality TEXT,
                                                     version TEXT,
                                                     label TEXT,
                                                     labelId INTEGER,
                                                     upc TEXT,
                                                     mediaCount INTEGER,
                                                     parentalWarning INTEGER,
                                                        downloaded INTEGER,
                                                     streamable INTEGER,
                                                     purchasable INTEGER,
                                                     previewable INTEGER,
                                                     genreId INTEGER,
                                                     genreSlug TEXT,
                                                     genreColor TEXT,
                                                     releaseDateStream TEXT,
                                                     releaseDateDownload TEXT,
                                                     maximumChannelCount INTEGER,
                                                     images TEXT,
                                                     isrc TEXT
                );
            `,
            `
                INSERT OR IGNORE INTO playlists VALUES (
                  0,
                  'Goonable Songs',
                  'https://picsum.photos/200'
                );
            `
        ]

        for (const query of queries) {
            await db.value.execute(query)
        }

        console.log("Tables created")
    }

    const dropAllTables = async () => {
        if (!db.value) return;

        const queries = [
            `DROP TABLE IF EXISTS albums;`,
            `DROP TABLE IF EXISTS playlists;`,
            `DROP TABLE IF EXISTS playlists_tracks;`,
            `DROP TABLE IF EXISTS songs;`
        ];

        for (const query of queries) {
            await db.value.execute(query);
        }

        console.log("All tables dropped.");
    };


    const getAllTracks = async () => {
        if (!db.value) return []
        const res = await db.value.query("SELECT * FROM songs;")
        const tracks = res.values ?? []

        console.log(tracks)

        // Parse images JSON back to object
        return tracks.map((track) => ({
            ...track,
            images: track.images ? JSON.parse(track.images) : null,
            parentalWarning: !!track.parentalWarning,
            streamable: !!track.streamable,
            purchasable: !!track.purchasable,
            previewable: !!track.previewable
        }))
    }

    const fetchPlaylist = async (id: number): Promise<Playlist | null> => {
        try{
            if (!db.value) return null
            const res = await db.value.query("SELECT * FROM playlists WHERE id = ?;", [id])

            console.log("Res: ", JSON.stringify(res));

            const tracks = await fetchPlaylistTracks(id);

            console.log("Tracks: ", JSON.stringify(tracks));

            return {
                ...res,
                tracks: tracks
            }
        } catch(e){
            console.error("Error while fetching playlist: ", e)
            return null;
        }
    }

    const fetchPlaylistTracks = async (id: number): Promise<Song[]> => {
        try {
            console.log("Checking id:", id);

            if (!db.value) return [];

            const res = await db.value.query(
                "SELECT track FROM playlists_tracks WHERE playlist = ?;",
                [id]
            );

            if (!res.values || res.values.length <= 0) return [];

            console.log("Playlist you want:", JSON.stringify(res));

            // Parallel fetching of tracks for better performance
            const promises = res.values.map(async (row) => {
                const trackId = row.track;
                const temp = await db.value!.query(
                    "SELECT * FROM songs WHERE id = ?;",
                    [trackId]
                );

                console.log("Temp:", JSON.stringify(temp));

                if (temp.values && temp.values.length > 0) {
                    return parseSong(temp.values[0]);
                } else {
                    return null;
                }
            });

            console.log("Finished fetching songs");

            const result = (await Promise.all(promises)).filter(
                (track): track is Song => track !== null
            );

            console.log("Finished everything");

            return result;
        } catch (e) {
            console.error("Error while fetching playlist tracks:", e);
            return [];
        }
    };


    const getAllPlaylists = async (): Promise<Playlist[] | null> => {
        if (!db.value) return null;

        try {
            const res = await db.value.query("SELECT * FROM playlists;");
            const playlists = res.values ?? [];

            console.log("Playlists found:", JSON.stringify(playlists));

            const result: Playlist[] = await Promise.all(
                playlists.map(async (playlist) => {
                    const tracks = await fetchPlaylistTracks(playlist.id);

                    const final: Playlist = {
                        ...playlist,
                        tracks: tracks
                    }

                    return final;
                })
            );

            return result;
        } catch (e) {
            console.error("Error while fetching all playlists:", e);
            return null;
        }
    };

    const getTrack = async (song: Song): Promise<Song | null> => {
        try{
            if (!db.value) return null
            const res = await db.value.query("SELECT * FROM songs WHERE id = ?;", [song.id])
            if(res.values && res.values.length > 0) {
                return parseSong(res.values[0]);
            } else return null;
        } catch(e){
            console.error(e)
            return null;
        }
    }

    const checkIfTrackLiked = async (song: Song): Promise<boolean> => {
        try {
            if (!db.value) return false
            const res = await db.value.query("SELECT COUNT(*) as count FROM playlists_tracks WHERE track = ?;", [song.id])

            console.log("Full response:", JSON.stringify(res, null, 2))
            console.log("res.values:", JSON.stringify(res.values, null, 2))

            if (res.values && res.values.length > 0) {
                console.log("First row:", JSON.stringify(res.values[0], null, 2))
                // Try accessing as object property instead of array index
                const count = res.values[0].count as number
                console.log("Count value:", count)
                return count > 0
            }

            return false
        } catch (e) {
            console.error(e)
            return false
        }
    }

    const removeTrack = async (track: Song) => {
        if(!db.value) return;

        const statement = `
            DELETE FROM songs WHERE id=?;
        `

        const value = [track.id];

        await db.value.run(statement, value)
    }

    const likeSong = async (track: Song): Promise<boolean> => {
        if(!db.value) return false;
        if(!await insertTrack(track)) return false;

        console.log("Insert song")

        const statement = `
            INSERT INTO playlists_tracks(playlist, track) VALUES(?, ?);
        `;

        const values = [
            0,
            track.id,
        ]

        try {
            await db.value.run(statement, values)
            console.log(`Track ${track.id} like!`)
            return true
        } catch (error) {
            console.error(`Failed to like track ${track.id}:`, error)
            return false
        }
    }

    const unlikeSong = async (track: Song): Promise<boolean> => {
        if(!db.value) return false;

        const statement = `
            REMOVE FROM playlists_tracks WHERE playlist=? AND track=?;
        `;

        const values = [
            0,
            track.id
        ]

        try {
            await db.value.run(statement, values)
            console.log(`Track ${track.id} removed!`)
            return true
        } catch (error) {
            console.error(`Failed to insert track ${track.id}:`, error)
            return false
        }
    }

    const insertTrack = async (track: Song): Promise<boolean> => {
        if (!db.value) return false

        const statement = `
            INSERT OR IGNORE INTO songs (
                id, title, artist, artistId, albumTitle, albumId, releaseDate, genre,
                duration, audioQuality, version, label, labelId, upc, mediaCount,
                parentalWarning, streamable, purchasable, previewable,
                genreId, genreSlug, genreColor, releaseDateStream, releaseDateDownload,
                maximumChannelCount, images, isrc
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `

        const values = [
            track.id ?? null,
            track.title ?? null,
            track.artist ?? null,
            track.artistId ?? null,
            track.albumTitle ?? null,
            track.albumId ?? null,
            track.releaseDate ?? null,
            track.genre ?? null,
            track.duration ?? null,
            track.audioQuality ? JSON.stringify(track.audioQuality) : null,
            track.version ?? null,
            track.label ?? null,
            track.labelId ?? null,
            track.upc ?? null,
            track.mediaCount ?? null,
            track.parentalWarning ? 1 : 0,
            track.streamable ? 1 : 0,
            track.purchasable ? 1 : 0,
            track.previewable ? 1 : 0,
            track.genreId ?? null,
            track.genreSlug ?? null,
            track.genreColor ?? null,
            track.releaseDateStream ?? null,
            track.releaseDateDownload ?? null,
            track.maximumChannelCount ?? null,
            track.images ? JSON.stringify(track.images) : null,
            track.isrc ?? null
        ]

        try {
            await db.value.run(statement, values)
            console.log(`Track ${track.id} inserted!`)
            return true
        } catch (error) {
            console.error(`Failed to insert track ${track.id}:`, error)
            return false
        }
    }

    return {
        insertTrack,
        getAllTracks,
        openDB,
        createTable,
        dropAllTables,
        removeTrack,
        getTrack,
        checkIfTrackLiked,
        likeSong,
        unlikeSong,
        getAllPlaylists,
        fetchPlaylist,
        fetchPlaylistTracks
    }
}

export function useDatabase() {
    if (!state) {
        state = createDatabase()
    }

    return state
}
