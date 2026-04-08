# Internal Link Graph Visualization Guide

## Overview

This guide explains how to use the Link Graph API endpoint and visualize complex internal linking structures using D3.js force-directed graphs.

## Table of Contents

- [API Endpoint](#api-endpoint)
- [Data Structure](#data-structure)
- [D3.js Implementation](#d3js-implementation)
- [Customization Options](#customization-options)
- [Advanced Features](#advanced-features)
- [Export Formats](#export-formats)

---

## API Endpoint

### Get Internal Link Graph

**Endpoint:** `GET /api/reports/:reportId/link-graph`

**Description:** Returns the internal linking structure of a crawled website as a force-directed graph data structure.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reportId` | string | Yes | The ID of the completed audit report |
| `maxDepth` | number | No | Filter nodes by maximum depth from homepage (e.g., `3`) |
| `format` | string | No | Export format: `json` (default), `dot`, or `csv` |

### Example Request

```bash
# Get full link graph (JSON format)
curl http://localhost:3000/api/reports/cmn7kr6dw002gbcm982rcqau3/link-graph

# Get link graph limited to 3 levels deep
curl http://localhost:3000/api/reports/cmn7kr6dw002gbcm982rcqau3/link-graph?maxDepth=3

# Export as DOT format (Graphviz)
curl http://localhost:3000/api/reports/cmn7kr6dw002gbcm982rcqau3/link-graph?format=dot

# Export as CSV
curl http://localhost:3000/api/reports/cmn7kr6dw002gbcm982rcqau3/link-graph?format=csv
```

### Example Response (JSON)

```json
{
  "nodes": [
    {
      "id": "https://example.com/",
      "label": "Home - Example Website",
      "url": "https://example.com/",
      "type": "page",
      "title": "Home - Example Website",
      "inboundCount": 0,
      "outboundCount": 15,
      "depth": 0,
      "statusCode": 200,
      "loadTime": 1250,
      "wordCount": 850,
      "hasIssues": false,
      "isOrphan": false,
      "isHub": true,
      "isAuthority": false
    },
    {
      "id": "https://example.com/about",
      "label": "About Us",
      "url": "https://example.com/about",
      "type": "page",
      "title": "About Us",
      "inboundCount": 8,
      "outboundCount": 5,
      "depth": 1,
      "statusCode": 200,
      "loadTime": 980,
      "wordCount": 1200,
      "hasIssues": false,
      "isOrphan": false,
      "isHub": false,
      "isAuthority": true
    },
    {
      "id": "https://example.com/old-page",
      "label": "Old Legacy Page",
      "url": "https://example.com/old-page",
      "type": "page",
      "title": "Old Legacy Page",
      "inboundCount": 0,
      "outboundCount": 2,
      "depth": 5,
      "statusCode": 200,
      "loadTime": 750,
      "wordCount": 300,
      "hasIssues": true,
      "isOrphan": true,
      "isHub": false,
      "isAuthority": false
    }
  ],
  "edges": [
    {
      "id": "edge-0",
      "source": "https://example.com/",
      "target": "https://example.com/about",
      "anchorText": "Learn more about us",
      "strength": 1
    },
    {
      "id": "edge-1",
      "source": "https://example.com/",
      "target": "https://example.com/products",
      "anchorText": "View Products",
      "strength": 1
    }
  ],
  "metadata": {
    "totalPages": 45,
    "totalLinks": 178,
    "maxDepth": 4,
    "orphanPages": 3,
    "hubPages": 2,
    "authorityPages": 5,
    "averageLinksPerPage": 3.9,
    "generatedAt": "2026-04-06T12:34:56.789Z"
  }
}
```

---

## Data Structure

### Node Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier (URL) |
| `label` | string | Display label (page title or path) |
| `url` | string | Full URL of the page |
| `type` | string | Always `"page"` |
| `title` | string \| null | Page title from HTML |
| `inboundCount` | number | Number of pages linking to this page |
| `outboundCount` | number | Number of links going out from this page |
| `depth` | number | Distance from homepage (BFS depth) |
| `statusCode` | number | HTTP status code |
| `loadTime` | number | Page load time in milliseconds |
| `wordCount` | number | Total word count on page |
| `hasIssues` | boolean | Whether page has SEO issues |
| `isOrphan` | boolean | No inbound links (orphan page) |
| `isHub` | boolean | High outbound count (>10 links) |
| `isAuthority` | boolean | High inbound count (>5 links) |

### Edge Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique edge identifier |
| `source` | string | Source URL |
| `target` | string | Target URL |
| `anchorText` | string \| undefined | Link anchor text (if available) |
| `strength` | number | Edge weight (1 by default) |

### Metadata

| Property | Type | Description |
|----------|------|-------------|
| `totalPages` | number | Total number of pages |
| `totalLinks` | number | Total number of internal links |
| `maxDepth` | number | Maximum depth in link hierarchy |
| `orphanPages` | number | Count of orphan pages |
| `hubPages` | number | Count of hub pages (>10 outbound) |
| `authorityPages` | number | Count of authority pages (>5 inbound) |
| `averageLinksPerPage` | number | Average links per page |
| `generatedAt` | string | ISO timestamp of generation |

---

## D3.js Implementation

### Basic Force-Directed Graph

Here's a complete implementation using D3.js v7:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Internal Link Graph Visualization</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #1a1a1a;
      color: #fff;
    }

    #graph {
      width: 100vw;
      height: 100vh;
      background: #1a1a1a;
    }

    .node circle {
      stroke: #fff;
      stroke-width: 2px;
      cursor: pointer;
      transition: r 0.2s;
    }

    .node:hover circle {
      stroke-width: 3px;
    }

    .node text {
      font-size: 11px;
      pointer-events: none;
      fill: #fff;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
    }

    .link {
      stroke: #999;
      stroke-opacity: 0.3;
      stroke-width: 1px;
      fill: none;
    }

    .link:hover {
      stroke-opacity: 0.7;
      stroke-width: 2px;
    }

    /* Node type colors */
    .node.orphan circle { fill: #ef4444; } /* Red - orphan pages */
    .node.authority circle { fill: #22c55e; } /* Green - authority pages */
    .node.hub circle { fill: #f59e0b; } /* Orange - hub pages */
    .node.normal circle { fill: #3b82f6; } /* Blue - normal pages */
    .node.has-issues circle { 
      fill: #dc2626; 
      stroke: #fca5a5;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    #controls {
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.8);
      padding: 20px;
      border-radius: 8px;
      min-width: 250px;
    }

    #metadata {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      padding: 20px;
      border-radius: 8px;
      min-width: 200px;
    }

    .control-group {
      margin-bottom: 15px;
    }

    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
      font-size: 12px;
    }

    input[type="range"] {
      width: 100%;
    }

    button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 5px;
      margin-bottom: 5px;
    }

    button:hover {
      background: #2563eb;
    }

    .legend {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #444;
    }

    .legend-item {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      font-size: 11px;
    }

    .legend-color {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      margin-right: 10px;
      border: 2px solid #fff;
    }

    #tooltip {
      position: absolute;
      background: rgba(0, 0, 0, 0.9);
      padding: 10px;
      border-radius: 4px;
      pointer-events: none;
      display: none;
      max-width: 300px;
      font-size: 12px;
      border: 1px solid #444;
    }

    .stat-item {
      margin-bottom: 5px;
      font-size: 12px;
    }

    .stat-label {
      color: #999;
    }

    .stat-value {
      color: #fff;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div id="graph"></div>
  
  <div id="controls">
    <h3 style="margin-top: 0;">Controls</h3>
    
    <div class="control-group">
      <label>Filter by Type:</label>
      <button onclick="filterNodes('all')">All</button>
      <button onclick="filterNodes('orphan')">Orphans</button>
      <button onclick="filterNodes('authority')">Authority</button>
      <button onclick="filterNodes('hub')">Hubs</button>
      <button onclick="filterNodes('issues')">With Issues</button>
    </div>
    
    <div class="control-group">
      <label>Link Distance: <span id="distance-value">100</span></label>
      <input type="range" id="link-distance" min="50" max="300" value="100" 
             oninput="updateLinkDistance(this.value)">
    </div>
    
    <div class="control-group">
      <label>Charge Strength: <span id="charge-value">-300</span></label>
      <input type="range" id="charge-strength" min="-500" max="-100" value="-300" 
             oninput="updateChargeStrength(this.value)">
    </div>
    
    <div class="legend">
      <h4 style="margin-top: 0; margin-bottom: 10px;">Legend</h4>
      <div class="legend-item">
        <div class="legend-color" style="background: #3b82f6;"></div>
        Normal Page
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #22c55e;"></div>
        Authority (5+ inbound)
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #f59e0b;"></div>
        Hub (10+ outbound)
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #ef4444;"></div>
        Orphan (no inbound)
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #dc2626; border-color: #fca5a5;"></div>
        Has SEO Issues
      </div>
    </div>
  </div>
  
  <div id="metadata">
    <h3 style="margin-top: 0;">Graph Statistics</h3>
    <div id="stats"></div>
  </div>
  
  <div id="tooltip"></div>

  <script>
    // Configuration
    const REPORT_ID = 'cmn7kr6dw002gbcm982rcqau3'; // Replace with your report ID
    const API_URL = `http://localhost:3000/api/reports/${REPORT_ID}/link-graph`;
    
    // Graph dimensions
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Create SVG
    const svg = d3.select('#graph')
      .append('svg')
      .attr('width', width)
      .attr('height', height);
    
    // Create container for zoom/pan
    const container = svg.append('g');
    
    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });
    
    svg.call(zoom);
    
    // Create force simulation
    let simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));
    
    // Global variables
    let allNodes = [];
    let allEdges = [];
    let link, node, label;
    
    // Fetch and render graph
    fetch(API_URL)
      .then(response => response.json())
      .then(data => {
        allNodes = data.nodes;
        allEdges = data.edges;
        
        // Display metadata
        displayMetadata(data.metadata);
        
        // Render graph
        renderGraph(allNodes, allEdges);
      })
      .catch(error => {
        console.error('Error loading graph:', error);
        alert('Failed to load graph data. Check console for details.');
      });
    
    function renderGraph(nodes, edges) {
      // Clear existing elements
      container.selectAll('*').remove();
      
      // Create links
      link = container.append('g')
        .selectAll('path')
        .data(edges)
        .join('path')
        .attr('class', 'link')
        .attr('marker-end', 'url(#arrowhead)');
      
      // Add arrow marker
      svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .append('path')
        .attr('d', 'M 0,-5 L 10,0 L 0,5')
        .attr('fill', '#999')
        .style('opacity', 0.6);
      
      // Create nodes
      const nodeGroups = container.append('g')
        .selectAll('g')
        .data(nodes)
        .join('g')
        .attr('class', d => {
          let classes = 'node';
          if (d.hasIssues) classes += ' has-issues';
          else if (d.isOrphan) classes += ' orphan';
          else if (d.isAuthority) classes += ' authority';
          else if (d.isHub) classes += ' hub';
          else classes += ' normal';
          return classes;
        })
        .call(drag(simulation))
        .on('mouseover', showTooltip)
        .on('mouseout', hideTooltip)
        .on('click', nodeClicked);
      
      // Add circles to nodes
      nodeGroups.append('circle')
        .attr('r', d => {
          // Size based on importance
          const baseSize = 8;
          const inboundBonus = Math.min(d.inboundCount * 2, 20);
          const outboundBonus = Math.min(d.outboundCount * 0.5, 10);
          return baseSize + inboundBonus + outboundBonus;
        });
      
      // Add labels to nodes
      nodeGroups.append('text')
        .attr('dy', -15)
        .attr('text-anchor', 'middle')
        .text(d => {
          // Show label only for important or problematic nodes
          if (d.isAuthority || d.isHub || d.isOrphan || d.hasIssues || d.depth === 0) {
            return d.label.length > 30 ? d.label.substring(0, 30) + '...' : d.label;
          }
          return '';
        });
      
      // Update simulation
      simulation
        .nodes(nodes)
        .on('tick', ticked);
      
      simulation.force('link')
        .links(edges);
      
      // Store references
      node = nodeGroups;
    }
    
    function ticked() {
      // Update link positions
      link.attr('d', d => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        return `M ${d.source.x},${d.source.y} L ${d.target.x},${d.target.y}`;
      });
      
      // Update node positions
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    }
    
    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      
      return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    }
    
    function showTooltip(event, d) {
      const tooltip = document.getElementById('tooltip');
      tooltip.style.display = 'block';
      tooltip.style.left = (event.pageX + 10) + 'px';
      tooltip.style.top = (event.pageY + 10) + 'px';
      
      tooltip.innerHTML = `
        <strong>${d.title || d.url}</strong><br>
        <div style="margin-top: 8px;">
          <div>Inbound: <strong>${d.inboundCount}</strong> | Outbound: <strong>${d.outboundCount}</strong></div>
          <div>Depth: <strong>${d.depth}</strong> | Status: <strong>${d.statusCode}</strong></div>
          <div>Load Time: <strong>${d.loadTime}ms</strong> | Words: <strong>${d.wordCount}</strong></div>
          ${d.hasIssues ? '<div style="color: #ef4444; margin-top: 5px;">⚠️ Has SEO Issues</div>' : ''}
          ${d.isOrphan ? '<div style="color: #ef4444; margin-top: 5px;">⚠️ Orphan Page</div>' : ''}
        </div>
        <div style="margin-top: 8px; font-size: 10px; color: #999; word-break: break-all;">${d.url}</div>
      `;
    }
    
    function hideTooltip() {
      document.getElementById('tooltip').style.display = 'none';
    }
    
    function nodeClicked(event, d) {
      // Open URL in new tab
      window.open(d.url, '_blank');
    }
    
    function displayMetadata(metadata) {
      const stats = document.getElementById('stats');
      stats.innerHTML = `
        <div class="stat-item">
          <span class="stat-label">Total Pages:</span>
          <span class="stat-value">${metadata.totalPages}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Total Links:</span>
          <span class="stat-value">${metadata.totalLinks}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Max Depth:</span>
          <span class="stat-value">${metadata.maxDepth}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Orphan Pages:</span>
          <span class="stat-value">${metadata.orphanPages}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Hub Pages:</span>
          <span class="stat-value">${metadata.hubPages}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Authority Pages:</span>
          <span class="stat-value">${metadata.authorityPages}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Avg Links/Page:</span>
          <span class="stat-value">${metadata.averageLinksPerPage}</span>
        </div>
      `;
    }
    
    function filterNodes(type) {
      let filteredNodes, filteredEdges;
      
      if (type === 'all') {
        filteredNodes = allNodes;
        filteredEdges = allEdges;
      } else {
        filteredNodes = allNodes.filter(n => {
          if (type === 'orphan') return n.isOrphan;
          if (type === 'authority') return n.isAuthority;
          if (type === 'hub') return n.isHub;
          if (type === 'issues') return n.hasIssues;
          return true;
        });
        
        const nodeIds = new Set(filteredNodes.map(n => n.id));
        filteredEdges = allEdges.filter(e => 
          nodeIds.has(e.source.id || e.source) && 
          nodeIds.has(e.target.id || e.target)
        );
      }
      
      renderGraph(filteredNodes, filteredEdges);
    }
    
    function updateLinkDistance(value) {
      document.getElementById('distance-value').textContent = value;
      simulation.force('link').distance(parseInt(value));
      simulation.alpha(1).restart();
    }
    
   function updateChargeStrength(value) {
      document.getElementById('charge-value').textContent = value;
      simulation.force('charge').strength(parseInt(value));
      simulation.alpha(1).restart();
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      
      svg.attr('width', newWidth).attr('height', newHeight);
      simulation.force('center', d3.forceCenter(newWidth / 2, newHeight / 2));
      simulation.alpha(1).restart();
    });
  </script>
