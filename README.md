# 🌸 Lausser Web - Plataforma de Belleza & Cosmética Belcorp

Plataforma web moderna **Mobile-First** para la venta y gestión de cosméticos y perfumería de las marcas **Ésika**, **Cyzone** y **L'Bel**, optimizada para consultoras y clientes.

---

## 🚀 Características Principales

1. **Interfaz Mobile-First & Responsive**:
   - Experiencia de usuario fluida, pensada especialmente para smartphones y tablets.
   - Barra de navegación inferior móvil para acceso rápido con el pulgar.
   - Header con selector de marcas distintivo (Ésika, Cyzone, L'Bel) y contador de carrito.

2. **Módulo de Catálogos & Revistas Digitales**:
   - Pestañas por marca con temas visuales propios.
   - Visor interactivo integrado (embed/iframe responsivo) y opción a pantalla completa.
   - Carrusel de páginas destacadas con acceso directo para añadir códigos.
   - **Banner con cuenta regresiva en vivo** para el cierre de campaña.
   - **Modal para pedir por código de revista**: Permite al cliente escribir el código de producto (5-6 dígitos), página, tono y cantidad para sumarlo a su pedido.

3. **Módulo de Entrega Inmediata (Stock Físico)**:
   - Cuadrícula de productos con fotos de alta calidad, precios regulares y con descuento.
   - Filtros por categoría (Perfumería, Maquillaje, Cuidado Facial, Cuidado Personal, Moda y Joyería).
   - Búsqueda en tiempo real por nombre, marca o código.
   - Modal de vista rápida y detalles con selector de cantidades.

4. **Carrito de Compras con Checkout vía WhatsApp**:
   - **Separación visual clara** de productos en:
     - ⚡ **Entrega Inmediata** (Despacho 24h)
     - 📖 **Pedido de Campaña** (Por código de revista)
   - Resumen financiero detallado (subtotales y total en COP).
   - Formulario de datos para la entrega (Nombre, WhatsApp, Dirección, Ciudad/Barrio, Notas y Método de pago).
   - **Generación automática del enlace de WhatsApp**: Genera el mensaje estructurado con emojis y detalle listo para enviar a la asesora.

5. **Panel de Administración (`/admin`)**:
   - Formulario rápido para subir productos en stock físico con selector de fotos preset o URLs personalizadas.
   - Modificación en línea de cantidades de inventario y eliminación de productos.
   - Configuración de la campaña: número de campaña, fecha y hora de cierre, número de WhatsApp y enlaces a catálogos oficiales.
   - Persistencia local automática en `localStorage` con botón para reiniciar datos de prueba.

---

## 🛠️ Stack Tecnológico

- **React 19**
- **Vite 8**
- **TypeScript**
- **Tailwind CSS v4** (`@tailwindcss/vite`)
- **Lucide Icons**
- **Supabase Cloud Persistence & Realtime** (`@supabase/supabase-js`)

---

## ☁️ Sincronización en la Nube (Supabase Backend)

Lausser-Web cuenta con una capa de persistencia global en tiempo real mediante **Supabase**, lo que permite que los cambios realizados por la administradora (desde su celular o computadora) se sincronicen de inmediato a todos los clientes que visiten la tienda:

### 1. Variables de Entorno Requeridas
Crea un archivo `.env` en la raíz del proyecto tomando como base `.env.example`:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### 2. Esquema de Base de Datos
Ejecuta el script SQL en el SQL Editor de tu proyecto Supabase:
- Archivo: [`supabase/schema.sql`](supabase/schema.sql)
- Crea las tablas `products` y `catalogs`.
- Habilita Row Level Security (RLS) con políticas de lectura pública y escritura.
- Configura publicaciones de **Supabase Realtime** para recepción instantánea de altas, bajas y modificaciones.
- Incluye datos iniciales de prueba (seed).

### 3. Modo de Fallback Seguro
Si las variables de entorno de Supabase aún no han sido configuradas o no hay conexión a internet, la aplicación activa automáticamente un **Fallback Local Seguro (`localStorage`)** garantizando que la tienda siga funcionando de forma ininterrumpida.

---

## 💻 Instalación y Ejecución

Clonar el repositorio y entrar al directorio:
```bash
git clone https://github.com/alvicelestes-cpu/lausser-web.git
cd lausser-web
```

Instalar dependencias:
```bash
npm install
```

Iniciar servidor de desarrollo:
```bash
npm run dev
```

Compilar para producción:
```bash
npm run build
```
