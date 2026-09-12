/* ==========================================================================
   CORE NOTEBOOKS - APPLICATION LOGIC
   Features: Dolar Blue API, Dynamic Catalog Filtering,
             WhatsApp Integration, and a catalog-based buying guide.
   ========================================================================== */

// Global configuration and state
const WSP_NUMBER = "543757685727"; // Argentine sales WhatsApp number
let pricingConfig = { markup_factor: 1.20, fixed_fee_usd: 140 }; // Loaded dynamically from pricing_config.json
let allNotebooks = [];
let filteredNotebooks = [];
let blueRate = 0; // ARS is enabled only after a verified exchange-rate response.
let currentCurrency = 'USD'; // 'USD' or 'ARS'


// UI State Filters
let activeBrand = 'all';
let activeCategory = 'all';
let maxPrice = 4500;
let searchPhrase = '';

// DOM Elements

// App Header rates & actions
const rateBadge = document.getElementById('rate-badge');
const blueRateValue = document.getElementById('blue-rate-value');
const currencyToggle = document.getElementById('currency-toggle');
const signupBtn = document.getElementById('signup-btn');
const navAdvisorLink = document.getElementById('nav-advisor-link');

// Hero CTA
const heroScheduleBtn = document.getElementById('hero-schedule-btn');

// Collapsible filters toggle button
const toggleFiltersBtn = document.getElementById('toggle-filters-btn');
const filterPanel = document.getElementById('catalog-filter-panel');

// Catalog filters & grid
const catalogSearch = document.getElementById('catalog-search');
const brandFilters = document.getElementById('brand-filters');
const categoryFilters = document.getElementById('category-filters');
const priceRange = document.getElementById('price-range');
const priceSliderValue = document.getElementById('price-slider-value');
const resetFiltersBtn = document.getElementById('reset-filters');
const productsGrid = document.getElementById('products-grid');

// Modals
const detailModal = document.getElementById('detail-modal');
const detailModalBody = document.getElementById('detail-modal-body');

// AI Chatbot
const aiBubbleTrigger = document.getElementById('ai-bubble-trigger');
const aiChatPanel = document.getElementById('ai-chat-panel');
const closeChatBtn = document.getElementById('close-chat-btn');
const chatMessagesContainer = document.getElementById('chat-messages-container');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');

/* ==========================================================================
   1. CINEMATIC FULLSCREEN INTRO OVERLAY
   ========================================================================== */
/* ==========================================================================
   2. DOLAR BLUE API & EXCHANGE RATES
   ========================================================================== */
