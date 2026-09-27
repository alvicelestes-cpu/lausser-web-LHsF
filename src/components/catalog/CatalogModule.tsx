import React from 'react';
import { 
  BookOpen, 
  Sparkles, 
  FileText, 
  Calendar,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import type { ActiveBrand } from '../../types';
import { CountdownBanner } from './CountdownBanner';
import { formatDateFriendly, getBrandTheme } from '../../utils/formatters';

export const OFFICIAL_BELCORP_CATALOGS: Record<ActiveBrand, string> = {
  ésika: 'https://esika.tiendabelcorp.com.co/catalogo-digital',
  cyzone: 'https://cyzone.tiendabelcorp.com.co/catalogo-digital',
  lbel: 'https://lbel.tiendabelcorp.com.co/catalogo-digital',
};

export interface CatalogBrandCard {
  brand: ActiveBrand;
  name: string;
  tagline: string;
  description: string;
  coverImage: string;
  accentColor: string;
  gradient: string;
  highlights: string[];
}

export interface CatalogCardProps {
  card: CatalogBrandCard;
  campaignNumber: string;
  closingDate: string;
  hasPdfUploaded?: boolean;
  onOpenPdfViewer: () => void;
  onOrderClick: () => void;
}

export const CatalogCard: React.FC<CatalogCardProps> = ({
  card,
  campaignNumber,
  closingDate,
  hasPdfUploaded,
  onOpenPdfViewer,
  onOrderClick,
}) => {
  const brandTheme = getBrandTheme(card.brand);

  return (
    <div
      className={`bg-white rounded-3xl overflow-hidden border border-neutral-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group ${card.gradient}`}
    >
      {/* Top Cover Image with Visual Badges - Clickable to open internal PDF viewer */}
      <button
        type="button"
        onClick={onOpenPdfViewer}
        title={`Abrir Revista Digital interactiva de ${card.name}`}
        className="w-full text-left relative aspect-4/3 sm:aspect-16/10 overflow-hidden bg-neutral-900 block cursor-pointer group"
      >
        <img
          src={card.coverImage}
          alt={`Revista Digital ${card.name}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
        />

        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Brand Tag Top Left */}
        <div className="absolute top-3.5 left-3.5">
          <span className={`${brandTheme.badge} text-xs font-extrabold uppercase px-3 py-1 rounded-full shadow-md tracking-wider`}>
            {card.name}
          </span>
        </div>

        {/* Campaign Pill Top Right */}
        <div className="absolute top-3.5 right-3.5 bg-white/95 backdrop-blur-md text-neutral-900 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-rose-600" />
          <span>{hasPdfUploaded ? 'PDF Listo' : campaignNumber}</span>
        </div>

        {/* Title inside cover */}
        <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] uppercase font-bold text-rose-300 tracking-widest block">
              Revista Digital Interactiva
            </span>
            <span className="text-[10px] bg-white/20 backdrop-blur-xs text-white px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Ojear</span>
              <BookOpen className="w-2.5 h-2.5" />
            </span>
          </div>
          <h3 className="text-xl font-bold font-serif leading-tight">
            Catálogo {card.name}
          </h3>
          <p className="text-xs text-white/80 line-clamp-1">{card.tagline}</p>
        </div>
      </button>

      {/* Card Body */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
        
        <div className="space-y-3">
          {/* Closing Date info */}
          <div className="bg-neutral-50 rounded-2xl p-3 border border-neutral-200/80 flex items-center gap-2.5 text-xs text-neutral-600">
            <Calendar className="w-4 h-4 text-rose-600 shrink-0" />
            <div>
              <span className="font-semibold text-neutral-800 block">Cierre de pedidos:</span>
              <span className="text-neutral-500 capitalize">{formatDateFriendly(closingDate)}</span>
            </div>
          </div>

          {/* Highlights list */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold uppercase text-neutral-400 tracking-wider block">
              Lo más destacado:
            </span>
            {card.highlights.map((highlight, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-neutral-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{highlight}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-neutral-500 leading-relaxed pt-1">
            {card.description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-2 border-t border-neutral-100">
          {/* Primary CTA: Open internal PDF viewer */}
          <button
            type="button"
            onClick={onOpenPdfViewer}
            className={`w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r ${card.accentColor} hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group-hover:scale-[1.01] cursor-pointer`}
          >
            <BookOpen className="w-4 h-4" />
            <span>📖 Ver y pasar Revista Digital</span>
          </button>

          {/* Secondary CTA: Quick code order for this brand */}
          <button
            type="button"
            onClick={onOrderClick}
            className="w-full py-2.5 px-4 rounded-xl border border-neutral-200 hover:border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-neutral-500" />
            <span>Pedir por Código de Revista</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export const CatalogModule: React.FC = () => {
  const { 
    campaignConfig, 
    openPdfViewer, 
    openMagazineOrderWithPrefill, 
    setIsMagazineOrderOpen 
  } = useStore();

  const catalogBrands: CatalogBrandCard[] = [
    {
      brand: 'ésika',
      name: 'Ésika',
      tagline: 'Perfumería Fina & Color de Larga Duración',
      description: 'Descubre las fragancias #1 de Latinoamérica como Red Power y Pulso, labiales Colorfix Duo Tattoo 24H y cosméticos de alta fijación.',
      coverImage: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80',
      accentColor: 'from-rose-600 to-red-600',
      gradient: 'hover:border-rose-400 focus:ring-rose-200',
      highlights: ['Perfumería de Alta Duración', 'Colorfix 24 Horas', 'Cuidado Familiar'],
    },
    {
      brand: 'cyzone',
      name: 'Cyzone',
      tagline: 'Tendencias Virales, Color & Juventud',
      description: 'Encuentra las mejores tendencias en labiales mate Studio Look indelebles, fragancias Sweet Black y la línea purificante facial Skin First.',
      coverImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
      accentColor: 'from-fuchsia-600 to-purple-600',
      gradient: 'hover:border-fuchsia-400 focus:ring-fuchsia-200',
      highlights: ['Studio Look No-Transfer', 'Perfumes Dulces & Urbanos', 'Rutinas Skin First'],
    },
    {
      brand: 'lbel',
      name: "L'Bel",
      tagline: 'Alta Cosmética Francesa & Tratamiento Antiedad',
      description: 'Lujo y ciencia dermocosmética: Tratamiento Concentré Total con células madre, sueros de ácido hialurónico 3D y perfumes Liasson.',
      coverImage: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
      accentColor: 'from-neutral-900 via-neutral-800 to-amber-900',
      gradient: 'hover:border-amber-400 focus:ring-amber-200',
      highlights: ['Concentré Total Antiedad', 'Ácido Hialurónico Puro', 'Haute Parfumerie'],
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Countdown Banner for Campaign Close */}
      <CountdownBanner />

      {/* 2. Section Title and Fast Action Bar */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Visor Interactivo de Revistas Digitales</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-neutral-900">
            Revistas Interactivas de Campaña {campaignConfig.campaignNumber}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-2xl">
            Abre la revista digital tipo catálogo, pasa página por página con controles de zoom y anota los códigos de tus productos deseados para agregarlos a tu carrito o pedirlos por WhatsApp.
          </p>
        </div>

        <button
          onClick={() => setIsMagazineOrderOpen(true)}
          className="self-start md:self-auto flex items-center gap-2 px-5 py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-95 shrink-0 cursor-pointer"
        >
          <FileText className="w-4 h-4 text-rose-400" />
          <span>Pedir por Código de Revista</span>
        </button>
      </div>

      {/* 3. Eye-Catching Magazine Brand Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {catalogBrands.map((card) => {
          const hasPdf = Boolean(
            campaignConfig.catalogPdfInfo?.[card.brand] ||
            (campaignConfig.catalogPdfUrls?.[card.brand] && campaignConfig.catalogPdfUrls[card.brand].trim().length > 0)
          );

          return (
            <CatalogCard
              key={card.brand}
              card={card}
              campaignNumber={campaignConfig.campaignNumber}
              closingDate={campaignConfig.closingDate}
              hasPdfUploaded={hasPdf}
              onOpenPdfViewer={() => openPdfViewer(card.brand)}
              onOrderClick={() => openMagazineOrderWithPrefill(card.brand)}
            />
          );
        })}
      </div>

      {/* 4. Interactive Step-by-Step Guide on How It Works */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm">
        <h3 className="text-lg sm:text-xl font-bold font-serif text-neutral-900 text-center mb-6">
          ¿Cómo pedir desde los catálogos digitales?
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-200/80 flex flex-col items-center text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 font-bold text-base flex items-center justify-center">
              1
            </div>
            <h4 className="font-bold text-sm text-neutral-900">Hojea la Revista Digital</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Haz clic en <strong>"📖 Ver y pasar Revista Digital"</strong> de Ésika, Cyzone o L'Bel para abrir el catálogo interactivo página por página con controles de zoom y navegación.
            </p>
          </div>

          <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-200/80 flex flex-col items-center text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 font-bold text-base flex items-center justify-center">
              2
            </div>
            <h4 className="font-bold text-sm text-neutral-900">Anota el Código de Producto</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Cada producto tiene un código numérico (ej. <em>18492</em>) y página. Anota los que más te gusten junto con el tono o aroma.
            </p>
          </div>

          <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-200/80 flex flex-col items-center text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 font-bold text-base flex items-center justify-center">
              3
            </div>
            <h4 className="font-bold text-sm text-neutral-900">Ingresa el Código y Pídelo</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Usa el botón <strong>"Pedir por Código"</strong> para sumarlo a tu pedido y confirma tu orden vía WhatsApp con tu asesora.
            </p>
          </div>
        </div>

        {/* Big Bottom Action Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setIsMagazineOrderOpen(true)}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-sm shadow-lg hover:shadow-rose-500/25 transition-all active:scale-95 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Ingresar un Código de Revista Ahora</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};

export const CatalogSection = CatalogModule;
export const CatalogViewer = CatalogModule;

