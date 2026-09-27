import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { 
  Product, 
  Brand, 
  ProductCategory, 
  CartItem, 
  CampaignConfig, 
  NavigationTab,
  ActiveBrand
} from '../types';
import { initialProducts, initialCampaignConfig } from '../data/mockData';
import { saveCatalogPdf, deleteCatalogPdf, getAllCatalogPdfInfo } from '../utils/pdfStorage';
import { supabase } from '../lib/supabase';
import {
  mapRowToProduct,
  mapProductToRow,
  mapRowToCampaign,
  mapCampaignToRow,
} from '../services/supabase';
import type { DbProductRow, DbCatalogRow } from '../services/supabase';

interface ToastState {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}

export type SyncStatus = 'connected' | 'offline' | 'local_fallback' | 'syncing' | 'error';

export interface StoreContextType {
  products: Product[];
  campaignConfig: CampaignConfig;
  cart: CartItem[];
  activeBrand: Brand;
  activeCategory: ProductCategory;
  searchQuery: string;
  currentTab: NavigationTab;
  isCartOpen: boolean;
  isMagazineOrderOpen: boolean;
  selectedProduct: Product | null;
  toasts: ToastState[];
  
  // Cloud Sync & Status
  isLoadingProducts: boolean;
  isSyncing: boolean;
  isCloudSynced: boolean;
  syncStatus: SyncStatus;
  refreshProducts: () => Promise<void>;
  syncToCloud: () => Promise<void>;

  // Navigation & Filters
  setActiveBrand: (brand: Brand) => void;
  setActiveCategory: (cat: ProductCategory) => void;
  setSearchQuery: (query: string) => void;
  setCurrentTab: (tab: NavigationTab) => void;
  setIsCartOpen: (open: boolean) => void;
  setIsMagazineOrderOpen: (open: boolean) => void;
  setSelectedProduct: (product: Product | null) => void;

  // PDF Viewer & Magazine Order with Prefill
  isPdfViewerOpen: boolean;
  setIsPdfViewerOpen: (open: boolean) => void;
  activePdfBrand: ActiveBrand;
  setActivePdfBrand: (brand: ActiveBrand) => void;
  openPdfViewer: (brand: ActiveBrand) => void;
  magazineOrderPrefill: { brand?: ActiveBrand; page?: string } | null;
  openMagazineOrderWithPrefill: (brand: ActiveBrand, page?: string) => void;
  uploadCatalogPdf: (brand: ActiveBrand, file: File) => Promise<boolean>;
  deleteCatalogPdfFile: (brand: ActiveBrand) => Promise<void>;
  
  // Cart Actions
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  addMagazineItemToCart: (brand: ActiveBrand, code: string, name: string, price: number, page?: string, notes?: string, quantity?: number) => void;
  updateCartQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  cartTotalCount: number;
  
  // Admin Product Actions
  addProduct: (product: Omit<Product, 'id'>) => Promise<Product | null>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  clearAllProducts: () => Promise<void>;
  updateCampaignConfig: (config: Partial<CampaignConfig>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  
  // Admin Authentication & Security
  isAdminAuthenticated: boolean;
  isAdminLoginOpen: boolean;
  setIsAdminLoginOpen: (open: boolean) => void;
  loginAdmin: (password: string) => boolean;
  logoutAdmin: () => void;
  changeAdminPassword: (currentPass: string, newPass: string) => { success: boolean; message: string };
  resetAdminPassword: () => void;
  defaultAdminPassword: string;

  // Toast notifications
  showToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
}

export const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PRODUCTS: 'lausser_products_v1',
  CAMPAIGN: 'lausser_campaign_v1',
  CART: 'lausser_cart_v1',
  ADMIN_PASSWORD: 'lausser_admin_password_v1',
  ADMIN_AUTH: 'lausser_admin_auth_v1',
};

const DEFAULT_ADMIN_PASSWORD = 'Lausser2026';

