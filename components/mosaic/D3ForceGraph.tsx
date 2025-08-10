'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card } from '@/components/ui/card';

export interface GraphNode {
  id: string;
  type: 'note' | 'task' | 'event' | 'entity';
  title: string;
  content: string;
  x?: number;
  y?: number;
  fx?: number | null;  // Fixed x position for dragging
  fy?: number | null;  // Fixed y position for dragging
  metadata: Record<string, any>;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
}

// D3 simulation link type
interface SimulationLink extends d3.SimulationLinkDatum<GraphNode> {
  type: string;
}

interface D3ForceGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  width?: number;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
}

const NODE_COLORS = {
  note: '#3B82F6',      // Blue
  task: '#10B981',      // Green
  event: '#F59E0B',     // Yellow
  entity: '#8B5CF6'     // Purple
};

const NODE_SIZES = {
  note: 8,
  task: 7,
  event: 7,
  entity: 6
};

export default function D3ForceGraph({
  nodes,
  links,
  width = 800,
  height = 600,
  onNodeClick,
  onNodeHover
}: D3ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);
    
    // Create container for zoom
    const container = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Convert links to simulation format
    const simulationLinks: SimulationLink[] = links.map(link => ({
      source: link.source,
      target: link.target,
      type: link.type
    }));

    // Create force simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, SimulationLink>(simulationLinks)
        .id(d => d.id)
        .distance(50))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<GraphNode>().radius(d => NODE_SIZES[d.type] + 5));

    // Add gradients for links
    const defs = svg.append('defs');
    
    // Create gradient for each link type
    const gradient = defs.append('linearGradient')
      .attr('id', 'link-gradient')
      .attr('gradientUnits', 'userSpaceOnUse');
    
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#e5e7eb')
      .attr('stop-opacity', 0.6);
    
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#9ca3af')
      .attr('stop-opacity', 0.8);

    // Create links
    const link = container.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(simulationLinks)
      .enter().append('line')
      .attr('stroke', 'url(#link-gradient)')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.6);

    // Create node groups
    const node = container.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Add circles for nodes
    node.append('circle')
      .attr('r', d => NODE_SIZES[d.type])
      .attr('fill', d => NODE_COLORS[d.type])
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))');

    // Add labels
    node.append('text')
      .text(d => d.title.length > 20 ? d.title.substring(0, 20) + '...' : d.title)
      .attr('x', 0)
      .attr('y', d => NODE_SIZES[d.type] + 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#374151')
      .attr('pointer-events', 'none');

    // Add hover effects
    node.on('mouseenter', function(event, d) {
      // Enlarge node
      d3.select(this).select('circle')
        .transition()
        .duration(200)
        .attr('r', NODE_SIZES[d.type] * 1.5);

      // Highlight connected links
      link.attr('opacity', l => {
        const sourceId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
        const targetId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
        return sourceId === d.id || targetId === d.id ? 1 : 0.2;
      });

      // Dim other nodes
      node.attr('opacity', n => 
        n.id === d.id || simulationLinks.some(l => {
          const sourceId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
          const targetId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
          return (sourceId === d.id && targetId === n.id) || (targetId === d.id && sourceId === n.id);
        }) ? 1 : 0.3
      );

      setHoveredNode(d);
      onNodeHover?.(d);
    });

    node.on('mouseleave', function(event, d) {
      // Reset node size
      d3.select(this).select('circle')
        .transition()
        .duration(200)
        .attr('r', NODE_SIZES[d.type]);

      // Reset opacity
      link.attr('opacity', 0.6);
      node.attr('opacity', 1);

      setHoveredNode(null);
      onNodeHover?.(null);
    });

    node.on('click', function(event, d) {
      setSelectedNode(d);
      onNodeClick?.(d);
    });

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => {
          const source = d.source as GraphNode;
          return source.x!;
        })
        .attr('y1', d => {
          const source = d.source as GraphNode;
          return source.y!;
        })
        .attr('x2', d => {
          const target = d.target as GraphNode;
          return target.x!;
        })
        .attr('y2', d => {
          const target = d.target as GraphNode;
          return target.y!;
        });

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [nodes, links, width, height, onNodeClick, onNodeHover]);

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-full bg-gray-50 rounded-lg"
      />
      
      {/* Legend */}
      <Card className="absolute top-4 left-4 p-3 bg-white/90 backdrop-blur">
        <h4 className="text-sm font-semibold mb-2">Legend</h4>
        <div className="space-y-1">
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs capitalize">{type}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Tooltip */}
      {hoveredNode && (
        <div
          className="absolute z-10 p-3 bg-white rounded-lg shadow-lg max-w-xs pointer-events-none"
          style={{
            left: (hoveredNode.x || 0) + 20,
            top: (hoveredNode.y || 0) - 20
          }}
        >
          <h4 className="font-semibold text-sm mb-1">{hoveredNode.title}</h4>
          <p className="text-xs text-gray-600 line-clamp-3">{hoveredNode.content}</p>
          <div className="mt-2 flex items-center space-x-2">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: NODE_COLORS[hoveredNode.type] }}
            />
            <span className="text-xs text-gray-500 capitalize">{hoveredNode.type}</span>
          </div>
        </div>
      )}
    </div>
  );
}