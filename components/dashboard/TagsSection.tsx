'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getTagClasses } from '@/lib/tag-colors';

interface Tag {
  id: string;
  name: string;
  count: number;
}

interface TagsSectionProps {
  tags: Tag[];
  onTagFilter?: (tagName: string) => void;
}

export default function TagsSection({ tags, onTagFilter }: TagsSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (tags.length === 0) {
    return null;
  }

  const handleTagClick = (tagName: string) => {
    if (onTagFilter) {
      onTagFilter(tagName);
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div 
          className="flex items-center space-x-2 cursor-pointer hover:text-gray-700 transition-colors"
          onClick={toggleCollapse}
        >
          {isCollapsed ? (
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
          <h3 className="text-xl font-semibold text-gray-900">Your Tags</h3>
          <span className="text-sm text-gray-500">({tags.length} unique tags)</span>
        </div>
        <Link href="/tags/edit">
          <Button variant="outline" size="sm">
            Edit Tags
          </Button>
        </Link>
      </div>
      
      {!isCollapsed && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge 
                  key={tag.id}
                  variant="outline"
                  className={getTagClasses(tag.name, 'flex items-center space-x-1 px-3 py-1 text-sm hover:opacity-80 transition-opacity cursor-pointer')}
                  onClick={() => handleTagClick(tag.name)}
                >
                  <span>{tag.name}</span>
                  <span className="text-xs bg-white bg-opacity-70 rounded-full px-1 min-w-[16px] text-center ml-1">
                    {tag.count}
                  </span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}