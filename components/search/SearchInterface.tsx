'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SearchResult {
  id: string;
  title: string | null;
  summary: string | null;
  raw_text: string | null;
  created_at: string;
  status: string;
  similarity?: number;
  rank?: number;
  tags?: string[];
}

interface SearchResponse {
  results: SearchResult[];
  query: string;
  searchType: string;
  total: number;
}

export default function SearchInterface() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchType, setSearchType] = useState<'hybrid' | 'vector' | 'text'>('hybrid');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          searchType,
          limit: 20
        }),
      });

      if (response.ok) {
        const data: SearchResponse = await response.json();
        setResults(data.results);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Search failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
    <div className="space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle>Search Your Knowledge Base</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex space-x-2">
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your notes..."
                className="flex-1"
              />
              <Button type="submit" disabled={loading || !query.trim()}>
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {/* Search Type Options */}
            <div className="flex space-x-4 text-sm">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="searchType"
                  value="hybrid"
                  checked={searchType === 'hybrid'}
                  onChange={(e) => setSearchType(e.target.value as any)}
                  className="mr-2"
                />
                Hybrid (AI + Text)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="searchType"
                  value="vector"
                  checked={searchType === 'vector'}
                  onChange={(e) => setSearchType(e.target.value as any)}
                  className="mr-2"
                />
                AI Semantic
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="searchType"
                  value="text"
                  checked={searchType === 'text'}
                  onChange={(e) => setSearchType(e.target.value as any)}
                  className="mr-2"
                />
                Text Only
              </label>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      {/* Results */}
      {hasSearched && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {loading ? 'Searching...' : `${results.length} results found`}
            </h3>
            {results.length > 0 && (
              <span className="text-sm text-gray-500">
                Search type: {searchType}
              </span>
            )}
          </div>

          {loading && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 rounded-lg h-32"></div>
                </div>
              ))}
            </div>
          )}

          {!loading && results.length === 0 && hasSearched && (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-lg font-medium">No results found</p>
                  <p className="text-sm mt-1">Try different keywords or search terms</p>
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-4">
              {results.map((result) => (
                <Card key={result.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <Link 
                          href={`/notes/${result.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {result.title || 'Untitled Note'}
                        </Link>
                        <div className="flex items-center space-x-2 mt-1">
                          {getStatusBadge(result.status)}
                          <span className="text-sm text-gray-500">
                            {new Date(result.created_at).toLocaleDateString()}
                          </span>
                          {(result.similarity || result.rank) && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {result.similarity 
                                ? `${Math.round(result.similarity * 100)}% match`
                                : `Rank: ${result.rank?.toFixed(3)}`
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {result.summary || (result.raw_text ? 
                          (result.raw_text.length > 200 
                            ? result.raw_text.substring(0, 200) + '...' 
                            : result.raw_text
                          ) : 'No content available'
                        )}
                      </p>
                    </div>

                    {result.tags && result.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {result.tags.slice(0, 5).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {result.tags.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{result.tags.length - 5} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}