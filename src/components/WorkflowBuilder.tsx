import { useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Sparkles, Plug, Bot, Send, UserCheck } from "lucide-react";
import { type WorkflowStep, type WorkflowStepType } from "../types/agent";
import { generateId } from "../lib/storage";
import { apiKeyHeaders } from "../lib/keys";

const STEP_TYPES: { value: WorkflowStepType; label: string; icon: typeof Bot; color: string }[] = [
  { value: "fetch", label: "Fetch Data", icon: Plug, color: "text-green-400" },
  { value: "ai_process", label: "AI Process", icon: Bot, color: "text-blue-400" },
  { value: "send_output", label: "Send Output", icon: Send, color: "text-orange-400" },
  { value: "human_review", label: "Human Review", icon: UserCheck, color: "text-yellow-400" },
];

interface Props {
  steps: WorkflowStep[];
  onChange: (steps: WorkflowStep[]) => void;
  description: string;
}

export default function WorkflowBuilder({ steps, onChange, description }: Props) {
  const [generating, setGenerating] = useState(false);

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: generateId(),
      order: steps.length + 1,
      type: "ai_process",
      label: `Step ${steps.length + 1}`,
      instruction: "",
    };
    onChange([...steps, newStep]);
  };

  const removeStep = (id: string) => {
    onChange(steps.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })));
  };

  const updateStep = (id: string, updates: Partial<WorkflowStep>) => {
    onChange(steps.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const moveStep = (id: string, direction: "up" | "down") => {
    const idx = steps.findIndex((s) => s.id === id);
    if ((direction === "up" && idx === 0) || (direction === "down" && idx === steps.length - 1)) return;
    const newSteps = [...steps];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newSteps[idx], newSteps[swapIdx]] = [newSteps[swapIdx], newSteps[idx]];
    onChange(newSteps.map((s, i) => ({ ...s, order: i + 1 })));
  };

  const generateFromDescription = async () => {
    if (!description.trim()) return alert("Add a description first so the AI knows what workflow to build.");
    setGenerating(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiKeyHeaders() },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: `Based on this agent description, generate a workflow as a JSON array of steps. Each step should have: type (one of: "fetch", "ai_process", "send_output", "human_review"), label (short name), and instruction (what to do). Return ONLY valid JSON, no markdown.\n\nDescription: "${description}"` }],
        }),
      });
      let text = "";
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try { const d = JSON.parse(line.slice(6)); if (d.token) text += d.token; } catch {}
            }
          }
        }
      }
      // Parse JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { type: string; label: string; instruction: string }[];
        const newSteps: WorkflowStep[] = parsed.map((s, i) => ({
          id: generateId(), order: i + 1,
          type: (["fetch", "ai_process", "send_output", "human_review"].includes(s.type) ? s.type : "ai_process") as WorkflowStepType,
          label: s.label, instruction: s.instruction,
        }));
        onChange(newSteps);
      }
    } catch (err) {
      console.error("Failed to generate workflow:", err);
    }
    setGenerating(false);
  };

  const inputClass = "w-full rounded-lg border border-white/10 bg-[#111] px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500/50";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Workflow Steps</h3>
          <p className="text-xs text-gray-500">Define the steps your agent will execute in order.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={generateFromDescription} disabled={generating}
            className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 px-3 py-1.5 text-xs text-purple-400 transition-colors hover:bg-purple-500/10 disabled:opacity-50">
            <Sparkles size={12} /> {generating ? "Generating..." : "Generate from Description"}
          </button>
          <button onClick={addStep} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200">
            <Plus size={12} /> Add Step
          </button>
        </div>
      </div>

      {steps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-12 text-center text-sm text-gray-500">
          No steps yet. Add a step or generate from your description.
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, idx) => {
            const stepType = STEP_TYPES.find((t) => t.value === step.type) || STEP_TYPES[1];
            const Icon = stepType.icon;
            return (
              <div key={step.id} className="rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
                <div className="mb-3 flex items-center gap-3">
                  <Icon size={16} className={stepType.color} />
                  <span className="text-xs font-medium text-gray-400">Step {idx + 1}</span>
                  <select value={step.type} onChange={(e) => updateStep(step.id, { type: e.target.value as WorkflowStepType })}
                    className="rounded border border-white/10 bg-[#111] px-2 py-1 text-xs text-gray-300 outline-none">
                    {STEP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <div className="flex-1" />
                  <button onClick={() => moveStep(step.id, "up")} disabled={idx === 0} className="text-gray-500 hover:text-gray-300 disabled:opacity-30"><ArrowUp size={14} /></button>
                  <button onClick={() => moveStep(step.id, "down")} disabled={idx === steps.length - 1} className="text-gray-500 hover:text-gray-300 disabled:opacity-30"><ArrowDown size={14} /></button>
                  <button onClick={() => removeStep(step.id)} className="text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
                <input value={step.label} onChange={(e) => updateStep(step.id, { label: e.target.value })} placeholder="Step name" className={inputClass + " mb-2"} />
                <textarea value={step.instruction} onChange={(e) => updateStep(step.id, { instruction: e.target.value })} rows={2}
                  placeholder={step.type === "fetch" ? "Describe what data to fetch..." : step.type === "send_output" ? "Describe where and how to send..." : step.type === "human_review" ? "What should be reviewed before proceeding?" : "Describe what the AI should do..."}
                  className={inputClass + " resize-none"} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

