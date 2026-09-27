import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  FileText, 
  Sparkles, 
  Clock, 
  MessageCircle, 
  Settings, 
  Loader2, 
  AlertCircle
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useStore } from '../../context/StoreContext';
import type { ActiveBrand } from '../../types';
import { getCatalogPdf } from '../../utils/pdfStorage';
import { getBrandTheme } from '../../utils/formatters';

// Set up worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker || `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

interface PdfCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand: ActiveBrand;
  onOpenOrderModal: (brand: ActiveBrand, page?: string) => void;
}

export const PdfCatalogModal: React.FC<PdfCatalogModalProps> = ({
  isOpen,
  onClose,
  brand,
  onOpenOrderModal,
}) => {
  const { campaignConfig, setCurrentTab, isAdminAuthenticated, setIsAdminLoginOpen } = useStore();

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>('1');
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPageRendering, setIsPageRendering] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasNoPdf, setHasNoPdf] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [googleDriveEmbedUrl, setGoogleDriveEmbedUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  const brandTheme = getBrandTheme(brand);
  const brandName = brand === 'ésika' ? 'Ésika' : brand === 'cyzone' ? 'Cyzone' : "L'Bel";

  // 1. Load the PDF document
  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;
    setIsLoading(true);
    setErrorMessage(null);
    setHasNoPdf(false);
    setPdfDoc(null);
    setGoogleDriveEmbedUrl(null);
    setCurrentPage(1);
    setPageInput('1');
    setZoomScale(1.0);

    const loadDocument = async () => {
      try {
        let pdfSource: string | ArrayBuffer | null = null;
        let configuredUrl = campaignConfig.catalogPdfUrls?.[brand]?.trim();

        if (configuredUrl) {
          // Detectar si es un enlace de Google Drive para previsualizarlo en iframe
          const driveMatch = configuredUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || configuredUrl.match(/id=([a-zA-Z0-9_-]+)/);
          if (driveMatch && driveMatch[1]) {
            if (!isCancelled) {
              setGoogleDriveEmbedUrl(`https://drive.google.com/file/d/${driveMatch[1]}/preview`);
              setIsLoading(false);
            }
            return;
          }

          // Si es Dropbox, convertir dl=0 a raw=1 para servir el archivo binario del PDF
          if (configuredUrl.includes('dropbox.com')) {
            configuredUrl = configuredUrl.replace('dl=0', 'raw=1');
            if (!configuredUrl.includes('raw=1') && !configuredUrl.includes('dl=1')) {
              configuredUrl += (configuredUrl.includes('?') ? '&' : '?') + 'raw=1';
            }
          }

          if (
            configuredUrl.startsWith('http://') ||
            configuredUrl.startsWith('https://')
          ) {
            pdfSource = configuredUrl;
          }
        }

        // Si no hay URL configurada, verificar si hay PDF en almacenamiento local
        if (!pdfSource) {
          const storedBlob = await getCatalogPdf(brand);
          if (storedBlob) {
            pdfSource = await storedBlob.arrayBuffer();
          }
        }

        if (!pdfSource) {
          if (!isCancelled) {
            setHasNoPdf(true);
            setIsLoading(false);
          }
          return;
        }

        const loadingTask = pdfjsLib.getDocument(
          typeof pdfSource === 'string'
            ? { url: pdfSource, cMapUrl: 'https://unpkg.com/pdfjs-dist@legacy/cmaps/', cMapPacked: true }
            : { data: new Uint8Array(pdfSource), cMapUrl: 'https://unpkg.com/pdfjs-dist@legacy/cmaps/', cMapPacked: true }
        );

        const loadedDoc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(loadedDoc);
          setTotalPages(loadedDoc.numPages);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        console.error('Error loading PDF document:', err);
        if (!isCancelled) {
          setErrorMessage(
            'El visor interactivo no pudo cargar directamente el archivo (puede deberse a restricciones de acceso o CORS del servidor externo). Puedes abrir el catálogo directamente con el botón a continuación:'
          );
          setIsLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, brand, campaignConfig.catalogPdfUrls]);

  // 2. Render Page on Canvas
  const renderPage = useCallback(
    async (pageNum: number, scale: number) => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        setIsPageRendering(true);
        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // Calculate responsive viewport scale
        const containerWidth = modalContainerRef.current ? modalContainerRef.current.clientWidth - 32 : window.innerWidth - 32;
        const unscaledViewport = page.getViewport({ scale: 1.0 });

        // Base scale to fit container width smoothly
        const fitScale = Math.min((containerWidth / unscaledViewport.width) * 0.95, 1.8);
        const finalScale = fitScale * scale;

        const viewport = page.getViewport({ scale: finalScale });

        // Handle high DPI screens
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

        const renderContext = {
          canvasContext: context,
          canvas: canvas,
          viewport: viewport,
          transform: transform,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        setIsPageRendering(false);
      } catch (err: unknown) {
        if ((err as { name?: string })?.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', err);
          setIsPageRendering(false);
        }
      }
    },
    [pdfDoc]
  );

  useEffect(() => {
    if (pdfDoc && currentPage > 0 && currentPage <= totalPages) {
      renderPage(currentPage, zoomScale);
      setPageInput(String(currentPage));
    }
  }, [pdfDoc, currentPage, zoomScale, renderPage, totalPages]);

  // 3. Navigation Handlers
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      setCurrentPage(parsed);
    } else {
      setPageInput(String(currentPage));
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePrevPage();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, totalPages, onClose]);

  // Touch Swipe for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartXRef.current - touchEndX;

    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        handleNextPage(); // Swiped left -> next page
      } else {
        handlePrevPage(); // Swiped right -> prev page
      }
    }
    touchStartXRef.current = null;
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      modalContainerRef.current?.requestFullscreen?.().catch((err) => {
        console.warn('Fullscreen error:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleGoToAdmin = () => {
    onClose();
    if (isAdminAuthenticated) {
      setCurrentTab('admin');
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={modalContainerRef}
      className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-md flex flex-col justify-between select-none overflow-hidden"
    >
      {/* 1. Header Toolbar */}
      <header className="px-3 sm:px-6 py-2.5 bg-neutral-900/90 border-b border-neutral-800 text-white flex items-center justify-between gap-2 shrink-0 z-10">
        
        {/* Brand & Campaign Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`${brandTheme.badge} text-[10px] sm:text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full shadow-xs tracking-wider shrink-0`}>
            {brandName}
          </span>
          <div className="truncate">
            <h3 className="text-xs sm:text-sm font-bold text-neutral-100 truncate">
              Revista Digital {brandName}
            </h3>
            <span className="text-[10px] text-neutral-400 hidden sm:inline">
              Campaña {campaignConfig.campaignNumber}
            </span>
          </div>
        </div>

        {/* Center: Pagination & Zoom Controls (Visible when PDF is loaded) */}
        {pdfDoc && totalPages > 0 && (
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Page Jump */}
            <div className="flex items-center gap-1 bg-neutral-800 px-2 py-1 rounded-xl border border-neutral-700">
              <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="p-1 text-neutral-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-neutral-700 transition-colors"
                title="Página Anterior (Flecha Izq)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
                <input
                  type="text"
                  value={pageInput}
                  onChange={handlePageInputChange}
                  className="w-9 sm:w-11 text-center bg-neutral-900 text-white text-xs font-bold py-0.5 rounded border border-neutral-600 focus:outline-none focus:border-rose-500"
                />
                <span className="text-xs text-neutral-400">/ {totalPages}</span>
              </form>

              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className="p-1 text-neutral-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-neutral-700 transition-colors"
                title="Página Siguiente (Flecha Der)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="hidden md:flex items-center gap-1 bg-neutral-800 px-2 py-1 rounded-xl border border-neutral-700">
              <button
                onClick={() => setZoomScale((s) => Math.max(0.6, s - 0.2))}
                className="p-1 text-neutral-300 hover:text-white rounded-lg hover:bg-neutral-700 transition-colors"
                title="Alejar Zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-semibold text-neutral-300 px-1">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                onClick={() => setZoomScale((s) => Math.min(2.4, s + 0.2))}
                className="p-1 text-neutral-300 hover:text-white rounded-lg hover:bg-neutral-700 transition-colors"
                title="Acercar Zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomScale(1.0)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-700 transition-colors ml-0.5"
                title="Restablecer Zoom"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Right: Order by Code, Fullscreen & Close */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick order with current page prefilled */}
          <button
            onClick={() => onOpenOrderModal(brand, String(currentPage))}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-xs shadow-md transition-transform active:scale-95 cursor-pointer shrink-0"
            title="Ingresar código de un producto visto en esta página"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pedir por Código</span>
            <span className="sm:hidden">Pedir Cód.</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="hidden sm:flex p-1.5 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Close Modal Button */}
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Cerrar visor de revista (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      </header>

      {/* 2. Main Content Canvas / Empty State / Error */}
      <main 
        className="flex-1 overflow-auto flex items-center justify-center p-2 sm:p-4 relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex flex-col items-center gap-3 text-white">
            <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
            <p className="text-sm font-medium text-neutral-300">
              Cargando revista digital de {brandName}...
            </p>
          </div>
        )}

        {/* Empty State: No PDF uploaded yet */}
        {!isLoading && hasNoPdf && (
          <div className="max-w-lg w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 text-center text-white shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className={`${brandTheme.badge} text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-xs tracking-wider inline-block mb-1`}>
                {brandName}
              </span>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-white">
                Catálogo de Campaña {campaignConfig.campaignNumber}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-sm mx-auto">
                El catálogo oficial interactivo en PDF para <strong>{brandName}</strong> estará disponible muy pronto para esta campaña.
              </p>
            </div>

            <div className="p-3.5 bg-neutral-800/60 rounded-2xl border border-neutral-700/60 text-left space-y-1.5 text-xs text-neutral-300">
              <div className="flex items-center gap-1.5 font-bold text-rose-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>¿Ya tienes el código de tu producto?</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Puedes pedir directamente cualquier producto de Ésika, Cyzone o L'Bel con su código de 5 o 6 dígitos.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                onClick={() => onOpenOrderModal(brand)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-xs shadow-md transition-transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Pedir por Código de Revista</span>
              </button>

              <a
                href={`https://wa.me/${campaignConfig.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${campaignConfig.consultantName}, quisiera consultar los productos y ofertas de la revista ${brandName} Campaña ${campaignConfig.campaignNumber}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Consultar por WhatsApp</span>
              </a>
            </div>

            {/* Quick admin shortcut to upload PDF */}
            <div className="pt-2 border-t border-neutral-800 text-[11px] text-neutral-500 flex items-center justify-center gap-1">
              <span>¿Eres administradora?</span>
              <button
                onClick={handleGoToAdmin}
                className="text-rose-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Settings className="w-3 h-3" />
                <span>Subir PDF en Panel Admin</span>
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 text-center text-white space-y-3 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-base">Visor de Revista Digital</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {errorMessage}
            </p>
            <div className="pt-2 flex flex-col gap-2">
              {campaignConfig.catalogPdfUrls?.[brand] && (
                <a
                  href={campaignConfig.catalogPdfUrls[brand]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-rose-400 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Abrir enlace del PDF en pestaña nueva ↗</span>
                </a>
              )}
              <button
                onClick={() => onOpenOrderModal(brand)}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors"
              >
                Pedir por Código Directamente
              </button>
              <button
                onClick={handleGoToAdmin}
                className="w-full py-2 px-4 rounded-xl border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-xs transition-colors"
              >
                Configurar o Reemplazar PDF en Admin
              </button>
            </div>
          </div>
        )}

        {/* Google Drive Preview Iframe */}
        {!isLoading && googleDriveEmbedUrl && (
          <div className="w-full h-full max-w-5xl flex flex-col items-center justify-center p-2 sm:p-4">
            <div className="w-full h-[78vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-neutral-800">
              <iframe
                src={googleDriveEmbedUrl}
                title={`Catálogo Google Drive ${brandName}`}
                className="w-full h-full border-0"
                allow="autoplay"
              />
            </div>
            <div className="mt-2 flex items-center justify-center gap-3">
              <a
                href={campaignConfig.catalogPdfUrls?.[brand] || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-rose-400 hover:underline font-semibold"
              >
                Abrir en pestaña nueva ↗
              </a>
            </div>
          </div>
        )}

        {/* Rendered PDF Page Canvas */}
        {!isLoading && !hasNoPdf && !errorMessage && !googleDriveEmbedUrl && (
          <div className="relative flex items-center justify-center">
            {isPageRendering && (
              <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center z-10 rounded-2xl">
                <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
              </div>
            )}
            
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-neutral-800 max-w-full">
              <canvas ref={canvasRef} className="block mx-auto" />
            </div>

            {/* Left Page Turn Click Target */}
            {currentPage > 1 && (
              <button
                onClick={handlePrevPage}
                className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white items-center justify-center backdrop-blur-sm transition-transform active:scale-95 shadow-lg border border-white/10"
                title="Página Anterior (Flecha Izquierda)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Right Page Turn Click Target */}
            {currentPage < totalPages && (
              <button
                onClick={handleNextPage}
                className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white items-center justify-center backdrop-blur-sm transition-transform active:scale-95 shadow-lg border border-white/10"
                title="Página Siguiente (Flecha Derecha)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>
        )}
      </main>

      {/* 3. Bottom Mobile Quick Action Bar (Visible when PDF is loaded) */}
      {pdfDoc && totalPages > 0 && (
        <footer className="px-4 py-2 bg-neutral-900/90 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400 shrink-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-[11px]">
              Desliza la pantalla o usa las flechas para pasar página
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 text-white font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-700 transition-colors"
            >
              Anterior
            </button>
            <span className="font-bold text-white text-xs">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 text-white font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-700 transition-colors"
            >
              Siguiente
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};
