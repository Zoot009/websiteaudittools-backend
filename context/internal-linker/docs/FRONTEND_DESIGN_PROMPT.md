# Internal Linking Analyzer - UI/UX Design Specification

**Design a professional, analytics-focused web application for visualizing website internal linking structures.**

---

## 🎯 Overview

Create a clean, data-driven interface for SEO professionals to analyze and understand their website's internal linking architecture. The UI should make complex graph relationships immediately comprehensible and help identify structural issues at a glance.

**Core Design Goals:**
- **Clarity over decoration** - Every visual element serves analysis
- **Progressive complexity** - Simple overview → detailed analysis on demand
- **Performance at scale** - Smooth with 500+ pages
- **Actionable insights** - Direct users to problems and solutions

---

## 📚 Technical Context

### Backend Reference
**📘 For complete API details, see [API_DOC.md](API_DOC.md)**

**Quick Summary:**
- **Architecture:** Async job-based API (submit → poll → retrieve results)
- **Data Format:** JSON responses with link graphs, statistics, and metadata
- **Job Flow:** `waiting` → `active` → `completed`/`failed`

**Key API Endpoints:**
- `POST /api/jobs/submit` - Start analysis
- `GET /api/jobs/:jobId/status` - Poll progress (has `percentage`, `current`, `total`)
- `GET /api/jobs/:jobId/result` - Get full results

**Data You'll Receive:**
```typescript
// See API_DOC.md for complete TypeScript interfaces
{
  linkGraph: { [url]: [outboundUrls] },     // Adjacency list
  inboundLinksCount: { [url]: count },       // Popularity lookup
  orphanPages: string[],                     // Zero inbound links
  stats: { totalPages, totalLinks, ... },    // Aggregates
  metadata: { duration, errors, ... }        // Crawl info
}
```

### Technology Stack

**UI Framework:**
- **React 18+** with TypeScript
- **Vite** for build tooling
- **React Router v6** for navigation

**Component Library:**
- **shadcn/ui** - Tailwind-based components
- Install only what you need: Button, Card, Input, Table, Tabs, Dialog, Accordion, Badge, Slider

**Visualization:**
- **D3.js v7+** (primary recommendation) - Maximum control, better for 500+ nodes
  - Modules: `d3-force`, `d3-selection`, `d3-zoom`, `d3-drag`, `d3-scale`
- **React-Flow** (alternative) - Faster prototyping, easier React integration

**Data Fetching:**
- **React Query** - Server state, automatic polling, caching

**Styling:**
- **Tailwind CSS** - Utility-first styling

---

## 🎨 Design System

---

## 🎨 Design System

### Color Palette

**Professional, accessibility-first (WCAG AA compliance)**

**Core Colors:**
- **Primary** - Interactive elements, CTAs, key metrics
  - Use for: Submit buttons, links, active states
  - Examples: `bg-primary`, `text-primary-foreground`

- **Success (Green)** - Healthy pages, positive metrics
  - Use for: Good inbound counts (>5 links), completed states
  - Examples: Nodes with strong inbound links

- **Warning (Yellow/Orange)** - Attention needed
  - Use for: Low inbound (1-2 links), moderate depth (3-4), active processing
  - Examples: Pages needing link improvements

- **Destructive (Red)** - Critical issues
  - Use for: Orphan pages (0 inbound), errors, failed states
  - Examples: Broken pages, unreachable content

- **Muted (Gray)** - Background, secondary information
  - Use for: Disabled states, metadata, less important data

