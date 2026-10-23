/** A colour in OKLCH: lightness 0..1, chroma 0..~0.37, hue in degrees. */
export interface Oklch {
  l: number;
  c: number;
  h: number;
}

type Rgb = [number, number, number];

/** OKLCH to linear-light sRGB (Björn Ottosson's OKLab matrices); may fall outside 0..1. */
export function oklchToLinear({ l, c, h }: Oklch): Rgb {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);
  const l3 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m3 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s3 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];
}

const EPSILON = 1e-4;

export function inGamut(color: Oklch): boolean {
  return oklchToLinear(color).every((v) => v >= -EPSILON && v <= 1 + EPSILON);
}

/** Lowers chroma until the colour fits sRGB, keeping lightness and hue. */
export function clampChroma(color: Oklch): Oklch {
  if (inGamut(color)) return color;
  let low = 0;
  let high = color.c;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    if (inGamut({ ...color, c: mid })) low = mid;
    else high = mid;
  }
  return { ...color, c: low };
}

const encode = (v: number) => {
  const x = Math.min(1, Math.max(0, v));
  return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
};
const decode = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

/** The colour as a 0xRRGGBB number (what Pixi takes), chroma clamped into sRGB. */
export function toHex(color: Oklch): number {
  const [r, g, b] = oklchToLinear(clampChroma(color)).map((v) => Math.round(encode(v) * 255));
  return (r << 16) | (g << 8) | b;
}

/** WCAG relative luminance of a 0xRRGGBB colour. */
export function luminance(hex: number): number {
  const [r, g, b] = [hex >> 16, (hex >> 8) & 0xff, hex & 0xff].map((v) => decode(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two 0xRRGGBB colours (1..21). */
export function contrast(a: number, b: number): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
