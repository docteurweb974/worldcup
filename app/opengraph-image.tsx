import { ImageResponse } from "next/og";

export const alt = "World Cup Fun — Coupe du Monde 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Généré à la demande (évite un bug de prérendu de @vercel/og sous Windows
// quand le chemin contient des espaces ; sur Vercel l'image est mise en cache).
export const dynamic = "force-dynamic";

// Image Open Graph générée (texte uniquement → rendu fiable, sans police emoji).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #002395 0%, #009C3B 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 800 }}>World Cup Fun</div>
        <div style={{ fontSize: 44, marginTop: 16, opacity: 0.95 }}>
          Coupe du Monde 2026
        </div>
        <div style={{ fontSize: 30, marginTop: 24, opacity: 0.85 }}>
          11 juin – 19 juillet · vos équipes, scores, pronostics
        </div>
      </div>
    ),
    size,
  );
}
