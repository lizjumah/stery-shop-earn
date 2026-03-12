import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

export const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      {/* sidebar shown on desktop; collapse state passed down */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      {/* main content area */}
      <main className={`flex-1 overflow-auto ${collapsed ? "lg:ml-20" : "lg:ml-64"}`}>
        {/* outlet renders the matched child route */}
        <Outlet />
        {/* bottom nav is hidden on lg+ screens via its own class */}
        <BottomNav />
      </main>
    </div>
  );
};
