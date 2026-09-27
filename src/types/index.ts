export type Brand = 'ésika' | 'cyzone' | 'lbel' | 'all';
export type ActiveBrand = 'ésika' | 'cyzone' | 'lbel';

export type ProductCategory = 
  | 'todos' 
  | 'perfumeria' 
  | 'maquillaje' 
  | 'cuidado_facial' 
  | 'cuidado_personal' 
  | 'moda_accesorios';

export interface Product {
  id: string;
  name: string;
  brand: ActiveBrand;
  category: ProductCategory;
  code?: string;
  price: number;
  discountPrice?: number;
  stock: number;
  imageUrl: string;
  description: string;
  rating?: number;
  isFeatured?: boolean;
  volumeOrSize?: string;
  originalPrice?: number;
  image?: string;
  image_url?: string;
  volume?: string;
  presentation?: string;
  inStock?: boolean;
}

export type CartItemType = 'stock' | 'campaign';

export interface CartItem {
  id: string;
  type: CartItemType;
  productId?: string;
  name: string;
  brand: ActiveBrand;
  price: number;
  quantity: number;
  imageUrl?: string;
  magazineCode?: string;
  magazinePage?: string;
  notes?: string;
}

export interface PdfCatalogInfo {
  fileName: string;
  fileSize: number;
  updatedAt: string;
  isUploaded?: boolean;
}

export interface CampaignConfig {
  campaignNumber: string;
  closingDate: string; // ISO date string
  whatsappNumber: string;
  consultantName: string;
  catalogUrls: {
    ésika: string;
    cyzone: string;
    lbel: string;
  };
  catalogPdfUrls: {
    ésika: string;
    cyzone: string;
    lbel: string;
  };
  catalogPdfInfo?: {
    ésika?: PdfCatalogInfo | null;
    cyzone?: PdfCatalogInfo | null;
    lbel?: PdfCatalogInfo | null;
  };
}

export interface CustomerOrderInfo {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  notes?: string;
  paymentMethod?: 'contra_entrega' | 'transferencia' | 'efectivo';
}

export type NavigationTab = 'inmediata' | 'catalogos' | 'codigo' | 'admin';
