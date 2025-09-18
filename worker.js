import createModule from './wasm/module.js';

let wasm = null;

self.onmessage = async (event) => {
    const { type, data, settings, version } = event.data;

    switch (type) {
        case 'init':
            wasm = await createModule();
            wasm.ccall('crt_init_wrapper', null, [], []);
            self.postMessage({ type: 'wasm-ready' });
            break;

        case 'process-frame':
            if (!wasm) {
                self.postMessage({ type: 'error', message: 'WASM not initialized' });
                return;
            }

            try {
                const filtered = processFrame(data, settings); // returns { width, height, pixels }
                self.postMessage(
                    { type: 'frame-processed', imageData: filtered , version},
                    [filtered.pixels.buffer] // transferable
                );
            } catch (err) {
                self.postMessage({ type: 'error', message: err.message });
            }
            break;

        default:
            self.postMessage({ type: 'error', message: `Unknown command: ${type}` });
    }
};

// Process video frame through WASM CRT filter
function processFrame(rgbaBuffer, settings) {
    const width = wasm.cwrap('get_width', 'number', [])();
    const height = wasm.cwrap('get_height', 'number', [])();
    const size = width * height * 4;

    // Allocate WASM memory and copy frame
    const videoPtr = wasm._malloc(size);
    wasm.HEAPU8.set(new Uint8ClampedArray(rgbaBuffer), videoPtr);

    // Apply CRT filter
    wasm.ccall(
        'render_frame',
        null,
        ['number', 'number', 'number', 'number'],
        [
            videoPtr,
            settings.color ? 1 : 0,
            settings.scanlines ? 1 : 0,
            settings.noise
        ]
    );

    // Read output buffer
    const screenPtr = wasm.cwrap('get_screen_ptr', 'number', [])();
    const outputHeap = new Uint8ClampedArray(wasm.HEAPU8.buffer, screenPtr, size);

    // Copy buffer before freeing input
    const copy = new Uint8ClampedArray(outputHeap);

    wasm._free(videoPtr);

    return { width, height, pixels: copy };
}