async function fetchExchangeRate() {
    try {
        const response = await fetch('https://dolarapi.com/v1/dolares/blue', { signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw new Error('Cotización no disponible');
        const data = await response.json();
        if (!Number.isFinite(Number(data.venta)) || Number(data.venta) <= 0) throw new Error('Cotización inválida');
        blueRate = Math.round(Number(data.venta));
        blueRateValue.innerText = '$' + blueRate.toLocaleString('es-AR');
        currencyToggle.disabled = false;
    } catch (err) {
        blueRateValue.innerText = 'No disponible · precios en USD';
        currencyToggle.disabled = true;
    }
}

// Handle currency toggle change
currencyToggle.addEventListener('change', (e) => {
    currentCurrency = e.target.checked ? 'ARS' : 'USD';
    console.log(`Currency switched to: ${currentCurrency}`);
    
    // Convert current filtering price range
    adjustPriceSliderForCurrency();
    renderNotebooks();
    renderFeaturedNotebooks();
});

function initFilterState() {
    const factor = pricingConfig.markup_factor;
    const fee = pricingConfig.fixed_fee_usd;
    if (currentCurrency === 'ARS') {
        maxPrice = Math.round((factor * 4500 + fee) * blueRate);
    } else {
        maxPrice = Math.round(factor * 4500 + fee);
    }
}

function adjustPriceSliderForCurrency() {
    const factor = pricingConfig.markup_factor;
    const fee = pricingConfig.fixed_fee_usd;
    if (currentCurrency === 'ARS') {
        const minARS = Math.round((factor * 300 + fee) * blueRate);
        const maxARS = Math.round((factor * 4500 + fee) * blueRate);
        priceRange.min = minARS;
        priceRange.max = maxARS;
        priceRange.step = 50000;
        
        if (maxPrice <= 6000) {
            maxPrice = Math.round(maxPrice * blueRate);
        }
        if (maxPrice < minARS || maxPrice > maxARS) {
            maxPrice = maxARS;
        }
        priceRange.value = maxPrice;
        priceSliderValue.innerText = `$${parseInt(priceRange.value).toLocaleString('es-AR')} ARS`;
    } else {
        const minUSD = Math.round(factor * 300 + fee);
        const maxUSD = Math.round(factor * 4500 + fee);
        priceRange.min = minUSD;
        priceRange.max = maxUSD;
        priceRange.step = 100;
        
        if (maxPrice > 100000) {
            maxPrice = Math.round(maxPrice / blueRate);
        }
        if (maxPrice < minUSD || maxPrice > maxUSD) {
            maxPrice = maxUSD;
        }
        priceRange.value = maxPrice;
        priceSliderValue.innerText = `$${Math.round(priceRange.value)} USD`;
    }
}

/* ==========================================================================
   3. CATALOG RENDERING & FILTERS
   ========================================================================== */
async function loadCatalog() {
    try {
        // Load pricing config first
        try {
            const configResponse = await fetch('pricing_config.json');
            if (configResponse.ok) {
                pricingConfig = await configResponse.json();
                console.log("Pricing Config loaded:", pricingConfig);
            }
        } catch (configErr) {
            console.warn("Could not load pricing_config.json, using defaults:", configErr);
        }

        const response = await fetch('catalog.json');
        if (!response.ok) throw new Error('Catalog missing');
        allNotebooks = await response.json();
        
        // Ensure no PC Gamer remains (filter desktops if any slipped through)
        allNotebooks = allNotebooks.filter(item => item.type !== 'desktop');
        filteredNotebooks = [...allNotebooks];
        
        // Build price ranges
        initFilterState();
        adjustPriceSliderForCurrency();
        renderNotebooks();
        renderFeaturedNotebooks();
        setupSpotlightEffects();

    } catch (err) {
        console.error("Error loading catalog database:", err);
        const errorMessage = `<div class="grid-placeholder">No pudimos cargar el catálogo. Recargá la página o consultanos por WhatsApp.</div>`;
        productsGrid.innerHTML = errorMessage;
        document.getElementById("featured-grid").innerHTML = errorMessage;
    }
}

function setupToggleFilters() {
    if (toggleFiltersBtn) {
        toggleFiltersBtn.addEventListener('click', () => {
            const isCollapsed = filterPanel.classList.toggle('filter-panel-collapsed');
            toggleFiltersBtn.classList.toggle('active', !isCollapsed);
        });
    }
}

function renderNotebooks() {
    // Advanced filters matching view (by default filters are set to show everything)
    filteredNotebooks = allNotebooks.filter(item => {
        // Hide if not published
        if (item.published === false) return false;
        
        const matchesSearch = searchPhrase === '' || 
            item.name.toLowerCase().includes(searchPhrase) ||
            item.brand.toLowerCase().includes(searchPhrase) ||
            (item.specs.cpu && item.specs.cpu.toLowerCase().includes(searchPhrase)) ||
            (item.specs.ram && item.specs.ram.toLowerCase().includes(searchPhrase)) ||
            (item.specs.gpu && item.specs.gpu.toLowerCase().includes(searchPhrase));
            
        const matchesBrand = activeBrand === 'all' || item.brand === activeBrand;
        const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
        
        const sellingUsd = item.custom_price_usd && Number(item.custom_price_usd) > 0 ?
            Number(item.custom_price_usd) :
            (pricingConfig.markup_factor * item.price_usd + pricingConfig.fixed_fee_usd);
        const priceToCompare = currentCurrency === 'ARS' ? 
            (sellingUsd * blueRate) : 
            sellingUsd;
        const matchesPrice = priceToCompare <= maxPrice;
        
        return matchesSearch && matchesBrand && matchesCategory && matchesPrice;
    });

    if (filteredNotebooks.length === 0) {
        productsGrid.innerHTML = `<div class="grid-placeholder">No se encontraron equipos con los filtros seleccionados. Proba limpiando los filtros.</div>`;
        return;
    }

    productsGrid.innerHTML = '';
    
    filteredNotebooks.forEach(laptop => {
        const displayPrice = getFormattedPrice(laptop.price_usd, laptop.custom_price_usd);
        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('data-id', laptop.id);
        
        let categoryIcon = "fa-laptop";
        if (laptop.category === 'gaming') categoryIcon = "fa-gamepad";
        else if (laptop.category === 'productivity') categoryIcon = "fa-laptop-code";
        else if (laptop.category === 'design') categoryIcon = "fa-palette";
        
        const typeBadge = `<span class="card-category-badge"><i class="fa-solid ${categoryIcon}"></i> ${laptop.category}</span>`;
        
        card.innerHTML = `
            ${typeBadge}
            <div class="product-image-wrapper">
                <img src="${laptop.image}" alt="${getCleanName(laptop.name, laptop.brand)}" loading="lazy" onerror="this.onerror=null;this.src='assets/office_laptop.png'">
            </div>
            <div class="product-details">
                <span class="product-brand">${laptop.brand}</span>
                <h3 class="product-name" title="${laptop.name}">${getCleanName(laptop.name, laptop.brand)}</h3>
                
                <ul class="product-specs-summary">
                    <li><i class="fa-solid fa-microchip"></i> <span>${laptop.specs.cpu}</span></li>
                    <li><i class="fa-solid fa-memory"></i> <span>${laptop.specs.ram}</span></li>
                    <li><i class="fa-solid fa-hard-drive"></i> <span>${laptop.specs.ssd}</span></li>
                    <li><i class="fa-solid fa-desktop"></i> <span>${laptop.specs.screen}</span></li>
                </ul>
                
                <div class="card-footer">
                    <div class="price-box">
                           <span class="price-label">Precio</span>
                        <span class="price-value">${displayPrice}</span>
                    </div>
                    <button class="buy-card-btn" title="Ver detalles y comprar">
                        <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            openDetailModal(laptop);
        });
        
        productsGrid.appendChild(card);
    });
    
    setupSpotlightEffects();
}

function renderFeaturedNotebooks() {
    const featuredGrid = document.getElementById('featured-grid');
    if (!featuredGrid) return;
    
    const featuredIds = ['56990', '57003', '57715'];
    const featuredItems = allNotebooks.filter(item => featuredIds.includes(item.id) && item.published !== false);
    
    featuredGrid.innerHTML = '';
    
    featuredItems.forEach(laptop => {
        const displayPrice = getFormattedPrice(laptop.price_usd, laptop.custom_price_usd);
        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('data-id', laptop.id);
        
        let categoryIcon = "fa-laptop";
        if (laptop.category === 'gaming') categoryIcon = "fa-gamepad";
        else if (laptop.category === 'productivity') categoryIcon = "fa-laptop-code";
        else if (laptop.category === 'design') categoryIcon = "fa-palette";
        
        const typeBadge = `<span class="card-category-badge"><i class="fa-solid ${categoryIcon}"></i> ${laptop.category}</span>`;
            
        card.innerHTML = `
            ${typeBadge}
            <div class="product-image-wrapper">
                <img src="${laptop.image}" alt="${getCleanName(laptop.name, laptop.brand)}" loading="lazy" onerror="this.onerror=null;this.src='assets/office_laptop.png'">
            </div>
            <div class="product-details">
                <span class="product-brand">${laptop.brand}</span>
                <h3 class="product-name" title="${laptop.name}">${getCleanName(laptop.name, laptop.brand)}</h3>
                
                <ul class="product-specs-summary">
                    <li><i class="fa-solid fa-microchip"></i> <span>${laptop.specs.cpu}</span></li>
                    <li><i class="fa-solid fa-memory"></i> <span>${laptop.specs.ram}</span></li>
                    <li><i class="fa-solid fa-hard-drive"></i> <span>${laptop.specs.ssd}</span></li>
                    <li><i class="fa-solid fa-desktop"></i> <span>${laptop.specs.screen}</span></li>
                </ul>
                
                <div class="card-footer">
                    <div class="price-box">
                        <span class="price-label">Precio</span>
                        <span class="price-value">${displayPrice}</span>
                    </div>
                    <button class="buy-card-btn" title="Ver detalles y comprar">
                        <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            openDetailModal(laptop);
        });
        
        featuredGrid.appendChild(card);
    });
    
    // Setup spotlight for new cards
    setupSpotlightEffects();
    
}

