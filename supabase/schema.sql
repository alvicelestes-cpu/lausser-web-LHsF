-- ==============================================================================
-- LAUSSER-WEB: ESQUEMA DE BASE DE DATOS SUPABASE
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase (https://app.supabase.com)
-- ==============================================================================

-- 1. TABLA: products (Inventario de entrega inmediata)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL CHECK (brand IN ('ésika', 'cyzone', 'lbel')),
  category TEXT NOT NULL,
  code TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  discount_price NUMERIC,
  stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL,
  description TEXT DEFAULT '',
  rating NUMERIC DEFAULT 4.9,
  is_featured BOOLEAN DEFAULT false,
  volume_or_size TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

-- 2. TABLA: catalogs (Configuración de campaña y enlaces a catálogos/revistas)
CREATE TABLE IF NOT EXISTS public.catalogs (
  id TEXT PRIMARY KEY DEFAULT 'active',
  campaign_number TEXT NOT NULL DEFAULT 'C-14 (2026)',
  closing_date TIMESTAMPTZ NOT NULL,
  whatsapp_number TEXT NOT NULL DEFAULT '573001234567',
  consultant_name TEXT NOT NULL DEFAULT 'Asesoría Lausser',
  catalog_urls JSONB NOT NULL DEFAULT '{
    "ésika": "https://esika.tiendabelcorp.com.co/catalogo-digital",
    "cyzone": "https://cyzone.tiendabelcorp.com.co/catalogo-digital",
    "lbel": "https://lbel.tiendabelcorp.com.co/catalogo-digital"
  }'::jsonb,
  catalog_pdf_urls JSONB NOT NULL DEFAULT '{
    "ésika": "https://esika.tiendabelcorp.com.co/catalogo-digital",
    "cyzone": "https://cyzone.tiendabelcorp.com.co/catalogo-digital",
    "lbel": "https://lbel.tiendabelcorp.com.co/catalogo-digital"
  }'::jsonb,
  catalog_pdf_info JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogs ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE ACCESO PÚBLICO / ANON
-- Permitir lectura a todos los usuarios (clientes y administradores)
DROP POLICY IF EXISTS "Public read access for products" ON public.products;
CREATE POLICY "Public read access for products" 
  ON public.products 
  FOR SELECT 
  TO anon, authenticated 
  USING (true);

DROP POLICY IF EXISTS "Public read access for catalogs" ON public.catalogs;
CREATE POLICY "Public read access for catalogs" 
  ON public.catalogs 
  FOR SELECT 
  TO anon, authenticated 
  USING (true);

-- Permitir mutaciones (inserción, actualización, eliminación) para la administración de la tienda
DROP POLICY IF EXISTS "Allow mutations on products" ON public.products;
CREATE POLICY "Allow mutations on products" 
  ON public.products 
  FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow mutations on catalogs" ON public.catalogs;
CREATE POLICY "Allow mutations on catalogs" 
  ON public.catalogs 
  FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

