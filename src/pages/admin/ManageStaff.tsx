import React, { useState, useEffect } from "react";
import { useStaffManagement } from "@/hooks/useStaffManagement";
import { Button } from "@/components/ui/button";
import { ShopHeader } from "@/components/ShopHeader";
import { Users, Plus, Edit2, Trash2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ManageStaff = () => {
  const { staff, isLoading, fetchStaff, addStaff, updateStaff, toggleStaffStatus } =
    useStaffManagement();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    role: "product_manager" as "admin" | "product_manager",
    pin: "",
  });

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.phone.trim()) {
      return;
    }

    if (editingId) {
      await updateStaff(editingId, { name: formData.name, phone: formData.phone, role: formData.role, ...(formData.pin ? { pin: formData.pin } : {}) });
      setEditingId(null);
    } else {
      await addStaff(formData.name, formData.phone, formData.role, formData.pin);
    }

    setFormData({ name: "", phone: "", role: "product_manager", pin: "" });
    setShowForm(false);
  };

  const handleEdit = (s: any) => {
    setFormData({ name: s.name, phone: s.phone, role: s.role, pin: "" });
    setEditingId(s.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: "", phone: "", role: "product_manager", pin: "" });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <ShopHeader title="Manage Staff" showBack />

      <div className="px-4 py-6 space-y-4">
        {/* Add Staff Button */}
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full bg-primary hover:bg-primary/90 h-12 gap-2"
          >
            <Plus className="w-5 h-5" />
            Add New Staff Member
          </Button>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-card rounded-xl p-4 card-elevated space-y-3 border border-primary/20">
            <h3 className="font-semibold text-foreground">
              {editingId ? "Edit Staff Member" : "Add New Staff Member"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground font-medium">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full name"
                  className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-medium">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+254 7XX XXX XXX"
                  className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-medium">
                  6-Digit PIN {editingId ? "(leave blank to keep existing)" : "(required for login)"}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                  placeholder="e.g. 123456"
                  className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary tracking-widest"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-medium">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as "admin" | "product_manager" })
                  }
                  className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="product_manager">Product Manager</option>
                  <option value="admin">Admin</option>
                </select>
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

        {/* Staff List */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && staff.length === 0 && (
          <div className="bg-secondary rounded-xl p-6 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground font-medium">No staff members yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Add your first staff member to get started</p>
          </div>
        )}

        <div className="space-y-3">
          {staff.map((s) => (
            <div
              key={s.id}
              className={cn(
                "bg-card rounded-xl p-4 card-elevated border",
                s.status === "active" ? "border-border" : "border-destructive/20 opacity-75"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{s.name}</h3>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        s.role === "admin"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {s.role === "admin" ? "Admin" : "Product Manager"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{s.phone}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {s.status === "active" ? (
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

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(s)}
                    className="gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant={s.status === "active" ? "outline" : "default"}
                    onClick={() => toggleStaffStatus(s.id, s.status)}
                  >
                    {s.status === "active" ? "Disable" : "Enable"}
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

export default ManageStaff;
