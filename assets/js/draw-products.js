document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('products-container');
    const workerUrl = 'https://waggy-cj-bridge.colcel2005.workers.dev/';

    if (!container) return;

    try {
        const response = await fetch(workerUrl);
        const result = await response.json();

        if (result.resultado && result.resultado.data && result.resultado.data.list) {
            const products = result.resultado.data.list;

            container.innerHTML = products.map(product => {
                // Limpieza de URL de imagen para evitar bloqueos
                let imgSrc = product.productImage || product.image || 'images/hero-img.png';
                if (imgSrc.startsWith('http:')) {
                    imgSrc = imgSrc.replace('http:', 'https:');
                }

                return `
                <div class="col-md-4 col-sm-6 mb-4">
                    <div class="product-item" style="border: 1px solid #f1ede7; padding: 15px; text-align: center; background: #fff; border-radius: 8px; height: 100%;">
                        <img src="${imgSrc}" 
                             alt="${product.productNameEn}" 
                             class="img-fluid" 
                             style="height: 200px; width: 100%; object-fit: contain; margin-bottom: 10px;"
                             onerror="this.src='images/banner-img.png';">
                        <h3 style="font-size: 16px; margin: 10px 0; color: #333; height: 40px; overflow: hidden;">
                            ${product.productNameEn}
                        </h3>
                        <p style="color: #c5a880; font-weight: bold; font-size: 18px;">$${product.sellPrice || '0.00'}</p>
                        <a href="contact.html?sku=${product.productSku}" class="btn btn-dark btn-sm">Ver Detalle</a>
                    </div>
                </div>`;
            }).join('');
        }
    } catch (error) {
        console.error("Error en la carga:", error);
    }
});