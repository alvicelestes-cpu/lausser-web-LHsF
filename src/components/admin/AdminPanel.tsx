import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Settings, 
  Save, 
  Trash2, 
  RefreshCw, 
  Image as ImageIcon, 
  Zap, 
  BookOpen, 
  Package, 
  Phone,
  LogOut,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle,
  Camera,
  Upload,
  X,
  Loader2,
  FileText,
  Clock,
  Sparkles,
  Cloud,
  CloudOff,
  Database
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import type { ActiveBrand, ProductCategory, CampaignConfig } from '../../types';
import { formatCurrency, getBrandTheme, parseCOP, formatToDateTimeLocal, parseDateTimeLocalToIso } from '../../utils/formatters';
import { supabase } from '../../lib/supabase';

export const AdminPanel: React.FC = () => {
  const { 
    products, 
    addProduct, 
    deleteProduct, 
    clearAllProducts,
    updateProduct,
    campaignConfig, 
    setCampaignConfig,
    resetToDefaults,
    setCurrentTab,
    logoutAdmin,
    changeAdminPassword,
    resetAdminPassword,
    defaultAdminPassword,
    openPdfViewer,
    uploadCatalogPdf,
    deleteCatalogPdfFile,
    syncStatus,
    isSyncing,
    isCloudSynced,
    refreshProducts,
    syncToCloud
  } = useStore();

  const [activeAdminTab, setActiveAdminTab] = useState<'nuevo' | 'inventario' | 'campana' | 'seguridad'>('nuevo');

  // Security / Password form state
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Quick product form state
  const [name, setName] = useState('');
  const [brand, setBrand] = useState<ActiveBrand>('ésika');
  const [category, setCategory] = useState<ProductCategory>('perfumeria');
  const [code, setCode] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [stock, setStock] = useState('5');
  const [imageUrl, setImageUrl] = useState('');
  const [volumeOrSize, setVolumeOrSize] = useState('');
  const [description, setDescription] = useState('');

  // Image upload & camera state
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Compress image to WebP/JPEG using HTML Canvas (max 800px, quality 0.78)
  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
          let { width, height } = img;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(img.src);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Intentar WebP para máxima compresión y bajo consumo de memoria
          try {
            const webp = canvas.toDataURL('image/webp', 0.78);
            if (webp && webp.startsWith('data:image/webp')) {
              resolve(webp);
              return;
            }
          } catch {
            // Continuar al fallback JPEG
          }

          resolve(canvas.toDataURL('image/jpeg', 0.78));
        };
        img.onerror = () => reject(new Error('Error al cargar la imagen'));
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingImage(true);
      const compressedDataUrl = await compressImageFile(file);
      setImageUrl(compressedDataUrl);
    } catch (err) {
      console.error('Error al procesar la imagen:', err);
      alert('Hubo un problema al procesar la imagen. Intenta con otra foto.');
    } finally {
      setIsCompressingImage(false);
      e.target.value = '';
    }
  };

  // Fotos de muestra oficiales para marcas Belcorp (Ésika, Cyzone, L'Bel)
  const imagePresets = [
    { label: 'Perfumería Ésika Femenina', brand: 'ésika', url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=700&q=80' },
    { label: 'Perfumería Masculina Ésika', brand: 'ésika', url: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=700&q=80' },
    { label: 'Labial Mate Colorfix', brand: 'ésika', url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=700&q=80' },
    { label: 'Máscara Pestañas Cyzone', brand: 'cyzone', url: 'https://images.unsplash.com/photo-1631214524020-7e18db9a8f92?auto=format&fit=crop&w=700&q=80' },
    { label: 'Sérum Facial L\'Bel', brand: 'lbel', url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=700&q=80' },
    { label: 'Crema / Cuidado Corporal', brand: 'ésika', url: 'https://images.unsplash.com/photo-1608248597359-52e6945037d4?auto=format&fit=crop&w=700&q=80' },
  ];

  const getFallbackProductImage = (selectedBrand: ActiveBrand): string => {
    switch (selectedBrand) {
      case 'ésika':
        return 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=700&q=80';
      case 'cyzone':
        return 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=700&q=80';
      case 'lbel':
        return 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=700&q=80';
      default:
        return 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=700&q=80';
    }
  };

  // Enlaces oficiales por defecto de Belcorp Colombia
  const OFFICIAL_CATALOG_URLS = {
    ésika: 'https://esika.tiendabelcorp.com.co/catalogo-digital',
    cyzone: 'https://cyzone.tiendabelcorp.com.co/catalogo-digital',
    lbel: 'https://lbel.tiendabelcorp.com.co/catalogo-digital',
  };

  // Campaign config form state
  const [campaignNumber, setCampaignNumber] = useState(campaignConfig.campaignNumber);
  const [closingDate, setClosingDate] = useState(() => formatToDateTimeLocal(campaignConfig.closingDate));
  const [whatsappNumber, setWhatsappNumber] = useState(campaignConfig.whatsappNumber);
  const [consultantName, setConsultantName] = useState(campaignConfig.consultantName);
  const [esikaUrl, setEsikaUrl] = useState(campaignConfig.catalogUrls?.ésika || OFFICIAL_CATALOG_URLS.ésika);
  const [cyzoneUrl, setCyzoneUrl] = useState(campaignConfig.catalogUrls?.cyzone || OFFICIAL_CATALOG_URLS.cyzone);
  const [lbelUrl, setLbelUrl] = useState(campaignConfig.catalogUrls?.lbel || OFFICIAL_CATALOG_URLS.lbel);

  // Sync state whenever campaignConfig changes in context
  useEffect(() => {
    setCampaignNumber(campaignConfig.campaignNumber);
    if (campaignConfig.closingDate) {
      setClosingDate(formatToDateTimeLocal(campaignConfig.closingDate));
    }
    setWhatsappNumber(campaignConfig.whatsappNumber);
    setConsultantName(campaignConfig.consultantName);
    setEsikaUrl(campaignConfig.catalogUrls?.ésika || OFFICIAL_CATALOG_URLS.ésika);
    setCyzoneUrl(campaignConfig.catalogUrls?.cyzone || OFFICIAL_CATALOG_URLS.cyzone);
    setLbelUrl(campaignConfig.catalogUrls?.lbel || OFFICIAL_CATALOG_URLS.lbel);
    setPdfUrlInputs({
      ésika: campaignConfig.catalogPdfUrls?.ésika || '',
      cyzone: campaignConfig.catalogPdfUrls?.cyzone || '',
      lbel: campaignConfig.catalogPdfUrls?.lbel || '',
    });
  }, [campaignConfig]);

  // PDF Catalog Management states
  const [uploadingBrand, setUploadingBrand] = useState<ActiveBrand | null>(null);
  const [pdfUrlInputs, setPdfUrlInputs] = useState<Record<ActiveBrand, string>>({
    ésika: campaignConfig.catalogPdfUrls?.ésika || '',
    cyzone: campaignConfig.catalogPdfUrls?.cyzone || '',
    lbel: campaignConfig.catalogPdfUrls?.lbel || '',
  });

  const handlePdfFileUpload = async (brandToUpload: ActiveBrand, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Por favor selecciona un archivo PDF válido (.pdf).');
      return;
    }
    setUploadingBrand(brandToUpload);
    try {
      // 1. Sanitizar el nombre del archivo
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const timestamp = Date.now();
      const storagePath = `${brandToUpload}/${timestamp}_${cleanFileName}`;

      // 2. Subir al bucket 'catalogs' de Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('catalogs')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/pdf',
        });

      if (uploadError) {
        console.warn('Error al subir PDF a Supabase Storage (bucket catalogs):', uploadError);
        alert(
          `Aviso de Supabase Storage: No se pudo subir el archivo al bucket "catalogs" (${uploadError.message}).\n\n` +
          `Para que el PDF esté disponible globalmente en todos los celulares y dispositivos, por favor ingresa un enlace / URL pública directa (ej. enlace público de Google Drive, Cloudinary o enlace de Somos Belcorp) en la Opción 2.`
        );
        // Guardar en almacenamiento local como respaldo
        await uploadCatalogPdf(brandToUpload, file);
        return;
      }

      if (uploadData) {
        // 3. Obtener URL pública
        const { data: urlData } = supabase.storage
          .from('catalogs')
          .getPublicUrl(storagePath);

        const publicUrl = urlData.publicUrl;
        console.log(`PDF de ${brandToUpload} subido a Supabase Storage:`, publicUrl);

        setPdfUrlInputs((prev) => ({
          ...prev,
          [brandToUpload]: publicUrl,
        }));

        const currentPdfUrls = {
          ...campaignConfig.catalogPdfUrls,
          [brandToUpload]: publicUrl,
        };

        const updatedPdfInfo = {
          ...campaignConfig.catalogPdfInfo,
          [brandToUpload]: {
            fileName: file.name,
            fileSize: file.size,
            updatedAt: new Date().toISOString(),
            isUploaded: true,
          },
        };

        const campaignName = campaignNumber.trim() || campaignConfig.campaignNumber || 'Campaña C-15 (2026)';
        const codeMatch = campaignName.match(/C-\d+/i);
        const campaignCode = codeMatch ? codeMatch[0].toUpperCase() : 'C-15';
        const isoClosingDate = parseDateTimeLocalToIso(closingDate);

        const safeEsikaUrl = esikaUrl.trim() || OFFICIAL_CATALOG_URLS.ésika;
        const safeCyzoneUrl = cyzoneUrl.trim() || OFFICIAL_CATALOG_URLS.cyzone;
        const safeLbelUrl = lbelUrl.trim() || OFFICIAL_CATALOG_URLS.lbel;

        const catalogLinksAndPdfs = {
          ésika: currentPdfUrls.ésika || safeEsikaUrl,
          cyzone: currentPdfUrls.cyzone || safeCyzoneUrl,
          lbel: currentPdfUrls.lbel || safeLbelUrl,
          pdfUrls: currentPdfUrls,
          catalogUrls: {
            ésika: safeEsikaUrl,
            cyzone: safeCyzoneUrl,
            lbel: safeLbelUrl,
          },
          pdfInfo: updatedPdfInfo,
          whatsappNumber: whatsappNumber.trim(),
          consultantName: consultantName.trim(),
        };

        const campaignPayload = {
          id: 'current_campaign',
          campaign_name: campaignName,
          campaign_code: campaignCode,
          end_date: isoClosingDate,
          catalogs: catalogLinksAndPdfs,
          updated_at: new Date().toISOString()
        };

        const { error: saveError } = await supabase.from('campaign_settings').upsert(campaignPayload);
        if (saveError) {
          console.error('Error al guardar en campaign_settings:', saveError);
          alert('Error al guardar configuración: ' + saveError.message);
        } else {
          try {
            await supabase.from('catalogs').upsert({
              id: 'active',
              campaign_number: campaignName,
              closing_date: isoClosingDate,
              whatsapp_number: whatsappNumber.trim(),
              consultant_name: consultantName.trim(),
              catalog_urls: catalogLinksAndPdfs.catalogUrls,
              catalog_pdf_urls: currentPdfUrls,
              catalog_pdf_info: updatedPdfInfo,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
          } catch (e) {
            console.warn(e);
          }

          const updatedCampaign: CampaignConfig = {
            campaignNumber: campaignName,
            closingDate: isoClosingDate,
            whatsappNumber: whatsappNumber.trim(),
            consultantName: consultantName.trim(),
            catalogUrls: catalogLinksAndPdfs.catalogUrls,
            catalogPdfUrls: currentPdfUrls,
            catalogPdfInfo: updatedPdfInfo,
          };

          // Guardar también en almacenamiento local como respaldo
          await uploadCatalogPdf(brandToUpload, file);

          setCampaignConfig(updatedCampaign);
          try {
            localStorage.setItem('lausser_campaign_v1', JSON.stringify(updatedCampaign));
          } catch (e) {
            console.error(e);
          }

          alert(`¡PDF de ${brandToUpload} subido a Supabase Storage y disponible en todos los dispositivos!`);
        }
      }
    } catch (err: any) {
      console.error('Error en upload:', err);
      alert('Error al procesar el archivo PDF: ' + (err?.message || err));
    } finally {
      setUploadingBrand(null);
      e.target.value = '';
    }
  };

  const handleSavePdfUrl = async (brandToSave: ActiveBrand) => {
    const url = (pdfUrlInputs[brandToSave] || '').trim();

    const currentPdfUrls = {
      ...campaignConfig.catalogPdfUrls,
      [brandToSave]: url,
    };

    const updatedPdfInfo = {
      ...campaignConfig.catalogPdfInfo,
      [brandToSave]: url
        ? {
            fileName: url.split('/').pop()?.split('?')[0] || `catalogo-${brandToSave}.pdf`,
            fileSize: 0,
            updatedAt: new Date().toISOString(),
            isUploaded: true,
          }
        : null,
    };

    const campaignName = campaignNumber.trim() || campaignConfig.campaignNumber || 'Campaña C-15 (2026)';
    const codeMatch = campaignName.match(/C-\d+/i);
    const campaignCode = codeMatch ? codeMatch[0].toUpperCase() : 'C-15';
    const isoClosingDate = parseDateTimeLocalToIso(closingDate);

    const safeEsikaUrl = esikaUrl.trim() || OFFICIAL_CATALOG_URLS.ésika;
    const safeCyzoneUrl = cyzoneUrl.trim() || OFFICIAL_CATALOG_URLS.cyzone;
    const safeLbelUrl = lbelUrl.trim() || OFFICIAL_CATALOG_URLS.lbel;

    const catalogLinksAndPdfs = {
      ésika: currentPdfUrls.ésika || safeEsikaUrl,
      cyzone: currentPdfUrls.cyzone || safeCyzoneUrl,
      lbel: currentPdfUrls.lbel || safeLbelUrl,
      pdfUrls: currentPdfUrls,
      catalogUrls: {
        ésika: safeEsikaUrl,
        cyzone: safeCyzoneUrl,
        lbel: safeLbelUrl,
      },
      pdfInfo: updatedPdfInfo,
      whatsappNumber: whatsappNumber.trim(),
      consultantName: consultantName.trim(),
    };

    const campaignPayload = {
      id: 'current_campaign',
      campaign_name: campaignName,
      campaign_code: campaignCode,
      end_date: isoClosingDate,
      catalogs: catalogLinksAndPdfs,
      updated_at: new Date().toISOString()
    };

    const { error: upsertErr } = await supabase.from('campaign_settings').upsert(campaignPayload);
    if (upsertErr) {
      console.error('Error al guardar URL de PDF en Supabase:', upsertErr);
      alert('Error al guardar URL: ' + upsertErr.message);
    } else {
      try {
        await supabase.from('catalogs').upsert({
          id: 'active',
          campaign_number: campaignName,
          closing_date: isoClosingDate,
          whatsapp_number: whatsappNumber.trim(),
          consultant_name: consultantName.trim(),
          catalog_urls: catalogLinksAndPdfs.catalogUrls,
          catalog_pdf_urls: currentPdfUrls,
          catalog_pdf_info: updatedPdfInfo,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch (e) {
        console.warn(e);
      }

      const updatedCampaign: CampaignConfig = {
        campaignNumber: campaignName,
        closingDate: isoClosingDate,
        whatsappNumber: whatsappNumber.trim(),
        consultantName: consultantName.trim(),
        catalogUrls: catalogLinksAndPdfs.catalogUrls,
        catalogPdfUrls: currentPdfUrls,
        catalogPdfInfo: updatedPdfInfo,
      };

      setCampaignConfig(updatedCampaign);
      try {
        localStorage.setItem('lausser_campaign_v1', JSON.stringify(updatedCampaign));
      } catch (e) {
        console.error(e);
      }

      alert(`¡Enlace de Revista ${brandToSave} guardado y disponible para todos los celulares!`);
    }
  };

  const handleDeletePdf = async (brandToDelete: ActiveBrand) => {
    if (!window.confirm(`¿Estás segura de eliminar la revista PDF de ${brandToDelete}?`)) {
      return;
    }

    setPdfUrlInputs((prev) => ({
      ...prev,
      [brandToDelete]: '',
    }));

    const currentPdfUrls = {
      ...campaignConfig.catalogPdfUrls,
      [brandToDelete]: '',
    };

    const updatedPdfInfo = {
      ...campaignConfig.catalogPdfInfo,
      [brandToDelete]: null,
    };

    const campaignName = campaignNumber.trim() || campaignConfig.campaignNumber || 'Campaña C-15 (2026)';
    const codeMatch = campaignName.match(/C-\d+/i);
    const campaignCode = codeMatch ? codeMatch[0].toUpperCase() : 'C-15';
    const isoClosingDate = parseDateTimeLocalToIso(closingDate);

    const safeEsikaUrl = esikaUrl.trim() || OFFICIAL_CATALOG_URLS.ésika;
    const safeCyzoneUrl = cyzoneUrl.trim() || OFFICIAL_CATALOG_URLS.cyzone;
    const safeLbelUrl = lbelUrl.trim() || OFFICIAL_CATALOG_URLS.lbel;

    const catalogLinksAndPdfs = {
      ésika: currentPdfUrls.ésika || safeEsikaUrl,
      cyzone: currentPdfUrls.cyzone || safeCyzoneUrl,
      lbel: currentPdfUrls.lbel || safeLbelUrl,
      pdfUrls: currentPdfUrls,
      catalogUrls: {
        ésika: safeEsikaUrl,
        cyzone: safeCyzoneUrl,
        lbel: safeLbelUrl,
      },
      pdfInfo: updatedPdfInfo,
      whatsappNumber: whatsappNumber.trim(),
      consultantName: consultantName.trim(),
    };

    await supabase.from('campaign_settings').upsert({
      id: 'current_campaign',
      campaign_name: campaignName,
      campaign_code: campaignCode,
      end_date: isoClosingDate,
      catalogs: catalogLinksAndPdfs,
      updated_at: new Date().toISOString()
    });

    try {
      await supabase.from('catalogs').upsert({
        id: 'active',
        campaign_number: campaignName,
        closing_date: isoClosingDate,
        whatsapp_number: whatsappNumber.trim(),
        consultant_name: consultantName.trim(),
        catalog_urls: catalogLinksAndPdfs.catalogUrls,
        catalog_pdf_urls: currentPdfUrls,
        catalog_pdf_info: updatedPdfInfo,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn(e);
    }

    await deleteCatalogPdfFile(brandToDelete);
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const regular = price ? parseCOP(price) : 0;
    const offer = discountPrice ? parseCOP(discountPrice) : 0;

    if (!name.trim() || (regular <= 0 && offer <= 0)) {
      alert('Ingresa el nombre del producto y un precio válido en pesos.');
      return;
    }

    // Si el usuario pone precio oferta, ese debe ser product.price (precio final de venta)
    // y el precio regular debe ser product.originalPrice para mostrar el tachado de descuento.
    // Si no pone oferta, el precio de venta es el regular.
    const finalPrice = offer > 0 ? offer : regular;
    const finalOriginalPrice = offer > 0 && regular > 0 ? regular : undefined;
    const stockQty = parseInt(stock, 10) || 1;
    const finalImage = imageUrl.trim() || getFallbackProductImage(brand);
    const finalVolume = volumeOrSize.trim() || undefined;

    addProduct({
      name: name.trim(),
      brand,
      category,
      code: code.trim() || undefined,
      price: finalPrice,
      originalPrice: finalOriginalPrice,
      discountPrice: finalOriginalPrice,
      stock: stockQty,
      imageUrl: finalImage,
      image: finalImage,
      image_url: finalImage,
      volume: finalVolume,
      presentation: finalVolume,
      volumeOrSize: finalVolume,
      description: description.trim() || 'Producto original disponible en stock para entrega inmediata.',
      rating: 4.9,
    });

    // Reset form
    setName('');
    setCode('');
    setPrice('');
    setDiscountPrice('');
    setVolumeOrSize('');
    setDescription('');
    setImageUrl('');
    setActiveAdminTab('inventario');
  };

  const handleCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const safeEsikaUrl = esikaUrl.trim() || OFFICIAL_CATALOG_URLS.ésika;
    const safeCyzoneUrl = cyzoneUrl.trim() || OFFICIAL_CATALOG_URLS.cyzone;
    const safeLbelUrl = lbelUrl.trim() || OFFICIAL_CATALOG_URLS.lbel;

    const currentPdfUrls = {
      ésika: (pdfUrlInputs.ésika || '').trim(),
      cyzone: (pdfUrlInputs.cyzone || '').trim(),
      lbel: (pdfUrlInputs.lbel || '').trim(),
    };

    const updatedPdfInfo = { ...(campaignConfig.catalogPdfInfo || {}) };
    (['ésika', 'cyzone', 'lbel'] as ActiveBrand[]).forEach((b) => {
      const url = currentPdfUrls[b];
      if (url) {
        updatedPdfInfo[b] = {
          fileName: updatedPdfInfo[b]?.fileName || url.split('/').pop()?.split('?')[0] || `catalogo-${b}.pdf`,
          fileSize: updatedPdfInfo[b]?.fileSize || 0,
          updatedAt: new Date().toISOString(),
          isUploaded: true,
        };
      } else {
        updatedPdfInfo[b] = null;
      }
    });

    const campaignName = campaignNumber.trim() || 'Campaña C-15 (2026)';
    const codeMatch = campaignName.match(/C-\d+/i);
    const campaignCode = codeMatch ? codeMatch[0].toUpperCase() : 'C-15';
    // Captura el valor exacto del input de fecha/hora de cierre asegurando formato ISO válido
    const finalClosingDate = parseDateTimeLocalToIso(closingDate);

    const catalogLinksAndPdfs = {
      ésika: currentPdfUrls.ésika || safeEsikaUrl,
      cyzone: currentPdfUrls.cyzone || safeCyzoneUrl,
      lbel: currentPdfUrls.lbel || safeLbelUrl,
      pdfUrls: currentPdfUrls,
      catalogUrls: {
        ésika: safeEsikaUrl,
        cyzone: safeCyzoneUrl,
        lbel: safeLbelUrl,
      },
      pdfInfo: updatedPdfInfo,
      whatsappNumber: whatsappNumber.trim(),
      consultantName: consultantName.trim(),
    };

    const campaignPayload = {
      id: 'current_campaign',
      campaign_name: campaignName,
      campaign_code: campaignCode,
      end_date: finalClosingDate, // Asegurar formato ISO o string válido
      catalogs: catalogLinksAndPdfs,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('campaign_settings').upsert(campaignPayload);
    if (error) {
      console.error('Error al guardar campaña en Supabase:', error);
      alert('Error al guardar campaña: ' + error.message);
    } else {
      try {
        await supabase.from('catalogs').upsert({
          id: 'active',
          campaign_number: campaignName,
          closing_date: finalClosingDate,
          whatsapp_number: whatsappNumber.trim(),
          consultant_name: consultantName.trim(),
          catalog_urls: catalogLinksAndPdfs.catalogUrls,
          catalog_pdf_urls: currentPdfUrls,
          catalog_pdf_info: updatedPdfInfo,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch (catErr) {
        console.warn('Aviso al guardar en catalogs:', catErr);
      }

      const updatedConfig: CampaignConfig = {
        campaignNumber: campaignName,
        closingDate: finalClosingDate,
        whatsappNumber: whatsappNumber.trim(),
        consultantName: consultantName.trim(),
        catalogUrls: catalogLinksAndPdfs.catalogUrls,
        catalogPdfUrls: currentPdfUrls,
        catalogPdfInfo: updatedPdfInfo,
      };

      setCampaignConfig(updatedConfig);
      try {
        localStorage.setItem('lausser_campaign_v1', JSON.stringify(updatedConfig));
      } catch (e) {
        console.error(e);
      }

      alert('¡Campaña y fecha de cierre sincronizadas con éxito en la nube!');
    }
  };

  const handlePasswordChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (!currentPassInput) {
      setPasswordFeedback({ type: 'error', message: 'Por favor ingresa tu contraseña actual.' });
      return;
    }

    if (newPassInput.length < 6) {
      setPasswordFeedback({ type: 'error', message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    if (newPassInput !== confirmPassInput) {
      setPasswordFeedback({ type: 'error', message: 'Las contraseñas nuevas no coinciden entre sí.' });
      return;
    }

    const result = changeAdminPassword(currentPassInput, newPassInput);
    if (result.success) {
      setCurrentPassInput('');
      setNewPassInput('');
      setConfirmPassInput('');
      setPasswordFeedback({ type: 'success', message: '¡Contraseña actualizada con éxito! Se guardó en tu navegador.' });
    } else {
      setPasswordFeedback({ type: 'error', message: result.message });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Admin Header */}
      <div className="bg-neutral-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white mb-2">
            <Settings className="w-3.5 h-3.5 text-rose-400" />
            <span>Panel de Administración Lausser</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold">
            Gestión de Inventario y Catálogos
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Sube nuevos productos en stock para entrega inmediata, actualiza los enlaces de catálogos y configura tu clave.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setCurrentTab('inmediata')}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Volver a la Tienda
          </button>
          
          <button
            onClick={logoutAdmin}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Cerrar sesión de administradora"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Cloud Synchronization Status Banner */}
      <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
        syncStatus === 'connected'
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          : syncStatus === 'syncing'
          ? 'bg-sky-50/70 border-sky-200 text-sky-950'
          : syncStatus === 'error' || syncStatus === 'offline'
          ? 'bg-amber-50/70 border-amber-200 text-amber-950'
          : 'bg-neutral-50 border-neutral-200 text-neutral-800'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
              syncStatus === 'connected'
                ? 'bg-emerald-600 text-white'
                : syncStatus === 'syncing'
                ? 'bg-sky-600 text-white animate-pulse'
                : syncStatus === 'error' || syncStatus === 'offline'
                ? 'bg-amber-600 text-white'
                : 'bg-neutral-700 text-white'
            }`}>
              {syncStatus === 'connected' ? (
                <Cloud className="w-5 h-5" />
              ) : syncStatus === 'syncing' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : syncStatus === 'local_fallback' ? (
                <Database className="w-5 h-5" />
              ) : (
                <CloudOff className="w-5 h-5" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm">
                  {syncStatus === 'connected' && 'Sincronización Global en la Nube (Activa)'}
                  {syncStatus === 'syncing' && 'Sincronizando con Supabase...'}
                  {syncStatus === 'local_fallback' && 'Persistencia Local (Fallback Activo)'}
                  {(syncStatus === 'offline' || syncStatus === 'error') && 'Modo Offline / Error de Conexión'}
                </span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  syncStatus === 'connected'
                    ? 'bg-emerald-200 text-emerald-800'
                    : syncStatus === 'syncing'
                    ? 'bg-sky-200 text-sky-800'
                    : syncStatus === 'local_fallback'
                    ? 'bg-neutral-200 text-neutral-700'
                    : 'bg-amber-200 text-amber-800'
                }`}>
                  {syncStatus === 'connected' ? 'En Tiempo Real' : syncStatus === 'syncing' ? 'Sincronizando' : 'Local'}
                </span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed max-w-2xl">
                {syncStatus === 'connected' && (
                  'Tus productos y catálogos están conectados a la base de datos Supabase. Los cambios que realices desde tu celular se actualizan al instante en todos los dispositivos de tus clientes sin necesidad de recargar la página.'
                )}
                {syncStatus === 'syncing' && (
                  'Conectando con la base de datos en la nube y verificando las últimas actualizaciones de inventario...'
                )}
                {syncStatus === 'local_fallback' && (
                  'Los productos se guardan de forma segura en este navegador. Para que los cambios que haces en tu celular se reflejen a los clientes en otros dispositivos, configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env (guía y esquema listos en supabase/schema.sql).'
                )}
                {(syncStatus === 'offline' || syncStatus === 'error') && (
                  'No se pudo conectar con la base de datos en la nube. Se están utilizando los datos guardados en este dispositivo como respaldo seguro.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
            {isCloudSynced ? (
              <button
                type="button"
                onClick={refreshProducts}
                disabled={isSyncing}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-rose-600' : 'text-neutral-500'}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Actualizar ahora'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={syncToCloud}
                disabled={isSyncing}
                className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Cloud className="w-3.5 h-3.5 text-rose-400" />
                <span>Subir inventario a la nube</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveAdminTab('nuevo')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeAdminTab === 'nuevo'
              ? 'border-rose-600 text-rose-600 bg-rose-50/50 rounded-t-xl'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Subir Producto en Stock</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('inventario')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeAdminTab === 'inventario'
              ? 'border-rose-600 text-rose-600 bg-rose-50/50 rounded-t-xl'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Inventario Actual ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('campana')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeAdminTab === 'campana'
              ? 'border-rose-600 text-rose-600 bg-rose-50/50 rounded-t-xl'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Catálogos y Campaña</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('seguridad')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeAdminTab === 'seguridad'
              ? 'border-rose-600 text-rose-600 bg-rose-50/50 rounded-t-xl'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Seguridad y Contraseña</span>
        </button>
      </div>

      {/* TAB 1: FORMULARIO RÁPIDO PARA SUBIR PRODUCTO */}
      {activeAdminTab === 'nuevo' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm max-w-3xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold font-serif text-neutral-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <span>Registrar Producto para Entrega Inmediata</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Los productos que agregues aquí aparecerán instantáneamente en la pestaña "Entrega Inmediata".
            </p>
          </div>

          <form onSubmit={handleProductSubmit} className="space-y-4">
            
            {/* Brand & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
                  Marca *
                </label>
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value as ActiveBrand)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-rose-500 focus:outline-none bg-white font-medium"
                >
                  <option value="ésika">Ésika</option>
                  <option value="cyzone">Cyzone</option>
                  <option value="lbel">L'Bel</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
                  Categoría *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProductCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-rose-500 focus:outline-none bg-white font-medium"
                >
                  <option value="perfumeria">Perfumería</option>
                  <option value="maquillaje">Maquillaje</option>
                  <option value="cuidado_facial">Cuidado Facial</option>
                  <option value="cuidado_personal">Cuidado Personal</option>
                  <option value="moda_accesorios">Moda y Joyería</option>
                </select>
              </div>
            </div>

            {/* Name & Code */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Perfume Mithyka 50ml"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
                  Código (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. 09142"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Hidden file inputs for direct camera and gallery upload */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageUpload}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            {/* Prices & Stock */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
                  Precio Regular ($ COP) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="Ej. 20000 o 20"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-rose-500 focus:outline-none"
                />
                {price ? (
                  <span className="text-[11px] font-bold text-rose-600 block mt-1">
                    Valor: {formatCurrency(parseCOP(price))}
                  </span>
                ) : (
                  <span className="text-[10px] text-neutral-400 block mt-1">
                    Ej: 20000 o 20 (será $ 20.000 COP)
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
                  Precio Oferta Lausser ($ COP)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej. 15000 o 15 (Opcional)"
                  value={discountPrice}
                  onChange={(e) => setDiscountPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-rose-500 focus:outline-none"
                />
                {discountPrice ? (
                  <span className="text-[11px] font-bold text-rose-600 block mt-1">
                    Oferta: {formatCurrency(parseCOP(discountPrice))}
                  </span>
                ) : (
                  <span className="text-[10px] text-neutral-400 block mt-1">
                    Opcional (se mostrará con descuento)
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
                  Stock Disponible *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Presentation/Size */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
                Presentación, Tono o Tamaño
              </label>
              <input
                type="text"
                placeholder="Ej. 50 ml, Tono Rosa Soñadora, Frasco con atomizador..."
                value={volumeOrSize}
                onChange={(e) => setVolumeOrSize(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-rose-500 focus:outline-none"
              />
            </div>

            {/* DIRECT PHOTO UPLOAD (CAMERA & GALLERY) */}
            <div className="p-4 sm:p-5 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-800 uppercase mb-0.5 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-rose-600" />
                  <span>Foto del Producto</span>
                </label>
                <p className="text-[11px] text-neutral-500">
                  Toma una foto con tu cámara o selecciónala de tu galería. Se optimizará y guardará directamente en el producto.
                </p>
              </div>

              {isCompressingImage && (
                <div className="py-4 text-center flex items-center justify-center gap-2 text-xs font-bold text-rose-600 bg-rose-50 rounded-xl border border-rose-200">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Optimizando foto para guardarla directamente...</span>
                </div>
              )}

              {/* Preview in real-time if an image is selected */}
              {imageUrl ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
                  <img
                    src={imageUrl}
                    alt="Vista previa de la foto"
                    className="w-28 h-28 object-cover rounded-xl border border-neutral-200 shrink-0 shadow-xs"
                  />
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Foto lista para guardar</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Esta imagen está procesada y se guardará directamente con el producto sin requerir URLs de internet.
                    </p>
                    <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap pt-1">
                      <label className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-xs active:scale-95">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Cambiar foto (Cámara / Galería)</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="sr-only"
                          onChange={handleImageUpload}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Quitar foto</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Botón principal visible con input file directo */}
                  <label className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm cursor-pointer shadow-md hover:shadow-lg transition-all active:scale-98">
                    <Camera className="w-5 h-5 text-rose-400" />
                    <span>📷 Subir foto desde Cámara o Galería</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={handleImageUpload}
                    />
                  </label>

                  {/* Opción para fototeca / archivos de PC */}
                  <label className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-semibold text-xs cursor-pointer transition-all">
                    <Upload className="w-4 h-4 text-neutral-500" />
                    <span>Seleccionar archivo desde galería o computadora</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
              )}

              {/* Preset photos for Ésika / Cyzone / L'Bel */}
              <div className="pt-2 border-t border-neutral-200/60">
                <span className="text-[11px] font-semibold text-neutral-600 block mb-2">
                  O selecciona una foto de muestra oficial (Ésika, Cyzone, L'Bel):
                </span>
                <div className="flex flex-wrap gap-2">
                  {imagePresets.map((preset, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setImageUrl(preset.url)}
                      className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                        imageUrl === preset.url
                          ? 'bg-rose-50 text-rose-700 border-rose-300 font-bold'
                          : 'bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
                Descripción Corta del Producto
              </label>
              <textarea
                rows={2}
                placeholder="Beneficios, notas de salida, tipo de fijación o cómo usar..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-rose-500 focus:outline-none"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>Guardar Producto en Stock Inmediato</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* TAB 2: INVENTARIO ACTUAL Y GESTIÓN */}
      {activeAdminTab === 'inventario' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
            <div>
              <h2 className="text-xl font-bold font-serif text-neutral-900">
                Productos en Stock ({products.length})
              </h2>
              <p className="text-xs text-neutral-500">
                Ajusta el stock o elimina productos directamente.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {isCloudSynced && (
                <button
                  type="button"
                  onClick={refreshProducts}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 border border-neutral-200 px-3 py-1.5 rounded-xl hover:bg-neutral-50 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Refrescar productos desde la base de datos Supabase"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-rose-600' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Refrescar nube'}</span>
                </button>
              )}

              {products.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('¿Deseas eliminar TODOS los productos para dejar el catálogo limpio y listo para tus productos reales?')) {
                      clearAllProducts();
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-colors font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Borrar todos los productos demo</span>
                </button>
              )}

              <button
                type="button"
                onClick={resetToDefaults}
                className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 border border-neutral-200 px-3 py-1.5 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restablecer demo</span>
              </button>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <Package className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-base text-neutral-900">El catálogo está limpio y sin productos</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Has borrado los productos demo con éxito. El inventario está listo para registrar tus productos reales con entrega inmediata.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setActiveAdminTab('nuevo')}
                  className="px-4 py-2 bg-neutral-900 text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-colors shadow-sm cursor-pointer"
                >
                  + Subir mi primer producto real
                </button>
                <button
                  onClick={resetToDefaults}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 text-xs font-semibold rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Recargar datos demo
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {products.map((product) => {
                const theme = getBrandTheme(product.brand);
                return (
                  <div key={product.id} className="py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.image || product.imageUrl || product.image_url}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded-xl border border-neutral-200 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.2 rounded-full ${theme.badge}`}>
                            {product.brand}
                          </span>
                          <span className="text-xs text-neutral-400 capitalize">
                            {product.category.replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-neutral-900">{product.name}</h4>
                        <div className="text-xs text-neutral-500 flex items-center gap-2">
                          <span className="font-bold text-neutral-800">
                            {formatCurrency(product.price)}
                          </span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="line-through text-neutral-400">
                              {formatCurrency(product.originalPrice)}
                            </span>
                          )}
                          {(product.volume || product.presentation || product.volumeOrSize) && (
                            <span>• {product.volume || product.presentation || product.volumeOrSize}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stock adjuster & delete */}
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
                        <span className="text-xs font-semibold text-neutral-500 px-2">Stock:</span>
                        <button
                          onClick={() =>
                            updateProduct({
                              ...product,
                              stock: Math.max(0, product.stock - 1),
                            })
                          }
                          className="w-7 h-7 flex items-center justify-center bg-white rounded-lg text-neutral-700 hover:bg-neutral-200 text-xs font-bold"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-neutral-900">
                          {product.stock}
                        </span>
                        <button
                          onClick={() =>
                            updateProduct({
                              ...product,
                              stock: product.stock + 1,
                            })
                          }
                          className="w-7 h-7 flex items-center justify-center bg-white rounded-lg text-neutral-700 hover:bg-neutral-200 text-xs font-bold"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="p-2 text-neutral-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                        title="Eliminar producto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GESTIÓN DE CATÁLOGOS Y CAMPAÑA */}
      {activeAdminTab === 'campana' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm max-w-3xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold font-serif text-neutral-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-rose-600" />
              <span>Configuración de Campaña y Revistas Digitales</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Define la fecha límite de cierre de la campaña actual y los enlaces a los catálogos en línea de cada marca.
            </p>
          </div>

          <form onSubmit={handleCampaignSubmit} className="space-y-4">
            
            {/* Campaign info & closing date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
                  Número de Campaña
                </label>
                <input
                  type="text"
                  required
                  value={campaignNumber}
                  onChange={(e) => setCampaignNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
                  Fecha y Hora de Cierre (Cuenta Regresiva)
                </label>
                <input
                  type="datetime-local"
                  required
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            {/* WhatsApp business number & consultant name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp de Recepción de Pedidos *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 573001234567"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-rose-500 focus:outline-none"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  Incluye el código de país sin el signo '+' (Ej: 57 para Colombia).
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
                  Nombre de Asesora / Consultora
                </label>
                <input
                  type="text"
                  required
                  value={consultantName}
                  onChange={(e) => setConsultantName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            {/* --- SECCIÓN PRINCIPAL: CARGA Y GESTIÓN DE REVISTAS PDF --- */}
            <div className="pt-4 border-t border-neutral-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-rose-600" />
                    <span>Carga y Gestión de Revistas PDF para Visor Interactivo</span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Sube el archivo PDF de cada marca para que tus clientes puedan hojearlo página por página dentro de la tienda.
                  </p>
                </div>
              </div>

              {/* Informative alert box */}
              <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-2xl text-xs text-rose-950 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Visor de PDF Integrado sin Redirecciones:</span>
                  <p className="text-[11px] text-rose-900/80 leading-relaxed">
                    Al subir un PDF, el botón "📖 Ver y pasar Revista Digital" abrirá inmediatamente el visor modal interactivo con paso de páginas, zoom, pantalla completa y acceso directo a pedir productos por código. Si una marca no tiene PDF, se mostrará un mensaje amigable indicando que estará disponible pronto.
                  </p>
                </div>
              </div>

              {/* Cards Grid for Each Brand */}
              <div className="space-y-4">
                {(['ésika', 'cyzone', 'lbel'] as ActiveBrand[]).map((brandKey) => {
                  const bTheme = getBrandTheme(brandKey);
                  const bName = brandKey === 'ésika' ? 'Ésika' : brandKey === 'cyzone' ? 'Cyzone' : "L'Bel";
                  const pdfInfo = campaignConfig.catalogPdfInfo?.[brandKey];
                  const hasDirectUrl = Boolean(campaignConfig.catalogPdfUrls?.[brandKey]);
                  const hasPdf = Boolean(pdfInfo || hasDirectUrl);
                  const isUploading = uploadingBrand === brandKey;

                  return (
                    <div
                      key={brandKey}
                      className="bg-neutral-50/70 border border-neutral-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs"
                    >
                      {/* Top Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`${bTheme.badge} text-xs font-bold uppercase px-3 py-1 rounded-full shadow-2xs`}>
                            {bName}
                          </span>
                          <span className="text-sm font-bold text-neutral-800">
                            Revista Digital {bName}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          {hasPdf ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>PDF cargado para Campaña activa</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Sin PDF (Próximamente disponible)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Current PDF Details & Quick Actions */}
                      {hasPdf && (
                        <div className="bg-white rounded-2xl p-4 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-0.5 text-xs text-neutral-600">
                            <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                              <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                              <span className="truncate max-w-xs">{pdfInfo?.fileName || 'PDF configurado por enlace'}</span>
                            </div>
                            {pdfInfo?.fileSize ? (
                              <p className="text-[11px] text-neutral-500">
                                Tamaño: {(pdfInfo.fileSize / (1024 * 1024)).toFixed(1)} MB • Actualizado: {new Date(pdfInfo.updatedAt).toLocaleDateString('es-CO')}
                              </p>
                            ) : hasDirectUrl ? (
                              <p className="text-[11px] text-neutral-500 truncate max-w-sm">
                                URL: {campaignConfig.catalogPdfUrls[brandKey]}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => openPdfViewer(brandKey)}
                              className="px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Abrir visor modal para comprobar la revista"
                            >
                              <Eye className="w-3.5 h-3.5 text-rose-400" />
                              <span>Previsualizar Revista</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePdf(brandKey)}
                              className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                              title="Eliminar PDF actual"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* File Upload & URL Inputs Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        
                        {/* Option 1: File Uploader Input */}
                        <div className="bg-white rounded-2xl p-4 border border-neutral-200 space-y-2">
                          <span className="text-xs font-bold text-neutral-700 block uppercase">
                            Opción 1: Subir Archivo PDF a la Nube (Supabase Storage)
                          </span>
                          <p className="text-[11px] text-neutral-500">
                            Sube el archivo PDF (.pdf) desde tu dispositivo. Se subirá al almacenamiento en la nube para que esté disponible en todos los celulares y computadores.
                          </p>
                          <div>
                            <input
                              type="file"
                              accept="application/pdf"
                              id={`pdf-file-${brandKey}`}
                              className="hidden"
                              onChange={(e) => handlePdfFileUpload(brandKey, e)}
                              disabled={isUploading}
                            />
                            <label
                              htmlFor={`pdf-file-${brandKey}`}
                              className={`w-full py-2.5 px-4 rounded-xl border border-dashed border-rose-300 hover:border-rose-500 bg-rose-50/40 hover:bg-rose-50 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                isUploading ? 'opacity-60 cursor-wait' : ''
                              }`}
                            >
                              {isUploading ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                                  <span>Subiendo archivo a Supabase Storage...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4" />
                                  <span>{hasPdf ? 'Reemplazar con nuevo archivo PDF' : 'Seleccionar Archivo PDF'}</span>
                                </>
                              )}
                            </label>
                          </div>
                        </div>

                        {/* Option 2: Direct PDF URL Input */}
                        <div className="bg-white rounded-2xl p-4 border border-neutral-200 space-y-2">
                          <span className="text-xs font-bold text-neutral-700 block uppercase">
                            Opción 2: O ingresar Enlace / URL pública del PDF (Drive / Belcorp)
                          </span>
                          <p className="text-[11px] text-neutral-500">
                            Pega un enlace público de Google Drive, Somos Belcorp, Cloudinary o cualquier URL externa. ¡Se sincronizará en todos los celulares!
                          </p>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="url"
                              placeholder="https://drive.google.com/... o https://.../revista.pdf"
                              value={pdfUrlInputs[brandKey] || ''}
                              onChange={(e) =>
                                setPdfUrlInputs((prev) => ({ ...prev, [brandKey]: e.target.value }))
                              }
                              className="flex-1 px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:border-rose-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSavePdfUrl(brandKey)}
                              className="px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs transition-colors shrink-0 cursor-pointer"
                            >
                              Guardar
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-5 h-5" />
                <span>Guardar Cambios de Campaña</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* TAB 4: SEGURIDAD Y CONFIGURACIÓN DE CONTRASEÑA */}
      {activeAdminTab === 'seguridad' && (
        <div className="space-y-6 max-w-2xl">
          
          {/* Main Change Password Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-bold font-serif text-neutral-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-rose-600" />
                <span>Cambiar Contraseña del Panel</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Actualiza la contraseña necesaria para ingresar al panel de administración y editar el stock o catálogos.
              </p>
            </div>

            {/* Feedback alert banner */}
            {passwordFeedback && (
              <div
                className={`p-4 rounded-2xl flex items-start gap-3 text-xs font-medium animate-in fade-in duration-200 ${
                  passwordFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {passwordFeedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <span className="text-sm shrink-0">⚠️</span>
                )}
                <span>{passwordFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
              
              {/* Current Password */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
                  Contraseña Actual *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    placeholder="Ingresa la contraseña actual..."
                    value={currentPassInput}
                    onChange={(e) => setCurrentPassInput(e.target.value)}
                    className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-rose-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1"
                    aria-label={showCurrentPass ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
                  Nueva Contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres..."
                    value={newPassInput}
                    onChange={(e) => setNewPassInput(e.target.value)}
                    className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-rose-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1"
                    aria-label={showNewPass ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-neutral-400 mt-1 block">
                  Recomendado: combina letras, números y símbolos para mayor seguridad.
                </span>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
                  Confirmar Nueva Contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Repite la nueva contraseña..."
                    value={confirmPassInput}
                    onChange={(e) => setConfirmPassInput(e.target.value)}
                    className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-rose-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1"
                    aria-label={showConfirmPass ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Nueva Contraseña</span>
                </button>
              </div>

            </form>
          </div>

          {/* Default Password & Reset Info Box */}
          <div className="bg-neutral-50 rounded-3xl p-6 border border-neutral-200/80 space-y-3">
            <div className="flex items-center gap-2 text-neutral-900 font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Contraseña Predeterminada de Fábrica</span>
            </div>
            
            <p className="text-xs text-neutral-600 leading-relaxed">
              La contraseña por defecto configurada para el sistema es: <code className="bg-white border border-neutral-200 px-2 py-0.5 rounded font-mono font-bold text-neutral-900">{defaultAdminPassword}</code>. 
              Si olvidas tu clave personalizada, puedes restablecerla a la clave original haciendo clic abajo:
            </p>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`¿Segura que deseas restablecer la contraseña a la clave de fábrica ("${defaultAdminPassword}")?`)) {
                    resetAdminPassword();
                    setCurrentPassInput('');
                    setNewPassInput('');
                    setConfirmPassInput('');
                    setPasswordFeedback({
                      type: 'success',
                      message: `Contraseña restablecida exitosamente a la de fábrica: "${defaultAdminPassword}".`
                    });
                  }
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Restablecer contraseña a la de fábrica ({defaultAdminPassword})</span>
              </button>
            </div>
          </div>

          {/* Active Session Management */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-neutral-800">Sesión Administrativa Activa</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Al salir o cerrar la ventana se mantendrá tu sesión protegida.
              </p>
            </div>

            <button
              type="button"
              onClick={logoutAdmin}
              className="px-4 py-2 bg-neutral-100 hover:bg-red-50 text-neutral-700 hover:text-red-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0 border border-neutral-200 hover:border-red-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión Ahora</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
