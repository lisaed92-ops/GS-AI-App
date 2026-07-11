import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Trash2, CheckCircle2, ShieldCheck } from "lucide-react";
import PageShell from "../components/PageShell";
import { getApiKey, setApiKey, clearApiKey, type ApiKeyProvider } from "../lib/keys";

interface KeyField {
  provider: ApiKeyProvider;
  label: string;
  placeholder: string;
  hint: string;
  getKeyUrl: string;
}

const KEY_FIELDS: KeyField[] = [
  {
    provider: "openai",
    label: "OpenAI API Key",
    placeholder: "sk-...",
    hint: "Used for GPT models (chat, prompt wizard, workflow generation).",
    getKeyUrl: "https://platform.openai.com/api-keys",
  },
  {
    provider: "anthropic",
    label: "Anthropic API Key",
    placeholder: "sk-ant-...",
    hint: "Used for Claude models.",
    getKeyUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    provider: "accuweather",
    label: "AccuWeather API Key",
    placeholder: "Your AccuWeather API key",
    hint: "Optional — powers the weather tool for agents with the AccuWeather connection.",
    getKeyUrl: "https://developer.accuweather.com/",
  },
];

type ServerKeyStatus = Partial<Record<ApiKeyProvider, boolean>>;

export default function SettingsPage() {
  const [values, setValues] = useState<Record<ApiKeyProvider, string>>({
    openai: getApiKey("openai"),
    anthropic: getApiKey("anthropic"),
    accuweather: getApiKey("accuweather"),
  });
  const [visible, setVisible] = useState<Record<ApiKeyProvider, boolean>>({
    openai: false,
    anthropic: false,
    accuweather: false,
  });
  const [serverKeys, setServerKeys] = useState<ServerKeyStatus>({});
  const [savedProvider, setSavedProvider] = useState<ApiKeyProvider | null>(null);

  useEffect(() => {
    fetch("/api/keys/status")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => setServerKeys(data))
      .catch(() => setServerKeys({}));
  }, []);

  const handleSave = (provider: ApiKeyProvider) => {
    setApiKey(provider, values[provider]);
    setSavedProvider(provider);
    setTimeout(() => setSavedProvider((p) => (p === provider ? null : p)), 2000);
  };

  const handleClear = (provider: ApiKeyProvider) => {
    clearApiKey(provider);
    setValues((v) => ({ ...v, [provider]: "" }));
  };

  return (
    <PageShell title="Settings" description="Bring your own API keys to power chat, agents, and tools.">
      <div className="max-w-2xl space-y-6">
        <div className="flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-600/10 p-4">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-blue-400" />
          <div className="text-sm text-gray-300">
            <p className="font-medium text-blue-300">Your keys stay on your machine</p>
            <p className="mt-1 text-gray-400">
              Keys are stored only in this browser (localStorage) and sent directly to your local API
              server with each request. They are never saved server-side or sent anywhere else.
              Alternatively, whoever hosts the server can set keys in a <code className="rounded bg-white/10 px-1">.env.local</code> file
              — browser keys take priority when both exist.
            </p>
          </div>
        </div>

        {KEY_FIELDS.map((field) => {
          const hasLocal = Boolean(getApiKey(field.provider));
          const hasServer = Boolean(serverKeys[field.provider]);
          return (
            <div key={field.provider} className="rounded-xl border border-white/10 bg-[#161616] p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound size={16} className="text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-200">{field.label}</h3>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  {hasLocal && (
                    <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-green-400">Set in this browser</span>
                  )}
                  {hasServer && (
                    <span className="rounded-full bg-gray-500/15 px-2 py-0.5 text-gray-400">Set on server</span>
                  )}
                  {!hasLocal && !hasServer && (
                    <span className="rounded-full bg-yellow-500/15 px-2 py-0.5 text-yellow-400">Not configured</span>
                  )}
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {field.hint}{" "}
                <a href={field.getKeyUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                  Get a key
                </a>
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={visible[field.provider] ? "text" : "password"}
                    value={values[field.provider]}
                    onChange={(e) => setValues((v) => ({ ...v, [field.provider]: e.target.value }))}
                    placeholder={field.placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 pr-10 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setVisible((v) => ({ ...v, [field.provider]: !v[field.provider] }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    title={visible[field.provider] ? "Hide key" : "Show key"}
                  >
                    {visible[field.provider] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button
                  onClick={() => handleSave(field.provider)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
                >
                  {savedProvider === field.provider ? (
                    <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> Saved</span>
                  ) : (
                    "Save"
                  )}
                </button>
                {hasLocal && (
                  <button
                    onClick={() => handleClear(field.provider)}
                    className="rounded-lg border border-white/10 p-2 text-gray-500 transition-colors hover:border-red-500/40 hover:text-red-400"
                    title="Remove key from this browser"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
