/*
  # DAM & Product Visualizer Platform Schema

  ## Overview
  Complete database schema for furniture visualization, configuration, and AR platform.

  ## New Tables

  ### Core Tables
  1. **profiles**
     - User profile and role management
     - Links to auth.users
     - Role-based access control (admin, editor, client)

  2. **products**
     - Main product catalog
     - Product metadata, pricing, categories
     - Componentization support

  3. **product_components**
     - Individual components (legs, cushions, fabrics, hardware)
     - Type, material, availability

  4. **uploads**
     - Upload sessions for images
     - Metadata and processing status

  5. **images**
     - Individual images with EXIF, camera data
     - Segmentation masks and embeddings
     - Multi-view support

  6. **textures**
     - PBR texture sets (albedo, normal, roughness, AO)
     - Stain color and grain preservation settings

  7. **models_3d**
     - 3D model assets (GLB, USDZ, FBX)
     - Quality metrics, component mapping
     - Generation method (photogrammetry, nerf, single-image)

  8. **configurations**
     - Saved product configurations
     - Component selections and custom options

  9. **jobs**
     - Processing job queue and status
     - Job types: segment, stain, 3d, render, export
     - Cost tracking and webhook URLs

  10. **stain_library**
      - Available wood stains with color codes
      - Preview images and material properties

  11. **fabric_library**
      - Available fabrics with textures
      - PBR properties

  12. **render_outputs**
      - 360° spin videos, turntable assets
      - AR-ready exports

  ## Security
  - RLS enabled on all tables
  - Policies enforce user ownership and role-based access
  - Public read for catalog items, authenticated write
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'editor', 'client')),
  company text,
  avatar_url text,
  quota_limit integer DEFAULT 100,
  quota_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  base_price numeric(10,2),
  sku text UNIQUE,
  is_public boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own products"
  ON products FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public products"
  ON products FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Product components table
CREATE TABLE IF NOT EXISTS product_components (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('leg', 'cushion', 'fabric', 'hardware', 'frame', 'other')),
  material text,
  is_default boolean DEFAULT false,
  price_modifier numeric(10,2) DEFAULT 0,
  mesh_url text,
  thumbnail_url text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view components of own products"
  ON product_components FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_components.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert components for own products"
  ON product_components FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_components.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update components of own products"
  ON product_components FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_components.product_id
      AND products.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_components.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete components of own products"
  ON product_components FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_components.product_id
      AND products.user_id = auth.uid()
    )
  );

-- Uploads table
CREATE TABLE IF NOT EXISTS uploads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  status text DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own uploads"
  ON uploads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own uploads"
  ON uploads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own uploads"
  ON uploads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Images table
CREATE TABLE IF NOT EXISTS images (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_id uuid REFERENCES uploads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  url text NOT NULL,
  thumbnail_url text,
  width integer,
  height integer,
  camera_angle text,
  exif_data jsonb DEFAULT '{}',
  masks jsonb DEFAULT '[]',
  embeddings_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own images"
  ON images FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images"
  ON images FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own images"
  ON images FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own images"
  ON images FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Textures table
CREATE TABLE IF NOT EXISTS textures (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  albedo_url text NOT NULL,
  normal_url text,
  roughness_url text,
  ao_url text,
  preview_url text,
  stain_color text,
  preserve_grain numeric(3,2) DEFAULT 1.0 CHECK (preserve_grain >= 0 AND preserve_grain <= 1),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE textures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own textures"
  ON textures FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own textures"
  ON textures FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own textures"
  ON textures FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own textures"
  ON textures FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3D Models table
CREATE TABLE IF NOT EXISTS models_3d (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  upload_id uuid REFERENCES uploads(id) ON DELETE SET NULL,
  name text NOT NULL,
  glb_url text,
  usdz_url text,
  fbx_url text,
  gltf_url text,
  generation_method text CHECK (generation_method IN ('photogrammetry', 'nerf', 'single_image', 'manual')),
  quality_score numeric(3,2),
  polygon_count integer,
  texture_id uuid REFERENCES textures(id) ON DELETE SET NULL,
  component_mapping jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE models_3d ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own 3D models"
  ON models_3d FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own 3D models"
  ON models_3d FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own 3D models"
  ON models_3d FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own 3D models"
  ON models_3d FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Configurations table
CREATE TABLE IF NOT EXISTS configurations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  name text,
  components jsonb DEFAULT '{}',
  custom_options jsonb DEFAULT '{}',
  total_price numeric(10,2),
  preview_url text,
  is_saved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own configurations"
  ON configurations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own configurations"
  ON configurations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own configurations"
  ON configurations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own configurations"
  ON configurations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('segment', 'stain', '3d', 'render', 'export')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  input_data jsonb NOT NULL,
  output_data jsonb DEFAULT '{}',
  error_message text,
  cost_estimate numeric(10,2),
  cost_actual numeric(10,2),
  webhook_url text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Stain library table
CREATE TABLE IF NOT EXISTS stain_library (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  color_hex text NOT NULL,
  color_lab jsonb,
  category text,
  preview_url text,
  texture_sample_url text,
  is_public boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stain_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public stains"
  ON stain_library FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Admins can insert stains"
  ON stain_library FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Fabric library table
CREATE TABLE IF NOT EXISTS fabric_library (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  category text,
  color text,
  texture_id uuid REFERENCES textures(id) ON DELETE SET NULL,
  preview_url text,
  is_public boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fabric_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public fabrics"
  ON fabric_library FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Admins can insert fabrics"
  ON fabric_library FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Render outputs table
CREATE TABLE IF NOT EXISTS render_outputs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  model_id uuid REFERENCES models_3d(id) ON DELETE CASCADE,
  type text CHECK (type IN ('360_video', 'turntable', 'ar_preview', 'thumbnail')),
  mp4_url text,
  gif_url text,
  thumbnail_urls jsonb DEFAULT '[]',
  frames integer,
  resolution text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE render_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own render outputs"
  ON render_outputs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own render outputs"
  ON render_outputs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own render outputs"
  ON render_outputs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_images_upload_id ON images(upload_id);
CREATE INDEX IF NOT EXISTS idx_models_3d_product_id ON models_3d(product_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id_status ON jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_configurations_product_id ON configurations(product_id);

-- Insert some default stains
INSERT INTO stain_library (name, color_hex, category, is_public) VALUES
  ('Natural Oak', '#D4A574', 'light', true),
  ('Walnut', '#5A3B2E', 'dark', true),
  ('Cherry', '#8B4513', 'medium', true),
  ('Espresso', '#2C1810', 'dark', true),
  ('White Wash', '#E8D8C8', 'light', true),
  ('Mahogany', '#6B3410', 'dark', true)
ON CONFLICT DO NOTHING;