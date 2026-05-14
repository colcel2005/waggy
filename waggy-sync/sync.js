 Archivo 1: sync.js (se ejecuta en tu PC)
// ============================================
// WAGGY SYNC - Sincronización CJ Dropshipping
// Ejecutar: node sync.js
// ============================================

const CJ_EMAIL = "colcel2005@gmail.com";
const CJ_API_KEY = "CJ28281@api@bccfe2b938a244b6816ed662a2335972";
const CF_ACCOUNT_ID = "a689101aa8d0d5e2375d76d0644007c9";
const CF_API_TOKEN = "cfut_RQBOtFzY1JfxsKe9IRZBOViSV7HSzSN3ZunoH0bCa34b5cdc";
const R2_BUCKET = "waggy-catalog";
const AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const MARGIN = 1.5; // +50%

// Keywords para filtrar productos de mascotas
const PET_KEYWORDS = [
  "dog", "cat", "pet", "puppy", "kitten", "bird", "fish",
  "hamster", "rabbit", "turtle", "parrot", "aquarium",
  "leash", "collar", "harness", "bed", "toy", "bowl",
  "carrier", "cage", "tank", "feeder", "grooming", "chew", "scratcher"
];

// ---- PASO 1: Autenticar con CJ ----
async function authenticateCJ() {
  console.log("🔐 Autenticando con CJ Dropshipping...");
  const response = await fetch("https://developers.cjdropshipping.com/api/v1/authentication/getAccessToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: CJ_EMAIL, apiKey: CJ_API_KEY })
  });
  const data = await response.json();
  if (!data.data || !data.data.accessToken) {
    throw new Error("Error autenticando con CJ: " + JSON.stringify(data));
  }
  console.log("✅ Autenticación CJ exitosa");
  return data.data.accessToken;
}

// ---- PASO 2: Obtener productos de CJ ----
async function getProducts(accessToken) {
  console.log("📦 Descargando productos de CJ...");
  let allProducts = [];
  
  for (let page = 1; page <= 5; page++) {
    const url = `https://developers.cjdropshipping.com/api/v1/product/list?pageNum=${page}&pageSize=50`;
    const response = await fetch(url, {
      headers: { "accessToken": accessToken, "Content-Type": "application/json" }
    });
    const data = await response.json();
    
    if (!data.data || !data.data.list || data.data.list.length === 0) break;
    allProducts = allProducts.concat(data.data.list);
    console.log(`   Página ${page}: ${data.data.list.length} productos`);
  }
  
  console.log(`📦 Total descargados: ${allProducts.length}`);
  return allProducts;
}

// ---- PASO 3: Filtrar productos de mascotas ----
function filterPetProducts(products) {
  const filtered = products.filter(p => {
    const text = ((p.productNameEn || "") + " " + (p.productDescriptionEn || "")).toLowerCase();
    return PET_KEYWORDS.some(kw => text.includes(kw));
  });
  console.log(`🐾 Filtrados para mascotas: ${filtered.length} de ${products.length}`);
  return filtered;
}

// ---- PASO 4: Enriquecer con Workers AI ----
async function enrichWithAI(products) {
  console.log("🤖 Enriqueciendo con Workers AI...");
  const enriched = [];
  
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const titleEn = p.productNameEn || "Sin título";
    const descEn = (p.productDescriptionEn || "").substring(0, 300);
    
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${AI_MODEL}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${CF_API_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content: "Eres un experto en marketing de tienda online de mascotas. Genera títulos atractivos y descripciones persuasivas en español, optimizados para SEO. Responde SOLO con el JSON solicitado, sin texto adicional."
              },
              {
                role: "user",
                content: `Traduce y optimiza este producto para una tienda de mascotas en español. Título original: "${titleEn}". Descripción original: "${descEn}". Responde en este formato JSON exacto: {"titulo": "título optimizado en español", "descripcion": "descripción persuasiva de 2-3 líneas en español"}`
              }
            ],
            max_tokens: 300
          })
        }
      );
      
      const data = await response.json();
      let aiResult = { titulo: titleEn, descripcion: descEn };
      
      if (data.result && data.result.response) {
        try {
          const cleaned = data.result.response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          aiResult = JSON.parse(cleaned);
        } catch (e) {
          aiResult.titulo = data.result.response.substring(0, 80);
        }
      }
      
      // Calcular precio con margen +50%
      const basePrice = parseFloat(p.sellingPrice) || parseFloat(p.price) || 0;
      const finalPrice = (basePrice * MARGIN).toFixed(2);
      
      // Seleccionar imágenes
      const images = (p.productImage || []).map(img => img.url || img).slice(0, 4);
      
      enriched.push({
        id: p.pid || p.productId || `prod-${i}`,
        titulo: aiResult.titulo,
        descripcion: aiResult.descripcion,
        precioOriginal: basePrice.toFixed(2),
        precioVenta: finalPrice,
        imagenes: images,
        variantes: p.productVariantValues || [],
        stock: p.inventory || 0,
        sku: p.productSku || "",
        peso: p.productWeight || "",
        categoria: "mascotas"
      });
      
      console.log(`   ✅ [${i + 1}/${products.length}] ${aiResult.titulo}`);
      
      // Pausa para no exceder rate limit (300 req/min)
      if (i % 10 === 9) {
        console.log("   ⏳ Pausa de 3 segundos...");
        await new Promise(r => setTimeout(r, 3000));
      }
      
    } catch (error) {
      console.log(`   ❌ [${i + 1}] Error: ${error.message}`);
    }
  }
  
  return enriched;
}

