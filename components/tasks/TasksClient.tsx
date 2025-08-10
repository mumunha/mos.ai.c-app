'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TaskList from './TaskList';
import TaskForm from './TaskForm';

type TaskFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled';

export default function TasksClient() {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskListKey, setTaskListKey] = useState(0);
  const [filter, setFilter] = useState<TaskFilter>('all');

  const handleTaskCreated = () => {
    setShowTaskForm(false);
    setTaskListKey(prev => prev + 1);
  };

  const getFilterBadgeVariant = (filterValue: TaskFilter) => {
    return filter === filterValue ? 'default' : 'outline';
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700 font-medium">Filter:</span>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={getFilterBadgeVariant('all')}
              className="cursor-pointer"
              onClick={() => setFilter('all')}
            >
              All
            </Badge>
            <Badge
              variant={getFilterBadgeVariant('pending')}
              className="cursor-pointer"
              onClick={() => setFilter('pending')}
            >
              Pending
            </Badge>
            <Badge
              variant={getFilterBadgeVariant('in_progress')}
              className="cursor-pointer"
              onClick={() => setFilter('in_progress')}
            >
              In Progress
            </Badge>
            <Badge
              variant={getFilterBadgeVariant('completed')}
              className="cursor-pointer"
              onClick={() => setFilter('completed')}
            >
              Completed
            </Badge>
            <Badge
              variant={getFilterBadgeVariant('cancelled')}
              className="cursor-pointer"
              onClick={() => setFilter('cancelled')}
            >
              Cancelled
            </Badge>
          </div>
        </div>

        <Button
          onClick={() => setShowTaskForm(true)}
          className="gap-2"
        >
          ✅ New Task
        </Button>
      </div>

      {/* Task Form */}
      {showTaskForm && (
        <div className="mb-6">
          <TaskForm
            onTaskCreated={handleTaskCreated}
            onCancel={() => setShowTaskForm(false)}
          />
        </div>
      )}

      {/* Task List */}
      <div>
        <TaskList 
          key={taskListKey} 
          status={filter === 'all' ? undefined : filter} 
        />
      </div>
    </div>
  );
}