</body>
</html>
```

---

## Customization Options

### Color Schemes

Customize node colors based on different criteria:

```javascript
// Color by depth
function getColorByDepth(depth, maxDepth) {
  const scale = d3.scaleSequential()
    .domain([0, maxDepth])
    .interpolator(d3.interpolateViridis);
  return scale(depth);
}

// Color by performance
function getColorByLoadTime(loadTime) {
  if (loadTime < 1000) return '#22c55e'; // Green - fast
  if (loadTime < 3000) return '#f59e0b'; // Orange - medium
  return '#ef4444'; // Red - slow
}

// Color by status code
function getColorByStatus(statusCode) {
  if (statusCode === 200) return '#22c55e';
  if (statusCode >= 300 && statusCode < 400) return '#f59e0b';
  return '#ef4444';
}
```

### Node Sizing

Adjust node sizes based on importance:

```javascript
// Size by word count
const sizeScale = d3.scaleLinear()
  .domain([0, d3.max(nodes, d => d.wordCount)])
  .range([5, 30]);

nodeGroups.append('circle')
  .attr('r', d => sizeScale(d.wordCount));

// Size by PageRank-style importance
const sizeByImportance = d => {
  const base = 5;
  const inboundWeight = d.inboundCount * 2;
  const depthPenalty = d.depth * 0.5;
  return Math.min(base + inboundWeight - depthPenalty, 40);
};
```

### Layout Algorithms

Try different force layouts:

```javascript
// Radial layout (centered on homepage)
simulation
  .force('r', d3.forceRadial(d => d.depth * 100, width / 2, height / 2));

