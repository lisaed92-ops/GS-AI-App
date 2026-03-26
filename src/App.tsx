import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import ChatPage from "./pages/ChatPage";
import MyAgentsPage from "./pages/MyAgentsPage";
import AllAgentsPage from "./pages/AllAgentsPage";
import AgentBuilderPage from "./pages/AgentBuilderPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import TriggersPage from "./pages/TriggersPage";
import FavouritesPage from "./pages/FavouritesPage";
import DayTimePage from "./pages/DayTimePage";
import EventPage from "./pages/EventPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/favourites" element={<FavouritesPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/my-agents" element={<MyAgentsPage />} />
        <Route path="/all-agents" element={<AllAgentsPage />} />
        <Route path="/agent-builder" element={<AgentBuilderPage />} />
        <Route path="/connections" element={<ConnectionsPage />} />
        <Route path="/triggers" element={<TriggersPage />} />
        <Route path="/schedule/day-time" element={<DayTimePage />} />
        <Route path="/schedule/event" element={<EventPage />} />
      </Route>
    </Routes>
  );
}

