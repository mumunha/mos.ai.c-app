'use client';

import { useState, useEffect } from 'react';
import NoteCard from './NoteCard';

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

interface NotesListProps {
  filterTag?: string;
}

export default function NotesList({ filterTag }: NotesListProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const response = await fetch('/api/notes');
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes);
      } else {
        setError('Failed to fetch notes');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (deletedId: string) => {
    setNotes(notes.filter(note => note.id !== deletedId));
  };

  const handleRerun = (noteId: string) => {
    // Update the note status to processing and refresh the list
    setNotes(notes.map(note => 
      note.id === noteId 
        ? { ...note, status: 'processing' as const }
        : note
    ));
    
    // Refresh notes list after a short delay to get updated data
    setTimeout(() => {
      fetchNotes();
    }, 1000);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg h-48"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchNotes}
          className="mt-2 text-blue-600 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Filter notes based on filterTag
  const filteredNotes = filterTag 
    ? notes.filter(note => note.tags && note.tags.includes(filterTag))
    : notes;

  if (notes.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="max-w-sm mx-auto">
          <div className="bg-gray-100 rounded-full p-6 mb-4 inline-block">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h3>
          <p className="text-gray-600 mb-4">
            Start building your knowledge base by creating your first note.
          </p>
        </div>
      </div>
    );
  }

  if (filteredNotes.length === 0 && filterTag) {
    return (
      <div className="text-center py-8">
        <div className="max-w-sm mx-auto">
          <div className="bg-gray-100 rounded-full p-6 mb-4 inline-block">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No notes with tag &quot;{filterTag}&quot;</h3>
          <p className="text-gray-600 mb-4">
            No notes found with the selected tag. Try selecting a different tag or create a new note.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredNotes.map((note) => (
        <NoteCard key={note.id} note={note} onDelete={handleDelete} onRerun={handleRerun} />
      ))}
    </div>
  );
}