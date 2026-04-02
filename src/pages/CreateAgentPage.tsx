import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, X, Upload, Sparkles, AlertCircle, FileText, Loader2, Link as LinkIcon, Globe } from "lucide-react";
import {
  MODEL_OPTIONS, DEFAULT_MODEL, DAYS_OF_WEEK,
  type TriggerConfig, type AcceptedInput, type WorkflowStep, type Agent, type KnowledgeItem,
} from "../types/agent";
import {
  saveAgent, generateId, generateSlackHandle, isSlackHandleTaken,
  getSkills, getMcpConnections, getUserName, setUserName, getAgent,
} from "../lib/storage";
import WorkflowBuilder from "../components/WorkflowBuilder";
import PromptWizardModal from "../components/PromptWizardModal";

const ACCEPTED_INPUT_OPTIONS: { value: AcceptedInput; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "documents", label: "Documents" },
  { value: "pdfs", label: "PDFs" },
  { value: "images", label: "Images" },
];

export default function CreateAgentPage() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEditMode = Boolean(editId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [promptFile, setPromptFile] = useState<{ name: string; url: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [visibility, setVisibility] = useState<"personal" | "published">("personal");
  const [slackHandle, setSlackHandle] = useState("");
  const [slackError, setSlackError] = useState("");
  const [userName, setUserNameState] = useState(getUserName);
  const [trigger, setTrigger] = useState<TriggerConfig>({ type: "manual" });
  const [selectedMcp, setSelectedMcp] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [acceptedInputs, setAcceptedInputs] = useState<AcceptedInput[]>(["text"]);
  const [isWorkflow, setIsWorkflow] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [existingAgent, setExistingAgent] = useState<Agent | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [knowledgeUrl, setKnowledgeUrl] = useState("");
  const [knowledgeLinkName, setKnowledgeLinkName] = useState("");
  const [isUploadingKnowledge, setIsUploadingKnowledge] = useState(false);
  const knowledgeFileRef = useRef<HTMLInputElement>(null);

  // Load existing agent data when editing
  useEffect(() => {
    if (!editId) return;
    const agent = getAgent(editId);
    if (!agent) return;
    setExistingAgent(agent);
    setName(agent.name);
    setDescription(agent.description);
    setSystemPrompt(agent.systemPrompt);
    setPromptFile(agent.promptFile || null);
    setModel(agent.model);
    setVisibility(agent.visibility);
    setSlackHandle(agent.slackHandle);
    setTrigger(agent.trigger);
    setSelectedMcp(agent.mcpConnectionIds);
    setSelectedSkills(agent.skillIds);
    setAcceptedInputs(agent.acceptedInputs);
    setIsWorkflow(agent.isWorkflowAgent);
    setWorkflowSteps(agent.workflowSteps);
    setKnowledge(agent.knowledge || []);
  }, [editId]);

  const availableSkills = getSkills();
  const availableMcp = getMcpConnections();
  const descWordCount = description.trim() ? description.trim().split(/\s+/).length : 0;

  const autoHandle = (agentName: string, vis: "personal" | "published" = visibility) =>
    generateSlackHandle(agentName, vis, userName);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slackHandle || slackHandle === autoHandle(name)) {
      setSlackHandle(autoHandle(val));
    }
  };

  const handleUserNameChange = (val: string) => {
    setUserNameState(val);
    setUserName(val);
    // Regenerate handle with new user name prefix
    if (name && (!slackHandle || slackHandle === autoHandle(name))) {
      setSlackHandle(generateSlackHandle(name, visibility, val));
    }
  };

  const handleVisibilityChange = (vis: "personal" | "published") => {
    setVisibility(vis);
    // Regenerate handle when switching visibility
    if (name && (!slackHandle || slackHandle === autoHandle(name))) {
      setSlackHandle(generateSlackHandle(name, vis, userName));
    }
  };

  const handleSlackChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlackHandle(clean);
    setSlackError(isSlackHandleTaken(clean, editId) ? "This handle is already taken" : "");
  };

  const handlePromptFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["md", "txt", "docx"].includes(ext || "")) {
      alert("Please upload a .md, .txt, or .docx file");
      e.target.value = "";
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setPromptFile({ name: data.name, url: data.url });
      setSystemPrompt(""); // clear textarea — file IS the prompt
    } catch (err) {
      alert("Failed to upload file. Make sure the backend is running (npx tsx server.ts).");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const removePromptFile = async () => {
    if (promptFile) {
      const storedName = promptFile.url.split("/").pop();
      if (storedName) {
        await fetch(`/api/files/${storedName}`, { method: "DELETE" }).catch(() => {});
      }
      setPromptFile(null);
    }
  };

  // ── Knowledge handlers ──
  const handleKnowledgeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["md", "txt", "docx"].includes(ext || "")) {
      alert("Please upload a .md, .txt, or .docx file");
      e.target.value = "";
      return;
    }
    setIsUploadingKnowledge(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setKnowledge((prev) => [...prev, {
        id: crypto.randomUUID(),
        type: "file",
        name: data.name,
        url: data.url,
      }]);
    } catch {
      alert("Failed to upload file. Make sure the backend is running.");
    } finally {
      setIsUploadingKnowledge(false);
      e.target.value = "";
    }
  };

  const addKnowledgeLink = () => {
    const url = knowledgeUrl.trim();
    if (!url) return;
    try { new URL(url); } catch { alert("Please enter a valid URL"); return; }
    setKnowledge((prev) => [...prev, {
      id: crypto.randomUUID(),
      type: "link",
      name: knowledgeLinkName.trim() || url,
      url,
    }]);
    setKnowledgeUrl("");
    setKnowledgeLinkName("");
  };

  const removeKnowledgeItem = async (item: KnowledgeItem) => {
    if (item.type === "file") {
      const storedName = item.url.split("/").pop();
      if (storedName) {
        await fetch(`/api/files/${storedName}`, { method: "DELETE" }).catch(() => {});
      }
    }
    setKnowledge((prev) => prev.filter((k) => k.id !== item.id));
  };

  const toggleInput = (input: AcceptedInput) => {
    setAcceptedInputs((prev) =>
      prev.includes(input) ? prev.filter((i) => i !== input) : [...prev, input]
    );
  };

  const handleCreate = () => {
    if (!name.trim()) return alert("Agent name is required");
    if (slackError) return alert("Fix the Slack handle conflict first");
    const agent: Agent = {
      id: isEditMode && existingAgent ? existingAgent.id : generateId(),
      name: name.trim(), description: description.trim(),
      systemPrompt, promptFile: promptFile || undefined, model, visibility,
      slackHandle: slackHandle || generateSlackHandle(name, visibility, userName),
      trigger, mcpConnectionIds: selectedMcp, skillIds: selectedSkills,
      acceptedInputs, isWorkflowAgent: isWorkflow,
      workflowSteps: isWorkflow ? workflowSteps : [],
      knowledge,
      favourite: isEditMode && existingAgent ? existingAgent.favourite : false,
      createdAt: isEditMode && existingAgent ? existingAgent.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveAgent(agent);
    navigate("/agents");
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
    <div className="h-screen overflow-y-auto p-8">
      <h1 className="text-2xl font-bold text-white">{isEditMode ? "Update Agent" : "Create Agent"}</h1>
      <p className="mt-1 text-sm text-gray-500">{isEditMode ? "Edit your agent's configuration." : "Configure a new AI agent for Factori."}</p>

      <div className="mt-8 max-w-3xl space-y-8 pb-12">
        {/* 1. Name */}
        <div>
          {sectionTitle("Agent Name")}
          <input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Daily Email Summariser" className={inputClass} />
        </div>

        {/* 2. Description */}
        <div>
          {sectionTitle("Description", `${descWordCount}/200 words`)}
          <textarea
            value={description}
            onChange={(e) => {
              const words = e.target.value.trim().split(/\s+/);
              if (words.length <= 200 || e.target.value.length < description.length) setDescription(e.target.value);
            }}
            rows={3} placeholder="Describe what this agent does..." className={inputClass + " resize-none"}
          />
        </div>

        {/* 3. Agent Type Toggle */}
        <div>
          {sectionTitle("Agent Type")}
          <div className="flex gap-3">
            {([false, true] as const).map((wf) => (
              <button key={String(wf)} onClick={() => setIsWorkflow(wf)}
                className={`rounded-lg border px-4 py-2 text-sm transition-colors ${isWorkflow === wf ? "border-blue-500/50 bg-blue-500/10 text-blue-400" : "border-white/10 text-gray-400 hover:text-gray-200"}`}>
                {wf ? "Workflow Agent" : "Simple Chat Agent"}
              </button>
            ))}
          </div>
        </div>

        {/* 4. System Prompt or Workflow Builder */}
        {!isWorkflow ? (
          <div>
            {promptFile ? (
              <>
                {sectionTitle("System Prompt", "Using uploaded file as prompt")}
                <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#1a1a1a] px-4 py-3">
                  <FileText size={18} className="text-blue-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{promptFile.name}</p>
                    <p className="text-xs text-gray-500">Uploaded prompt file</p>
                  </div>
                  <button
                    onClick={removePromptFile}
                    className="rounded-md p-1 text-gray-500 hover:bg-white/5 hover:text-red-400 transition-colors"
                    title="Remove file"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  This file will be used as the agent's system prompt. Remove it to type a prompt manually instead.
                </p>
              </>
            ) : (
              <>
                {sectionTitle("System Prompt", `${systemPrompt.length}/10000 characters`)}
                <textarea
                  value={systemPrompt}
                  onChange={(e) => { if (e.target.value.length <= 10000) setSystemPrompt(e.target.value); }}
                  rows={6} placeholder="Define the agent's personality and instructions..."
                  className={inputClass + " resize-none"}
                />
              </>
            )}
            <div className="mt-2 flex gap-2">
              <button onClick={() => setShowWizard(true)} className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 px-3 py-1.5 text-xs text-purple-400 transition-colors hover:bg-purple-500/10">
                <Sparkles size={12} /> AI Prompt Wizard
              </button>
              {!promptFile && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:text-gray-200 disabled:opacity-50"
                >
                  {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {isUploading ? "Uploading..." : "Upload File"}
                </button>
              )}
              <input ref={fileInputRef} type="file" accept=".md,.txt,.docx" onChange={handlePromptFile} className="hidden" />
            </div>
          </div>
        ) : (
          <WorkflowBuilder steps={workflowSteps} onChange={setWorkflowSteps} description={description} />
        )}

        {/* 5. Model */}
        <div>
          {sectionTitle("Default Model", "GPT-4o Mini recommended for cost/speed")}
          <select value={model} onChange={(e) => setModel(e.target.value)} className={inputClass}>
            {MODEL_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        {/* 6. Trigger */}
        <div>
          {sectionTitle("Trigger")}
          <div className="flex gap-3">
            {(["manual", "scheduled", "event"] as const).map((t) => (
              <button key={t} onClick={() => setTrigger({ type: t })}
                className={`rounded-lg border px-4 py-2 text-sm capitalize transition-colors ${trigger.type === t ? "border-blue-500/50 bg-blue-500/10 text-blue-400" : "border-white/10 text-gray-400 hover:text-gray-200"}`}>
                {t}
              </button>
            ))}
          </div>
          {trigger.type === "scheduled" && (
            <div className="mt-4 space-y-3 rounded-lg border border-white/10 bg-[#1a1a1a] p-4">
              <div>
                <label className="text-xs text-gray-400">Frequency</label>
                <select value={trigger.schedule?.frequency || "daily"}
                  onChange={(e) => setTrigger({ ...trigger, schedule: { ...trigger.schedule, frequency: e.target.value as any } })}
                  className={inputClass + " mt-1"}>
                  <option value="daily">Every day</option>
                  <option value="weekdays">Every weekday</option>
                  <option value="weekly">Every week</option>
                  <option value="hourly">Every hour</option>
                  <option value="custom_hours">Every N hours</option>
                </select>
              </div>
              {trigger.schedule?.frequency !== "hourly" && trigger.schedule?.frequency !== "custom_hours" && (
                <div>
                  <label className="text-xs text-gray-400">Time</label>
                  <input type="time" value={trigger.schedule?.time || "09:00"}
                    onChange={(e) => setTrigger({ ...trigger, schedule: { ...trigger.schedule!, time: e.target.value } })}
                    className={inputClass + " mt-1"} />
                </div>
              )}
              {trigger.schedule?.frequency === "weekly" && (
                <div>
                  <label className="text-xs text-gray-400">Day</label>
                  <select value={trigger.schedule?.dayOfWeek || "monday"}
                    onChange={(e) => setTrigger({ ...trigger, schedule: { ...trigger.schedule!, dayOfWeek: e.target.value } })}
                    className={inputClass + " mt-1 capitalize"}>
                    {DAYS_OF_WEEK.map((d) => <option key={d} value={d} className="capitalize">{d}</option>)}
                  </select>
                </div>
              )}
              {trigger.schedule?.frequency === "custom_hours" && (
                <div>
                  <label className="text-xs text-gray-400">Every N hours</label>
                  <input type="number" min={1} max={24} value={trigger.schedule?.intervalHours || 2}
                    onChange={(e) => setTrigger({ ...trigger, schedule: { ...trigger.schedule!, intervalHours: Number(e.target.value) } })}
                    className={inputClass + " mt-1"} />
                </div>
              )}
            </div>
          )}
          {trigger.type === "event" && (
            <div className="mt-4 flex gap-3">
              {(["email_received", "slack_message"] as const).map((ev) => (
                <button key={ev} onClick={() => setTrigger({ ...trigger, event: ev })}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${trigger.event === ev ? "border-blue-500/50 bg-blue-500/10 text-blue-400" : "border-white/10 text-gray-400 hover:text-gray-200"}`}>
                  {ev === "email_received" ? "Email Received" : "Slack Message"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 7. MCP Connections */}
        <div>
          {sectionTitle("MCP Connections")}
          {availableMcp.length === 0 ? (
            <p className="text-xs text-gray-500">No MCP servers approved yet. Set them up in MCP Connections.</p>
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

        {/* 8. Skills */}
        <div>
          {sectionTitle("Skills")}
          {availableSkills.length === 0 ? (
            <p className="text-xs text-gray-500">No skills available. Create some in the Skill Library.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableSkills.map((sk) => {
                const sel = selectedSkills.includes(sk.id);
                return (
                  <button key={sk.id} onClick={() => setSelectedSkills((p) => sel ? p.filter((id) => id !== sk.id) : [...p, sk.id])}
                    className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors ${sel ? "border-purple-500/50 bg-purple-500/10 text-purple-400" : "border-white/10 text-gray-400"}`}>
                    {sel ? <X size={10} /> : <Plus size={10} />} {sk.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 9. Accepted Inputs */}
        <div>
          {sectionTitle("Accepted Inputs")}
          <div className="flex flex-wrap gap-2">
            {ACCEPTED_INPUT_OPTIONS.map((opt) => {
              const sel = acceptedInputs.includes(opt.value);
              return (
                <button key={opt.value} onClick={() => toggleInput(opt.value)}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${sel ? "border-blue-500/50 bg-blue-500/10 text-blue-400" : "border-white/10 text-gray-400 hover:text-gray-200"}`}>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 10. Knowledge */}
        <div>
          {sectionTitle("Knowledge", "Upload documents or add links for the agent to reference")}
          {/* Existing items */}
          {knowledge.length > 0 && (
            <div className="mb-3 space-y-2">
              {knowledge.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#1a1a1a] px-4 py-2.5">
                  {item.type === "file" ? <FileText size={16} className="text-blue-400 shrink-0" /> : <Globe size={16} className="text-green-400 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{item.name}</p>
                    {item.type === "link" && <p className="text-xs text-gray-500 truncate">{item.url}</p>}
                  </div>
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-gray-500 uppercase">{item.type}</span>
                  <button onClick={() => removeKnowledgeItem(item)} className="rounded-md p-1 text-gray-500 hover:bg-white/5 hover:text-red-400 transition-colors"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
          {/* Add file */}
          <div className="flex gap-2 mb-2">
            <button onClick={() => knowledgeFileRef.current?.click()} disabled={isUploadingKnowledge}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:text-gray-200 disabled:opacity-50">
              {isUploadingKnowledge ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {isUploadingKnowledge ? "Uploading..." : "Upload Document"}
            </button>
            <input ref={knowledgeFileRef} type="file" accept=".md,.txt,.docx" onChange={handleKnowledgeFile} className="hidden" />
          </div>
          {/* Add link */}
          <div className="flex gap-2">
            <input value={knowledgeLinkName} onChange={(e) => setKnowledgeLinkName(e.target.value)} placeholder="Label (optional)" className={inputClass + " max-w-[180px]"} />
            <input value={knowledgeUrl} onChange={(e) => setKnowledgeUrl(e.target.value)} placeholder="https://..." className={inputClass + " flex-1"}
              onKeyDown={(e) => e.key === "Enter" && addKnowledgeLink()} />
            <button onClick={addKnowledgeLink} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors">
              <LinkIcon size={12} /> Add Link
            </button>
          </div>
        </div>

        {/* 11. Visibility */}
        <div>
          {sectionTitle("Visibility", "Personal agents are only visible to you")}
          <div className="flex gap-3">
            {(["personal", "published"] as const).map((v) => (
              <button key={v} onClick={() => handleVisibilityChange(v)}
                className={`rounded-lg border px-4 py-2 text-sm capitalize transition-colors ${visibility === v ? "border-blue-500/50 bg-blue-500/10 text-blue-400" : "border-white/10 text-gray-400 hover:text-gray-200"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* 11. Your Name (for personal prefix) */}
        {visibility === "personal" && (
          <div>
            {sectionTitle("Your Name", "Used as a prefix on personal Slack handles so your agents are unique")}
            <input
              value={userName}
              onChange={(e) => handleUserNameChange(e.target.value)}
              placeholder="e.g. John"
              className={inputClass}
            />
          </div>
        )}

        {/* 12. Slack Handle */}
        <div>
          {sectionTitle("Slack Handle", "Unique handle to @ this agent in Slack")}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">@</span>
            <input value={slackHandle} onChange={(e) => handleSlackChange(e.target.value)} placeholder="my-agent" className={inputClass} />
          </div>
          {slackError && (
            <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
              <AlertCircle size={12} /> {slackError}
            </p>
          )}
          {visibility === "personal" && (
            <p className="mt-2 text-xs text-gray-500">
              Personal agents include your name as a prefix (e.g. @john-email-summariser). You can change the handle before publishing.
            </p>
          )}
        </div>

        {/* Submit */}
        <button onClick={handleCreate} className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700">
          {isEditMode ? "Update Agent" : "Create Agent"}
        </button>
      </div>

      {showWizard && (
        <PromptWizardModal
          currentPrompt={systemPrompt}
          description={description}
          onApply={(prompt) => { setSystemPrompt(prompt); setShowWizard(false); }}
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}

