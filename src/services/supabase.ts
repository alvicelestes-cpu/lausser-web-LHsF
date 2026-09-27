import { supabase } from '../lib/supabase';
import type { Product, CampaignConfig, ActiveBrand, ProductCategory } from '../types';

export { supabase };

/**
 * Checks if Supabase client is available (always true due to configured fallback)
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabase);
};

// Database row interface for 'products' table
export interface DbProductRow {
  id: string;
  name: string;
  brand: string;
  category: string;
  code: string | null;
  price: number;
  discount_price: number | null;
  discountPrice?: number | null;
  stock: number;
  image_url: string;
  imageUrl?: string;
  description: string | null;
  rating: number | null;
  is_featured: boolean | null;
  isFeatured?: boolean | null;
  volume_or_size: string | null;
  volumeOrSize?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Database row interface for 'catalogs' table
export interface DbCatalogRow {
  id: string;
  campaign_number: string;
  campaignNumber?: string;
  closing_date: string;
  closingDate?: string;
  whatsapp_number: string;
  whatsappNumber?: string;
  consultant_name: string;
  consultantName?: string;
  catalog_urls: Record<string, string>;
  catalogUrls?: Record<string, string>;
  catalog_pdf_urls: Record<string, string>;
  catalogPdfUrls?: Record<string, string>;
  catalog_pdf_info: Record<string, any> | null;
  catalogPdfInfo?: Record<string, any> | null;
  updated_at?: string;
}

/**
 * Maps database row (snake_case or camelCase) to frontend Product model
 */
export const mapRowToProduct = (row: DbProductRow | any): Product => {
  const brand = (row.brand || 'ésika').toLowerCase() as ActiveBrand;
  const category = (row.category || 'perfumeria') as ProductCategory;
  const rawPrice = Number(row.price) || 0;
  const rawOriginalPrice = row.original_price != null 
    ? Number(row.original_price) 
    : (row.discount_price != null ? Number(row.discount_price) : (row.discountPrice != null ? Number(row.discountPrice) : undefined));

  const image = String(row.image || row.image_url || row.imageUrl || '');
  const volume = row.volume || row.presentation || row.volume_or_size || row.volumeOrSize || undefined;
  const stock = row.stock != null ? Math.max(0, parseInt(String(row.stock), 10) || 0) : 1;

  const originalPrice = rawOriginalPrice 
    ? (rawOriginalPrice > 0 && rawOriginalPrice < 1000 ? Math.round(rawOriginalPrice * 1000) : Math.round(rawOriginalPrice)) 
    : undefined;
  const price = rawPrice > 0 && rawPrice < 1000 ? Math.round(rawPrice * 1000) : Math.round(rawPrice);

  return {
    id: String(row.id),
    name: String(row.name || ''),
    brand: ['ésika', 'cyzone', 'lbel'].includes(brand) ? brand : 'ésika',
    category,
    code: row.code ? String(row.code) : undefined,
    price,
    originalPrice,
    discountPrice: originalPrice,
    stock,
    image,
    imageUrl: image,
    image_url: image,
    volume,
    presentation: volume,
    volumeOrSize: volume,
    description: String(row.description || ''),
    rating: row.rating ? Number(row.rating) : 4.9,
    isFeatured: Boolean(row.is_featured ?? row.isFeatured ?? false),
    inStock: Boolean(row.in_stock ?? (stock > 0)),
  };
};

/**
 * Maps frontend Product model to sanitized database row representation
 * sending the exact columns specified for Supabase products table.
 */
export const sanitizeProductForDb = (product: any) => {
  const image = String(product.image || product.imageUrl || product.image_url || '');
  const volume = String(product.volume || product.presentation || product.volumeOrSize || '');

  return {
    id: String(product.id || ('prod-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7))),
    name: String(product.name || ''),
    brand: String(product.brand || ''),
    category: String(product.category || ''),
    price: Number(product.price || 0),
    original_price: product.originalPrice ? Number(product.originalPrice) : (product.discountPrice ? Number(product.discountPrice) : null),
    image,
    image_url: image,
    code: product.code ? String(product.code) : '',
    stock: Number(product.stock ?? 1),
    volume,
    presentation: volume,
  };
};

export const mapProductToRow = sanitizeProductForDb;

/**
 * Maps database catalog row to frontend CampaignConfig
 */
export const mapRowToCampaign = (row: DbCatalogRow | any): CampaignConfig => {
  return {
    campaignNumber: row.campaign_number || row.campaignNumber || 'C-14 (2026)',
    closingDate: row.closing_date || row.closingDate || new Date(Date.now() + 4 * 86400000).toISOString(),
    whatsappNumber: row.whatsapp_number || row.whatsappNumber || '573001234567',
    consultantName: row.consultant_name || row.consultantName || 'Asesoría Lausser',
    catalogUrls: row.catalog_urls || row.catalogUrls || {
      ésika: 'https://esika.tiendabelcorp.com.co/catalogo-digital',
      cyzone: 'https://cyzone.tiendabelcorp.com.co/catalogo-digital',
      lbel: 'https://lbel.tiendabelcorp.com.co/catalogo-digital',
    },
    catalogPdfUrls: row.catalog_pdf_urls || row.catalogPdfUrls || {
      ésika: 'https://esika.tiendabelcorp.com.co/catalogo-digital',
      cyzone: 'https://cyzone.tiendabelcorp.com.co/catalogo-digital',
      lbel: 'https://lbel.tiendabelcorp.com.co/catalogo-digital',
    },
    catalogPdfInfo: row.catalog_pdf_info || row.catalogPdfInfo || undefined,
  };
};

/**
 * Maps frontend CampaignConfig to database catalog row
 */
export const mapCampaignToRow = (config: CampaignConfig) => {
  return {
    id: 'active',
    campaign_number: config.campaignNumber,
    closing_date: config.closingDate,
    whatsapp_number: config.whatsappNumber,
    consultant_name: config.consultantName,
    catalog_urls: config.catalogUrls,
    catalog_pdf_urls: config.catalogPdfUrls,
    catalog_pdf_info: config.catalogPdfInfo || null,
    updated_at: new Date().toISOString(),
  };
};

// ==========================================
// SUPABASE PRODUCTS CRUD SERVICES
// ==========================================

export const fetchProductsFromDb = async (): Promise<Product[] | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] Error fetching products:', error.message);
      return null;
    }

    console.log('Productos cargados de Supabase:', data?.length);
    if (!data) return [];
    return data.map(mapRowToProduct);
  } catch (err) {
    console.warn('[Supabase] Exception fetching products:', err);
    return null;
  }
};

