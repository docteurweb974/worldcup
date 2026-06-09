import type { ReactNode } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";

/**
 * Coquille applicative responsive :
 *  - mobile  : Header en haut, contenu scrollable, BottomNav fixe en bas.
 *  - desktop : SideNav à gauche, Header + contenu à droite.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <SideNav />
      {/* min-w-0 : autorise la colonne à rétrécir pour que le scroll horizontal
          reste contenu dans les tableaux (sinon toute la page déborde). */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Header />
        {/* pb-20 mobile : laisse la place à la BottomNav fixe. */}
        <main className="min-w-0 flex-1 pb-20 md:pb-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
