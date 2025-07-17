import {CapacitorSQLite, SQLiteConnection, SQLiteDBConnection} from "@capacitor-community/sqlite"
import {ref} from "vue"
import {Album, Playlist, Song} from "@/types/common"
import { parseSong } from "@/utils/parseSong";

let state: ReturnType<typeof createDatabase> | null = null

const sqlite = new SQLiteConnection(CapacitorSQLite)
const db = ref<SQLiteDBConnection | null>(null)

// Rememeber: Guards for playlist 0 (we do not talk about playlist 0)

function createDatabase() {
    // Open database connection
    const openDB = async () => {
        try {
            // Check if connection is already open (this doesnt work!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!)
            if (db.value) {
                console.log("Database connection already exists.");
                return;
            }

            // Since the previous function doesn't work, just close and reopen
            // To-DO, fix that mf
            try {
                // Try to close any existing connection
                await sqlite.closeConnection("goon_db", false);
            } catch (closeError) {
                console.log(closeError);
            }

            // Connect to database
            db.value = await sqlite.createConnection(
                "goon_db",
                false,
                "no-encryption",
                1,
                false
            );

            await db.value.open();
            console.log("Database opened!");
        } catch (e) {
            console.error(e);
        }
    };

    // Create default DBs and playlist
    // To-Do: Fix everything to make it more performant and ... space-consuming???? Efficient?? IDK
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

        // Execute all queries
        for (const query of queries) {
            await db.value.execute(query)
        }

        console.log("Tables created")
    }

    // Drop all tables for debug
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


    // Get all tracks (useless)
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

    // Create a playlist
    const createPlaylist = async (name: string): Promise<number | false> => {
        if(!db.value) return false;

        const statement = `
            INSERT INTO playlists(name) VALUES(?);
        `;
        const values = [
            name
        ];

        try {
            const result = await db.value.run(statement, values);
            // Return the ID of the newly created playlist
            return result.changes?.lastId || false;
        } catch (error) {
            console.error('Error creating playlist:', error);
            return false;
        }
    }

    // Update a playlist name
    const updatePlaylistName = async (id: number, name: string): Promise<boolean> => {
        if(!db.value) return false;
        if(id === null || name === null) return false;

        const statement = `
            UPDATE playlists SET name=? WHERE id=?;
        `;

        const values = [
            name,
            id
        ]

        try {
            await db.value.run(statement, values)
            return true
        } catch (error) {
            return false
        }
    }

    // Update a playlist cover url
    const updatePlaylistCoverUrl = async (id: number, url: string): Promise<boolean> => {
        if(!db.value) return false;
        if(id === null || url === null) return false;

        const statement = `
            UPDATE playlists SET image=? WHERE id=?;
        `;

        const values = [
            url,
            id
        ]

        try {
            await db.value.run(statement, values)
            return true
        } catch (error) {
            return false
        }
    }

    // Delete a playlist
    const deletePlaylist = async (id: number): Promise<boolean> => {
        if(!db.value) return false;
        if(id === null || id === 0) return false;

        const statement = `
            DELETE FROM playlists WHERE id=?;
        `;

        const values = [
            id
        ]

        try {
            await db.value.run(statement, values)
            return true
        } catch (error) {
            return false
        }
    }

    // Fetch a playlist
    const fetchPlaylist = async (id: number): Promise<Playlist | null | undefined> => {
        try{
            if (!db.value) return null
            const res = await db.value.query("SELECT * FROM playlists WHERE id = ?;", [id])

            if(res.values && res.values!.length > 0) {
                const playlist = res.values[0];

                const tracks = await fetchPlaylistTracks(id);

                return {
                    ...playlist,
                    tracks: tracks
                }
            } else {
                return null;
            }

        } catch(e){
            console.error("Error while fetching playlist: ", e)
            return null;
        }
    }

    // Fetch all tracks in a playlist
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

    // Get all user's playlists
    const getAllPlaylists = async (): Promise<Playlist[] | null> => {
        if (!db.value) return null;

        try {
            const res = await db.value.query("SELECT * FROM playlists;");
            const playlists = res.values ?? [];

            console.log("Playlists found:", JSON.stringify(playlists, null, 2));

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

    const fetchAlbumTracks = async (id: number): Promise<Song[]> => {
        try {
            console.log("Checking id:", id);

            if (!db.value) return [];

            const res = await db.value.query(
                "SELECT * FROM songs WHERE albumId = ?;",
                [id]
            );


            if (!res.values || res.values.length <= 0) return [];

            const promises = res.values.map(async (track) => {
                if(track.values && track.values.length > 0) {
                    return parseSong(track.values[0]);
                } else {
                    return null;
                }
            })

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

    const getAllAlbums = async (): Promise<Album[] | null> => {
        if (!db.value) return null;

        try {
            const res = await db.value.query("SELECT * FROM albums;");
            const albums = res.values ?? [];

            console.log("Albums found:", JSON.stringify(albums, null, 2));

            const result: Album[] = await Promise.all(
                albums.map(async (album) => {
                    const tracks = await fetchAlbumTracks(album.id);

                    const final: Album = {
                        ...album,
                        tracks: tracks
                    }

                    return final;
                })
            );

            return result;
        } catch (e) {
            console.error("Error while fetching all albums:", e);
            return null;
        }
    };

    // Get a saved track
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

    // Check if the track is liked
    // To-Do: See if it works still
    const checkIfTrackLiked = async (song: Song): Promise<boolean> => {
        try {
            if (!db.value) return false
            const res = await db.value.query("SELECT COUNT(*) as count FROM playlists_tracks WHERE track = ? AND playlist=0;", [song.id])

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


    const checkIfAlbumLiked = async (album: Album | string): Promise<boolean> => {
        try {
            if (!db.value) return false
            const res = await db.value.query("SELECT COUNT(*) as count FROM albums WHERE id=?;", [typeof(album) === "object" ? album.id : album])

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



    // Remove a track (use this later for garbage collection??? Is this the correct name)
    const removeTrack = async (track: Song) => {
        if(!db.value) return;

        const statement = `
            DELETE FROM songs WHERE id=?;
        `

        const value = [track.id];

        await db.value.run(statement, value)
    }

    // Like a song (yipppieee) (to-do, use AddToPlaylist function instead)
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



    // Add song to a playlist
    const addToPlaylist = async (track: Song, playlist: Playlist): Promise<boolean> => {
        if (!db.value) return false;
        if (!await insertTrack(track)) return false;

        console.log("Insert song")

        const statement = `
            INSERT INTO playlists_tracks(playlist, track)
            VALUES (?, ?);
        `;

        const values = [
            playlist.id,
            track.id,
        ]

        try {
            await db.value.run(statement, values)
            console.log(`Track ${track.id} added to ${playlist.id}!`)
            return true
        } catch (error) {
            console.error(`Failed to add track ${track.id} into ${playlist.id}:`, error)
            return false
        }
    }

    // Remove a song from a playlist
    const removeFromPlaylist = async (track: Song | string, playlist: Playlist | number): Promise<boolean> => {
        if(!db.value) return false;
        if(!await insertTrack(track)) return false;

        const trackId = typeof(track) === "object" ? track.id : track
        const playlistId = typeof(playlist) === "object" ? playlist.id : playlist

        console.log("Insert song")

        const statement = `
            DELETE FROM playlists_tracks WHERE playlist=? AND track=?;
        `;

        const values = [
            playlistId,
            trackId,
        ]

        try {
            await db.value.run(statement, values)
            console.log(`Track ${trackId} removed from ${playlistId}!`)
            return true
        } catch (error) {
            console.error(`Failed to remove track ${trackId} from ${playlistId}:`, error)
            return false
        }
    }

    // Unlike a song
    // To-Do: Use removeFromAPlaylist function
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

    // Insert a track
    // To-Do: Implement isDownloaded
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

    const unlikeAlbum = async (album: Album): Promise<boolean> => {
        if (!db.value) return false

        const statement = `
            DELETE FROM albums WHERE id=?
        `;

        const values = [ album.id ];

        try {
            await db.value.run(statement, values)
            console.log(`Album ${album.id} removed!`)
            return true
        } catch (error) {
            console.error(`Failed to remove album ${album.id}:`, error)
            return false
        }
    }

    const likeAlbum = async (album: Album): Promise<boolean> => {
        if (!db.value) return false

        const statement = `
            INSERT OR IGNORE INTO albums (
                id, title, artist, artistId, releaseDate, cover,
                genre, trackCount, audioQuality, label, genreId, images)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `

        album?.tracks?.forEach(async (track) => {
            await insertTrack(track);
        })

        const values = [
            album.id ?? null,
            album.title ?? null,
            album.artist ?? null,
            album.artistId ?? null,
            album.releaseDate ?? null,
            album.genre ?? null,
            album.audioQuality ? JSON.stringify(album.audioQuality) : null,
            album.label ?? null,
            album.trackCount ?? null,
            album.genreId ?? null,
            album.images ? JSON.stringify(album.images) : JSON.stringify({large: album.cover}),
            album.cover ?? null
        ]

        try {
            await db.value.run(statement, values)
            console.log(`Album ${album.id} inserted!`)
            return true
        } catch (error) {
            console.error(`Failed to insert album ${album.id}:`, error)
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
        fetchPlaylistTracks,
        createPlaylist,
        updatePlaylistName,
        deletePlaylist,
        addToPlaylist,
        removeFromPlaylist,
        checkIfAlbumLiked,
        likeAlbum,
        unlikeAlbum,
        getAllAlbums,
        fetchAlbumTracks,
        updatePlaylistCoverUrl
    }
}

export function useDatabase() {
    if (!state) {
        state = createDatabase()
    }

    return state
}
