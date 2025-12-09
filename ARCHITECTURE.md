# DAM & Product Visualizer Platform - Architecture Documentation

## Overview

This platform is a comprehensive SaaS solution for furniture visualization and configuration. It accepts product photos and provides image enhancement, wood stain replacement, PBR texture generation, 3D model creation, component configuration, 360° rendering, and AR viewing capabilities.

## Current Implementation Status

### ✅ Completed Components

#### 1. Database Schema (Supabase PostgreSQL)
- **profiles**: User management with role-based access control (admin, editor, client)
- **products**: Product catalog with metadata and pricing
- **product_components**: Componentized furniture parts (legs, cushions, fabrics, hardware)
- **uploads**: Upload session tracking
- **images**: Individual images with EXIF data, masks, and embeddings
- **textures**: PBR texture sets (albedo, normal, roughness, AO)
- **models_3d**: 3D models in multiple formats (GLB, USDZ, FBX, GLTF)
- **configurations**: Saved product configurations with pricing
- **jobs**: Processing job queue with status tracking
- **stain_library**: Wood stain options with color codes
- **fabric_library**: Fabric options with textures
- **render_outputs**: 360° videos and turntable assets

All tables have Row Level Security (RLS) enabled with appropriate policies.

#### 2. Storage
- **images bucket**: Public storage for uploaded product images
- RLS policies enforce user ownership and secure access

#### 3. Authentication
- Email/password authentication via Supabase Auth
- Automatic profile creation on signup
- Session management with auto-refresh
- Protected routes and user state management

#### 4. Frontend Components

**Layout & Navigation**
- Responsive navigation bar
- Tab-based view switching
- User profile display
- Sign out functionality

**Upload Interface**
- Drag-and-drop file upload
- Multi-file selection
- Image preview grid
- Upload progress tracking
- Success/error notifications

**Product Catalog**
- Product listing with search
- Create new products
- Category filtering
- Product cards with thumbnails

**Component Configurator**
- Wood stain selector with visual swatches
- Grain preservation slider
- Component dropdowns (legs, fabric, cushions, hardware)
- Real-time price calculation
- Save configuration

**3D Viewer**
- Google model-viewer integration
- AR-ready (WebXR, Scene Viewer, Quick Look)
- Auto-rotate and camera controls
- Download GLB/USDZ exports
- iOS Quick Look support

**Job Tracker**
- Real-time job status monitoring
- Job type indicators
- Error message display
- Auto-refresh every 5 seconds

#### 5. API Service Layer
- RESTful API wrapper over Supabase
- Upload management
- Job creation (segment, stain, 3D, render)
- Product CRUD operations
- Stain library access

### 🚧 Architecture for Backend Processing (To Be Implemented)

The frontend is complete and functional. The following backend infrastructure needs to be implemented:

#### 1. GPU Processing Workers

**Technologies:**
- Docker containers on Kubernetes (EKS/GKE) or ECS
- NVIDIA GPU instances (p4/p3 for heavy processing)
- Autoscaling based on queue depth

**Worker Types:**

**a) Segmentation Worker**
- OpenAI GPT-5.1 Vision API for component detection
- Returns JSON masks and component lists
- Stores mask overlays in storage
- Updates job status and output_data

**b) Stain Recolor Worker**
- Intrinsic decomposition (albedo/shading separation)
- Grain extraction via normal estimation
- Color transfer using LAB color space
- PBR texture generation (albedo, normal, roughness, AO)
- OpenAI Image Edit API for prototyping

**c) 3D Generation Worker**
- **Mode: Photogrammetry**
  - Meshroom/AliceVision or RealityCapture
  - Multi-view image processing
  - Mesh reconstruction and cleanup
- **Mode: NeRF**
  - NVIDIA instant-ngp or Nerfstudio
  - Neural radiance field training
  - Mesh extraction
- **Mode: Single Image**
  - OpenAI Shap-E API
  - Coarse 3D mesh generation
- Post-processing with Blender (headless)
- Export to GLB, USDZ, FBX, GLTF

**d) Render Worker**
- Blender headless rendering
- 360° turntable animations (36 frames)
- Video encoding (MP4, GIF)
- Thumbnail generation
- Filmic tone mapping

**e) Export Worker**
- Format conversion
- USDZ generation (Apple Reality Converter)
- Quality optimization
- CDN upload

#### 2. Job Queue System

**Technology:** Redis + RQ or RabbitMQ

**Flow:**
1. Frontend creates job via API
2. Job inserted into database with status 'pending'
3. Job pushed to appropriate queue
4. Worker picks up job, updates status to 'processing'
5. Worker processes and stores results
6. Worker updates job with output_data and status 'completed' or 'failed'
7. Optional webhook notification

