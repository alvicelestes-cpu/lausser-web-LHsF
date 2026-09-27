import React from 'react';
import { ShoppingBag, Zap, Eye, Star } from 'lucide-react';
import type { Product } from '../../types';
import { useStore } from '../../context/StoreContext';
import { formatCurrency, getBrandTheme } from '../../utils/formatters';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, setSelectedProduct } = useStore();
  const brandTheme = getBrandTheme(product.brand);

  const presentation = product.volume || product.presentation || product.volumeOrSize;
  const imageSrc = product.image || product.imageUrl || product.image_url;

  // Si product.originalPrice existe y es mayor a product.price, muestra el precio regular tachado
  const hasDiscount = Boolean(
    (product.originalPrice && product.originalPrice > product.price) ||
    (product.discountPrice && product.discountPrice > product.price)
  );
  const regularPrice = product.originalPrice || product.discountPrice || product.price;
  const salePrice = product.price;

  const discountPercent = hasDiscount && regularPrice > salePrice 
    ? Math.round(((regularPrice - salePrice) / regularPrice) * 100) 
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({
      type: 'stock',
      productId: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      quantity: 1,
      imageUrl: imageSrc,
      notes: presentation,
    });
  };

  return (
    <div 
      onClick={() => setSelectedProduct(product)}
      className="group bg-white rounded-3xl overflow-hidden border border-neutral-200/80 hover:border-neutral-300 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
    >
      {/* Top Image Section */}
      <div className="relative aspect-square overflow-hidden bg-neutral-100">
        <img
          src={imageSrc}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Immediate Delivery Badge */}
        <div className="absolute top-2.5 left-2.5 bg-neutral-900/90 backdrop-blur-md text-amber-300 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold flex items-center gap-1 shadow-md">
          <Zap className="w-3 h-3 fill-amber-300 text-amber-300" />
          <span>Entrega Hoy</span>
        </div>

        {/* Brand Tag & Volume */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 max-w-[75%]">
          {presentation && (
            <span className="bg-white/95 backdrop-blur-md text-neutral-800 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md truncate">
              {presentation}
            </span>
          )}
          <span className={`${brandTheme.badge} px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md shrink-0`}>
            {product.brand}
          </span>
        </div>

        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="absolute bottom-2.5 left-2.5 bg-rose-600 text-white font-black text-[11px] px-2 py-0.5 rounded-lg shadow-md">
            -{discountPercent}% OFF
          </div>
        )}

        {/* Quick View Button on Hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedProduct(product);
          }}
          className="absolute bottom-2.5 right-2.5 bg-white/90 hover:bg-white text-neutral-800 p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          title="Vista rápida"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {/* Product Details Section */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Rating & Stock pill */}
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <div className="flex items-center gap-1 text-amber-500 text-xs">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-bold text-neutral-700">{product.rating || 4.8}</span>
            </div>

            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {product.stock > 0 ? `${product.stock} en stock` : 'Agotado'}
            </span>
          </div>

          {/* Category & Presentation (Ml o Tono) */}
          <div className="flex items-center gap-1.5 mb-1 text-[11px] font-medium text-neutral-500">
            <span className="capitalize">{product.category.replace('_', ' ')}</span>
            {presentation && (
              <>
                <span>•</span>
                <span className="font-bold text-neutral-700 truncate">{presentation}</span>
              </>
            )}
          </div>

          {/* Product Name */}
          <h3 className="font-bold text-neutral-900 text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-rose-600 transition-colors">
            {product.name}
          </h3>
        </div>

        {/* Price & Action Button */}
        <div className="pt-3 mt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
          <div>
            {hasDiscount ? (
              <div>
                <span className="text-xs text-neutral-400 line-through block -mb-0.5">
                  {formatCurrency(regularPrice)}
                </span>
                <span className="text-sm sm:text-base font-extrabold text-rose-600">
                  {formatCurrency(salePrice)}
                </span>
              </div>
            ) : (
              <span className="text-sm sm:text-base font-extrabold text-neutral-900">
                {formatCurrency(product.price)}
              </span>
            )}
          </div>

          <button
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Añadir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
