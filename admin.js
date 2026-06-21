/* ==========================================================================
   CORE NOTEBOOKS - ADMINISTRATIVE LOGIC (admin.js)
   Features: Dolar Blue API, CRUD Operations for catalog.json,
             Multipart Image Upload, and Excel Exporter.
   ========================================================================== */

let allNotebooks = [];
let blueRate = 1250; // Fallback rate

// DOM Elements
const blueRateValue = document.getElementById('blue-rate-value');
const dashboardSearch = document.getElementById('dashboard-search');
const tbody = document.getElementById('dashboard-products-tbody');
const addProductBtn = document.getElementById('dashboard-add-product-btn');
const exportExcelBtn = document.getElementById('dashboard-export-excel-btn');

// Modal Elements
const editModal = document.getElementById('dashboard-edit-modal');
const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
const cancelEditModalBtn = document.getElementById('cancel-edit-modal-btn');
const saveProductBtn = document.getElementById('save-product-btn');
const editProductForm = document.getElementById('edit-product-form');
const editProductFile = document.getElementById('edit-product-file');
const editImagePreview = document.getElementById('edit-product-image-preview');
const editImagePlaceholder = document.getElementById('edit-product-image-placeholder');

// Initial setup
window.addEventListener('DOMContentLoaded', async () => {
    await fetchExchangeRate();
    await loadCatalog();
    setupListeners();
});

// Fetch Dolar Blue
async function fetchExchangeRate() {
    try {
        const response = await fetch('https://dolarapi.com/v1/dolares/blue');
        if (!response.ok) throw new Error('API error');
        const data = await response.json();
        if (data && data.venta) {
            blueRate = Math.round(data.venta);
            blueRateValue.innerText = `$${blueRate.toLocaleString('es-AR')}`;
        }
    } catch (err) {
        console.warn("Could not fetch live Dolar Blue, using fallback:", blueRate);
        blueRateValue.innerText = `$${blueRate.toLocaleString('es-AR')} (Predeterminado)`;
    }
}

// Load Catalog
async function loadCatalog() {
    try {
        const response = await fetch('catalog.json');
        if (!response.ok) throw new Error('Catalog missing');
        allNotebooks = await response.json();
        renderDashboard();
    } catch (err) {
        console.error("Error loading catalog:", err);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">Error al cargar el catálogo de productos.</td></tr>`;
    }
}

