'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getTagClasses } from '@/lib/tag-colors';

interface DeletableTagsProps {
  noteId: string;
  tags: string[];
  onTagDeleted?: (deletedTag: string) => void;
}

interface ConfirmationDialog {
  tag: string;
  x: number;
  y: number;
}

export default function DeletableTags({ noteId, tags, onTagDeleted }: DeletableTagsProps) {
  const [currentTags, setCurrentTags] = useState(tags);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationDialog | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleTagHover = (tag: string) => {
    setHoveredTag(tag);
  };

  const handleTagLeave = () => {
    setHoveredTag(null);
  };

  const handleDeleteClick = (tag: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setConfirmation({
      tag,
      x: event.clientX,
      y: event.clientY
    });
  };

  const handleConfirmDelete = async () => {
    if (!confirmation) return;
    
    setIsDeleting(confirmation.tag);
    setConfirmation(null);
    
    try {
      const response = await fetch(`/api/notes/${noteId}/tags`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tagName: confirmation.tag })
      });

      if (response.ok) {
        const newTags = currentTags.filter(t => t !== confirmation.tag);
        setCurrentTags(newTags);
        if (onTagDeleted) {
          onTagDeleted(confirmation.tag);
        }
      } else {
        console.error('Failed to delete tag');
        alert('Failed to delete tag. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
      alert('Failed to delete tag. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmation(null);
  };

  if (!currentTags || currentTags.filter(tag => tag).length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {currentTags.filter(tag => tag).map((tag, index) => (
              <div 
                key={index}
                className="relative inline-block"
                onMouseEnter={() => handleTagHover(tag)}
                onMouseLeave={handleTagLeave}
              >
                <Badge 
                  variant="outline" 
                  className={`${getTagClasses(tag, 'text-sm px-3 py-1')} ${hoveredTag === tag ? 'pr-8' : ''} transition-all duration-200 ${isDeleting === tag ? 'opacity-50' : ''}`}
                >
                  {tag}
                  {hoveredTag === tag && isDeleting !== tag && (
                    <button
                      onClick={(e) => handleDeleteClick(tag, e)}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 transition-colors"
                      title="Delete tag"
                    >
                      <svg 
                        className="w-3 h-3" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M6 18L18 6M6 6l12 12" 
                        />
                      </svg>
                    </button>
                  )}
                  {isDeleting === tag && (
                    <span className="absolute right-1 top-1/2 transform -translate-y-1/2">
                      <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </span>
                  )}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mouse-positioned confirmation dialog */}
      {confirmation && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black bg-opacity-20"
            onClick={handleCancelDelete}
          />
          
          {/* Confirmation dialog */}
          <div 
            className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[200px]"
            style={{
              left: Math.min(confirmation.x, window.innerWidth - 220),
              top: Math.min(confirmation.y, window.innerHeight - 120),
            }}
          >
            <p className="text-sm text-gray-800 mb-3">
              Delete tag <span className="font-medium">&quot;{confirmation.tag}&quot;</span>?
            </p>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleConfirmDelete}
                className="flex-1"
              >
                Delete
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelDelete}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}