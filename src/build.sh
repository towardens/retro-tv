#!/bin/bash

# Emscripten build script
# Make sure emscripten is installed and activated:
# source /path/to/emsdk/emsdk_env.sh

echo "Building WASM module with Emscripten..."

# Clean previous build
rm -f ../wasm/module.wasm ../wasm/module.js

# Build with Emscripten
emcc main.c crt_core.c crt_ntsc.c  \
    -o ../wasm/module.js \
    -s EXPORTED_FUNCTIONS="['_malloc','_free','_malloc','_crt_init_wrapper','_render_frame','_get_screen_ptr','_get_width','_get_height']" \
    -s EXPORTED_RUNTIME_METHODS="['cwrap','HEAPU8','ccall']" \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME='WasmModule' \
    -s ENVIRONMENT='web,worker' \
    -s EXPORT_ES6=1 \
    -s SINGLE_FILE=0 \
    -O2

if [ $? -eq 0 ]; then
    echo "Build successful! Files created:"
    echo "  ../wasm/module.wasm"
    echo "  ../wasm/module.js"
    
    # Optional: Generate text format for debugging
    if command -v wasm2wat &> /dev/null; then
        wasm2wat ../wasm/module.wasm -o ../wasm/module.wat
        echo "  ../wasm/module.wat (text format)"
    fi
else
    echo "Build failed!"
    exit 1
fi