-- 5. HABILITAR TIEMPO REAL (REALTIME)
-- Permite que cuando el administrador guarde en su celular, los clientes vean el cambio de inmediato
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.catalogs;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- 6. DATOS INICIALES (SEMILLA / SEED DATA)
-- Campaña activa por defecto
INSERT INTO public.catalogs (
  id,
  campaign_number,
  closing_date,
  whatsapp_number,
  consultant_name,
  catalog_urls,
  catalog_pdf_urls
) VALUES (
  'active',
  'C-14 (2026)',
  NOW() + interval '4 days',
  '573001234567',
  'Asesoría Lausser',
  '{
    "ésika": "https://esika.tiendabelcorp.com.co/catalogo-digital",
    "cyzone": "https://cyzone.tiendabelcorp.com.co/catalogo-digital",
    "lbel": "https://lbel.tiendabelcorp.com.co/catalogo-digital"
  }'::jsonb,
  '{
    "ésika": "https://esika.tiendabelcorp.com.co/catalogo-digital",
    "cyzone": "https://cyzone.tiendabelcorp.com.co/catalogo-digital",
    "lbel": "https://lbel.tiendabelcorp.com.co/catalogo-digital"
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Productos iniciales de prueba (Ésika, Cyzone, L'Bel)
INSERT INTO public.products (id, name, brand, category, code, price, discount_price, stock, image_url, description, rating, is_featured, volume_or_size)
VALUES
  ('esk-01', 'Perfume Red Power Ésika 50ml', 'ésika', 'perfumeria', '18492', 89000, 62000, 5, 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=700&q=80', 'Aroma oriental dulce con notas de flor de naranjo y néctar de grosella roja. Máxima duración y fijación premium.', 4.9, true, '50 ml'),
  ('esk-02', 'Labial Colorfix Duo Tattoo 24H', 'ésika', 'maquillaje', '05432', 36000, 24900, 12, 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=700&q=80', 'Hasta 24 horas de color intacto. Cero retoques, no transfiere y cuenta con bálsamo hidratante para acabado satinado.', 4.8, true, 'Tono Rosa Soñadora'),
  ('esk-03', 'Máscara Mega Full Size Efecto Pestañas Postizas', 'ésika', 'maquillaje', '09811', 42000, 28000, 8, 'https://images.unsplash.com/photo-1631214524020-7e18db9a8f92?auto=format&fit=crop&w=700&q=80', 'Alargamiento extremo hasta por 24 horas. Cepillo flexible que curva y separa pestaña por pestaña a prueba de agua.', 4.9, false, '8 g - Negro Extremo'),
  ('esk-04', 'Perfume Pulso Ésika Masculino 100ml', 'ésika', 'perfumeria', '03219', 110000, 79900, 4, 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=700&q=80', 'Aroma amaderado seductor con cardamomo y cedro rojo. El perfume masculino #1 en ventas de Ésika.', 4.9, false, '100 ml'),
  ('esk-05', 'Crema Corporal Multicream Nutrición Almendras', 'ésika', 'cuidado_personal', '12401', 39000, 27500, 6, 'https://images.unsplash.com/photo-1608248597359-52e6945037d4?auto=format&fit=crop&w=700&q=80', 'Hidratación intensiva por 48 horas con óleo de almendras y vitamina E. Absorción rápida sin sensación grasosa.', 4.7, false, '1 Litro'),
  ('cyz-01', 'Perfume Sweet Black Cyzone 50ml', 'cyzone', 'perfumeria', '14210', 58000, 39900, 10, 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=700&q=80', 'Fragancia oriental dulce con notas de pink pomelo y sándalo. Intensa, juvenil y magnética.', 4.9, true, '50 ml'),
  ('cyz-02', 'Labial Mate Studio Look No Transfer', 'cyzone', 'maquillaje', '07541', 28000, 19900, 15, 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=700&q=80', 'Color mate de larga duración 16H. Fórmula no pegajosa y enriquecida con activos hidratantes.', 4.8, true, 'Tono Teddy Nude'),
  ('cyz-03', 'Delineador Plumón Studio Look Waterproof', 'cyzone', 'maquillaje', '08342', 24000, 16500, 9, 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=700&q=80', 'Trazo de alta precisión y negro ultra pigmentado que no se corre ni transfiere durante todo el día.', 4.7, false, 'Black Pro'),
  ('cyz-04', 'Perfume Nitro Intense Masculino Cyzone', 'cyzone', 'perfumeria', '11094', 64000, 44000, 7, 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=700&q=80', 'Frescura herbal energizante con acordes cítricos y notas de madera ambarada para el día a día.', 4.6, false, '100 ml'),
  ('cyz-05', 'Gel Limpiador Facial Purificante Skin First', 'cyzone', 'cuidado_facial', '06810', 32000, 22000, 11, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=700&q=80', 'Control de brillo y limpieza de poros con micro-burbujas botánicas y ácido salicílico suave.', 4.8, false, '120 g'),
  ('lbl-01', 'Perfume Liasson L''Bel Haute Parfumerie 50ml', 'lbel', 'perfumeria', '19041', 145000, 99000, 3, 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=700&q=80', 'La elegancia personificada. Notas florales de lirio del valle, jazmín de Grasse y maderas preciosas.', 5.0, true, '50 ml'),
  ('lbl-02', 'Sérum Concentré Total 10 Beneficios L''Bel', 'lbel', 'cuidado_facial', '02188', 168000, 118000, 4, 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=700&q=80', 'Tratamiento antiedad global que reactiva las células madre de la piel: firmeza, luminosidad y antiarrugas.', 4.9, true, '50 ml'),
  ('lbl-03', 'Sérum Hyaluronic Complex 3D L''Bel', 'lbel', 'cuidado_facial', '03411', 125000, 85000, 6, 'https://images.unsplash.com/photo-1608248597350-9366d0c75cbe?auto=format&fit=crop&w=700&q=80', 'Ácido Hialurónico puro en 3 pesos moleculares que hidrata en superficie y rellena arrugas profundas.', 5.0, false, '30 ml'),
  ('lbl-04', 'Base Clarifiant FPS 30 Tratamiento Antiedad L''Bel', 'lbel', 'maquillaje', '04910', 88000, 59900, 5, 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=700&q=80', 'Base de alta cobertura con acabado mate aterciopelado que aclara manchas progresivamente con FPS 30.', 4.8, false, '30 ml - Clair 2'),
  ('lbl-05', 'Perfume Bleu Intense Masculino L''Bel 100ml', 'lbel', 'perfumeria', '17202', 155000, 105000, 3, 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=700&q=80', 'Inspirado en la fuerza del mar. Aroma herbal acuático con notas de salvia francesa y vetiver de Haití.', 4.9, false, '100 ml')
ON CONFLICT (id) DO NOTHING;
