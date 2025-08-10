'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  getTagClasses, 
  pastelColors, 
  setCustomTagColor,
  getRandomPastelColor
} from '@/lib/tag-colors';
import ColorPalette from './ColorPalette';

interface Tag {
  id: string;
  name: string;
  count: number;
}

interface EditTagsInterfaceProps {
  initialTags: Tag[];
}

export default function EditTagsInterface({ initialTags }: EditTagsInterfaceProps) {
  const [tags, setTags] = useState(initialTags);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const router = useRouter();

  const handleTagClick = (tagName: string) => {
    if (editingTag === tagName) {
      setEditingTag(null); // Close if already open
    } else {
      setEditingTag(tagName); // Open color picker
    }
  };

  const handleColorChange = (tagName: string, colorClasses: string) => {
    setCustomTagColor(tagName, colorClasses);
    setEditingTag(null);
    // Force re-render by updating the tags state
    setTags([...tags]);
  };

  const handleRandomColor = (tagName: string) => {
    const randomColor = getRandomPastelColor();
    handleColorChange(tagName, randomColor);
  };

  const handleDeleteTag = async (tagId: string, tagName: string) => {
    try {
      const response = await fetch(`/api/tags/${tagId}`, { 
        method: 'DELETE' 
      });
      
      if (response.ok) {
        setTags(tags.filter(tag => tag.id !== tagId));
        setShowDeleteConfirm(null);
        if (editingTag === tagName) {
          setEditingTag(null);
        }
      } else {
        const error = await response.json();
        console.error('Failed to delete tag:', error.error);
        alert('Failed to delete tag: ' + error.error);
      }
    } catch (error) {
      console.error('Failed to delete tag:', error);
      alert('Failed to delete tag. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <ColorPalette />
      {/* Back button */}
      <div>
        <Button 
          variant="outline" 
          onClick={() => {
            // Refresh the dashboard data before navigating back
            router.push('/dashboard');
            router.refresh();
          }}
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>
      </div>

      {/* Tags Cloud */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Tags</CardTitle>
          <p className="text-sm text-gray-600">Click on a tag to edit or delete it</p>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <div key={tag.id} className="relative">
                <Badge 
                  variant="outline"
                  className={`${getTagClasses(tag.name, 'flex items-center space-x-1 px-3 py-1 text-sm cursor-pointer hover:opacity-80 transition-all')} ${editingTag === tag.name ? 'ring-2 ring-blue-300' : ''}`}
                  onClick={() => handleTagClick(tag.name)}
                  title="Click to edit or delete"
                >
                  <span>{tag.name}</span>
                  <span className="text-xs bg-white bg-opacity-70 rounded-full px-1 min-w-[16px] text-center ml-1">
                    {tag.count}
                  </span>
                  {editingTag === tag.name && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(tag.id);
                        setEditingTag(null);
                      }}
                      className="ml-1 text-red-500 hover:text-red-700 transition-colors"
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
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Color Options Panel - Shows when editing */}
      {editingTag && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Edit Tag: &quot;{editingTag}&quot;</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">Choose Color:</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRandomColor(editingTag)}
                  className="text-xs"
                >
                  🎲 Random
                </Button>
              </div>
              <div className="grid grid-cols-10 gap-2">
                {pastelColors.map((color, index) => (
                  <button
                    key={index}
                    className="w-10 h-10 rounded border-2 hover:scale-110 transition-transform"
                    style={color.style}
                    onClick={() => handleColorChange(editingTag, color.classes)}
                    title={color.name}
                  />
                ))}
              </div>
              <div className="flex justify-center">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingTag(null)}
                  className="text-xs"
                >
                  Done Editing
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black bg-opacity-20"
            onClick={() => setShowDeleteConfirm(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-red-600">Delete Tag</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-800 mb-4">
                  Are you sure you want to delete the tag &quot;{tags.find(t => t.id === showDeleteConfirm)?.name}&quot;? 
                  It will be removed from all {tags.find(t => t.id === showDeleteConfirm)?.count} notes.
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const tag = tags.find(t => t.id === showDeleteConfirm);
                      if (tag) handleDeleteTag(tag.id, tag.name);
                    }}
                    className="flex-1"
                  >
                    Yes, Delete
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {tags.length === 0 && (
        <div className="text-center py-12">
          <div className="max-w-sm mx-auto">
            <div className="bg-gray-100 rounded-full p-6 mb-4 inline-block">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tags found</h3>
            <p className="text-gray-600 mb-4">
              Create some notes with tags to manage them here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}