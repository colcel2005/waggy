document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('products-container');
    const workerUrl = 'https://waggy-cj-bridge.colcel2005.workers.dev/';

    try {
        const response = await fetch(workerUrl);
        const result = await response.json();

        if (result.data) {
            // Aquí mapeas los productos de CJ a tu HTML
            container.innerHTML = result.data.map(product => `
                <div class="product-card">
                    <img src="${product.productImage}" alt="${product.productName}">
                    <h3>${product.productName}</h3>
                    <p>$${product.productPrice}</p>
                </div>
            `).join('');
        } else {
            container.innerHTML = "<p>No se encontraron productos por ahora.</p>";
        }
    } catch (error) {
        console.error("Error cargando productos:", error);
        container.innerHTML = "<p>Error al conectar con la tienda.</p>";
    }
});