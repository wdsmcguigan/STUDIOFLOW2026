"use client"

import React from "react"

import { useState, useRef, useCallback } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  Calendar,
  Eye,
  EyeOff,
  Edit,
  Copy,
  Trash2,
  Mail,
  Printer,
  X,
  Share2,
} from "lucide-react"

interface CalendarEvent {
  id: number
  title: string
  startTime: string
  endTime: string
  color: string
  day: number
  date: string
  description: string
  location: string
  attendees: string[]
  organizer: string
  calendarId: string
}

interface ProjectCalendar {
  id: string
  name: string
  color: string
  visible: boolean
  editable: boolean
}

interface DragState {
  isDragging: boolean
  eventId: number | null
  startY: number
  startTime: string
  originalDay: number
  isResizing: boolean
  resizeHandle: "top" | "bottom" | null
  isCreating: boolean
  createStartTime: string
  createDay: number
}

const colorPalette = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-red-500",
  "bg-yellow-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-emerald-500",
  "bg-violet-500",
]

interface OriginalCalendarProps {
  currentProject?: any
}

export default function OriginalCalendar({ currentProject }: OriginalCalendarProps) {
  const [currentView, setCurrentView] = useState<"day" | "week" | "month">("week")
  const [currentDate, setCurrentDate] = useState(new Date(2025, 2, 5)) // March 5, 2025
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({})
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    eventId: null,
    startY: 0,
    startTime: "",
    originalDay: 0,
    isResizing: false,
    resizeHandle: null,
    isCreating: false,
    createStartTime: "",
    createDay: 0,
  })
  const [editingCalendar, setEditingCalendar] = useState<string | null>(null)
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    x: number
    y: number
    eventId: number | null
  }>({ visible: false, x: 0, y: 0, eventId: null })

  const calendarRef = useRef<HTMLDivElement>(null)

  // Source calendars (representing Projects and Global contexts)
  const [sourceCalendars, setSourceCalendars] = useState<ProjectCalendar[]>([
    { id: "personal", name: "My Calendar", color: "bg-blue-500", visible: true, editable: true },
    { id: "project-1", name: "Midnight Chronicles", color: "bg-purple-500", visible: true, editable: false },
    { id: "project-2", name: "Urban Legends", color: "bg-orange-500", visible: true, editable: false },
    { id: "project-3", name: "Summer Vibes", color: "bg-green-500", visible: true, editable: false },
  ])

  // Sample calendar events aggregating from multiple projects
  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      id: 1,
      title: "Production Meeting",
      startTime: "09:00",
      endTime: "10:00",
      color: "bg-purple-500",
      day: 1,
      date: "2025-03-03",
      description: "Weekly sync for Midnight Chronicles",
      location: "Conference Room A",
      attendees: ["Sarah Chen", "Alex Kim"],
      organizer: "Sarah Chen",
      calendarId: "project-1",
    },
    {
      id: 2,
      title: "Location Scout",
      startTime: "10:00",
      endTime: "14:00",
      color: "bg-orange-500",
      day: 1,
      date: "2025-03-03",
      description: "Scouting for Urban Legends",
      location: "Downtown",
      attendees: ["Location Manager"],
      organizer: "Producer",
      calendarId: "project-2",
    },
    {
      id: 3,
      title: "Casting Call",
      startTime: "13:00",
      endTime: "17:00",
      color: "bg-green-500",
      day: 2,
      date: "2025-03-04",
      description: "Day 1 Casting for Summer Vibes",
      location: "Studio B",
      attendees: ["Casting Director"],
      organizer: "Director",
      calendarId: "project-3",
    },
    {
      id: 4,
      title: "Script Review",
      startTime: "15:00",
      endTime: "16:30",
      color: "bg-purple-500",
      day: 2,
      date: "2025-03-04",
      description: "Act 3 breakdown",
      location: "Writers Room",
      attendees: ["Writers"],
      organizer: "Read",
      calendarId: "project-1",
    },
    {
      id: 5,
      title: "Personal: Dentist",
      startTime: "08:00",
      endTime: "09:00",
      color: "bg-blue-500",
      day: 3,
      date: "2025-03-05",
      description: "Routine checkup",
      location: "Dental Clinic",
      attendees: [],
      organizer: "You",
      calendarId: "personal",
    },
    {
      id: 6,
      title: "VFX Review",
      startTime: "11:00",
      endTime: "12:00",
      color: "bg-purple-500",
      day: 4,
      date: "2025-03-06",
      description: "Review preliminary VFX shots",
      location: "Edit Bay",
      attendees: ["VFX Supervisor"],
      organizer: "Post Super",
      calendarId: "project-1",
    },
    {
      id: 7,
      title: "Budget Approval",
      startTime: "14:00",
      endTime: "15:00",
      color: "bg-orange-500",
      day: 5,
      date: "2025-03-07",
      description: "Finalize budget for Urban Legends",
      location: "Office",
      attendees: ["Exec Producer"],
      organizer: "Line Producer",
      calendarId: "project-2",
    },
  ])

  // Helper functions
  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number)
    return hours * 60 + minutes
  }

  const minutesToTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
  }

  const calculateEventStyle = (startTime: string, endTime: string) => {
    const startMinutes = timeToMinutes(startTime)
    const endMinutes = timeToMinutes(endTime)
    const startHour = 8 * 60 // 8 AM in minutes
    const top = ((startMinutes - startHour) / 60) * 80 // 80px per hour
    const height = ((endMinutes - startMinutes) / 60) * 80
    return { top: `${top}px`, height: `${height}px` }
  }

  const getTimeFromPosition = (y: number, containerTop: number) => {
    const relativeY = y - containerTop
    const hourHeight = 80
    const minutes = Math.round((relativeY / hourHeight) * 60)
    const totalMinutes = 8 * 60 + minutes // Start from 8 AM
    const roundedMinutes = Math.round(totalMinutes / 15) * 15 // Round to 15-minute intervals
    return minutesToTime(roundedMinutes)
  }

  const getDayFromPosition = (x: number, containerLeft: number, containerWidth: number) => {
    const relativeX = x - containerLeft
    const dayWidth = containerWidth / 7
    return Math.floor(relativeX / dayWidth) + 1
  }

  // Calendar management functions
  const toggleCalendarVisibility = (calendarId: string) => {
    setSourceCalendars((prev) => prev.map((cal) => (cal.id === calendarId ? { ...cal, visible: !cal.visible } : cal)))
  }

  const renameCalendar = (calendarId: string, newName: string) => {
    setSourceCalendars((prev) => prev.map((cal) => (cal.id === calendarId ? { ...cal, name: newName } : cal)))
    setEditingCalendar(null)
  }

  const changeCalendarColor = (calendarId: string, newColor: string) => {
    setSourceCalendars((prev) => prev.map((cal) => (cal.id === calendarId ? { ...cal, color: newColor } : cal)))
    // Update all events with this calendar's color
    setEvents((prev) => prev.map((event) => (event.calendarId === calendarId ? { ...event, color: newColor } : event)))
    setShowColorPicker(null)
  }

  const createNewCalendar = () => {
    const newCalendarId = `calendar-${Date.now()}`
    const newCalendar: ProjectCalendar = {
      id: newCalendarId,
      name: "New Calendar",
      color: colorPalette[sourceCalendars.length % colorPalette.length],
      visible: true,
      editable: true,
    }
    setSourceCalendars((prev) => [...prev, newCalendar])
    setEditingCalendar(newCalendarId)
  }

  // Event management functions
  const createEvent = (day: number, startTime: string, endTime: string) => {
    const newEventId = Math.max(...events.map((e) => e.id)) + 1
    const newEventData: CalendarEvent = {
      id: newEventId,
      title: "New Event",
      startTime,
      endTime,
      color: "bg-blue-500",
      day,
      date: new Date(2025, 2, day + 2).toISOString().split("T")[0],
      description: "",
      location: "",
      attendees: [],
      organizer: "You",
      calendarId: "personal",
    }
    setEvents((prev) => [...prev, newEventData])
    setSelectedEvent(newEventData) // This opens edit mode immediately
  }

  const updateEvent = (eventId: number, updates: Partial<CalendarEvent>) => {
    setEvents((prev) => prev.map((event) => (event.id === eventId ? { ...event, ...updates } : event)))
  }

  const deleteEvent = (eventId: number) => {
    setEvents((prev) => prev.filter((event) => event.id !== eventId))
    setSelectedEvent(null)
    setContextMenu({ visible: false, x: 0, y: 0, eventId: null })
  }

  const duplicateEvent = (eventId: number) => {
    const eventToDuplicate = events.find((e) => e.id === eventId)
    if (eventToDuplicate) {
      const newEventId = Math.max(...events.map((e) => e.id)) + 1
      const duplicatedEvent = {
        ...eventToDuplicate,
        id: newEventId,
        title: `${eventToDuplicate.title} (Copy)`,
      }
      setEvents((prev) => [...prev, duplicatedEvent])
    }
    setContextMenu({ visible: false, x: 0, y: 0, eventId: null })
  }

  // Enhanced mouse event handlers for drag and drop with resizing
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, eventId: number, resizeHandle?: "top" | "bottom") => {
      e.preventDefault()
      e.stopPropagation()
      const event = events.find((ev) => ev.id === eventId)
      if (!event) return

      setDragState({
        isDragging: true,
        eventId,
        startY: e.clientY,
        startTime: event.startTime,
        originalDay: event.day,
        isResizing: !!resizeHandle,
        resizeHandle: resizeHandle || null,
        isCreating: false,
        createStartTime: "",
        createDay: 0,
      })
    },
    [events],
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState.isDragging || !calendarRef.current) return

      const rect = calendarRef.current.getBoundingClientRect()
      const newTime = getTimeFromPosition(e.clientY, rect.top)

      if (dragState.eventId) {
        const event = events.find((ev) => ev.id === dragState.eventId)
        if (!event) return

        if (dragState.isResizing && dragState.resizeHandle) {
          // Resize event
          if (dragState.resizeHandle === "top") {
            updateEvent(dragState.eventId, { startTime: newTime })
          } else if (dragState.resizeHandle === "bottom") {
            updateEvent(dragState.eventId, { endTime: newTime })
          }
        } else {
          // Move event (maintain duration)
          const duration = timeToMinutes(event.endTime) - timeToMinutes(event.startTime)
          const newEndTime = minutesToTime(timeToMinutes(newTime) + duration)
          const newDay = getDayFromPosition(e.clientX, rect.left, rect.width)

          updateEvent(dragState.eventId, {
            startTime: newTime,
            endTime: newEndTime,
            day: newDay,
          })
        }
      } else if (dragState.isCreating) {
        // Creating new event
        const startMinutes = timeToMinutes(dragState.createStartTime)
        const endMinutes = timeToMinutes(newTime)
        const endTime = endMinutes > startMinutes ? newTime : minutesToTime(startMinutes + 15)

        // Update temporary event or create if doesn't exist
        const tempEventId = 999999
        const existingTempEvent = events.find((e) => e.id === tempEventId)

        if (existingTempEvent) {
          updateEvent(tempEventId, { endTime })
        } else {
          const tempEvent: CalendarEvent = {
            id: tempEventId,
            title: "New Event",
            startTime: dragState.createStartTime,
            endTime,
            color: "bg-blue-500",
            day: dragState.createDay,
            date: new Date(2025, 2, dragState.createDay + 2).toISOString().split("T")[0],
            description: "",
            location: "",
            attendees: [],
            organizer: "You",
            calendarId: "main",
          }
          setEvents((prev) => [...prev, tempEvent])
        }
      }
    },
    [dragState, events],
  )

  const handleMouseUp = useCallback(() => {
    if (dragState.isCreating) {
      // Finalize created event
      const tempEventId = 999999
      const tempEvent = events.find((e) => e.id === tempEventId)
      if (tempEvent) {
        const newEventId = Math.max(...events.filter((e) => e.id !== tempEventId).map((e) => e.id)) + 1
        updateEvent(tempEventId, { id: newEventId })
        setSelectedEvent({ ...tempEvent, id: newEventId })
      }
    }

    setDragState({
      isDragging: false,
      eventId: null,
      startY: 0,
      startTime: "",
      originalDay: 0,
      isResizing: false,
      resizeHandle: null,
      isCreating: false,
      createStartTime: "",
      createDay: 0,
    })
  }, [dragState, events])

  // Time slot click handler for creating events
  const handleTimeSlotClick = (e: React.MouseEvent, day: number) => {
    if (dragState.isDragging) return

    const rect = e.currentTarget.getBoundingClientRect()
    const startTime = getTimeFromPosition(e.clientY, rect.top)

    setDragState({
      isDragging: true,
      eventId: null,
      startY: e.clientY,
      startTime: "",
      originalDay: 0,
      isResizing: false,
      resizeHandle: null,
      isCreating: true,
      createStartTime: startTime,
      createDay: day,
    })
  }

  // Context menu handler
  const handleContextMenu = (e: React.MouseEvent, eventId: number) => {
    e.preventDefault()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      eventId,
    })
  }

  // Navigation functions
  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    if (currentView === "day") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1))
    } else if (currentView === "week") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7))
    } else if (currentView === "month") {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1))
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Get visible events based on calendar visibility
  const visibleEvents = events.filter((event) => {
    const calendar = sourceCalendars.find((cal) => cal.id === event.calendarId)
    return calendar?.visible
  })

  // Date formatting
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  // Week view data
  const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
  const getWeekDates = () => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      return date
    })
  }

  const timeSlots = Array.from({ length: 9 }, (_, i) => i + 8) // 8 AM to 4 PM

  // Month view data
  const getMonthDates = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const dates = []
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  // Mini calendar data
  const getMiniCalendarDates = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const dates = []
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  // Render functions
  const renderDayView = () => {
    const dayEvents = visibleEvents.filter((event) => {
      const eventDate = new Date(event.date)
      return eventDate.toDateString() === currentDate.toDateString()
    })

    return (
      <div className="flex-1 overflow-auto">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-b-xl h-full">
          {/* Day Header */}
          <div className="border-b border-white/20 p-4">
            <h2 className="text-xl font-semibold text-white">{formatDate(currentDate)}</h2>
          </div>

          {/* Time Grid */}
          <div className="flex">
            {/* Time Labels */}
            <div className="w-20 text-white/70">
              {timeSlots.map((time, i) => (
                <div key={i} className="h-20 border-b border-white/10 pr-2 text-right text-xs flex items-start pt-2">
                  {time > 12 ? `${time - 12} PM` : `${time} AM`}
                </div>
              ))}
            </div>

            {/* Day Column */}
            <div className="flex-1 border-l border-white/20 relative" ref={calendarRef}>
              {timeSlots.map((_, timeIndex) => (
                <div
                  key={timeIndex}
                  className="h-20 border-b border-white/10 hover:bg-white/5 cursor-pointer"
                  onMouseDown={(e) => handleTimeSlotClick(e, 1)}
                ></div>
              ))}

              {/* Events */}
              {dayEvents.map((event, i) => {
                const eventStyle = calculateEventStyle(event.startTime, event.endTime)
                return (
                  <div
                    key={i}
                    className={`absolute ${event.color} rounded-md text-white text-xs shadow-md cursor-pointer transition-all duration-200 ease-in-out hover:translate-y-[-2px] hover:shadow-lg group`}
                    style={{
                      ...eventStyle,
                      left: "4px",
                      right: "4px",
                    }}
                    onClick={() => setSelectedEvent(event)}
                    onContextMenu={(e) => handleContextMenu(e, event.id)}
                  >
                    {/* Resize handles */}
                    <div
                      className="absolute top-0 left-0 right-0 h-2 cursor-n-resize opacity-0 group-hover:opacity-100 transition-opacity"
                      onMouseDown={(e) => handleMouseDown(e, event.id, "top")}
                    />
                    <div
                      className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize opacity-0 group-hover:opacity-100 transition-opacity"
                      onMouseDown={(e) => handleMouseDown(e, event.id, "bottom")}
                    />

                    {/* Event content */}
                    <div className="p-2" onMouseDown={(e) => handleMouseDown(e, event.id)}>
                      <div className="font-medium">{event.title}</div>
                      <div className="opacity-80 text-[10px] mt-1">{`${event.startTime} - ${event.endTime}`}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderWeekView = () => {
    const weekDates = getWeekDates()

    return (
      <div className="flex-1 overflow-auto">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-b-xl h-full">
          {/* Week Header */}
          <div className="grid grid-cols-8 border-b border-white/20">
            <div className="p-2 text-center text-white/50 text-xs"></div>
            {weekDays.map((day, i) => (
              <div key={i} className="p-2 text-center border-l border-white/20">
                <div className="text-xs text-white/70 font-medium">{day}</div>
                <div
                  className={`text-lg font-medium mt-1 text-white ${weekDates[i].toDateString() === new Date().toDateString()
                    ? "bg-blue-500 rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                    : ""
                    }`}
                >
                  {weekDates[i].getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Time Grid */}
          <div className="grid grid-cols-8" ref={calendarRef}>
            {/* Time Labels */}
            <div className="text-white/70">
              {timeSlots.map((time, i) => (
                <div key={i} className="h-20 border-b border-white/10 pr-2 text-right text-xs flex items-start pt-2">
                  {time > 12 ? `${time - 12} PM` : `${time} AM`}
                </div>
              ))}
            </div>

            {/* Days Columns */}
            {Array.from({ length: 7 }).map((_, dayIndex) => (
              <div key={dayIndex} className="border-l border-white/20 relative">
                {timeSlots.map((_, timeIndex) => (
                  <div
                    key={timeIndex}
                    className="h-20 border-b border-white/10 hover:bg-white/5 cursor-pointer"
                    onMouseDown={(e) => handleTimeSlotClick(e, dayIndex + 1)}
                  ></div>
                ))}

                {/* Events */}
                {visibleEvents
                  .filter((event) => event.day === dayIndex + 1)
                  .map((event, i) => {
                    const eventStyle = calculateEventStyle(event.startTime, event.endTime)
                    return (
                      <div
                        key={i}
                        className={`absolute ${event.color} rounded-md text-white text-xs shadow-md cursor-pointer transition-all duration-200 ease-in-out hover:translate-y-[-2px] hover:shadow-lg group`}
                        style={{
                          ...eventStyle,
                          left: "4px",
                          right: "4px",
                        }}
                        onClick={() => setSelectedEvent(event)}
                        onContextMenu={(e) => handleContextMenu(e, event.id)}
                      >
                        {/* Resize handles */}
                        <div
                          className="absolute top-0 left-0 right-0 h-2 cursor-n-resize opacity-0 group-hover:opacity-100 transition-opacity"
                          onMouseDown={(e) => handleMouseDown(e, event.id, "top")}
                        />
                        <div
                          className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize opacity-0 group-hover:opacity-100 transition-opacity"
                          onMouseDown={(e) => handleMouseDown(e, event.id, "bottom")}
                        />

                        {/* Event content */}
                        <div className="p-2" onMouseDown={(e) => handleMouseDown(e, event.id)}>
                          <div className="font-medium">{event.title}</div>
                          <div className="opacity-80 text-[10px] mt-1">{`${event.startTime} - ${event.endTime}`}</div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderMonthView = () => {
    const monthDates = getMonthDates()
    const currentMonth = currentDate.getMonth()

    return (
      <div className="flex-1 overflow-auto">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-b-xl h-full">
          {/* Month Header */}
          <div className="grid grid-cols-7 border-b border-white/20">
            {weekDays.map((day, i) => (
              <div key={i} className="p-4 text-center border-r border-white/20 last:border-r-0">
                <div className="text-sm text-white/70 font-medium">{day}</div>
              </div>
            ))}
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-7 h-full">
            {monthDates.map((date, i) => {
              const isCurrentMonth = date.getMonth() === currentMonth
              const isToday = date.toDateString() === new Date().toDateString()
              const dayEvents = visibleEvents.filter((event) => {
                const eventDate = new Date(event.date)
                return eventDate.toDateString() === date.toDateString()
              })

              return (
                <div
                  key={i}
                  className={`border-r border-b border-white/20 last:border-r-0 p-2 min-h-[120px] hover:bg-white/5 cursor-pointer ${!isCurrentMonth ? "opacity-50" : ""
                    }`}
                  onClick={() => setCurrentDate(date)}
                >
                  <div
                    className={`text-sm font-medium mb-2 ${isToday
                      ? "bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center"
                      : "text-white"
                      }`}
                  >
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event, j) => (
                      <div
                        key={j}
                        className={`${event.color} text-white text-xs p-1 rounded truncate`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedEvent(event)
                        }}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && <div className="text-white/70 text-xs">+{dayEvents.length - 3} more</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Add mouse event listeners
  React.useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp])

  // Close context menu and color picker on click outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu({ visible: false, x: 0, y: 0, eventId: null })
      setShowColorPicker(null)
    }
    if (contextMenu.visible || showColorPicker) {
      document.addEventListener("click", handleClickOutside)
      return () => document.removeEventListener("click", handleClickOutside)
    }
  }, [contextMenu.visible, showColorPicker])

  // Project calendars - show project calendars first, then global ones
  // Project calendars - show project calendars first, then global ones
  const getOrderedCalendars = () => {
    if (!currentProject) return sourceCalendars

    const projectSpecificCalendars = sourceCalendars.filter((cal) => currentProject.calendars?.includes(cal.id))
    const globalCalendars = sourceCalendars.filter((cal) => !currentProject.calendars?.includes(cal.id))

    return [...projectSpecificCalendars, ...globalCalendars]
  }

  return (
    <div className="space-y-6">
      {/* Main Calendar Content */}
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 bg-white/10 backdrop-blur-lg p-4 rounded-xl border border-white/20">
          <button
            onClick={() => createEvent(1, "09:00", "10:00")}
            className="mb-6 flex items-center justify-center gap-2 rounded-full bg-blue-500 px-4 py-3 text-white w-full hover:bg-blue-600 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Create</span>
          </button>

          {/* Mini Calendar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">{formatMonth(currentDate)}</h3>
              <div className="flex gap-1">
                <button
                  onClick={() => navigateDate("prev")}
                  className="p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-white" />
                </button>
                <button
                  onClick={() => navigateDate("next")}
                  className="p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                  <ChevronRight className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                <div key={i} className="text-xs text-white/70 font-medium py-1">
                  {day}
                </div>
              ))}

              {getMiniCalendarDates().map((date, i) => {
                const isCurrentMonth = date.getMonth() === currentDate.getMonth()
                const isToday = date.toDateString() === new Date().toDateString()
                const isSelected = date.toDateString() === currentDate.toDateString()

                return (
                  <button
                    key={i}
                    onClick={() => setCurrentDate(date)}
                    className={`text-xs rounded-full w-7 h-7 flex items-center justify-center transition-colors ${isSelected
                      ? "bg-blue-500 text-white"
                      : isToday
                        ? "bg-blue-400/50 text-white"
                        : isCurrentMonth
                          ? "text-white hover:bg-white/20"
                          : "text-white/30"
                      }`}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Project Calendars */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium">Project Calendars</h3>
              <button onClick={createNewCalendar} className="p-1 rounded-full hover:bg-white/20 transition-colors">
                <Plus className="h-4 w-4 text-white/70" />
              </button>
            </div>
            <div className="space-y-2">
              {getOrderedCalendars().map((cal, index) => {
                const isProjectCalendar = currentProject?.calendars?.includes(cal.id)
                return (
                  <div key={cal.id} className="flex items-center gap-3 group relative">
                    {isProjectCalendar && index === 0 && (
                      <div className="text-xs text-blue-400 font-medium mb-1 w-full">
                        {currentProject.title} Calendars
                      </div>
                    )}
                    {!isProjectCalendar && index === (currentProject?.calendars?.length || 0) && (
                      <div className="text-xs text-white/50 font-medium mb-1 w-full border-t border-white/20 pt-2">
                        Global Calendars
                      </div>
                    )}
                    <button onClick={() => toggleCalendarVisibility(cal.id)} className="flex items-center gap-2 flex-1">
                      {cal.visible ? (
                        <Eye className="h-4 w-4 text-white/70" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-white/30" />
                      )}
                      <button
                        className={`w-3 h-3 rounded-sm ${cal.color} ${!cal.visible ? "opacity-30" : ""} hover:ring-2 hover:ring-white/30 transition-all`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowColorPicker(showColorPicker === cal.id ? null : cal.id)
                        }}
                      ></button>
                      {editingCalendar === cal.id ? (
                        <input
                          type="text"
                          defaultValue={cal.name}
                          className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm flex-1"
                          onBlur={(e) => renameCalendar(cal.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              renameCalendar(cal.id, e.currentTarget.value)
                            }
                            if (e.key === "Escape") {
                              setEditingCalendar(null)
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <span
                          className={`text-white text-sm flex-1 ${!cal.visible ? "opacity-30" : ""}`}
                          onDoubleClick={() => setEditingCalendar(cal.id)}
                        >
                          {cal.name}
                        </span>
                      )}
                    </button>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          // Share functionality would go here
                          console.log("Share calendar:", cal.id)
                        }}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                      >
                        <Share2 className="h-3 w-3 text-white/50" />
                      </button>
                      <button
                        onClick={() => setEditingCalendar(cal.id)}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                      >
                        <Edit className="h-3 w-3 text-white/50" />
                      </button>
                    </div>

                    {/* Color Picker */}
                    {showColorPicker === cal.id && (
                      <div className="absolute top-8 left-8 z-50 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-3 shadow-xl">
                        <div className="grid grid-cols-4 gap-2">
                          {colorPalette.map((color) => (
                            <button
                              key={color}
                              className={`w-6 h-6 rounded-sm ${color} hover:ring-2 hover:ring-white/50 transition-all ${cal.color === color ? "ring-2 ring-white" : ""
                                }`}
                              onClick={() => changeCalendarColor(cal.id, color)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <div className="flex-1 flex flex-col">
          {/* Calendar Controls */}
          <div className="flex items-center justify-between p-4 border-b border-white/20 bg-white/10 backdrop-blur-lg rounded-t-xl">
            <div className="flex items-center gap-4">
              <button
                onClick={goToToday}
                className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
              >
                Today
              </button>
              <div className="flex">
                <button
                  onClick={() => navigateDate("prev")}
                  className="p-2 text-white hover:bg-white/10 rounded-l-md transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => navigateDate("next")}
                  className="p-2 text-white hover:bg-white/10 rounded-r-md transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <h2 className="text-xl font-semibold text-white">
                {currentView === "month" ? formatMonth(currentDate) : formatDate(currentDate)}
              </h2>
            </div>

            <div className="flex items-center gap-2 rounded-md p-1 bg-white/10">
              <button
                onClick={() => setCurrentView("day")}
                className={`px-3 py-1 rounded transition-colors ${currentView === "day" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                  }`}
              >
                Day
              </button>
              <button
                onClick={() => setCurrentView("week")}
                className={`px-3 py-1 rounded transition-colors ${currentView === "week" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                  }`}
              >
                Week
              </button>
              <button
                onClick={() => setCurrentView("month")}
                className={`px-3 py-1 rounded transition-colors ${currentView === "month" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                  }`}
              >
                Month
              </button>
            </div>
          </div>

          {/* Calendar Views */}
          {currentView === "day" && renderDayView()}
          {currentView === "week" && renderWeekView()}
          {currentView === "month" && renderMonthView()}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg shadow-xl py-2 min-w-[150px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              if (contextMenu.eventId) setSelectedEvent(events.find((e) => e.id === contextMenu.eventId) || null)
              setContextMenu({ visible: false, x: 0, y: 0, eventId: null })
            }}
            className="w-full px-4 py-2 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={() => contextMenu.eventId && duplicateEvent(contextMenu.eventId)}
            className="w-full px-4 py-2 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Duplicate
          </button>
          <button
            onClick={() => contextMenu.eventId && deleteEvent(contextMenu.eventId)}
            className="w-full px-4 py-2 text-left text-red-400 hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
          <div className="border-t border-white/20 my-1"></div>
          <button
            onClick={() => {
              // Email functionality would go here
              setContextMenu({ visible: false, x: 0, y: 0, eventId: null })
            }}
            className="w-full px-4 py-2 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Email
          </button>
          <button
            onClick={() => {
              // Print functionality would go here
              setContextMenu({ visible: false, x: 0, y: 0, eventId: null })
            }}
            className="w-full px-4 py-2 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white">{selectedEvent.title}</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-3 text-white">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-white/70" />
                  <span>{`${selectedEvent.startTime} - ${selectedEvent.endTime}`}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-white/70" />
                  <span>{selectedEvent.location || "No location"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-white/70" />
                  <span>{selectedEvent.date}</span>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-white/70 mt-1" />
                  <div>
                    <div className="font-medium">Attendees:</div>
                    <div className="text-white/80">
                      {selectedEvent.attendees.length > 0 ? selectedEvent.attendees.join(", ") : "No attendees"}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="font-medium mb-1">Organizer:</div>
                  <div className="text-white/80">{selectedEvent.organizer}</div>
                </div>
                <div>
                  <div className="font-medium mb-1">Description:</div>
                  <div className="text-white/80">{selectedEvent.description || "No description"}</div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/20">
                <button
                  onClick={() => {
                    // Edit functionality
                    setSelectedEvent(null)
                  }}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => duplicateEvent(selectedEvent.id)}
                  className="px-4 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg transition-colors"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => deleteEvent(selectedEvent.id)}
                  className="px-4 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
