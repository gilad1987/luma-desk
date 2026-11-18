/**
 * Paints one gobo's white mask on a transparent canvas of size `S` (`R` = S / 2). `r` is the gobo's own seeded
 * stream, so the scattered gobo looks the same on every load and in every size.
 * The short names (`mx`, `S`, `R`, `r`) mirror the legacy mask code, so each painter reads line for line against it.
 */
export type GoboMaskPainter = (mx: CanvasRenderingContext2D, S: number, R: number, r: () => number) => void;

const fillDisc = (mx: CanvasRenderingContext2D, x: number, y: number, radius: number): void => {
  mx.beginPath();
  mx.arc(x, y, radius, 0, 7);
  mx.fill();
};

const openGate: GoboMaskPainter = (mx, _S, R) => fillDisc(mx, R, R, R * 0.96);

const dotRing: GoboMaskPainter = (mx, _S, R) => {
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    fillDisc(mx, R + Math.cos(a) * R * 0.62, R + Math.sin(a) * R * 0.62, R * 0.16);
  }
  fillDisc(mx, R, R, R * 0.18);
};

const breakup: GoboMaskPainter = (mx, _S, R, r) => {
  for (let k = 0; k < 26; k++) {
    const a = r() * 7,
      d = Math.sqrt(r()) * R * 0.8;
    mx.beginPath();
    mx.ellipse(
      R + Math.cos(a) * d,
      R + Math.sin(a) * d,
      R * (0.08 + r() * 0.14),
      R * (0.05 + r() * 0.1),
      r() * 3,
      0,
      7,
    );
    mx.fill();
  }
};

const spokes: GoboMaskPainter = (mx, _S, R) => {
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    mx.beginPath();
    mx.moveTo(R, R);
    mx.lineTo(R + Math.cos(a - 0.1) * R, R + Math.sin(a - 0.1) * R);
    mx.lineTo(R + Math.cos(a + 0.1) * R, R + Math.sin(a + 0.1) * R);
    mx.fill();
  }
};

const bars: GoboMaskPainter = (mx, S) => {
  for (let k = 0; k < 5; k++) mx.fillRect(S * (0.1 + k * 0.17), 0, S * 0.09, S);
};

const triBlades: GoboMaskPainter = (mx, _S, R) => {
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.3;
    mx.beginPath();
    mx.moveTo(R + Math.cos(a) * R * 0.15, R + Math.sin(a) * R * 0.15);
    mx.lineTo(R + Math.cos(a - 0.35) * R, R + Math.sin(a - 0.35) * R);
    mx.lineTo(R + Math.cos(a + 0.35) * R, R + Math.sin(a + 0.35) * R);
    mx.fill();
  }
};

const rings: GoboMaskPainter = (mx, S, R) => {
  mx.strokeStyle = '#fff';
  mx.lineWidth = S * 0.07;
  for (let k = 1; k <= 4; k++) {
    mx.beginPath();
    mx.arc(R, R, R * k * 0.22, 0, 7);
    mx.stroke();
  }
};

const petals: GoboMaskPainter = (mx, _S, R) => {
  for (let k = 0; k < 6; k++) {
    mx.save();
    mx.translate(R, R);
    mx.rotate((k / 6) * Math.PI * 2);
    mx.beginPath();
    mx.ellipse(0, R * 0.45, R * 0.17, R * 0.42, 0, 0, 7);
    mx.fill();
    mx.restore();
  }
};

/** The 8 gobo wheels in slot order (0 = open); the beam shader draws the same slots as angular patterns. */
export const GOBO_MASKS: readonly GoboMaskPainter[] = [
  openGate,
  dotRing,
  breakup,
  spokes,
  bars,
  triBlades,
  rings,
  petals,
];
