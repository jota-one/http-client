import { Blob } from 'buffer'
globalThis.Blob = Blob

if (typeof window.URL.createObjectURL === 'undefined') {
  window.URL.createObjectURL = vi.fn();
}