**Graph-Specific:**
- Node colors encode meaning (issue severity or cluster)
- Edge colors: Muted by default, highlighted on interaction
- Background: Light neutral (don't compete with data)

### Typography

**Hierarchy:**
```
H1 (Page Title)     - 2xl/3xl, bold
H2 (Section)        - xl/2xl, semibold  
H3 (Card Header)    - lg/xl, medium
Body               - base, regular
Small/Meta         - sm, regular
Tiny (Labels)      - xs, medium (graph labels, badges)
```

**Fonts:**
- **Sans-serif** for UI (system font stack or Inter/Tailwind default)
- **Monospace** for URLs and technical data

**Readability:**
- URL labels: Abbreviated with hover tooltip for full path
- Graph text: Readable at zoom levels 0.5x - 3x
- Contrast: Minimum 4.5:1 for normal text, 3:1 for large text

### Spacing & Layout

**Container Widths:**
- Max width: `1920px` (desktop)
- Sidebar: `280px` fixed (collapsible to icon-only on < 1024px)
- Padding: Consistent `1rem` (16px) for cards, `1.5rem` (24px) for sections

**Responsive Breakpoints:**
- Mobile: `< 768px` - Stack layout, hide graph, show table
- Tablet: `768px - 1279px` - Collapsible sidebar, simplified graph
- Desktop: `≥ 1280px` - Full three-panel layout

### Component Patterns

**shadcn/ui Components to Use:**
- `Button` - CTAs, actions (variants: default, outline, ghost, destructive)
- `Card` - Stat summaries, issue lists, detail panels
- `Input` - URL entry, search, filters
- `Select` - Dropdowns (grouping, state filters)
- `Slider` - Numeric ranges (max pages, depth threshold)
- `Badge` - Status indicators, issue tags
- `Tabs` - Main content switcher (Graph/Table/Issues/Metadata)
- `Accordion` - Filters, collapsible issue categories
- `Dialog`/`Sheet` - Node detail panel (slide-out drawer)
- `Progress` - Crawl progress bar
- `Table` - Sortable data grid
- `Tooltip` - Hover info on graph nodes

**Consistent Patterns:**
- All cards have subtle shadow: `shadow-sm`
- Hover states: Slight scale or background color change
- Loading states: Skeleton screens (not spinners alone)
- Empty states: Helpful illustrations with next actions

---

## 📐 Screen Layouts

### 1. Job Submission Screen (Landing)

**Purpose:** Start a new analysis

**Components:**
- **Hero Section**
  - Clean title: "Internal Link Analyzer"
  - Subtitle explaining purpose
- **Input Form** (shadcn Card)
  - URL input with validation (must be valid HTTP/HTTPS)
  - Advanced options (Collapsible):
    - Max Pages slider (10-1000)
    - Max Depth slider (1-10)
    - Rate Limit input (ms)
  - Submit button (primary)
- **Recent Analyses** (Optional)
  - List of previous jobIds with timestamps
  - Quick load previous results

**Interactions:**
- On submit → POST to `/api/jobs/submit`
- Receive jobId → Navigate to Analysis Dashboard
- Store jobId in URL params for shareability

---

### 2. Analysis Dashboard (Main App)

**Layout:** Three-panel design

```
┌─────────────────────────────────────────────────────┐
│  Header: URL | Status Badge | Actions               │
├──────────────┬──────────────────────────────────────┤
│              │                                       │
│   Left       │        Main Content Area              │
│   Sidebar    │        (Tabs + Visualization)         │
│              │                                       │
│   (Filters   │                                       │
│    & Stats)  │                                       │
│              │                                       │
├──────────────┴──────────────────────────────────────┤
│  Footer: Crawl Metadata (duration, errors, etc.)    │
└─────────────────────────────────────────────────────┘
```

#### Header Bar
- **Website URL** (large, truncate if needed)
- **Status Badge** 
  - "Analyzing..." (animated) when job is active
  - "Complete" (success) when done
  - "Failed" (destructive) if errors
  - Show progress percentage during crawl
- **Actions**
  - Export button (CSV, JSON)
  - Share button (copy job URL)
  - New Analysis button

#### Left Sidebar (280px, collapsible)

**Summary Cards** (shadcn Card components)
- Total Pages (with icon)
- Total Links
- Average Inbound/Outbound
- Orphan Count (with warning color if > 0)

**Filters & Controls** (shadcn Accordion sections)
1. **Search**
   - Input field: "Filter by URL..."
   - Regex support toggle
   
2. **Display Options**
   - Toggle: Hide self-links
   - Toggle: Show only issues
   - Slider: Min inbound count threshold
   - Slider: Max depth filter

3. **Grouping** (Select dropdown)
   - None
   - By URL path (e.g., /blog/, /products/)
   - By depth level
   - By subdomain

4. **Highlight** (Multi-select)
   - Orphan pages
   - Low inbound (< threshold)
   - Deep pages (depth > threshold)
   - Error pages
   - Hub pages (high inbound)

#### Main Content (Tabs)

**Tab 1: Graph View** 🌐

**Visualization Options:**

**Option A: D3.js Force-Directed Graph** (Recommended for complex analysis)
- **Pros:**
  - Maximum customization and control over layout algorithms
  - Excellent for large graphs (500+ nodes) with proper optimization
  - Rich physics-based layouts (force, hierarchical, radial)
  - Industry standard for network visualization
  - Can implement custom clustering and grouping algorithms
- **Cons:**
  - Steeper learning curve
  - More manual integration with React
  - Requires careful performance optimization

**Option B: React-Flow** (Recommended for rapid prototyping)
- **Pros:**
  - Native React integration (hooks, components)
  - Built-in zoom, pan, minimap
  - Easier to get started quickly
  - Good for medium-sized graphs (< 300 nodes)
- **Cons:**
  - Less flexible for custom layouts
  - Performance may degrade with very large graphs

**Recommendation:** Use **D3.js** for production-grade visualization with better control over layout algorithms and performance for large-scale crawls

**Graph Features:**
- **Nodes**
  - Size: Proportional to inbound link count
  - Color: Cluster/group color OR issue severity
  - Label: Shortened URL (hover for full)
  - Icon badges: ⚠️ orphan, 🔗 hub, ⚡ error
  
- **Edges**
  - Directional arrows (source → target)
  - Thickness: Weight by link frequency (if multiple links)
  - Color: Muted by default, highlighted on selection
  - Curved to avoid overlap

- **Interactions**
  - Click node → Show detail panel (right side)
  - Hover node → Highlight connected edges + show tooltip (inbound/outbound count)
  - Drag nodes to reposition
  - Scroll to zoom, drag to pan
  - Double-click → Filter graph to show only connected nodes (ego network)

- **Controls** (floating toolbar)
  - Zoom in/out buttons
  - Fit all nodes
  - Download graph as PNG
  - Layout algorithm selector (hierarchical, force, circular)

- **Minimap** (bottom-right corner)
  - Overview of entire graph
  - Current viewport indicator


**Tab 2: Table View** 📊

**Purpose:** Sortable, filterable list for detailed analysis

**Table Columns** (shadcn DataTable):
| URL | Inbound | Outbound | Depth | Issues | Actions |
|-----|---------|----------|-------|--------|---------|
| `/page` | 15 | 8 | 2 | - | 🔍 |
| `/blog/post` | 0 | 12 | 3 | `Orphan` | 🔍 |

**Column Details:**
- **URL:** Truncated text, hover for full URL, click to copy
- **Inbound:** Number + bar chart indicator
- **Outbound:** Number only
- **Depth:** Badge with color (1-2: green, 3-4: yellow, 5+: red)
- **Issues:** Badges for orphan, low-inbound, errors
- **Actions:** View detail button

**Features:**
- Column sorting (click header)
- Column filtering (dropdown under each header)
- Pagination (50/100/200 per page)
- Export filtered view as CSV
- Multi-select rows for bulk operations

**Tab 3: Issues & Insights** ⚠️

**Purpose:** Automated problem detection with explanations

**Issue Categories** (shadcn Accordion, each section expandable):

1. **Orphan Pages** (High Priority)
   - Count badge
   - List of URLs
   - Explanation: "These pages have 0 inbound links and may not be discoverable"
   - Action: "Review and add links to these pages"

2. **Low Inbound Pages** (Medium Priority)
   - Threshold: < 2 inbound links
   - List with current inbound count
   - Suggested: "Consider linking to these pages from relevant content"

3. **Deep Pages** (Medium Priority)
   - Pages at depth > configurable threshold (default 4)
   - Explanation: "Users need many clicks to reach these pages"
   - Action: "Move important pages closer to homepage"

4. **Hub Pages Overloaded** (Low Priority)
   - Pages with excessive outbound links (> 100)
   - Warning: "Too many links may dilute link equity"

5. **Link Silos Detected** (Advanced)
   - Groups of pages that only link to each other
   - Visualization: Mini-graph of the silo
   - Suggested: "Add cross-links to other sections"

6. **Crawl Errors** (Critical)
   - Full list from `metadata.errorDetails`
   - Columns: URL, Error message, Timestamp
   - Export error log button

7. **Link Equity Score** (Insight)
   - Calculated per page: `inbound / (outbound || 1)`
   - Shows which pages are "receiving" vs "distributing" link equity
   - Top 10 receivers and top 10 distributors

**Each Issue Card Includes:**
- Count badge
- Severity indicator (color-coded)
- Short explanation
- Expandable list of affected URLs
- "View in Graph" button (filters graph to show these nodes)


**Tab 4: Metadata & Diagnostics** 🔧

**Purpose:** Technical details about the crawl

**Sections:**
- **Crawl Summary**
  - Start/End time
  - Duration
  - Pages crawled vs. sitemap
  - Max depth reached
  - Average crawl speed (pages/min)

- **Error Analysis**
  - Total errors
  - Error breakdown by type (timeout, 404, 500, etc.)
  - Full error log table (sortable)

- **Performance Metrics**
  - Graph density (edges/nodes ratio)
  - Average shortest path length
  - Graph diameter (longest shortest path)
  - Clustering coefficient

---

### 3. Node Detail Panel (Slide-out Drawer)

**Triggered by:** Clicking a node in graph or row in table

**Components:**
- **Header**
  - Full URL (with copy button)
  - Breadcrumb (depth indicator)
  - Close button (X)

- **Stats Section** (Cards)
  - Inbound links count (large number)
  - Outbound links count
  - Depth level
  - Link equity score

- **Inbound Links** (Collapsible list)
  - List of all pages linking TO this page
  - Each item: URL + click to jump to that node

- **Outbound Links** (Collapsible list)
  - List of all pages this page links TO
  - Each item: URL + click to jump to that node

- **Issues** (if any)
  - List of detected problems for this specific page

- **Actions**
  - "Filter graph to connections" (show ego network)
  - "View in table"
  - "Copy URL"

---

## 🔄 User Flows

### Primary Flow: Analyze a Website

```
1. User lands on homepage
2. Enters URL (e.g., "https://example.com") in prominent input field
3. Optionally expands "Advanced Options" to adjust:
   - Maximum pages to crawl
   - Maximum depth
   - Timeout settings
4. Clicks "Start Analysis" button
   → Show loading state
   → Redirect to /analysis/:jobId
5. Analysis page shows "Analyzing..." status with:
   - Animated progress indicator
   - Live status: "Processing page 45/500..."
   - Estimated time remaining
   - Cancel button
6. When analysis completes:
   → Animate status badge to "Complete ✓"
   → Render full dashboard with all tabs
   → Show celebration micro-interaction
7. User explores visualization:
   - Zooms into graph to see specific clusters
   - Pans around to explore structure
   - Clicks individual nodes to see details in slide-out panel
   - Highlights orphan pages using filter controls
   - Switches to Table View to sort by inbound count
   - Goes to Issues tab to review detected problems
   - Exports filtered data as CSV for reporting
```

**Key UX Principles:**
- Progressive disclosure (hide advanced options by default)
- Clear visual feedback at each step
- Non-blocking UI (can explore while final processing completes)
- Persistent state (can refresh page without losing analysis)

### Secondary Flow: Load Previous Analysis

```
1. User navigates to /analysis/:jobId (from bookmark, shared link, or history)
2. Show loading skeleton matching dashboard structure
3. Fetch and render completed analysis
4. Optionally show "Last updated: X hours ago" if from cache
```

*See [FRONTEND_API_REFERENCE.md](FRONTEND_API_REFERENCE.md) for API integration details (polling, caching, error handling).*

---

## 🛠️ Technical Implementation Guidance

### Tech Stack
- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite
- **Routing:** React Router v6
- **State Management:** 
  - React Query (for API calls + caching)
  - Zustand or Context (for UI state like filters)
- **UI Components:** shadcn/ui (install needed components)
- **Visualization:** 
  - **Primary:** D3.js v7+ (force-directed graph, zoom, pan)
  - **Alternative:** React-Flow (for simpler implementation)
- **D3 Modules Needed:**
  - `d3-force` (force simulation)
  - `d3-selection` (DOM manipulation)
  - `d3-zoom` (zoom and pan)
  - `d3-drag` (node dragging)
  - `d3-scale` (color and size scales)
  - `@types/d3` (TypeScript definitions)
- **Styling:** Tailwind CSS (comes with shadcn)
- **Charts:** Recharts (for bar charts in table view)
- **Icons:** Lucide React (comes with shadcn)

*For complete API integration (endpoints, request/response formats, error handling), see [API_DOC.md](API_DOC.md) and [FRONTEND_API_REFERENCE.md](FRONTEND_API_REFERENCE.md).*

### Key UI Features to Implement

#### 1. Real-time Status Updates

Display live progress as job processes:
- **Animated spinner** when `state === 'waiting'`
- **Progress bar** with percentage when `state === 'active'`
- **Success animation** when transitioning to `completed`
- **Error state** with retry option when `failed`
- **Status text:** "Processing page 145/487..." updated in real-time

*See [FRONTEND_API_REFERENCE.md](FRONTEND_API_REFERENCE.md) for polling implementation with React Query.*

#### 2. Efficient Graph Rendering with D3.js

**For large graphs (500+ nodes), implement these performance optimizations:**

**Canvas vs SVG Rendering:**
- **SVG:** Use for graphs with <500 nodes (easier to debug, better for interactions)
- **Canvas:** Use for graphs with 500+ nodes (much better performance, requires manual hit detection)

**Force Simulation Tuning:**
```typescript
const simulation = d3.forceSimulation(nodes)
  .force('charge', d3.forceManyBody().strength(-30))
  .force('link', d3.forceLink(links).distance(50))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .alphaDecay(0.05) // Faster convergence
  .velocityDecay(0.4);

// Stop simulation after it settles to save CPU
simulation.on('end', () => console.log('Layout complete'));
```

**Advanced Performance Techniques:**
- **Node Clustering:** Group nodes by URL path when graph exceeds 1000 nodes
  - Example: All `/blog/*` pages become a single "Blog Cluster" node
  - Click to expand cluster and show individual pages
- **Viewport Culling:** Only render nodes/edges visible in current zoom viewport
  - Dramatically improves performance for very large graphs
- **Web Workers:** Offload force calculation to background thread
  - Main thread remains responsive for UI interactions
  - Worker sends position updates back to main thread for rendering
- **Quadtree Optimization:** Use `d3-quadtree` for efficient collision detection
- **Lazy Edge Rendering:** Only draw edges connected to currently visible nodes
- **Level of Detail (LOD):** Hide node labels when zoomed out, show when zoomed in

*See D3.js implementation examples below for complete code samples.*

#### 3. Filter State Management

**UI State Interface:**
```typescript
interface FilterState {
  searchQuery: string;          // Text search for URLs
  minInbound: number;            // Hide nodes below threshold
  maxDepth: number;              // Hide deep pages
  hideSelfLinks: boolean;        // Toggle self-referential links
  showOnlyIssues: boolean;       // Show only orphans/errors
  highlightTypes: Set<'orphan' | 'lowInbound' | 'deep' | 'hub'>;
  groupBy: 'none' | 'path' | 'depth' | 'subdomain';
}
```

**Visual Feedback:**
- Apply filters to both graph and table views simultaneously
- Show count badges: "Showing 42 of 487 pages"
- Animate node transitions when filters change (fade in/out)
- Disable incompatible filter combinations with tooltip explanations

#### 4. URL Shareability

**Encode all filter state in URL query parameters:**
```
/analysis/abc123?view=graph&minInbound=2&highlight=orphan,deep&search=blog
```

**Benefits:**
- Users can bookmark specific filtered views
- Share exact analysis state with team members
- Browser back/forward navigation works intuitively

**Implementation:** Use React Router's `useSearchParams` to sync UI state with URL.

#### 5. Export Functionality

**Visual Export Options:**

**CSV Export:**
- Button in table view header
- Respects current filters and sorting
- Includes: URL, Inbound Count, Outbound Count, Depth, Issues
- Shows download progress for large exports

**JSON Export:**
- Full analysis data for programmatic use
- Include complete `InternalLinkAnalysisResponse` structure
- Option to pretty-print formatting

**Graph Image Export:**
- "Download as PNG" button in graph controls
- Capture current viewport or entire graph (user choice)
- Include legend and metadata overlay

**Example UI:**
```tsx
<DropdownMenu>
  <DropdownMenuTrigger>Export</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={exportCSV}>
      Table as CSV
    </DropdownMenuItem>
    <DropdownMenuItem onClick={exportJSON}>
      Full Data (JSON)
    </DropdownMenuItem>
    <DropdownMenuItem onClick={exportPNG}>
      Graph as Image
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

#### 6. Performance Optimizations

**React-specific optimizations:**
- **Memoization:** Use `useMemo` for expensive calculations (filtering thousands of nodes, sorting)
- **Virtualization:** Implement virtual scrolling for table view using `@tanstack/react-virtual`
  - Only render visible rows (critical for 1000+ page tables)
- **Debouncing:** Debounce search input (300ms) to avoid re-rendering on every keystroke
- **Code Splitting:** Lazy load D3.js and visualization components
  ```tsx
  const GraphView = lazy(() => import('./components/GraphView'));
  ```
- **React Query Caching:** Cache API responses with appropriate `staleTime` (5 minutes for completed jobs)

**Render Performance Targets:**
- Initial dashboard paint: <1 second
- Filter application: <200ms
- Graph zoom/pan: 60 FPS
- Table sort: <100ms

---

## � D3.js Advanced Features

### Layout Algorithms

**1. Force-Directed Layout** (Default - Best for exploring connections)
```typescript
d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links).distance(50))
  .force('charge', d3.forceManyBody().strength(-100))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(nodeRadius));