function getCleanName(fullName, brand) {
    if (!fullName) return '';
    let firstPart = fullName.split('/')[0].trim();
    firstPart = firstPart.replace(/^(Notebook Gamer|Notebook|PC Gamer|PC Workstation|PC de Oficina|PC Slim|PC|Desktop)\s+/i, '');
    
    const cpuPatterns = [
        /\s+Intel\s+Core\s+i[3579]\b.*/i,
        /\s+Intel\s+Core\s+Ultra\s+[579]\b.*/i,
        /\s+Intel\s+i[3579]\b.*/i,
        /\s+AMD\s+Ryzen\s+[3579]\b.*/i,
        /\s+Intel\s+Celeron\b.*/i,
        /\s+Intel\s+Pentium\b.*/i,
        /\s+Intel\s+Xeon\b.*/i,
        /\s+AMD\s+Athlon\b.*/i,
        /\s+Ultra\s+[579]\b.*/i,
        /\s+Ryzen\s+[3579]\b.*/i,
        /\s+Core\s+i[3579]\b.*/i,
        /\s+M[1234]\s+Pro\b.*/i,
        /\s+M[1234]\s+Max\b.*/i,
        /\s+M[1234]\s+Ultra\b.*/i,
        /\s+M[1234]\b.*/i
    ];
    
    let clean = firstPart;
    for (let pattern of cpuPatterns) {
        if (pattern.test(clean)) {
            clean = clean.split(pattern)[0].trim();
            break;
        }
    }
    
    if (brand && !clean.toLowerCase().startsWith(brand.toLowerCase())) {
        clean = brand + " " + clean;
    }
    
    return clean.replace(/\s*-\s*$/g, '').trim();
}