// Hierarchical layout
simulation
  .force('x', d3.forceX(d => d.depth * 150).strength(0.5))
  .force('y', d3.forceY(height / 2).strength(0.1));

// Cluster by depth
const clusters = d3.group(nodes, d => d.depth);
simulation
  .force('cluster', forceCluster()
    .centers(d => ({ x: width / 2, y: (d.depth + 1) * 100 }))
    .strength(0.5));
```

---

## Advanced Features

### Search and Highlight

Add search functionality to find specific pages:

```javascript
function searchNodes(query) {
  const searchTerm = query.toLowerCase();
  
  node.classed('highlighted', d => {
    return d.title?.toLowerCase().includes(searchTerm) ||
           d.url.toLowerCase().includes(searchTerm);
  });
  
  // Add CSS
  // .node.highlighted circle { stroke: #fbbf24; stroke-width: 4px; }
}
```

### Path Highlighting

Highlight the path between two nodes:

```javascript
function findPath(sourceId, targetId) {
  const visited = new Set();
  const queue = [[sourceId]];
  
  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];
    
    if (current === targetId) return path;
    if (visited.has(current)) continue;
    
    visited.add(current);
    
    const outbound = allEdges
      .filter(e => e.source.id === current)
      .map(e => e.target.id);
    
    for (const next of outbound) {
      queue.push([...path, next]);
    }
  }
  
  return null;
}

