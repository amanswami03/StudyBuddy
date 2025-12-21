import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Users, Video, MapPin, Plus } from 'lucide-react';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 10, 9)); // Nov 9, 2025
  const [view, setView] = useState('month'); // month, week, day

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Mock events
  const events = [
    {
      id: 1,
      title: 'Data Structures Study Session',
      group: 'Data Structures & Algorithms',
      date: new Date(2025, 10, 9),
      startTime: '15:00',
      endTime: '17:00',
      attendees: 8,
      color: 'blue',
      type: 'study'
    },
    {
      id: 2,
      title: 'React Workshop',
      group: 'React & Frontend Development',
      date: new Date(2025, 10, 10),
      startTime: '17:00',
      endTime: '18:30',
      attendees: 5,
      color: 'purple',
      type: 'study'
    },
    {
      id: 3,
      title: 'ML Study Group',
      group: 'Machine Learning Study Group',
      date: new Date(2025, 10, 13),
      startTime: '16:00',
      endTime: '18:00',
      attendees: 12,
      color: 'green',
      type: 'study'
    },
    {
      id: 4,
      title: 'Algorithm Practice',
      group: 'Data Structures & Algorithms',
      date: new Date(2025, 10, 14),
      startTime: '14:00',
      endTime: '16:00',
      attendees: 10,
      color: 'blue',
      type: 'study'
    },
    {
      id: 5,
      title: 'Project Review',
      group: 'React & Frontend Development',
      date: new Date(2025, 10, 15),
      startTime: '18:00',
      endTime: '19:30',
      attendees: 6,
      color: 'purple',
      type: 'study'
    }
  ];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    return events.filter(event => 
      event.date.getDate() === date.getDate() &&
      event.date.getMonth() === date.getMonth() &&
      event.date.getFullYear() === date.getFullYear()
    );
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700 border-blue-300',
    purple: 'bg-purple-100 text-purple-700 border-purple-300',
    green: 'bg-green-100 text-green-700 border-green-300'
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
              <p className="text-gray-600 mt-1">Manage your study sessions</p>
            </div>
            <button className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-shadow flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Schedule Session</span>
            </button>
          </div>

          {/* Calendar Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={previousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
                {months[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView('month')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === 'month'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === 'week'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setView('day')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === 'day'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Day
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Calendar Grid */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                {daysOfWeek.map(day => (
                  <div key={day} className="p-4 text-center">
                    <span className="text-sm font-semibold text-gray-700">{day}</span>
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7">
                {days.map((date, index) => {
                  const dayEvents = getEventsForDate(date);
                  const today = isToday(date);
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-[120px] p-2 border-r border-b border-gray-200 ${
                        !date ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                      } transition-colors`}
                    >
                      {date && (
                        <>
                          <div className="flex items-center justify-center mb-2">
                            <span
                              className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium ${
                                today
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-700'
                              }`}
                            >
                              {date.getDate()}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {dayEvents.map(event => (
                              <div
                                key={event.id}
                                className={`text-xs px-2 py-1 rounded border ${colorClasses[event.color]} cursor-pointer hover:shadow-sm transition-shadow`}
                              >
                                <p className="font-medium truncate">{event.title}</p>
                                <p className="truncate opacity-75">{event.startTime}</p>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Events */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Upcoming Sessions</h3>
              <div className="space-y-4">
                {events.slice(0, 4).map(event => (
                  <div key={event.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className={`inline-block px-2 py-1 rounded text-xs font-medium mb-2 ${colorClasses[event.color]}`}>
                      {event.group}
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">{event.title}</h4>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex items-center space-x-1">
                        <CalendarIcon className="w-3 h-3" />
                        <span>{event.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{event.startTime} - {event.endTime}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>{event.attendees} attending</span>
                      </div>
                    </div>
                    <button className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium">
                      View Details →
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Groups</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-sm text-gray-700">Data Structures</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-purple-500 rounded"></div>
                  <span className="text-sm text-gray-700">React Workshop</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-sm text-gray-700">ML Study Group</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-6 text-white">
              <h3 className="font-semibold mb-4">This Month</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-3xl font-bold">12</p>
                  <p className="text-sm text-blue-100">Sessions Scheduled</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">24h</p>
                  <p className="text-sm text-blue-100">Study Time</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