function getFormattedPrice(priceUsd, customPriceUsd = 0) {
    const cost = Number(priceUsd);
    let selling_usd = 0;
    
    if (customPriceUsd && Number(customPriceUsd) > 0) {
        selling_usd = Number(customPriceUsd);
    } else {
        selling_usd = pricingConfig.markup_factor * cost + pricingConfig.fixed_fee_usd;
    }
    
    if (currentCurrency === 'ARS') {
        const priceArs = selling_usd * blueRate;
        return '$' + Math.round(priceArs).toLocaleString('es-AR') + ' ARS';
    } else {
        return '$' + Math.round(selling_usd).toLocaleString('es-AR') + ' USD';
    }
}

// 21st.dev spotlight hover effect: updates dynamic CSS bounds
function setupSpotlightEffects() {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            card.style.setProperty('--x', `${x}px`);
            card.style.setProperty('--y', `${y}px`);
        });
    });
}

// FILTER CONTROLLERS
catalogSearch.addEventListener('input', (e) => {
    searchPhrase = e.target.value.toLowerCase().trim();
    renderNotebooks();
});

brandFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    
    brandFilters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    activeBrand = btn.getAttribute('data-brand');
    renderNotebooks();
});

categoryFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    
    categoryFilters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    activeCategory = btn.getAttribute('data-category');
    renderNotebooks();
});

priceRange.addEventListener('input', (e) => {
    maxPrice = parseInt(e.target.value);
    if (currentCurrency === 'ARS') {
        priceSliderValue.innerText = `$${maxPrice.toLocaleString('es-AR')} ARS`;
    } else {
        priceSliderValue.innerText = `$${maxPrice} USD`;
    }
    renderNotebooks();
});

resetFiltersBtn.addEventListener('click', () => {
    searchPhrase = '';
    activeBrand = 'all';
    activeCategory = 'all';
    
    catalogSearch.value = '';
    
    brandFilters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    brandFilters.querySelector('[data-brand="all"]').classList.add('active');
    
    categoryFilters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    categoryFilters.querySelector('[data-category="all"]').classList.add('active');
    
    initFilterState();
    priceRange.value = maxPrice;
    
    adjustPriceSliderForCurrency();
    renderNotebooks();
});

/* ==========================================================================
   4. DETAIL MODAL & WHATSAPP REDIRECTION
   ========================================================================== */
