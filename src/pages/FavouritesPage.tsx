import PageShell from "@/components/PageShell";

export default function FavouritesPage() {
  return (
    <PageShell title="Favourites" description="Your starred agents and workflows.">
      <p className="text-sm text-gray-500">No favourites yet. Star an agent to see it here.</p>
    </PageShell>
  );
}