function highlightPath(path) {
  link.classed('in-path', e => 
    path.includes(e.source.id) && path.includes(e.target.id)
  );
  node.classed('in-path', n => path.includes(n.id));
}
```

### Statistics Panel

Add detailed statistics panel:

```javascript
function calculateDetailedStats(nodes, edges) {
  const stats = {
    avgInbound: d3.mean(nodes, d => d.inboundCount),
    avgOutbound: d3.mean(nodes, d => d.outboundCount),
    avgLoadTime: d3.mean(nodes, d => d.loadTime),
    avgWordCount: d3.mean(nodes, d => d.wordCount),
    topAuthority: nodes.sort((a, b) => b.inboundCount - a.inboundCount)[0],
    topHub: nodes.sort((a, b) => b.outboundCount - a.outboundCount)[0],
    slowestPage: nodes.sort((a, b) => b.loadTime - a.loadTime)[0],
  };
  
  return stats;
}
```

### Export Visualization

Export the graph as an image:

```javascript
function exportAsSVG() {
  const svgData = document.querySelector('#graph svg').outerHTML;
  const blob = new Blob([svgData], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `link-graph-${Date.now()}.svg`;
  link.click();
}

function exportAsPNG() {
  const svgElement = document.querySelector('#graph svg');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = svgElement.width.baseVal.value;
  canvas.height = svgElement.height.baseVal.value;
  
  const data = new XMLSerializer().serializeToString(svgElement);
  const img = new Image();
  const svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  
  img.onload = () => {
    ctx.drawImage(img, 0, 0);
    canvas.toBlob(blob => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `link-graph-${Date.now()}.png`;
      link.click();
    });
  };
  
  img.src = url;
}
```

---

## Export Formats

### DOT Format (Graphviz)

Export as DOT for use with Graphviz tools:

```bash
curl "http://localhost:3000/api/reports/REPORT_ID/link-graph?format=dot" > graph.dot

