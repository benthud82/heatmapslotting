# Smart Placement AI: Implementation Specification

## Executive Summary

This document provides a complete implementation guide for adding AI-powered predictive element placement to the SlottingPRO heatmap designer. The feature analyzes existing layout patterns and pick data to suggest optimal positions for new elements, reducing design time and improving layout efficiency.

**Core Value Proposition**: Instead of manually determining where to place the next bay or flow rack, the system predicts likely placement locations based on spatial patterns, pick density hotspots, and learned layout conventions—offering clickable suggestions directly on the canvas.

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [System Architecture](#system-architecture)
3. [Data Models](#data-models)
4. [Python AI Service Implementation](#python-ai-service-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Node.js API Gateway Integration](#nodejs-api-gateway-integration)
7. [Docker Configuration](#docker-configuration)
8. [Production Deployment](#production-deployment)
9. [Testing](#testing)
10. [Phase 2 Enhancements](#phase-2-enhancements)

---

## Feature Overview

### User Experience Flow

1. User selects an element type from the sidebar (e.g., "Bay")
2. The AI analyzes the current layout and pick data
3. Semi-transparent "suggestion zones" appear on the canvas showing recommended placement locations
4. Each suggestion includes a confidence score and brief rationale
5. User can click a suggestion to instantly place the element there, or ignore suggestions and place manually
6. Suggestions update in real-time as the layout changes

### Key Capabilities

- **Pattern Recognition**: Detects rows, columns, grids, and spacing conventions from existing elements
- **Heatmap Integration**: Prioritizes suggestions near high-pick-density areas that need capacity expansion
- **Route Optimization**: Considers distance from start/stop points and cart parking locations
- **Element-Type Awareness**: Different suggestion logic for bays vs. flow racks vs. full pallets
- **Learning from Layouts**: Optional cross-warehouse pattern learning (anonymized) for improved suggestions

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        React Frontend                                │
│  ┌─────────────┐  ┌──────────────────┐  ┌────────────────────────┐  │
│  │  Sidebar    │  │  WarehouseCanvas │  │  SuggestionOverlay     │  │
│  │  (tool      │  │  (existing)      │  │  (new component)       │  │
│  │  selection) │  │                  │  │                        │  │
│  └──────┬──────┘  └────────┬─────────┘  └───────────┬────────────┘  │
│         │                  │                        │                │
│         └──────────────────┴────────────────────────┘                │
│                            │                                         │
│                   ┌────────▼────────┐                               │
│                   │ usePlacementAI  │  (React hook)                 │
│                   │ Hook            │                               │
│                   └────────┬────────┘                               │
└────────────────────────────┼────────────────────────────────────────┘
                             │ HTTP/REST
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Node.js API Gateway                              │
│                     (localhost:3001)                                 │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  POST /api/ai/placement-suggestions                         │    │
│  │  - Proxies to Python service                                │    │
│  │  - Handles authentication                                   │    │
│  │  - Rate limiting per tier                                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP (internal)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Python AI Service                                │
│                     (localhost:5000 / Dockerized)                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │ Pattern         │  │ Heatmap         │  │ Suggestion          │  │
│  │ Analyzer        │  │ Analyzer        │  │ Ranker              │  │
│  │                 │  │                 │  │                     │  │
│  │ - Grid detection│  │ - Hotspot ID    │  │ - Score combination │  │
│  │ - Spacing calc  │  │ - Capacity gaps │  │ - Deduplication     │  │
│  │ - Alignment     │  │ - Growth zones  │  │ - Top-N selection   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Frontend | React + TypeScript + Konva.js | Existing stack |
| API Gateway | Node.js + Express | Existing backend |
| AI Service | Python 3.11 + FastAPI | ML ecosystem, easy deployment |
| ML Libraries | scikit-learn, numpy, scipy | Production-ready, lightweight |
| Containerization | Docker | Consistent deployment |
| Production Hosting | Railway / Render / AWS ECS | Easy Python deployment |

---

## Data Models

### API Request: Placement Suggestion

```typescript
// Frontend sends this to request suggestions
interface PlacementSuggestionRequest {
  layout_id: string;
  element_type: ElementType;  // 'bay' | 'flow_rack' | 'full_pallet'
  
  // Current layout state
  elements: Array<{
    id: string;
    element_type: ElementType;
    x_coordinate: number;
    y_coordinate: number;
    width: number;
    height: number;
    rotation: number;
    label: string;
  }>;
  
  // Route markers for path optimization
  route_markers: Array<{
    id: string;
    marker_type: RouteMarkerType;
    x_coordinate: number;
    y_coordinate: number;
    sequence_order?: number;
  }>;
  
  // Pick data for heatmap-aware suggestions (optional)
  pick_data?: Record<string, number>;  // element_id -> pick_count
  
  // Canvas bounds
  canvas_width: number;
  canvas_height: number;
  
  // User preferences
  preferences?: {
    max_suggestions?: number;        // Default: 5
    min_confidence?: number;         // Default: 0.3 (0-1 scale)
    prioritize_heatmap?: boolean;    // Default: true
    grid_snap?: number;              // Default: 50 (pixels)
  };
}
```

### API Response: Placement Suggestions

```typescript
interface PlacementSuggestionResponse {
  suggestions: PlacementSuggestion[];
  analysis_metadata: {
    detected_patterns: PatternInfo[];
    heatmap_summary?: HeatmapSummary;
    processing_time_ms: number;
  };
}

interface PlacementSuggestion {
  id: string;                    // Unique ID for this suggestion
  x_coordinate: number;          // Suggested X position (top-left)
  y_coordinate: number;          // Suggested Y position (top-left)
  width: number;                 // Element width (from config)
  height: number;                // Element height (from config)
  rotation: number;              // Suggested rotation (0, 90, 180, 270)
  
  confidence: number;            // 0-1 confidence score
  rank: number;                  // 1 = best suggestion
  
  rationale: SuggestionRationale;
  
  // For UI rendering
  preview_style: 'primary' | 'secondary' | 'tertiary';
}

interface SuggestionRationale {
  primary_reason: string;        // Human-readable main reason
  factors: Array<{
    factor: string;              // e.g., "grid_alignment", "heatmap_proximity"
    contribution: number;        // 0-1 how much this factor contributed
    detail: string;              // e.g., "Aligns with existing row at Y=200"
  }>;
}

interface PatternInfo {
  pattern_type: 'row' | 'column' | 'grid' | 'cluster' | 'none';
  element_type: ElementType;
  anchor_elements: string[];     // IDs of elements forming this pattern
  spacing: { x: number; y: number };
  confidence: number;
}

interface HeatmapSummary {
  total_picks: number;
  hotspot_zones: Array<{
    center_x: number;
    center_y: number;
    radius: number;
    pick_density: number;
  }>;
  suggested_expansion_zones: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    reason: string;
  }>;
}
```

---

## Python AI Service Implementation

### Project Structure

```
smart-placement-service/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py           # API endpoints
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py           # Configuration management
│   │   └── models.py           # Pydantic models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── pattern_analyzer.py # Pattern detection logic
│   │   ├── heatmap_analyzer.py # Pick data analysis
│   │   ├── suggestion_engine.py # Main suggestion generation
│   │   └── scoring.py          # Confidence scoring
│   └── ml/
│       ├── __init__.py
│       ├── feature_extractor.py # Feature engineering
│       └── predictor.py        # ML model (Phase 2)
├── tests/
│   ├── __init__.py
│   ├── test_pattern_analyzer.py
│   ├── test_suggestion_engine.py
│   └── fixtures/
│       └── sample_layouts.json
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── pyproject.toml
└── README.md
```

### File: `app/main.py`

```python
"""
Smart Placement AI Service
Provides intelligent element placement suggestions for warehouse layout design.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.api.routes import router
from app.core.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for the FastAPI application."""
    logger.info("Starting Smart Placement AI Service...")
    logger.info(f"Environment: {settings.environment}")
    yield
    logger.info("Shutting down Smart Placement AI Service...")


app = FastAPI(
    title="Smart Placement AI Service",
    description="AI-powered placement suggestions for warehouse layout design",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """Health check endpoint for container orchestration."""
    return {"status": "healthy", "service": "smart-placement-ai"}
```

### File: `app/core/config.py`

```python
"""
Configuration management for the Smart Placement AI Service.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Environment
    environment: str = "development"
    debug: bool = False
    
    # Server
    host: str = "0.0.0.0"
    port: int = 5000
    
    # CORS - Update with your production domains
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
    ]
    
    # AI Settings
    max_suggestions: int = 5
    min_confidence_threshold: float = 0.3
    default_grid_snap: int = 50
    
    # Pattern Detection Thresholds
    pattern_min_elements: int = 2
    pattern_spacing_tolerance: float = 0.15
    pattern_alignment_tolerance: int = 10
    
    # Heatmap Analysis
    heatmap_hotspot_percentile: float = 0.75
    heatmap_expansion_buffer: int = 100
    
    # Rate Limiting
    rate_limit_free: int = 10
    rate_limit_pro: int = 60
    rate_limit_enterprise: int = 300
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
```

### File: `app/core/models.py`

```python
"""
Pydantic models for request/response validation and serialization.
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Literal
from enum import Enum


class ElementType(str, Enum):
    BAY = "bay"
    FLOW_RACK = "flow_rack"
    FULL_PALLET = "full_pallet"
    TEXT = "text"
    LINE = "line"
    ARROW = "arrow"


class RouteMarkerType(str, Enum):
    START_POINT = "start_point"
    STOP_POINT = "stop_point"
    CART_PARKING = "cart_parking"


class ElementData(BaseModel):
    id: str
    element_type: ElementType
    x_coordinate: float
    y_coordinate: float
    width: float
    height: float
    rotation: float = 0
    label: str = ""


class RouteMarkerData(BaseModel):
    id: str
    marker_type: RouteMarkerType
    x_coordinate: float
    y_coordinate: float
    sequence_order: Optional[int] = None


class PlacementPreferences(BaseModel):
    max_suggestions: int = Field(default=5, ge=1, le=10)
    min_confidence: float = Field(default=0.3, ge=0, le=1)
    prioritize_heatmap: bool = True
    grid_snap: int = Field(default=50, ge=10, le=100)


class PlacementSuggestionRequest(BaseModel):
    layout_id: str
    element_type: ElementType
    elements: List[ElementData]
    route_markers: List[RouteMarkerData] = []
    pick_data: Optional[Dict[str, int]] = None
    canvas_width: int = Field(default=1200, ge=100)
    canvas_height: int = Field(default=800, ge=100)
    preferences: PlacementPreferences = PlacementPreferences()


class SuggestionFactor(BaseModel):
    factor: str
    contribution: float = Field(ge=0, le=1)
    detail: str


class SuggestionRationale(BaseModel):
    primary_reason: str
    factors: List[SuggestionFactor]


class PlacementSuggestion(BaseModel):
    id: str
    x_coordinate: float
    y_coordinate: float
    width: float
    height: float
    rotation: float = 0
    confidence: float = Field(ge=0, le=1)
    rank: int = Field(ge=1)
    rationale: SuggestionRationale
    preview_style: Literal["primary", "secondary", "tertiary"] = "secondary"


class PatternInfo(BaseModel):
    pattern_type: Literal["row", "column", "grid", "cluster", "none"]
    element_type: ElementType
    anchor_elements: List[str]
    spacing: Dict[str, float]
    confidence: float = Field(ge=0, le=1)


class HotspotZone(BaseModel):
    center_x: float
    center_y: float
    radius: float
    pick_density: float


class ExpansionZone(BaseModel):
    x: float
    y: float
    width: float
    height: float
    reason: str


class HeatmapSummary(BaseModel):
    total_picks: int
    hotspot_zones: List[HotspotZone]
    suggested_expansion_zones: List[ExpansionZone]


class AnalysisMetadata(BaseModel):
    detected_patterns: List[PatternInfo]
    heatmap_summary: Optional[HeatmapSummary] = None
    processing_time_ms: float


class PlacementSuggestionResponse(BaseModel):
    suggestions: List[PlacementSuggestion]
    analysis_metadata: AnalysisMetadata
```

### File: `app/api/routes.py`

```python
"""
API routes for the Smart Placement AI Service.
"""

from fastapi import APIRouter, HTTPException
import time
import logging

from app.core.models import PlacementSuggestionRequest, PlacementSuggestionResponse
from app.services.suggestion_engine import SuggestionEngine

logger = logging.getLogger(__name__)
router = APIRouter()
suggestion_engine = SuggestionEngine()


@router.post("/suggestions", response_model=PlacementSuggestionResponse)
async def get_placement_suggestions(request: PlacementSuggestionRequest) -> PlacementSuggestionResponse:
    """Generate intelligent placement suggestions for a new element."""
    start_time = time.time()
    
    try:
        logger.info(
            f"Generating suggestions for {request.element_type} "
            f"in layout {request.layout_id} with {len(request.elements)} elements"
        )
        
        response = suggestion_engine.generate_suggestions(request)
        
        processing_time = (time.time() - start_time) * 1000
        logger.info(f"Generated {len(response.suggestions)} suggestions in {processing_time:.2f}ms")
        
        return response
        
    except ValueError as e:
        logger.warning(f"Invalid request: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating suggestions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate placement suggestions")
```

### File: `app/services/pattern_analyzer.py`

```python
"""
Pattern Analyzer: Detects spatial patterns in warehouse layouts.
"""

from typing import List, Dict, Tuple, Optional
from collections import defaultdict
import numpy as np
from dataclasses import dataclass

from app.core.models import ElementData, ElementType, PatternInfo
from app.core.config import settings


@dataclass
class ElementPosition:
    """Simplified position data for pattern analysis."""
    id: str
    element_type: ElementType
    x: float
    y: float
    width: float
    height: float
    center_x: float
    center_y: float
    rotation: float


class PatternAnalyzer:
    """Analyzes warehouse layouts to detect spatial patterns."""
    
    def __init__(self):
        self.min_elements = settings.pattern_min_elements
        self.spacing_tolerance = settings.pattern_spacing_tolerance
        self.alignment_tolerance = settings.pattern_alignment_tolerance
    
    def analyze(self, elements: List[ElementData]) -> List[PatternInfo]:
        """Analyze layout and detect all patterns."""
        if len(elements) < self.min_elements:
            return []
        
        patterns = []
        positions = self._prepare_positions(elements)
        by_type = self._group_by_type(positions)
        
        for element_type, type_positions in by_type.items():
            if len(type_positions) < self.min_elements:
                continue
            
            # Detect row patterns (horizontal alignment)
            row_patterns = self._detect_rows(type_positions, element_type)
            patterns.extend(row_patterns)
            
            # Detect column patterns (vertical alignment)
            col_patterns = self._detect_columns(type_positions, element_type)
            patterns.extend(col_patterns)
            
            # Detect grid patterns (2D arrangement)
            grid_patterns = self._detect_grids(row_patterns, col_patterns, type_positions, element_type)
            patterns.extend(grid_patterns)
        
        return self._deduplicate_patterns(patterns)
    
    def _prepare_positions(self, elements: List[ElementData]) -> List[ElementPosition]:
        """Convert ElementData to simplified position objects."""
        return [
            ElementPosition(
                id=e.id,
                element_type=e.element_type,
                x=e.x_coordinate,
                y=e.y_coordinate,
                width=e.width,
                height=e.height,
                center_x=e.x_coordinate + e.width / 2,
                center_y=e.y_coordinate + e.height / 2,
                rotation=e.rotation
            )
            for e in elements
        ]
    
    def _group_by_type(self, positions: List[ElementPosition]) -> Dict[ElementType, List[ElementPosition]]:
        """Group positions by element type."""
        groups = defaultdict(list)
        for pos in positions:
            groups[pos.element_type].append(pos)
        return dict(groups)
    
    def _detect_rows(self, positions: List[ElementPosition], element_type: ElementType) -> List[PatternInfo]:
        """Detect horizontal row patterns."""
        if len(positions) < 2:
            return []
        
        patterns = []
        sorted_by_y = sorted(positions, key=lambda p: p.center_y)
        
        # Group elements by Y coordinate
        current_row = [sorted_by_y[0]]
        rows = []
        
        for pos in sorted_by_y[1:]:
            if abs(pos.center_y - current_row[0].center_y) <= self.alignment_tolerance:
                current_row.append(pos)
            else:
                if len(current_row) >= 2:
                    rows.append(current_row)
                current_row = [pos]
        
        if len(current_row) >= 2:
            rows.append(current_row)
        
        # Analyze each row
        for row in rows:
            row_sorted = sorted(row, key=lambda p: p.center_x)
            
            # Calculate spacing between consecutive elements
            spacings = []
            for i in range(len(row_sorted) - 1):
                spacing = row_sorted[i + 1].center_x - row_sorted[i].center_x
                spacings.append(spacing)
            
            if not spacings:
                continue
            
            avg_spacing = np.mean(spacings)
            spacing_variance = np.std(spacings) / avg_spacing if avg_spacing > 0 else 1
            
            # Calculate confidence
            size_factor = min(1.0, len(row_sorted) / 5)
            consistency_factor = max(0, 1 - spacing_variance / self.spacing_tolerance)
            confidence = 0.5 * size_factor + 0.5 * consistency_factor
            
            if confidence >= 0.3:
                patterns.append(PatternInfo(
                    pattern_type="row",
                    element_type=element_type,
                    anchor_elements=[p.id for p in row_sorted],
                    spacing={"x": avg_spacing, "y": 0},
                    confidence=round(confidence, 2)
                ))
        
        return patterns
    
    def _detect_columns(self, positions: List[ElementPosition], element_type: ElementType) -> List[PatternInfo]:
        """Detect vertical column patterns."""
        if len(positions) < 2:
            return []
        
        patterns = []
        sorted_by_x = sorted(positions, key=lambda p: p.center_x)
        
        # Group elements by X coordinate
        current_col = [sorted_by_x[0]]
        columns = []
        
        for pos in sorted_by_x[1:]:
            if abs(pos.center_x - current_col[0].center_x) <= self.alignment_tolerance:
                current_col.append(pos)
            else:
                if len(current_col) >= 2:
                    columns.append(current_col)
                current_col = [pos]
        
        if len(current_col) >= 2:
            columns.append(current_col)
        
        # Analyze each column
        for col in columns:
            col_sorted = sorted(col, key=lambda p: p.center_y)
            
            spacings = []
            for i in range(len(col_sorted) - 1):
                spacing = col_sorted[i + 1].center_y - col_sorted[i].center_y
                spacings.append(spacing)
            
            if not spacings:
                continue
            
            avg_spacing = np.mean(spacings)
            spacing_variance = np.std(spacings) / avg_spacing if avg_spacing > 0 else 1
            
            size_factor = min(1.0, len(col_sorted) / 5)
            consistency_factor = max(0, 1 - spacing_variance / self.spacing_tolerance)
            confidence = 0.5 * size_factor + 0.5 * consistency_factor
            
            if confidence >= 0.3:
                patterns.append(PatternInfo(
                    pattern_type="column",
                    element_type=element_type,
                    anchor_elements=[p.id for p in col_sorted],
                    spacing={"x": 0, "y": avg_spacing},
                    confidence=round(confidence, 2)
                ))
        
        return patterns
    
    def _detect_grids(self, rows: List[PatternInfo], columns: List[PatternInfo],
                      positions: List[ElementPosition], element_type: ElementType) -> List[PatternInfo]:
        """Detect grid patterns from intersecting rows and columns."""
        if len(rows) < 2 or len(columns) < 2:
            return []
        
        patterns = []
        
        row_x_spacings = [r.spacing["x"] for r in rows if r.spacing["x"] > 0]
        col_y_spacings = [c.spacing["y"] for c in columns if c.spacing["y"] > 0]
        
        if not row_x_spacings or not col_y_spacings:
            return []
        
        avg_x_spacing = np.mean(row_x_spacings)
        avg_y_spacing = np.mean(col_y_spacings)
        
        x_variance = np.std(row_x_spacings) / avg_x_spacing if avg_x_spacing > 0 else 1
        y_variance = np.std(col_y_spacings) / avg_y_spacing if avg_y_spacing > 0 else 1
        
        if x_variance <= self.spacing_tolerance and y_variance <= self.spacing_tolerance:
            all_element_ids = set()
            for row in rows:
                all_element_ids.update(row.anchor_elements)
            for col in columns:
                all_element_ids.update(col.anchor_elements)
            
            total_elements = len(positions)
            coverage = len(all_element_ids) / total_elements if total_elements > 0 else 0
            consistency = 1 - (x_variance + y_variance) / 2
            confidence = 0.4 * coverage + 0.6 * consistency
            
            if confidence >= 0.4:
                patterns.append(PatternInfo(
                    pattern_type="grid",
                    element_type=element_type,
                    anchor_elements=list(all_element_ids),
                    spacing={"x": avg_x_spacing, "y": avg_y_spacing},
                    confidence=round(confidence, 2)
                ))
        
        return patterns
    
    def _deduplicate_patterns(self, patterns: List[PatternInfo]) -> List[PatternInfo]:
        """Remove redundant patterns."""
        if not patterns:
            return []
        
        patterns.sort(key=lambda p: p.confidence, reverse=True)
        
        # Deprioritize rows/columns that are part of a grid
        grids = [p for p in patterns if p.pattern_type == "grid"]
        
        if grids:
            grid_elements = set()
            for grid in grids:
                grid_elements.update(grid.anchor_elements)
            
            for pattern in patterns:
                if pattern.pattern_type in ("row", "column"):
                    overlap = set(pattern.anchor_elements) & grid_elements
                    if len(overlap) / len(pattern.anchor_elements) > 0.5:
                        pattern.confidence *= 0.5
        
        patterns.sort(key=lambda p: p.confidence, reverse=True)
        return patterns
    
    def get_next_positions_for_pattern(self, pattern: PatternInfo, positions: List[ElementPosition],
                                       element_width: float, element_height: float) -> List[Tuple[float, float]]:
        """Given a detected pattern, suggest the next logical positions."""
        suggestions = []
        
        pattern_positions = [p for p in positions if p.id in pattern.anchor_elements]
        
        if not pattern_positions:
            return suggestions
        
        if pattern.pattern_type == "row":
            # Extend row to the right
            rightmost = max(pattern_positions, key=lambda p: p.center_x)
            next_x = rightmost.center_x + pattern.spacing["x"] - element_width / 2
            next_y = rightmost.center_y - element_height / 2
            suggestions.append((next_x, next_y))
            
            # Extend row to the left
            leftmost = min(pattern_positions, key=lambda p: p.center_x)
            left_x = leftmost.center_x - pattern.spacing["x"] - element_width / 2
            left_y = leftmost.center_y - element_height / 2
            if left_x >= 0:
                suggestions.append((left_x, left_y))
        
        elif pattern.pattern_type == "column":
            # Extend column downward
            bottommost = max(pattern_positions, key=lambda p: p.center_y)
            next_x = bottommost.center_x - element_width / 2
            next_y = bottommost.center_y + pattern.spacing["y"] - element_height / 2
            suggestions.append((next_x, next_y))
            
            # Extend column upward
            topmost = min(pattern_positions, key=lambda p: p.center_y)
            top_x = topmost.center_x - element_width / 2
            top_y = topmost.center_y - pattern.spacing["y"] - element_height / 2
            if top_y >= 0:
                suggestions.append((top_x, top_y))
        
        elif pattern.pattern_type == "grid":
            x_coords = sorted(set(p.center_x for p in pattern_positions))
            y_coords = sorted(set(p.center_y for p in pattern_positions))
            
            x_spacing = pattern.spacing["x"]
            y_spacing = pattern.spacing["y"]
            
            # Extend grid to the right (new column)
            if x_coords:
                new_col_x = x_coords[-1] + x_spacing - element_width / 2
                for y in y_coords:
                    suggestions.append((new_col_x, y - element_height / 2))
            
            # Extend grid downward (new row)
            if y_coords:
                new_row_y = y_coords[-1] + y_spacing - element_height / 2
                for x in x_coords:
                    suggestions.append((x - element_width / 2, new_row_y))
            
            # Extend grid corner (bottom-right)
            if x_coords and y_coords:
                suggestions.append((
                    x_coords[-1] + x_spacing - element_width / 2,
                    y_coords[-1] + y_spacing - element_height / 2
                ))
        
        return suggestions
```

### File: `app/services/heatmap_analyzer.py`

```python
"""
Heatmap Analyzer: Analyzes pick density data to identify hotspots.
"""

from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
import numpy as np

from app.core.models import ElementData, HeatmapSummary, HotspotZone, ExpansionZone
from app.core.config import settings


@dataclass
class PickDensityPoint:
    """Represents pick density at a specific location."""
    element_id: str
    x: float
    y: float
    pick_count: int
    density: float


class HeatmapAnalyzer:
    """Analyzes pick data to inform placement suggestions."""
    
    def __init__(self):
        self.hotspot_percentile = settings.heatmap_hotspot_percentile
        self.expansion_buffer = settings.heatmap_expansion_buffer
    
    def analyze(self, elements: List[ElementData], pick_data: Dict[str, int]) -> Optional[HeatmapSummary]:
        """Analyze pick data and generate heatmap summary."""
        if not pick_data:
            return None
        
        density_points = self._build_density_points(elements, pick_data)
        
        if len(density_points) < 2:
            return None
        
        total_picks = sum(pick_data.values())
        hotspots = self._identify_hotspots(density_points)
        expansion_zones = self._identify_expansion_zones(density_points, hotspots, elements)
        
        return HeatmapSummary(
            total_picks=total_picks,
            hotspot_zones=hotspots,
            suggested_expansion_zones=expansion_zones
        )
    
    def _build_density_points(self, elements: List[ElementData], pick_data: Dict[str, int]) -> List[PickDensityPoint]:
        """Convert elements and pick data to density points."""
        max_picks = max(pick_data.values()) if pick_data else 1
        
        points = []
        for element in elements:
            pick_count = pick_data.get(element.id, 0)
            center_x = element.x_coordinate + element.width / 2
            center_y = element.y_coordinate + element.height / 2
            
            points.append(PickDensityPoint(
                element_id=element.id,
                x=center_x,
                y=center_y,
                pick_count=pick_count,
                density=pick_count / max_picks if max_picks > 0 else 0
            ))
        
        return points
    
    def _identify_hotspots(self, points: List[PickDensityPoint]) -> List[HotspotZone]:
        """Identify high-density hotspot zones."""
        if not points:
            return []
        
        densities = [p.density for p in points]
        threshold = np.percentile(densities, self.hotspot_percentile * 100)
        
        hot_points = [p for p in points if p.density >= threshold]
        
        if not hot_points:
            return []
        
        hotspots = []
        used = set()
        
        for point in sorted(hot_points, key=lambda p: p.density, reverse=True):
            if point.element_id in used:
                continue
            
            cluster = [point]
            used.add(point.element_id)
            
            for other in hot_points:
                if other.element_id in used:
                    continue
                
                dist = np.sqrt((point.x - other.x)**2 + (point.y - other.y)**2)
                if dist <= self.expansion_buffer:
                    cluster.append(other)
                    used.add(other.element_id)
            
            center_x = np.mean([p.x for p in cluster])
            center_y = np.mean([p.y for p in cluster])
            
            if len(cluster) > 1:
                radius = max(np.sqrt((p.x - center_x)**2 + (p.y - center_y)**2) for p in cluster) + 50
            else:
                radius = 50
            
            avg_density = np.mean([p.density for p in cluster])
            
            hotspots.append(HotspotZone(
                center_x=center_x,
                center_y=center_y,
                radius=radius,
                pick_density=avg_density
            ))
        
        return hotspots
    
    def _identify_expansion_zones(self, points: List[PickDensityPoint], hotspots: List[HotspotZone],
                                  elements: List[ElementData]) -> List[ExpansionZone]:
        """Identify areas near hotspots that could benefit from expansion."""
        if not hotspots:
            return []
        
        expansion_zones = []
        
        element_boxes = [
            (e.x_coordinate, e.y_coordinate, e.x_coordinate + e.width, e.y_coordinate + e.height)
            for e in elements
        ]
        
        for hotspot in hotspots[:3]:
            directions = [
                ("right", hotspot.center_x + hotspot.radius + 20, hotspot.center_y),
                ("left", hotspot.center_x - hotspot.radius - 120, hotspot.center_y),
                ("below", hotspot.center_x, hotspot.center_y + hotspot.radius + 20),
                ("above", hotspot.center_x, hotspot.center_y - hotspot.radius - 120),
            ]
            
            for direction, test_x, test_y in directions:
                zone_width = 100
                zone_height = 100
                
                zone_box = (test_x, test_y, test_x + zone_width, test_y + zone_height)
                
                has_collision = any(self._boxes_overlap(zone_box, eb) for eb in element_boxes)
                
                if not has_collision and test_x >= 0 and test_y >= 0:
                    expansion_zones.append(ExpansionZone(
                        x=test_x,
                        y=test_y,
                        width=zone_width,
                        height=zone_height,
                        reason=f"Adjacent to high-pick-density area ({direction})"
                    ))
        
        return expansion_zones[:5]
    
    def _boxes_overlap(self, box1: Tuple[float, float, float, float],
                       box2: Tuple[float, float, float, float]) -> bool:
        """Check if two bounding boxes overlap."""
        x1_min, y1_min, x1_max, y1_max = box1
        x2_min, y2_min, x2_max, y2_max = box2
        
        return not (x1_max < x2_min or x1_min > x2_max or y1_max < y2_min or y1_min > y2_max)
```

### File: `app/services/suggestion_engine.py`

```python
"""
Suggestion Engine: Main orchestrator for generating placement suggestions.
"""

from typing import List, Optional
from dataclasses import dataclass
import uuid
import time
import numpy as np

from app.core.models import (
    PlacementSuggestionRequest, PlacementSuggestionResponse, PlacementSuggestion,
    SuggestionRationale, SuggestionFactor, AnalysisMetadata, PatternInfo, ElementData, ElementType,
)
from app.services.pattern_analyzer import PatternAnalyzer, ElementPosition
from app.services.heatmap_analyzer import HeatmapAnalyzer
from app.services.scoring import SuggestionScorer
from app.core.config import settings


# Element dimensions must match frontend ELEMENT_CONFIGS
ELEMENT_CONFIGS = {
    ElementType.BAY: {"width": 24, "height": 120},
    ElementType.FLOW_RACK: {"width": 120, "height": 48},
    ElementType.FULL_PALLET: {"width": 48, "height": 48},
}


@dataclass
class CandidateSuggestion:
    """Internal representation of a suggestion candidate."""
    x: float
    y: float
    width: float
    height: float
    rotation: float
    source: str
    source_confidence: float
    source_detail: str
    pattern_ref: Optional[PatternInfo] = None


class SuggestionEngine:
    """Main engine for generating intelligent placement suggestions."""
    
    def __init__(self):
        self.pattern_analyzer = PatternAnalyzer()
        self.heatmap_analyzer = HeatmapAnalyzer()
        self.scorer = SuggestionScorer()
    
    def generate_suggestions(self, request: PlacementSuggestionRequest) -> PlacementSuggestionResponse:
        """Generate placement suggestions for a new element."""
        start_time = time.time()
        
        # Get element dimensions
        element_config = ELEMENT_CONFIGS.get(request.element_type, {"width": 50, "height": 50})
        element_width = element_config["width"]
        element_height = element_config["height"]
        
        # Phase 1: Pattern Analysis
        patterns = self.pattern_analyzer.analyze(request.elements)
        same_type_patterns = [p for p in patterns if p.element_type == request.element_type]
        all_patterns = same_type_patterns if same_type_patterns else patterns
        
        # Phase 2: Heatmap Analysis
        heatmap_summary = None
        if request.pick_data and request.preferences.prioritize_heatmap:
            heatmap_summary = self.heatmap_analyzer.analyze(request.elements, request.pick_data)
        
        # Phase 3: Generate Candidates
        candidates = self._generate_candidates(
            request, all_patterns, heatmap_summary, element_width, element_height
        )
        
        # Phase 4: Filter Candidates
        valid_candidates = self._filter_candidates(
            candidates, request.elements, element_width, element_height,
            request.canvas_width, request.canvas_height, request.preferences.grid_snap
        )
        
        # Phase 5: Score and Rank
        scored_candidates = self._score_candidates(valid_candidates, request, all_patterns, heatmap_summary)
        
        # Phase 6: Build Response
        top_candidates = scored_candidates[:request.preferences.max_suggestions]
        suggestions = self._build_suggestions(top_candidates, element_width, element_height, request.preferences.min_confidence)
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        return PlacementSuggestionResponse(
            suggestions=suggestions,
            analysis_metadata=AnalysisMetadata(
                detected_patterns=patterns,
                heatmap_summary=heatmap_summary,
                processing_time_ms=round(processing_time_ms, 2)
            )
        )
    
    def _generate_candidates(self, request: PlacementSuggestionRequest, patterns: List[PatternInfo],
                            heatmap_summary, element_width: float, element_height: float) -> List[CandidateSuggestion]:
        """Generate candidate positions from multiple sources."""
        candidates = []
        
        # Convert to position objects
        positions = [
            ElementPosition(
                id=e.id, element_type=e.element_type, x=e.x_coordinate, y=e.y_coordinate,
                width=e.width, height=e.height, center_x=e.x_coordinate + e.width / 2,
                center_y=e.y_coordinate + e.height / 2, rotation=e.rotation
            )
            for e in request.elements
        ]
        
        # Source 1: Pattern-based suggestions
        for pattern in patterns:
            pattern_positions = self.pattern_analyzer.get_next_positions_for_pattern(
                pattern, positions, element_width, element_height
            )
            for x, y in pattern_positions:
                candidates.append(CandidateSuggestion(
                    x=x, y=y, width=element_width, height=element_height, rotation=0,
                    source="pattern", source_confidence=pattern.confidence,
                    source_detail=f"Extends {pattern.pattern_type} pattern", pattern_ref=pattern
                ))
        
        # Source 2: Heatmap expansion zones
        if heatmap_summary and heatmap_summary.suggested_expansion_zones:
            for zone in heatmap_summary.suggested_expansion_zones:
                center_x = zone.x + zone.width / 2 - element_width / 2
                center_y = zone.y + zone.height / 2 - element_height / 2
                candidates.append(CandidateSuggestion(
                    x=center_x, y=center_y, width=element_width, height=element_height,
                    rotation=0, source="heatmap", source_confidence=0.7, source_detail=zone.reason
                ))
        
        # Source 3: Grid-based suggestions (fallback)
        if len(candidates) < 3 and request.elements:
            candidates.extend(self._generate_grid_suggestions(
                request.elements, element_width, element_height, request.preferences.grid_snap
            ))
        
        # Source 4: Route-optimal suggestions
        if request.route_markers:
            candidates.extend(self._generate_route_suggestions(
                request.route_markers, element_width, element_height
            ))
        
        # Source 5: Empty canvas fallback
        if not candidates:
            candidates.append(CandidateSuggestion(
                x=100, y=100, width=element_width, height=element_height, rotation=0,
                source="default", source_confidence=0.5, source_detail="Starting position for new layout"
            ))
        
        return candidates
    
    def _generate_grid_suggestions(self, elements: List[ElementData], element_width: float,
                                   element_height: float, grid_snap: int) -> List[CandidateSuggestion]:
        """Generate suggestions based on grid alignment."""
        candidates = []
        
        rightmost = max(elements, key=lambda e: e.x_coordinate + e.width)
        bottommost = max(elements, key=lambda e: e.y_coordinate + e.height)
        
        right_x = ((rightmost.x_coordinate + rightmost.width + grid_snap) // grid_snap) * grid_snap
        candidates.append(CandidateSuggestion(
            x=right_x, y=rightmost.y_coordinate, width=element_width, height=element_height,
            rotation=0, source="grid_extension", source_confidence=0.5,
            source_detail="Aligned to the right of existing elements"
        ))
        
        bottom_y = ((bottommost.y_coordinate + bottommost.height + grid_snap) // grid_snap) * grid_snap
        candidates.append(CandidateSuggestion(
            x=bottommost.x_coordinate, y=bottom_y, width=element_width, height=element_height,
            rotation=0, source="grid_extension", source_confidence=0.5,
            source_detail="Aligned below existing elements"
        ))
        
        return candidates
    
    def _generate_route_suggestions(self, route_markers, element_width: float,
                                   element_height: float) -> List[CandidateSuggestion]:
        """Generate suggestions optimized for route efficiency."""
        candidates = []
        
        start_points = [m for m in route_markers if m.marker_type.value == "start_point"]
        
        for start in start_points[:2]:
            candidates.append(CandidateSuggestion(
                x=start.x_coordinate + 50, y=start.y_coordinate + 50,
                width=element_width, height=element_height, rotation=0,
                source="route_optimal", source_confidence=0.6,
                source_detail="Near route start point for quick access"
            ))
        
        return candidates
    
    def _filter_candidates(self, candidates: List[CandidateSuggestion], elements: List[ElementData],
                          element_width: float, element_height: float, canvas_width: int,
                          canvas_height: int, grid_snap: int) -> List[CandidateSuggestion]:
        """Filter out invalid candidates."""
        valid = []
        seen_positions = set()
        
        for candidate in candidates:
            # Snap to grid
            snapped_x = round(candidate.x / grid_snap) * grid_snap
            snapped_y = round(candidate.y / grid_snap) * grid_snap
            
            # Skip duplicates
            pos_key = (snapped_x // grid_snap, snapped_y // grid_snap)
            if pos_key in seen_positions:
                continue
            seen_positions.add(pos_key)
            
            candidate.x = snapped_x
            candidate.y = snapped_y
            
            # Bounds check
            if candidate.x < -100 or candidate.y < -100:
                continue
            if candidate.x > canvas_width * 2 or candidate.y > canvas_height * 2:
                continue
            
            # Collision check
            has_collision = any(
                self._elements_overlap(
                    candidate.x, candidate.y, candidate.width, candidate.height,
                    e.x_coordinate, e.y_coordinate, e.width, e.height
                )
                for e in elements
            )
            
            if not has_collision:
                valid.append(candidate)
        
        return valid
    
    def _elements_overlap(self, x1: float, y1: float, w1: float, h1: float,
                         x2: float, y2: float, w2: float, h2: float, margin: float = 5) -> bool:
        """Check if two elements overlap."""
        return not (x1 + w1 + margin < x2 or x2 + w2 + margin < x1 or
                   y1 + h1 + margin < y2 or y2 + h2 + margin < y1)
    
    def _score_candidates(self, candidates: List[CandidateSuggestion], request: PlacementSuggestionRequest,
                         patterns: List[PatternInfo], heatmap_summary) -> List[CandidateSuggestion]:
        """Score and rank candidates."""
        for candidate in candidates:
            score = self.scorer.calculate_score(candidate, request, patterns, heatmap_summary)
            candidate.source_confidence = score
        
        candidates.sort(key=lambda c: c.source_confidence, reverse=True)
        return candidates
    
    def _build_suggestions(self, candidates: List[CandidateSuggestion], element_width: float,
                          element_height: float, min_confidence: float) -> List[PlacementSuggestion]:
        """Convert candidates to API response format."""
        suggestions = []
        
        for rank, candidate in enumerate(candidates, start=1):
            if candidate.source_confidence < min_confidence:
                continue
            
            style = "primary" if rank == 1 else ("secondary" if rank <= 3 else "tertiary")
            
            factors = [SuggestionFactor(
                factor=candidate.source,
                contribution=candidate.source_confidence,
                detail=candidate.source_detail
            )]
            
            if candidate.pattern_ref:
                factors.append(SuggestionFactor(
                    factor="pattern_match",
                    contribution=candidate.pattern_ref.confidence,
                    detail=f"Matches {candidate.pattern_ref.pattern_type} with {len(candidate.pattern_ref.anchor_elements)} elements"
                ))
            
            suggestions.append(PlacementSuggestion(
                id=str(uuid.uuid4()),
                x_coordinate=candidate.x,
                y_coordinate=candidate.y,
                width=candidate.width,
                height=candidate.height,
                rotation=candidate.rotation,
                confidence=round(candidate.source_confidence, 2),
                rank=rank,
                rationale=SuggestionRationale(primary_reason=candidate.source_detail, factors=factors),
                preview_style=style
            ))
        
        return suggestions
```

### File: `app/services/scoring.py`

```python
"""
Suggestion Scorer: Calculates confidence scores for placement suggestions.
"""

from typing import List, Optional
import numpy as np

from app.core.models import PlacementSuggestionRequest, PatternInfo, HeatmapSummary


class SuggestionScorer:
    """Calculates composite scores for placement suggestions."""
    
    # Scoring weights
    WEIGHT_SOURCE = 0.30
    WEIGHT_HOTSPOT = 0.25
    WEIGHT_PATTERN = 0.25
    WEIGHT_ROUTE = 0.20
    
    def calculate_score(self, candidate, request: PlacementSuggestionRequest,
                       patterns: List[PatternInfo], heatmap_summary: Optional[HeatmapSummary]) -> float:
        """Calculate composite score for a candidate suggestion."""
        scores = {"source": candidate.source_confidence}
        
        # Hotspot proximity score
        if heatmap_summary and heatmap_summary.hotspot_zones:
            scores["hotspot"] = self._score_hotspot_proximity(
                candidate.x + candidate.width / 2,
                candidate.y + candidate.height / 2,
                heatmap_summary.hotspot_zones
            )
        else:
            scores["hotspot"] = 0.5
        
        # Pattern alignment score
        if candidate.pattern_ref:
            scores["pattern"] = candidate.pattern_ref.confidence
        elif patterns:
            scores["pattern"] = self._score_pattern_alignment(candidate.x, candidate.y, patterns)
        else:
            scores["pattern"] = 0.5
        
        # Route efficiency score
        if request.route_markers:
            scores["route"] = self._score_route_efficiency(
                candidate.x + candidate.width / 2,
                candidate.y + candidate.height / 2,
                request.route_markers
            )
        else:
            scores["route"] = 0.5
        
        # Calculate weighted composite
        composite = (
            scores["source"] * self.WEIGHT_SOURCE +
            scores["hotspot"] * self.WEIGHT_HOTSPOT +
            scores["pattern"] * self.WEIGHT_PATTERN +
            scores["route"] * self.WEIGHT_ROUTE
        )
        
        return min(1.0, max(0.0, composite))
    
    def _score_hotspot_proximity(self, x: float, y: float, hotspots) -> float:
        """Score based on proximity to high-pick-density zones."""
        if not hotspots:
            return 0.5
        
        min_distance = float('inf')
        nearest_hotspot = None
        
        for hotspot in hotspots:
            dist = np.sqrt((x - hotspot.center_x)**2 + (y - hotspot.center_y)**2)
            if dist < min_distance:
                min_distance = dist
                nearest_hotspot = hotspot
        
        if nearest_hotspot is None:
            return 0.5
        
        ideal_distance = nearest_hotspot.radius
        
        if min_distance < ideal_distance * 0.5:
            score = 0.6 + 0.2 * (min_distance / (ideal_distance * 0.5))
        elif min_distance < ideal_distance * 1.5:
            score = 0.9 - 0.1 * abs(min_distance - ideal_distance) / ideal_distance
        else:
            falloff = min(1.0, (min_distance - ideal_distance * 1.5) / 200)
            score = 0.6 * (1 - falloff)
        
        return min(1.0, score + nearest_hotspot.pick_density * 0.1)
    
    def _score_pattern_alignment(self, x: float, y: float, patterns: List[PatternInfo]) -> float:
        """Score based on alignment with detected patterns."""
        if not patterns:
            return 0.5
        
        best_score = 0.3
        
        for pattern in patterns:
            if pattern.pattern_type == "grid":
                x_spacing = pattern.spacing["x"]
                y_spacing = pattern.spacing["y"]
                
                if x_spacing > 0 and y_spacing > 0:
                    x_alignment = 1 - (x % x_spacing) / x_spacing
                    y_alignment = 1 - (y % y_spacing) / y_spacing
                    
                    alignment_score = (x_alignment + y_alignment) / 2 * pattern.confidence
                    best_score = max(best_score, alignment_score)
        
        return best_score
    
    def _score_route_efficiency(self, x: float, y: float, route_markers) -> float:
        """Score based on proximity to route markers."""
        start_points = [m for m in route_markers if m.marker_type.value == "start_point"]
        
        if not start_points:
            return 0.5
        
        min_distance = min(
            np.sqrt((x - m.x_coordinate)**2 + (y - m.y_coordinate)**2)
            for m in start_points
        )
        
        max_useful_distance = 500
        
        if min_distance < 50:
            return 0.9
        elif min_distance < max_useful_distance:
            return 0.9 - 0.5 * (min_distance / max_useful_distance)
        else:
            return 0.4
```

---

## Docker Configuration

### File: `Dockerfile`

```dockerfile
# Python AI Service Dockerfile
FROM python:3.11-slim as builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim

RUN useradd --create-home --shell /bin/bash appuser

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

COPY --chown=appuser:appuser app/ ./app/

USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5000"]
```

### File: `requirements.txt`

```
# Core framework
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
pydantic-settings==2.1.0

# Scientific computing
numpy==1.26.3
scipy==1.12.0

# Utilities
python-multipart==0.0.6
python-dotenv==1.0.0

# Testing
pytest==7.4.4
pytest-asyncio==0.23.3
httpx==0.26.0

# Production
gunicorn==21.2.0
```

### File: `docker-compose.yml`

```yaml
version: '3.8'

services:
  smart-placement-ai:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - ENVIRONMENT=development
      - DEBUG=true
      - CORS_ORIGINS=["http://localhost:3000","http://localhost:3001"]
    volumes:
      - ./app:/app/app
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## Frontend Implementation

### File: `hooks/usePlacementAI.ts`

```typescript
/**
 * usePlacementAI: React hook for fetching AI placement suggestions.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ElementType, WarehouseElement, RouteMarker } from '@/lib/types';

export interface PlacementSuggestion {
  id: string;
  x_coordinate: number;
  y_coordinate: number;
  width: number;
  height: number;
  rotation: number;
  confidence: number;
  rank: number;
  rationale: {
    primary_reason: string;
    factors: Array<{ factor: string; contribution: number; detail: string }>;
  };
  preview_style: 'primary' | 'secondary' | 'tertiary';
}

interface UsePlacementAIOptions {
  layoutId: string;
  elements: WarehouseElement[];
  routeMarkers: RouteMarker[];
  pickData?: Map<string, number>;
  canvasWidth: number;
  canvasHeight: number;
  enabled?: boolean;
  debounceMs?: number;
}

interface UsePlacementAIResult {
  suggestions: PlacementSuggestion[];
  isLoading: boolean;
  error: string | null;
  fetchSuggestions: (elementType: ElementType) => Promise<void>;
  clearSuggestions: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function usePlacementAI({
  layoutId,
  elements,
  routeMarkers,
  pickData,
  canvasWidth,
  canvasHeight,
  enabled = true,
  debounceMs = 300,
}: UsePlacementAIOptions): UsePlacementAIResult {
  const [suggestions, setSuggestions] = useState<PlacementSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSuggestions = useCallback(async (elementType: ElementType) => {
    if (!enabled) return;

    // Only fetch for storage element types
    const validTypes: ElementType[] = ['bay', 'flow_rack', 'full_pallet'];
    if (!validTypes.includes(elementType)) {
      setSuggestions([]);
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      abortControllerRef.current = new AbortController();

      try {
        // Convert pickData Map to object
        const pickDataObj: Record<string, number> = {};
        if (pickData) {
          pickData.forEach((value, key) => {
            pickDataObj[key] = value;
          });
        }

        const requestBody = {
          layout_id: layoutId,
          element_type: elementType,
          elements: elements.map(e => ({
            id: e.id,
            element_type: e.element_type,
            x_coordinate: Number(e.x_coordinate),
            y_coordinate: Number(e.y_coordinate),
            width: Number(e.width),
            height: Number(e.height),
            rotation: Number(e.rotation),
            label: e.label,
          })),
          route_markers: routeMarkers.map(m => ({
            id: m.id,
            marker_type: m.marker_type,
            x_coordinate: Number(m.x_coordinate),
            y_coordinate: Number(m.y_coordinate),
            sequence_order: m.sequence_order,
          })),
          pick_data: Object.keys(pickDataObj).length > 0 ? pickDataObj : undefined,
          canvas_width: canvasWidth,
          canvas_height: canvasHeight,
          preferences: {
            max_suggestions: 5,
            min_confidence: 0.3,
            prioritize_heatmap: true,
            grid_snap: 50,
          },
        };

        const response = await fetch(`${API_BASE_URL}/api/ai/placement-suggestions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        setSuggestions(data.suggestions);

      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('Failed to fetch placement suggestions:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch suggestions');
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);
  }, [layoutId, elements, routeMarkers, pickData, canvasWidth, canvasHeight, enabled, debounceMs]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    fetchSuggestions,
    clearSuggestions,
  };
}
```

### File: `components/designer/SuggestionOverlay.tsx`

```tsx
/**
 * SuggestionOverlay: Renders AI placement suggestions on the canvas.
 */

import React, { useMemo } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type { PlacementSuggestion } from '@/hooks/usePlacementAI';

interface SuggestionOverlayProps {
  suggestions: PlacementSuggestion[];
  onSuggestionClick: (suggestion: PlacementSuggestion) => void;
  onSuggestionHover: (suggestion: PlacementSuggestion | null) => void;
  hoveredSuggestionId: string | null;
  isLoading: boolean;
}

const STYLE_CONFIG = {
  primary: {
    fill: 'rgba(59, 130, 246, 0.3)',
    stroke: '#3b82f6',
    strokeWidth: 2,
    dashEnabled: false,
    glowBlur: 15,
  },
  secondary: {
    fill: 'rgba(34, 197, 94, 0.2)',
    stroke: '#22c55e',
    strokeWidth: 2,
    dashEnabled: true,
    dashArray: [8, 4],
    glowBlur: 10,
  },
  tertiary: {
    fill: 'rgba(148, 163, 184, 0.15)',
    stroke: '#94a3b8',
    strokeWidth: 1,
    dashEnabled: true,
    dashArray: [4, 4],
    glowBlur: 5,
  },
};

export const SuggestionOverlay: React.FC<SuggestionOverlayProps> = ({
  suggestions,
  onSuggestionClick,
  onSuggestionHover,
  hoveredSuggestionId,
  isLoading,
}) => {
  const sortedSuggestions = useMemo(() => {
    return [...suggestions].sort((a, b) => a.rank - b.rank);
  }, [suggestions]);

  if (isLoading) {
    return (
      <Group>
        <Text
          x={10}
          y={10}
          text="AI analyzing layout..."
          fontSize={12}
          fontFamily="monospace"
          fill="#94a3b8"
        />
      </Group>
    );
  }

  return (
    <Group>
      {sortedSuggestions.map((suggestion) => {
        const style = STYLE_CONFIG[suggestion.preview_style];
        const isHovered = hoveredSuggestionId === suggestion.id;

        return (
          <Group
            key={suggestion.id}
            x={suggestion.x_coordinate}
            y={suggestion.y_coordinate}
          >
            {/* Suggestion zone rectangle */}
            <Rect
              width={suggestion.width}
              height={suggestion.height}
              fill={style.fill}
              stroke={isHovered ? '#ffffff' : style.stroke}
              strokeWidth={isHovered ? 3 : style.strokeWidth}
              dash={style.dashEnabled ? style.dashArray : undefined}
              cornerRadius={4}
              shadowColor={style.stroke}
              shadowBlur={isHovered ? 20 : style.glowBlur}
              shadowOpacity={isHovered ? 0.8 : 0.5}
              onClick={() => onSuggestionClick(suggestion)}
              onMouseEnter={() => onSuggestionHover(suggestion)}
              onMouseLeave={() => onSuggestionHover(null)}
              onMouseOver={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'pointer';
              }}
              onMouseOut={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'default';
              }}
            />

            {/* Rank badge */}
            <Group x={suggestion.width - 20} y={-10}>
              <Rect
                width={24}
                height={24}
                fill={style.stroke}
                cornerRadius={12}
                shadowColor="#000"
                shadowBlur={4}
                shadowOpacity={0.3}
              />
              <Text
                width={24}
                height={24}
                text={suggestion.rank.toString()}
                fontSize={12}
                fontFamily="monospace"
                fontStyle="bold"
                fill="#ffffff"
                align="center"
                verticalAlign="middle"
              />
            </Group>

            {/* Confidence bar */}
            <Group x={0} y={suggestion.height + 4}>
              <Rect
                width={suggestion.width}
                height={4}
                fill="rgba(0,0,0,0.3)"
                cornerRadius={2}
              />
              <Rect
                width={suggestion.width * suggestion.confidence}
                height={4}
                fill={style.stroke}
                cornerRadius={2}
              />
            </Group>

            {/* Hover tooltip */}
            {isHovered && (
              <Group x={suggestion.width + 10} y={0}>
                <Rect
                  width={200}
                  height={60}
                  fill="rgba(15, 23, 42, 0.95)"
                  stroke="#334155"
                  strokeWidth={1}
                  cornerRadius={8}
                  shadowColor="#000"
                  shadowBlur={10}
                  shadowOpacity={0.5}
                />
                <Text
                  x={10}
                  y={8}
                  width={180}
                  text={suggestion.rationale.primary_reason}
                  fontSize={11}
                  fontFamily="monospace"
                  fill="#e2e8f0"
                  wrap="word"
                />
                <Text
                  x={10}
                  y={35}
                  text={`Confidence: ${Math.round(suggestion.confidence * 100)}%`}
                  fontSize={10}
                  fontFamily="monospace"
                  fill="#94a3b8"
                />
              </Group>
            )}
          </Group>
        );
      })}

      {/* Legend */}
      {suggestions.length > 0 && (
        <Group x={10} y={10}>
          <Rect
            width={160}
            height={70}
            fill="rgba(15, 23, 42, 0.9)"
            stroke="#334155"
            strokeWidth={1}
            cornerRadius={8}
          />
          <Text x={10} y={8} text="AI Suggestions" fontSize={11} fontFamily="monospace" fontStyle="bold" fill="#e2e8f0" />
          <Text x={10} y={25} text="Click to place element" fontSize={9} fontFamily="monospace" fill="#94a3b8" />
          <Text x={10} y={40} text={`${suggestions.length} suggestion${suggestions.length !== 1 ? 's' : ''}`} fontSize={9} fontFamily="monospace" fill="#64748b" />
          <Text x={10} y={52} text="Press ESC to dismiss" fontSize={9} fontFamily="monospace" fill="#64748b" />
        </Group>
      )}
    </Group>
  );
};

export default SuggestionOverlay;
```

---

## Node.js API Gateway Integration

### File: `routes/ai.js`

```javascript
/**
 * AI API Routes - Proxies requests to Python AI service
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000';

router.post(
  '/placement-suggestions',
  authenticateToken,
  async (req, res) => {
    try {
      const response = await axios.post(
        `${AI_SERVICE_URL}/api/v1/suggestions`,
        req.body,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      res.json(response.data);

    } catch (error) {
      console.error('AI service error:', error.message);

      if (error.response) {
        res.status(error.response.status).json({
          message: error.response.data?.detail || 'AI service error',
        });
      } else if (error.code === 'ECONNREFUSED') {
        res.status(503).json({
          message: 'AI service unavailable. Please try again later.',
        });
      } else {
        res.status(500).json({
          message: 'Failed to get placement suggestions',
        });
      }
    }
  }
);

router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 5000 });
    res.json({ status: 'healthy', ai_service: response.data });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', ai_service: 'unavailable' });
  }
});

module.exports = router;
```

### Register in Express app:

```javascript
const aiRoutes = require('./routes/ai');
app.use('/api/ai', aiRoutes);
```

---

## Production Deployment

### Railway Deployment

Create `railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30
  }
}
```

### Environment Variables for Production

```bash
ENVIRONMENT=production
DEBUG=false
CORS_ORIGINS=["https://your-production-domain.com"]
```

### Checklist

- [ ] Set `ENVIRONMENT=production`
- [ ] Set `DEBUG=false`
- [ ] Configure `CORS_ORIGINS` with production domains
- [ ] Set `AI_SERVICE_URL` in Node.js backend
- [ ] Enable HTTPS
- [ ] Configure rate limiting
- [ ] Set up error tracking (Sentry)
- [ ] Configure logging aggregation

---

## Testing

### Run Python Tests

```bash
cd smart-placement-service
pytest tests/ -v
```

### Sample Test File: `tests/test_pattern_analyzer.py`

```python
import pytest
from app.services.pattern_analyzer import PatternAnalyzer
from app.core.models import ElementData, ElementType


@pytest.fixture
def analyzer():
    return PatternAnalyzer()


@pytest.fixture
def row_layout():
    """Creates a simple row of 4 bays."""
    return [
        ElementData(
            id=f"bay-{i}",
            element_type=ElementType.BAY,
            x_coordinate=100 + i * 50,
            y_coordinate=100,
            width=24,
            height=120,
            rotation=0,
            label=f"B{i+1}"
        )
        for i in range(4)
    ]


class TestPatternAnalyzer:
    
    def test_detects_row_pattern(self, analyzer, row_layout):
        patterns = analyzer.analyze(row_layout)
        row_patterns = [p for p in patterns if p.pattern_type == "row"]
        assert len(row_patterns) >= 1
        assert row_patterns[0].confidence > 0.5
    
    def test_empty_layout_returns_no_patterns(self, analyzer):
        patterns = analyzer.analyze([])
        assert len(patterns) == 0
```

---

## Summary

This document provides everything needed to implement AI-powered predictive element placement for the SlottingPRO heatmap designer:

1. **Python AI Service**: FastAPI-based service with pattern detection, heatmap analysis, and intelligent suggestion generation
2. **React Integration**: Custom hook and overlay component for seamless frontend integration
3. **Node.js Gateway**: Proxy route for authentication and rate limiting
4. **Docker Configuration**: Production-ready containerization
5. **Deployment Guide**: Railway/Render deployment instructions

The AI suggestions focus on **design efficiency**—helping users quickly place elements in positions that follow established patterns and support high-pick-density areas when data is available.