```

**2. Hierarchical Layout** (Best for showing site structure from homepage)
```typescript
import { stratify, tree } from 'd3-hierarchy';

const root = stratify()
  .id(d => d.url)
  .parentId(d => findParent(d.url))(nodes);

const treeLayout = tree().size([width, height]);
treeLayout(root);
```

**3. Radial Layout** (Best for showing hub pages)
```typescript
const angleScale = d3.scaleLinear()
  .domain([0, nodes.length])
  .range([0, 2 * Math.PI]);

nodes.forEach((node, i) => {
  const angle = angleScale(i);
  const radius = node.inbound * 10; // Distance from center
  node.x = centerX + radius * Math.cos(angle);
  node.y = centerY + radius * Math.sin(angle);
});
```

### Interactive Features

**Zoom & Pan:**
```typescript
const zoom = d3.zoom()
  .scaleExtent([0.1, 10])
  .on('zoom', (event) => {
    svg.selectAll('g').attr('transform', event.transform);
  });

svg.call(zoom);
```

**Highlight Connected Nodes:**
```typescript
function highlightConnections(nodeUrl: string) {
  // Get connected nodes
  const connected = new Set<string>();
  links.forEach(link => {
    if (link.source.id === nodeUrl) connected.add(link.target.id);
    if (link.target.id === nodeUrl) connected.add(link.source.id);
  });
  
  // Fade non-connected nodes
  node.style('opacity', d => 
    d.id === nodeUrl || connected.has(d.id) ? 1 : 0.1
  );
  
  // Highlight connected links
  link.style('opacity', d =>
    d.source.id === nodeUrl || d.target.id === nodeUrl ? 1 : 0.1
  );
}
```

**Search & Filter:**
```typescript
function filterNodes(searchTerm: string) {
  const filtered = nodes.filter(n => n.url.includes(searchTerm));
  const filteredIds = new Set(filtered.map(n => n.id));
  
  node.style('display', d => filteredIds.has(d.id) ? 'block' : 'none');
  link.style('display', d => 
    filteredIds.has(d.source.id) && filteredIds.has(d.target.id) 
      ? 'block' : 'none'
  );
  
  // Restart simulation with filtered nodes
  simulation.nodes(filtered);
  simulation.alpha(1).restart();
}
```

### Performance Optimizations

**1. Level of Detail (LOD):**
```typescript
zoom.on('zoom', (event) => {
  const scale = event.transform.k;
  
  // Show labels only when zoomed in
  labels.style('display', scale > 1.5 ? 'block' : 'none');
  
  // Simplify edges when zoomed out
  if (scale < 0.5) {
    link.attr('stroke-width', 0.5);
  } else {
    link.attr('stroke-width', 1);
  }
});
```

**2. Viewport Culling:**
```typescript
function isInViewport(node: GraphNode, transform: d3.ZoomTransform) {
  const x = node.x! * transform.k + transform.x;
  const y = node.y! * transform.k + transform.y;
  
  return x >= 0 && x <= width && y >= 0 && y <= height;
}

