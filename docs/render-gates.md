# Render gates

Automatic checks that protect the render quality and the geometric accuracy of imported MVR stages. Every gate
uses the synthetic stage `tests/shared/mvr/renderStageMvr.ts`, so all its data is invented and can be committed.

| Gate          | Protects                                                 | Where               | Limit                                                          |
| ------------- | -------------------------------------------------------- | ------------------- | -------------------------------------------------------------- |
| Image gate    | The look: objects, beams, exposure, colour (four views)  | CI (`test:e2e:ci`)  | 5 % exposure, 10° hue, 6 changed 4x4 blocks fail (see below)   |
| Count budgets | Draw calls, triangles, programs, geometries, textures    | CI (`test:e2e:ci`)  | 0.85x to 1.15x of measured calls and triangles; others ≤ 1.15x |
| Accuracy      | Fixture position, orientation, count, body size vs file  | CI (`test:e2e:ci`)  | 1 mm, 0.05°, equal count, body within 2 % of the GDTF box      |
| Frame time    | Real-GPU frame time with 250 fixtures at full, 2560x1440 | Local (`test:perf`) | median ≤ 12 ms, p95 ≤ 16 ms; 500 fixtures recorded only        |

## Image gate (`tests/e2e/mvr-image-gate.spec.ts`)

The metric (`tests/shared/image/`) decodes both PNGs with Node's zlib and converts every pixel from sRGB to linear
light to Oklab. It gives five numbers, and the spec attaches a heat-map PNG when a limit breaks:

- `exposure`: ln(Yb / Ya), where Y is the mean linear-light luminance of the whole shot.
- `hue`: the signed hue turn in degrees. It sums the cross and dot products of the a-b vectors of each pixel pair,
  so each pixel counts by the product of its two chromas, and grey pixels add almost nothing.
- `share`: the share of 4x4 blocks whose distance is above 0.05.
- `worst`: the largest block distance.
- `mean`: the mean block distance, a broad backstop.

The block averaging is in Oklab space: each block is the mean of the Oklab values of its 16 pixels, not of their
linear light. The block distance is shift-tolerant. Each block of one shot is compared with the 4x4 windows of the
other shot at -1, 0 and +1 px on each axis, the closest window counts, and the check runs both ways. A rasterizer that
moves a thin line by one whole pixel then measures about 0, and a lost or dimmed object keeps its full difference. A
2 px blur was the other choice, but it spreads a thin line over many pixels and so makes a lost truss line weaker.

Limits: |exposure| < 0.035, |hue| < 4°, share < 0.0003 (5 of the 17,325 blocks of a 660x420 shot), worst < 0.15,
mean < 0.01. `tests/unit/gates/imageLimits.test.ts` is their specification. It builds every case below from the
synthetic stage and from all four baselines, the bright FOH and the mostly dark wide view among them. The values are
the range over those five images:

| Change                                                              | Measured                                 | Result                 |
| ------------------------------------------------------------------- | ---------------------------------------- | ---------------------- |
| Exposure × 1.02 and ÷ 1.02                                          | \|exposure\| 0.009 to 0.019              | pass                   |
| Exposure × 1.05 and × 0.95                                          | \|exposure\| 0.048 to 0.056              | fail (exposure)        |
| Hue turned 3° and -3° (same lightness and chroma, fitted to sRGB)   | \|hue\| 1.84° to 2.98°                   | pass                   |
| Hue turned 10° and -10° (same lightness and chroma, fitted to sRGB) | \|hue\| 6.16° to 9.95°                   | fail (hue)             |
| Brightest 1 % of the pixels 30 % dimmer                             | share 0.00087 to 0.045, 15 to 180 blocks | fail (share, exposure) |
| Lost 240 px grey truss line, 2 px or 1 px wide                      | share 0.0035 to 0.015, 60 blocks         | fail (share)           |
| 1 px white line on the darkest 10-row band moved 1 px               | worst 0.011 or less, 0 blocks            | pass                   |
| Whole shot moved 1 px (x, or x and y)                               | worst 0.055 or less, 0 or 1 block        | pass                   |

