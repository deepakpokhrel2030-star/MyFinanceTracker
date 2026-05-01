import 'zone.js';
import 'zone.js/testing';

const storageMock = (() => {
  let store: Record<string, string> = {};

  return {
    clear() {
      store = {};
    },
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
    },
    removeItem(key: string) {
      delete store[key];
    },
    get length() {
      return Object.keys(store).length;
    },
    key(n: number) {
      return Object.keys(store)[n] ?? null;
    }
  };
})();

beforeEach(() => {
  storageMock.clear();

  Object.defineProperty(window, 'localStorage', {
    value: storageMock,
    writable: true
  });
});