// Render Table
function renderDashboard() {
    const searchPhrase = dashboardSearch.value.toLowerCase().trim();
    
    const displayProducts = allNotebooks.filter(item => {
        return searchPhrase === '' ||
            item.id.toLowerCase().includes(searchPhrase) ||
            item.name.toLowerCase().includes(searchPhrase) ||
            item.brand.toLowerCase().includes(searchPhrase) ||
            (item.specs && item.specs.cpu && item.specs.cpu.toLowerCase().includes(searchPhrase)) ||
            (item.specs && item.specs.ram && item.specs.ram.toLowerCase().includes(searchPhrase));
    });
    
    tbody.innerHTML = '';
    
    if (displayProducts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">No se encontraron productos.</td></tr>`;
        return;
    }
    
    displayProducts.forEach(item => {
        const cost = Number(item.price_usd);
        const sellingUsd = 1.20 * cost + 140;
        const profitUsd = sellingUsd - cost;
        
        // Custom badge for computer type
        let categoryIcon = "fa-laptop";
        if (item.category === 'gaming') categoryIcon = "fa-gamepad";
        else if (item.category === 'productivity') categoryIcon = "fa-laptop-code";
        else if (item.category === 'design') categoryIcon = "fa-palette";
        
        const typeBadge = item.type === 'desktop' ? 
            `<span class="card-category-badge" style="background: rgba(0, 113, 227, 0.1); border-color: rgba(0, 113, 227, 0.25); color: #8bbfff; font-size: 0.65rem; margin: 0; padding: 2px 6px;"><i class="fa-solid fa-desktop"></i> PC</span>` :
            `<span class="card-category-badge" style="font-size: 0.65rem; margin: 0; padding: 2px 6px;"><i class="fa-solid ${categoryIcon}"></i> ${item.category}</span>`;

        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';
        
        // If cost <= 700, highlight it as hidden from public web
        const isHidden = cost <= 700;
        const visibilityWarning = isHidden ? 
            `<span style="color: #ff3b30; font-size: 0.75rem; display: block; font-weight: normal; margin-top: 4px;"><i class="fa-solid fa-eye-slash"></i> Oculto al Público (costo <= $700)</span>` : 
            `<span style="color: #34c759; font-size: 0.75rem; display: block; font-weight: normal; margin-top: 4px;"><i class="fa-solid fa-eye"></i> Visible en Web</span>`;

        tr.innerHTML = `
            <td style="padding: 16px 8px; font-family: monospace; font-weight: bold; color: var(--accent-blue);">${item.id}</td>
            <td style="padding: 16px 8px; font-weight: 500;">${item.brand}</td>
            <td style="padding: 16px 8px;" title="${item.name}">
                <strong>${item.name.length > 40 ? item.name.substring(0, 40) + '...' : item.name}</strong>
                ${visibilityWarning}
            </td>
            <td style="padding: 16px 8px;">${typeBadge}</td>
            <td style="padding: 16px 8px; font-weight: bold; color: var(--text-muted);">U$S ${Math.round(cost).toLocaleString('es-AR')}</td>
            <td style="padding: 16px 8px; font-weight: bold; color: var(--accent-blue);">
                U$S ${Math.round(sellingUsd).toLocaleString('es-AR')}
                <span style="font-size: 0.75rem; display: block; font-weight: normal; color: var(--text-secondary); margin-top: 4px;">~$${Math.round(sellingUsd * blueRate).toLocaleString('es-AR')} ARS</span>
            </td>
            <td style="padding: 16px 8px; font-weight: bold; color: #34c759;">U$S ${Math.round(profitUsd).toLocaleString('es-AR')}</td>
            <td style="padding: 16px 8px; text-align: right; white-space: nowrap;">
                <button class="btn-admin-action btn-edit-product" data-id="${item.id}" style="margin-right: 6px;"><i class="fa-solid fa-edit"></i> Editar</button>
                <button class="btn-admin-action btn-delete btn-delete-product" data-id="${item.id}"><i class="fa-solid fa-trash"></i> Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // Bind action buttons
    tbody.querySelectorAll('.btn-edit-product').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.getAttribute('data-id');
            const product = allNotebooks.find(p => p.id === id);
            if (product) openEditModal(product);
        });
    });
    
    tbody.querySelectorAll('.btn-delete-product').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.getAttribute('data-id');
            if (confirm(`¿Estás seguro de que deseas eliminar el producto con ID ${id}?`)) {
                deleteProduct(id);
            }
        });
    });
}

// Setup Event Listeners
function setupListeners() {
    dashboardSearch.addEventListener('input', renderDashboard);
    
    addProductBtn.addEventListener('click', () => {
        openEditModal(null);
    });
    
    closeEditModalBtn.addEventListener('click', closeEditModal);
    cancelEditModalBtn.addEventListener('click', closeEditModal);
    
    editProductFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                editImagePreview.src = event.target.result;
                editImagePreview.style.display = 'block';
                editImagePlaceholder.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });
    
    saveProductBtn.addEventListener('click', handleSaveProduct);
    
    exportExcelBtn.addEventListener('click', handleExportExcel);
}

// Modal Controllers
function openEditModal(product = null) {
    const titleEl = document.getElementById('edit-modal-title');
    editProductForm.reset();
    
    if (product) {
        titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Editar Producto #${product.id}`;
        document.getElementById('edit-product-id').value = product.id;
        document.getElementById('edit-product-name').value = product.name;
        document.getElementById('edit-product-brand').value = product.brand;
        document.getElementById('edit-product-price').value = product.price_usd;
        document.getElementById('edit-product-category').value = product.category;
        document.getElementById('edit-product-type').value = product.type || 'notebook';
        document.getElementById('edit-product-cpu').value = product.specs.cpu;
        document.getElementById('edit-product-ram').value = product.specs.ram;
        document.getElementById('edit-product-ssd').value = product.specs.ssd;
        document.getElementById('edit-product-screen').value = product.specs.screen;
        document.getElementById('edit-product-gpu').value = product.specs.gpu;
        document.getElementById('edit-product-os').value = product.specs.os;
        
        if (product.image) {
            editImagePreview.src = product.image;
            editImagePreview.style.display = 'block';
            editImagePlaceholder.style.display = 'none';
        } else {
            editImagePreview.style.display = 'none';
            editImagePlaceholder.style.display = 'block';
        }
    } else {
        titleEl.innerHTML = `<i class="fa-solid fa-plus"></i> Agregar Nuevo Producto`;
        document.getElementById('edit-product-id').value = '';
        editImagePreview.style.display = 'none';
        editImagePlaceholder.style.display = 'block';
    }
    
    editModal.classList.add('modal-active');
}

function closeEditModal() {
    editModal.classList.remove('modal-active');
}

// Save Product Submission
async function handleSaveProduct(e) {
    e.preventDefault();
    
    if (!editProductForm.reportValidity()) {
        return;
    }
    
    const id = document.getElementById('edit-product-id').value;
    const name = document.getElementById('edit-product-name').value;
    const brand = document.getElementById('edit-product-brand').value;
    const price_usd = parseFloat(document.getElementById('edit-product-price').value);
    const category = document.getElementById('edit-product-category').value;
    const type = document.getElementById('edit-product-type').value;
    const cpu = document.getElementById('edit-product-cpu').value;
    const ram = document.getElementById('edit-product-ram').value;
    const ssd = document.getElementById('edit-product-ssd').value;
    const screen = document.getElementById('edit-product-screen').value;
    const gpu = document.getElementById('edit-product-gpu').value;
    const os = document.getElementById('edit-product-os').value;
    
    let imagePath = "";
    
    // Fallback or keep old image if no new file uploaded
    if (id) {
        const existing = allNotebooks.find(p => p.id === id);
        if (existing) {
            imagePath = existing.image;
        }
    }
    
    const file = editProductFile.files[0];
    if (file) {
        const formData = new FormData();
        formData.append('image', file);
        
        try {
            saveProductBtn.disabled = true;
            saveProductBtn.innerText = "Subiendo imagen...";
            
            const uploadResponse = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData
            });
            
            if (!uploadResponse.ok) throw new Error('Image upload failed');
            const uploadData = await uploadResponse.json();
            imagePath = uploadData.image_path;
        } catch (err) {
            console.error("Error uploading image:", err);
            alert("Error al subir la imagen. Se guardará sin foto nueva.");
        } finally {
            saveProductBtn.disabled = false;
            saveProductBtn.innerText = "Guardar Cambios";
        }
    }
    
    if (!imagePath) {
        // Set generic templates if missing
        if (category === 'gaming') imagePath = "assets/gaming_laptop.png";
        else if (category === 'design' || brand === 'Apple') imagePath = "assets/macbook.png";
        else if (category === 'office') imagePath = "assets/office_laptop.png";
        else imagePath = "assets/creative_laptop.png";
    }
    
    const productData = {
        id: id || generateUniqueId(),
        name,
        brand,
        price_usd,
        category,
        type,
        specs: { cpu, ram, ssd, screen, gpu, os },
        image: imagePath
    };
    
    if (id) {
        const idx = allNotebooks.findIndex(p => p.id === id);
        if (idx !== -1) allNotebooks[idx] = productData;
    } else {
        allNotebooks.push(productData);
    }
    
    const success = await saveCatalog();
    if (success) {
        alert("¡Catálogo guardado con éxito!");
        closeEditModal();
        renderDashboard();
    } else {
        alert("Ocurrió un error al guardar los cambios en catalog.json.");
    }
}

