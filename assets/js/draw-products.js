document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('products-container');
    const workerUrl = 'https://waggy-cj-bridge.colcel2005.workers.dev/';

    if (!container) return;

    try {
        const response = await fetch(workerUrl);
        const result = await response.json();

        // CJ organiza los productos dentro de result.resultado.data.list
        if (result.resultado && result.resultado.data && result.resultado.data.list) {
            const products = result.resultado.data.list;

            if (products.length === 0) {
                container.innerHTML = '<div class="col-12 text-center"><p class="text-muted">No tienes productos agregados a tu catálogo de CJ aún.</p></div>';
                return;
            }

            container.innerHTML = products.map(product => `
                <div class="col-md-4 col-sm-6 mb-4">
                    <div class="product-item" style="border: 1px solid #f1ede7; padding: 15px; text-align: center; background: #fff; border-radius: 8px;">
                        <img src="${product.productImage || product.productImageOptionV2}" alt="${product.productNameEn}" class="img-fluid" style="max-height: 200px; object-fit: contain; margin-bottom: 10px;">
                        <h3 style="font-size: 16px; margin: 10px 0; color: #333; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 40px;">
                            ${product.productNameEn}
                        </h3>
                        <p style="color: #c5a880; font-weight: bold; font-size: 18px;">$${product.sellPrice || '0.00'}</p>
                        <a href="contact.html?sku=${product.productSku}" class="btn btn-dark btn-sm" style="background-color: #333; border: none; border-radius: 4px; padding: 8px 16px;">Ver Detalle</a>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="col-12 text-center"><p class="text-muted">No se encontraron productos por ahora.</p></div>';
        }
    } catch (error) {
        console.error("Error cargando productos:", error);
        container.innerHTML = '<div class="col-12 text-center"><p class="text-danger">Error al conectar con la tienda.</p></div>';
    }
});