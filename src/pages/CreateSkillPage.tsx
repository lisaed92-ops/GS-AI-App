import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, X, Sparkles, Info, Upload, Loader2 } from "lucide-react";
import { type Skill } from "../types/agent";
import { saveSkill, generateId, getMcpConnections, getSkill } from "../lib/storage";
import SkillWizardModal from "../components/SkillWizardModal";

export default function CreateSkillPage() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEditMode = Boolean(editId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [scope, setScope] = useState<"personal" | "team">("personal");
  const [selectedMcp, setSelectedMcp] = useState<string[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [existingSkill, setExistingSkill] = useState<Skill | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableMcp = getMcpConnections();

  useEffect(() => {
    if (!editId) return;
    const skill = getSkill(editId);
    if (!skill) return;
    setExistingSkill(skill);
    setName(skill.name);
    setDescription(skill.description);
    setInstructions(skill.instructions);
    setScope(skill.scope);
    setSelectedMcp(skill.mcpConnectionIds || []);
  }, [editId]);

  const handleCreate = () => {
    if (!name.trim()) return alert("Skill name is required");
    if (!instructions.trim()) return alert("Skill instructions are required");
    const skill: Skill = {
      id: isEditMode && existingSkill ? existingSkill.id : generateId(),
      name: name.trim(),
      description: description.trim(),
      instructions: instructions.trim(),
      mcpConnectionIds: selectedMcp,
      scope,
      favourite: isEditMode && existingSkill ? existingSkill.favourite : false,
      createdAt: isEditMode && existingSkill ? existingSkill.createdAt : new Date().toISOString(),
    };
    saveSkill(skill);
    navigate("/skills");
  };

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500/50";

  const sectionTitle = (title: string, subtitle?: string) => (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold text-white">{isEditMode ? "Edit Skill" : "Create a Skill"}</h1>

      {/* Skill explainer */}
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <Info size={18} className="mt-0.5 shrink-0 text-blue-400" />
        <div className="text-sm text-gray-300">
          <p className="font-medium text-blue-400">What is a Skill?</p>
          <p className="mt-1 text-gray-400">
            A skill is a reusable set of instructions that tells an agent <em>how</em> to perform a specific task.
            Skills can optionally connect to external services (MCP connections) to access live data or perform actions.
            For example, a "Weather Commute Check" skill instructs an agent to check the weather and recommend cycling
            or taking the train. Skills live in a shared library — any agent can use any skill.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {/* 1. Name & Description */}
        <div>
          {sectionTitle("Name & Description")}
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Skill name" className={inputClass} />
          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)}
            rows={2} placeholder="Short description — what does this skill do?"
            className={inputClass + " mt-3 resize-none"}
          />
        </div>

        {/* 2. Scope */}
        <div>
          {sectionTitle("Scope", "Who can use this skill?")}
          <select value={scope} onChange={(e) => setScope(e.target.value as "personal" | "team")} className={inputClass}>
            <option value="personal">Personal</option>
            <option value="team">Team</option>
          </select>
        </div>

        {/* 3. Instructions */}
        <div>
          {sectionTitle("Instructions", `${instructions.length}/10000 characters`)}
          <textarea
            value={instructions}
            onChange={(e) => { if (e.target.value.length <= 10000) setInstructions(e.target.value); }}
            rows={8} placeholder="Write the instructions for this skill. What should the agent do? What criteria or rules should it follow? What should the output look like?"
            className={inputClass + " resize-none"}
          />
          <div className="mt-2 flex items-center gap-2">
            <button onClick={() => setShowWizard(true)}
              className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 px-3 py-1.5 text-xs text-purple-400 transition-colors hover:bg-purple-500/10">
              <Sparkles size={12} /> AI Skill Wizard
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingFile}
              className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 px-3 py-1.5 text-xs text-blue-400 transition-colors hover:bg-blue-500/10 disabled:opacity-50"
            >
              {isUploadingFile ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {isUploadingFile ? "Reading…" : "Import from File"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.txt,.docx,.pdf"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setIsUploadingFile(true);
                try {
                  // Upload file to server
                  const form = new FormData();
                  form.append("file", file);
                  const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
                  const uploadData = await uploadRes.json();
                  if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");

                  // Fetch the extracted content back from the server
                  const contentRes = await fetch(`${uploadData.url}?extract=true`);
                  const text = await contentRes.text();
                  if (text.length > 10000) {
                    setInstructions(text.slice(0, 10000));
                    alert(`File content was ${text.length} characters — truncated to 10000.`);
                  } else {
                    setInstructions(text);
                  }
                } catch (err: any) {
                  alert("Failed to read file: " + (err?.message || "Unknown error"));
                } finally {
                  setIsUploadingFile(false);
                  e.target.value = "";
                }
              }}
            />
          </div>
        </div>

        {/* 4. MCP Connections */}
        <div>
          {sectionTitle("MCP Connections (Optional)", "Does this skill need access to external services?")}
          {availableMcp.length === 0 ? (
            <p className="text-xs text-gray-500">No MCP servers available. Set them up in MCP Connections first.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableMcp.map((mc) => {
                const sel = selectedMcp.includes(mc.id);
                return (
                  <button key={mc.id} onClick={() => setSelectedMcp((p) => sel ? p.filter((id) => id !== mc.id) : [...p, mc.id])}
                    className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors ${sel ? "border-green-500/50 bg-green-500/10 text-green-400" : "border-white/10 text-gray-400"}`}>
                    {sel ? <X size={10} /> : <Plus size={10} />} {mc.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit */}
        <button onClick={handleCreate} className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700">
          {isEditMode ? "Update Skill" : "Create Skill"}
        </button>
      </div>

      {showWizard && (
        <SkillWizardModal
          skillName={name}
          skillDescription={description}
          currentInstructions={instructions}
          availableMcpNames={availableMcp.filter((mc) => selectedMcp.includes(mc.id)).map((mc) => mc.name)}
          onApply={(inst) => { setInstructions(inst); setShowWizard(false); }}
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}

