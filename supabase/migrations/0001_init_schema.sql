-- Tabla de perfiles (requerida por AuthContext.tsx y auth/registro/page.tsx,
-- y referenciada por las políticas RLS de admin más abajo)
CREATE TABLE perfiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'cliente'
    CHECK (rol IN ('admin','cliente','distribuidor')),
  telefono TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- Cada usuario puede leer y actualizar únicamente su propio perfil
CREATE POLICY "perfiles_lectura_propia" ON perfiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "perfiles_actualizacion_propia" ON perfiles
  FOR UPDATE USING (auth.uid() = id);

-- Un usuario recién registrado puede insertar su propio perfil (flujo de registro)
CREATE POLICY "perfiles_insercion_propia" ON perfiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Tabla de categorías
CREATE TABLE categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  icono TEXT NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de productos
CREATE TABLE productos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER NOT NULL DEFAULT 10,
  unidad TEXT NOT NULL DEFAULT 'unidad',
  categoria_id UUID REFERENCES categorias(id),
  icono TEXT DEFAULT '📦',
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de pedidos
CREATE TABLE pedidos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES auth.users(id),
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','confirmado','preparado','entregado','cancelado')),
  total DECIMAL(10,2) NOT NULL,
  telefono_contacto TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de items de pedido
CREATE TABLE pedido_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  nombre_producto TEXT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  cantidad INTEGER NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL
);

-- RLS para productos (lectura pública, escritura solo admin)
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "productos_lectura_publica" ON productos
  FOR SELECT USING (activo = TRUE);
CREATE POLICY "productos_admin" ON productos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- RLS para categorias
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categorias_lectura_publica" ON categorias
  FOR SELECT USING (activo = TRUE);
CREATE POLICY "categorias_admin" ON categorias
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- RLS para pedidos (usuario ve solo los suyos, admin ve todos)
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pedidos_usuario" ON pedidos
  FOR ALL USING (auth.uid() = usuario_id);
CREATE POLICY "pedidos_admin" ON pedidos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- RLS para pedido_items
ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items_via_pedido" ON pedido_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM pedidos WHERE id = pedido_id AND usuario_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- Datos iniciales de categorías
INSERT INTO categorias (nombre, icono, descripcion) VALUES
  ('Agroquímicos', '🧪', 'Fertilizantes, pesticidas y herbicidas'),
  ('Riego', '💧', 'Sistemas de riego tecnificado'),
  ('Cañerías', '🔧', 'Tuberías y accesorios'),
  ('Herramientas', '⚒️', 'Equipos y herramientas agrícolas'),
  ('Semillas', '🌱', 'Semillas certificadas de calidad');

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER pedidos_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
