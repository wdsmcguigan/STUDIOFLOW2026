import React, { useState, useEffect } from "react"
import { Calendar, Clock, CheckCircle, AlertTriangle, Users, MapPin } from "lucide-react"

interface ScheduleModuleProps {
  searchQuery?: string
  projectId?: string
}

interface Task {
  id: string
  title: string
  dueDate: string
  status: "Completed" | "In Progress" | "Overdue" | "Pending"
  assignee?: string
}

const MOCK_SCHEDULE_STORE: Record<string, Task[]> = {}

const ScheduleModule: React.FC<ScheduleModuleProps> = ({ searchQuery = "", projectId = "1" }) => {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    if (MOCK_SCHEDULE_STORE[projectId]) {
      setTasks(MOCK_SCHEDULE_STORE[projectId])
      return
    }

    const initialTasks: Task[] = [
      { id: "1", title: "Meeting with Client A", dueDate: "2023-12-15", status: "Completed" },
      { id: "2", title: "Prepare Presentation", dueDate: "2023-12-20", status: "In Progress" },
      { id: "3", title: "Finalize Report", dueDate: "2023-12-22", status: "Overdue" },
    ]

    // Customize for different projects
    if (projectId === "2") {
      initialTasks.push({
        id: "4",
        title: "Scout Locations",
        dueDate: "2023-12-25",
        status: "Pending",
      })
      initialTasks[1].title = "Draft Script"
    } else if (projectId === "3") {
      initialTasks[0].title = "Meeting with Investors"
      initialTasks[2].status = "In Progress"
    }

    MOCK_SCHEDULE_STORE[projectId] = initialTasks
    setTasks(initialTasks)
  }, [projectId])

  useEffect(() => {
    if (tasks.length > 0 && projectId) {
      MOCK_SCHEDULE_STORE[projectId] = tasks
    }
  }, [tasks, projectId])

  const filteredTasks = tasks.filter((task) =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800"
      case "In Progress":
        return "bg-yellow-100 text-yellow-800"
      case "Overdue":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Schedule</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-blue-400" />
            <span className="text-white/70 text-xs">Today</span>
          </div>
          <p className="text-white font-bold text-lg">
            {tasks.filter(t => t.dueDate === new Date().toISOString().split('T')[0]).length || 0}
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-yellow-400" />
            <span className="text-white/70 text-xs">This Week</span>
          </div>
          <p className="text-white font-bold text-lg">{Math.round(tasks.length * 0.4)}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-white/70 text-xs">Completed</span>
          </div>
          <p className="text-white font-bold text-lg">
            {tasks.filter((t) => t.status === "Completed").length}
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-white/70 text-xs">Overdue</span>
          </div>
          <p className="text-white font-bold text-lg">
            {tasks.filter((t) => t.status === "Overdue").length}
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-purple-400" />
            <span className="text-white/70 text-xs">Team</span>
          </div>
          <p className="text-white font-bold text-lg">12</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-orange-400" />
            <span className="text-white/70 text-xs">Locations</span>
          </div>
          <p className="text-white font-bold text-lg">5</p>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/20 text-white">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Task</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/20">
            {filteredTasks.map((task) => (
              <tr key={task.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">{task.title}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">{task.dueDate}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                      task.status
                    )}`}
                  >
                    {task.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <a href="#" className="text-blue-500 hover:text-blue-700">
                    Edit
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ScheduleModule
