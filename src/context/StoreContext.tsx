import React, { createContext, useContext, useState, useEffect } from 'react';
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

interface ToastState {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}

interface StoreContextType {
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
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  clearAllProducts: () => void;
  updateCampaignConfig: (config: Partial<CampaignConfig>) => void;
  resetToDefaults: () => void;
  
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

const StoreContext = createContext<StoreContextType | undefined>(undefined);

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
  // Load products from localStorage or defaults and ensure prices are in full COP
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (saved !== null) return sanitizeProducts(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load products from storage', e);
    }
    return sanitizeProducts(initialProducts);
  });

  // Load campaign config
  const [campaignConfig, setCampaignConfig] = useState<CampaignConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CAMPAIGN);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure default Colombia official URLs are applied if using obsolete domains or empty
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
      setCampaignConfig((prev) => ({
        ...prev,
        catalogPdfInfo: {
          ...prev.catalogPdfInfo,
          [brand]: {
            fileName: meta.fileName,
            fileSize: meta.fileSize,
            updatedAt: meta.updatedAt,
            isUploaded: true,
          },
        },
      }));
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
      setCampaignConfig((prev) => ({
        ...prev,
        catalogPdfUrls: {
          ...prev.catalogPdfUrls,
          [brand]: '',
        },
        catalogPdfInfo: {
          ...prev.catalogPdfInfo,
          [brand]: null,
        },
      }));
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

  // Toast handler
  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Cart operations
  const addToCart = (itemData: Omit<CartItem, 'id'>) => {
    setCart((prev) => {
      // Check if item already exists (same type, product ID or magazine code)
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

  // Admin operations
  const addProduct = (productData: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...productData,
      id: 'prod-' + Date.now(),
    };
    setProducts((prev) => [newProduct, ...prev]);
    showToast(`Producto "${newProduct.name}" agregado con éxito`, 'success');
  };

  const updateProduct = (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    showToast(`Producto actualizado`, 'success');
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    showToast('Producto retirado del catálogo', 'info');
  };

  const clearAllProducts = () => {
    setProducts([]);
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
    } catch (e) {
      console.error(e);
    }
    showToast('Catálogo vaciado completamente', 'info');
  };

  const updateCampaignConfig = (updated: Partial<CampaignConfig>) => {
    setCampaignConfig((prev) => ({ ...prev, ...updated }));
    showToast('Configuración de campaña actualizada', 'success');
  };

  const resetToDefaults = () => {
    setProducts(initialProducts);
    setCampaignConfig(initialCampaignConfig);
    setCart([]);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.CAMPAIGN);
    localStorage.removeItem(STORAGE_KEYS.CART);
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
