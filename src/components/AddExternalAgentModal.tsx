import { useState } from "react";
import { X, ExternalLink } from "lucide-react";
import type { ExternalAgent } from "../types/agent";
import { generateId, saveExternalAgent, detectPlatform } from "../lib/storage";

const PLATFORM_LABELS: Record<string, { label: string; color: string }> = {
  copilot: { label: "Copilot", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  atlassian: { label: "Atlassian", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" },
  other: { label: "External", color: "bg-gray-500/10 text-gray-400 border-gray-500/30" },
};

interface Props {
  existingAgent?: ExternalAgent;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddExternalAgentModal({ existingAgent, onClose, onSaved }: Props) {
  const isEdit = Boolean(existingAgent);
  const [name, setName] = useState(existingAgent?.name || "");
  const [url, setUrl] = useState(existingAgent?.url || "");

  const detectedPlatform = url.trim() ? detectPlatform(url) : null;
  const platformInfo = detectedPlatform ? PLATFORM_LABELS[detectedPlatform] : null;

  const handleSave = () => {
    if (!name.trim()) return alert("Name is required");
    if (!url.trim()) return alert("URL is required");
    try {
      new URL(url.trim());
    } catch {
      return alert("Please enter a valid URL (e.g. https://...)");
    }

    const now = new Date().toISOString();
    const agent: ExternalAgent = {
      id: existingAgent?.id || generateId(),
      name: name.trim(),
      url: url.trim(),
      platform: detectPlatform(url.trim()),
      favourite: existingAgent?.favourite || false,
      createdAt: existingAgent?.createdAt || now,
      updatedAt: now,
    };
    saveExternalAgent(agent);
    onSaved();
    onClose();
  };

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {isEdit ? "Edit External Agent" : "Add External Agent"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. HR Policy Copilot"
              className={inputClass}
            />
          </div>

          {/* URL */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://copilotstudio.microsoft.com/..."
              className={inputClass}
            />
          </div>

          {/* Platform preview */}
          {platformInfo && (
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${platformInfo.color}`}>
                <ExternalLink size={10} />
                {platformInfo.label}
              </span>
              <span className="text-xs text-gray-500">Auto-detected from URL</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-400 transition-colors hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            {isEdit ? "Update" : "Add Agent"}
          </button>
        </div>
      </div>
    </div>
  );
}

