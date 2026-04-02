import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Star, Sparkles, Plus, Pencil } from "lucide-react";
import { type Skill } from "../types/agent";
import { getSkills, saveSkill } from "../lib/storage";

export default function SkillLibraryPage() {
  const navigate = useNavigate();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<"all" | "personal" | "team">("all");
  const [showFavs, setShowFavs] = useState(false);

  useEffect(() => {
    setSkills(getSkills());
  }, []);

  const toggleFav = (id: string) => {
    setSkills((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, favourite: !s.favourite };
        saveSkill(updated);
        return updated;
      })
    );
  };

  const filtered = skills.filter((s) => {
    if (showFavs && !s.favourite) return false;
    if (scope !== "all" && s.scope !== scope) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Skill Library</h1>
          <p className="mt-1 text-sm text-gray-500">Reusable instruction sets for your agents.</p>
        </div>
        <button
          onClick={() => navigate("/create-skill")}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={16} /> Create Skill
        </button>
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills..."
            className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] py-2 pl-9 pr-3 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500/50"
          />
        </div>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as "all" | "personal" | "team")}
          className="rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-gray-300 outline-none"
        >
          <option value="all">All</option>
          <option value="personal">Personal</option>
          <option value="team">Team</option>
        </select>
        <button
          onClick={() => setShowFavs(!showFavs)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
            showFavs
              ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-400"
              : "border-white/10 text-gray-400 hover:text-gray-200"
          }`}
        >
          <Star size={14} fill={showFavs ? "currentColor" : "none"} />
          Favourites
        </button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <Sparkles size={40} className="text-gray-600" />
          <p className="text-gray-400">
            {skills.length === 0
              ? "No skills yet. Create one to get started!"
              : "No skills match your filters."}
          </p>
          {skills.length === 0 && (
            <button
              onClick={() => navigate("/create-skill")}
              className="mt-2 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Plus size={16} /> Create Your First Skill
            </button>
          )}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-white/10 bg-[#1a1a1a] p-5 transition-colors hover:border-white/20"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-white">{s.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => navigate(`/create-skill/${s.id}`)} className="text-gray-500 hover:text-gray-300" title="Edit skill">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => toggleFav(s.id)} className="text-gray-500 hover:text-yellow-400">
                    <Star size={16} fill={s.favourite ? "currentColor" : "none"} className={s.favourite ? "text-yellow-400" : ""} />
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-400 line-clamp-2">{s.description}</p>
              <div className="mt-3">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                  s.scope === "personal" ? "bg-blue-500/10 text-blue-400" : "bg-green-500/10 text-green-400"
                }`}>
                  {s.scope}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

