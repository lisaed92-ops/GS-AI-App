import { useState } from "react";
import { Send } from "lucide-react";

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: input }]);
    // TODO: integrate with OpenAI / Anthropic API
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "I'm an AI agent. API integration coming soon!" },
    ]);
    setInput("");
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-500">Start a conversation with an AI agent.</p>
          </div>
        )}
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-xl px-4 py-3 text-sm ${
                m.role === "user"
                  ? "ml-auto max-w-[80%] bg-blue-600/20 text-blue-100"
                  : "mr-auto max-w-[80%] bg-[#1a1a1a] text-gray-300"
              }`}
            >
              {m.content}
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/10 bg-[#111] px-8 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500/50"
          />
          <button
            onClick={handleSend}
            className="rounded-xl bg-blue-600 p-3 text-white transition-colors hover:bg-blue-700"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

