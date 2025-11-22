// Simple EventBus utility for decoupled component communication
// API: on(event, handler), off(event, handler), emit(event, ...args)
// Lightweight and framework agnostic.

export class EventBus {
  constructor() {
    this.events = new Map();
  }

  on(event, handler) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(handler);
    return () => this.off(event, handler); // unsubscribe convenience
  }

  off(event, handler) {
    const set = this.events.get(event);
    if (set) {
      set.delete(handler);
      if (set.size === 0) this.events.delete(event);
    }
  }

  emit(event, ...args) {
    const set = this.events.get(event);
    if (!set) return;
    // Clone to avoid mutation issues if a handler unsubscribes during emit
    [...set].forEach(fn => {
      try {
        fn(...args);
      } catch (err) {
        // Fail quietly but log for debugging
        console.error('[EventBus] handler error for', event, err);
      }
    });
  }
}

// Singleton instance for app-wide usage
export const eventBus = new EventBus();
