import { redirect } from "next/navigation";

/** Le classement des pronos vit désormais dans la page Classement unifiée (onglet Pronos). */
export default function ClassementPronosPage() {
  redirect("/classements");
}