#### 3. API Gateway (Backend)

**Technology:** NestJS (Node.js) or FastAPI (Python)

**Endpoints (examples):**

```
POST /api/v1/uploads
POST /api/v1/process/segment
POST /api/v1/process/stain
POST /api/v1/process/3d
POST /api/v1/render/360
GET  /api/v1/models/{id}/download
POST /api/v1/catalog/add
GET  /api/v1/catalog/search
```

**Features:**
- Request validation
- Rate limiting
- Cost estimation before job creation
- Webhook delivery
- Job monitoring
- Analytics and usage tracking

#### 4. OpenAI Integration

**Models to integrate:**

1. **GPT-5.1 Vision** (or latest multimodal)
   - Segmentation masks
   - Component detection
   - Instruction generation

2. **DALL·E 3 / Image Edit**
   - Stain recoloring
   - Texture synthesis

3. **Shap-E**
   - Single-image to 3D
   - GLB generation

4. **Embeddings (v3)**
   - Visual similarity search
   - Catalog search

**Implementation:**
- Store API keys securely (environment variables)
- Track token usage per job
- Cost calculation and quota enforcement
- Error handling and retries

#### 5. External Service Integration

**Photogrammetry:**
- Meshroom (open-source, requires GPU)
- RealityCapture (commercial, API/CLI)
- Polycam or Luma AI (cloud APIs)

**NeRF:**
- NVIDIA instant-ngp (local GPU)
- Nerfstudio (Python library)

**3D Processing:**
- Blender (headless via Python API)
- Open3D (mesh processing)
- MeshLab (CLI for cleanup)

**USDZ Conversion:**
- Apple Reality Converter (macOS)
- usd_from_gltf (USD tools)

#### 6. CDN & Storage

**Current:** Supabase Storage
**Production:**
- AWS S3 for raw/processed assets
- CloudFront CDN for delivery
- Signed URLs for secure downloads
- Lifecycle policies for cost optimization

#### 7. Monitoring & Observability

**Tools:**
- Prometheus + Grafana for metrics
- Sentry for error tracking
- CloudWatch/Stackdriver for logs
- Custom dashboards for:
  - Job processing times
  - GPU utilization
  - API costs (OpenAI usage)
  - User quotas

## Data Flow Example: Upload to 3D Model

1. **User uploads images** → Frontend UploadZone
2. **Images stored** → Supabase Storage (`images` bucket)
3. **Upload record created** → `uploads` table
4. **Image records created** → `images` table with URLs
5. **User requests segmentation** → Create job in `jobs` table
6. **Segmentation worker processes** → GPT Vision API → masks returned
7. **User requests 3D generation** → Create job with mode (photogrammetry/nerf/single)
8. **3D worker processes** → Photogrammetry pipeline → GLB/USDZ exported
9. **Model record created** → `models_3d` table with URLs
10. **Frontend displays model** → Viewer3D component (model-viewer)

## API Contracts (Frontend Already Implements These)

### Upload Images
```typescript
POST /api/v1/uploads
Request: FormData with files
Response: {
  uploadId: string,
  images: [{ id: string, url: string }],
  status: string
}
```

### Create Segmentation Job
```typescript
POST /api/v1/process/segment
Body: {
  uploadId: string,
  options: { detect_components: boolean, detect_wood: boolean }
}
Response: {
  jobId: string,
  status: string
}
```

### Create Stain Job
```typescript
POST /api/v1/process/stain
Body: {
  uploadId: string,
  targetColor: string,
  options: { preserveGrain: number, strength: number }
}
Response: {
  jobId: string,
  status: string
}
```

### Create 3D Generation Job
```typescript
POST /api/v1/process/3d
Body: {
  uploadId: string,
  mode: 'photogrammetry' | 'nerf' | 'single_image',
  options: { ... }
}
Response: {
  jobId: string,
  status: string
}
```

### Create Render Job
```typescript
POST /api/v1/render/360
Body: {
  modelId: string,
  options: { frames: number, resolution: string }
}
Response: {
  jobId: string,
  status: string
}
```

### Get Job Status
```typescript
GET /api/v1/jobs/{jobId}
Response: {
  id: string,
  type: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  input_data: object,
  output_data: object,
  error_message: string | null,
  ...
}
```

## Security Considerations

### Implemented:
- RLS on all database tables
- User ownership checks
- Storage bucket policies
- Session-based authentication
- Signed URLs for downloads

