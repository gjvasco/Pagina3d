-- ==========================================================================
-- 3D PRINT HUB - ESQUEMA DE BASE DE DATOS PARA SUPABASE (POSTGRESQL)
-- Copia y pega este script en el SQL Editor de tu proyecto en Supabase
-- ==========================================================================

-- 1. Tabla de Impresoras
CREATE TABLE IF NOT EXISTS printers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactiva',
  nozzle_size NUMERIC DEFAULT 0.4,
  build_volume TEXT,
  wattage INTEGER DEFAULT 200,
  total_hours NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Carretes de Filamento / Resina
CREATE TABLE IF NOT EXISTS spools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  brand TEXT,
  color TEXT DEFAULT '#00f2fe',
  initial_weight INTEGER DEFAULT 1000,
  remaining_weight INTEGER DEFAULT 1000,
  cost NUMERIC DEFAULT 20.00,
  nozzle_temp TEXT,
  bed_temp TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Trabajos de Impresión
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  printer_id TEXT REFERENCES printers(id) ON DELETE SET NULL,
  spool_id TEXT REFERENCES spools(id) ON DELETE SET NULL,
  weight_grams INTEGER DEFAULT 0,
  print_time_hours NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completado',
  failure_reason TEXT,
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Ventas y Cotizaciones
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  job_title TEXT NOT NULL,
  client_name TEXT NOT NULL,
  sale_price NUMERIC DEFAULT 0.00,
  total_cost NUMERIC DEFAULT 0.00,
  profit NUMERIC DEFAULT 0.00,
  payment_status TEXT DEFAULT 'pendiente',
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar acceso de lectura y escritura para la clave pública (Anon)
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE spools ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso total anonimo para printers" ON printers FOR ALL USING (true);
CREATE POLICY "Acceso total anonimo para spools" ON spools FOR ALL USING (true);
CREATE POLICY "Acceso total anonimo para jobs" ON jobs FOR ALL USING (true);
CREATE POLICY "Acceso total anonimo para sales" ON sales FOR ALL USING (true);