function openDetailModal(laptop) {
    const displayPrice = getFormattedPrice(laptop.price_usd, laptop.custom_price_usd);
    const cleanName = getCleanName(laptop.name, laptop.brand);
    
    // WhatsApp prefilled message
    const message = `¡Hola Core Notebooks! Estoy interesado en la notebook ${laptop.brand} (Código: ${laptop.id}) publicada a ${displayPrice}. ¿Tienen stock disponible y formas de entrega?\n\nEspecificaciones:\n- CPU: ${laptop.specs.cpu}\n- RAM: ${laptop.specs.ram}\n- SSD: ${laptop.specs.ssd}`;
    const wspUrl = `https://wa.me/${WSP_NUMBER}?text=${encodeURIComponent(message)}`;
    
    detailModalBody.innerHTML = `
        <button class="modal-close" id="close-detail-btn" style="position: absolute; right: 20px; top: 20px; z-index: 10;"><i class="fa-solid fa-xmark"></i></button>
        <div class="detail-modal-grid">
            <div class="detail-image-box">
                <img src="${laptop.image}" alt="${cleanName}" onerror="this.src='https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=600&q=80'">
            </div>
            <div class="detail-info-box">
                <div class="detail-header-row">
                    <span class="detail-brand">${laptop.brand}</span>
                    <span class="card-category-badge">${laptop.category}</span>
                </div>
                <h2 class="detail-title">${cleanName}</h2>
                
                <h4 class="filter-label" style="margin-bottom: 8px;">Especificaciones Técnicas</h4>
                <ul class="detail-specs-list">
                    <li><i class="fa-solid fa-microchip"></i> <div><strong>Procesador:</strong> ${laptop.specs.cpu}</div></li>
                    <li><i class="fa-solid fa-memory"></i> <div><strong>Memoria RAM:</strong> ${laptop.specs.ram}</div></li>
                    <li><i class="fa-solid fa-hard-drive"></i> <div><strong>Almacenamiento:</strong> ${laptop.specs.ssd}</div></li>
                    <li><i class="fa-solid fa-desktop"></i> <div><strong>Pantalla:</strong> ${laptop.specs.screen}</div></li>
                    <li><i class="fa-solid fa-microchip" style="transform: rotate(45deg);"></i> <div><strong>Gráficos:</strong> ${laptop.specs.gpu}</div></li>
                    <li><i class="fa-solid fa-window-maximize"></i> <div><strong>Sistema Operativo:</strong> ${laptop.specs.os}</div></li>
                    <li><i class="fa-solid fa-barcode"></i> <div><strong>Código de Producto:</strong> ${laptop.id}</div></li>
                </ul>
                
                <div class="detail-trust-badge" style="display: flex; align-items: center; gap: 10px; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px 14px; margin: 16px 0;">
                    <i class="fa-solid fa-shield-halved" style="color: var(--accent-blue); font-size: 1.25rem; flex-shrink: 0;"></i>
                    <div style="font-size: 0.78rem; line-height: 1.4; color: var(--text-secondary);">
                        <strong style="color: var(--text-primary);">Garantía Absoluta Core:</strong> Incluye garantía original de fábrica, soporte directo con nosotros y 10 días de prueba de satisfacción.
                    </div>
                </div>
                
                <div class="detail-footer-row">
                    <div class="price-box">
                        <span class="price-label">Precio Final</span>
                        <span class="detail-price-value">${displayPrice}</span>
                    </div>
                    <a href="${wspUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-wsp">
                        <i class="fa-brands fa-whatsapp"></i> Comprar por WhatsApp
                    </a>
                </div>
            </div>
        </div>
    `;
    
    detailModal.classList.add('modal-active');
    
    document.getElementById('close-detail-btn').addEventListener('click', () => {
        detailModal.classList.remove('modal-active');
    });
}

detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) {
        detailModal.classList.remove('modal-active');
    }
});

/* ==========================================================================
   5. CONTACT AND CATALOG NAVIGATION
   ========================================================================== */
if (signupBtn) signupBtn.addEventListener('click', contactSales);
if (heroScheduleBtn) heroScheduleBtn.addEventListener('click', contactSales);
document.getElementById('hero-catalog-btn').addEventListener('click', () => switchView('catalog-view'));
document.getElementById('explore-catalog-btn').addEventListener('click', () => switchView('catalog-view'));
if (navAdvisorLink) navAdvisorLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (aiChatPanel.classList.contains('chat-panel-hidden')) toggleChatPanel();
});
function contactSales() {
    const message = '¡Hola Core Notebooks! Quisiera asesoramiento para elegir una notebook y consultar disponibilidad.';
    window.open('https://wa.me/' + WSP_NUMBER + '?text=' + encodeURIComponent(message), '_blank', 'noopener,noreferrer');
}

/* ==========================================================================
   6. CATALOG GUIDE
   ========================================================================== */
function toggleChatPanel() {
    aiChatPanel.classList.toggle('chat-panel-hidden');
    if (!aiChatPanel.classList.contains('chat-panel-hidden')) {
        scrollToBottom();
        chatInput.focus();
    }
}

