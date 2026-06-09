/**
 * Palette de couleurs par nation (clé = TLA football-data.org).
 *
 * - `primary`   : couleur identitaire principale → utilisée pour --color-accent
 *                 (couleurs adaptatives selon l'équipe favorite, étape 6).
 * - `secondary` : couleur d'appoint.
 * - `accent`    : touche complémentaire.
 *
 * `primary` est choisie vive et lisible (jamais le blanc) pour rester accessible
 * en thème clair comme sombre.
 */
export interface CountryPalette {
  primary: string;
  secondary: string;
  accent: string;
}

export const COUNTRY_COLORS: Record<string, CountryPalette> = {
  RSA: { primary: "#007749", secondary: "#FFB81C", accent: "#DE3831" },
  ALG: { primary: "#006233", secondary: "#D21034", accent: "#FFFFFF" },
  GER: { primary: "#DD0000", secondary: "#FFCE00", accent: "#000000" },
  ENG: { primary: "#CF142B", secondary: "#FFFFFF", accent: "#00247D" },
  KSA: { primary: "#006C35", secondary: "#FFFFFF", accent: "#006C35" },
  ARG: { primary: "#75AADB", secondary: "#FFFFFF", accent: "#F6B40E" },
  AUS: { primary: "#00843D", secondary: "#FFCD00", accent: "#012169" },
  AUT: { primary: "#ED2939", secondary: "#FFFFFF", accent: "#ED2939" },
  BEL: { primary: "#ED2939", secondary: "#FAE042", accent: "#000000" },
  BIH: { primary: "#002F6C", secondary: "#FECB00", accent: "#FECB00" },
  BRA: { primary: "#009C3B", secondary: "#FFDF00", accent: "#002776" },
  CAN: { primary: "#FF0000", secondary: "#FFFFFF", accent: "#FF0000" },
  CPV: { primary: "#003893", secondary: "#F7D116", accent: "#CF2027" },
  COL: { primary: "#003893", secondary: "#FCD116", accent: "#CE1126" },
  KOR: { primary: "#003478", secondary: "#C60C30", accent: "#C60C30" },
  CIV: { primary: "#F77F00", secondary: "#009E60", accent: "#F77F00" },
  CRO: { primary: "#FF0000", secondary: "#FFFFFF", accent: "#171796" },
  CUW: { primary: "#002B7F", secondary: "#F9E814", accent: "#F9E814" },
  SCO: { primary: "#005EB8", secondary: "#FFFFFF", accent: "#005EB8" },
  EGY: { primary: "#CE1126", secondary: "#000000", accent: "#C09300" },
  ECU: { primary: "#034EA2", secondary: "#FFDD00", accent: "#ED1C24" },
  ESP: { primary: "#AA151B", secondary: "#F1BF00", accent: "#AA151B" },
  USA: { primary: "#3C3B6E", secondary: "#B22234", accent: "#B22234" },
  FRA: { primary: "#002395", secondary: "#ED2939", accent: "#ED2939" },
  GHA: { primary: "#006B3F", secondary: "#FCD116", accent: "#CE1126" },
  HAI: { primary: "#00209F", secondary: "#D21034", accent: "#D21034" },
  IRQ: { primary: "#CE1126", secondary: "#007A3D", accent: "#000000" },
  IRN: { primary: "#239F40", secondary: "#DA0000", accent: "#239F40" },
  JPN: { primary: "#BC002D", secondary: "#FFFFFF", accent: "#BC002D" },
  JOR: { primary: "#007A3D", secondary: "#CE1126", accent: "#000000" },
  MAR: { primary: "#C1272D", secondary: "#006233", accent: "#006233" },
  MEX: { primary: "#006847", secondary: "#CE1126", accent: "#CE1126" },
  NOR: { primary: "#BA0C2F", secondary: "#00205B", accent: "#00205B" },
  NZL: { primary: "#00247D", secondary: "#CC142B", accent: "#CC142B" },
  UZB: { primary: "#0099B5", secondary: "#1EB53A", accent: "#CE1126" },
  PAN: { primary: "#072357", secondary: "#DA121A", accent: "#DA121A" },
  PAR: { primary: "#0038A8", secondary: "#D52B1E", accent: "#D52B1E" },
  NED: { primary: "#EC6608", secondary: "#21468B", accent: "#AE1C28" },
  POR: { primary: "#DA291C", secondary: "#006600", accent: "#FFD700" },
  QAT: { primary: "#8A1538", secondary: "#FFFFFF", accent: "#8A1538" },
  COD: { primary: "#007FFF", secondary: "#F7D618", accent: "#CE1021" },
  SEN: { primary: "#00853F", secondary: "#FDEF42", accent: "#E31B23" },
  SWE: { primary: "#006AA7", secondary: "#FECC00", accent: "#FECC00" },
  SUI: { primary: "#D52B1E", secondary: "#FFFFFF", accent: "#D52B1E" },
  CZE: { primary: "#11457E", secondary: "#D7141A", accent: "#D7141A" },
  TUN: { primary: "#E70013", secondary: "#FFFFFF", accent: "#E70013" },
  TUR: { primary: "#E30A17", secondary: "#FFFFFF", accent: "#E30A17" },
  URY: { primary: "#0038A8", secondary: "#FCD116", accent: "#FCD116" },
};

/** Palette par défaut (bleu neutre) si l'équipe n'a pas de couleurs définies. */
export const DEFAULT_PALETTE: CountryPalette = {
  primary: "#2563eb",
  secondary: "#1e3a8a",
  accent: "#dbeafe",
};

export function getPalette(tla: string | null | undefined): CountryPalette {
  return (tla && COUNTRY_COLORS[tla]) || DEFAULT_PALETTE;
}
