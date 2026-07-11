import { Link, useLocation } from "react-router-dom";
import {
  MessageSquare,
  PlusCircle,
  Bot,
  Sparkles,
  Server,
  Inbox,
  ChevronRight,
  X,
  Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getAgents, getSkills, getMcpConnections, getChatHistories, deleteChatHistory } from "../lib/storage";
import gsIcon from "../../Images/GS_24.png";

const topNav = [
  { name: "Create Agent", href: "/create-agent", icon: PlusCircle },
  { name: "Create Skill", href: "/create-skill", icon: PlusCircle },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // Dropdown open state
  const [chatOpen, setChatOpen] = useState(true);
  const [agentsOpen, setAgentsOpen] = useState(true);
  const [skillsOpen, setSkillsOpen] = useState(true);
  const [mcpOpen, setMcpOpen] = useState(true);

  // Data for dropdowns — poll every 2s so they stay fresh
  const [recentChats, setRecentChats] = useState<{ id: string; name: string }[]>([]);
  const [favAgents, setFavAgents] = useState<{ id: string; name: string }[]>([]);
  const [favSkills, setFavSkills] = useState<{ id: string; name: string }[]>([]);
  const [mcpConns, setMcpConns] = useState<{ id: string; name: string }[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const poll = () => {
      setRecentChats(
        getChatHistories()
          .slice(0, 5)
          .map((c) => ({ id: c.id, name: c.title }))
      );
      const allAgents = getAgents().sort((a, b) => a.name.localeCompare(b.name));
      const favouritedAgents = allAgents.filter((a) => a.favourite);
      setFavAgents(
        (favouritedAgents.length > 0 ? favouritedAgents : allAgents.slice(0, 5))
          .map((a) => ({ id: a.id, name: a.name }))
      );
      const allSkills = getSkills().sort((a, b) => a.name.localeCompare(b.name));
      const favouritedSkills = allSkills.filter((s) => s.favourite);
      setFavSkills(
        (favouritedSkills.length > 0 ? favouritedSkills : allSkills.slice(0, 5))
          .map((s) => ({ id: s.id, name: s.name }))
      );
      setMcpConns(
        getMcpConnections()
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((c) => ({ id: c.id, name: c.name }))
      );
      try {
        const approvals = JSON.parse(localStorage.getItem("pendingApprovals") || "[]");
        setPendingCount(approvals.filter((a: any) => a.status === "pending").length);
      } catch { setPendingCount(0); }
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  const navItem = (item: { name: string; href: string; icon: React.ElementType }) => {
    const isActive = pathname === item.href;
    return (
      <Link
        key={item.name}
        to={item.href}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
          isActive
            ? "bg-blue-600/20 text-blue-400"
            : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
        }`}
      >
        <item.icon size={18} />
        {item.name}
      </Link>
    );
  };

  const sectionLabel = (label: string) => (
    <div className="pb-1 pt-5">
      <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
        {label}
      </p>
    </div>
  );

  /** A nav link with a collapsible chevron + sub-items */
  const navItemWithDropdown = (
    item: { name: string; href: string; icon: React.ElementType },
    isOpen: boolean,
    toggle: () => void,
    subItems: { id: string; name: string; href: string }[],
    onDeleteItem?: (id: string) => void,
  ) => {
    const isActive = pathname === item.href;
    return (
      <div key={item.name}>
        <div className="flex items-center">
          <Link
            to={item.href}
            className={`flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-blue-600/20 text-blue-400"
                : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
            }`}
          >
            <item.icon size={18} />
            {item.name}
          </Link>
          {subItems.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); toggle(); }}
              className="mr-1 rounded p-1 text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors"
              aria-label={`Toggle ${item.name} list`}
            >
              <ChevronRight
                size={14}
                className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
              />
            </button>
          )}
        </div>
        {isOpen && subItems.length > 0 && (
          <div className="ml-6 mt-0.5 space-y-0.5 border-l border-white/5 pl-2">
            {subItems.map((sub) => (
              <div key={sub.id} className="group flex items-center">
                <Link
                  to={sub.href}
                  className={`flex-1 block truncate rounded px-2 py-1 text-xs transition-colors ${
                    pathname === sub.href || (pathname + window.location.search) === sub.href
                      ? "text-blue-400"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                  title={sub.name}
                >
                  {sub.name}
                </Link>
                {onDeleteItem && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteItem(sub.id); }}
                    className="mr-1 hidden rounded p-0.5 text-gray-600 hover:text-red-400 group-hover:block"
                    title="Delete"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[220px] flex-col border-r border-white/10 bg-[#111111]">
      <div className="px-4 py-5">
        <img src={gsIcon} alt="Global Streaming" className="h-[36px]" />
        <p className="mt-1 text-xs text-gray-500">AI Agent Platform</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {navItemWithDropdown(
          { name: "Chat", href: "/", icon: MessageSquare },
          chatOpen,
          () => setChatOpen((o) => !o),
          recentChats.map((c) => ({ ...c, href: `/?chat=${c.id}` })),
          (id) => {
            deleteChatHistory(id);
            setRecentChats((prev) => prev.filter((c) => c.id !== id));
            // If deleting the currently active chat, navigate to fresh chat
            if (window.location.search.includes(id)) {
              navigate("/");
            }
          },
        )}
        {topNav.map((item) => navItem(item))}

        {/* Approvals with badge */}
        <Link
          to="/approvals"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
            pathname === "/approvals"
              ? "bg-blue-600/20 text-blue-400"
              : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
          }`}
        >
          <Inbox size={18} />
          Approvals
          {pendingCount > 0 && (
            <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {pendingCount}
            </span>
          )}
        </Link>

        {sectionLabel("Libraries")}
        {navItemWithDropdown(
          { name: "Agent Library", href: "/agents", icon: Bot },
          agentsOpen,
          () => setAgentsOpen((o) => !o),
          favAgents.map((a) => ({ ...a, href: `/create-agent/${a.id}` })),
        )}
        {navItemWithDropdown(
          { name: "Skill Library", href: "/skills", icon: Sparkles },
          skillsOpen,
          () => setSkillsOpen((o) => !o),
          favSkills.map((s) => ({ ...s, href: `/skills` })),
        )}

        {sectionLabel("Connections")}
        {navItemWithDropdown(
          { name: "MCP Connections & Tools", href: "/connections", icon: Server },
          mcpOpen,
          () => setMcpOpen((o) => !o),
          mcpConns.map((c) => ({ ...c, href: `/connections` })),
        )}

        {sectionLabel("Configuration")}
        {navItem({ name: "Settings", href: "/settings", icon: Settings })}
      </nav>
      <div className="border-t border-white/5 px-4 py-3 flex items-center gap-2">
        <img src={gsIcon} alt="Global Streaming" className="h-[24px]" />
        <span className="text-[10px] text-gray-600">v1.0.0</span>
      </div>
    </aside>
  );
}
