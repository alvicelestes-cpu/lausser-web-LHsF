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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPageRendering, setIsPageRendering] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasNoPdf, setHasNoPdf] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [googleDriveEmbedUrl, setGoogleDriveEmbedUrl] = useState<string | null>(null);

  // Zoom & Pan state for mobile & desktop
  const [scale, setScale] = useState<number>(1.0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  // Touch gesture and interaction tracking
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTouchPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPinchDistRef = useRef<number>(0);
  const initialScaleRef = useRef<number>(1.0);
  const isPinchingRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const isMouseDownRef = useRef<boolean>(false);
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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
    setScale(1.0);
    setPosition({ x: 0, y: 0 });

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

  // 2. Render Page on Canvas at high DPI
  const renderPage = useCallback(
    async (pageNum: number) => {
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

        // Calculate responsive viewport scale to fit modal container
        const containerWidth = modalContainerRef.current ? modalContainerRef.current.clientWidth - 32 : window.innerWidth - 32;
        const unscaledViewport = page.getViewport({ scale: 1.0 });

        // Base scale to fit container width smoothly
        const fitScale = Math.min((containerWidth / unscaledViewport.width) * 0.95, 1.8);
        const viewport = page.getViewport({ scale: fitScale });

        // Handle high DPI screens for razor-sharp text, prices, and product codes
        const outputScale = Math.min(Math.max((window.devicePixelRatio || 1) * 1.5, 2), 3);
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
      renderPage(currentPage);
      setPageInput(String(currentPage));
    }
  }, [pdfDoc, currentPage, renderPage, totalPages]);

  // 3. Zoom & Pan helpers
  const resetZoom = useCallback(() => {
    setIsTransitioning(true);
    setScale(1.0);
    setPosition({ x: 0, y: 0 });
    setTimeout(() => {
      setIsTransitioning(false);
    }, 250);
  }, []);

  const handleZoomChange = useCallback((newScale: number) => {
    const clampedScale = Math.min(3.5, Math.max(1.0, Number(newScale.toFixed(2))));
    setIsTransitioning(true);
    setScale(clampedScale);
    if (clampedScale <= 1.05) {
      setPosition({ x: 0, y: 0 });
    }
    setTimeout(() => {
      setIsTransitioning(false);
    }, 250);
  }, []);

  const getPanBounds = useCallback((currentScale: number) => {
    const canvas = canvasRef.current;
    const container = modalContainerRef.current;
    if (!canvas || !container) return { maxX: 0, maxY: 0 };
    const viewportWidth = container.clientWidth;
    const viewportHeight = container.clientHeight;
    const displayedWidth = canvas.offsetWidth * currentScale;
    const displayedHeight = canvas.offsetHeight * currentScale;
    const maxX = Math.max(0, (displayedWidth - viewportWidth) / 2 + 50);
    const maxY = Math.max(0, (displayedHeight - viewportHeight) / 2 + 50);
    return { maxX, maxY };
  }, []);

  const handleDoubleTap = useCallback((tapPoint: { x: number; y: number }) => {
    setIsTransitioning(true);
    if (scale > 1.15) {
      // Si ya está ampliado, restablecer a 1x centrado
      setScale(1.0);
      setPosition({ x: 0, y: 0 });
    } else {
      // Hacer zoom in 2.2x centrado hacia la zona tocada
      const newScale = 2.2;
      const container = modalContainerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const offsetX = (centerX - tapPoint.x) * (newScale - 1);
        const offsetY = (centerY - tapPoint.y) * (newScale - 1);

        const { maxX, maxY } = getPanBounds(newScale);
        setScale(newScale);
        setPosition({
          x: Math.max(-maxX, Math.min(maxX, offsetX)),
          y: Math.max(-maxY, Math.min(maxY, offsetY)),
        });
      } else {
        setScale(newScale);
        setPosition({ x: 0, y: 0 });
      }
    }
    setTimeout(() => {
      setIsTransitioning(false);
    }, 250);
  }, [scale, getPanBounds]);

  // 4. Navigation Handlers
  const handlePrevPage = () => {
    if (currentPage > 1) {
      resetZoom();
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      resetZoom();
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
      resetZoom();
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

  // 5. Touch Events: Pinch-to-zoom, Double-tap, Drag/Pan & Swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Inicio de gesto de pellizcar (pinch-to-zoom)
      isPinchingRef.current = true;
      isDraggingRef.current = false;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialScaleRef.current = scale;
      setIsTransitioning(false);
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const now = Date.now();
      const tapPos = { x: touch.clientX, y: touch.clientY };

      touchStartPosRef.current = tapPos;
      lastTouchPosRef.current = tapPos;
      isDraggingRef.current = true;
      setIsTransitioning(false);

      // Detección de doble toque (double-tap rápido en < 320ms y radio < 35px)
      const timeDiff = now - lastTapTimeRef.current;
      const distDiff = Math.hypot(
        tapPos.x - lastTapPosRef.current.x,
        tapPos.y - lastTapPosRef.current.y
      );

      if (timeDiff < 320 && distDiff < 35) {
        handleDoubleTap(tapPos);
        lastTapTimeRef.current = 0;
        isDraggingRef.current = false;
        return;
      }

      lastTapTimeRef.current = now;
      lastTapPosRef.current = tapPos;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinchingRef.current) {
      // Pellizcar activo: calcular cambio de distancia entre los dos toques
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (initialPinchDistRef.current > 0) {
        const factor = dist / initialPinchDistRef.current;
        const newScale = Math.min(3.5, Math.max(1.0, initialScaleRef.current * factor));
        setScale(newScale);
        if (newScale <= 1.05) {
          setPosition({ x: 0, y: 0 });
        }
      }
      return;
    }

    if (e.touches.length === 1 && isDraggingRef.current) {
      const touch = e.touches[0];
      const dx = touch.clientX - lastTouchPosRef.current.x;
      const dy = touch.clientY - lastTouchPosRef.current.y;
      lastTouchPosRef.current = { x: touch.clientX, y: touch.clientY };

      if (scale > 1.05) {
        // Desplazamiento libre (drag/pan) cuando el zoom está activo
        const { maxX, maxY } = getPanBounds(scale);
        setPosition((prev) => ({
          x: Math.max(-maxX, Math.min(maxX, prev.x + dx)),
          y: Math.max(-maxY, Math.min(maxY, prev.y + dy)),
        }));
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isPinchingRef.current) {
      if (e.touches.length < 2) {
        isPinchingRef.current = false;
        if (scale < 1.05) {
          resetZoom();
        }
      }
      return;
    }

    if (isDraggingRef.current) {
      isDraggingRef.current = false;

      // Deslizar para pasar página solo cuando está a escala 1x
      if (scale <= 1.05 && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const diffX = touchStartPosRef.current.x - touch.clientX;
        const diffY = touchStartPosRef.current.y - touch.clientY;

        if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
          if (diffX > 0) {
            handleNextPage();
          } else {
            handlePrevPage();
          }
        }
      }
    }
  };

  // 6. Desktop Mouse Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1.05) return;
    isMouseDownRef.current = true;
    lastTouchPosRef.current = { x: e.clientX, y: e.clientY };
    setIsTransitioning(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current || scale <= 1.05) return;
    const dx = e.clientX - lastTouchPosRef.current.x;
    const dy = e.clientY - lastTouchPosRef.current.y;
    lastTouchPosRef.current = { x: e.clientX, y: e.clientY };

    const { maxX, maxY } = getPanBounds(scale);
    setPosition((prev) => ({
      x: Math.max(-maxX, Math.min(maxX, prev.x + dx)),
      y: Math.max(-maxY, Math.min(maxY, prev.y + dy)),
    }));
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
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
            <div className="hidden sm:flex items-center gap-1 bg-neutral-800 px-2 py-1 rounded-xl border border-neutral-700">
              <button
                type="button"
                onClick={() => handleZoomChange(scale - 0.4)}
                disabled={scale <= 1.0}
                className="p-1 text-neutral-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-neutral-700 transition-colors cursor-pointer"
                title="Alejar Zoom (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={resetZoom}
                className="text-[11px] font-semibold text-neutral-300 hover:text-white px-1 cursor-pointer"
                title="Restablecer a 100%"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                type="button"
                onClick={() => handleZoomChange(scale + 0.4)}
                disabled={scale >= 3.5}
                className="p-1 text-neutral-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-neutral-700 transition-colors cursor-pointer"
                title="Acercar Zoom (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              {scale > 1.05 && (
                <button
                  type="button"
                  onClick={resetZoom}
                  className="p-1 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-neutral-700 transition-colors ml-0.5 cursor-pointer"
                  title="Restablecer Zoom (100%)"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
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
        className="flex-1 overflow-hidden flex items-center justify-center p-1 sm:p-4 relative select-none touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
          <div className="w-full h-full max-w-6xl flex flex-col items-center justify-between p-2 sm:p-4">
            {/* Quick helper banner */}
            <div className="w-full flex flex-wrap items-center justify-between gap-2 py-2 px-3.5 bg-neutral-900/90 rounded-2xl border border-neutral-800 text-xs mb-2 shadow-md">
              <div className="flex items-center gap-2 text-neutral-300">
                <Sparkles className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="text-[11px] leading-tight">
                  Visor Google Drive activo • Puedes ampliar con dos dedos o abrir a pantalla completa
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Ver en pantalla completa"
                >
                  <Maximize className="w-3.5 h-3.5 text-rose-400" />
                  <span>Pantalla completa</span>
                </button>
                <a
                  href={campaignConfig.catalogPdfUrls?.[brand] || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
                >
                  <span>Abrir en pestaña nueva ↗</span>
                </a>
              </div>
            </div>

            {/* Iframe Viewport Container */}
            <div className="w-full flex-1 min-h-[75vh] sm:min-h-[82vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-neutral-800 relative">
              <iframe
                src={googleDriveEmbedUrl}
                title={`Catálogo Google Drive ${brandName}`}
                className="w-full h-full border-0 absolute inset-0"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* Rendered PDF Page Canvas */}
        {!isLoading && !hasNoPdf && !errorMessage && !googleDriveEmbedUrl && (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {isPageRendering && (
              <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center z-10 rounded-2xl">
                <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
              </div>
            )}
            
            {/* Interactive Transform Zoom Container */}
            <div
              ref={canvasContainerRef}
              className="relative flex items-center justify-center will-change-transform"
              style={{
                transform: `translate3d(${position.x}px, ${position.y}px, 0px) scale(${scale})`,
                transformOrigin: 'center center',
                transition: isTransitioning ? 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
                cursor: scale > 1.05 ? 'grab' : 'default',
              }}
            >
              <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-neutral-800 max-w-full">
                <canvas ref={canvasRef} className="block mx-auto pointer-events-none" />
              </div>
            </div>

            {/* Left Page Turn Click Target */}
            {currentPage > 1 && (
              <button
                type="button"
                onClick={handlePrevPage}
                className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white items-center justify-center backdrop-blur-sm transition-transform active:scale-95 shadow-lg border border-white/10 z-20 cursor-pointer"
                title="Página Anterior (Flecha Izquierda)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Right Page Turn Click Target */}
            {currentPage < totalPages && (
              <button
                type="button"
                onClick={handleNextPage}
                className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white items-center justify-center backdrop-blur-sm transition-transform active:scale-95 shadow-lg border border-white/10 z-20 cursor-pointer"
                title="Página Siguiente (Flecha Derecha)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>
        )}
      </main>

      {/* Floating Semi-transparent Zoom & Reset Controls */}
      {!isLoading && !hasNoPdf && !errorMessage && !googleDriveEmbedUrl && (
        <div className="fixed bottom-14 right-3 sm:bottom-16 sm:right-6 z-30 flex items-center gap-1 bg-neutral-900/85 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-neutral-700/80 shadow-2xl">
          <button
            type="button"
            onClick={() => handleZoomChange(scale - 0.4)}
            disabled={scale <= 1.0}
            className="p-1.5 text-neutral-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer active:scale-90"
            title="Alejar Zoom (-)"
            aria-label="Alejar zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={resetZoom}
            className="px-2 py-1 text-xs font-bold text-neutral-200 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1 active:scale-95"
            title="Restablecer Zoom (100%)"
            aria-label="Restablecer zoom"
          >
            <span>{Math.round(scale * 100)}%</span>
            {scale > 1.05 && <RotateCcw className="w-3 h-3 text-rose-400" />}
          </button>

          <button
            type="button"
            onClick={() => handleZoomChange(scale + 0.4)}
            disabled={scale >= 3.5}
            className="p-1.5 text-neutral-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer active:scale-90"
            title="Acercar Zoom (+)"
            aria-label="Acercar zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Bottom Mobile Quick Action Bar (Visible when PDF is loaded) */}
      {pdfDoc && totalPages > 0 && (
        <footer className="px-4 py-2 bg-neutral-900/90 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400 shrink-0 z-10">
          <div className="flex items-center gap-2 max-w-[55%] sm:max-w-none truncate">
            <span className="text-[11px] truncate text-neutral-300">
              {scale > 1.05
                ? `🔍 Zoom ${Math.round(scale * 100)}% • Arrastra con un dedo para explorar • Doble toque para 100%`
                : '💡 Doble toque o pellizca para hacer zoom • Desliza para pasar página'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 text-white font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-700 transition-colors cursor-pointer"
            >
              Anterior
            </button>
            <span className="font-bold text-white text-xs">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 text-white font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-700 transition-colors cursor-pointer"
            >
              Siguiente
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};
