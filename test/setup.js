// Jest setup file - runs before each test file

// Polyfill TextEncoder/TextDecoder for jsdom
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock console.warn to suppress IndexedDB warnings
global.console.warn = jest.fn();

// Global test timeout
jest.setTimeout(10000);