// Generate unique product ID
function generateUniqueId() {
    let newId;
    do {
        newId = Math.floor(10000 + Math.random() * 90000).toString();
    } while (allNotebooks.some(p => p.id === newId));
    return newId;
}

// Save catalog file back to local server disk
async function saveCatalog() {
    try {
        const response = await fetch('/api/save-catalog', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(allNotebooks)
        });
        if (!response.ok) throw new Error('API save catalog failed');
        const res = await response.json();
        return res.success;
    } catch (e) {
        console.error("Error calling save-catalog API:", e);
        return false;
    }
}

// Delete product
async function deleteProduct(id) {
    allNotebooks = allNotebooks.filter(p => p.id !== id);
    const success = await saveCatalog();
    if (success) {
        alert("Producto eliminado del stock local.");
        renderDashboard();
    } else {
        alert("Error al intentar guardar los cambios de eliminación.");
    }
}

// Export Excel Sheet
async function handleExportExcel() {
    try {
        exportExcelBtn.disabled = true;
        exportExcelBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exportando...';
        
        const response = await fetch('/api/export-excel', {
            method: 'POST'
        });
        
        if (!response.ok) throw new Error('Excel API failed');
        const data = await response.json();
        
        if (data.success) {
            alert("¡Planilla 'precios_venta.xlsx' exportada con éxito en la carpeta raíz del proyecto!");
        } else {
            alert("Ocurrió un error al exportar la planilla.");
        }
    } catch (e) {
        console.error("Error calling export-excel API:", e);
        alert("Error de red o de ejecución al exportar a Excel. Verificá que el servidor local esté activo.");
    } finally {
        exportExcelBtn.disabled = false;
        exportExcelBtn.innerHTML = '<i class="fa-solid fa-file-excel"></i> Exportar a Excel';
    }
}
