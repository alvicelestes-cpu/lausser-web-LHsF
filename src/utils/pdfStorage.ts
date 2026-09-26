// IndexedDB storage for offline & high-capacity PDF catalogs
import type { ActiveBrand } from '../types';

const DB_NAME = 'lausser_pdf_store_v1';
const DB_VERSION = 1;
const STORE_NAME = 'catalog_pdfs';

export interface StoredPdfRecord {
  brand: ActiveBrand;
  blob: Blob;
  fileName: string;
  fileSize: number;
  updatedAt: string;
}

export interface PdfMetadata {
  fileName: string;
  fileSize: number;
  updatedAt: string;
}

const openDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está disponible en este entorno.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'brand' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Error al abrir la base de datos de PDFs.'));
    };
  });
};

export const saveCatalogPdf = async (
  brand: ActiveBrand,
  file: File | Blob,
  fileName?: string
): Promise<PdfMetadata> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const record: StoredPdfRecord = {
      brand,
      blob: file,
      fileName: fileName || (file instanceof File ? file.name : `catalogo-${brand}.pdf`),
      fileSize: file.size,
      updatedAt: new Date().toISOString(),
    };

    const request = store.put(record);

    request.onsuccess = () => {
      resolve({
        fileName: record.fileName,
        fileSize: record.fileSize,
        updatedAt: record.updatedAt,
      });
    };

    request.onerror = () => {
      reject(request.error || new Error(`Error guardando PDF de ${brand}.`));
    };
  });
};

export const getCatalogPdf = async (brand: ActiveBrand): Promise<Blob | null> => {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(brand);

      request.onsuccess = () => {
        const result = request.result as StoredPdfRecord | undefined;
        resolve(result?.blob || null);
      };

      request.onerror = () => {
        reject(request.error || new Error(`Error obteniendo PDF de ${brand}.`));
      };
    });
  } catch (error) {
    console.warn(`No se pudo cargar PDF para ${brand} desde IndexedDB:`, error);
    return null;
  }
};

export const getCatalogPdfInfo = async (brand: ActiveBrand): Promise<PdfMetadata | null> => {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(brand);

      request.onsuccess = () => {
        const result = request.result as StoredPdfRecord | undefined;
        if (result) {
          resolve({
            fileName: result.fileName,
            fileSize: result.fileSize,
            updatedAt: result.updatedAt,
          });
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        reject(request.error || new Error(`Error obteniendo info de PDF de ${brand}.`));
      };
    });
  } catch {
    return null;
  }
};

export const getAllCatalogPdfInfo = async (): Promise<Record<ActiveBrand, PdfMetadata | null>> => {
  const result: Record<ActiveBrand, PdfMetadata | null> = {
    ésika: null,
    cyzone: null,
    lbel: null,
  };

  try {
    const [esika, cyzone, lbel] = await Promise.all([
      getCatalogPdfInfo('ésika'),
      getCatalogPdfInfo('cyzone'),
      getCatalogPdfInfo('lbel'),
    ]);
    result.ésika = esika;
    result.cyzone = cyzone;
    result.lbel = lbel;
  } catch (e) {
    console.warn('Error loading PDF metadata list', e);
  }

  return result;
};

export const deleteCatalogPdf = async (brand: ActiveBrand): Promise<void> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(brand);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error(`Error eliminando PDF de ${brand}.`));
  });
};
