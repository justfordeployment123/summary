// jest.setup.ts
import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

// Inject standard Node.js globals into the JSDOM environment
Object.assign(global, { TextEncoder, TextDecoder });
