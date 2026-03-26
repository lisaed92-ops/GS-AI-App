import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Star,
  MessageSquare,
  Users,
  List,
  Wrench,
  Link2,
  Zap,
  Clock,
  Calendar,
} from "lucide-react";

const mainNav = [
  { name: "Home", href: "/", icon: Home },
  { name: "Favourites", href: "/favourites", icon: Star },
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "My Agents", href: "/my-agents", icon: Users },
  { name: "All Agents", href: "/all-agents", icon: List },
  { name: "Agent Builder", href: "/agent-builder", icon: Wrench },
  { name: "Connections", href: "/connections", icon: Link2 },
  { name: "Triggers", href: "/triggers", icon: Zap },
];

const scheduleNav = [
  { name: "Day / Time", href: "/schedule/day-time", icon: Clock },
  { name: "Event", href: "/schedule/event", icon: Calendar },
];

export default function Sidebar() {
  const { pathname } = useLocation();

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

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[220px] flex-col border-r border-white/10 bg-[#111111]">
      <div className="px-4 py-5">
        <h1 className="text-lg font-bold text-white">Agent Studio</h1>
        <p className="text-xs text-gray-500">Global Streaming Agents</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {mainNav.map((item) => navItem(item))}
        <div className="pb-1 pt-5">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
            Schedule
          </p>
        </div>
        {scheduleNav.map((item) => navItem(item))}
      </nav>
      <div className="border-t border-white/5 px-4 py-3">
        <span className="text-[10px] text-gray-600">v1.0.0</span>
      </div>
    </aside>
  );
}