simulation.on('tick', () => {
  const visibleNodes = nodes.filter(n => isInViewport(n, currentTransform));
  // Only render visible nodes
});
```

**3. Clustering for Large Graphs:**
```typescript
function clusterNodes(nodes: GraphNode[], threshold = 1000) {
  if (nodes.length < threshold) return nodes;
  
  // Group by URL path
  const clusters = d3.group(nodes, d => {
    const url = new URL(d.url);
    return url.pathname.split('/')[1] || 'root';
  });
  
  // Create cluster nodes
  return Array.from(clusters, ([key, members]) => ({
    id: `cluster-${key}`,
    url: key,
    inbound: d3.sum(members, m => m.inbound),
    outbound: d3.sum(members, m => m.outbound),
    members: members.length,
    isCluster: true,
  }));
}
```

### D3.js Package Installation

```bash
npm install d3
npm install --save-dev @types/d3

# Or install specific modules for smaller bundle size:
npm install d3-selection d3-force d3-zoom d3-drag d3-scale d3-hierarchy
```

---

## �🎯 Problem Detection Algorithms (Frontend)

While the backend provides core data, implement these client-side:

### 1. Link Silos Detection

```typescript
function detectSilos(linkGraph: LinkMap): string[][] {
  // Use Tarjan's algorithm to find strongly connected components
  // Return groups of URLs that only link to each other
}
```

### 2. Link Equity Score

```typescript
function calculateLinkEquity(
  url: string,
  inbound: number,
  outbound: number
): number {
  return inbound / Math.max(outbound, 1);
}
```

### 3. Depth Calculation

```typescript
function calculateDepth(url: string, linkGraph: LinkMap): number {
  // BFS from homepage to this URL
  // Return shortest path length
}
```

### 4. Hub Pages

```typescript
function findHubPages(
  inboundCount: InboundLinksCount,
  threshold = 20
): string[] {
  return Object.entries(inboundCount)
    .filter(([_, count]) => count >= threshold)
    .map(([url]) => url);
}
```

---

## 📱 Responsive Design

### Desktop (1280px+)
- Full three-panel layout
- Graph takes 70% width
- Sidebar 280px fixed

### Tablet (768px - 1279px)
- Collapsible sidebar (hamburger menu)
- Graph full width when sidebar closed
- Table view recommended

### Mobile (<768px)
- Hide graph view (performance)
- Default to Table View tab
- Summary stats in vertical cards
- Simplified filters in modal sheet

---

## ♿ Accessibility

- **ARIA labels:** All interactive elements
- **Keyboard navigation:** 
  - Tab through filters
  - Arrow keys to navigate graph nodes
  - Enter to select node
- **Focus indicators:** Clear visual focus states
- **Screen reader support:** 
  - Announce filter changes
  - Describe graph structure in alt text
- **Color contrast:** WCAG AA minimum (4.5:1 for text)
- **Reduced motion:** Respect `prefers-reduced-motion` (disable animations)

---

## 🚀 Deliverables

1. **Component Architecture**
   - `/components/ui/*` → shadcn components
   - `/components/dashboard/Header.tsx`
   - `/components/dashboard/Sidebar.tsx`
   - `/components/graph/GraphView.tsx`
   - `/components/table/DataTable.tsx`
   - `/components/issues/IssuesList.tsx`
   - `/components/detail/NodeDetailPanel.tsx`

2. **Pages**
   - `/pages/Home.tsx` → Job submission
   - `/pages/Analysis.tsx` → Main dashboard

3. **Hooks**
   - `useJobStatus(jobId)` → Poll job status
   - `useAnalysisData(jobId)` → Fetch results
   - `useFilters()` → Filter state management
   - `useGraphLayout(data, filters)` → Compute graph layout
   - `useD3Graph(data, containerRef)` → D3.js graph initialization and updates

4. **Utils**
   - `api.ts` → API client functions
   - `graph.ts` → Graph algorithms (silos, depth, etc.)
   - `d3-utils.ts` → D3.js helper functions (scales, layouts, interactions)
   - `export.ts` → CSV/JSON export functions
   - `url.ts` → URL parsing and display helpers

5. **Types**
   - `types/api.ts` → Match backend interfaces
   - `types/graph.ts` → Graph-specific types

---

## 🎨 Visual Examples

### Graph Node States

```
┌─────────────────┐
│  /homepage      │  ← Normal node (medium size, default color)
│  🔗 25 inbound  │
└─────────────────┘

┌───────────────────────┐
│  /blog/post-123       │  ← Orphan (small, warning color, badge)
│  ⚠️ 0 inbound         │
└───────────────────────┘

┌─────────────────────────────┐
│  /products                  │  ← Hub (large, primary color)
│  🔗 150 inbound             │
└─────────────────────────────┘
```

### Summary Cards Example

```
┌────────────────────┐  ┌────────────────────┐
│  📄 Total Pages    │  │  🔗 Total Links    │
│      487           │  │      3,241         │
└────────────────────┘  └────────────────────┘

┌────────────────────┐  ┌────────────────────┐
│  📊 Avg Inbound    │  │  ⚠️  Orphans       │
│      6.7           │  │      18            │
└────────────────────┘  └────────────────────┘
```

---

## 🧪 Testing Considerations

- **Unit Tests:** Filter logic, graph algorithms, export functions, D3 scale calculations
- **Integration Tests:** API integration, React Query caching
- **E2E Tests:** Full user flow with Playwright/Cypress
- **Performance Tests:** 
  - Render 1000-node graph under 2 seconds
  - Force simulation convergence time
  - Canvas vs SVG rendering benchmarks
- **Accessibility Tests:** axe-core automated checks
- **D3.js Component Testing:**
  ```typescript
  // Test D3 graph renders correctly
  it('renders all nodes and links', () => {
    render(<GraphView data={mockData} />);
    
    // Wait for D3 to render
    await waitFor(() => {
      const svg = screen.getByRole('img'); // SVG has implicit img role
      const circles = within(svg).getAllByRole('graphics-symbol');
      expect(circles).toHaveLength(mockData.nodes.length);
    });
  });
  
  // Test interactions
  it('highlights connected nodes on click', async () => {
    render(<GraphView data={mockData} onNodeClick={mockHandler} />);
    const node = screen.getByTestId('node-homepage');
    
    fireEvent.click(node);
    expect(mockHandler).toHaveBeenCalledWith('/homepage');
  });
  ```

---

## 🔮 Future Enhancements (Optional)

- **Comparison Mode:** Compare two analyses side-by-side
- **Historical Tracking:** Track changes over time (requires backend)
- **AI Suggestions:** Use LLM to suggest link improvements
- **PDF Reports:** Generate printable reports
- **Collaboration:** Share analyses with team (requires auth)
- **Annotations:** Let users add notes to specific pages
- **Alerts:** Email notifications when issues detected

---

## 📚 Component Examples

### D3.js Graph Component (React + TypeScript)

```tsx
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { InternalLinkAnalysisResponse } from '@/types/api';

interface GraphViewProps {
  data: InternalLinkAnalysisResponse;
  filters: FilterState;
  onNodeClick: (url: string) => void;
}

interface GraphNode {
  id: string;          // URL
  url: string;
  inbound: number;
  outbound: number;
  x?: number;
  y?: number;
  fx?: number | null;  // Fixed position
  fy?: number | null;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

export function GraphView({ data, filters, onNodeClick }: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  
  useEffect(() => {
    if (!svgRef.current || !data) return;
    
    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Dimensions
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    // Transform data to D3 format
    const nodes: GraphNode[] = Object.keys(data.linkGraph).map(url => ({
      id: url,
      url,
      inbound: data.inboundLinksCount[url] || 0,
      outbound: data.linkGraph[url].length,
    }));
    
    const links: GraphLink[] = [];
    Object.entries(data.linkGraph).forEach(([source, targets]) => {
      targets.forEach(target => {
        links.push({ source, target });
      });
    });
    
    // Scales for node size and color
    const sizeScale = d3.scaleSqrt()
      .domain([0, d3.max(nodes, d => d.inbound) || 1])
      .range([4, 20]);
    
    const colorScale = d3.scaleSequential()
      .domain([0, d3.max(nodes, d => d.inbound) || 1])
      .interpolator(d3.interpolateBlues);
    
    // Create SVG container
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);
    
    // Add zoom behavior
    const g = svg.append('g');
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });
    svg.call(zoom);
    
    // Create arrow marker for directed edges
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#999');
    
    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1)
      .attr('marker-end', 'url(#arrowhead)');
    
    // Create nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => sizeScale(d.inbound))
      .attr('fill', d => {
        if (data.orphanPages.includes(d.url)) return '#ef4444'; // Red for orphans
        return colorScale(d.inbound);
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d.url);
      })
      .call(d3.drag<SVGCircleElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);
    
    // Add tooltips
    node.append('title')
      .text(d => `${d.url}\nInbound: ${d.inbound}\nOutbound: ${d.outbound}`);
    
    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(50))
      .force('charge', d3.forceManyBody().strength(-100))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => sizeScale(d.inbound) + 2));
    
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);
      
      node
        .attr('cx', d => d.x!)
        .attr('cy', d => d.y!);
    });
    
    simulationRef.current = simulation;
    
    // Drag handlers
    function dragstarted(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event: any, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [data, filters, onNodeClick]);
  
  return (
    <div className="relative w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
      
      {/* Controls overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button 
          className="p-2 bg-white rounded shadow hover:bg-gray-50"
          onClick={() => {
            const svg = d3.select(svgRef.current!);
            svg.transition().call(
              // @ts-ignore
              d3.zoom().transform,
              d3.zoomIdentity
            );
          }}
        >
          Reset Zoom
        </button>
      </div>
    </div>
  );
}
```

### Alternative: Canvas-based D3 for Large Graphs

```tsx
// For 1000+ nodes, use Canvas instead of SVG
export function CanvasGraphView({ data, onNodeClick }: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;
    
    // Transform data...
    const nodes: GraphNode[] = /* ... */;
    const links: GraphLink[] = /* ... */;
    
    // Force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-30))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .on('tick', ticked);
    
    function ticked() {
      context.clearRect(0, 0, width, height);
      
      // Draw links
      context.beginPath();
      links.forEach(d => {
        context.moveTo((d.source as GraphNode).x!, (d.source as GraphNode).y!);
        context.lineTo((d.target as GraphNode).x!, (d.target as GraphNode).y!);
      });
      context.strokeStyle = '#999';
      context.stroke();
      
      // Draw nodes
      nodes.forEach(d => {
        context.beginPath();
        context.arc(d.x!, d.y!, Math.sqrt(d.inbound) * 2, 0, 2 * Math.PI);
        context.fillStyle = d.inbound === 0 ? '#ef4444' : '#3b82f6';
        context.fill();
        context.strokeStyle = '#fff';
        context.stroke();
      });
    }
    
    return () => simulation.stop();
  }, [data]);
  
  return <canvas ref={canvasRef} width={1200} height={800} />;
}
```

### Job Submission Form (shadcn components)

```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Collapsible } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";

