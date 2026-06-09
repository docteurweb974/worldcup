import { getMatch } from "@/lib/api";
import { MatchDetail } from "@/components/MatchDetail";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export default async function MatchPage({ params }: { params: { id: string } }) {
  const match = await getMatch(Number(params.id));
  if (!match) {
    return <PagePlaceholder title="Match introuvable" step="vérifiez le lien" />;
  }
  return <MatchDetail match={match} />;
}
