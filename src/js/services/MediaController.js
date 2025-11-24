// MediaController: wraps an <audio> or <video> element and exposes a neutral API.
// It emits high-level events through the EventBus (imported) without assuming UI.
// Supports swapping sources and basic playback controls.

import { eventBus } from '../lib/EventBus.js';

export class MediaController {
  constructor({ initialType = 'audio' } = {}) {
    this.type = initialType; // 'audio' | 'video'
    this.mediaEl = null;
    // restore last known volume/mute from localStorage when possible
    try {
      const sv = localStorage.getItem('player_volume');
      this._lastVolume = sv !== null ? Math.max(0, Math.min(parseFloat(sv), 1)) : 1;
    } catch (e) { this._lastVolume = 1; }
    try {
      const sm = localStorage.getItem('player_muted');
      this._lastMuted = sm !== null ? (sm === '1') : false;
    } catch (e) { this._lastMuted = false; }
    this._createElement();
    this._bindNativeEvents();
  }

  _createElement() {
    if (this.mediaEl) {
      this.mediaEl.remove();
    }
    const el = document.createElement(this.type === 'video' ? 'video' : 'audio');
    el.preload = 'metadata';
    el.crossOrigin = 'anonymous';
    el.style.display = this.type === 'video' ? 'block' : 'none'; // video hidden until UI decides
    // ensure new element picks up last known volume/mute state
    if (typeof this._lastVolume === 'number') el.volume = this._lastVolume;
    if (typeof this._lastMuted === 'boolean') el.muted = this._lastMuted;
    this.mediaEl = el;
  }

  attachTo(container) {
    if (!container) return;
    this._container = container; // store reference for re-attachments
    container.appendChild(this.mediaEl);
  }

  _bindNativeEvents() {
    const e = this.mediaEl;
    e.addEventListener('loadedmetadata', () => {
      eventBus.emit('media:loaded', {
        duration: e.duration,
        type: this.type
      });
    });
    e.addEventListener('play', () => eventBus.emit('play'));
    e.addEventListener('pause', () => eventBus.emit('pause'));
    e.addEventListener('ended', () => eventBus.emit('ended'));
    e.addEventListener('error', () => eventBus.emit('error', e.error));
    e.addEventListener('timeupdate', () => {
      // Throttle can be implemented later for performance
      eventBus.emit('progress', {
        currentTime: e.currentTime,
        duration: e.duration
      });
    });
    e.addEventListener('volumechange', () => {
      eventBus.emit('volume:change', {
        volume: e.volume,
        muted: e.muted
      });
    });
  }

  load(src, { type } = {}) {
    if (type && type !== this.type) {
      this.type = type;
      this._createElement();
      // NOTE: Caller must re-attach mediaEl if needed after recreation
      this._bindNativeEvents();
      if(this._container){
        this._container.appendChild(this.mediaEl);
      }
    }
    this.mediaEl.src = src;
    this.mediaEl.load();
  }

  play() {
    return this.mediaEl.play();
  }

  pause() {
    this.mediaEl.pause();
  }

  seek(seconds) {
    if (typeof seconds === 'number') {
      this.mediaEl.currentTime = Math.max(0, Math.min(seconds, this.mediaEl.duration || seconds));
      // TODO: persist lastPosition periodically or on pause
    }
  }

  setVolume(v) {
    const vol = Math.max(0, Math.min(v, 1));
    this.mediaEl.volume = vol;
    this._lastVolume = vol;
    try { localStorage.setItem('player_volume', String(vol)); } catch(e){}
    // emit event to notify UI
    eventBus.emit('volume:change', { volume: this.mediaEl.volume, muted: this.mediaEl.muted });
  }

  toggleMute() {
    this.mediaEl.muted = !this.mediaEl.muted;
    this._lastMuted = this.mediaEl.muted;
    try { localStorage.setItem('player_muted', this._lastMuted ? '1' : '0'); } catch(e){}
    // emit event to notify UI
    eventBus.emit('mute:change', { muted: this.mediaEl.muted });
  }

  get currentTime() { return this.mediaEl.currentTime; }
  get duration() { return this.mediaEl.duration; }
  get volume() { return this.mediaEl.volume; }
  get muted() { return this.mediaEl.muted; }

  destroy() {
    if (this.mediaEl) {
      this.mediaEl.pause();
      this.mediaEl.removeAttribute('src');
      this.mediaEl.load();
      this.mediaEl.remove();
      this.mediaEl = null;
    }
    eventBus.emit('media:destroyed');
  }
}

export const createMediaController = (opts) => new MediaController(opts);
