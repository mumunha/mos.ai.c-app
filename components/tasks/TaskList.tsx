'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TaskEditForm from './TaskEditForm';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  completed_at: string | null;
  source_note_id: string | null;
  source_type: 'manual' | 'ai_generated';
  created_at: string;
  updated_at: string;
}

interface TaskListProps {
  status?: string;
}

export default function TaskList({ status }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [status]); // fetchTasks is stable, safe to omit

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      
      const response = await fetch(`/api/tasks?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      // Refresh tasks
      await fetchTasks();
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-red-600">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-gray-500 text-center">
            {status ? `No ${status} tasks found.` : 'No tasks found.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (editingTask) {
    return (
      <TaskEditForm
        task={editingTask}
        onTaskUpdated={() => {
          setEditingTask(null);
          fetchTasks();
        }}
        onCancel={() => setEditingTask(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card 
          key={task.id} 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setEditingTask(task)}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <CardTitle className="text-lg leading-snug">{task.title}</CardTitle>
                {task.description && (
                  <CardDescription className="text-sm">
                    {task.description}
                  </CardDescription>
                )}
              </div>
              <div className="flex flex-col space-y-2 ml-4">
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
                <Badge className={getStatusColor(task.status)}>
                  {task.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 space-y-1">
                {task.due_date && (
                  <p>
                    Due: {new Date(task.due_date).toLocaleDateString()}
                  </p>
                )}
                {task.source_type === 'ai_generated' && (
                  <p className="text-blue-600">✨ AI-generated from note</p>
                )}
                <p>Created: {new Date(task.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex space-x-2">
                {task.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTaskStatus(task.id, 'in_progress');
                    }}
                  >
                    Start
                  </Button>
                )}
                {task.status === 'in_progress' && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTaskStatus(task.id, 'completed');
                    }}
                  >
                    Complete
                  </Button>
                )}
                {task.status === 'completed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTaskStatus(task.id, 'pending');
                    }}
                  >
                    Reopen
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}