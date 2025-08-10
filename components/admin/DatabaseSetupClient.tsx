'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function DatabaseSetupClient() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const initializeDatabase = async () => {
    setLoading(true);
    setStatus('Initializing database...');
    setError('');
    setSuccess(false);
    
    try {
      const response = await fetch('/api/setup/database-init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStatus('✅ Database initialization completed successfully!');
        setSuccess(true);
      } else {
        setError(data.error || 'Database initialization failed');
        setStatus('❌ Database initialization failed');
      }
    } catch (error) {
      setError('Network error occurred');
      setStatus('❌ Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    setStatus('Testing database connection...');
    setError('');
    
    try {
      const response = await fetch('/api/debug/test');
      const data = await response.json();
      
      if (response.ok) {
        setStatus('✅ Database connection successful!');
        setSuccess(true);
      } else {
        setError(data.error || 'Connection test failed');
        setStatus('❌ Connection test failed');
      }
    } catch (error) {
      setError('Network error occurred');
      setStatus('❌ Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* MOS•AI•C Logo Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              MOS•AI•C
            </div>
            <p className="text-sm text-gray-600">Memory • Organization • Synthesis • AI • Companion</p>
          </div>
        </CardContent>
      </Card>

      {/* Database Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            Database Configuration
          </CardTitle>
          <CardDescription>
            Initialize your PostgreSQL database with all required tables, indexes, and extensions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={testConnection} 
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Test Connection
              </Button>
              
              <Button 
                onClick={initializeDatabase} 
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Database className="h-4 w-4" />
                )}
                Initialize Database
              </Button>
            </div>

            {/* Progress/Status Display */}
            {status && (
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                success ? 'bg-green-50 text-green-800' : 
                error ? 'bg-red-50 text-red-800' : 
                'bg-blue-50 text-blue-800'
              }`}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : error ? (
                  <AlertCircle className="h-4 w-4" />
                ) : null}
                <span>{status}</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-800 rounded-lg">
                <strong>Error Details:</strong> {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Setup Information */}
      <Card>
        <CardHeader>
          <CardTitle>📋 What This Does</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p><strong>Database Initialization includes:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4 text-gray-600">
              <li>Enable required PostgreSQL extensions (uuid-ossp, vector, pg_trgm, pgcrypto)</li>
              <li>Create user profiles and authentication tables</li>
              <li>Set up notes, chunks, and vector embeddings tables</li>
              <li>Create tags, sources, and file management tables</li>
              <li>Initialize tasks and calendar event tables</li>
              <li>Set up entity relationships and processing logs</li>
              <li>Configure indexes for optimal performance</li>
              <li>Install triggers for automatic timestamping</li>
            </ul>
            
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Note:</strong> This operation is safe to run multiple times. 
                Existing data will be preserved.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}