import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import DevModeToggle from "./DevModeToggle";
import { DevModeProvider, useDevMode } from "../context/DevModeContext";
import kandevWorkflow from "../../images/Kandev Workflow.png";
import factoriLogo from "../../Images/Factori_30h.png";

/** Top header shown only in Developer mode (replaces the sidebar). */
function TopHeader() {
  return (
    <header className="fixed left-0 top-0 z-40 flex w-full items-center justify-between border-b border-white/10 bg-[#111111] px-6 py-3">
      <div>
        <img src={factoriLogo} alt="Factori" className="h-[30px]" />
        <p className="mt-1 text-xs text-gray-500">AI Agent Platform</p>
      </div>
      <div className="w-56">
        <DevModeToggle />
      </div>
    </header>
  );
}

function LayoutInner() {
  const { isDevMode } = useDevMode();

  if (isDevMode) {
    return (
      <>
        <TopHeader />
        <main className="h-screen overflow-y-auto pt-[72px] bg-[#0a0a0a]">
          <div className="flex flex-col items-center p-8">
            <h1 className="mb-6 text-2xl font-bold text-white">Developer Workflow</h1>
            <img
              src={kandevWorkflow}
              alt="Kandev Workflow"
              className="max-w-full rounded-lg border border-white/10"
            />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <main className="ml-[220px] h-screen overflow-y-auto">
        <Outlet />
      </main>
    </>
  );
}

export default function Layout() {
  return (
    <DevModeProvider>
      <LayoutInner />
    </DevModeProvider>
  );
}

