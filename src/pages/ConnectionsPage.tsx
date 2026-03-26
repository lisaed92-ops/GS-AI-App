import PageShell from "@/components/PageShell";

export default function ConnectionsPage() {
  return (
    <PageShell title="Connections" description="Manage integrations and API connections.">
      <div className="grid gap-4 md:grid-cols-3">
        {["Slack", "Microsoft Teams", "Email (SMTP)", "Jira", "Confluence", "GitHub"].map(
          (name) => (
            <div
              key={name}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-4"
            >
              <span className="text-sm font-medium text-gray-300">{name}</span>
              <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-blue-500/50 hover:text-blue-400">
                Connect
              </button>
            </div>
          )
        )}
      </div>
    </PageShell>
  );
}

