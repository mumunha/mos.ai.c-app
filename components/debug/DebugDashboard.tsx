'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ProcessingLog {
  id: string;
  note_id: string;
  operation: string;
  status: 'started' | 'completed' | 'failed';
  message: string | null;
  error_details: any;
  processing_time_ms: number | null;
  created_at: string;
  note_title?: string;
}

interface ProcessingStats {
  total: number;
  completed: number;
  failed: number;
  in_progress: number;
  avg_processing_time: number;
}

export default function DebugDashboard() {
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      console.log('Fetching debug data...');
      
      // Test basic API first
      const testResponse = await fetch('/api/debug/test');
      console.log('Test API response:', testResponse.status);
      
      if (testResponse.ok) {
        const testData = await testResponse.json();
        console.log('Test data:', testData);
      }

      const [logsResponse, statsResponse] = await Promise.all([
        fetch('/api/debug/processing-logs'),
        fetch('/api/debug/processing-stats')
      ]);

      console.log('Logs response:', logsResponse.status);
      console.log('Stats response:', statsResponse.status);

      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        console.log('Logs data:', logsData);
        setLogs(logsData.logs);
      } else {
        const errorData = await logsResponse.json();
        console.error('Logs API error:', errorData);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('Stats data:', statsData);
        setStats(statsData.stats);
      } else {
        const errorData = await statsResponse.json();
        console.error('Stats API error:', errorData);
      }
    } catch (error) {
      console.error('Failed to fetch debug data:', error);
      setError('Failed to load debug data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const retryProcessing = async (noteId: string) => {
    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId })
      });
      
      if (response.ok) {
        alert('Processing retry initiated');
        fetchData(); // Refresh data
      } else {
        const error = await response.json();
        alert(`Retry failed: ${error.error}`);
      }
    } catch (error) {
      alert('Retry failed: Network error');
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    const variants = {
      started: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.started}>
        {status}
      </Badge>
    );
  };

  const selectedLog = logs.find(log => log.id === selectedLogId);

  if (loading) {
    return <div className="text-center py-8">Loading debug dashboard...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">{error}</div>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.in_progress}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Avg Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.avg_processing_time ? `${Math.round(stats.avg_processing_time)}ms` : 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Logs Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Processing Logs</CardTitle>
              <Button onClick={fetchData} size="sm" variant="outline">
                Refresh
              </Button>
            </div>
            <CardDescription>Recent AI processing operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                    selectedLogId === log.id ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedLogId(log.id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">
                      {log.note_title || 'Untitled Note'}
                    </span>
                    {getStatusBadge(log.status)}
                  </div>
                  <div className="text-xs text-gray-500 mb-1">
                    {log.operation} • {new Date(log.created_at).toLocaleString()}
                  </div>
                  {log.message && (
                    <div className="text-xs text-gray-700">{log.message}</div>
                  )}
                  {log.status === 'failed' && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        retryProcessing(log.note_id);
                      }}
                      size="sm"
                      variant="outline"
                      className="mt-2"
                    >
                      Retry
                    </Button>
                  )}
                </div>
              ))}
              
              {logs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No processing logs found
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Log Details */}
        <Card>
          <CardHeader>
            <CardTitle>Log Details</CardTitle>
            <CardDescription>
              {selectedLog ? 'Detailed information for selected log' : 'Select a log to view details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedLog ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Operation</h4>
                  <p className="text-sm text-gray-600">{selectedLog.operation}</p>
                </div>
                
                <div>
                  <h4 className="font-medium">Status</h4>
                  <div className="mt-1">{getStatusBadge(selectedLog.status)}</div>
                </div>
                
                <div>
                  <h4 className="font-medium">Message</h4>
                  <p className="text-sm text-gray-600">
                    {selectedLog.message || 'No message'}
                  </p>
                </div>
                
                {selectedLog.processing_time_ms && (
                  <div>
                    <h4 className="font-medium">Processing Time</h4>
                    <p className="text-sm text-gray-600">
                      {selectedLog.processing_time_ms}ms
                    </p>
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium">Timestamp</h4>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedLog.created_at).toLocaleString()}
                  </p>
                </div>
                
                {selectedLog.error_details && (
                  <div>
                    <h4 className="font-medium">Error Details</h4>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-48">
                      {JSON.stringify(selectedLog.error_details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Select a log entry to view detailed information
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}