function JobSubmissionForm() {
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(500);
  const [maxDepth, setMaxDepth] = useState(5);
  
  // ... submit logic
  
  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <div className="space-y-4">
        <div>
          <Label htmlFor="url">Website URL</Label>
          <Input 
            id="url"
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        
        <Collapsible>
          <CollapsibleTrigger>Advanced Options</CollapsibleTrigger>
          <CollapsibleContent className="space-y-4">
            <div>
              <Label>Max Pages: {maxPages}</Label>
              <Slider 
                value={[maxPages]}
                onValueChange={([v]) => setMaxPages(v)}
                min={10}
                max={1000}
              />
            </div>
            {/* ... more options */}
          </CollapsibleContent>
        </Collapsible>
        
        <Button onClick={handleSubmit} className="w-full">
          Start Analysis
        </Button>
      </div>
    </Card>
  );
}
```

---

## ✅ Definition of Done

A complete implementation should:

- ✅ Connect to all backend endpoints correctly (see [API_DOC.md](API_DOC.md))
- ✅ Handle job lifecycle (waiting → active → completed/failed)
- ✅ Render graphs with 500+ nodes smoothly (60 FPS)
- ✅ Display all data from analysis response
- ✅ Implement all 4 tabs (Graph, Table, Issues, Metadata)
- ✅ Support filtering and highlighting
- ✅ Export data as CSV and JSON
- ✅ Work on desktop, tablet, and mobile (responsive)
- ✅ Meet WCAG AA accessibility standards
- ✅ Include loading states, error handling, and empty states
- ✅ Document all components and utilities
- ✅ Pass all tests (unit + E2E)

*See [API_DOC.md](API_DOC.md) for complete API specification and [FRONTEND_API_REFERENCE.md](FRONTEND_API_REFERENCE.md) for integration examples.*

---

## 🎓 Developer Notes

- **Start Simple:** Build one tab at a time, get feedback early
- **Mock Data First:** Create mock API responses for faster iteration (see data structures in [API_DOC.md](API_DOC.md))
- **Component Library:** Install only needed shadcn components (keeps bundle small)
- **Graph Choice:** Start with D3.js SVG for <500 nodes; migrate to Canvas for larger graphs
- **D3 Learning Path:** Start with basic force simulation, then add zoom/drag/tooltips
- **State Management:** React Query handles server state brilliantly—lean on it (see [FRONTEND_API_REFERENCE.md](FRONTEND_API_REFERENCE.md))
- **Performance:** Profile with React DevTools before optimizing
- **Design System:** Use Tailwind's design tokens for consistency
- **Error Handling:** Show helpful messages, not generic "Something went wrong"
- **D3 + React:** Use `useEffect` for D3 code, `useRef` for DOM elements, avoid mixing D3 and React renders
- **API Integration:** All endpoints and data structures documented in [API_DOC.md](API_DOC.md)

---

**This frontend should feel like a professional analytics dashboard—data-dense but not cluttered, powerful but intuitive. Every visualization choice should serve the goal: helping users understand and improve their website's link structure.**

---

## 📖 D3.js Resources & Best Practices

### Essential Reading
- **Official D3.js Docs:** https://d3js.org/
- **Observable Tutorials:** https://observablehq.com/@d3/learn-d3 (Interactive examples)
- **Force-Directed Graphs:** https://d3js.org/d3-force
- **React + D3 Integration:** https://2019.wattenberger.com/blog/react-and-d3

### Best Practices for D3 + React

1. **Separation of Concerns:**
   - React owns the DOM structure (create elements)
   - D3 handles data transformations and calculations
   - Use D3 for SVG attributes, React for component logic

2. **Updates Pattern:**
   ```typescript
   useEffect(() => {
     const svg = d3.select(svgRef.current);
     
     // Join pattern: enter, update, exit
     svg.selectAll('circle')
       .data(nodes)
       .join(
         enter => enter.append('circle').attr('r', 0),
         update => update,
         exit => exit.remove()
       )
       .attr('cx', d => d.x)
       .attr('cy', d => d.y)
       .attr('r', d => d.radius);
   }, [nodes]);
   ```

3. **Memory Management:**
   - Always stop simulations in cleanup functions
   - Remove event listeners on unmount
   - Clear D3 selections when component unmounts

4. **TypeScript Integration:**
   - Use specific generics: `d3.forceSimulation<NodeType, LinkType>()`
   - Define interfaces for node/link data
   - Type D3 selections properly: `d3.Selection<SVGSVGElement, ...>`

### Performance Benchmarks to Target

- **Initial Render:** < 1 second for 500 nodes
- **Simulation Convergence:** < 3 seconds for 500 nodes
- **Zoom/Pan:** 60 FPS maintained
- **Node Click Response:** < 50ms
- **Filter Application:** < 200ms

### Common Pitfalls to Avoid

❌ **Don't:** Mix React and D3 for DOM manipulation
```typescript
// BAD: D3 and React both controlling same DOM
return <circle cx={x} cy={y} />; // React
d3.select('circle').attr('cx', newX); // D3 - CONFLICT!
```

✅ **Do:** Use refs and let D3 fully control that element
```typescript
// GOOD: D3 owns the SVG content
return <svg ref={svgRef} />;
useEffect(() => {
  d3.select(svgRef.current).append('circle')...
}, []);
```

❌ **Don't:** Re-create simulation on every render
```typescript
// BAD: Creates new simulation each time
useEffect(() => {
  const sim = d3.forceSimulation(nodes); // Loses state
});
```

✅ **Do:** Store simulation in ref
```typescript
// GOOD: Persists simulation between renders
const simRef = useRef<d3.Simulation>();
useEffect(() => {
  if (!simRef.current) {
    simRef.current = d3.forceSimulation(nodes);
  } else {
    simRef.current.nodes(nodes);
  }
});
```

❌ **Don't:** Use SVG for >1000 nodes without optimization

✅ **Do:** Switch to Canvas for large graphs, implement viewport culling

### Debugging Tips

```typescript
// Log force simulation progress
simulation.on('tick', () => {
  console.log('Alpha:', simulation.alpha()); // Should decrease to 0
});

// Visualize force vectors (helpful for tuning)
node.append('line')
  .attr('x1', 0)
  .attr('y1', 0)
  .attr('x2', d => d.vx * 10) // Velocity vector
  .attr('y2', d => d.vy * 10)
  .attr('stroke', 'red');
```

---

**With D3.js, you have complete control over every pixel. Use that power to create a visualization that genuinely helps users understand their link structure at a glance.**
