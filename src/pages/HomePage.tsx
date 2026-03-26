import { Plus, Workflow, Bot, Monitor, Settings, Mic } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const actionCards = [
  { name: "Create New Agent", icon: Plus, color: "text-blue-400", href: "/agent-builder" },
  { name: "Create Workflow", icon: Workflow, color: "text-purple-400", href: "/agent-builder?type=workflow" },
  { name: "Create Autonomous Agent", icon: Bot, color: "text-emerald-400", href: "/agent-builder?type=autonomous" },
  { name: "Computer Using Agent", icon: Monitor, color: "text-orange-400", href: "/agent-builder?type=computer" },
];

interface Agent {
  name: string;
  tools: string;
  owner: string;
  lastModified: string;
  active: boolean;
  access: string;
}

export default function HomePage() {
  const [message, setMessage] = useState("");
  const [recentAgents] = useState<Agent[]>([]);

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-12">
      {/* Heading */}
      <h1 className="mb-8 text-3xl font-semibold text-white md:text-4xl">
        How can I help you today?
      </h1>

      {/* Chat Input */}
      <div className="w-full max-w-2xl">
        <div className="relative rounded-2xl border border-white/10 bg-[#1a1a1a] px-4 py-3">
          <input
            type="text"
            placeholder="Type your message here.."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-transparent pr-10 text-sm text-gray-200 placeholder-gray-500 outline-none"
          />
          <div className="mt-2 flex items-center justify-between">
            <button className="text-gray-500 transition-colors hover:text-gray-300">
              <Settings size={18} />
            </button>
            <button className="text-gray-500 transition-colors hover:text-gray-300">
              <Mic size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="mt-10 grid w-full max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
        {actionCards.map((card) => (
          <Link
            key={card.name}
            to={card.href}
            className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-6 text-center transition-colors hover:border-white/20 hover:bg-[#222]"
          >
            <card.icon size={28} className={card.color} />
            <span className="text-xs font-medium text-gray-300">{card.name}</span>
          </Link>
        ))}
      </div>

      {/* Recent Agents — only shown when agents exist */}
      {recentAgents.length > 0 && (
        <div className="mt-12 w-full max-w-4xl">
          <h2 className="mb-4 text-lg font-semibold text-white">Recent Agents</h2>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-[#141414]">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-400">Name</th>
                  <th className="px-4 py-3 font-medium text-gray-400">Tools</th>
                  <th className="px-4 py-3 font-medium text-gray-400">Owner</th>
                  <th className="px-4 py-3 font-medium text-gray-400">Last Modified</th>
                  <th className="px-4 py-3 font-medium text-gray-400">Active</th>
                  <th className="px-4 py-3 font-medium text-gray-400">Accessible To</th>
                </tr>
              </thead>
              <tbody>
                {recentAgents.map((agent, i) => (
                  <tr
                    key={agent.name}
                    className={`border-b border-white/5 transition-colors hover:bg-white/[0.02] ${
                      i % 2 === 0 ? "bg-[#111]" : "bg-[#0f0f0f]"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-white">{agent.name}</td>
                    <td className="px-4 py-3 text-gray-400">{agent.tools}</td>
                    <td className="px-4 py-3 text-gray-400">{agent.owner}</td>
                    <td className="px-4 py-3 text-gray-400">{agent.lastModified}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                          agent.active
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {agent.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{agent.access}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

