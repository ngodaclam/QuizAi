import React, { useState, useEffect } from "react";
import Spinner from "../../components/common/Spinner";
import progressService from "../../services/progressService";
import toast from "react-hot-toast";
import {
  FileText,
  BookOpen,
  BrainCircuit,
  TrendingUp,
  Clock,
} from "lucide-react";

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await progressService.getDashboardData();
        setDashboardData(response);
      } catch (error) {
        toast.error("Failed to fetch dashboard data.");
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <Spinner />;

  if (!dashboardData?.overview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-600 text-sm">No Dashboard data available</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "Total Documents",
      value: dashboardData.overview.totalDocuments,
      icon: FileText,
      gradient: "from-blue-400 to-cyan-500",
    },
    {
      label: "Total Flashcards",
      value: dashboardData.overview.totalFlashcards,
      icon: BookOpen,
      gradient: "from-purple-400 to-pink-500",
    },
    {
      label: "Total Quizzes",
      value: dashboardData.overview.totalQuizzes,
      icon: BrainCircuit,
      gradient: "from-emerald-400 to-teal-500",
    },
  ];

  const activities = [
    ...(dashboardData.recentActivity?.documents || []).map((doc) => ({
      id: doc._id,
      type: "document",
      description: doc.title,
      timestamp: doc.lastAccessed,
      link: `/documents/${doc._id}`,
    })),
    ...(dashboardData.recentActivity?.quizzes || []).map((quiz) => ({
      id: quiz._id,
      type: "quiz",
      description: quiz.title,
      timestamp: quiz.completedAt || quiz.createdAt,
      link: `/quizzes/${quiz._id}`,
    })),
  ].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

  return (
    <div className="min-h-screen bg-slate-50 p-6 relative">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-[size:16px_16px] opacity-100 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-medium text-slate-900 tracking-tight mb-2">
            Dashboard
          </h1>
          <p className="text-slate-500 text-sm">
            Track your learning progress and stay motivated
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-5">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="group bg-white/80 backdrop-blur-xl border border-slate-200/60 p-6 rounded-2xl shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all duration-200 hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {stat.label}
                </span>
                <div
                  className={`w-11 h-11 rounded-xl bg-linear-to-br ${stat.gradient} flex items-center justify-center`}
                >
                  <stat.icon className="h-5 w-5 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <div className="text-3xl font-semibold text-slate-900 tracking-tight mt-2">
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 p-8 rounded-2xl shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <Clock className="w-5 h-5 text-slate-600" strokeWidth={2} />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 tracking-tight">
              Recent Activity
            </h3>
          </div>

          {activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div
                  key={activity.id || index}
                  className="flex justify-between items-center rounded-xl bg-slate-50/50 border border-slate-200/60 hover:bg-white hover:border-slate-300/60 hover:shadow-md transition-all duration-200 p-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          activity.type === "document"
                            ? "bg-linear-to-r from-blue-400 to-cyan-500"
                            : "bg-linear-to-r from-emerald-400 to-teal-500"
                        }`}
                      />
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {activity.type === "document"
                          ? "Accessed Document"
                          : "Attempted Quiz"}{" "}
                        <span className="text-slate-700">
                          {activity.description}
                        </span>
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 pl-4">
                      {activity.timestamp
                        ? new Date(activity.timestamp).toLocaleString()
                        : ""}
                    </p>
                  </div>

                  {activity.link && (
                    <a
                      href={activity.link}
                      className="ml-4 px-4 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all duration-200 whitespace-nowrap"
                    >
                      View
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
                <Clock className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 text-sm">No recent activity yet</p>
              <p className="text-slate-500 text-xs mt-1">
                Start learning to see your progress
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
