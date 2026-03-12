import React, { useState, useEffect } from "react";
import { useDeliveryRoutes } from "@/hooks/useDeliveryRoutes";
import { Button } from "@/components/ui/button";
import { ShopHeader } from "@/components/ShopHeader";
import { Truck, Plus, Edit2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ManageDeliveryRoutes = () => {
  const { routes, isLoading, fetchRoutes, addRoute, updateRoute, toggleStatus } =
    useDeliveryRoutes();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    area_name: "",
    delivery_fee: 0,
  });

  useEffect(() => {
    fetchRoutes(true); // Include disabled routes
  }, [fetchRoutes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.area_name.trim() || formData.delivery_fee < 0) {
      return;
    }

    if (editingId) {
      await updateRoute(editingId, {
        area_name: formData.area_name,
        delivery_fee: formData.delivery_fee,
      });
      setEditingId(null);
    } else {
      await addRoute(formData.area_name, formData.delivery_fee);
    }

    setFormData({ area_name: "", delivery_fee: 0 });
    setShowForm(false);
  };

  const handleEdit = (r: any) => {
    setFormData({ area_name: r.area_name, delivery_fee: r.delivery_fee });
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ area_name: "", delivery_fee: 0 });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <ShopHeader title="Manage Delivery Routes" showBack />

      <div className="px-4 py-6 space-y-4">
        {/* Add Route Button */}
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full bg-primary hover:bg-primary/90 h-12 gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Delivery Area
          </Button>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-card rounded-xl p-4 card-elevated space-y-3 border border-primary/20">
            <h3 className="font-semibold text-foreground">
              {editingId ? "Edit Delivery Area" : "Add New Delivery Area"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground font-medium">Area Name *</label>
                <input
                  type="text"
                  value={formData.area_name}
                  onChange={(e) => setFormData({ ...formData, area_name: e.target.value })}
                  placeholder="e.g., Bungoma Town"
                  className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-medium">Delivery Fee (KSh) *</label>
                <input
                  type="number"
                  value={formData.delivery_fee}
                  onChange={(e) => setFormData({ ...formData, delivery_fee: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90">
                  {editingId ? "Update" : "Add"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <p className="text-sm text-foreground font-medium">💡 Delivery Areas</p>
          <p className="text-xs text-muted-foreground mt-1">
            Set up delivery areas and their corresponding fees. Customers will select one at checkout.
          </p>
        </div>

        {/* Routes List */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && routes.length === 0 && (
          <div className="bg-secondary rounded-xl p-6 text-center">
            <Truck className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground font-medium">No delivery areas yet</p>
          </div>
        )}

        <div className="space-y-3">
          {routes.map((r) => (
            <div
              key={r.id}
              className={cn(
                "bg-card rounded-xl p-4 card-elevated border",
                r.status === "active" ? "border-border" : "border-destructive/20 opacity-75"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground text-lg">{r.area_name}</h3>
                  </div>
                  <p className="text-sm font-bold text-foreground mb-2">KSh {r.delivery_fee}</p>
                  <div className="flex items-center gap-1">
                    {r.status === "active" ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span className="text-xs text-primary font-medium">Active</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-destructive" />
                        <span className="text-xs text-destructive font-medium">Disabled</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 flex-col">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(r)}
                    className="gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant={r.status === "active" ? "outline" : "default"}
                    onClick={() => toggleStatus(r.id, r.status)}
                  >
                    {r.status === "active" ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ManageDeliveryRoutes;
