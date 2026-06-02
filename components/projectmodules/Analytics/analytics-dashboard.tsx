"use client"
import { useState, useEffect } from "react"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  DollarSign,
  Target,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle,
  Eye,
  Download,
  RefreshCw,
} from "lucide-react"

interface AnalyticsData {
  projectMetrics: {
    totalProjects: number
    activeProjects: number
    completedProjects: number
    onTimeDelivery: number
    budgetEfficiency: number
  }
  teamMetrics: {
    totalTeamMembers: number
    activeMembers: number
    productivity: number
    collaboration: number
  }
  financialMetrics: {
    totalBudget: number
    spentBudget: number
    projectedSavings: number
    costPerProject: number
  }
  timeMetrics: {
    averageProjectDuration: number
    timeToCompletion: number
    productivityHours: number
    meetingHours: number
  }
}


interface DashboardData {
  analyticsData: AnalyticsData
  projectStatusData: { name: string; count: number; color: string }[]
  recentActivity: {
    id: number
    type: string
    message: string
    time: string
    icon: any
    color: string
  }[]
  topPerformingProjects: {
    name: string
    efficiency: number
    budget: number
    timeline: string
  }[]
}

const MOCK_ANALYTICS_STORE: Record<string, DashboardData> = {}

export default function AnalyticsDashboard({ projectId = "1" }: { projectId?: string }) {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d")
  const [selectedMetric, setSelectedMetric] = useState<"overview" | "projects" | "team" | "financial" | "time">(
    "overview",
  )

  // Sample analytics data
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)

  useEffect(() => {
    if (MOCK_ANALYTICS_STORE[projectId]) {
      setDashboardData(MOCK_ANALYTICS_STORE[projectId])
      return
    }

    const initialData: DashboardData = {
      analyticsData: {
        projectMetrics: {
          totalProjects: 24,
          activeProjects: 8,
          completedProjects: 16,
          onTimeDelivery: 87,
          budgetEfficiency: 94,
        },
        teamMetrics: {
          totalTeamMembers: 32,
          activeMembers: 28,
          productivity: 89,
          collaboration: 92,
        },
        financialMetrics: {
          totalBudget: 4200000,
          spentBudget: 3150000,
          projectedSavings: 420000,
          costPerProject: 175000,
        },
        timeMetrics: {
          averageProjectDuration: 45,
          timeToCompletion: 18,
          productivityHours: 1240,
          meetingHours: 180,
        },
      },
      projectStatusData: [
        { name: "Development", count: 3, color: "bg-gray-500" },
        { name: "Pre-Production", count: 2, color: "bg-yellow-500" },
        { name: "Production", count: 3, color: "bg-blue-500" },
        { name: "Post-Production", count: 4, color: "bg-purple-500" },
        { name: "Completed", count: 12, color: "bg-green-500" },
      ],
      recentActivity: [
        {
          id: 1,
          type: "project_completed",
          message: "Midnight Chronicles completed post-production",
          time: "2 hours ago",
          icon: CheckCircle,
          color: "text-green-400",
        },
        {
          id: 2,
          type: "budget_alert",
          message: "Urban Legends is 15% over budget",
          time: "4 hours ago",
          icon: AlertTriangle,
          color: "text-yellow-400",
        },
        {
          id: 3,
          type: "team_joined",
          message: "3 new team members joined Summer Vibes",
          time: "6 hours ago",
          icon: Users,
          color: "text-blue-400",
        },
        {
          id: 4,
          type: "milestone_reached",
          message: "VFX pipeline reached 75% completion",
          time: "1 day ago",
          icon: Target,
          color: "text-purple-400",
        },
      ],
      topPerformingProjects: [
        { name: "Midnight Chronicles", efficiency: 94, budget: 2500000, timeline: "On Track" },
        { name: "Urban Legends", efficiency: 78, budget: 850000, timeline: "Delayed" },
        { name: "Summer Vibes", efficiency: 89, budget: 450000, timeline: "Ahead" },
      ]
    }

    if (projectId === "2") {
      initialData.analyticsData.projectMetrics.totalProjects = 12;
      initialData.analyticsData.financialMetrics.totalBudget = 2100000;
      initialData.topPerformingProjects[0].name = "Project Beta";
    } else if (projectId === "3") {
      initialData.analyticsData.projectMetrics.totalProjects = 5;
      initialData.analyticsData.financialMetrics.totalBudget = 500000;
      initialData.topPerformingProjects[0].name = "Indie Movie";
    }

    MOCK_ANALYTICS_STORE[projectId] = initialData;
    setDashboardData(initialData);

  }, [projectId])

  if (!dashboardData) return null;

  const { analyticsData, projectStatusData, recentActivity, topPerformingProjects } = dashboardData;

  const renderOverviewMetrics = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-blue-500/20 rounded-lg">
            <BarChart3 className="h-6 w-6 text-blue-400" />
          </div>
          <div className="flex items-center gap-1 text-green-400 text-sm">
            <TrendingUp className="h-4 w-4" />
            +12%
          </div>
        </div>
        <h3 className="text-2xl font-bold text-white mb-1">{analyticsData.projectMetrics.totalProjects}</h3>
        <p className="text-white/70 text-sm">Total Projects</p>
        <div className="mt-3 text-xs text-white/60">
          {analyticsData.projectMetrics.activeProjects} active, {analyticsData.projectMetrics.completedProjects}{" "}
          completed
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-green-500/20 rounded-lg">
            <DollarSign className="h-6 w-6 text-green-400" />
          </div>
          <div className="flex items-center gap-1 text-green-400 text-sm">
            <TrendingUp className="h-4 w-4" />
            +8%
          </div>
        </div>
        <h3 className="text-2xl font-bold text-white mb-1">
          ${(analyticsData.financialMetrics.projectedSavings / 1000).toFixed(0)}K
        </h3>
        <p className="text-white/70 text-sm">Projected Savings</p>
        <div className="mt-3 text-xs text-white/60">
          {analyticsData.projectMetrics.budgetEfficiency}% budget efficiency
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-purple-500/20 rounded-lg">
            <Users className="h-6 w-6 text-purple-400" />
          </div>
          <div className="flex items-center gap-1 text-green-400 text-sm">
            <TrendingUp className="h-4 w-4" />
            +5%
          </div>
        </div>
        <h3 className="text-2xl font-bold text-white mb-1">{analyticsData.teamMetrics.totalTeamMembers}</h3>
        <p className="text-white/70 text-sm">Team Members</p>
        <div className="mt-3 text-xs text-white/60">{analyticsData.teamMetrics.productivity}% productivity score</div>
      </div>

      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-orange-500/20 rounded-lg">
            <Clock className="h-6 w-6 text-orange-400" />
          </div>
          <div className="flex items-center gap-1 text-red-400 text-sm">
            <TrendingDown className="h-4 w-4" />
            -3%
          </div>
        </div>
        <h3 className="text-2xl font-bold text-white mb-1">{analyticsData.timeMetrics.averageProjectDuration}</h3>
        <p className="text-white/70 text-sm">Avg. Project Duration (days)</p>
        <div className="mt-3 text-xs text-white/60">
          {analyticsData.projectMetrics.onTimeDelivery}% on-time delivery
        </div>
      </div>
    </div>
  )

  const renderProjectAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Status Distribution */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Project Status Distribution</h3>
          <div className="space-y-3">
            {projectStatusData.map((status, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${status.color}`}></div>
                  <span className="text-white/80">{status.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{status.count}</span>
                  <div className="w-20 bg-white/20 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${status.color}`}
                      style={{ width: `${(status.count / 24) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Projects */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Performing Projects</h3>
          <div className="space-y-4">
            {topPerformingProjects.map((project, i) => (
              <div key={i} className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium">{project.name}</h4>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${project.timeline === "On Track"
                        ? "bg-green-500/20 text-green-400"
                        : project.timeline === "Ahead"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                  >
                    {project.timeline}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Efficiency: {project.efficiency}%</span>
                  <span className="text-white/70">Budget: ${(project.budget / 1000000).toFixed(1)}M</span>
                </div>
                <div className="mt-2 w-full bg-white/20 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-green-500"
                    style={{ width: `${project.efficiency}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const renderTeamAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Team Productivity</h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-2">{analyticsData.teamMetrics.productivity}%</div>
            <p className="text-white/70 text-sm mb-4">Overall Productivity Score</p>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                style={{ width: `${analyticsData.teamMetrics.productivity}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Collaboration Score</h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-2">{analyticsData.teamMetrics.collaboration}%</div>
            <p className="text-white/70 text-sm mb-4">Team Collaboration Rating</p>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-green-500 to-blue-500"
                style={{ width: `${analyticsData.teamMetrics.collaboration}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Active Members</h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-2">
              {analyticsData.teamMetrics.activeMembers}/{analyticsData.teamMetrics.totalTeamMembers}
            </div>
            <p className="text-white/70 text-sm mb-4">Currently Active</p>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500"
                style={{
                  width: `${(analyticsData.teamMetrics.activeMembers / analyticsData.teamMetrics.totalTeamMembers) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderFinancialAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Budget Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Total Budget</span>
              <span className="text-white font-medium">
                ${(analyticsData.financialMetrics.totalBudget / 1000000).toFixed(1)}M
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70">Spent</span>
              <span className="text-white font-medium">
                ${(analyticsData.financialMetrics.spentBudget / 1000000).toFixed(1)}M
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70">Remaining</span>
              <span className="text-green-400 font-medium">
                $
                {(
                  (analyticsData.financialMetrics.totalBudget - analyticsData.financialMetrics.spentBudget) /
                  1000000
                ).toFixed(1)}
                M
              </span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 mt-4">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-red-500 to-yellow-500"
                style={{
                  width: `${(analyticsData.financialMetrics.spentBudget / analyticsData.financialMetrics.totalBudget) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Cost Efficiency</h3>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">
                ${(analyticsData.financialMetrics.projectedSavings / 1000).toFixed(0)}K
              </div>
              <p className="text-white/70 text-sm">Projected Savings</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70">Avg. Cost per Project</span>
              <span className="text-white font-medium">
                ${(analyticsData.financialMetrics.costPerProject / 1000).toFixed(0)}K
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70">Budget Efficiency</span>
              <span className="text-green-400 font-medium">{analyticsData.projectMetrics.budgetEfficiency}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderTimeAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Time Distribution</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-white/70">Productive Hours</span>
              </div>
              <span className="text-white font-medium">{analyticsData.timeMetrics.productivityHours}h</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-white/70">Meeting Hours</span>
              </div>
              <span className="text-white font-medium">{analyticsData.timeMetrics.meetingHours}h</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 mt-4">
              <div className="h-3 rounded-full bg-blue-500" style={{ width: "87%" }}></div>
            </div>
            <p className="text-white/60 text-xs">87% productive time vs meetings</p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Delivery Performance</h3>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">
                {analyticsData.projectMetrics.onTimeDelivery}%
              </div>
              <p className="text-white/70 text-sm">On-Time Delivery Rate</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70">Avg. Project Duration</span>
              <span className="text-white font-medium">{analyticsData.timeMetrics.averageProjectDuration} days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70">Time to Completion</span>
              <span className="text-white font-medium">{analyticsData.timeMetrics.timeToCompletion} days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
          <p className="text-white/70">Comprehensive insights into your production performance</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 bg-white/10 backdrop-blur-sm rounded-lg p-1 border border-white/20">
        {[
          { id: "overview", label: "Overview", icon: BarChart3 },
          { id: "projects", label: "Projects", icon: Target },
          { id: "team", label: "Team", icon: Users },
          { id: "financial", label: "Financial", icon: DollarSign },
          { id: "time", label: "Time", icon: Clock },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedMetric(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${selectedMetric === tab.id ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {selectedMetric === "overview" && (
          <>
            {renderOverviewMetrics()}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-white/10 ${activity.color}`}>
                        <activity.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm">{activity.message}</p>
                        <p className="text-white/60 text-xs mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-400" />
                      <span className="text-white/70">AI Automation Usage</span>
                    </div>
                    <span className="text-white font-medium">78%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-400" />
                      <span className="text-white/70">Workflow Efficiency</span>
                    </div>
                    <span className="text-white font-medium">92%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-green-400" />
                      <span className="text-white/70">Quality Score</span>
                    </div>
                    <span className="text-white font-medium">94%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-purple-400" />
                      <span className="text-white/70">Client Satisfaction</span>
                    </div>
                    <span className="text-white font-medium">96%</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        {selectedMetric === "projects" && renderProjectAnalytics()}
        {selectedMetric === "team" && renderTeamAnalytics()}
        {selectedMetric === "financial" && renderFinancialAnalytics()}
        {selectedMetric === "time" && renderTimeAnalytics()}
      </div>
    </div>
  )
}