### To Implement:
- API rate limiting
- Job cost quotas per user
- Webhook signature verification
- Input validation and sanitization
- CORS policies for API
- API key rotation
- Audit logging

## Deployment Architecture

### Frontend (Current)
- Vite + React + TypeScript
- Deployed to Vercel/Netlify/CloudFlare Pages
- Environment variables for Supabase

### Backend (To Implement)
```
┌─────────────┐
│   Frontend  │ (Vite + React)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Supabase   │ (Auth + DB + Storage)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ API Gateway │ (NestJS / FastAPI)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Job Queue   │ (Redis / RabbitMQ)
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────────────┐
│         GPU Worker Pool                  │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │ Segment  │  │  Stain   │  │   3D   ││
│  └──────────┘  └──────────┘  └────────┘│
│  ┌──────────┐  ┌──────────┐            │
│  │  Render  │  │  Export  │            │
│  └──────────┘  └──────────┘            │
└─────────────────────────────────────────┘
       │
       ↓
┌─────────────┐
│  S3 + CDN   │ (Asset Storage)
└─────────────┘
```

## Performance Targets

- **Segmentation**: < 10s (GPU)
- **Stain Recolor**: < 30s (GPU)
- **3D Generation**:
  - Single image: < 2 minutes
  - NeRF: 10-30 minutes
  - Photogrammetry: 30 minutes - 2 hours (depending on images)
- **360° Render**: < 5 minutes
- **Export**: < 30s

## Cost Estimation

Per job approximate costs:
- **Segmentation**: $0.10 (OpenAI API)
- **Stain Recolor**: $0.05-0.15 (OpenAI API + compute)
- **3D Generation**: $0.50-2.00 (depending on method)
- **360° Render**: $0.10 (compute)
- **Storage**: $0.01/GB/month

GPU instance costs:
- p3.2xlarge (1x V100): ~$3/hour
- p4d.24xlarge (8x A100): ~$32/hour

## Next Steps to Production

### Phase 1: MVP Backend (2-4 weeks)
1. Set up API Gateway (NestJS/FastAPI)
2. Implement job queue (Redis)
3. Create basic worker for stain recolor (OpenAI API only)
4. Deploy to ECS/EKS with 1 GPU instance
5. Test end-to-end flow

### Phase 2: 3D Pipeline (4-6 weeks)
1. Implement single-image 3D (Shap-E)
2. Set up Blender headless rendering
3. Add export worker for multiple formats
4. Implement USDZ conversion

### Phase 3: Advanced Processing (6-8 weeks)
1. Implement photogrammetry pipeline
2. Add NeRF support
3. Optimize texture baking
4. Add 360° video generation

### Phase 4: Scale & Optimize (4-6 weeks)
1. Implement autoscaling
2. Add monitoring and alerting
3. Optimize costs (spot instances, caching)
4. Add webhook notifications
5. Implement quota system

### Phase 5: Integrations (2-4 weeks)
1. Shopify API integration
2. BigCommerce integration
3. Webhook system for external services
4. Analytics and reporting

## Technology Stack Summary

**Frontend:**
- React 18 + TypeScript
- Tailwind CSS
- Lucide React (icons)
- Google model-viewer
- Supabase Client

**Backend (To Build):**
- API: NestJS (Node.js) or FastAPI (Python)
- Queue: Redis + RQ or RabbitMQ
- Workers: Python (for ML/3D) + Node.js (for API)
- GPU: NVIDIA CUDA containers

**AI/ML:**
- OpenAI API (GPT Vision, DALL·E, Shap-E, Embeddings)
- Custom CNNs for intrinsic decomposition
- Photogrammetry: Meshroom/RealityCapture
- NeRF: instant-ngp/Nerfstudio

**Infrastructure:**
- Database: Supabase (PostgreSQL)
- Storage: Supabase Storage → AWS S3 + CloudFront
- Compute: AWS ECS/EKS or GCP GKE
- GPU: p3/p4 instances
- Monitoring: Prometheus + Grafana + Sentry

**3D Tools:**
- Blender (headless)
- Open3D, MeshLab
- Apple Reality Converter
- USD tools

## Development Setup

1. Clone repository
2. Install dependencies: `npm install`
3. Set up environment variables (`.env`)
4. Run development server: `npm run dev`
5. Build for production: `npm run build`

## Environment Variables

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Database Migrations

All migrations are in Supabase SQL Editor or via the Supabase CLI. Current migrations:
1. `create_furniture_visualizer_schema` - Main tables
2. `create_storage_bucket` - Storage setup

## License

Proprietary - All rights reserved
