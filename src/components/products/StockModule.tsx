import React, { useMemo } from 'react';
import { Zap, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ProductCard } from './ProductCard';
import { ProductFilter } from './ProductFilter';
import { getBrandNameDisplay } from '../../utils/formatters';

export const StockModule: React.FC = () => {
  const { 
    products, 
    activeBrand, 
    activeCategory, 
    searchQuery, 
    setSearchQuery, 
    setActiveBrand, 
    setActiveCategory,
    setIsMagazineOrderOpen,
    isLoadingProducts
  } = useStore();

  // Filter products by brand, category, and search query
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Brand filter
      if (activeBrand !== 'all' && product.brand !== activeBrand) {
        return false;
      }

      // Category filter
      if (activeCategory !== 'todos' && product.category !== activeCategory) {
        return false;
      }

      // Search filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesDesc = product.description.toLowerCase().includes(query);
        const matchesCode = product.code?.toLowerCase().includes(query);
        const matchesBrand = product.brand.toLowerCase().includes(query);
        return matchesName || matchesDesc || matchesCode || matchesBrand;
      }

      return true;
    });
  }, [products, activeBrand, activeCategory, searchQuery]);

  const resetFilters = () => {
    setActiveBrand('all');
    setActiveCategory('todos');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      
      {/* Hero Announcement Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md mb-3 border border-white/30">
            <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            <span>Stock Físico Listo Para Despacho</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold font-serif tracking-tight leading-tight">
            Entrega Inmediata Lausser
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-white/90 leading-relaxed max-w-xl">
            ¡No esperes el cierre de campaña! Estos productos están disponibles en stock real para envío el mismo día o en 24 horas con pago contra entrega.
          </p>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none hidden md:flex items-center justify-center font-serif text-9xl font-black select-none">
          L
        </div>
      </div>

      {/* Filter and Category Navigation */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-neutral-900 flex items-center gap-2">
              <span>Productos Disponibles</span>
              {activeBrand !== 'all' && (
                <span className="text-xs font-sans px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                  {getBrandNameDisplay(activeBrand)}
                </span>
              )}
            </h2>
            <p className="text-xs text-neutral-500">
              Mostrando {filteredProducts.length} producto{filteredProducts.length === 1 ? '' : 's'} en inventario
            </p>
          </div>

          {(activeBrand !== 'all' || activeCategory !== 'todos' || searchQuery) && (
            <button
              onClick={resetFilters}
              className="self-start sm:self-auto flex items-center gap-1.5 text-xs text-rose-600 font-bold hover:underline py-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>

        {/* Category Pills */}
        <ProductFilter />
      </div>

      {/* Products Grid */}
      {isLoadingProducts && products.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-10 h-10 border-3 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-neutral-500 font-medium">Cargando inventario en tiempo real...</p>
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-3xl p-10 text-center border border-neutral-200 max-w-md mx-auto my-8 space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">No encontramos productos</h3>
            <p className="text-xs text-neutral-500 mt-1">
              No hay productos con los filtros o búsqueda actuales. Recuerda que también puedes pedir cualquier producto por código de revista.
            </p>
          </div>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Ver todos los productos
          </button>
        </div>
      )}

      {/* Bottom CTA for campaign code orders */}
      <div className="bg-neutral-100/80 rounded-2xl p-4 sm:p-6 border border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-neutral-900 text-sm">¿No encuentras lo que buscas en stock inmediato?</h4>
            <p className="text-xs text-neutral-500">Pídelo de la revista digital ingresando su código de catálogo para el próximo despacho de campaña.</p>
          </div>
        </div>
        <button
          onClick={() => {
            setIsMagazineOrderOpen(true);
          }}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shrink-0 shadow-sm transition-all"
        >
          Pedir por Código de Revista
        </button>
      </div>

    </div>
  );
};
