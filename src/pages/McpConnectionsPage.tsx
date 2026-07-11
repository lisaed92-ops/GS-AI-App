import { useState, useEffect } from "react";
import { Search, ExternalLink, CheckCircle, Circle, Server } from "lucide-react";
import { getMcpConnections, saveMcpConnection } from "../lib/storage";
import type { McpConnection } from "../types/agent";

type McpServerView = McpConnection & { connected: boolean };

export default function McpConnectionsPage() {
  const [servers, setServers] = useState<McpServerView[]>([]);
  const [search, setSearch] = useState("");

  // Load from storage on mount
  useEffect(() => {
    const conns = getMcpConnections();
    setServers(conns.map((c) => ({ ...c, connected: c.status === "approved" })));
  }, []);

  const toggleConnection = (id: string) => {
    setServers((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, connected: !s.connected };
        // Persist status change
        saveMcpConnection({ ...s, status: updated.connected ? "approved" : "disabled" });
        return updated;
      })
    );
  };

  const filtered = servers.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white">MCP Connections & Tools</h1>
      <p className="mt-1 text-sm text-gray-500">
        Admin-approved Model Context Protocol servers available for your agents.
      </p>

      {/* Toolbar */}
      <div className="mt-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search connections..."
            className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] py-2 pl-9 pr-3 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500/50"
          />
        </div>
        <a
          href="https://registry.modelcontextprotocol.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-400 transition-colors hover:text-blue-400"
        >
          <ExternalLink size={14} />
          MCP Registry
        </a>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <Server size={40} className="text-gray-600" />
          <p className="text-gray-400">
            {servers.length === 0
              ? "No MCP servers configured. An admin needs to approve servers from the MCP registry."
              : "No connections match your search."}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1a1a1a] p-5 transition-colors hover:border-white/20"
            >
              <div className="flex items-center gap-4">
                <div className={`rounded-lg p-2 ${s.connected ? "bg-green-500/10" : "bg-gray-500/10"}`}>
                  <Server size={20} className={s.connected ? "text-green-400" : "text-gray-500"} />
                </div>
                <div>
                  <h3 className="font-medium text-white">{s.name}</h3>
                  <p className="mt-0.5 text-xs text-gray-500">{s.description}</p>
                  <p className="mt-1 text-[10px] text-gray-600 font-mono">{s.serverUrl}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {s.status === "approved" && (
                  <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium uppercase text-green-400">
                    Approved
                  </span>
                )}
                <button
                  onClick={() => toggleConnection(s.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    s.connected
                      ? "border-green-500/30 text-green-400 hover:bg-green-500/10"
                      : "border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  {s.connected ? (
                    <><CheckCircle size={12} /> Connected</>
                  ) : (
                    <><Circle size={12} /> Connect</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

