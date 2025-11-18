'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Filter,
  Search,
  Package,
  AlertTriangle,
  Shield
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface DependencyNode {
  id: string;
  name: string;
  version: string;
  type: 'direct' | 'transitive';
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  size?: number;
  group?: number;
}

interface DependencyLink {
  source: string;
  target: string;
  type: 'depends' | 'devDepends' | 'peerDepends';
}

interface DependencyGraphProps {
  nodes: DependencyNode[];
  links: DependencyLink[];
  isLoading?: boolean;
}

export function DependencyGraph({ nodes, links, isLoading = false }: DependencyGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<DependencyNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState<'force' | 'tree' | 'circular'>('force');

  // Filter nodes based on search and severity
  const filteredNodes = nodes.filter(node => {
    const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === 'all' || 
      (filterSeverity === 'critical' && node.vulnerabilities.critical > 0) ||
      (filterSeverity === 'high' && node.vulnerabilities.high > 0) ||
      (filterSeverity === 'medium' && node.vulnerabilities.medium > 0) ||
      (filterSeverity === 'low' && node.vulnerabilities.low > 0);
    
    return matchesSearch && matchesSeverity;
  });

  // Calculate node colors based on vulnerability severity
  const getNodeColor = (node: DependencyNode) => {
    if (node.vulnerabilities.critical > 0) return '#dc2626';
    if (node.vulnerabilities.high > 0) return '#ea580c';
    if (node.vulnerabilities.medium > 0) return '#d97706';
    if (node.vulnerabilities.low > 0) return '#65a30d';
    return '#6b7280';
  };

  // Calculate node size based on dependencies
  const getNodeSize = (node: DependencyNode) => {
    const dependencyCount = links.filter(link => link.source === node.id).length;
    return Math.max(8, Math.min(20, 8 + dependencyCount * 2));
  };

  // Simple force-directed layout simulation
  useEffect(() => {
    if (!svgRef.current || filteredNodes.length === 0) return;

    const svg = svgRef.current;
    const width = svg.clientWidth;
    const height = svg.clientHeight;

    // Clear previous content
    svg.innerHTML = '';

    // Create groups
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `scale(${zoom})`);
    svg.appendChild(g);

    // Draw links
    const filteredLinks = links.filter(link => 
      filteredNodes.some(n => n.id === link.source) && 
      filteredNodes.some(n => n.id === link.target)
    );

    filteredLinks.forEach(link => {
      const sourceNode = filteredNodes.find(n => n.id === link.source);
      const targetNode = filteredNodes.find(n => n.id === link.target);
      
      if (!sourceNode || !targetNode) return;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      
      // Simple layout: arrange nodes in a circle or grid
      const sourceIndex = filteredNodes.indexOf(sourceNode);
      const targetIndex = filteredNodes.indexOf(targetNode);
      
      const sourceAngle = (sourceIndex / filteredNodes.length) * 2 * Math.PI;
      const targetAngle = (targetIndex / filteredNodes.length) * 2 * Math.PI;
      
      const radius = Math.min(width, height) * 0.3;
      const centerX = width / 2;
      const centerY = height / 2;
      
      const sourceX = centerX + Math.cos(sourceAngle) * radius;
      const sourceY = centerY + Math.sin(sourceAngle) * radius;
      const targetX = centerX + Math.cos(targetAngle) * radius;
      const targetY = centerY + Math.sin(targetAngle) * radius;

      line.setAttribute('x1', sourceX.toString());
      line.setAttribute('y1', sourceY.toString());
      line.setAttribute('x2', targetX.toString());
      line.setAttribute('y2', targetY.toString());
      line.setAttribute('stroke', '#e5e7eb');
      line.setAttribute('stroke-width', '1');
      line.setAttribute('opacity', '0.6');
      
      g.appendChild(line);
    });

    // Draw nodes
    filteredNodes.forEach((node, index) => {
      const angle = (index / filteredNodes.length) * 2 * Math.PI;
      const radius = Math.min(width, height) * 0.3;
      const centerX = width / 2;
      const centerY = height / 2;
      
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      // Node circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x.toString());
      circle.setAttribute('cy', y.toString());
      circle.setAttribute('r', getNodeSize(node).toString());
      circle.setAttribute('fill', getNodeColor(node));
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', '2');
      circle.setAttribute('cursor', 'pointer');
      
      circle.addEventListener('click', () => setSelectedNode(node));
      circle.addEventListener('mouseenter', () => {
        circle.setAttribute('r', (getNodeSize(node) + 2).toString());
      });
      circle.addEventListener('mouseleave', () => {
        circle.setAttribute('r', getNodeSize(node).toString());
      });
      
      g.appendChild(circle);

      // Node label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x.toString());
      text.setAttribute('y', (y + getNodeSize(node) + 15).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '10');
      text.setAttribute('fill', '#374151');
      text.textContent = node.name.length > 15 ? node.name.substring(0, 12) + '...' : node.name;
      
      g.appendChild(text);
    });

  }, [filteredNodes, links, zoom, viewMode]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.3));
  const handleReset = () => setZoom(1);

  const exportGraph = () => {
    if (!svgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = 'dependency-graph.svg';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dependency Graph</CardTitle>
          <CardDescription>Loading dependency visualization...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Dependency Graph
              </CardTitle>
              <CardDescription>
                Interactive visualization of package dependencies and vulnerabilities
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={exportGraph}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search dependencies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterSeverity === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterSeverity('all')}
              >
                All
              </Button>
              <Button
                variant={filterSeverity === 'critical' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setFilterSeverity('critical')}
              >
                Critical
              </Button>
              <Button
                variant={filterSeverity === 'high' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterSeverity('high')}
                className={filterSeverity === 'high' ? 'bg-orange-600 hover:bg-orange-700' : ''}
              >
                High
              </Button>
            </div>
          </div>

          {/* Graph */}
          <div className="border rounded-lg overflow-hidden">
            <svg
              ref={svgRef}
              width="100%"
              height="500"
              className="bg-gray-50 dark:bg-gray-900"
            />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-600"></div>
              <span>Critical Vulnerabilities</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-600"></div>
              <span>High Vulnerabilities</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
              <span>Medium Vulnerabilities</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-600"></div>
              <span>Low Vulnerabilities</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-600"></div>
              <span>No Vulnerabilities</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Node Details */}
      {selectedNode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {selectedNode.name}
            </CardTitle>
            <CardDescription>
              Dependency details and vulnerability information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Package Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Version:</span>
                      <Badge variant="outline">{selectedNode.version}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant={selectedNode.type === 'direct' ? 'default' : 'secondary'}>
                        {selectedNode.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Vulnerabilities
                  </h4>
                  <div className="space-y-2">
                    {selectedNode.vulnerabilities.critical > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Critical</span>
                        <Badge variant="destructive">{selectedNode.vulnerabilities.critical}</Badge>
                      </div>
                    )}
                    {selectedNode.vulnerabilities.high > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">High</span>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          {selectedNode.vulnerabilities.high}
                        </Badge>
                      </div>
                    )}
                    {selectedNode.vulnerabilities.medium > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Medium</span>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          {selectedNode.vulnerabilities.medium}
                        </Badge>
                      </div>
                    )}
                    {selectedNode.vulnerabilities.low > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Low</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {selectedNode.vulnerabilities.low}
                        </Badge>
                      </div>
                    )}
                    {Object.values(selectedNode.vulnerabilities).every(v => v === 0) && (
                      <p className="text-sm text-muted-foreground">No vulnerabilities found</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{nodes.length}</div>
            <p className="text-xs text-muted-foreground">Total Dependencies</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {nodes.filter(n => Object.values(n.vulnerabilities).some(v => v > 0)).length}
            </div>
            <p className="text-xs text-muted-foreground">Vulnerable Packages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{links.length}</div>
            <p className="text-xs text-muted-foreground">Dependency Links</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}