# Render with Graphviz
dot -Tpng graph.dot -o graph.png
dot -Tsvg graph.dot -o graph.svg
```

### CSV Format

Export as CSV for analysis in spreadsheets:

```bash
curl "http://localhost:3000/api/reports/REPORT_ID/link-graph?format=csv" > graph.json

# Parse and save
node -e "
  const data = require('./graph.json');
  const fs = require('fs');
  fs.writeFileSync('nodes.csv', data.nodes);
  fs.writeFileSync('edges.csv', data.edges);
"
```

---

## React Integration

For React applications, use this hook:

```typescript
import { useEffect, useState } from 'react';
import * as d3 from 'd3';

interface LinkGraphData {
  nodes: any[];
  edges: any[];
  metadata: any;
}

export function useLinkGraph(reportId: string) {
  const [data, setData] = useState<LinkGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    fetch(`/api/reports/${reportId}/link-graph`)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [reportId]);
  
  return { data, loading, error };
}

// Usage in component
function LinkGraphVisualization({ reportId }) {
  const { data, loading, error } = useLinkGraph(reportId);
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!data || !svgRef.current) return;
    
    // Initialize D3 visualization
    const svg = d3.select(svgRef.current);
    // ... rest of D3 code
  }, [data]);
  
  if (loading) return <div>Loading graph...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <svg ref={svgRef} width={800} height={600} />;
}
```

---

## Best Practices

1. **Performance**: For large graphs (>100 nodes), consider:
   - Using `maxDepth` parameter to limit nodes
   - Implementing virtualization for labels
   - Lazy loading node details on hover

2. **Usability**:
   - Add zoom and pan controls
   - Provide filtering options
   - Show tooltips with detailed information
   - Enable click-to-open-URL functionality

3. **Accessibility**:
   - Add keyboard navigation
   - Provide alternative text representations
   - Use sufficient color contrast
   - Support screen readers with ARIA labels

4. **Insights**:
   - Highlight orphan pages (SEO issue)
   - Show authority pages (high value)
   - Identify hub pages (navigation hubs)
   - Display depth distribution

---

## Troubleshooting

### Graph Not Rendering

```javascript
// Check if data loaded correctly
console.log('Nodes:', data.nodes.length);
console.log('Edges:', data.edges.length);

// Verify SVG dimensions
console.log('SVG size:', svg.attr('width'), svg.attr('height'));
```

### Nodes Overlapping

```javascript
// Increase charge strength
simulation.force('charge').strength(-500);

// Add collision detection
simulation.force('collision', d3.forceCollide().radius(40));
```

### Performance Issues

```javascript
// Limit simulation iterations
simulation.stop();
simulation.tick(300); // Run 300 ticks immediately
```

---

## Additional Resources

- [D3.js Force Layout Documentation](https://github.com/d3/d3-force)
- [D3.js Examples Gallery](https://observablehq.com/@d3/gallery)
- [Graphviz Documentation](https://graphviz.org/documentation/)
- [Network Analysis with Python NetworkX](https://networkx.org/)

---

## Support

For issues or questions:
- Check the API endpoint returns valid data
- Verify D3.js version compatibility (v7 recommended)
- Review browser console for errors
- Ensure report status is `COMPLETED`
