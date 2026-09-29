import React from "react";

const Tabs = ({ tabs, activeTab, setActiveTab, fillHeight = false }) => {
  return (
    <div className={`w-full min-w-0 ${fillHeight ? "flex min-h-0 flex-1 flex-col" : ""}`}>
      <div className="relative shrink-0 overflow-x-auto border-b-2 border-slate-100">
        <nav className="flex gap-2 whitespace-nowrap">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`relative pb-4 px-2 md:px-6 text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.name
                  ? "text-emerald-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="relative z-10">{tab.label}</span>
              {activeTab === tab.name && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full shadow-lg shadow-emerald-500/30" />
              )}
              {activeTab === tab.name && (
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/50 to-transparent rounded-t-xl -z-10" />
              )}
            </button>
          ))}
        </nav>
      </div>
      <div className={fillHeight ? "min-h-0 flex-1 pt-3" : "py-6"}>
        {tabs.map((tab) => {
          if (tab.name === activeTab) {
            return (
              <div className={`animate-in fade-in duration-300 ${fillHeight ? "h-full min-h-0" : ""}`} key={tab.name}>
                {tab.content}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};

export default Tabs;