The hue case turns every colour so that the edited image is really turned by the given angle. A turned colour outside
sRGB keeps its lightness and hue and loses only the chroma it must (the gamut mapping of CSS Color 4). The renderer
does not do this (it tone-maps and then clips each channel), but per-channel clipping would make the edit weaker than
its label. The 8-bit write adds the renderer's dither formula (`ditherAt` of the MVR output pass), so the small turn
of a dim, near-grey pixel shows as a mix of two levels and does not round back. The pattern's rows are not aligned to
the shot (the renderer counts rows from the bottom); with the rows flipped, 10° measures at least 5.84°, so the case
does not depend on the alignment. With clipping per channel and plain rounding instead, 10° measured 2.2° on the
Front view, a pass. The FOH and Front views are almost grey, so the metric's neutral floor (a chroma of 0.004) still
damps a turn there to about two thirds of its size: 10° measures 6.16°.

The mean alone cannot see a 5 % exposure change (0.0021 to 0.0055), which is why exposure has its own limit. The
dimmed pixels are ranked by Oklab lightness, as the lamps of a real stage are spread hot spots; they also break the
exposure limit. The dark wide view is the closest case: 15 changed blocks against a limit of 5.2. The earlier case,
the brightest 53x53 square 30 % dimmer, now passes every limit on the wide view (worst 0.049): the gate cannot see a
30 % dim of one mid-dark region of that size, only of the lamps' hot spots. On the synthetic stage the beam pixels
tie at the cut, so the whole beam (4.5 % of the pixels) is dimmed. A lost thin structure fails when it changes 6
blocks or more (about 24 px of a line); a lost 240 px line changes 60. The moved white line sits on the darkest
10-row band: the rows that both lines, their 4x4 blocks and the 1 px windows can touch, so no lit row is in reach.
Next to a lit row, the 1 px windows move the background with the line, and the same move changed 6 blocks on the MA
FOH view, a fail: a real 1 px jitter of a thin line beside a lit edge can fail the gate. The whole shot moved by 1 px
on x and y changes 1 block on the wide view (worst 0.054), still a pass. `tests/unit/gates/perceptualDiff.test.ts`
checks the arithmetic of the metric.

The gate shoots four views of the synthetic stage: FOH, Wide and Front in the desk layout, and FOH in the MA layout,
which frames the stage in the part of the view its console leaves free. Every shot waits for the lazy MVR post chain,
so the same chain draws it in every run.

Baselines live in `tests/e2e/__baselines__/swiftshader/`, one folder for every OS. SwiftShader is a CPU rasterizer,
so macOS and the Linux CI runner draw nearly the same picture, and the metric forgives the small rest. One more test
moves the HOUSE slider 30 points through the UI and expects the FOH baseline to fail, so every run proves the gate
can still see a change (it fails on exposure, 0.49).

Run-to-run noise, measured on 2026-11-18 with `--repeat-each=5 --workers=1` (20 shots of the four views): every
metric was exactly 0 against the baselines, so each limit has more than the 3x margin over noise. The noise between
the macOS and Linux SwiftShader builds is not yet measured (see "First CI run on Linux").

The gate replaced two bit-exact `@screenshot` shots of the same stage (`mvr-render-screenshots.spec.ts`). They
flipped 1 to 2 pixels between runs on one commit (a depth tie on a tower), so they failed without a change in the
code. The nine bit-exact shots of the built-in stages (`screenshots.spec.ts`) stay as they are.

To change a baseline on purpose: run
`UPDATE_IMAGE_BASELINES=1 npx playwright test mvr-image-gate`, look at the new PNGs, and commit them with the reason.

## Accuracy (`tests/e2e/mvr-accuracy.spec.ts`)

