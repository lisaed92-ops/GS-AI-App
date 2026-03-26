import PageShell from "@/components/PageShell";

export default function MyAgentsPage() {
  return (
    <PageShell title="My Agents" description="Agents you have created or own.">
      <p className="text-sm text-gray-500">You haven't created any agents yet.</p>
    </PageShell>
  );
}

