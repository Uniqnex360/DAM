# DAM & Product Visualizer API Reference

Complete API specification for the DAM & Product Visualizer platform.

## Base URL

```
https://api.furniture-visualizer.com/v1
```

## Authentication

All endpoints require authentication via Supabase JWT token.

```
Authorization: Bearer <supabase-jwt-token>
```

## Endpoints

### Uploads

#### Upload Images

Create a new upload session and upload product images.

```http
POST /api/v1/uploads
Content-Type: multipart/form-data

Body:
  images: File[]           (required) Array of image files
  product_id: string       (optional) Link to existing product
  metadata: object         (optional) Additional metadata
```

**Response:**
```json
{
  "uploadId": "uuid",
  "images": [
    {
      "id": "uuid",
      "url": "https://storage.example.com/...",
      "thumbnail_url": "https://...",
      "width": 4000,
      "height": 3000
    }
  ],
  "status": "uploaded",
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### Get Upload

```http
GET /api/v1/uploads/{uploadId}
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "product_id": "uuid",
  "status": "uploaded",
  "images": [...],
  "metadata": {},
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

### Processing Jobs

#### Create Segmentation Job

Detect and segment furniture components.

```http
POST /api/v1/process/segment
Content-Type: application/json

Body:
{
  "uploadId": "uuid",
  "options": {
    "detect_components": true,
    "detect_wood": true,
    "detect_fabric": true
  }
}
```

**Response:**
```json
{
  "jobId": "uuid",
  "type": "segment",
  "status": "pending",
  "created_at": "2025-01-01T00:00:00Z",
  "estimated_duration": "10s",
  "cost_estimate": 0.10
}
```

**Job Output (when completed):**
```json
{
  "masks": [
    {
      "component": "leg",
      "maskUrl": "https://...",
      "confidence": 0.95,
      "bbox": { "x": 100, "y": 200, "width": 150, "height": 300 },
      "material": "wood"
    }
  ],
  "components": ["leg", "cushion", "fabric", "frame"]
}
```

#### Create Stain Job

Apply wood stain with grain preservation.

```http
POST /api/v1/process/stain
Content-Type: application/json

Body:
{
  "uploadId": "uuid",
  "targetColor": "#5A3B2E",
  "options": {
    "preserveGrain": 0.9,
    "strength": 0.9,
    "referenceTextureId": "uuid"  // optional
  }
}
```

**Response:**
```json
{
  "jobId": "uuid",
  "type": "stain",
  "status": "pending",
  "created_at": "2025-01-01T00:00:00Z",
  "estimated_duration": "30s",
  "cost_estimate": 0.15
}
```

**Job Output:**
```json
{
  "textureId": "uuid",
  "albedoUrl": "https://...",
  "normalUrl": "https://...",
  "roughnessUrl": "https://...",
  "aoUrl": "https://...",
  "previewUrl": "https://..."
}
```

#### Create 3D Generation Job

Generate 3D model from images.

```http
POST /api/v1/process/3d
Content-Type: application/json

Body:
{
  "uploadId": "uuid",
  "mode": "photogrammetry" | "nerf" | "single_image",
  "options": {
    "quality": "high" | "medium" | "low",
    "optimize": true,
    "target_polygon_count": 50000
  }
}
```

**Response:**
```json
{
  "jobId": "uuid",
  "type": "3d",
  "status": "pending",
  "created_at": "2025-01-01T00:00:00Z",
  "estimated_duration": "30m",
  "cost_estimate": 1.50
}
```

**Job Output:**
```json
{
  "modelId": "uuid",
  "glbUrl": "https://...",
  "usdzUrl": "https://...",
  "fbxUrl": "https://...",
  "gltfUrl": "https://...",
  "quality_score": 0.85,
  "polygon_count": 48523,
  "generation_method": "photogrammetry"
}
```

#### Create Render Job

Generate 360° turntable video.

```http
POST /api/v1/render/360
Content-Type: application/json

Body:
{
  "modelId": "uuid",
  "options": {
    "frames": 36,
    "resolution": "1920x1080",
    "fps": 24,
    "format": "mp4",
    "toneMapping": "filmic",
    "lighting": "studio" | "outdoor" | "product"
  }
}
```

**Response:**
```json
{
  "jobId": "uuid",
  "type": "render",
  "status": "pending",
  "created_at": "2025-01-01T00:00:00Z",
  "estimated_duration": "5m",
  "cost_estimate": 0.10
}
```

**Job Output:**
```json
{
  "renderId": "uuid",
  "mp4Url": "https://...",
  "gifUrl": "https://...",
  "thumbnails": [
    "https://...frame_0000.png",
    "https://...frame_0009.png",
    "https://...frame_0018.png",
    "https://...frame_0027.png"
  ],
  "frames": 36,
  "resolution": "1920x1080"
}
```

#### Get Job Status

