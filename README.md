# LUMA DESK — Stage Lighting Console

A grandMA-style lighting console with a real-time 3D stage at **Sultan's Pool, Jerusalem**, running entirely in the browser.

**▶ Open the app:** https://gilad1987.github.io/luma-desk/

## What's inside
- **359 fixtures**: spots, beams, washes, LED pars, blinders, strobes, a circular truss with an inner ring, six angled trusses, standing light towers, delay towers and an LED wall with IMAG screens.
- **Console**: MA-style command line (`Group 24 At Full`, `Store Cue 5 Fade 3`, `Goto Cue 3`), programmer with feature encoders, Group and Preset pools, phasers, 10 executors with cue lists, tracking, HTP/LTP, Grand Master, Blackout and TAP tempo.
- **Auto Show**: 9 automatic lighting styles that change looks on the bar, sync to a loaded song (BPM detection) and can be saved as cues.
- **Venue**: Sultan's Pool with a seated crowd, terraced seating, the Old City walls and the Tower of David, an 8-piece band with a full drum kit, and a 30-piece orchestra.
- **App**: installable PWA that works offline. Records the show to video (`● REC`), downloads and loads show files, runs full screen, and supports Web MIDI.
- **Built-in guide** in Hebrew, with a guided on-screen tour.

## Run locally
It's a static site. Serve the folder over HTTP (opening the file directly won't work, because ES modules need a server):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Install as an app
- **Chrome / Edge (desktop)**: click **⬇ התקן אפליקציה** in the top bar, or the install icon in the address bar.
- **iPad / iPhone**: Share → **Add to Home Screen**.

## Tech
A single `index.html` built with [three.js](https://threejs.org) r160 (vendored in `vendor/`, MIT license), with no build step. `sw.js` caches the app for offline use.
