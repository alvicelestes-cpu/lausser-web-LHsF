import React, { useState, useEffect } from 'react';
import { X, FileText, Plus, Minus, Sparkles, Check, HelpCircle, BookOpen } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import type { ActiveBrand } from '../../types';
import { getBrandTheme } from '../../utils/formatters';

export const MagazineOrderModal: React.FC = () => {
  const { 
    isMagazineOrderOpen, 
    setIsMagazineOrderOpen, 
    addMagazineItemToCart, 
    setIsCartOpen, 
    openPdfViewer, 
    magazineOrderPrefill 
  } = useStore();

  const [brand, setBrand] = useState<ActiveBrand>('ésika');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [page, setPage] = useState('');
  const [price, setPrice] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ code?: string }>({});

  useEffect(() => {
    if (isMagazineOrderOpen && magazineOrderPrefill) {
      if (magazineOrderPrefill.brand) {
        setBrand(magazineOrderPrefill.brand);
      }
      if (magazineOrderPrefill.page) {
        setPage(magazineOrderPrefill.page);
      }
    }
  }, [isMagazineOrderOpen, magazineOrderPrefill]);

  if (!isMagazineOrderOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setErrors({ code: 'Ingresa el código del producto de la revista' });
      return;
    }

    const numericPrice = parseFloat(price.replace(/[^0-9.]/g, '')) || 0;
    const productName = name.trim() ? name.trim() : `Producto Revista (Cód. ${code.trim()})`;

    addMagazineItemToCart(brand, code.trim(), productName, numericPrice, page.trim(), notes.trim(), quantity);

    // Reset form
    setCode('');
    setName('');
    setPage('');
    setPrice('');
    setNotes('');
    setQuantity(1);
    setErrors({});
    setIsMagazineOrderOpen(false);
  };

  const handleQuickAddAndCheckout = (e: React.FormEvent) => {
    handleSubmit(e);
    setIsCartOpen(true);
  };

  const brandsList: { id: ActiveBrand; name: string }[] = [
    { id: 'ésika', name: 'Ésika' },
    { id: 'cyzone', name: 'Cyzone' },
    { id: 'lbel', name: "L'Bel" },
  ];

  const brandTheme = getBrandTheme(brand);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header with brand gradient */}
        <div className={`p-5 sm:p-6 bg-gradient-to-r ${brandTheme.gradient} text-white relative`}>
          <button
            onClick={() => setIsMagazineOrderOpen(false)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full bg-black/20 hover:bg-black/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-white/20 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </span>
            <span className="text-xs uppercase tracking-widest font-semibold text-white/80">
              Pedido de Campaña
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif">
            Pedir por Código de Revista
          </h2>
          <p className="text-xs sm:text-sm text-white/90 mt-1">
            ¿Viste un producto en el catálogo digital o impreso? Ingresa su código aquí y lo incluiremos en tu pedido.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          
          {/* Brand Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">
              1. Selecciona la Revista / Marca *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {brandsList.map((b) => {
                const isSelected = brand === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBrand(b.id)}
                    className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? `${getBrandTheme(b.id).badge} border-transparent shadow-sm scale-[1.02]`
                        : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    <span>{b.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Direct button to open internal PDF viewer */}
            <div className="mt-2.5 flex items-center justify-between text-xs bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200">
              <span className="text-neutral-500 font-medium">¿Quieres hojear el catálogo?</span>
              <button
                type="button"
                onClick={() => openPdfViewer(brand)}
                className="inline-flex items-center gap-1.5 font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Abrir Visor Revista {brandsList.find((b) => b.id === brand)?.name}</span>
              </button>
            </div>
          </div>

          {/* Product Code & Magazine Page */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Código de Producto *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. 18492"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (errors.code) setErrors({});
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none transition-colors ${
                  errors.code ? 'border-red-500 bg-red-50/50' : 'border-neutral-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                }`}
              />
              {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Pág. Revista
              </label>
              <input
                type="text"
                placeholder="Ej. 42"
                value={page}
                onChange={(e) => setPage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
              />
            </div>
          </div>

          {/* Product Name (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Nombre o Descripción del Producto (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Labial Colorfix tono Rosa Chic o Perfume Liasson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
            />
          </div>

          {/* Price & Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Precio de Catálogo ($ COP)
              </label>
              <input
                type="number"
                placeholder="Ej. 45000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Cantidad
              </label>
              <div className="flex items-center border border-neutral-300 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2.5 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="flex-1 text-center font-bold text-sm text-neutral-800">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-3 py-2.5 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Specific Notes / Shade / Tone */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Tono, Fragancia o Aclaraciones
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Tono Vino Misterio, si no hay pedir Rosa Salvaje..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
            />
          </div>

          {/* Help tip */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2 text-amber-800 text-xs">
            <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Este producto se agregará a tu sección especial <strong>"Pedido Campaña"</strong>. Tu asesora lo pedirá en el cierre y te confirmará la fecha de llegada.
            </span>
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
            <button
              type="submit"
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir a Campaña</span>
            </button>
            <button
              type="button"
              onClick={handleQuickAddAndCheckout}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>Añadir e Ir al Carrito</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
