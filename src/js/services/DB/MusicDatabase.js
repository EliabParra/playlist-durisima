import { eventBus } from '../../lib/EventBus.js';

export class MusicDatabase {
    constructor() {
        this.dbName = 'UniPlayerDB';
        this.dbVersion = 1;
        this.db = null;
    }

    async init() {
        if (this.db) return this.db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('tracks')) {
                    const trackStore = db.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true });
                    trackStore.createIndex('playlistId', 'playlistId', { unique: false });
                }
                if (!db.objectStoreNames.contains('playlists')) {
                    db.createObjectStore('playlists', { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
            request.onerror = (e) => reject(e);
        });
    }

    // --- PLAYLISTS ---
    async createPlaylistWithTracks(name, files) {
        if (!this.db) await this.init();
        const playlistId = 'pl-' + crypto.randomUUID();
        await this._addToStore('playlists', { id: playlistId, name: name, trackCount: files.length });
        await this.addTracksToPlaylist(playlistId, files);
        return { id: playlistId, name, trackCount: files.length };
    }

    async updatePlaylistName(id, newName) {
        if (!this.db) await this.init();
        const tx = this.db.transaction(['playlists'], 'readwrite');
        const store = tx.objectStore('playlists');
        const playlist = await this._getFromStore(store, id);
        if (playlist) {
            playlist.name = newName;
            store.put(playlist);
        }
        return new Promise(resolve => tx.oncomplete = resolve);
    }

    async deletePlaylist(id) {
        if (!this.db) await this.init();
        const tx = this.db.transaction(['playlists', 'tracks'], 'readwrite');
        tx.objectStore('playlists').delete(id);
        
        // Borrar tracks asociados (iteración manual para simplificar)
        const trackStore = tx.objectStore('tracks');
        const req = trackStore.getAll();
        req.onsuccess = () => {
            req.result.forEach(track => {
                if (track.playlistId === id) trackStore.delete(track.id);
            });
        };
        return new Promise(resolve => tx.oncomplete = resolve);
    }

    async getAllPlaylists() {
        if (!this.db) await this.init();
        return this._getAllFromStore('playlists');
    }

    async getPlaylistName(id) {
        if (!this.db) await this.init();
        const playlist = await this._getById('playlists', id);
        return playlist ? playlist.name : '';
    }

    // --- TRACKS ---
    async addTracksToPlaylist(playlistId, files) {
        if (!this.db) await this.init();
        for (const file of files) {
            await this._addToStore('tracks', {
                playlistId: playlistId,
                title: file.name,
                type: file.type.startsWith('video') ? 'video' : 'audio',
                mimeType: file.type,
                blob: file, 
                createdAt: new Date().toISOString()
            });
        }
        // Actualizar contador en playlist
        const pl = await this._getById('playlists', playlistId);
        if (pl) { pl.trackCount += files.length; this._putToStore('playlists', pl); }
    }

    async getTracksByPlaylist(playlistId) {
        if (!this.db) await this.init();
        const all = await this._getAllFromStore('tracks');
        return all
            .filter(t => t.playlistId === playlistId)
            .map(t => ({ ...t, src: URL.createObjectURL(t.blob) }));
    }

    async deleteTrack(trackId) {
        if (!this.db) await this.init();
        // Primero obtenemos el track para saber a qué playlist pertenece y restar 1
        const track = await this._getById('tracks', trackId);
        if (track) {
            const pl = await this._getById('playlists', track.playlistId);
            if (pl) { pl.trackCount = Math.max(0, pl.trackCount - 1); await this._putToStore('playlists', pl); }
        }
        
        const tx = this.db.transaction(['tracks'], 'readwrite');
        tx.objectStore('tracks').delete(trackId);
        return new Promise(resolve => tx.oncomplete = () => {
            // notify listeners that a track was deleted
            try { eventBus.emit('track:deleted', { id: trackId }); } catch(e){}
            resolve();
        });
    }

    // --- BUSQUEDA ---
    async searchTracks(query) {
        if (!this.db) await this.init();
        const all = await this._getAllFromStore('tracks');
        const q = query.toLowerCase();
        return all
            .filter(t => t.title.toLowerCase().includes(q))
            .map(t => ({ ...t, src: URL.createObjectURL(t.blob) }));
    }

    // --- HELPERS ---
    _addToStore(name, data) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([name], 'readwrite');
            const req = tx.objectStore(name).add(data);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
    _putToStore(name, data) {
        const tx = this.db.transaction([name], 'readwrite');
        tx.objectStore(name).put(data);
    }
    _getAllFromStore(name) {
        return new Promise((resolve) => {
            const tx = this.db.transaction([name], 'readonly');
            tx.objectStore(name).getAll().onsuccess = (e) => resolve(e.target.result);
        });
    }
    _getFromStore(store, id) {
        return new Promise(resolve => store.get(id).onsuccess = e => resolve(e.target.result));
    }
    _getById(storeName, id) {
        return new Promise(resolve => {
            const tx = this.db.transaction([storeName], 'readonly');
            tx.objectStore(storeName).get(id).onsuccess = e => resolve(e.target.result);
        });
    }
}

export const musicDB = new MusicDatabase();