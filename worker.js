// ============================================================
// Cloudflare Worker - API de Productos para Mascotas
// ============================================================

export default {
  async fetch(request, env) {
    // Obtener origen permitido desde variable de entorno (configurable)
    // Si no existe, usar "*" solo para desarrollo (cambiarlo en producción)
    const ALLOWED_ORIGIN = env.ALLOWED_ORIGIN || "*";
    
    const corsHeaders = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Responder a preflight CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Obtener la URL y el método
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Enrutamiento básico
    if (method === "GET" && path === "/api/products") {
      return handleGetProducts(request, env, corsHeaders);
    }

    // Si la ruta no existe
    return new Response(JSON.stringify({ error: "Ruta no encontrada" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  },
};

/**
 * Maneja la petición GET /api/products
 */
async function handleGetProducts(request, env, corsHeaders) {
  try {
    let products = [];

    // Intenta obtener los productos desde Cloudflare KV (si está configurado)
    if (env.PRODUCTS_KV) {
      const kvData = await env.PRODUCTS_KV.get("catalog", "json");
      if (kvData && Array.isArray(kvData)) {
        products = kvData;
      }
    }

    // Si no hay datos en KV, usar el catálogo mock (para desarrollo o respaldo)
    if (products.length === 0) {
      products = getMockProducts();
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Productos obtenidos con éxito",
        data: {
          list: products,
          total: products.length,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error en handleGetProducts:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Error interno del servidor",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Catálogo de productos de ejemplo (mock)
 * Se usa cuando no hay datos en KV o para pruebas
 */
function getMockProducts() {
  return [
    {
      productNameEn: "Dog Harness And Leash No Pull Nylon Pet Leashes Set",
      productImage: "https://cc-west-usa.oss-us-west-1.aliyuncens.com/20211103/10495811234.jpg",
      sellPrice: "18.91",
      productSku: "CJSB217533304DW",
    },
    {
      productNameEn: "Elegant Christmas Dog Collar - Rose Gold Metal Buckle",
      productImage: "https://cc-west-usa.oss-us-west-1.aliyuncens.com/20201020/21372551694.jpg",
      sellPrice: "18.50",
      productSku: "CJGX1546504-RED",
    },
    {
      productNameEn: "Automatic Stainless Steel Cat Water Fountain with Filter",
      productImage: "https://cc-west-usa.oss-us-west-1.aliyuncens.com/20210312/32571254812.jpg",
      sellPrice: "25.87",
      productSku: "CJJJ1230491-SS",
    },
    {
      productNameEn: "Ultrasonic Anti-Mosquito & Tick Insect Repellent Collar",
      productImage: "https://cc-west-usa.oss-us-west-1.aliyuncens.com/15984256/23891048571.jpg",
      sellPrice: "14.95",
      productSku: "CJJJ1093845-ALL",
    },
    {
      productNameEn: "Orthopedic Memory Foam Deep Sleep Dog & Cat Bed",
      productImage: "https://cc-west-usa.oss-us-west-1.aliyuncens.com/20200824/11452148751.jpg",
      sellPrice: "34.50",
      productSku: "CJMZ1009234-BR",
    },
    {
      productNameEn: "Interactive Smart Rolling Ball Toy for Dogs & Cats",
      productImage: "https://cc-west-usa.oss-us-west-1.aliyuncens.com/20210518/16405123954.jpg",
      sellPrice: "12.99",
      productSku: "CJYJ1100238-BL",
    },
  ];
}