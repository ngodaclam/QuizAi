import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

const AppLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  return (
    <div className="flex h-dvh bg-neutral-50 text-neutral-900">
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