aiBubbleTrigger.addEventListener('click', toggleChatPanel);
closeChatBtn.addEventListener('click', toggleChatPanel);

chatInput.addEventListener('input', () => {
    sendChatBtn.disabled = chatInput.value.trim() === '';
    chatInput.style.height = 'auto';
    chatInput.style.height = (chatInput.scrollHeight) + 'px';
});

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendUserMessage();
    }
});

sendChatBtn.addEventListener('click', sendUserMessage);

document.querySelectorAll('.quick-reply-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-reply');
        chatInput.value = text;
        sendChatBtn.disabled = false;
        sendUserMessage();
    });
});

function scrollToBottom() {
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

function addSystemChatMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg ai-msg';
    msg.innerHTML = `<p style="color: #4cd964;"><i class="fa-solid fa-circle-info"></i> <em>${text}</em></p>`;
    chatMessagesContainer.appendChild(msg);
    scrollToBottom();
}

function sendUserMessage() {
    const text = chatInput.value.trim();
    if (text === '') return;
    
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-msg user-msg';
    userMsg.innerText = text;
    chatMessagesContainer.appendChild(userMsg);
    
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendChatBtn.disabled = true;
    scrollToBottom();
    
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.id = 'typing-indicator';
    typingIndicator.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    chatMessagesContainer.appendChild(typingIndicator);
    scrollToBottom();
    
    setTimeout(async () => {
        const replyText = await generateAdvisorReply(text);
        
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
        
        const aiMsg = document.createElement('div');
        aiMsg.className = 'chat-msg ai-msg';
        aiMsg.innerHTML = formatMarkdown(replyText);
        chatMessagesContainer.appendChild(aiMsg);
        
        addClickableLaptopsToChat(aiMsg);
        scrollToBottom();
    }, 1000);
}

function formatMarkdown(text) {
    let html = String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
    return `<p>${html}</p>`;
}

function addClickableLaptopsToChat(element) {
    const text = element.innerHTML;
    const codeRegex = /\b(\d{5})\b/g;
    
    element.innerHTML = text.replace(codeRegex, (match) => {
        const laptop = allNotebooks.find(l => l.id === match);
        if (laptop) {
            return `<a href="#" class="chat-product-link" data-id="${laptop.id}" style="color: var(--accent-blue); text-decoration: underline; font-weight: 600;"><i class="fa-solid fa-laptop" style="font-size:0.75rem; margin-right:2px;"></i>${laptop.brand} #${laptop.id}</a>`;
        }
        return match;
    });
    
    element.querySelectorAll('.chat-product-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const id = link.getAttribute('data-id');
            const laptop = allNotebooks.find(l => l.id === id);
            if (laptop) {
                openDetailModal(laptop);
            }
        });
    });
}

async function generateAdvisorReply(userText) {
    const text = userText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let category;
    if (/gaming|gamer|jugar|rtx|placa/.test(text)) category = 'gaming';
    else if (/disen|edicion|editar|video|foto|mac/.test(text)) category = 'design';
    else if (/program|desarroll|ingenier|codigo/.test(text)) category = 'productivity';
    else if (/estudi|oficina|barat|econom|hogar/.test(text)) category = 'office';
    if (!category) return 'Esta guía automática filtra por tipo de uso. Elegí estudio/oficina, gaming, programación o diseño. Para una recomendación según tu presupuesto, consultanos por WhatsApp.';
    const visible = allNotebooks.filter(item => item.published !== false && item.type !== 'desktop');
    const sellingPrice = item => Number(item.custom_price_usd) > 0 ? Number(item.custom_price_usd) : pricingConfig.markup_factor * item.price_usd + pricingConfig.fixed_fee_usd;
    const items = visible.filter(item => category === 'office' ? /office|productivity/.test(item.category) : item.category === category)
        .sort((a, b) => sellingPrice(a) - sellingPrice(b)).slice(0, 3);
    if (!items.length) return 'No encontré opciones publicadas para ese uso en este momento. Podés explorar el catálogo o consultarnos por WhatsApp.';
    return 'Estas son opciones del catálogo para ese uso, ordenadas por precio. Confirmá disponibilidad antes de comprar:\n\n' + items.map((item, i) =>
        (i + 1) + '. **' + getCleanName(item.name, item.brand) + '** (Código: ' + item.id + ')\n' +
        getFormattedPrice(item.price_usd, item.custom_price_usd) + ' · ' + item.specs.ram + '\n'
    ).join('\n') + '\nHacé clic en el código para ver los detalles. Esta selección no evalúa requisitos de programas específicos ni un presupuesto máximo.';
}

