'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Search, Filter, X } from 'lucide-react';
import D3ForceGraph, { GraphNode, GraphLink } from '@/components/mosaic/D3ForceGraph';

interface MosaicData {
  items: Array<{
    id: string;
    type: string;
    title: string;
    content: string;
    vector?: number[];
    x?: number;
    y?: number;
    metadata: Record<string, any>;
  }>;
  relationships: Array<{
    source: string;
    target: string;
    type: string;
  }>;
}

export default function MosaicClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MosaicData | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(['note', 'task', 'event', 'entity']));

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/mosaic/data', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Failed to fetch mosaic data');
      }

      const mosaicData = await res.json() as MosaicData;
      setData(mosaicData);
    } catch (err) {
      console.error('Error loading mosaic data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  function toggleType(type: string) {
    const newTypes = new Set(selectedTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setSelectedTypes(newTypes);
  }

  // Filter nodes based on search and selected types
  const filteredNodes = data?.items.filter(item => {
    const matchesType = selectedTypes.has(item.type);
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  }) || [];

  // Filter links to only include those between visible nodes
  const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredLinks = data?.relationships.filter(rel => 
    visibleNodeIds.has(rel.source) && visibleNodeIds.has(rel.target)
  ) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading Your Mosaic...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-6 max-w-md">
          <h2 className="text-xl font-semibold mb-2">Error Loading Mosaic</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadData}>Try Again</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Your Mosaic</h1>
            <p className="text-gray-600">Explore connections in your knowledge graph</p>
          </div>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex items-center space-x-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type filters */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            {['note', 'task', 'event', 'entity'].map(type => (
              <Badge
                key={type}
                variant={selectedTypes.has(type) ? 'default' : 'outline'}
                className="cursor-pointer capitalize"
                onClick={() => toggleType(type)}
              >
                {type}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph visualization */}
        <div className="flex-1 p-4">
          {filteredNodes.length > 0 ? (
            <D3ForceGraph
              nodes={filteredNodes.map(item => ({
                id: item.id,
                type: item.type as GraphNode['type'],
                title: item.title,
                content: item.content,
                x: item.x,
                y: item.y,
                metadata: item.metadata
              }))}
              links={filteredLinks.map(rel => ({
                source: rel.source,
                target: rel.target,
                type: rel.type
              }))}
              width={typeof window !== 'undefined' ? window.innerWidth - 400 : 800}
              height={typeof window !== 'undefined' ? window.innerHeight - 300 : 500}
              onNodeClick={setSelectedNode}
            />
          ) : (
            <Card className="p-6 max-w-md mx-auto mt-20 text-center">
              <h3 className="text-lg font-semibold mb-2">No Data Found</h3>
              <p className="text-gray-600">
                {data?.items.length === 0 
                  ? "Start creating notes, tasks, and events to see them visualized here."
                  : "No items match your current filters."}
              </p>
            </Card>
          )}
        </div>

        {/* Details sidebar */}
        {selectedNode && (
          <div className="w-96 border-l bg-white p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <Badge variant={
                selectedNode.type === 'note' ? 'default' :
                selectedNode.type === 'task' ? 'secondary' :
                selectedNode.type === 'event' ? 'outline' :
                'default'
              }>
                {selectedNode.type}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedNode(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <h2 className="text-xl font-semibold mb-4">{selectedNode.title}</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Content</h3>
                <p className="text-gray-600 whitespace-pre-wrap">
                  {selectedNode.content}
                </p>
              </div>

              {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Details</h3>
                  <dl className="space-y-2">
                    {Object.entries(selectedNode.metadata).map(([key, value]) => {
                      if (key === 'created_at' && value) {
                        value = new Date(value as string).toLocaleString();
                      }
                      return (
                        <div key={key}>
                          <dt className="text-sm text-gray-500">{key.replace(/_/g, ' ')}</dt>
                          <dd className="text-sm font-medium">
                            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              )}

              {/* Related nodes */}
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Connections</h3>
                <div className="space-y-1">
                  {filteredLinks
                    .filter(link => link.source === selectedNode.id || link.target === selectedNode.id)
                    .map((link, idx) => {
                      const connectedId = link.source === selectedNode.id ? link.target : link.source;
                      const connectedNode = filteredNodes.find(n => n.id === connectedId);
                      if (!connectedNode) return null;
                      
                      return (
                        <div
                          key={idx}
                          className="p-2 rounded hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedNode(connectedNode as GraphNode)}
                        >
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {connectedNode.type}
                            </Badge>
                            <span className="text-sm truncate">{connectedNode.title}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{link.type}</p>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}