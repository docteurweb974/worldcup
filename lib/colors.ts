/**
 * Utilitaires couleur pour les accents adaptatifs.
 *
 * Objectif accessibilité : la couleur d'accent sert notamment de fond aux
 * boutons avec texte blanc. On garantit un contraste ≥ 4.5:1 avec le blanc
 * (WCAG AA texte normal) en assombrissant les couleurs trop claires.
 */
interface Rgb {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
const rgbToHex = ({ r, g, b }: Rgb) => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

/** Luminance relative WCAG d'une couleur. */
function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contraste entre une couleur et le blanc (luminance 1). */
const contrastWithWhite = (lum: number) => 1.05 / (lum + 0.05);

/**
 * Retourne la couleur telle quelle si elle contraste assez avec le blanc,
 * sinon une version assombrie atteignant le contraste cible (4.5:1 par défaut).
 */
export function accessibleAccent(hex: string, targetRatio = 4.5): string {
  const rgb = hexToRgb(hex);
  if (contrastWithWhite(relativeLuminance(rgb)) >= targetRatio) return hex;

  let factor = 1;
  let current = rgb;
  while (factor > 0 && contrastWithWhite(relativeLuminance(current)) < targetRatio) {
    factor -= 0.04;
    current = { r: rgb.r * factor, g: rgb.g * factor, b: rgb.b * factor };
  }
  return rgbToHex(current);
}