function switchView(viewName, scrollTargetId = null) {
    const landingView = document.getElementById('landing-view');
    const catalogView = document.getElementById('catalog-view');
    const dashboardView = document.getElementById('dashboard-view');
    
    const navLinks = {
        'landing-view': 'nav-inicio-link',
        'catalog-view': 'nav-catalog-link',
        'nosotros': 'nav-nosotros-link',
        'dashboard-view': 'nav-dashboard-link'
    };
    
    Object.values(navLinks).forEach(id => {
        const link = document.getElementById(id);
        if (link) link.classList.remove('active');
    });
    
    if (viewName === 'landing-view') {
        if (scrollTargetId === 'nosotros') {
            const link = document.getElementById('nav-nosotros-link');
            if (link) link.classList.add('active');
        } else {
            const link = document.getElementById('nav-inicio-link');
            if (link) link.classList.add('active');
        }
        
        if (landingView.classList.contains('hidden-view')) {
            landingView.style.display = 'block';
            landingView.offsetHeight; // force reflow
            landingView.classList.remove('hidden-view');
        }
        if (!catalogView.classList.contains('hidden-view')) {
            catalogView.classList.add('hidden-view');
            setTimeout(() => {
                if (catalogView.classList.contains('hidden-view')) {
                    catalogView.style.display = 'none';
                }
            }, 400);
        }
        
        if (scrollTargetId) {
            setTimeout(() => {
                const target = document.getElementById(scrollTargetId);
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } else if (viewName === 'catalog-view') {
        const link = document.getElementById('nav-catalog-link');
        if (link) link.classList.add('active');
        
        if (catalogView.classList.contains('hidden-view')) {
            catalogView.style.display = 'block';
            catalogView.offsetHeight; // force reflow
            catalogView.classList.remove('hidden-view');
        }
        if (!landingView.classList.contains('hidden-view')) {
            landingView.classList.add('hidden-view');
            setTimeout(() => {
                if (landingView.classList.contains('hidden-view')) {
                    landingView.style.display = 'none';
                }
            }, 400);
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Hide mobile nav when shifting view
    const mainNav = document.querySelector('.main-nav');
    if (mainNav) {
        mainNav.classList.remove('mobile-visible');
        document.getElementById('menu-toggle').setAttribute('aria-expanded', 'false');
    }
}

function setupViewSwitching() {
    const logoLink = document.getElementById('logo-link');
    if (logoLink) {
        logoLink.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('landing-view');
        });
    }

    const navInicio = document.getElementById('nav-inicio-link');
    if (navInicio) {
        navInicio.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('landing-view');
        });
    }

    const navCatalog = document.getElementById('nav-catalog-link');
    if (navCatalog) {
        navCatalog.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('catalog-view');
        });
    }

    const navNosotros = document.getElementById('nav-nosotros-link');
    if (navNosotros) {
        navNosotros.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('landing-view', 'nosotros');
        });
    }

    const footerInicio = document.getElementById('footer-inicio-link');
    if (footerInicio) {
        footerInicio.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('landing-view');
        });
    }

    const footerCatalog = document.getElementById('footer-catalog-link');
    if (footerCatalog) {
        footerCatalog.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('catalog-view');
        });
    }

    const footerNosotros = document.getElementById('footer-nosotros-link');
    if (footerNosotros) {
        footerNosotros.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('landing-view', 'nosotros');
        });
    }
    
    // Mobile Menu Toggle Button
    const menuToggle = document.getElementById('menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const expanded = mainNav.classList.toggle('mobile-visible');
            menuToggle.setAttribute('aria-expanded', String(expanded));
        });
        mainNav.addEventListener('click', (e) => {
            if (e.target.closest('a')) { mainNav.classList.remove('mobile-visible'); menuToggle.setAttribute('aria-expanded', 'false'); }
        });
        document.addEventListener('click', (e) => {
            if (!mainNav.contains(e.target) && e.target !== menuToggle) {
                mainNav.classList.remove('mobile-visible');
            }
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    setupToggleFilters();
    setupViewSwitching();
    loadCatalog();
    fetchExchangeRate();
    const activeLink = document.getElementById('nav-inicio-link');
    if (activeLink) activeLink.classList.add('active');
});
