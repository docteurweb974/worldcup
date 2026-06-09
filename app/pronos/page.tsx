import { getMatches } from "@/lib/api";
import { PronosView } from "@/components/PronosView";

export default async function PronosPage() {
  const matches = await getMatches();
  return <PronosView matches={matches} />;
}
