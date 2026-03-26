import PageShell from "@/components/PageShell";

export default function DayTimePage() {
  return (
    <PageShell title="Day / Time Schedule" description="Schedule agents to run at specific times.">
      <p className="text-sm text-gray-500">No schedules configured yet.</p>
    </PageShell>
  );
}

