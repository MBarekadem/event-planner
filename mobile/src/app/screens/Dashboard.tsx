import { useState } from "react";
import { Calendar, Clock, MapPin, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { BottomNav } from "../components/BottomNav";

export function Dashboard() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 22)); // April 22, 2026

  const events = [
    {
      id: 1,
      title: "Sarah & John's Wedding",
      date: "2026-04-25",
      time: "14:00",
      location: "Grand Hotel Ballroom",
      guests: 150,
      status: "confirmed",
      color: "purple"
    },
    {
      id: 2,
      title: "Corporate Gala Dinner",
      date: "2026-04-28",
      time: "19:00",
      location: "Convention Center",
      guests: 300,
      status: "pending",
      color: "blue"
    },
    {
      id: 3,
      title: "Birthday Party - Emma",
      date: "2026-05-02",
      time: "16:00",
      location: "Garden Venue",
      guests: 50,
      status: "confirmed",
      color: "pink"
    },
    {
      id: 4,
      title: "Product Launch Event",
      date: "2026-05-10",
      time: "18:00",
      location: "Tech Hub",
      guests: 200,
      status: "planning",
      color: "orange"
    }
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentDate);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const hasEvent = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.some(event => event.date === dateStr);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-24 max-w-[430px] mx-auto">
      <div className="bg-gradient-to-r from-[#A855F7] to-[#7C3AED] px-6 pt-12 pb-8 rounded-b-[32px]">
        <h1 className="text-white text-2xl font-bold mb-2">My Events</h1>
        <p className="text-purple-200">Manage your upcoming events</p>
      </div>

      <div className="px-6 py-6">
        <div className="bg-white rounded-3xl shadow-lg p-5 mb-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={previousMonth} className="p-2 hover:bg-purple-50 rounded-full transition-colors">
              <ChevronLeft size={20} className="text-purple-600" />
            </button>
            <h2 className="text-lg font-bold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-purple-50 rounded-full transition-colors">
              <ChevronRight size={20} className="text-purple-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-3">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const isToday = day === 22 && currentDate.getMonth() === 3;
              const eventDay = hasEvent(day);

              return (
                <div
                  key={day}
                  className={`aspect-square flex items-center justify-center rounded-xl text-sm relative ${
                    isToday
                      ? 'bg-gradient-to-br from-purple-600 to-purple-500 text-white font-bold shadow-md'
                      : eventDay
                      ? 'bg-purple-100 text-purple-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {day}
                  {eventDay && !isToday && (
                    <div className="absolute bottom-1 w-1 h-1 bg-purple-600 rounded-full" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Upcoming Events</h2>
          <span className="text-sm text-purple-600 font-semibold">{events.length} Events</span>
        </div>

        <div className="space-y-4">
          {events.map(event => (
            <div
              key={event.id}
              className="bg-white rounded-3xl shadow-md p-5 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-${event.color}-500 to-${event.color}-600 flex items-center justify-center flex-shrink-0`}>
                  <Calendar size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-gray-900">{event.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      event.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      event.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock size={16} />
                      <span>{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {event.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin size={16} />
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users size={16} />
                      <span>{event.guests} guests</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
