import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <>
      <Sidebar />
      <main className="ml-[220px] h-screen overflow-y-auto">
        <Outlet />
      </main>
    </>
  );
}

