import { useDevMode } from "../context/DevModeContext";

export default function DevModeToggle() {
  const { isDevMode, toggle } = useDevMode();

  return (
    <div className="flex items-center rounded-lg border border-white/10 bg-[#1a1a1a] p-0.5">
      <button
        onClick={() => isDevMode && toggle()}
        className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
          !isDevMode ? "bg-blue-600/20 text-blue-400" : "text-gray-500 hover:text-gray-300"
        }`}
      >
        Non-Developer
      </button>
      <button
        onClick={() => !isDevMode && toggle()}
        className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
          isDevMode ? "bg-blue-600/20 text-blue-400" : "text-gray-500 hover:text-gray-300"
        }`}
      >
        Developer
      </button>
    </div>
  );
}

