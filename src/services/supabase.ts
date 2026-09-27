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

// Database row interface for 'campaign_settings' table
export interface DbCampaignSettingsRow {
  id: string;
  campaign_name?: string;
  campaign_code?: string;
  end_date?: string;
  catalogs?: any;
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
 * Maps frontend CampaignConfig to database campaign_settings row
 */
export const mapCampaignToSettingsRow = (config: CampaignConfig) => {
  const campaignName = config.campaignNumber || 'C-15 (2026)';
  const codeMatch = campaignName.match(/C-\d+/i);
  const campaignCode = codeMatch ? codeMatch[0].toUpperCase() : 'C-15';

  return {
    id: 'current_campaign',
    campaign_name: campaignName,
    campaign_code: campaignCode,
    end_date: config.closingDate,
    catalogs: {
      ésika: config.catalogPdfUrls?.ésika || config.catalogUrls?.ésika || '',
      cyzone: config.catalogPdfUrls?.cyzone || config.catalogUrls?.cyzone || '',
      lbel: config.catalogPdfUrls?.lbel || config.catalogUrls?.lbel || '',
      pdfUrls: config.catalogPdfUrls,
      catalogUrls: config.catalogUrls,
      pdfInfo: config.catalogPdfInfo,
      whatsappNumber: config.whatsappNumber,
      consultantName: config.consultantName,
    },
    updated_at: new Date().toISOString(),
  };
};

/**
 * Maps database catalog/campaign_settings row to frontend CampaignConfig
 */
export const mapRowToCampaign = (row: DbCatalogRow | DbCampaignSettingsRow | any): CampaignConfig => {
  if (!row) return {
    campaignNumber: 'C-15 (2026)',
    closingDate: new Date(Date.now() + 4 * 86400000).toISOString(),
    whatsappNumber: '573001234567',
    consultantName: 'Asesoría Lausser',
    catalogUrls: {
      ésika: 'https://esika.tiendabelcorp.com.co/catalogo-digital',
      cyzone: 'https://cyzone.tiendabelcorp.com.co/catalogo-digital',
      lbel: 'https://lbel.tiendabelcorp.com.co/catalogo-digital',
    },
    catalogPdfUrls: { ésika: '', cyzone: '', lbel: '' },
    catalogPdfInfo: {},
  };

  const rawCatalogs = row.catalogs || {};
  const isSettingsFormat = Boolean(row.campaign_name || row.campaign_code || row.end_date || row.catalogs);

  const campaignNumber = row.campaign_name || row.campaign_code || row.campaign_number || row.campaignNumber || 'C-15 (2026)';
  
  // Extraer end_date o closing_date asegurando un string ISO válido
  const rawDate = row.end_date || row.closing_date || row.closingDate;
  let closingDate: string;
  if (rawDate && !isNaN(new Date(rawDate).getTime())) {
    closingDate = new Date(rawDate).toISOString();
  } else {
    closingDate = new Date(Date.now() + 4 * 86400000).toISOString();
  }

  const whatsappNumber = rawCatalogs.whatsappNumber || row.whatsapp_number || row.whatsappNumber || '573001234567';
  const consultantName = rawCatalogs.consultantName || row.consultant_name || row.consultantName || 'Asesoría Lausser';

  // Digital catalog viewer URLs
  const defaultWeb = {
    ésika: 'https://esika.tiendabelcorp.com.co/catalogo-digital',
    cyzone: 'https://cyzone.tiendabelcorp.com.co/catalogo-digital',
    lbel: 'https://lbel.tiendabelcorp.com.co/catalogo-digital',
  };

  const catalogUrls = isSettingsFormat
    ? {
        ésika: rawCatalogs.catalogUrls?.ésika || (typeof rawCatalogs.ésika === 'string' && !rawCatalogs.ésika.endsWith('.pdf') ? rawCatalogs.ésika : '') || (typeof rawCatalogs.ésika === 'object' ? rawCatalogs.ésika?.webUrl : '') || defaultWeb.ésika,
        cyzone: rawCatalogs.catalogUrls?.cyzone || (typeof rawCatalogs.cyzone === 'string' && !rawCatalogs.cyzone.endsWith('.pdf') ? rawCatalogs.cyzone : '') || (typeof rawCatalogs.cyzone === 'object' ? rawCatalogs.cyzone?.webUrl : '') || defaultWeb.cyzone,
        lbel: rawCatalogs.catalogUrls?.lbel || (typeof rawCatalogs.lbel === 'string' && !rawCatalogs.lbel.endsWith('.pdf') ? rawCatalogs.lbel : '') || (typeof rawCatalogs.lbel === 'object' ? rawCatalogs.lbel?.webUrl : '') || defaultWeb.lbel,
      }
    : (row.catalog_urls || row.catalogUrls || defaultWeb);

  // PDF catalog URLs (Google Drive, Somos Belcorp, Supabase Storage o enlaces directos)
  const catalogPdfUrls = isSettingsFormat
    ? {
        ésika: rawCatalogs.pdfUrls?.ésika || rawCatalogs.pdf_urls?.ésika || (typeof rawCatalogs.ésika === 'string' && (rawCatalogs.ésika.includes('drive.google.com') || rawCatalogs.ésika.endsWith('.pdf') || rawCatalogs.ésika.includes('/pdf') || rawCatalogs.ésika.includes('storage') || rawCatalogs.ésika.includes('belcorp')) ? rawCatalogs.ésika : '') || (typeof rawCatalogs.ésika === 'object' ? rawCatalogs.ésika?.pdfUrl : '') || '',
        cyzone: rawCatalogs.pdfUrls?.cyzone || rawCatalogs.pdf_urls?.cyzone || (typeof rawCatalogs.cyzone === 'string' && (rawCatalogs.cyzone.includes('drive.google.com') || rawCatalogs.cyzone.endsWith('.pdf') || rawCatalogs.cyzone.includes('/pdf') || rawCatalogs.cyzone.includes('storage') || rawCatalogs.cyzone.includes('belcorp')) ? rawCatalogs.cyzone : '') || (typeof rawCatalogs.cyzone === 'object' ? rawCatalogs.cyzone?.pdfUrl : '') || '',
        lbel: rawCatalogs.pdfUrls?.lbel || rawCatalogs.pdf_urls?.lbel || (typeof rawCatalogs.lbel === 'string' && (rawCatalogs.lbel.includes('drive.google.com') || rawCatalogs.lbel.endsWith('.pdf') || rawCatalogs.lbel.includes('/pdf') || rawCatalogs.lbel.includes('storage') || rawCatalogs.lbel.includes('belcorp')) ? rawCatalogs.lbel : '') || (typeof rawCatalogs.lbel === 'object' ? rawCatalogs.lbel?.pdfUrl : '') || '',
      }
    : (row.catalog_pdf_urls || row.catalogPdfUrls || { ésika: '', cyzone: '', lbel: '' });

  // PDF metadata
  const rawPdfInfo = isSettingsFormat
    ? (rawCatalogs.pdfInfo || rawCatalogs.pdf_info || {})
    : (row.catalog_pdf_info || row.catalogPdfInfo || {});

  const catalogPdfInfo: CampaignConfig['catalogPdfInfo'] = {
    ésika: rawPdfInfo.ésika || (catalogPdfUrls.ésika ? {
      fileName: catalogPdfUrls.ésika.split('/').pop()?.split('?')[0] || 'catalogo-ésika.pdf',
      fileSize: 0,
      updatedAt: row.updated_at || new Date().toISOString(),
      isUploaded: true,
    } : null),
    cyzone: rawPdfInfo.cyzone || (catalogPdfUrls.cyzone ? {
      fileName: catalogPdfUrls.cyzone.split('/').pop()?.split('?')[0] || 'catalogo-cyzone.pdf',
      fileSize: 0,
      updatedAt: row.updated_at || new Date().toISOString(),
      isUploaded: true,
    } : null),
    lbel: rawPdfInfo.lbel || (catalogPdfUrls.lbel ? {
      fileName: catalogPdfUrls.lbel.split('/').pop()?.split('?')[0] || 'catalogo-lbel.pdf',
      fileSize: 0,
      updatedAt: row.updated_at || new Date().toISOString(),
      isUploaded: true,
    } : null),
  };

  return {
    campaignNumber,
    closingDate,
    whatsappNumber,
    consultantName,
    catalogUrls,
    catalogPdfUrls,
    catalogPdfInfo,
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
    // 1. Prioriza consulta a la tabla 'campaign_settings' con id 'current_campaign'
    const { data: campData, error: campError } = await supabase
      .from('campaign_settings')
      .select('*')
      .eq('id', 'current_campaign')
      .single();

    if (!campError && campData) {
      return mapRowToCampaign(campData);
    }

    // 2. Fallback a la tabla 'catalogs'
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
    // 1. Guardar en campaign_settings
    const settingsRow = mapCampaignToSettingsRow(config);
    const { error: settingsError } = await supabase
      .from('campaign_settings')
      .upsert(settingsRow);

    if (settingsError) {
      console.warn('[Supabase] Warning saving campaign_settings:', settingsError.message);
    }

    // 2. Guardar también en catalogs para retrocompatibilidad
    const row = mapCampaignToRow(config);
    const { error } = await supabase
      .from('catalogs')
      .upsert(row, { onConflict: 'id' });

    if (error && settingsError) {
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

  const campChannel = supabase
    .channel('campaign-settings-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'campaign_settings' },
      (payload) => {
        if (payload.new) {
          const config = mapRowToCampaign(payload.new as DbCampaignSettingsRow);
          onChange(config);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
    supabase.removeChannel(campChannel);
  };
};