const sanitizeProducts = (list: Product[]): Product[] => {
  return list.map((item) => ({
    ...item,
    price: item.price > 0 && item.price < 1000 ? Math.round(item.price * 1000) : Math.round(item.price),
    discountPrice: item.discountPrice && item.discountPrice > 0 && item.discountPrice < 1000 
      ? Math.round(item.discountPrice * 1000) 
      : (item.discountPrice ? Math.round(item.discountPrice) : undefined),
  }));
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Sync state
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');

  // Inicializa vacío o con el caché para evitar mostrar mocks por defecto
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return sanitizeProducts(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load products from storage', e);
    }
    return [];
  });

  // Load campaign config
  const [campaignConfig, setCampaignConfig] = useState<CampaignConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CAMPAIGN);
      if (saved) {
        const parsed = JSON.parse(saved);
        const defaultUrls = initialCampaignConfig.catalogUrls;
        const isObsolete = (url?: string) => !url || url.includes('catalogos.somosbelcorp.com');
        const updatedCatalogUrls = {
          ésika: isObsolete(parsed.catalogUrls?.ésika) ? defaultUrls.ésika : parsed.catalogUrls.ésika,
          cyzone: isObsolete(parsed.catalogUrls?.cyzone) ? defaultUrls.cyzone : parsed.catalogUrls.cyzone,
          lbel: isObsolete(parsed.catalogUrls?.lbel) ? defaultUrls.lbel : parsed.catalogUrls.lbel,
        };
        const updatedPdfUrls = {
          ésika: isObsolete(parsed.catalogPdfUrls?.ésika) ? defaultUrls.ésika : parsed.catalogPdfUrls.ésika,
          cyzone: isObsolete(parsed.catalogPdfUrls?.cyzone) ? defaultUrls.cyzone : parsed.catalogPdfUrls.cyzone,
          lbel: isObsolete(parsed.catalogPdfUrls?.lbel) ? defaultUrls.lbel : parsed.catalogPdfUrls.lbel,
        };
        return {
          ...initialCampaignConfig,
          ...parsed,
          catalogUrls: updatedCatalogUrls,
          catalogPdfUrls: updatedPdfUrls,
        };
      }
    } catch (e) {
      console.error('Failed to load campaign config', e);
    }
    return initialCampaignConfig;
  });

  // Load cart
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CART);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((item: CartItem) => ({
          ...item,
          price: item.price > 0 && item.price < 1000 ? Math.round(item.price * 1000) : Math.round(item.price),
        }));
      }
    } catch (e) {
      console.error('Failed to load cart', e);
    }
    return [];
  });

  // UI state
  const [activeBrand, setActiveBrand] = useState<Brand>('all');
  const [activeCategory, setActiveCategory] = useState<ProductCategory>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<NavigationTab>('inmediata');
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isMagazineOrderOpen, setIsMagazineOrderOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [toasts, setToasts] = useState<ToastState[]>([]);

  // PDF Viewer & Magazine Order states
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState<boolean>(false);
  const [activePdfBrand, setActivePdfBrand] = useState<ActiveBrand>('ésika');
  const [magazineOrderPrefill, setMagazineOrderPrefill] = useState<{ brand?: ActiveBrand; page?: string } | null>(null);

  // Toast handler
  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ====================================================================
  // CARGA INICIAL DIRECTA DESDE SUPABASE Y TIEMPO REAL (REALTIME)
  // ====================================================================
  useEffect(() => {
    let isMounted = true;
    setIsLoadingProducts(true);

    const loadData = async () => {
      try {
        // Consulta directa a Supabase
        const { data, error } = await supabase.from('products').select('*');

        if (error) {
          console.error('Error al cargar productos de Supabase:', error);
          if (isMounted) {
            setSyncStatus('error');
          }
        } else if (data !== null) {
          // Imprime por consola y actualiza con los datos reales de Supabase (incluso si está vacío [])
          console.log('Productos cargados de Supabase:', data?.length);
          const mapped = sanitizeProducts(data.map(mapRowToProduct));
          if (isMounted) {
            setProducts(mapped);
            try {
              localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(mapped));
            } catch (e) {
              console.error(e);
            }
            setIsCloudSynced(true);
            setSyncStatus('connected');
          }
        }

        // Consultar configuración de campaña y catálogos en Supabase
        const { data: catData, error: catError } = await supabase
          .from('catalogs')
          .select('*')
          .eq('id', 'active')
          .maybeSingle();

        if (!catError && catData && isMounted) {
          const cloudCampaign = mapRowToCampaign(catData);
          setCampaignConfig((prev) => {
            const updated = {
              ...prev,
              ...cloudCampaign,
              catalogUrls: { ...prev.catalogUrls, ...cloudCampaign.catalogUrls },
              catalogPdfUrls: { ...prev.catalogPdfUrls, ...cloudCampaign.catalogPdfUrls },
            };
            try {
              localStorage.setItem(STORAGE_KEYS.CAMPAIGN, JSON.stringify(updated));
            } catch (e) {
              console.error(e);
            }
            return updated;
          });
        }
      } catch (err) {
        console.error('Excepción al conectar con Supabase:', err);
        if (isMounted) {
          setSyncStatus('error');
        }
      } finally {
        if (isMounted) {
          setIsLoadingProducts(false);
          setIsSyncing(false);
        }
      }
    };

    loadData();

    // Activa suscripción en tiempo real: supabase.channel('products-channel').on('postgres_changes', ...)
    const channel = supabase
      .channel('products-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          console.log('Cambio en tiempo real recibido de Supabase:', payload);
          if (payload.eventType === 'INSERT' && payload.new) {
            const item = mapRowToProduct(payload.new as DbProductRow);
            setProducts((prev) => {
              if (prev.some((p) => p.id === item.id)) {
                return prev.map((p) => (p.id === item.id ? item : p));
              }
              return [item, ...prev];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const item = mapRowToProduct(payload.new as DbProductRow);
            setProducts((prev) => prev.map((p) => (p.id === item.id ? item : p)));
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const deletedId = String(payload.old.id);
            setProducts((prev) => prev.filter((p) => p.id !== deletedId));
          }
        }
      )
      .subscribe();

    const catChannel = supabase
      .channel('catalogs-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'catalogs' },
        (payload) => {
          if (payload.new) {
            const config = mapRowToCampaign(payload.new as DbCatalogRow);
            setCampaignConfig((prev) => ({ ...prev, ...config }));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      supabase.removeChannel(catChannel);
    };
  }, []);

  // Manual refresh from cloud
  const refreshProducts = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.from('products').select('*');
      if (error) {
        console.error('Error refrescando productos de Supabase:', error);
        showToast('Error al consultar Supabase', 'warning');
      } else if (data !== null) {
        console.log('Productos cargados de Supabase:', data?.length);
        const mapped = sanitizeProducts(data.map(mapRowToProduct));
        setProducts(mapped);
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(mapped));
        showToast(`Sincronizado con la nube (${mapped.length} productos)`, 'success');
        setSyncStatus('connected');
      }
      const { data: catData } = await supabase.from('catalogs').select('*').eq('id', 'active').maybeSingle();
      if (catData) {
        const cloudCampaign = mapRowToCampaign(catData);
        setCampaignConfig((prev) => ({ ...prev, ...cloudCampaign }));
      }
    } catch (err) {
      console.error('Error refreshing from cloud:', err);
      showToast('Error al consultar la base de datos en la nube', 'warning');
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Manual seed or push to cloud
  const syncToCloud = async () => {
    setIsSyncing(true);
    try {
      const sanitizedRows = products.map((p) => ({
        id: String(p.id),
        name: String(p.name || ''),
        brand: String(p.brand || ''),
        category: String(p.category || ''),
        price: Number(p.price || 0),
        original_price: (p.originalPrice ?? p.discountPrice) ? Number(p.originalPrice ?? p.discountPrice) : null,
        image: p.image || p.imageUrl || '',
        in_stock: Boolean(p.inStock ?? true),
        description: p.description || '',
        code: p.code ? String(p.code) : null,
        stock: Number(p.stock ?? 1),
      }));

      const { data, error: prodErr } = await supabase.from('products').upsert(sanitizedRows);
      if (prodErr) {
        console.error('ERROR AL GUARDAR EN SUPABASE:', prodErr);
        alert('Error Supabase: ' + (prodErr.message || JSON.stringify(prodErr)));
      } else {
        console.log('PRODUCTO GUARDADO EN SUPABASE:', data);
        const { error: catErr } = await supabase.from('catalogs').upsert(mapCampaignToRow(campaignConfig), { onConflict: 'id' });
        if (catErr) {
          console.error('Error guardando catálogo:', catErr);
        }
        setIsCloudSynced(true);
        setSyncStatus('connected');
        showToast('Inventario y catálogos sincronizados en la nube con éxito', 'success');
      }
    } catch (err) {
      console.error('ERROR AL GUARDAR EN SUPABASE (excepción):', err);
      alert('Error Supabase (excepción): ' + String(err));
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const openPdfViewer = (brand: ActiveBrand) => {
    setActivePdfBrand(brand);
    setIsPdfViewerOpen(true);
  };

  const openMagazineOrderWithPrefill = (brand: ActiveBrand, page?: string) => {
    setMagazineOrderPrefill({ brand, page });
    setIsMagazineOrderOpen(true);
  };

  // Sync IndexedDB files metadata with campaignConfig on mount
  useEffect(() => {
    getAllCatalogPdfInfo().then((infoMap) => {
      setCampaignConfig((prev) => {
        let changed = false;
        const newInfo = { ...(prev.catalogPdfInfo || {}) };
        for (const b of ['ésika', 'cyzone', 'lbel'] as ActiveBrand[]) {
          if (infoMap[b]) {
            const meta = infoMap[b]!;
            if (!newInfo[b] || newInfo[b]?.fileName !== meta.fileName || newInfo[b]?.fileSize !== meta.fileSize) {
              newInfo[b] = {
                fileName: meta.fileName,
                fileSize: meta.fileSize,
                updatedAt: meta.updatedAt,
                isUploaded: true,
              };
              changed = true;
            }
          }
        }
        return changed ? { ...prev, catalogPdfInfo: newInfo } : prev;
      });
    }).catch((err) => {
      console.warn('Error reading stored PDF info:', err);
    });
  }, []);

  const uploadCatalogPdf = async (brand: ActiveBrand, file: File): Promise<boolean> => {
    try {
      const meta = await saveCatalogPdf(brand, file);
      const newConfig: CampaignConfig = {
        ...campaignConfig,
        catalogPdfInfo: {
          ...campaignConfig.catalogPdfInfo,
          [brand]: {
            fileName: meta.fileName,
            fileSize: meta.fileSize,
            updatedAt: meta.updatedAt,
            isUploaded: true,
          },
        },
      };
      setCampaignConfig(newConfig);
      supabase.from('catalogs').upsert(mapCampaignToRow(newConfig), { onConflict: 'id' }).then(({ error }) => {
        if (error) console.error('Error updating PDF metadata in cloud:', error);
      });
      showToast(`PDF de ${brand} guardado con éxito (${(file.size / (1024 * 1024)).toFixed(1)} MB)`, 'success');
      return true;
    } catch (e) {
      console.error('Error saving PDF file', e);
      showToast(`Error al guardar el archivo PDF de ${brand}`, 'warning');
      return false;
    }
  };

  const deleteCatalogPdfFile = async (brand: ActiveBrand): Promise<void> => {
    try {
      await deleteCatalogPdf(brand);
      const newConfig: CampaignConfig = {
        ...campaignConfig,
        catalogPdfUrls: {
          ...campaignConfig.catalogPdfUrls,
          [brand]: '',
        },
        catalogPdfInfo: {
          ...campaignConfig.catalogPdfInfo,
          [brand]: null,
        },
      };
      setCampaignConfig(newConfig);
      supabase.from('catalogs').upsert(mapCampaignToRow(newConfig), { onConflict: 'id' }).then(({ error }) => {
        if (error) console.error('Error updating PDF deletion in cloud:', error);
      });
      showToast(`Catálogo PDF de ${brand} eliminado`, 'info');
    } catch (error) {
      console.error('Error deleting PDF file', error);
    }
  };

  // Admin authentication state: SIEMPRE bloqueado por defecto al abrir la app o recargar
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error(e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CAMPAIGN, JSON.stringify(campaignConfig));
    } catch (e) {
      console.error(e);
    }
  }, [campaignConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }
  }, [cart]);

  // Cart operations
  const addToCart = (itemData: Omit<CartItem, 'id'>) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => {
        if (itemData.type === 'stock' && item.type === 'stock') {
          return item.productId === itemData.productId;
        }
        if (itemData.type === 'campaign' && item.type === 'campaign') {
          return item.magazineCode === itemData.magazineCode && item.brand === itemData.brand;
        }
        return false;
      });

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + itemData.quantity,
        };
        return updated;
      }

      const newItem: CartItem = {
        ...itemData,
        id: 'cart-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      };
      return [...prev, newItem];
    });

    showToast(`"${itemData.name}" añadido al carrito`, 'success');
  };

  const addMagazineItemToCart = (
    brand: ActiveBrand,
    code: string,
    name: string,
    price: number,
    page?: string,
    notes?: string,
    quantity: number = 1
  ) => {
    addToCart({
      type: 'campaign',
      name: name || `Producto Cód: ${code}`,
      brand,
      price: price > 0 ? price : 0,
      quantity,
      magazineCode: code,
      magazinePage: page,
      notes,
    });
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null);
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
    showToast('Producto eliminado del carrito', 'info');
  };

  const clearCart = () => {
    setCart([]);
    showToast('Carrito vaciado', 'info');
  };

  const cartTotalCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // ====================================================================
  // OPERACIONES CRUD DIRECTAS CON SUPABASE Y ACTUALIZACIÓN INMEDIATA REACT
  // ====================================================================

  const addProduct = async (productData: Omit<Product, 'id'>): Promise<Product | null> => {
    const id = 'prod-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const newProduct: Product = {
      ...productData,
      id,
    };

    const sanitizedProduct = {
      id: String(newProduct.id),
      name: String(newProduct.name || ''),
      brand: String(newProduct.brand || ''),
      category: String(newProduct.category || ''),
      price: Number(newProduct.price || 0),
      original_price: (newProduct.originalPrice ?? newProduct.discountPrice) ? Number(newProduct.originalPrice ?? newProduct.discountPrice) : null,
      image: newProduct.image || newProduct.imageUrl || '',
      in_stock: Boolean(newProduct.inStock ?? true),
      description: newProduct.description || '',
      code: newProduct.code ? String(newProduct.code) : null,
      stock: Number(newProduct.stock ?? 1),
    };

    // 1. Actualizar el estado de React para reflejarlo en pantalla inmediatamente
    setProducts((prev) => [newProduct, ...prev]);

    // 2. Realizar la operación directamente en Supabase con upsert
    try {
      setIsSyncing(true);
      const { data, error } = await supabase.from('products').upsert(sanitizedProduct);
      if (error) {
        console.error('ERROR AL GUARDAR EN SUPABASE:', error);
        alert('Error Supabase: ' + (error.message || JSON.stringify(error)));
      } else {
        console.log('PRODUCTO GUARDADO EN SUPABASE:', data);
        showToast(`Producto "${newProduct.name}" guardado y sincronizado`, 'success');
      }
    } catch (err) {
      console.error('ERROR AL GUARDAR EN SUPABASE (excepción):', err);
      alert('Error Supabase: ' + String(err));
    } finally {
      setIsSyncing(false);
    }

    return newProduct;
  };

  const updateProduct = async (updated: Product): Promise<void> => {
    // 1. Actualizar el estado de React para reflejarlo en pantalla inmediatamente
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

    const sanitizedProduct = {
      id: String(updated.id),
      name: String(updated.name || ''),
      brand: String(updated.brand || ''),
      category: String(updated.category || ''),
      price: Number(updated.price || 0),
      original_price: (updated.originalPrice ?? updated.discountPrice) ? Number(updated.originalPrice ?? updated.discountPrice) : null,
      image: updated.image || updated.imageUrl || '',
      in_stock: Boolean(updated.inStock ?? true),
      description: updated.description || '',
      code: updated.code ? String(updated.code) : null,
      stock: Number(updated.stock ?? 1),
    };

    // 2. Realizar la operación directamente en Supabase con upsert
    try {
      const { data, error } = await supabase.from('products').upsert(sanitizedProduct);
      if (error) {
        console.error('ERROR AL GUARDAR EN SUPABASE:', error);
        alert('Error Supabase: ' + (error.message || JSON.stringify(error)));
      } else {
        console.log('PRODUCTO GUARDADO EN SUPABASE:', data);
        showToast('Producto actualizado', 'success');
      }
    } catch (err) {
      console.error('ERROR AL GUARDAR EN SUPABASE (excepción):', err);
      alert('Error Supabase: ' + String(err));
    }
  };

  const deleteProduct = async (id: string): Promise<void> => {
    // 1. Actualizar el estado de React para reflejarlo en pantalla inmediatamente
    setProducts((prev) => prev.filter((p) => p.id !== id));

    // 2. Realizar la operación directamente en Supabase
    try {
      const { data, error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('ERROR AL ELIMINAR EN SUPABASE:', error);
        alert('Error Supabase: ' + (error.message || JSON.stringify(error)));
      } else {
        console.log('PRODUCTO ELIMINADO DE SUPABASE:', data);
        showToast('Producto retirado del catálogo', 'info');
      }
    } catch (err) {
      console.error('ERROR AL ELIMINAR EN SUPABASE (excepción):', err);
      alert('Error Supabase: ' + String(err));
    }
  };

  const clearAllProducts = async (): Promise<void> => {
    // 1. Actualizar el estado de React inmediatamente
    setProducts([]);
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
    } catch (e) {
      console.error(e);
    }

    // 2. Realizar la operación directamente en Supabase
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .neq('id', '___dummy___');

      if (error) {
        console.error('Error vaciando productos en Supabase:', error);
      } else {
        console.log('Productos vaciados en Supabase');
      }
    } catch (err) {
      console.error('Excepción al vaciar productos en Supabase:', err);
    }
    showToast('Catálogo vaciado completamente', 'info');
  };

  const updateCampaignConfig = async (updated: Partial<CampaignConfig>): Promise<void> => {
    const mergedConfig: CampaignConfig = { ...campaignConfig, ...updated };
    setCampaignConfig(mergedConfig);

    try {
      const row = mapCampaignToRow(mergedConfig);
      const { error } = await supabase
        .from('catalogs')
        .upsert(row, { onConflict: 'id' });

      if (error) {
        console.error('Error guardando campaña en Supabase:', error);
      } else {
        showToast('Campaña guardada y sincronizada en la nube', 'success');
      }
    } catch (err) {
      console.error('Excepción guardando campaña en Supabase:', err);
    }
  };

  const resetToDefaults = async (): Promise<void> => {
    setProducts(initialProducts);
    setCampaignConfig(initialCampaignConfig);
    setCart([]);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.CAMPAIGN);
    localStorage.removeItem(STORAGE_KEYS.CART);

    setIsSyncing(true);
    try {
      await supabase.from('products').delete().neq('id', '___dummy___');
      const rows = initialProducts.map(mapProductToRow);
      await supabase.from('products').upsert(rows, { onConflict: 'id' });
      await supabase.from('catalogs').upsert(mapCampaignToRow(initialCampaignConfig), { onConflict: 'id' });
      console.log('Productos demo cargados en Supabase');
    } catch (err) {
      console.error('Error restableciendo demo en Supabase:', err);
    } finally {
      setIsSyncing(false);
    }
    showToast('Datos reiniciados a los valores de prueba', 'info');
  };

  // Admin Security & Authentication Methods
  const getStoredAdminPassword = (): string => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ADMIN_PASSWORD);
      if (saved) return saved;
    } catch (e) {
      console.error('Failed to read admin password', e);
    }
    return DEFAULT_ADMIN_PASSWORD;
  };

  const loginAdmin = (password: string): boolean => {
    const currentSaved = getStoredAdminPassword();
    const cleanInput = password.trim();
    if (cleanInput === currentSaved || (currentSaved === 'Lausser2026' && cleanInput === 'Lausser2026*')) {
      setIsAdminAuthenticated(true);
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    try {
      sessionStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
    } catch (e) {
      console.error('Failed to clear admin auth', e);
    }
    if (currentTab === 'admin') {
      setCurrentTab('inmediata');
    }
    if (window.location.hash === '#admin') {
      window.history.replaceState(null, '', window.location.pathname);
    }
    showToast('Sesión de administración cerrada', 'info');
  };

  const changeAdminPassword = (currentPass: string, newPass: string): { success: boolean; message: string } => {
    const currentSaved = getStoredAdminPassword();
    if (currentPass !== currentSaved) {
      return { success: false, message: 'La contraseña actual no es correcta.' };
    }
    if (!newPass || newPass.trim().length < 6) {
      return { success: false, message: 'La nueva contraseña debe tener mínimo 6 caracteres.' };
    }
    try {
      localStorage.setItem(STORAGE_KEYS.ADMIN_PASSWORD, newPass);
      showToast('Contraseña de administración actualizada', 'success');
      return { success: true, message: 'Contraseña actualizada con éxito.' };
    } catch (e) {
      console.error('Failed to save new password', e);
      return { success: false, message: 'Error al guardar la contraseña en este dispositivo.' };
    }
  };

  const resetAdminPassword = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.ADMIN_PASSWORD);
      showToast(`Contraseña restablecida a la de fábrica (${DEFAULT_ADMIN_PASSWORD})`, 'info');
    } catch (e) {
      console.error('Failed to reset password', e);
    }
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        campaignConfig,
        cart,
        activeBrand,
        activeCategory,
        searchQuery,
        currentTab,
        isCartOpen,
        isMagazineOrderOpen,
        selectedProduct,
        toasts,
        isLoadingProducts,
        isSyncing,
        isCloudSynced,
        syncStatus,
        refreshProducts,
        syncToCloud,
        isPdfViewerOpen,
        setIsPdfViewerOpen,
        activePdfBrand,
        setActivePdfBrand,
        openPdfViewer,
        magazineOrderPrefill,
        openMagazineOrderWithPrefill,
        uploadCatalogPdf,
        deleteCatalogPdfFile,
        setActiveBrand,
        setActiveCategory,
        setSearchQuery,
        setCurrentTab,
        setIsCartOpen,
        setIsMagazineOrderOpen,
        setSelectedProduct,
        addToCart,
        addMagazineItemToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartTotalCount,
        addProduct,
        updateProduct,
        deleteProduct,
        clearAllProducts,
        updateCampaignConfig,
        resetToDefaults,
        isAdminAuthenticated,
        isAdminLoginOpen,
        setIsAdminLoginOpen,
        loginAdmin,
        logoutAdmin,
        changeAdminPassword,
        resetAdminPassword,
        defaultAdminPassword: DEFAULT_ADMIN_PASSWORD,
        showToast,
        removeToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

// Aliases for ProductContext & useProducts
export const ProductContext = StoreContext;
export const useProducts = useStore;
