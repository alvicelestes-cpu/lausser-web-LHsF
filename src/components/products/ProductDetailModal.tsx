import React, { useState } from 'react';
import { X, ShoppingBag, Zap, ShieldCheck, Star, Truck, Plus, Minus } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatCurrency, getBrandTheme } from '../../utils/formatters';

export const ProductDetailModal: React.FC = () => {
  const { selectedProduct, setSelectedProduct, addToCart, setIsCartOpen } = useStore();
  const [quantity, setQuantity] = useState(1);

  if (!selectedProduct) return null;

  const brandTheme = getBrandTheme(selectedProduct.brand);
  const presentation = selectedProduct.volume || selectedProduct.presentation || selectedProduct.volumeOrSize;
  const imageSrc = selectedProduct.image || selectedProduct.imageUrl || selectedProduct.image_url;

  const hasDiscount = Boolean(
    (selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price) ||
    (selectedProduct.discountPrice && selectedProduct.discountPrice > selectedProduct.price)
  );
  const regularPrice = selectedProduct.originalPrice || selectedProduct.discountPrice || selectedProduct.price;
  const salePrice = selectedProduct.price;

  const discountPercent = hasDiscount && regularPrice > salePrice 
    ? Math.round(((regularPrice - salePrice) / regularPrice) * 100) 
    : 0;

  const handleAdd = (openCart: boolean = false) => {
    addToCart({
      type: 'stock',
      productId: selectedProduct.id,
      name: selectedProduct.name,
      brand: selectedProduct.brand,
      price: selectedProduct.price,
      quantity,
      imageUrl: imageSrc,
      notes: presentation,
    });
    setSelectedProduct(null);
    if (openCart) {
      setIsCartOpen(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={() => setSelectedProduct(null)}
          className="absolute top-4 right-4 z-10 p-2 text-neutral-500 hover:text-neutral-900 bg-white/80 hover:bg-white rounded-full shadow-md transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          
          {/* Image side */}
          <div className="relative bg-neutral-100 aspect-square md:aspect-auto">
            <img
              src={imageSrc}
              alt={selectedProduct.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              <span className="bg-neutral-900/90 text-amber-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
                <Zap className="w-3.5 h-3.5 fill-amber-300" />
                Entrega Inmediata
              </span>
              <span className={`${brandTheme.badge} text-xs font-bold px-3 py-1 rounded-full shadow-md uppercase`}>
                {selectedProduct.brand}
              </span>
            </div>

            {discountPercent > 0 && (
              <span className="absolute bottom-4 left-4 bg-rose-600 text-white font-bold text-xs px-3 py-1 rounded-xl shadow-md">
                Ahorras {discountPercent}%
              </span>
            )}
          </div>

          {/* Info side */}
          <div className="p-6 sm:p-8 flex flex-col justify-between space-y-5">
            <div>
              {/* Rating & Code */}
              <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
                <div className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{selectedProduct.rating || 4.9} (52 opiniones)</span>
                </div>
                {selectedProduct.code && (
                  <span className="font-mono bg-neutral-100 px-2 py-0.5 rounded">
                    Cód: {selectedProduct.code}
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-bold font-serif text-neutral-900">
                {selectedProduct.name}
              </h2>

              {presentation && (
                <p className="text-xs font-semibold text-rose-600 mt-1">
                  Presentación: {presentation}
                </p>
              )}

              {/* Price display */}
              <div className="mt-4 flex items-baseline gap-3">
                {hasDiscount ? (
                  <>
                    <span className="text-2xl sm:text-3xl font-black text-rose-600">
                      {formatCurrency(salePrice)}
                    </span>
                    <span className="text-sm text-neutral-400 line-through">
                      {formatCurrency(regularPrice)}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl sm:text-3xl font-black text-neutral-900">
                    {formatCurrency(selectedProduct.price)}
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-neutral-600 mt-3 leading-relaxed">
                {selectedProduct.description}
              </p>

              {/* Trust Badges */}
              <div className="mt-4 space-y-1.5 pt-3 border-t border-neutral-100 text-xs text-neutral-500">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-500" />
                  <span>En stock físico para entrega inmediata a domicilio</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Producto 100% original con sello de fábrica Belcorp</span>
                </div>
              </div>
            </div>

            {/* Quantity and Actions */}
            <div className="pt-4 border-t border-neutral-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-700">Cantidad:</span>
                <div className="flex items-center border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-2 hover:bg-neutral-200 text-neutral-600 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center font-bold text-sm text-neutral-800">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(selectedProduct.stock, q + 1))}
                    className="p-2 hover:bg-neutral-200 text-neutral-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAdd(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Añadir al Carrito</span>
                </button>
                <button
                  onClick={() => handleAdd(true)}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold text-xs sm:text-sm shadow-md transition-all active:scale-98"
                >
                  Comprar Ya
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
