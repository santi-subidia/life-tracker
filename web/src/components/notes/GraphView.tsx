"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Sparkles,
  HelpCircle,
  Share2,
  Info,
  Tag,
} from "lucide-react";
import type { GraphData, GraphNode, GraphEdge } from "@/lib/api-client";

export interface GraphViewProps {
  data: GraphData;
  currentNoteId?: string;
  onSelectNode?: (node: GraphNode) => void;
  onClose?: () => void;
  className?: string;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface SimEdge {
  id: string;
  source: SimNode;
  target: SimNode;
  label?: string | null;
}

export function GraphView({
  data,
  currentNoteId,
  onSelectNode,
  onClose,
  className = "",
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Camera transform: pan offset and zoom level
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomRef = useRef<number>(1.0);
  const isDraggingCameraRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggedNodeRef = useRef<SimNode | null>(null);

  // Simulation State in refs for high-performance 60 FPS animation loop
  const simNodesRef = useRef<SimNode[]>([]);
  const simEdgesRef = useRef<SimEdge[]>([]);
  const hoveredNodeRef = useRef<SimNode | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Hover state exposed to React for the UI tooltip
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoomDisplay, setZoomDisplay] = useState<number>(100);

  // Initialize simulation graph nodes & edges from props
  useEffect(() => {
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    // Center camera
    panRef.current = { x: width / 2, y: height / 2 };
    zoomRef.current = 1.0;
    setZoomDisplay(100);

    const nodeMap = new Map<string, SimNode>();

    // Calculate radii and initial positions (arranged with small random dispersion)
    const count = data.nodes.length;
    const nodes: SimNode[] = data.nodes.map((node, index) => {
      // Radius scale: 5px to 22px based on connections count
      const radius = Math.min(22, Math.max(5, 5 + Math.sqrt(node.connectionsCount || 0) * 3.8));

      // Circular distribution with jitter
      const angle = (index / Math.max(1, count)) * 2 * Math.PI;
      const dist = 60 + Math.min(250, count * 12) + (Math.random() - 0.5) * 40;
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist;

      const simNode: SimNode = {
        ...node,
        x,
        y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius,
      };

      nodeMap.set(node.id, simNode);
      return simNode;
    });

    const edges: SimEdge[] = [];
    for (const edge of data.edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (source && target) {
        edges.push({
          id: edge.id,
          source,
          target,
          label: edge.label,
        });
      }
    }

    simNodesRef.current = nodes;
    simEdgesRef.current = edges;
  }, [data]);

  // Center camera on nodes
  const handleResetCamera = useCallback(() => {
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    if (simNodesRef.current.length === 0) {
      panRef.current = { x: width / 2, y: height / 2 };
      zoomRef.current = 1.0;
      setZoomDisplay(100);
      return;
    }

    // Find center of current nodes
    let totalX = 0;
    let totalY = 0;
    for (const n of simNodesRef.current) {
      totalX += n.x;
      totalY += n.y;
    }
    const avgX = totalX / simNodesRef.current.length;
    const avgY = totalY / simNodesRef.current.length;

    panRef.current = { x: width / 2 - avgX * zoomRef.current, y: height / 2 - avgY * zoomRef.current };
    zoomRef.current = 1.0;
    setZoomDisplay(100);
  }, []);

  // Zoom manipulation
  const handleZoom = useCallback((factor: number) => {
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;
    const centerX = width / 2;
    const centerY = height / 2;

    const currentZoom = zoomRef.current;
    const newZoom = Math.min(3.0, Math.max(0.2, currentZoom * factor));

    // Keep center stable
    panRef.current = {
      x: centerX - (centerX - panRef.current.x) * (newZoom / currentZoom),
      y: centerY - (centerY - panRef.current.y) * (newZoom / currentZoom),
    };
    zoomRef.current = newZoom;
    setZoomDisplay(Math.round(newZoom * 100));
  }, []);

  // Canvas Physics & Render Loop (60 FPS)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let isActive = true;

    // Resize canvas to match display container with devicePixelRatio for crisp text
    const resizeCanvas = () => {
      if (!containerRef.current || !canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = containerRef.current.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    // Physics constants
    const repulsionK = 1400;
    const springK = 0.035;
    const springLength = 80;
    const centerGravityK = 0.003;
    const damping = 0.86;
    const maxVelocity = 14;

    const tick = () => {
      if (!isActive) return;

      const nodes = simNodesRef.current;
      const edges = simEdgesRef.current;
      const draggedNode = draggedNodeRef.current;

      // 1. Repulsion between all node pairs (Coulomb's law)
      const n = nodes.length;
      for (let i = 0; i < n; i++) {
        const u = nodes[i];
        for (let j = i + 1; j < n; j++) {
          const v = nodes[j];
          const dx = v.x - u.x;
          const dy = v.y - u.y;
          const distSq = dx * dx + dy * dy + 100;
          const dist = Math.sqrt(distSq);
          const force = repulsionK / distSq;

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          u.vx -= fx;
          u.vy -= fy;
          v.vx += fx;
          v.vy += fy;
        }
      }

      // 2. Attraction along edges (Hooke's law)
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const u = edge.source;
        const v = edge.target;
        const dx = v.x - u.x;
        const dy = v.y - u.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
        const displacement = dist - springLength;
        const force = displacement * springK;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        u.vx += fx;
        u.vy += fy;
        v.vx -= fx;
        v.vy -= fy;
      }

      // 3. Central gravity and position integration
      for (let i = 0; i < n; i++) {
        const u = nodes[i];

        // Gravitational pull toward origin
        u.vx -= u.x * centerGravityK;
        u.vy -= u.y * centerGravityK;

        // Apply damping
        u.vx *= damping;
        u.vy *= damping;

        // Clamp velocity
        const speed = Math.sqrt(u.vx * u.vx + u.vy * u.vy);
        if (speed > maxVelocity) {
          u.vx = (u.vx / speed) * maxVelocity;
          u.vy = (u.vy / speed) * maxVelocity;
        }

        // If not dragged by user, update position
        if (u !== draggedNode) {
          u.x += u.vx;
          u.y += u.vy;
        }
      }

      // 4. Render Frame
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      // Background
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, width, height);

      // Save transform state
      ctx.save();
      const pan = panRef.current;
      const zoom = zoomRef.current;
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // Render subtle background grid dots
      const gridSize = 40;
      const startX = -pan.x / zoom - 50;
      const endX = (width - pan.x) / zoom + 50;
      const startY = -pan.y / zoom - 50;
      const endY = (height - pan.y) / zoom + 50;

      ctx.fillStyle = "#18181b";
      const dotRadius = 1 / zoom;
      if (zoom >= 0.5) {
        for (let gx = Math.floor(startX / gridSize) * gridSize; gx <= endX; gx += gridSize) {
          for (let gy = Math.floor(startY / gridSize) * gridSize; gy <= endY; gy += gridSize) {
            ctx.beginPath();
            ctx.arc(gx, gy, dotRadius, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }

      const hovered = hoveredNodeRef.current;

      // Render Edges
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const isConnectedToHovered =
          hovered && (edge.source.id === hovered.id || edge.target.id === hovered.id);
        const isConnectedToCurrent =
          currentNoteId && (edge.source.id === currentNoteId || edge.target.id === currentNoteId);

        ctx.beginPath();
        ctx.moveTo(edge.source.x, edge.source.y);
        ctx.lineTo(edge.target.x, edge.target.y);

        if (isConnectedToHovered) {
          ctx.strokeStyle = "rgba(129, 140, 248, 0.9)"; // bright indigo
          ctx.lineWidth = 1.8 / zoom;
        } else if (isConnectedToCurrent) {
          ctx.strokeStyle = "rgba(99, 102, 241, 0.7)";
          ctx.lineWidth = 1.4 / zoom;
        } else {
          ctx.strokeStyle = "rgba(63, 63, 70, 0.4)"; // muted zinc
          ctx.lineWidth = 1.0 / zoom;
        }

        ctx.setLineDash([]);
        ctx.stroke();
      }

      // Render Nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const isHovered = hovered?.id === node.id;
        const isCurrent = currentNoteId === node.id;

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);

        if (node.isStub) {
          // Stub nodes: Translucent with dashed border
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = isHovered ? "#e4e4e7" : "#71717a";
          ctx.lineWidth = isHovered ? 2 / zoom : 1.2 / zoom;
          ctx.fillStyle = isHovered ? "rgba(161, 161, 170, 0.25)" : "rgba(161, 161, 170, 0.1)";
          ctx.fill();
          ctx.stroke();
        } else {
          // Active Notes: Vibrant Indigo/Violet
          ctx.setLineDash([]);

          // Halo glow for current note or hovered
          if (isCurrent || isHovered) {
            ctx.shadowColor = isCurrent ? "rgba(129, 140, 248, 0.7)" : "rgba(99, 102, 241, 0.5)";
            ctx.shadowBlur = 12;
          } else {
            ctx.shadowBlur = 0;
          }

          ctx.fillStyle = isCurrent ? "#818cf8" : isHovered ? "#6366f1" : "#4f46e5";
          ctx.fill();

          ctx.strokeStyle = isCurrent ? "#c7d2fe" : isHovered ? "#a5b4fc" : "#4338ca";
          ctx.lineWidth = (isCurrent || isHovered ? 2.2 : 1.2) / zoom;
          ctx.stroke();

          ctx.shadowBlur = 0; // reset
        }

        // Render label text if zoom is reasonable or node is prominent
        if (zoom >= 0.75 || isHovered || isCurrent || node.connectionsCount > 2) {
          ctx.font = `${Math.max(9, Math.min(13, 11))}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";

          const label =
            node.title.length > 16 && !isHovered ? `${node.title.slice(0, 15)}…` : node.title;

          // Text pill background for legibility
          const textY = node.y + node.radius + 4;
          ctx.fillStyle = isCurrent ? "#e0e7ff" : isHovered ? "#ffffff" : node.isStub ? "#a1a1aa" : "#d4d4d8";
          ctx.fillText(label, node.x, textY);
        }
      }

      ctx.restore();

      animationFrameIdRef.current = requestAnimationFrame(tick);
    };

    animationFrameIdRef.current = requestAnimationFrame(tick);

    return () => {
      isActive = false;
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      resizeObserver.disconnect();
    };
  }, [currentNoteId]);

  // Mouse Interaction: Pan, Drag Node, Hover & Click
  const getGraphCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0, screenX: 0, screenY: 0 };
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const graphX = (screenX - panRef.current.x) / zoomRef.current;
    const graphY = (screenY - panRef.current.y) / zoomRef.current;
    return { x: graphX, y: graphY, screenX, screenY };
  };

  const findNodeAt = (graphX: number, graphY: number): SimNode | null => {
    const nodes = simNodesRef.current;
    // Iterate in reverse so top-most nodes are caught first
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const dx = node.x - graphX;
      const dy = node.y - graphY;
      const hitRadius = node.radius + 6;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return node;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getGraphCoords(e);
    const clickedNode = findNodeAt(coords.x, coords.y);

    if (clickedNode) {
      draggedNodeRef.current = clickedNode;
      clickedNode.vx = 0;
      clickedNode.vy = 0;
    } else {
      isDraggingCameraRef.current = true;
      dragStartRef.current = { x: coords.screenX, y: coords.screenY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getGraphCoords(e);

    // If dragging a node
    if (draggedNodeRef.current) {
      const node = draggedNodeRef.current;
      node.x = coords.x;
      node.y = coords.y;
      node.vx = 0;
      node.vy = 0;
      return;
    }

    // If panning the canvas
    if (isDraggingCameraRef.current) {
      const dx = coords.screenX - dragStartRef.current.x;
      const dy = coords.screenY - dragStartRef.current.y;
      panRef.current = {
        x: panRef.current.x + dx,
        y: panRef.current.y + dy,
      };
      dragStartRef.current = { x: coords.screenX, y: coords.screenY };
      return;
    }

    // Check hover
    const hit = findNodeAt(coords.x, coords.y);
    hoveredNodeRef.current = hit;
    setHoveredNode(hit);

    if (hit) {
      setTooltipPos({ x: coords.screenX, y: coords.screenY });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getGraphCoords(e);

    // Click on node
    if (draggedNodeRef.current) {
      const dragged = draggedNodeRef.current;
      draggedNodeRef.current = null;

      // If released without significant dragging, treat as click
      const dx = dragged.x - coords.x;
      const dy = dragged.y - coords.y;
      if (dx * dx + dy * dy < 25 && onSelectNode) {
        onSelectNode(dragged);
      }
      return;
    }

    isDraggingCameraRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const currentZoom = zoomRef.current;
    const newZoom = Math.min(3.5, Math.max(0.15, currentZoom * zoomFactor));

    // Zoom centered at mouse cursor position
    panRef.current = {
      x: screenX - (screenX - panRef.current.x) * (newZoom / currentZoom),
      y: screenY - (screenY - panRef.current.y) * (newZoom / currentZoom),
    };
    zoomRef.current = newZoom;
    setZoomDisplay(Math.round(newZoom * 100));
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[450px] bg-zinc-950 overflow-hidden select-none ${className}`}
    >
      {/* HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Floating Header info */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 shadow-xl">
        <Share2 className="w-3.5 h-3.5 text-indigo-400" />
        <span className="font-semibold text-zinc-200">Red de Notas</span>
        <span className="text-zinc-500">·</span>
        <span className="text-zinc-400">{data.nodes.length} notas</span>
        <span className="text-zinc-500">·</span>
        <span className="text-zinc-400">{data.edges.length} enlaces</span>
      </div>

      {/* Close button (if provided) */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 backdrop-blur-md border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition shadow-xl"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Bottom Floating Controls: Zoom & Center */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 bg-zinc-900/85 backdrop-blur-md border border-zinc-800 rounded-xl p-1 text-xs shadow-2xl">
        <button
          type="button"
          title="Acercar (+)"
          onClick={() => handleZoom(1.2)}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="px-1.5 font-mono text-[11px] text-zinc-500 min-w-[40px] text-center">
          {zoomDisplay}%
        </span>
        <button
          type="button"
          title="Alejar (-)"
          onClick={() => handleZoom(0.8)}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-zinc-800 mx-0.5" />
        <button
          type="button"
          title="Centrar Grafo"
          onClick={handleResetCamera}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Interactive Node Tooltip */}
      {hoveredNode && (
        <div
          style={{
            left: `${Math.min(window.innerWidth - 220, tooltipPos.x + 14)}px`,
            top: `${Math.min(window.innerHeight - 150, tooltipPos.y + 14)}px`,
          }}
          className="pointer-events-none absolute z-20 bg-zinc-900/95 backdrop-blur-md border border-indigo-500/30 rounded-xl p-2.5 shadow-2xl shadow-indigo-950/40 text-xs w-56 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between gap-1.5 mb-1">
            <span className="font-semibold text-zinc-100 truncate">{hoveredNode.title}</span>
            {hoveredNode.isStub ? (
              <span className="shrink-0 text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-medium">
                Stub
              </span>
            ) : (
              <span className="shrink-0 text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                Nota
              </span>
            )}
          </div>

          <div className="text-[10px] text-zinc-400 font-mono mb-1.5 truncate">
            slug: /{hoveredNode.slug}
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-1.5">
            <span>Conexiones:</span>
            <span className="font-semibold text-indigo-300">{hoveredNode.connectionsCount}</span>
          </div>

          {hoveredNode.tags && hoveredNode.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mt-1.5">
              {hoveredNode.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-2 pt-1 border-t border-zinc-800 text-[10px] text-zinc-500 text-center">
            Click para abrir nota
          </div>
        </div>
      )}
    </div>
  );
}
