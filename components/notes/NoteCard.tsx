'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getTagClasses } from '@/lib/tag-colors';

interface Note {
  id: string;
  title: string | null;
  raw_text: string | null;
  summary: string | null;
  status: 'raw' | 'processing' | 'processed' | 'error';
  source_type: string;
  created_at: string;
  tags?: string[];
}

interface NoteCardProps {
  note: Note;
  onDelete?: (id: string) => void;
  onRerun?: (id: string) => void;
}

export default function NoteCard({ note, onDelete, onRerun }: NoteCardProps) {
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok && onDelete) {
        onDelete(note.id);
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleRerunAI = async () => {
    if (!confirm('Rerun AI processing? This will regenerate the summary and add new tags while keeping existing ones.')) return;
    
    try {
      const response = await fetch(`/api/notes/${note.id}/rerun`, {
        method: 'POST',
      });
      
      if (response.ok && onRerun) {
        onRerun(note.id);
      }
    } catch (error) {
      console.error('Rerun AI failed:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      raw: 'bg-gray-100 text-gray-800',
      processing: 'bg-yellow-100 text-yellow-800',
      processed: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800'
    };
    
    const canRerun = status === 'processed' || status === 'error';
    
    return (
      <Badge 
        className={`${variants[status as keyof typeof variants] || variants.raw} ${canRerun ? 'cursor-pointer hover:opacity-75 transition-opacity' : ''}`}
        onClick={canRerun ? handleRerunAI : undefined}
        title={canRerun ? 'Click to rerun AI processing' : ''}
      >
        {status}
        {canRerun && <span className="ml-1 text-xs">↻</span>}
      </Badge>
    );
  };

  const displayTitle = note.title || 'Untitled Note';
  const displayContent = note.summary || note.raw_text || '';
  const previewText = displayContent.length > 200 
    ? displayContent.substring(0, 200) + '...' 
    : displayContent;

  return (
    <Card className="h-full hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-2">
            <Link 
              href={`/notes/${note.id}`}
              className="hover:text-blue-600 transition-colors"
            >
              {displayTitle}
            </Link>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {getStatusBadge(note.status)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <p className="text-gray-600 text-sm line-clamp-4">
            {previewText}
          </p>
          
          {note.tags && note.tags.filter(tag => tag).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {note.tags.filter(tag => tag).map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="outline"
                  className={getTagClasses(tag, 'text-xs px-2 py-1')}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
            <span>
              {new Date(note.created_at).toLocaleDateString()}
            </span>
            <div className="flex space-x-2">
              <Link href={`/notes/${note.id}/edit`}>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  Edit
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 text-red-600 hover:text-red-700"
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}