import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { getNoteById } from '@/lib/models';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import TopMenu from '@/components/ui/TopMenu';
import { getTagClasses } from '@/lib/tag-colors';
import DeletableTags from '@/components/notes/DeletableTags';

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const note = await getNoteById(id, user.id);

  if (!note) {
    notFound();
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      raw: 'bg-gray-100 text-gray-800',
      processing: 'bg-yellow-100 text-yellow-800',
      processed: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.raw}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopMenu user={user} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-blue-600 hover:underline text-sm mb-2 block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              {note.title || 'Untitled Note'}
            </h1>
            <div className="flex items-center space-x-4 mt-2">
              {getStatusBadge(note.status)}
              <span className="text-sm text-gray-500">
                Created {new Date(note.created_at).toLocaleDateString()}
              </span>
              <span className="text-sm text-gray-500">
                Source: {note.source_type}
              </span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Link href={`/notes/${note.id}/edit`}>
              <Button>
                Edit Note
              </Button>
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-gray-900">
                    {note.raw_text}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Summary */}
            {note.summary && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <span className="mr-2">🤖</span>
                    AI Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-gray-700">
                    {note.summary}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Processing Status */}
            <Card>
              <CardHeader>
                <CardTitle>Processing Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    {getStatusBadge(note.status)}
                  </div>
                  
                  {note.status === 'processing' && (
                    <div className="text-sm text-yellow-600">
                      🔄 AI is processing this note...
                    </div>
                  )}
                  
                  {note.status === 'processed' && (
                    <div className="text-sm text-green-600">
                      ✅ Processing complete
                    </div>
                  )}
                  
                  {note.status === 'error' && (
                    <div className="text-sm text-red-600">
                      ❌ Processing failed
                    </div>
                  )}
                  
                  {note.language && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Language</span>
                      <span className="text-sm font-medium">{note.language}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            {note.tags && note.tags.filter(tag => tag).length > 0 && (
              <DeletableTags 
                noteId={note.id}
                tags={note.tags.filter(tag => tag)}
              />
            )}

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created</span>
                    <span>{new Date(note.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Updated</span>
                    <span>{new Date(note.updated_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Source</span>
                    <span className="capitalize">{note.source_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Characters</span>
                    <span>{note.raw_text?.length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}