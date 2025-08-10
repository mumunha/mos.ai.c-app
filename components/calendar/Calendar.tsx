'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EventEditForm from './EventEditForm';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_datetime: string;
  end_datetime: string | null;
  all_day: boolean;
  status: 'tentative' | 'confirmed' | 'cancelled';
  source_type: 'manual' | 'ai_generated';
}

type CalendarView = 'monthly' | 'weekly' | 'daily';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [view, setView] = useState<CalendarView>('weekly');

  useEffect(() => {
    fetchEvents();
  }, [currentDate, view]); // fetchEvents is stable, safe to omit

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Get date range based on view
      let startDate: Date, endDate: Date;
      
      if (view === 'daily') {
        startDate = new Date(currentDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(currentDate);
        endDate.setHours(23, 59, 59, 999);
      } else if (view === 'weekly') {
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday
        startDate = new Date(currentDate);
        startDate.setDate(currentDate.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else { // monthly
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      }
      
      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });
      
      const response = await fetch(`/api/calendar?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const data = await response.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const navigate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (view === 'daily') {
        if (direction === 'prev') {
          newDate.setDate(newDate.getDate() - 1);
        } else {
          newDate.setDate(newDate.getDate() + 1);
        }
      } else if (view === 'weekly') {
        if (direction === 'prev') {
          newDate.setDate(newDate.getDate() - 7);
        } else {
          newDate.setDate(newDate.getDate() + 7);
        }
      } else { // monthly
        if (direction === 'prev') {
          newDate.setMonth(newDate.getMonth() - 1);
        } else {
          newDate.setMonth(newDate.getMonth() + 1);
        }
      }
      return newDate;
    });
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_datetime);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const getViewTitle = () => {
    if (view === 'daily') {
      return currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        year: 'numeric' 
      });
    } else if (view === 'weekly') {
      const dayOfWeek = currentDate.getDay();
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - dayOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  const renderDailyView = () => {
    const dayEvents = getEventsForDate(currentDate);
    const isToday = currentDate.toDateString() === new Date().toDateString();

    return (
      <div className="space-y-2">
        <div className={`p-4 rounded-lg border-2 ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-lg font-semibold mb-3 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
            {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>
          {dayEvents.length === 0 ? (
            <p className="text-gray-500 text-sm">No events scheduled</p>
          ) : (
            <div className="space-y-2">
              {dayEvents.map(event => (
                <div
                  key={event.id}
                  className={`p-3 rounded-md cursor-pointer hover:opacity-80 transition-opacity ${
                    event.source_type === 'ai_generated' 
                      ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                  onClick={() => setEditingEvent(event)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {event.all_day ? '📅' : '🕐'} {event.title}
                      </div>
                      {!event.all_day && (
                        <div className="text-sm opacity-75">
                          {new Date(event.start_datetime).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })}
                          {event.end_datetime && ` - ${new Date(event.end_datetime).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })}`}
                        </div>
                      )}
                      {event.location && (
                        <div className="text-sm opacity-75">📍 {event.location}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWeeklyView = () => {
    const dayOfWeek = currentDate.getDay();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - dayOfWeek);
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }

    return (
      <div className="space-y-4">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-2">
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(dayName => (
            <div key={dayName} className="p-2 text-center font-medium text-gray-700 bg-gray-100 rounded">
              {dayName.slice(0, 3)}
            </div>
          ))}
        </div>
        
        {/* Week grid */}
        <div className="grid grid-cols-7 gap-2 min-h-[400px]">
          {weekDays.map((day, index) => {
            const dayEvents = getEventsForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();
            
            return (
              <div 
                key={index}
                className={`p-3 border-2 rounded-lg ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:bg-gray-50'} transition-colors`}
              >
                <div className={`text-sm font-medium mb-2 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                  {day.getDate()}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className={`text-xs p-2 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                        event.source_type === 'ai_generated' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}
                      title={`${event.title}${event.location ? ` at ${event.location}` : ''}`}
                      onClick={() => setEditingEvent(event)}
                    >
                      <div className="font-medium truncate">
                        {event.all_day ? '📅' : '🕐'} {event.title}
                      </div>
                      {!event.all_day && (
                        <div className="truncate opacity-75">
                          {new Date(event.start_datetime).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="p-2 h-24"></div>);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayEvents = getEventsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      
      days.push(
        <div 
          key={day} 
          className={`p-2 h-24 border border-gray-200 ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-gray-50'} transition-colors`}
        >
          <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
            {day}
          </div>
          <div className="mt-1 space-y-1 overflow-hidden">
            {dayEvents.slice(0, 2).map(event => (
              <div
                key={event.id}
                className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity ${
                  event.source_type === 'ai_generated' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}
                title={`${event.title}${event.location ? ` at ${event.location}` : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingEvent(event);
                }}
              >
                {event.all_day ? '📅' : '🕐'} {event.title}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500">
                +{dayEvents.length - 2} more
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return days;
  };

  if (editingEvent) {
    return (
      <EventEditForm
        event={editingEvent}
        onEventUpdated={() => {
          setEditingEvent(null);
          fetchEvents();
        }}
        onCancel={() => setEditingEvent(null)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="text-xl">
            📅 {getViewTitle()}
          </CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigate('prev')}>
              ← {view === 'daily' ? 'Day' : view === 'weekly' ? 'Week' : 'Month'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('next')}>
              {view === 'daily' ? 'Day' : view === 'weekly' ? 'Week' : 'Month'} →
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-center space-x-1">
          <Button
            variant={view === 'daily' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('daily')}
            className="min-w-[70px]"
          >
            Daily
          </Button>
          <Button
            variant={view === 'weekly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('weekly')}
            className="min-w-[70px]"
          >
            Weekly
          </Button>
          <Button
            variant={view === 'monthly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('monthly')}
            className="min-w-[70px]"
          >
            Monthly
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse">
            <div className="h-96 bg-gray-100 rounded-lg"></div>
          </div>
        ) : (
          <>
            {view === 'daily' && renderDailyView()}
            {view === 'weekly' && renderWeeklyView()}
            {view === 'monthly' && (
              <>
                {/* Days of week header */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                    <div key={day} className="p-2 text-center font-medium text-gray-700 bg-gray-100 rounded">
                      {day.slice(0, 3)}
                    </div>
                  ))}
                </div>
                
                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {renderCalendarGrid()}
                </div>
              </>
            )}
            
            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                  <span>Manual</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-purple-100 border border-purple-200 rounded"></div>
                  <span>AI-generated</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>📅 All-day</span>
                  <span>🕐 Timed</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}