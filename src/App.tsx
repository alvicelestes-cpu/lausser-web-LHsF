import React, { useEffect } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { MobileNav } from './components/layout/MobileNav';
import { StockModule } from './components/products/StockModule';
import { CatalogModule } from './components/catalog/CatalogModule';
import { AdminPanel } from './components/admin/AdminPanel';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { CartDrawer } from './components/cart/CartDrawer';
import { MagazineOrderModal } from './components/catalog/MagazineOrderModal';
import { PdfCatalogModal } from './components/catalog/PdfCatalogModal';
import { ProductDetailModal } from './components/products/ProductDetailModal';
import { ToastContainer } from './components/common/ToastContainer';
import { Lock } from 'lucide-react';

const MainContent: React.FC = () => {
  const { 
    currentTab, 
    setCurrentTab, 
    isAdminAuthenticated, 
    setIsAdminLoginOpen,
    isPdfViewerOpen,
    setIsPdfViewerOpen,
    activePdfBrand,
    openMagazineOrderWithPrefill
  } = useStore();

  // Support /admin URL hash or direct routing
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#admin' || window.location.pathname === '/admin') {
        if (isAdminAuthenticated) {
          setCurrentTab('admin');
        } else {
          setCurrentTab('inmediata');
          setIsAdminLoginOpen(true);
        }
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [setCurrentTab, isAdminAuthenticated, setIsAdminLoginOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-28 sm:pb-16">
        {currentTab === 'inmediata' && <StockModule />}
        {currentTab === 'catalogos' && <CatalogModule />}
        {currentTab === 'admin' && (
          isAdminAuthenticated ? (
            <AdminPanel />
          ) : (
            <div className="max-w-md mx-auto py-16 px-6 text-center bg-white rounded-3xl border border-neutral-200 shadow-sm space-y-4">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-neutral-900">
                Panel Protegido
              </h2>
              <p className="text-xs text-neutral-500">
                Se requiere autenticación para acceder al panel administrativo de Lausser.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={() => setIsAdminLoginOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white font-bold text-xs hover:bg-neutral-800 transition-colors shadow-sm cursor-pointer"
                >
                  Ingresar Contraseña
                </button>
                <button
                  onClick={() => setCurrentTab('inmediata')}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 font-semibold text-xs hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Volver a la Tienda
                </button>
              </div>
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Mobile Sticky Navigation */}
      <MobileNav />

      {/* Global Drawers and Modals */}
      <CartDrawer />
      <MagazineOrderModal />
      <PdfCatalogModal
        isOpen={isPdfViewerOpen}
        brand={activePdfBrand}
        onClose={() => setIsPdfViewerOpen(false)}
        onOpenOrderModal={(brand, page) => {
          setIsPdfViewerOpen(false);
          openMagazineOrderWithPrefill(brand, page);
        }}
      />
      <ProductDetailModal />
      <AdminLoginModal />
      <ToastContainer />
    </div>
  );
};

export function App() {
  return (
    <StoreProvider>
      <MainContent />
    </StoreProvider>
  );
}

export default App;