```http
GET /api/v1/jobs/{jobId}
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "type": "segment" | "stain" | "3d" | "render" | "export",
  "status": "pending" | "processing" | "completed" | "failed",
  "input_data": {},
  "output_data": {},
  "error_message": null,
  "cost_estimate": 0.10,
  "cost_actual": 0.08,
  "started_at": "2025-01-01T00:00:01Z",
  "completed_at": "2025-01-01T00:00:15Z",
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### List Jobs

```http
GET /api/v1/jobs?status=processing&type=3d&limit=20&offset=0
```

**Query Parameters:**
- `status`: Filter by status (pending, processing, completed, failed)
- `type`: Filter by job type
- `limit`: Results per page (default 20)
- `offset`: Pagination offset

**Response:**
```json
{
  "jobs": [...],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

---

### 3D Models

#### Get Model

```http
GET /api/v1/models/{modelId}
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "product_id": "uuid",
  "name": "Chair Model",
  "glb_url": "https://...",
  "usdz_url": "https://...",
  "fbx_url": "https://...",
  "gltf_url": "https://...",
  "generation_method": "photogrammetry",
  "quality_score": 0.85,
  "polygon_count": 48523,
  "texture_id": "uuid",
  "component_mapping": {
    "legs": "mesh_1",
    "cushion": "mesh_2",
    "frame": "mesh_3"
  },
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### Download Model

```http
GET /api/v1/models/{modelId}/download?format=glb|usdz|fbx|gltf
```

**Response:** File download with signed URL

#### Apply Texture to Model

```http
POST /api/v1/models/{modelId}/apply-texture
Content-Type: application/json

Body:
{
  "textureId": "uuid",
  "componentMapping": {
    "frame": true,
    "legs": true,
    "cushion": false
  }
}
```

**Response:**
```json
{
  "modelId": "uuid",
  "glbUrl": "https://...",
  "previewUrl": "https://..."
}
```

---

### Products

#### Create Product

```http
POST /api/v1/products
Content-Type: application/json

Body:
{
  "name": "Modern Lounge Chair",
  "description": "Comfortable mid-century modern chair",
  "category": "chair",
  "base_price": 1299.00,
  "sku": "CHAIR-001",
  "is_public": false,
  "metadata": {}
}
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Modern Lounge Chair",
  "description": "...",
  "category": "chair",
  "base_price": 1299.00,
  "sku": "CHAIR-001",
  "is_public": false,
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### Get Product

```http
GET /api/v1/products/{productId}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Modern Lounge Chair",
  "description": "...",
  "category": "chair",
  "base_price": 1299.00,
  "components": [...],
  "models_3d": [...],
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### List Products

```http
GET /api/v1/products?category=chair&search=modern&limit=20
```

**Query Parameters:**
- `category`: Filter by category
- `search`: Search in name and description
- `is_public`: Filter public/private products
- `limit`: Results per page
- `offset`: Pagination offset

#### Update Product

```http
PATCH /api/v1/products/{productId}
Content-Type: application/json

Body:
{
  "name": "Updated Name",
  "base_price": 1399.00
}
```

#### Delete Product

```http
DELETE /api/v1/products/{productId}
```

---

### Product Components

#### Add Component

```http
POST /api/v1/products/{productId}/components
Content-Type: application/json

Body:
{
  "name": "Tapered Legs",
  "type": "leg",
  "material": "walnut",
  "is_default": true,
  "price_modifier": 0.00,
  "mesh_url": "https://...",
  "thumbnail_url": "https://..."
}
```

**Response:**
```json
{
  "id": "uuid",
  "product_id": "uuid",
  "name": "Tapered Legs",
  "type": "leg",
  "material": "walnut",
  "is_default": true,
  "price_modifier": 0.00,
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### List Components

```http
GET /api/v1/products/{productId}/components
```

---

### Configurations

#### Create Configuration

```http
POST /api/v1/configurations
Content-Type: application/json

Body:
{
  "product_id": "uuid",
  "name": "My Custom Chair",
  "components": {
    "legs": "component-uuid-1",
    "fabric": "component-uuid-2",
    "cushion": "component-uuid-3"
  },
  "custom_options": {
    "stain_color": "#5A3B2E",
    "grain_preservation": 0.9
  },
  "total_price": 1449.00,
  "is_saved": true
}
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "product_id": "uuid",
  "name": "My Custom Chair",
  "components": {...},
  "custom_options": {...},
  "total_price": 1449.00,
  "preview_url": "https://...",
  "is_saved": true,
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### Get Configuration

```http
GET /api/v1/configurations/{configId}
```

#### List Configurations

```http
GET /api/v1/configurations?product_id=uuid
```

---

### Stain Library

#### List Stains

```http
GET /api/v1/stains?category=dark
```

**Response:**
```json
{
  "stains": [
    {
      "id": "uuid",
      "name": "Walnut",
      "color_hex": "#5A3B2E",
      "color_lab": { "l": 30, "a": 10, "b": 15 },
      "category": "dark",
      "preview_url": "https://...",
      "texture_sample_url": "https://...",
      "is_public": true
    }
  ]
}
```

---

### Catalog & Search

#### Add to Catalog

```http
POST /api/v1/catalog
Content-Type: application/json

Body:
{
  "product_id": "uuid",
  "variations": [
    {
      "name": "Light Oak Variant",
      "stain_id": "uuid",
      "model_id": "uuid",
      "price": 1299.00
    }
  ]
}
```

#### Search Catalog

```http
GET /api/v1/catalog/search?q=modern+chair&category=chair&price_min=500&price_max=2000
```

**Query Parameters:**
- `q`: Search query
- `category`: Filter by category
- `price_min`, `price_max`: Price range
- `color`: Filter by stain color
- `material`: Filter by material
- `sort`: Sort by (relevance, price_asc, price_desc, created_at)

**Response:**
```json
{
  "results": [
    {
      "product_id": "uuid",
      "name": "Modern Lounge Chair",
      "description": "...",
      "thumbnail_url": "https://...",
      "base_price": 1299.00,
      "category": "chair",
      "relevance_score": 0.95
    }
  ],
  "total": 42,
  "page": 1,
  "per_page": 20
}
```

---

### Render Outputs

#### Get Render Output

```http
GET /api/v1/renders/{renderId}
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "model_id": "uuid",
  "type": "360_video",
  "mp4_url": "https://...",
  "gif_url": "https://...",
  "thumbnail_urls": [...],
  "frames": 36,
  "resolution": "1920x1080",
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

### Webhooks

#### Register Webhook

```http
POST /api/v1/webhooks
Content-Type: application/json

Body:
{
  "url": "https://your-server.com/webhook",
  "events": ["job.completed", "job.failed"],
  "secret": "your-secret-key"
}
```

**Response:**
```json
{
  "id": "uuid",
  "url": "https://your-server.com/webhook",
  "events": ["job.completed", "job.failed"],
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### Webhook Payload

When a job completes, the webhook receives:

```json
{
  "event": "job.completed",
  "timestamp": "2025-01-01T00:00:15Z",
  "data": {
    "job_id": "uuid",
    "type": "stain",
    "status": "completed",
    "output_data": {...}
  },
  "signature": "sha256=..."
}
```

---

### User & Quota

#### Get User Profile

```http
GET /api/v1/profile
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "client",
  "company": "ACME Inc",
  "quota_limit": 100,
  "quota_used": 45,
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### Update Profile

```http
PATCH /api/v1/profile
Content-Type: application/json

Body:
{
  "company": "New Company Name",
  "avatar_url": "https://..."
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "invalid_input",
    "message": "Upload ID not found",
    "details": {}
  }
}
```

**Common Error Codes:**
- `invalid_input`: Bad request data
- `not_found`: Resource not found
- `unauthorized`: Authentication required
- `forbidden`: Insufficient permissions
- `quota_exceeded`: User quota exceeded
- `rate_limit`: Rate limit exceeded
- `server_error`: Internal server error

---

## Rate Limits

- **Free tier**: 100 requests/hour, 10 jobs/day
- **Pro tier**: 1000 requests/hour, 100 jobs/day
- **Enterprise**: Custom limits

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1704067200
```

---

## Pagination

List endpoints support pagination:

```http
GET /api/v1/products?limit=20&offset=40
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 40,
    "has_more": true
  }
}
```

---

## WebSocket (Real-time Updates)

Connect to receive real-time job updates:

```javascript
const ws = new WebSocket('wss://api.furniture-visualizer.com/v1/ws');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  // { type: 'job.update', jobId: '...', status: 'processing', progress: 0.5 }
};
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { FurnitureVisualizerClient } from '@furniture-visualizer/sdk';

