import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Loader2 } from "lucide-react";
import { apiKeyHeaders } from "../lib/keys";

interface Props {
  currentPrompt: string;
  description: string;
  onApply: (prompt: string) => void;
  onClose: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function PromptWizardModal({ currentPrompt, description, onApply, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedPrompt, setSuggestedPrompt] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-start the wizard
    const startMsg = currentPrompt
      ? `I have an existing prompt for my agent:\n\n"${currentPrompt.slice(0, 500)}${currentPrompt.length > 500 ? "..." : ""}"\n\n${description ? `The agent description is: "${description}"\n\n` : ""}Please help me improve this prompt. Ask me up to 3 clarifying questions.`
      : `I need help writing a system prompt for my AI agent.${description ? ` The agent description is: "${description}"` : ""}\n\nPlease ask me up to 3 clarifying questions to help build a great prompt.`;
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
      const systemPrompt = `You are a prompt engineering wizard helping non-technical users build system prompts for AI agents. 
Your goal: Ask up to 3 clarifying questions, then generate a comprehensive system prompt.
Rules:
- Ask questions one at a time or in a batch of 2-3
- After getting answers, generate the final prompt
- When you generate the final prompt, wrap it in <PROMPT> and </PROMPT> tags
- Keep language clear and non-technical
- The generated prompt should be detailed, well-structured, and under 10000 characters`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiKeyHeaders() },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          systemPrompt,
          messages: newMessages,
        }),
      });

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
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: "assistant", content: text };
                    return updated;
                  });
                }
              } catch {}
            }
          }
        }
      }

      // Check for suggested prompt
      const promptMatch = text.match(/<PROMPT>([\s\S]*?)<\/PROMPT>/);
      if (promptMatch) {
        setSuggestedPrompt(promptMatch[1].trim());
      }
    } catch (err) {
      console.error("Wizard error:", err);
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[600px] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[#111]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-purple-400" />
            <h2 className="text-sm font-semibold text-white">AI Prompt Wizard</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`rounded-xl px-4 py-3 text-sm ${m.role === "user" ? "ml-auto max-w-[80%] bg-blue-600/20 text-blue-100" : "mr-auto max-w-[80%] bg-[#1a1a1a] text-gray-300"}`}>
              {m.content || (isLoading && i === messages.length - 1 && <Loader2 size={14} className="animate-spin text-gray-500" />)}
            </div>
          ))}
          <div ref={scrollRef} />
        </div>

        {/* Suggested prompt banner */}
        {suggestedPrompt && (
          <div className="border-t border-white/10 bg-purple-500/10 px-5 py-3">
            <p className="mb-2 text-xs font-medium text-purple-400">Suggested prompt ready!</p>
            <button onClick={() => onApply(suggestedPrompt)}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700">
              Apply Prompt
            </button>
          </div>
        )}

        {/* Input */}
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

