import React, { useState, useEffect } from "react";
import { useCommissionApprovals } from "@/hooks/useCommissionApprovals";
import { Button } from "@/components/ui/button";
import { ShopHeader } from "@/components/ShopHeader";
import { CheckCircle, AlertCircle, Clock, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ApproveCommissions = () => {
  const { approvals, isLoading, fetchApprovals, approveCommission, rejectCommission, markAsPaid } =
    useCommissionApprovals();
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "paid" | "rejected">("pending");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchApprovals(activeTab === "paid" ? "paid" : activeTab === "rejected" ? "rejected" : activeTab);
  }, [activeTab, fetchApprovals]);

  const handleApprove = async (id: string) => {
    // In a real app, would get current user ID from context
    const currentUserId = "staff-001"; // Placeholder
    await approveCommission(id, currentUserId);
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return;
    await rejectCommission(id, rejectReason);
    setRejectingId(null);
    setRejectReason("");
  };

  const handleMarkPaid = async (id: string) => {
    await markAsPaid(id);
  };

  const filteredApprovals = approvals.filter((a) => a.status === activeTab);

  return (
    <div className="min-h-screen bg-background pb-20">
      <ShopHeader title="Commission Approvals" showBack />

      <div className="px-4 py-6 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {["pending", "approved", "paid", "rejected"].map((tab: any) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "text-sm rounded-full px-4 py-1.5 font-medium whitespace-nowrap transition-colors capitalize",
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-muted"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredApprovals.length === 0 && (
          <div className="bg-secondary rounded-xl p-6 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground font-medium">No {activeTab} commissions</p>
          </div>
        )}

        {/* Commissions List */}
        <div className="space-y-3">
          {filteredApprovals.map((approval) => (
            <div key={approval.id} className="bg-card rounded-xl p-4 card-elevated border">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-foreground truncate">
                    {(approval as any).customer_name || "Customer"}
                  </h3>
                  <p className="text-sm text-muted-foreground">{approval.mpesa_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-bold text-primary">KSh {approval.amount.toLocaleString()}</p>
                </div>
              </div>

              {approval.rejection_reason && (
                <div className="bg-destructive/10 rounded-lg p-2 mb-3 text-sm">
                  <p className="text-xs text-muted-foreground">Rejection Reason:</p>
                  <p className="text-destructive font-medium">{approval.rejection_reason}</p>
                </div>
              )}

              {approval.approved_by && (
                <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                  Approved by staff
                  {approval.approved_at && (
                    <span>
                      {" "}
                      • {new Date(approval.approved_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}

              {approval.paid_at && (
                <div className="text-xs text-green-600 mb-3 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Paid on {new Date(approval.paid_at).toLocaleDateString()}
                </div>
              )}

              {/* Action Buttons */}
              {activeTab === "pending" && !rejectingId && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRejectingId(approval.id)}
                    className="flex-1"
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(approval.id)}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    Approve
                  </Button>
                </div>
              )}

              {rejectingId === approval.id && (
                <div className="space-y-2">
                  <textarea
                    placeholder="Reason for rejection..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRejectingId(null);
                        setRejectReason("");
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleReject(approval.id)}
                      className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                      Confirm Reject
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === "approved" && (
                <Button
                  size="sm"
                  onClick={() => handleMarkPaid(approval.id)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  Mark as Paid
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ApproveCommissions;