export const createProductInDb = async (product: Product): Promise<Product | null> => {
  try {
    const sanitizedProduct = sanitizeProductForDb(product);
    const { data, error } = await supabase
      .from('products')
      .upsert(sanitizedProduct);

    if (error) {
      console.error('ERROR AL GUARDAR EN SUPABASE:', error);
      alert('Error Supabase: ' + (error.message || JSON.stringify(error)));
      return null;
    }

    console.log('PRODUCTO GUARDADO EN SUPABASE:', data);
    return product;
  } catch (err) {
    console.error('ERROR AL GUARDAR EN SUPABASE (excepción):', err);
    alert('Error Supabase: ' + String(err));
    return null;
  }
};

export const updateProductInDb = async (product: Product): Promise<Product | null> => {
  try {
    const sanitizedProduct = sanitizeProductForDb(product);
    const { data, error } = await supabase
      .from('products')
      .upsert(sanitizedProduct);

    if (error) {
      console.error('ERROR AL GUARDAR EN SUPABASE:', error);
      alert('Error Supabase: ' + (error.message || JSON.stringify(error)));
      return null;
    }

    console.log('PRODUCTO GUARDADO EN SUPABASE:', data);
    return product;
  } catch (err) {
    console.error('ERROR AL GUARDAR EN SUPABASE (excepción):', err);
    alert('Error Supabase: ' + String(err));
    return null;
  }
};

export const deleteProductInDb = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Supabase] Error deleting product:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Supabase] Exception deleting product:', err);
    return false;
  }
};

export const clearAllProductsInDb = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .neq('id', '___non_existent___');

    if (error) {
      console.error('[Supabase] Error clearing products:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Supabase] Exception clearing products:', err);
    return false;
  }
};

export const seedProductsInDb = async (products: Product[]): Promise<boolean> => {
  if (products.length === 0) return false;

  try {
    const rows = products.map(mapProductToRow);
    const { error } = await supabase
      .from('products')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error('[Supabase] Error seeding products:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Supabase] Exception seeding products:', err);
    return false;
  }
};

// ==========================================
// SUPABASE CATALOGS / CAMPAIGN CRUD SERVICES
// ==========================================

export const fetchCampaignConfigFromDb = async (): Promise<CampaignConfig | null> => {
  try {
    const { data, error } = await supabase
      .from('catalogs')
      .select('*')
      .eq('id', 'active')
      .maybeSingle();

    if (error) {
      console.warn('[Supabase] Error fetching catalog config:', error.message);
      return null;
    }

    if (!data) return null;
    return mapRowToCampaign(data);
  } catch (err) {
    console.warn('[Supabase] Exception fetching catalog config:', err);
    return null;
  }
};

export const saveCampaignConfigInDb = async (config: CampaignConfig): Promise<boolean> => {
  try {
    const row = mapCampaignToRow(config);
    const { error } = await supabase
      .from('catalogs')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.error('[Supabase] Error saving catalog config:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Supabase] Exception saving catalog config:', err);
    return false;
  }
};

// ==========================================
// REAL-TIME SYNCHRONIZATION HELPERS
// ==========================================

export const subscribeToProductsRealtime = (
  onInsert: (product: Product) => void,
  onUpdate: (product: Product) => void,
  onDelete: (id: string) => void
): (() => void) => {
  const channel = supabase
    .channel('products-channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'products' },
      (payload) => {
        if (payload.new) {
          const product = mapRowToProduct(payload.new as DbProductRow);
          onInsert(product);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'products' },
      (payload) => {
        if (payload.new) {
          const product = mapRowToProduct(payload.new as DbProductRow);
          onUpdate(product);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'products' },
      (payload) => {
        if (payload.old && payload.old.id) {
          onDelete(String(payload.old.id));
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const subscribeToCatalogsRealtime = (
  onChange: (config: CampaignConfig) => void
): (() => void) => {
  const channel = supabase
    .channel('catalogs-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'catalogs' },
      (payload) => {
        if (payload.new) {
          const config = mapRowToCampaign(payload.new as DbCatalogRow);
          onChange(config);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
