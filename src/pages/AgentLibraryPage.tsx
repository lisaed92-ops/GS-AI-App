import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Star, Bot, Pencil, ExternalLink, Plus } from "lucide-react";
import { type Agent, type ExternalAgent, MODEL_OPTIONS } from "../types/agent";
import { getAgents, saveAgent, getExternalAgents, saveExternalAgent } from "../lib/storage";
import AddExternalAgentModal from "../components/AddExternalAgentModal";

function modelLabel(value: string): string {
  return MODEL_OPTIONS.find((m) => m.value === value)?.label || value;
}

const PLATFORM_BADGE: Record<string, { label: string; color: string }> = {
  copilot: { label: "Copilot", color: "bg-blue-500/10 text-blue-400" },
  atlassian: { label: "Atlassian", color: "bg-indigo-500/10 text-indigo-400" },
  other: { label: "External", color: "bg-gray-500/10 text-gray-400" },
};

export default function AgentLibraryPage() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [externalAgents, setExternalAgents] = useState<ExternalAgent[]>([]);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<"all" | "personal" | "published">("all");
  const [showFavs, setShowFavs] = useState(false);
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [editingExternal, setEditingExternal] = useState<ExternalAgent | undefined>();

  // Load agents from localStorage on mount
  useEffect(() => {
    setAgents(getAgents());
    setExternalAgents(getExternalAgents());
  }, []);

  const reloadExternalAgents = () => setExternalAgents(getExternalAgents());

  const toggleFav = (id: string) => {
    setAgents((prev) => {
      const updated = prev.map((a) =>
        a.id === id ? { ...a, favourite: !a.favourite } : a
      );
      const toggled = updated.find((a) => a.id === id);
      if (toggled) saveAgent(toggled);
      return updated;
    });
  };

  const toggleExternalFav = (id: string) => {
    setExternalAgents((prev) => {
      const updated = prev.map((a) =>
        a.id === id ? { ...a, favourite: !a.favourite } : a
      );
      const toggled = updated.find((a) => a.id === id);
      if (toggled) saveExternalAgent(toggled);
      return updated;
    });
  };

  const filtered = agents.filter((a) => {
    if (showFavs && !a.favourite) return false;
    if (scope !== "all" && a.visibility !== scope) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredExternal = externalAgents.filter((a) => {
    if (showFavs && !a.favourite) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalCount = filtered.length + filteredExternal.length;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white">Agent Library</h1>
      <p className="mt-1 text-sm text-gray-500">Browse and manage your agents.</p>

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents..."
            className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] py-2 pl-9 pr-3 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500/50"
          />
        </div>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as "all" | "personal" | "published")}
          className="rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-gray-300 outline-none"
        >
          <option value="all">All</option>
          <option value="personal">Personal</option>
          <option value="published">Published</option>
        </select>
        <button
          onClick={() => setShowFavs(!showFavs)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
            showFavs
              ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-400"
              : "border-white/10 text-gray-400 hover:text-gray-200"
          }`}
        >
          <Star size={14} fill={showFavs ? "currentColor" : "none"} />
          Favourites
        </button>
        <button
          onClick={() => { setEditingExternal(undefined); setShowExternalModal(true); }}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-400 transition-colors hover:border-white/20 hover:text-gray-200"
        >
          <Plus size={14} />
          Add External Agent
        </button>
      </div>

      {/* Grid */}
      {totalCount === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <Bot size={40} className="text-gray-600" />
          <p className="text-gray-400">
            {agents.length === 0 && externalAgents.length === 0
              ? "No agents yet. Create one from the sidebar!"
              : "No agents match your filters."}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Regular agents */}
          {filtered.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-white/10 bg-[#1a1a1a] p-5 transition-colors hover:border-white/20"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-white">{a.name}</h3>
                  <p className="mt-1 text-xs text-gray-500">{modelLabel(a.model)}</p>
                </div>
                <button onClick={() => toggleFav(a.id)} className="text-gray-500 hover:text-yellow-400">
                  <Star size={16} fill={a.favourite ? "currentColor" : "none"} className={a.favourite ? "text-yellow-400" : ""} />
                </button>
              </div>
              <p className="mt-3 text-sm text-gray-400 line-clamp-2">{a.description}</p>
              {a.slackHandle && (
                <p className="mt-2 text-xs text-gray-500">@{a.slackHandle}</p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                  a.visibility === "personal" ? "bg-blue-500/10 text-blue-400" : "bg-green-500/10 text-green-400"
                }`}>
                  {a.visibility}
                </span>
                <button
                  onClick={() => navigate(`/create-agent/${a.id}`)}
                  className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-gray-400 transition-colors hover:border-white/20 hover:text-gray-200"
                >
                  <Pencil size={12} /> Edit
                </button>
              </div>
            </div>
          ))}

          {/* External agents */}
          {filteredExternal.map((a) => {
            const badge = PLATFORM_BADGE[a.platform] || PLATFORM_BADGE.other;
            return (
              <div
                key={`ext-${a.id}`}
                className="rounded-xl border border-white/10 bg-[#1a1a1a] p-5 transition-colors hover:border-white/20"
              >
                <div className="flex items-start justify-between">
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-1.5 min-w-0"
                  >
                    <h3 className="font-medium text-white truncate group-hover:text-blue-400 transition-colors">{a.name}</h3>
                    <ExternalLink size={14} className="shrink-0 text-gray-500 group-hover:text-blue-400 transition-colors" />
                  </a>
                  <button onClick={() => toggleExternalFav(a.id)} className="text-gray-500 hover:text-yellow-400">
                    <Star size={16} fill={a.favourite ? "currentColor" : "none"} className={a.favourite ? "text-yellow-400" : ""} />
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500 truncate">{a.url}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${badge.color}`}>
                    <ExternalLink size={9} />
                    {badge.label}
                  </span>
                  <button
                    onClick={() => { setEditingExternal(a); setShowExternalModal(true); }}
                    className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-gray-400 transition-colors hover:border-white/20 hover:text-gray-200"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* External Agent Modal */}
      {showExternalModal && (
        <AddExternalAgentModal
          existingAgent={editingExternal}
          onClose={() => setShowExternalModal(false)}
          onSaved={reloadExternalAgents}
        />
      )}
    </div>
  );
}

