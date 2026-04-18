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
      <main className={`flex-1 overflow-auto min-w-0 ${collapsed ? "lg:ml-16" : "lg:ml-56"}`}>
        {/* constrain and centre content on large screens */}
        <div className="lg:max-w-[900px] lg:mx-auto pb-16 lg:pb-0">
          <Outlet />
        </div>
        {/* bottom nav is hidden on lg+ screens via its own class */}
        <BottomNav />
      </main>
    </div>
  );
};
