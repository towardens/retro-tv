#include <stdint.h>
#include <emscripten/emscripten.h>
#include "crt_core.h"

#define WIDTH 1280
#define HEIGHT 720

static uint8_t screen_buffer[WIDTH*HEIGHT*4];
static uint8_t video_buffer[WIDTH*HEIGHT*4];

static struct CRT crt;
static struct NTSC_SETTINGS ntsc;
static int color = 1;
static int noise = 12;
static int global_field = 0;
static int raw = 0;
static int hue = 0;

// initialize CRT once
EMSCRIPTEN_KEEPALIVE
void crt_init_wrapper() {
    crt_init(&crt, WIDTH, HEIGHT, CRT_PIX_FORMAT_RGBA, screen_buffer);
    crt.blend = 1;
    crt.scanlines = 1;
}

// render a frame using your CRT
EMSCRIPTEN_KEEPALIVE
void render_frame(
    uint8_t* video_ptr,
    int color, int scanlines,
    int noise
) {
    ntsc.data   = video_ptr;
    ntsc.format = CRT_PIX_FORMAT_RGBA;
    ntsc.w      = WIDTH;
    ntsc.h      = HEIGHT;
    ntsc.as_color = color;
    ntsc.field    = global_field & 1;
    crt.scanlines = scanlines;


    crt.scanlines = scanlines;

    if(ntsc.field == 0) ntsc.frame ^= 1;

    crt_modulate(&crt, &ntsc);
    crt_demodulate(&crt, noise);

    global_field ^= 1;


}

EMSCRIPTEN_KEEPALIVE
uint8_t* get_screen_ptr() { return screen_buffer; }

EMSCRIPTEN_KEEPALIVE
int get_width() { return WIDTH; }

EMSCRIPTEN_KEEPALIVE
int get_height() { return HEIGHT; }


