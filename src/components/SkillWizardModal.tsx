import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Loader2 } from "lucide-react";
import { apiKeyHeaders } from "../lib/keys";

interface Props {
  skillName: string;
  skillDescription: string;
  currentInstructions: string;
  availableMcpNames: string[];
  onApply: (instructions: string) => void;
  onClose: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function SkillWizardModal({ skillName, skillDescription, currentInstructions, availableMcpNames, onApply, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedInstructions, setSuggestedInstructions] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mcpList = availableMcpNames.length > 0 ? availableMcpNames.join(", ") : "none selected";
    const startMsg = currentInstructions
      ? `I have existing instructions for my skill "${skillName}":\n\n"${currentInstructions.slice(0, 500)}${currentInstructions.length > 500 ? "..." : ""}"\n\n${skillDescription ? `The skill description is: "${skillDescription}"\n` : ""}Available MCP connections: ${mcpList}\n\nPlease help me improve these instructions. Ask me up to 3 clarifying questions.`
      : `I need help writing instructions for a skill called "${skillName}".${skillDescription ? ` The skill description is: "${skillDescription}"` : ""}\n\nAvailable MCP connections: ${mcpList}\n\nPlease ask me up to 3 clarifying questions to help build great instructions.`;
    sendMessage(startMsg, true);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (content: string, isAuto = false) => {
    const userMsg: Message = { role: "user", content };
    const newMessages = isAuto ? [userMsg] : [...messages, userMsg];
    setMessages(newMessages);
    if (!isAuto) setInput("");
    setIsLoading(true);

    try {
      const systemPrompt = `You are a skill instruction wizard helping users write instructions for AI agent skills.
A skill is a reusable instruction set that tells an agent how to perform a specific task. Skills can optionally use MCP connections (external services) to access live data or perform actions.

Context:
- Skill name: "${skillName}"
- Skill description: "${skillDescription}"
- Available MCP connections: ${availableMcpNames.length > 0 ? availableMcpNames.join(", ") : "none"}

Rules:
- Ask up to 3 clarifying questions about what the skill should do, what criteria/rules to follow, and what the output should look like
- Ask questions one at a time or in a batch of 2-3
- After getting answers, generate clear, structured instructions
- If MCP connections are available, reference how the skill should use them
- When you generate the final instructions, wrap them in <INSTRUCTIONS> and </INSTRUCTIONS> tags
- Keep language clear and non-technical
- The generated instructions should be detailed, well-structured, and under 10000 characters`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiKeyHeaders() },
        body: JSON.stringify({ model: "gpt-4o-mini", systemPrompt, messages: newMessages }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const msg = errBody?.error || `Server error: ${res.status}`;
        if (res.status === 401) {
          alert("No API key found. Please go to Settings to add your API key.");
        } else {
          alert(msg);
        }
        setIsLoading(false);
        return;
      }

      let text = "";
      const assistantMsg: Message = { role: "assistant", content: "" };
      setMessages([...newMessages, assistantMsg]);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const d = JSON.parse(line.slice(6));
                if (d.token) {
                  text += d.token;
                  setMessages((prev) => {
                    const updated = prev.slice(0, -1);
                    return [...updated, { role: "assistant", content: text }];
                  });
                }
              } catch {}
            }
          }
        }
      }

      const match = text.match(/<INSTRUCTIONS>([\s\S]*?)<\/INSTRUCTIONS>/);
      if (match) setSuggestedInstructions(match[1].trim());
    } catch (err) {
      console.error("Skill wizard error:", err);
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[600px] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[#111]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-purple-400" />
            <h2 className="text-sm font-semibold text-white">AI Skill Wizard</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${m.role === "user" ? "ml-auto max-w-[80%] bg-blue-600/20 text-blue-100" : "mr-auto max-w-[80%] bg-[#1a1a1a] text-gray-300"}`}>
              {m.content || (isLoading && i === messages.length - 1 && <Loader2 size={14} className="animate-spin text-gray-500" />)}
            </div>
          ))}
          <div ref={scrollRef} />
        </div>

        {suggestedInstructions && (
          <div className="border-t border-white/10 bg-purple-500/10 px-5 py-3">
            <p className="mb-2 text-xs font-medium text-purple-400">Skill instructions ready!</p>
            <button onClick={() => onApply(suggestedInstructions)}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700">
              Apply Instructions
            </button>
          </div>
        )}

        <div className="border-t border-white/10 px-5 py-3">
          <div className="flex items-center gap-3">
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !isLoading && input.trim()) sendMessage(input); }}
              placeholder="Type your answer..." disabled={isLoading}
              className="flex-1 rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500/50 disabled:opacity-50" />
            <button onClick={() => input.trim() && sendMessage(input)} disabled={isLoading || !input.trim()}
              className="rounded-xl bg-blue-600 p-2.5 text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

