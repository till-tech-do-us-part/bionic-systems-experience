# Bionic Systems — Cinematic Motorsport Enterprise Experience

An original Blender 3D cinematic production and enterprise web platform for **Bionic Systems**, a unified autonomous AI service platform delivering **autonomous technical support** (primary focus) and **conversational voice customer service** across integrated enterprise systems.

## Project Architecture

```text
bionic-systems/
├── blender/
│   ├── generate_textures.py   # Procedural 2x2 carbon twill, BS-01 GT livery, tire sidewall, brake rotor, governance console & pit boards
│   ├── car_builder.py         # Original BS-01 GT mid-engine GT3 vehicle rig with detachable FL wheel/hub/rotor assembly
│   ├── scene_track.py         # Act I (straightaway, Turn 4 mechanical failure VFX, Pit Entry) & Act III (same-turn verified recovery)
│   ├── scene_pitlane.py       # Act II Upper Panel — 8-specialist disciplined traditional pit crew
│   ├── scene_tunnel.py        # Act II Lower Panel — Bionic Systems autonomous service tunnel + Governance Oversight Bay
│   └── assemble_film.py       # 1280x720 cinema compositor, horizontal split-screen timer & FFmpeg H.264/AAC encoder
├── audio/
│   └── generate_audio.py      # 42.0s frame-synced GT3 engine, failure foley, pit tools, precision tunnel acoustics & cinematic score
├── web/
│   ├── index.html             # Semantic enterprise web experience (Product First -> 42s Film -> Unified Platform -> Live Scenarios)
│   ├── css/styles.css         # Bespoke obsidian, titanium, liquid crimson, and verified emerald design system
│   ├── js/app.js              # Cinema player (playback, scrubber, sound toggle, chapters, silent captions) & 5-scenario explorer
│   └── assets/                # Rendered 42s film (bionic-film.mp4), hero studio poster & chapter stills
├── server.mjs                 # Zero-dependency Node HTTP server with HTTP 206 Byte-Range streaming
└── verify_site.py             # Playwright end-to-end desktop & mobile visual/functional verification
```

## Running the Preview Server

```bash
node server.mjs
# Serves http://localhost:4173 with HTTP 206 byte-range seeking
```

## Reproducing the 3D Film Pipeline

```bash
# 1. Generate bespoke textures and livery decals
python3 blender/generate_textures.py

# 2. Synthesize 42.0s mastered stereo soundtrack
/usr/bin/python3 audio/generate_audio.py

# 3. Render hero studio poster & Blender .blend assets
xvfb-run -a -s "-screen 0 1600x900x24" blender --background --python blender/car_builder.py

# 4. Render all four film sequences (18fps EEVEE)
xvfb-run -a -s "-screen 0 960x540x24" blender --background --python blender/scene_track.py -- --mode act1 --fps 18 --res 854x480 --samples 2
xvfb-run -a -s "-screen 0 960x540x24" blender --background --python blender/scene_pitlane.py -- --mode render --fps 18 --res 854x240 --samples 2
xvfb-run -a -s "-screen 0 960x540x24" blender --background --python blender/scene_tunnel.py -- --mode render --fps 18 --res 854x240 --samples 2
xvfb-run -a -s "-screen 0 960x540x24" blender --background --python blender/scene_track.py -- --mode act3 --fps 18 --res 854x480 --samples 2

# 5. Composite 1280x720 cinema master & encode MP4
python3 blender/assemble_film.py 18
```
