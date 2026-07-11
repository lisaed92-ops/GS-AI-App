import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ChatPage from "./pages/ChatPage";
import CreateAgentPage from "./pages/CreateAgentPage";
import AgentLibraryPage from "./pages/AgentLibraryPage";
import SkillLibraryPage from "./pages/SkillLibraryPage";
import CreateSkillPage from "./pages/CreateSkillPage";
import McpConnectionsPage from "./pages/McpConnectionsPage";
import ApprovalsPage from "./pages/ApprovalsPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ChatPage />} />
        <Route path="/create-agent" element={<CreateAgentPage />} />
        <Route path="/create-agent/:id" element={<CreateAgentPage />} />
        <Route path="/agents" element={<AgentLibraryPage />} />
        <Route path="/skills" element={<SkillLibraryPage />} />
        <Route path="/create-skill" element={<CreateSkillPage />} />
        <Route path="/create-skill/:id" element={<CreateSkillPage />} />
        <Route path="/connections" element={<McpConnectionsPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

