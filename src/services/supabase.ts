import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Product, CampaignConfig, ActiveBrand, ProductCategory } from '../types';

// Environment variables for Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * Checks if valid Supabase credentials are configured in environment variables.
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project') &&
    supabaseAnonKey.length > 20
  );
};

/**
 * Singleton Supabase client instance (or null when not configured)
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

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
  const rawDiscount = row.discount_price !== null && row.discount_price !== undefined
    ? Number(row.discount_price)
    : (row.discountPrice !== null && row.discountPrice !== undefined ? Number(row.discountPrice) : undefined);

  return {
    id: String(row.id),
    name: String(row.name || ''),
    brand: ['ésika', 'cyzone', 'lbel'].includes(brand) ? brand : 'ésika',
    category,
    code: row.code ? String(row.code) : undefined,
    price: rawPrice > 0 && rawPrice < 1000 ? Math.round(rawPrice * 1000) : Math.round(rawPrice),
    discountPrice: rawDiscount && rawDiscount > 0 && rawDiscount < 1000
      ? Math.round(rawDiscount * 1000)
      : (rawDiscount ? Math.round(rawDiscount) : undefined),
    stock: Math.max(0, parseInt(String(row.stock), 10) || 0),
    imageUrl: String(row.image_url || row.imageUrl || ''),
    description: String(row.description || ''),
    rating: row.rating ? Number(row.rating) : 4.9,
    isFeatured: Boolean(row.is_featured ?? row.isFeatured ?? false),
    volumeOrSize: row.volume_or_size || row.volumeOrSize || undefined,
  };
};

/**
 * Maps frontend Product model to database row representation
 */
export const mapProductToRow = (product: Product | (Omit<Product, 'id'> & { id?: string })) => {
  return {
    ...(product.id ? { id: product.id } : {}),
    name: product.name,
    brand: product.brand,
    category: product.category,
    code: product.code || null,
    price: product.price,
    discount_price: product.discountPrice ?? null,
    stock: product.stock,
    image_url: product.imageUrl,
    description: product.description || '',
    rating: product.rating ?? 4.9,
    is_featured: Boolean(product.isFeatured),
    volume_or_size: product.volumeOrSize || null,
    updated_at: new Date().toISOString(),
  };
};

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

/**
 * Fetches all products from Supabase 'products' table.
 * Returns null if Supabase is not configured or query fails.
 */
export const fetchProductsFromDb = async (): Promise<Product[] | null> => {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] Error fetching products:', error.message);
      return null;
    }

    if (!data) return [];
    return data.map(mapRowToProduct);
  } catch (err) {
    console.warn('[Supabase] Exception fetching products:', err);
    return null;
  }
};

/**
 * Inserts a new product into Supabase.
 */
export const createProductInDb = async (product: Product): Promise<Product | null> => {
  if (!supabase) return null;

  try {
    const row = mapProductToRow(product);
    const { data, error } = await supabase
      .from('products')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error creating product:', error.message);
      return null;
    }

    return mapRowToProduct(data);
  } catch (err) {
    console.error('[Supabase] Exception creating product:', err);
    return null;
  }
};

/**
 * Updates an existing product in Supabase.
 */
export const updateProductInDb = async (product: Product): Promise<Product | null> => {
  if (!supabase) return null;

  try {
    const row = mapProductToRow(product);
    const { data, error } = await supabase
      .from('products')
      .update(row)
      .eq('id', product.id)
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error updating product:', error.message);
      return null;
    }

    return mapRowToProduct(data);
  } catch (err) {
    console.error('[Supabase] Exception updating product:', err);
    return null;
  }
};

/**
 * Deletes a product from Supabase by ID.
 */
export const deleteProductInDb = async (id: string): Promise<boolean> => {
  if (!supabase) return false;

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

/**
 * Deletes all products in Supabase.
 */
export const clearAllProductsInDb = async (): Promise<boolean> => {
  if (!supabase) return false;

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

/**
 * Batch seeds products into Supabase (e.g. for initial migration or demo reset).
 */
export const seedProductsInDb = async (products: Product[]): Promise<boolean> => {
  if (!supabase || products.length === 0) return false;

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

/**
 * Fetches the active campaign and catalog config from Supabase.
 */
export const fetchCampaignConfigFromDb = async (): Promise<CampaignConfig | null> => {
  if (!supabase) return null;

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

/**
 * Saves or updates campaign and catalog config in Supabase.
 */
export const saveCampaignConfigInDb = async (config: CampaignConfig): Promise<boolean> => {
  if (!supabase) return false;

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

/**
 * Subscribes to real-time changes in the 'products' table.
 * Calls onInsert, onUpdate, or onDelete when another device (e.g. admin phone) changes products.
 */
export const subscribeToProductsRealtime = (
  onInsert: (product: Product) => void,
  onUpdate: (product: Product) => void,
  onDelete: (id: string) => void
): (() => void) => {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('lausser-products-realtime')
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

/**
 * Subscribes to real-time changes in the 'catalogs' table.
 */
export const subscribeToCatalogsRealtime = (
  onChange: (config: CampaignConfig) => void
): (() => void) => {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('lausser-catalogs-realtime')
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
