import React, { useState, useEffect } from "react";
import { useStockAlerts } from "@/hooks/useStockAlerts";
import { Button } from "@/components/ui/button";
import { ShopHeader } from "@/components/ShopHeader";
import { AlertTriangle, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const StockAlerts = () => {
  const { alerts, isLoading, fetchAlerts, resolveAlert } = useStockAlerts();
  const [activeTab, setActiveTab] = useState<"all" | "active" | "resolved">("active");

  useEffect(() => {
    fetchAlerts(activeTab === "all" ? undefined : activeTab === "active" ? "active" : "resolved");
  }, [activeTab, fetchAlerts]);

  const handleResolve = async (id: string) => {
    await resolveAlert(id);
  };

  const filteredAlerts =
    activeTab === "all"
      ? alerts
      : alerts.filter((a) => (activeTab === "active" ? !a.resolved_at : a.resolved_at));

  const getAlertIcon = (type: string, severity: boolean) => {
    if (severity) {
      return <AlertCircle className="w-5 h-5 text-destructive" />;
    }
    return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
  };

  const getAlertBadgeColor = (type: string) => {
    if (type === "out_of_stock") {
      return "bg-destructive/10 text-destructive";
    }
    return "bg-yellow-500/10 text-yellow-700";
  };

  const getAlertLabel = (type: string) => {
    return type === "out_of_stock" ? "Out of Stock" : "Low Stock";
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <ShopHeader title="Stock Alerts" showBack />

      <div className="px-4 py-6 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {["all", "active", "resolved"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
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
        {!isLoading && filteredAlerts.length === 0 && (
          <div className="bg-secondary rounded-xl p-6 text-center">
            <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground font-medium">
              {activeTab === "resolved"
                ? "No resolved alerts"
                : "All stock levels are good!"}
            </p>
          </div>
        )}

        {/* Alerts Grid */}
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "rounded-xl p-4 card-elevated border",
                alert.alert_type === "out_of_stock"
                  ? "bg-destructive/5"
                  : "bg-yellow-500/5"
              )}
            >
              <div className="flex items-start gap-3 mb-3">
                {getAlertIcon(alert.alert_type, alert.alert_type === "out_of_stock")}
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">{alert.product_name}</h3>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full inline-block",
                      getAlertBadgeColor(alert.alert_type)
                    )}
                  >
                    {getAlertLabel(alert.alert_type)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-background rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Current Stock</p>
                  <p className="font-bold text-lg text-foreground">
                    {(alert as any).current_stock || 0}
                  </p>
                </div>
                <div className="bg-background rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">
                    {alert.alert_type === "out_of_stock"
                      ? "Should be > 0"
                      : "Should be > " + (alert.threshold || 10)}
                  </p>
                  <p className="font-bold text-lg text-yellow-700">
                    {alert.threshold || "—"}
                  </p>
                </div>
              </div>

              {alert.created_at && (
                <p className="text-xs text-muted-foreground mb-3">
                  Alert created {new Date(alert.created_at).toLocaleDateString()}
                </p>
              )}

              {alert.resolved_at && (
                <div className="bg-green-500/10 rounded-lg p-2 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-xs text-green-700 font-medium">
                    Resolved on {new Date(alert.resolved_at).toLocaleDateString()}
                  </p>
                </div>
              )}

              {!alert.resolved_at && (
                <Button
                  size="sm"
                  onClick={() => handleResolve(alert.id)}
                  variant="outline"
                  className="w-full"
                >
                  Mark as Resolved
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StockAlerts;
