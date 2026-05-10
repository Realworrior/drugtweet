import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";
import cytoscape, { Core, NodeSingular } from "cytoscape";
import { RotateCcw, Search, X } from "lucide-react";
import { getGraphData } from "../../utils/api";
import { toast } from "sonner";
import { getAppSettings } from "./Settings";

interface GraphNode {
  id: string;
  type: "drug" | "disease";
  label: string;
  frequency: number;
}

interface GraphLink {
  source: string;
  target: string;
  relation: "treats" | "causes" | "no_relation";
  count: number;
}

interface SelectedNodeInfo {
  name: string;
  type: string;
  frequency: number;
  connections: number;
  relationships: Array<{
    relation: string;
    target: string;
    count: number;
  }>;
}

export default function KnowledgeGraph() {
  const cyRef = useRef<Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState({
    treats: true,
    causes: true,
    no_relation: false,
  });
  const [minFrequency, setMinFrequency] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({
    nodes: [],
    links: [],
  });
  const [loading, setLoading] = useState(true);
  const [appSettings, setAppSettings] = useState(getAppSettings());

  useEffect(() => {
    setAppSettings(getAppSettings());
  }, []);

  useEffect(() => {
    loadGraphData();
  }, []);

  const loadGraphData = async () => {
    setLoading(true);
    const result = await getGraphData();
    const data = result?.data;
    
    // getGraphData does not throw errors locally but we check if data exists

    if (data && data.nodes.length > 0) {
      setGraphData(data);
    } else {
      toast.info("No graph data available. Please create some annotations first.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!containerRef.current || graphData.nodes.length === 0) return;

    // Filter data
    const filteredLinks = graphData.links.filter(
      (link) => filters[link.relation] && link.count >= minFrequency
    );

    const nodeIds = new Set<string>();
    filteredLinks.forEach((link) => {
      nodeIds.add(link.source);
      nodeIds.add(link.target);
    });

    const filteredNodes = graphData.nodes.filter(
      (node) => nodeIds.has(node.id) && node.frequency >= minFrequency
    );

    // Prepare Cytoscape data
    const elements = [
      ...filteredNodes.map((node) => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          frequency: node.frequency,
        },
      })),
      ...filteredLinks.map((link, idx) => ({
        data: {
          id: `edge-${idx}`,
          source: link.source,
          target: link.target,
          relation: link.relation,
          count: link.count,
        },
      })),
    ];

    // Initialize Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: [
        // Drug nodes (Medical Teal)
        {
          selector: 'node[type="drug"]',
          style: {
            "background-color": "#0d9488",
            label: "data(label)",
            color: "#f8fafc",
            "text-valign": "bottom",
            "text-halign": "center",
            "text-margin-y": 8,
            "font-size": "11px",
            "font-family": "Inter, sans-serif",
            "font-weight": "bold",
            "text-background-color": "#0f172a",
            "text-background-opacity": 0.7,
            "text-background-padding": "4px",
            "text-background-shape": "roundrectangle",
            width: (ele: any) => Math.min(appSettings.nodeSize * 2.6, Math.max(appSettings.nodeSize, ele.data('frequency') * (appSettings.nodeSize / 10))),
            height: (ele: any) => Math.min(appSettings.nodeSize * 2.6, Math.max(appSettings.nodeSize, ele.data('frequency') * (appSettings.nodeSize / 10))),
            "border-width": 2,
            "border-color": "#ffffff",
          },
        },
        // Disease nodes (Coral/Rose)
        {
          selector: 'node[type="disease"]',
          style: {
            "background-color": "#e11d48",
            label: "data(label)",
            color: "#f8fafc",
            "text-valign": "bottom",
            "text-halign": "center",
            "text-margin-y": 8,
            "font-size": "11px",
            "font-family": "Inter, sans-serif",
            "font-weight": "bold",
            "text-background-color": "#0f172a",
            "text-background-opacity": 0.7,
            "text-background-padding": "4px",
            "text-background-shape": "roundrectangle",
            width: (ele: any) => Math.min(appSettings.nodeSize * 2.6, Math.max(appSettings.nodeSize, ele.data('frequency') * (appSettings.nodeSize / 10))),
            height: (ele: any) => Math.min(appSettings.nodeSize * 2.6, Math.max(appSettings.nodeSize, ele.data('frequency') * (appSettings.nodeSize / 10))),
            "border-width": 2,
            "border-color": "#ffffff",
          },
        },
        // Treats edges (Light Teal/Sky Blue)
        {
          selector: 'edge[relation="treats"]',
          style: {
            width: (ele: any) => Math.min(8, Math.max(2, ele.data("count") / 2)),
            "line-color": "#0ea5e9",
            "target-arrow-color": "#0ea5e9",
            "target-arrow-shape": "triangle",
            "arrow-scale": 1.2,
            "curve-style": "bezier",
            label: appSettings.showRelationLabels ? "Treats" : "",
            "font-size": "10px",
            "font-family": "Inter, sans-serif",
            "font-weight": "normal",
            color: "#38bdf8",
            "text-rotation": "autorotate",
            "text-margin-y": -10,
            "text-background-color": "#082f49",
            "text-background-opacity": 0.8,
            "text-background-padding": "2px",
            "text-background-shape": "roundrectangle",
          },
        },
        // Causes edges (Orange)
        {
          selector: 'edge[relation="causes"]',
          style: {
            width: (ele: any) => Math.min(8, Math.max(2, ele.data("count") / 2)),
            "line-color": "#f97316",
            "target-arrow-color": "#f97316",
            "target-arrow-shape": "triangle",
            "arrow-scale": 1.2,
            "curve-style": "bezier",
            label: appSettings.showRelationLabels ? "Causes" : "",
            "font-size": "10px",
            "font-family": "Inter, sans-serif",
            "font-weight": "normal",
            color: "#fb923c",
            "text-rotation": "autorotate",
            "text-margin-y": -10,
            "text-background-color": "#431407",
            "text-background-opacity": 0.8,
            "text-background-padding": "2px",
            "text-background-shape": "roundrectangle",
          },
        },
        // No relation edges (gray, dashed)
        {
          selector: 'edge[relation="no_relation"]',
          style: {
            width: 2,
            "line-color": "#94a3b8",
            "target-arrow-color": "#94a3b8",
            "target-arrow-shape": "triangle",
            "arrow-scale": 1.2,
            "curve-style": "bezier",
            "line-style": "dashed",
            label: appSettings.showRelationLabels ? "No Relation" : "",
            "font-size": "10px",
            "font-family": "Inter, sans-serif",
            "font-weight": "normal",
            color: "#cbd5e1",
            "text-rotation": "autorotate",
            "text-margin-y": -10,
            "text-background-color": "#1e293b",
            "text-background-opacity": 0.8,
            "text-background-padding": "2px",
            "text-background-shape": "roundrectangle",
          },
        },
        // Highlighted nodes
        {
          selector: "node.highlighted",
          style: {
            "border-width": 4,
            "border-color": "#fbbf24",
            "z-index": 9999,
          },
        },
        // Highlighted edges
        {
          selector: "edge.highlighted",
          style: {
            width: 5,
            "z-index": 9999,
          },
        },
        // Dimmed elements
        {
          selector: ".dimmed",
          style: {
            opacity: 0.15,
          },
        },
      ],
      layout: {
        name: appSettings.enablePhysics ? "cose" : "grid",
        animate: appSettings.enablePhysics,
        randomize: true,
        nodeDimensionsIncludeLabels: true,
        idealEdgeLength: 100,
        nodeRepulsion: 4000,
        numIter: appSettings.enablePhysics ? 1000 : 1,
      },
    });

    cyRef.current = cy;

    // Click event for nodes
    cy.on("tap", "node", (event) => {
      const node = event.target;
      const nodeData = node.data();
      
      // Calculate connections and relationships
      const connectedEdges = node.connectedEdges();
      const relationships = connectedEdges.map((edge: any) => {
        const edgeData = edge.data();
        const isSource = edgeData.source === nodeData.id;
        return {
          relation: edgeData.relation.charAt(0).toUpperCase() + edgeData.relation.slice(1),
          target: isSource
            ? cy.getElementById(edgeData.target).data("label")
            : cy.getElementById(edgeData.source).data("label"),
          count: edgeData.count,
        };
      });

      setSelectedNode({
        name: nodeData.label,
        type: nodeData.type.charAt(0).toUpperCase() + nodeData.type.slice(1),
        frequency: nodeData.frequency,
        connections: connectedEdges.length,
        relationships: relationships,
      });

      // Highlight connected elements
      cy.elements().removeClass("highlighted dimmed");
      cy.elements().addClass("dimmed");
      node.removeClass("dimmed").addClass("highlighted");
      connectedEdges.removeClass("dimmed").addClass("highlighted");
      connectedEdges.connectedNodes().removeClass("dimmed");
    });

    // Click on background to deselect
    cy.on("tap", (event) => {
      if (event.target === cy) {
        setSelectedNode(null);
        cy.elements().removeClass("highlighted dimmed");
      }
    });

    // Tooltip on hover
    let tooltip: HTMLDivElement | null = null;

    cy.on("mouseover", "node", (event) => {
      const node = event.target;
      const nodeData = node.data();
      
      tooltip = document.createElement("div");
      tooltip.className = "absolute bg-slate-900/90 backdrop-blur-md text-slate-200 border border-slate-700 shadow-2xl px-3 py-2 rounded-lg text-sm z-50 pointer-events-none";
      tooltip.innerHTML = `
        <div class="font-semibold text-white">${nodeData.label}</div>
        <div class="text-xs text-slate-400 mt-0.5">TYPE: <span class="${nodeData.type === 'drug' ? 'text-teal-400' : 'text-rose-400'} uppercase font-bold tracking-wider">${nodeData.type}</span></div>
        <div class="text-xs text-slate-400">FREQUENCY: <span class="text-white">${nodeData.frequency}</span></div>
      `;
      document.body.appendChild(tooltip);
    });

    cy.on("mousemove", "node", (event) => {
      if (tooltip) {
        tooltip.style.left = `${event.originalEvent.clientX + 10}px`;
        tooltip.style.top = `${event.originalEvent.clientY + 10}px`;
      }
    });

    cy.on("mouseout", "node", () => {
      if (tooltip) {
        document.body.removeChild(tooltip);
        tooltip = null;
      }
    });

    // Edge hover tooltip
    cy.on("mouseover", "edge", (event) => {
      const edge = event.target;
      const edgeData = edge.data();
      
      tooltip = document.createElement("div");
      tooltip.className = "absolute bg-slate-900/90 backdrop-blur-md text-slate-200 border border-slate-700 shadow-2xl px-3 py-2 rounded-lg text-sm z-50 pointer-events-none";
      tooltip.innerHTML = `
        <div class="font-bold text-white uppercase tracking-wider text-[10px]">${edgeData.relation}</div>
        <div class="text-xs text-slate-400">STRENGTH: <span class="text-white">${edgeData.count}</span></div>
      `;
      document.body.appendChild(tooltip);
    });

    cy.on("mousemove", "edge", (event) => {
      if (tooltip) {
        tooltip.style.left = `${event.originalEvent.clientX + 10}px`;
        tooltip.style.top = `${event.originalEvent.clientY + 10}px`;
      }
    });

    cy.on("mouseout", "edge", () => {
      if (tooltip) {
        document.body.removeChild(tooltip);
        tooltip = null;
      }
    });

    return () => {
      cy.destroy();
    };
  }, [graphData, filters, minFrequency]);

  // Search functionality
  useEffect(() => {
    if (!cyRef.current || !searchQuery) {
      if (cyRef.current) {
        cyRef.current.elements().removeClass("highlighted dimmed");
      }
      return;
    }

    const cy = cyRef.current;
    const searchLower = searchQuery.toLowerCase();
    
    cy.elements().removeClass("highlighted dimmed");
    
    const matchingNodes = cy.nodes().filter((node) => {
      return node.data("label").toLowerCase().includes(searchLower);
    });

    if (matchingNodes.length > 0) {
      cy.elements().addClass("dimmed");
      matchingNodes.removeClass("dimmed").addClass("highlighted");
      matchingNodes.connectedEdges().removeClass("dimmed").addClass("highlighted");
      matchingNodes.connectedEdges().connectedNodes().removeClass("dimmed");
      
      // Center on first match
      cy.animate({
        fit: {
          eles: matchingNodes,
          padding: 100,
        },
        duration: 500,
      });
    }
  }, [searchQuery]);

  const handleReset = () => {
    if (!cyRef.current) return;
    cyRef.current.fit(undefined, 50);
    cyRef.current.elements().removeClass("highlighted dimmed");
    setSelectedNode(null);
    setSearchQuery("");
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-[#030712] text-slate-200 relative">
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      <div className="absolute left-1/4 top-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-teal-500/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute right-1/4 bottom-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-rose-500/10 blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <div className="p-6 bg-slate-900/40 backdrop-blur-xl border-b border-slate-800/60 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-white tracking-tight">Knowledge Graph</h2>
            <p className="text-slate-400 mt-1">Interactive precision medical mapping</p>
          </div>
          <Button onClick={handleReset} variant="outline" className="gap-2 bg-slate-900/50 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white">
            <RotateCcw className="w-4 h-4" />
            Reset View
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden z-10">
        {/* Left Panel - Filters */}
        <aside className="w-full md:w-80 shrink-0 bg-slate-900/40 backdrop-blur-md border-b md:border-b-0 md:border-r border-slate-800/60 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Search */}
            <div>
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">
                Search Entity
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Search nodes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500 focus-visible:ring-teal-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <Separator className="bg-slate-800/60" />

            {/* Relationship Filters */}
            <div>
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">
                Relationship Types
              </Label>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="treats"
                    checked={filters.treats}
                    onCheckedChange={(checked) =>
                      setFilters({ ...filters, treats: checked === true })
                    }
                    className="border-slate-600 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                  />
                  <Label htmlFor="treats" className="cursor-pointer flex items-center gap-2 text-sm text-slate-300 font-medium">
                    <div className="w-8 h-1 bg-sky-500 rounded-full shadow-[0_0_8px_rgba(14,165,233,0.6)]"></div>
                    Treats
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="causes"
                    checked={filters.causes}
                    onCheckedChange={(checked) =>
                      setFilters({ ...filters, causes: checked === true })
                    }
                    className="border-slate-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                  />
                  <Label htmlFor="causes" className="cursor-pointer flex items-center gap-2 text-sm text-slate-300 font-medium">
                    <div className="w-8 h-1 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
                    Causes
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="no_relation"
                    checked={filters.no_relation}
                    onCheckedChange={(checked) =>
                      setFilters({ ...filters, no_relation: checked === true })
                    }
                    className="border-slate-600 data-[state=checked]:bg-slate-400 data-[state=checked]:border-slate-400"
                  />
                  <Label htmlFor="no_relation" className="cursor-pointer flex items-center gap-2 text-sm text-slate-300 font-medium">
                    <div className="w-8 h-1 bg-slate-400 border-t-2 border-dashed border-slate-400 rounded-full"></div>
                    No Relation
                  </Label>
                </div>
              </div>
            </div>

            <Separator className="bg-slate-800/60" />

            {/* Frequency Filter */}
            <div>
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">
                Minimum Frequency
              </Label>
              <Select value={minFrequency.toString()} onValueChange={(v) => setMinFrequency(Number(v))}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectItem value="1">≥ 1</SelectItem>
                  <SelectItem value="10">≥ 10</SelectItem>
                  <SelectItem value="20">≥ 20</SelectItem>
                  <SelectItem value="30">≥ 30</SelectItem>
                  <SelectItem value="40">≥ 40</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-2">
                Show only entities appearing at least this many times
              </p>
            </div>

            <Separator className="bg-slate-800/60" />

            {/* Legend */}
            <div>
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">
                Legend
              </Label>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-4 h-4 bg-teal-400 rounded-sm shadow-[0_0_10px_rgba(45,212,191,0.5)] border border-teal-200"></div>
                  <span className="font-medium text-slate-300">Drug</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-4 h-4 bg-rose-400 rounded-sm shadow-[0_0_10px_rgba(251,113,133,0.5)] border border-rose-200"></div>
                  <span className="font-medium text-slate-300">Disease</span>
                </div>
                <div className="pt-2 space-y-1">
                  <p className="text-xs text-slate-500">
                    <span className="text-teal-400 text-lg leading-none align-middle mr-1">•</span> Node size = frequency
                  </p>
                  <p className="text-xs text-slate-500">
                    <span className="text-sky-400 text-lg leading-none align-middle mr-1">▬</span> Edge width = strength
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Center Panel - Graph Canvas */}
        <div className="flex-1 relative min-h-[400px] md:min-h-0 w-full shrink-0 md:shrink border-b md:border-b-0 border-slate-800/60">
          <div ref={containerRef} className="w-full h-full absolute inset-0" />
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-[#030712]/50 backdrop-blur-sm z-10">
              <div className="text-teal-400 flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(45,212,191,0.5)]"></div>
                <span className="text-sm font-medium tracking-widest uppercase shadow-teal-500">Initializing Network Matrix...</span>
              </div>
            </div>
          ) : graphData.nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="bg-slate-900/60 backdrop-blur-md border border-rose-500/30 p-8 rounded-2xl flex flex-col items-center gap-4 text-center shadow-2xl">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                  <span className="text-2xl">🛑</span>
                </div>
                <span className="text-sm font-bold tracking-widest uppercase text-rose-400">Offline Matrix</span>
                <p className="text-xs text-slate-400 max-w-xs font-medium">No medical relation telemetry detected. Please process data in the Extraction module to power up the Knowledge Graph.</p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right Panel - Node Details */}
        <aside className="w-full md:w-80 shrink-0 bg-slate-900/40 backdrop-blur-md md:border-l border-slate-800/60 overflow-y-auto p-0">
          <div className="p-6">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 block">
              Node Intelligence
            </Label>
            
            {selectedNode ? (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300 fade-in">
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-white">{selectedNode.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                      <span className="text-sm text-slate-400">Entity Type</span>
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider shadow-sm ${
                        selectedNode.type === "Drug"
                          ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}>
                        {selectedNode.type}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                      <span className="text-sm text-slate-400">Total Mentions</span>
                      <span className="font-semibold text-white">{selectedNode.frequency}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-slate-400">Network Links</span>
                      <span className="font-semibold text-white">{selectedNode.connections}</span>
                    </div>
                  </CardContent>
                </Card>

                {selectedNode.relationships.length > 0 && (
                  <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-white">Relationship Vectors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedNode.relationships.map((rel, idx) => (
                          <div key={idx} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/30 hover:border-slate-600/50 transition-colors">
                            <div className="flex items-center gap-2 text-sm">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                rel.relation === "Treats"
                                  ? "bg-sky-500/20 text-sky-400"
                                  : "bg-orange-500/20 text-orange-400"
                              }`}>
                                {rel.relation}
                              </span>
                              <span className="text-slate-600">→</span>
                              <span className="font-medium text-slate-200">{rel.target}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Strength: {rel.count}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-800/50 rounded-full mx-auto mb-4 flex items-center justify-center border border-slate-700/50 shadow-inner">
                  <Search className="w-6 h-6 text-slate-500" />
                </div>
                <p className="text-sm text-slate-500 font-medium">
                  Select a node to scan<br/>intelligence
                </p>
              </div>
            )}

            {/* Interaction Tips */}
            <div className="mt-8 p-4 bg-teal-950/20 rounded-lg border border-teal-900/30">
              <h4 className="text-[10px] font-bold text-teal-500 uppercase tracking-widest mb-2">System Controls</h4>
              <ul className="text-xs text-teal-200/50 space-y-1.5 font-mono">
                <li>&gt; DRAG to reposition</li>
                <li>&gt; SCROLL to zoom</li>
                <li>&gt; CLICK node to trace</li>
                <li>&gt; HOVER for telemetry</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}