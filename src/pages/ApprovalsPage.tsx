import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, Eye, ChevronDown, ChevronUp } from "lucide-react";
import type { PendingApproval, ApprovalStatus } from "../types/agent";
import { getApprovals, updateApprovalStatus } from "../lib/storage";

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "text-yellow-400 bg-yellow-400/10 border-yellow-500/30", icon: Clock },
  approved: { label: "Approved", color: "text-green-400 bg-green-400/10 border-green-500/30", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "text-red-400 bg-red-400/10 border-red-500/30", icon: XCircle },
};

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [filter, setFilter] = useState<ApprovalStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = () => setApprovals(getApprovals());
  useEffect(() => { refresh(); }, []);

  const filtered = filter === "all" ? approvals : approvals.filter((a) => a.status === filter);
  const pendingCount = approvals.filter((a) => a.status === "pending").length;
  const approvedCount = approvals.filter((a) => a.status === "approved").length;
  const rejectedCount = approvals.filter((a) => a.status === "rejected").length;

  const handleAction = (id: string, status: "approved" | "rejected") => {
    updateApprovalStatus(id, status);
    refresh();
  };

  return (
    <div className="h-screen overflow-y-auto p-8">
      <h1 className="text-2xl font-bold text-white">Approvals</h1>
      <p className="mt-1 text-sm text-gray-500">
        Review agent actions before they are executed.
      </p>

      {/* Stats */}
      <div className="mt-6 flex gap-4">
        {[
          { label: "Pending", count: pendingCount, color: "border-yellow-500/30 text-yellow-400" },
          { label: "Approved", count: approvedCount, color: "border-green-500/30 text-green-400" },
          { label: "Rejected", count: rejectedCount, color: "border-red-500/30 text-red-400" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border ${s.color} bg-[#1a1a1a] px-5 py-3`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="mt-6 flex gap-2">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-lg border px-4 py-2 text-sm capitalize transition-colors ${
              filter === f
                ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                : "border-white/10 text-gray-400 hover:text-gray-200"
            }`}
          >
            {f} {f !== "all" && `(${f === "pending" ? pendingCount : f === "approved" ? approvedCount : rejectedCount})`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="mt-6 space-y-3 pb-12">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 py-16 text-center">
            <Clock size={32} className="mx-auto text-gray-600" />
            <p className="mt-3 text-sm text-gray-500">
              {filter === "all" ? "No approvals yet. They'll appear here when a workflow agent reaches a human review step." : `No ${filter} approvals.`}
            </p>
          </div>
        ) : (
          filtered.map((approval) => {
            const config = STATUS_CONFIG[approval.status];
            const StatusIcon = config.icon;
            const isExpanded = expandedId === approval.id;

            return (
              <div key={approval.id} className="rounded-xl border border-white/10 bg-[#1a1a1a]">
                {/* Header row */}
                <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : approval.id)}>
                  <StatusIcon size={18} className={config.color.split(" ")[0]} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{approval.agentName}</p>
                    <p className="text-xs text-gray-500 truncate">{approval.summary}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${config.color}`}>
                    {config.label}
                  </span>
                  <span className="text-xs text-gray-600">{new Date(approval.createdAt).toLocaleDateString()}</span>
                  {isExpanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-white/5 px-5 py-4 space-y-4">
                    <div>
                      <p className="text-xs font-medium text-gray-400 mb-1">Output Preview</p>
                      <div className="rounded-lg bg-[#111] p-3 text-sm text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {approval.outputPreview || "No output available."}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 mb-1">Next Step</p>
                      <p className="text-sm text-gray-300">{approval.nextStepDescription || "End of workflow."}</p>
                    </div>
                    {approval.reviewedAt && (
                      <p className="text-xs text-gray-600">Reviewed: {new Date(approval.reviewedAt).toLocaleString()}</p>
                    )}

                    {/* Actions for pending items */}
                    {approval.status === "pending" && (
                      <div className="flex gap-3 pt-2">
                        <button onClick={() => handleAction(approval.id, "approved")}
                          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700">
                          <CheckCircle2 size={14} /> Approve
                        </button>
                        <button onClick={() => handleAction(approval.id, "rejected")}
                          className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10">
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

