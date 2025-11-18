// Polyfill for SlowBuffer (removed in Node.js 25+)
// This must be loaded before any other modules that depend on buffer-equal-constant-time
// buffer-equal-constant-time does: var SlowBuffer = require('buffer').SlowBuffer;

// Patch the buffer module to export SlowBuffer
const bufferModule = require('buffer');

if (bufferModule && !bufferModule.SlowBuffer) {
  // SlowBuffer was an alias to Buffer in older Node.js versions
  bufferModule.SlowBuffer = Buffer;
}

// Also make it available globally for any code that expects it there
if (typeof global !== 'undefined') {
  global.SlowBuffer = Buffer;
}
if (typeof globalThis !== 'undefined') {
  globalThis.SlowBuffer = Buffer;
}

// Also set it on Buffer for compatibility
if (!Buffer.SlowBuffer) {
  Buffer.SlowBuffer = Buffer;
}