`tests/shared/mvrProbe/` reads the scene XML from the MVR spec alone, with no code shared with `src/mvr`. It composes
Layer, GroupObject, object, Symbol and Symdef matrices. The spec compares its answer for `accuracyStageMvr()` with
`__desk.test.mvrPlacements()`, after the app's own full-precision fit offset. The position check reads the drawn
mounting point (the top of the rest-pose body on the group's Y axis), not the rig position, which is the tilt axis
moved by the mount shift. Two checks were `test.fail()` until 2026-11-18: the floor unit's turn (180° off) and the
LED bar's height (+35 %). Both pass since the body takes the MVR matrix and its size comes from the mesh vertices,
so the marks are gone and all four checks gate.

## Count budgets (`tests/e2e/mvr-render-stats.spec.ts`)

The counts do not depend on the GPU, so SwiftShader in CI gates them. `MEASURED` holds the values of 2026-11-19 at
`867ab800` on `rq/render-quality` for rest: 385 calls and 75,875 triangles (the same in 5 runs). Moving (765 calls,
150,742 triangles) and the objects (43 programs, 66 geometries, 61 textures) stay as pinned at `ee8faf54`; at
`867ab800` the objects were the same and the moving peak drew 766 calls and 150,743 triangles. The chain's arrival
frame depends on real time and sets the phase of the surface-buffer redraws that follow, every second frame until
about frame 65 after the chain. So the spec waits for the lazy MVR chain and measures the 100th frame after it (40
warm-up and 60 measured frames), past those redraws. Without the wait the measured frame was a buffer redraw in two
CI runs (765 calls), and the earlier rest of 468 calls and 76,542 triangles was a transient frame, not rest. Every
count has a ceiling of 1.15x. Calls and triangles also have a floor of 0.85x, so a change that stops drawing the
bodies, the scenery or the buffers fails; the beams are one instanced draw, too small for the band.
All 40 fixtures must be at dim 100 in the output (an exact count). A change that needs more or saves some changes
`MEASURED` in its own commit, with the values from the attached `render-stats.json` and the reason.

## Frame time (`tests/perf/mvr-frame-time.spec.ts`, `npm run test:perf`)

Local only, on the real GPU (ANGLE on Metal), 2560x1440, every fixture at full, 120 frames after a 30-frame warm-up.
`scaledStageMvr(n)` gives the stage with 250 or 500 fixtures. The 250 run must meet median ≤ 12 ms and p95 ≤ 16 ms;
the 500 run is recorded only. When the 1-minute load average is above 8, the run records its numbers, marks them
`valid: false` in the attachment and does not judge them: other processes then share the CPU and the GPU. Before any
time is judged, every fixture must be at dim 100 in the output, and the rig must draw at least the 143,917 triangles
of a 40-fixture frame with its buffer draw, so a rig that is not lit or not drawn cannot pass on speed. On 2026-11-18 the 250 rig drew
420,378 triangles and 2,116 calls (500: 834,084 and 4,200).

## First CI run on Linux

The image baselines were recorded with SwiftShader on macOS. Linux SwiftShader is the same rasterizer, but a
different build can round a few pixels differently. On the first CI run:

1. If the image gate passes, keep the baselines: the metric absorbs the difference.
2. If it fails, download the `playwright-report` artifact. Each failing shot has `-actual.png`, `-baseline.png`,
   `-heatmap.png` and `-diff.json` attached.
3. Compare the actual and baseline images by eye. If the only differences are rasterizer rounding, copy the Linux
   `-actual.png` files over the baselines in `tests/e2e/__baselines__/swiftshader/mvr-image-gate/`. Commit them with
   the CI run link and the diff numbers. From then on the Linux images are the reference, and a macOS run must pass
   against them.
4. If the images differ in content (an object, a beam or the exposure), stop: that is a real render difference.

The bit-exact `@screenshot` baselines of the built-in stages in `tests/e2e/__screenshots__/darwin/` are unchanged
and stay macOS only.
