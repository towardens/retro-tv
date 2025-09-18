const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const playBtn = document.getElementById('play-pause');
const seek = document.getElementById('seek');
const volume = document.getElementById('volume');
const fullscreen = document.getElementById('fullscreen');

const worker = new Worker('worker.js', { type: 'module' });
worker.postMessage({ type: 'init' });

const WASM_WIDTH = 1280;
const WASM_HEIGHT = 720;
canvas.width = WASM_WIDTH;
canvas.height = WASM_HEIGHT;

// --- Load video ---
document.getElementById('video-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        video.src = URL.createObjectURL(file);
        video.load();
        video.play();
    }
});

// --- Handle filtered frames ---
worker.onmessage = (event) => {
    const { type, imageData, message , version } = event.data;

    if (type === 'frame-processed') {
        const { width, height, pixels } = imageData;
        if (version !== frameVersion) return; // discard stale frame
        if (!pixels || pixels.length === 0) return;

        const filteredImage = new ImageData(new Uint8ClampedArray(pixels), width, height);
        ctx.putImageData(filteredImage, 0, 0);
    } else if (type === 'error') {
        console.error('Worker error:', message);
    }
};

let frameVersion = 0;  // global counter

// On video seek
seek.addEventListener('input', () => {
    video.currentTime = (seek.value / 100) * video.duration;

    // Increment frame version to discard old frames
    frameVersion++;
});

// --- Resize canvas ---
function resizeCanvas() {
    const container = document.getElementById('video-container');
    const videoRatio = video.videoWidth / video.videoHeight;
    const containerRatio = container.clientWidth / container.clientHeight;

    if (containerRatio > videoRatio) {
        canvas.style.height = container.clientHeight + 'px';
        canvas.style.width = container.clientHeight * videoRatio + 'px';
    } else {
        canvas.style.width = container.clientWidth + 'px';
        canvas.style.height = container.clientWidth / videoRatio + 'px';
    }
}

window.addEventListener('resize', resizeCanvas);
document.addEventListener('fullscreenchange', resizeCanvas);
resizeCanvas();

function getFilterSettings() {
    return {
        color: document.getElementById('color').checked,
        scanlines: document.getElementById('scanlines').checked,
        noise: parseInt(document.getElementById('noise').value),
    };
}

// --- Custom controls ---
playBtn.addEventListener('click', () => {
    if (video.paused) video.play();
    else video.pause();
});
video.addEventListener('play', () => playBtn.textContent = 'Pause');
video.addEventListener('pause', () => playBtn.textContent = 'Play');

video.addEventListener('timeupdate', () => {
    if (!seek.dragging) seek.value = (video.currentTime / video.duration) * 100;
});
seek.addEventListener('input', () => {
    video.currentTime = (seek.value / 100) * video.duration;
});
volume.addEventListener('input', () => {
    video.volume = volume.value;
});
fullscreen.addEventListener('click', () => {
    const container = document.getElementById('video-container');
    if (!document.fullscreenElement) container.requestFullscreen();
    else document.exitFullscreen();
});

// --- Render loop ---
function renderLoop() {
    if (!video.paused && !video.ended) {
        const currentVersion = frameVersion;
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = WASM_WIDTH;
        tmpCanvas.height = WASM_HEIGHT;
        const tmpCtx = tmpCanvas.getContext('2d');

        tmpCtx.drawImage(video, 0, 0, WASM_WIDTH, WASM_HEIGHT);
        const frame = tmpCtx.getImageData(0, 0, WASM_WIDTH, WASM_HEIGHT);

        

        worker.postMessage({
            type: 'process-frame', data: frame.data.buffer, settings: getFilterSettings(), version: currentVersion
        }, [frame.data.buffer]);
    }
    requestAnimationFrame(renderLoop);
}

video.addEventListener('play', () => renderLoop());
