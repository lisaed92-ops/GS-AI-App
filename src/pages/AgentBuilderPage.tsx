import PageShell from "@/components/PageShell";

export default function AgentBuilderPage() {
  return (
    <PageShell title="Agent Builder" description="Create and configure new AI agents.">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[#1a1a1a] p-6">
          <h3 className="text-sm font-medium text-white">Agent Name</h3>
          <input
            type="text"
            placeholder="e.g. Customer Support Bot"
            className="mt-2 w-full rounded-lg border border-white/10 bg-[#111] px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500/50"
          />
        </div>
        <div className="rounded-xl border border-white/10 bg-[#1a1a1a] p-6">
          <h3 className="text-sm font-medium text-white">AI Provider</h3>
          <select className="mt-2 w-full rounded-lg border border-white/10 bg-[#111] px-3 py-2 text-sm text-gray-200 outline-none">
            <option value="openai">OpenAI (GPT)</option>
            <option value="anthropic">Anthropic (Claude)</option>
          </select>
        </div>
        <div className="col-span-2 rounded-xl border border-white/10 bg-[#1a1a1a] p-6">
          <h3 className="text-sm font-medium text-white">System Prompt</h3>
          <textarea
            rows={4}
            placeholder="Define the agent's personality and instructions..."
            className="mt-2 w-full rounded-lg border border-white/10 bg-[#111] px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500/50"
          />
        </div>
        <div className="col-span-2">
          <button className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
            Create Agent
          </button>
        </div>
      </div>
    </PageShell>
  );
}

