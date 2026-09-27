import type { CampaignConfig, Product } from '../types';

export const initialProducts: Product[] = [
  // --- ÉSIKA ---
  {
    id: 'esk-01',
    name: 'Perfume Red Power Ésika 50ml',
    brand: 'ésika',
    category: 'perfumeria',
    code: '18492',
    price: 89000,
    discountPrice: 62000,
    stock: 5,
    imageUrl: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=700&q=80',
    description: 'Aroma oriental dulce con notas de flor de naranjo y néctar de grosella roja. Máxima duración y fijación premium.',
    rating: 4.9,
    isFeatured: true,
    volumeOrSize: '50 ml'
  },
  {
    id: 'esk-02',
    name: 'Labial Colorfix Duo Tattoo 24H',
    brand: 'ésika',
    category: 'maquillaje',
    code: '05432',
    price: 36000,
    discountPrice: 24900,
    stock: 12,
    imageUrl: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=700&q=80',
    description: 'Hasta 24 horas de color intacto. Cero retoques, no transfiere y cuenta con bálsamo hidratante para acabado satinado.',
    rating: 4.8,
    isFeatured: true,
    volumeOrSize: 'Tono Rosa Soñadora'
  },
  {
    id: 'esk-03',
    name: 'Máscara Mega Full Size Efecto Pestañas Postizas',
    brand: 'ésika',
    category: 'maquillaje',
    code: '09811',
    price: 42000,
    discountPrice: 28000,
    stock: 8,
    imageUrl: 'https://images.unsplash.com/photo-1631214524020-7e18db9a8f92?auto=format&fit=crop&w=700&q=80',
    description: 'Alargamiento extremo hasta por 24 horas. Cepillo flexible que curva y separa pestaña por pestaña a prueba de agua.',
    rating: 4.9,
    volumeOrSize: '8 g - Negro Extremo'
  },
  {
    id: 'esk-04',
    name: 'Perfume Pulso Ésika Masculino 100ml',
    brand: 'ésika',
    category: 'perfumeria',
    code: '03219',
    price: 110000,
    discountPrice: 79900,
    stock: 4,
    imageUrl: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=700&q=80',
    description: 'Aroma amaderado seductor con cardamomo y cedro rojo. El perfume masculino #1 en ventas de Ésika.',
    rating: 4.9,
    volumeOrSize: '100 ml'
  },
  {
    id: 'esk-05',
    name: 'Crema Corporal Multicream Nutrición Almendras',
    brand: 'ésika',
    category: 'cuidado_personal',
    code: '12401',
    price: 39000,
    discountPrice: 27500,
    stock: 6,
    imageUrl: 'https://images.unsplash.com/photo-1608248597359-52e6945037d4?auto=format&fit=crop&w=700&q=80',
    description: 'Hidratación intensiva por 48 horas con óleo de almendras y vitamina E. Absorción rápida sin sensación grasosa.',
    rating: 4.7,
    volumeOrSize: '1 Litro'
  },

  // --- CYZONE ---
  {
    id: 'cyz-01',
    name: 'Perfume Sweet Black Cyzone 50ml',
    brand: 'cyzone',
    category: 'perfumeria',
    code: '14210',
    price: 58000,
    discountPrice: 39900,
    stock: 10,
    imageUrl: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=700&q=80',
    description: 'Fragancia oriental dulce con notas de pink pomelo y sándalo. Intensa, juvenil y magnética.',
    rating: 4.9,
    isFeatured: true,
    volumeOrSize: '50 ml'
  },
  {
    id: 'cyz-02',
    name: 'Labial Mate Studio Look No Transfer',
    brand: 'cyzone',
    category: 'maquillaje',
    code: '07541',
    price: 28000,
    discountPrice: 19900,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=700&q=80',
    description: 'Color mate de larga duración 16H. Fórmula no pegajosa y enriquecida con activos hidratantes.',
    rating: 4.8,
    isFeatured: true,
    volumeOrSize: 'Tono Teddy Nude'
  },
  {
    id: 'cyz-03',
    name: 'Delineador Plumón Studio Look Waterproof',
    brand: 'cyzone',
    category: 'maquillaje',
    code: '08342',
    price: 24000,
    discountPrice: 16500,
    stock: 9,
    imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=700&q=80',
    description: 'Trazo de alta precisión y negro ultra pigmentado que no se corre ni transfiere durante todo el día.',
    rating: 4.7,
    volumeOrSize: 'Black Pro'
  },
  {
    id: 'cyz-04',
    name: 'Perfume Nitro Intense Masculino Cyzone',
    brand: 'cyzone',
    category: 'perfumeria',
    code: '11094',
    price: 64000,
    discountPrice: 44000,
    stock: 7,
    imageUrl: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=700&q=80',
    description: 'Frescura herbal energizante con acordes cítricos y notas de madera ambarada para el día a día.',
    rating: 4.6,
    volumeOrSize: '100 ml'
  },
  {
    id: 'cyz-05',
    name: 'Gel Limpiador Facial Purificante Skin First',
    brand: 'cyzone',
    category: 'cuidado_facial',
    code: '06810',
    price: 32000,
    discountPrice: 22000,
    stock: 11,
    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=700&q=80',
    description: 'Control de brillo y limpieza de poros con micro-burbujas botánicas y ácido salicílico suave.',
    rating: 4.8,
    volumeOrSize: '120 g'
  },

  // --- L'BEL ---
  {
    id: 'lbl-01',
    name: "Perfume Liasson L'Bel Haute Parfumerie 50ml",
    brand: 'lbel',
    category: 'perfumeria',
    code: '19041',
    price: 145000,
    discountPrice: 99000,
    stock: 3,
    imageUrl: 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=700&q=80',
    description: 'La elegancia personificada. Notas florales de lirio del valle, jazmín de Grasse y maderas preciosas.',
    rating: 5.0,
    isFeatured: true,
    volumeOrSize: '50 ml'
  },
  {
    id: 'lbl-02',
    name: "Sérum Concentré Total 10 Beneficios L'Bel",
    brand: 'lbel',
    category: 'cuidado_facial',
    code: '02188',
    price: 168000,
    discountPrice: 118000,
    stock: 4,
    imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=700&q=80',
    description: 'Tratamiento antiedad global que reactiva las células madre de la piel: firmeza, luminosidad y antiarrugas.',
    rating: 4.9,
    isFeatured: true,
    volumeOrSize: '50 ml'
  },
  {
    id: 'lbl-03',
    name: "Sérum Hyaluronic Complex 3D L'Bel",
    brand: 'lbel',
    category: 'cuidado_facial',
    code: '03411',
    price: 125000,
    discountPrice: 85000,
    stock: 6,
    imageUrl: 'https://images.unsplash.com/photo-1608248597350-9366d0c75cbe?auto=format&fit=crop&w=700&q=80',
    description: 'Ácido Hialurónico puro en 3 pesos moleculares que hidrata en superficie y rellena arrugas profundas.',
    rating: 5.0,
    volumeOrSize: '30 ml'
  },
  {
    id: 'lbl-04',
    name: "Base Clarifiant FPS 30 Tratamiento Antiedad L'Bel",
    brand: 'lbel',
    category: 'maquillaje',
    code: '04910',
    price: 88000,
    discountPrice: 59900,
    stock: 5,
    imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=700&q=80',
    description: 'Base de alta cobertura con acabado mate aterciopelado que aclara manchas progresivamente con FPS 30.',
    rating: 4.8,
    volumeOrSize: '30 ml - Clair 2'
  },
  {
    id: 'lbl-05',
    name: "Perfume Bleu Intense Masculino L'Bel 100ml",
    brand: 'lbel',
    category: 'perfumeria',
    code: '17202',
    price: 155000,
    discountPrice: 105000,
    stock: 3,
    imageUrl: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=700&q=80',
    description: 'Inspirado en la fuerza del mar. Aroma herbal acuático con notas de salvia francesa y vetiver de Haití.',
    rating: 4.9,
    volumeOrSize: '100 ml'
  }
];

// Helper to calculate a closing date in the near future (e.g. 4 days from now)
const getDefaultClosingDate = (): string => {
  const target = new Date();
  target.setDate(target.getDate() + 4);
  target.setHours(20, 0, 0, 0); // 8:00 PM
  return target.toISOString();
};

export const initialCampaignConfig: CampaignConfig = {
  campaignNumber: 'C-15 (2026)',
  closingDate: getDefaultClosingDate(),
  whatsappNumber: '573001234567',
  consultantName: 'Asesoría Lausser',
  catalogUrls: {
    ésika: 'https://esika.tiendabelcorp.com.co/catalogo-digital',
    cyzone: 'https://cyzone.tiendabelcorp.com.co/catalogo-digital',
    lbel: 'https://lbel.tiendabelcorp.com.co/catalogo-digital',
  },
  catalogPdfUrls: {
    ésika: '',
    cyzone: '',
    lbel: '',
  },
};