const client = new FurnitureVisualizerClient({
  apiKey: 'your-api-key',
  baseURL: 'https://api.furniture-visualizer.com/v1'
});

// Upload images
const upload = await client.uploads.create({
  images: [file1, file2, file3]
});

// Create stain job
const stainJob = await client.jobs.createStain({
  uploadId: upload.id,
  targetColor: '#5A3B2E',
  options: { preserveGrain: 0.9 }
});

// Wait for completion
const result = await client.jobs.waitFor(stainJob.id);

// Download texture
const texture = await client.textures.get(result.output_data.textureId);
```

### Python

```python
from furniture_visualizer import Client

client = Client(api_key='your-api-key')

# Upload images
upload = client.uploads.create(images=[file1, file2])

# Create 3D job
job = client.jobs.create_3d(
    upload_id=upload.id,
    mode='photogrammetry',
    options={'quality': 'high'}
)

# Wait for completion
result = client.jobs.wait_for(job.id, timeout=3600)

# Download model
model = client.models.download(result.output_data.model_id, format='glb')
```

---

## Changelog

### v1.0.0 (2025-01-01)
- Initial API release
- Upload, segmentation, stain, 3D, and render endpoints
- Product catalog and configuration
- Webhook support

---

For support, contact: support@furniture-visualizer.com