// ---- PASO 5: Subir catalog.json a R2 ----
async function uploadToR2(catalog) {
  console.log("☁️ Subiendo catalog.json a R2...");
  const jsonContent = JSON.stringify(catalog, null, 2);
  
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects/catalog.json`,
    {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${CF_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: jsonContent
    }
  );
  
  if (!response.ok) {
    // Método alternativo usando S3 API
    console.log("   Intentando método alternativo...");
    const uploadResponse = await fetch(
      `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com/catalog.json`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": jsonContent.length.toString()
        },
        body: jsonContent
      }
    );
  }
  
  console.log("✅ catalog.json subido a R2");
}

// ---- EJECUCIÓN PRINCIPAL ----
async function main() {
  console.log("🚀 WAGGY SYNC - Iniciando sincronización\n");
  
  try {
    const token = await authenticateCJ();
    const products = await getProducts(token);
    const petProducts = filterPetProducts(products);
    const enriched = await enrichWithAI(petProducts);
    
    const catalog = {
      tienda: "colcel.shop",
      version: "1.0.0",
      ultimaActualizacion: new Date().toISOString(),
      totalProductos: enriched.length,
      productos: enriched
    };
    
    await uploadToR2(catalog);
    
    console.log(`\n🎉 ¡Sincronización completada! ${enriched.length} productos actualizados`);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main();
📄 Archivo 2: draw-products.js (script de dibujado para el frontend)
// ============================================
// WAGGY - Script de Dibujado de Productos
// Se agrega al HTML de la plantilla Waggy
// ============================================

const CATALOG_URL = "https://waggy-catalog.<tu-r2-dev-url>/catalog.json";

async function loadCatalog() {
  try {
    const response = await fetch(CATALOG_URL);
    if (!response.ok) throw new Error("Error cargando catálogo");
    const catalog = await response.json();
    renderProducts(catalog.productos);
  } catch (error) {
    console.error("Error:", error);
    showErrorMessage();
  }
}

function renderProducts(productos) {
  const container = document.getElementById("products-container");
  if (!container) return;
  
  container.innerHTML = "";
  
  productos.forEach(producto => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-image">
        <img src="${producto.imagenes[0] || ''}" 
             alt="${producto.titulo}" 
             loading="lazy"
             onerror="this.src='https://via.placeholder.com/300x300?text=Sin+Imagen'">
      </div>
      <div class="product-info">
        <h3 class="product-title">${producto.titulo}</h3>
        <p class="product-description">${producto.descripcion}</p>
        <div class="product-price">$${producto.precioVenta} USD</div>
        <button class="buy-button" onclick="handleBuy('${producto.id}')">
          Comprar Ahora
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function handleBuy(productId) {
  // Redirigir a checkout o carrito
  window.location.href = `/checkout.html?product=${productId}`;
}

function showErrorMessage() {
  const container = document.getElementById("products-container");
  if (container) {
    container.innerHTML = `
      <div class="error-message">
        <p>No se pudieron cargar los productos en este momento.</p>
        <button onclick="loadCatalog()">Reintentar</button>
      </div>
    `;
  }
}

// Cargar al iniciar la página
document.addEventListener("DOMContentLoaded", loadCatalog);
📄 Archivo 3: CSS para las tarjetas de producto
/* ============================================
   WAGGY - Estilos de Tarjetas de Producto
   ============================================ */

#products-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.product-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}

.product-image {
  width: 100%;
  height: 280px;
  overflow: hidden;
  background: #f5f5f5;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.product-card:hover .product-image img {
  transform: scale(1.05);
}

.product-info {
  padding: 16px 20px 20px;
}

.product-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px;
  line-height: 1.3;
}

.product-description {
  font-size: 14px;
  color: #666;
  margin: 0 0 12px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-price {
  font-size: 22px;
  font-weight: 700;
  color: #e74c3c;
  margin-bottom: 16px;
}

.buy-button {
  width: 100%;
  padding: 12px;
  background: #2ecc71;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.buy-button:hover {
  background: #27ae60;
}

.error-message {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error-message button {
  margin-top: 12px;
  padding: 10px 24px;
  background: #2ecc71;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}