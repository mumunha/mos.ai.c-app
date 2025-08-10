'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import NotesList from '@/components/notes/NotesList';
import TagsSection from '@/components/dashboard/TagsSection';
import Calendar from '@/components/calendar/Calendar';
import TaskListSimple from '@/components/tasks/TaskListSimple';
import TaskForm from '@/components/tasks/TaskForm';
import EventForm from '@/components/calendar/EventForm';

interface Tag {
  id: string;
  name: string;
  count: number;
}

interface DashboardClientProps {
  tags: Tag[];
}

export default function DashboardClient({ tags }: DashboardClientProps) {
  const [filterTag, setFilterTag] = useState<string | undefined>();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [taskListKey, setTaskListKey] = useState(0);
  const [calendarKey, setCalendarKey] = useState(0);

  const handleTagFilter = (tagName: string) => {
    setFilterTag(filterTag === tagName ? undefined : tagName);
  };

  const clearFilter = () => {
    setFilterTag(undefined);
  };

  const handleTaskCreated = () => {
    setShowTaskForm(false);
    setTaskListKey(prev => prev + 1);
  };

  const handleEventCreated = () => {
    setShowEventForm(false);
    setCalendarKey(prev => prev + 1);
  };

  return (
    <>
      {/* Jump-to navigation */}
      <nav
        className="mb-6 sticky top-16 z-10 bg-gray-50/80 backdrop-blur border rounded-lg px-3 py-2"
        aria-label="Section navigation"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <a href="#notes">Notes</a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href="#tasks">Tasks</a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href="#calendar">Calendar</a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href="#tags">Tags</a>
          </Button>
          <div className="ml-auto">
            <Button asChild size="sm" variant="ghost">
              <a href="#">Top</a>
            </Button>
          </div>
        </div>
      </nav>

      {/* Quick actions (minimalistic) */}
      <div className="mb-6">
        <div className="flex w-full flex-wrap items-center justify-center gap-2">
          <Link href="/notes/new">
            <Button size="sm" className="gap-1">📝 New Note</Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => setShowTaskForm(true)}
            aria-label="Create new task"
          >
            ✅ New Task
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => setShowEventForm(true)}
            aria-label="Create new event"
          >
            📅 New Event
          </Button>
          <Link href="/search">
            <Button size="sm" variant="ghost" className="gap-1" aria-label="Search notes">
              🔍 Search
            </Button>
          </Link>
        </div>
      </div>

      {/* Forms Section */}
      {showTaskForm && (
        <div className="mb-8">
          <TaskForm
            onTaskCreated={handleTaskCreated}
            onCancel={() => setShowTaskForm(false)}
          />
        </div>
      )}

      {showEventForm && (
        <div className="mb-8">
          <EventForm
            onEventCreated={handleEventCreated}
            onCancel={() => setShowEventForm(false)}
          />
        </div>
      )}

      {/* Tasks and Calendar Section */}
      <div className="flex flex-col lg:flex-row gap-8 mb-8">
        {/* Tasks Section - 35% width */}
        <section id="tasks" className="lg:w-[35%]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">✅ Your Tasks</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTaskForm(true)}
            >
              + New Task
            </Button>
          </div>
          <TaskListSimple key={taskListKey} status={undefined} />
        </section>

        {/* Calendar Section - 65% width */}
        <section id="calendar" className="lg:w-[65%]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">📅 Calendar</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowEventForm(true)}
            >
              + New Event
            </Button>
          </div>
          <Calendar key={calendarKey} />
        </section>
      </div>

      {/* Tags Section */}
      <section id="tags">
        <TagsSection tags={tags} onTagFilter={handleTagFilter} />
      </section>

      {/* Notes Section */}
      <section id="notes">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h3 className="text-xl font-semibold text-gray-900">Your Notes</h3>
            {filterTag && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Filtered by:</span>
                <span className="text-sm font-medium text-blue-600">&quot;{filterTag}&quot;</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilter}
                  className="text-xs h-6 px-2"
                >
                  Clear filter
                </Button>
              </div>
            )}
          </div>
          <Link href="/notes/new">
            <Button size="sm">+ New Note</Button>
          </Link>
        </div>
        <NotesList filterTag={filterTag} />
      </section>
    </>
  );
}