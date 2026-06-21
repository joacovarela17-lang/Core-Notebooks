/* ==========================================================================
   CORE NOTEBOOKS - APPLICATION LOGIC
   Features: Intro playback/fallback, Dolar Blue API, Dynamic Catalog Filtering,
             WhatsApp Integration, and Gemini AI Recommender with local fallback.
   ========================================================================== */

// Global configuration and state
const WSP_NUMBER = "5491134567890"; // Argentine sales WhatsApp number
const PROFIT_MARKUP_ARS = 250000; // Profit markup added to ARS, converted to USD
let allNotebooks = [];
let filteredNotebooks = [];
let blueRate = 1250; // Fallback rate in case API fails
let currentCurrency = 'USD'; // 'USD' or 'ARS'
let geminiApiKey = localStorage.getItem('gemini_api_key') || '';
let chatHistory = []; // Stores the Gemini chat log for conversational context

// UI State Filters
let activeBrand = 'all';
let activeCategory = 'all';
let maxPrice = 4500;
let searchPhrase = '';

// DOM Elements
const introOverlay = document.getElementById('intro-overlay');
const introVideo = document.getElementById('intro-video');
const laptopFallback = document.getElementById('laptop-fallback');
const skipIntroBtn = document.getElementById('skip-intro-btn');
const appContainer = document.getElementById('app-container');

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
const settingsModal = document.getElementById('settings-modal');
const detailModal = document.getElementById('detail-modal');
const detailModalBody = document.getElementById('detail-modal-body');
const openSettingsBtn = document.getElementById('open-settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const clearSettingsBtn = document.getElementById('clear-settings-btn');
const geminiApiKeyInput = document.getElementById('gemini-api-key');
const toggleKeyVisibilityBtn = document.getElementById('toggle-key-visibility');
const keyStatusBadge = document.getElementById('key-status');

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
function initIntro() {
    let introEnded = false;

    // Transition function to main site
    const enterSite = () => {
        if (introEnded) return;
        introEnded = true;
        
        // Stop video if playing
        if (introVideo) {
            introVideo.pause();
        }

        // Add class to fade out intro screen
        introOverlay.classList.add('intro-fading');
        
        // Remove from DOM layout after animation completes (1s)
        setTimeout(() => {
            introOverlay.style.display = 'none';
            appContainer.classList.remove('app-hidden');
            appContainer.classList.add('app-visible');
            
            // Adjust body scrolling
            document.body.style.overflowY = 'auto';
            
            // Initialize main site processes
            fetchExchangeRate();
            loadCatalog();
            updateSettingsUI();
        }, 1000);
    };

    // Prevent scrolling while intro is active
    document.body.style.overflowY = 'hidden';

    // Set fallback timer (in case video is slow, missing, or blocked)
    const fallbackTimeout = setTimeout(() => {
        console.log("Fullscreen Video timeout or not loaded. Playing 3D CSS fallback...");
        // Show fallback CSS laptop
        laptopFallback.style.display = 'flex';
        introVideo.style.display = 'none';
        
        // Add open class to kickstart CSS animation
        setTimeout(() => {
            laptopFallback.classList.add('open-lid');
        }, 100);

        // Transition site after animation finishes (approx 3s)
        setTimeout(() => {
            enterSite();
        }, 3500);
    }, 4500);

    // Try to play video if it can load
    introVideo.addEventListener('play', () => {
        clearTimeout(fallbackTimeout);
        laptopFallback.style.display = 'none';
        introVideo.style.display = 'block';
    });

    // Handle timeupdate for precise text animations and video cut
    const introTextWrapper = document.getElementById('intro-text-wrapper');
    introVideo.addEventListener('timeupdate', () => {
        if (introVideo.currentTime >= 5.2) {
            if (introTextWrapper) {
                introTextWrapper.classList.add('text-visible');
            }
        }
        if (introVideo.currentTime >= 6.0) {
            introVideo.pause();
            enterSite();
        }
    });

    // When video completes, enter site
    introVideo.addEventListener('ended', enterSite);

    // Skip button click
    skipIntroBtn.addEventListener('click', enterSite);

    // Automatically trigger video play
    introVideo.play().catch(err => {
        console.log("Autoplay blocked or video missing. Fallback timer active.");
    });
}

/* ==========================================================================
   2. DOLAR BLUE API & EXCHANGE RATES
   ========================================================================== */
async function fetchExchangeRate() {
    try {
        const response = await fetch('https://dolarapi.com/v1/dolares/blue');
        if (!response.ok) throw new Error('API error');
        const data = await response.json();
        
        if (data && data.venta) {
            blueRate = Math.round(data.venta);
            console.log(`Live Dolar Blue Rate loaded: $${blueRate} ARS`);
            blueRateValue.innerText = `$${blueRate.toLocaleString('es-AR')}`;
        }
    } catch (err) {
        console.warn("Could not fetch live Dolar Blue, using fallback rate:", blueRate);
        blueRateValue.innerText = `$${blueRate.toLocaleString('es-AR')} (Predeterminado)`;
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
    if (currentCurrency === 'ARS') {
        maxPrice = Math.round((1.20 * 4500 + 140) * blueRate);
    } else {
        maxPrice = Math.round(1.20 * 4500 + 140);
    }
}

function adjustPriceSliderForCurrency() {
    if (currentCurrency === 'ARS') {
        const minARS = Math.round((1.20 * 300 + 140) * blueRate);
        const maxARS = Math.round((1.20 * 4500 + 140) * blueRate);
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
        const minUSD = Math.round(1.20 * 300 + 140);
        const maxUSD = Math.round(1.20 * 4500 + 140);
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
        const response = await fetch('catalog.json');
        if (!response.ok) throw new Error('Catalog missing');
        allNotebooks = await response.json();
        filteredNotebooks = [...allNotebooks];
        
        // Build price ranges
        initFilterState();
        adjustPriceSliderForCurrency();
        renderNotebooks();
        renderFeaturedNotebooks();
        setupSpotlightEffects();
        setupToggleFilters();
        setupViewSwitching();
    } catch (err) {
        console.error("Error loading catalog database:", err);
        productsGrid.innerHTML = `<div class="grid-placeholder">Error al cargar la base de datos de notebooks. Por favor reintentá en unos momentos.</div>`;
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
        // Filter out products with price <= 700 for client-facing views
        if (item.price_usd <= 700) return false;
        
        const matchesSearch = searchPhrase === '' || 
            item.name.toLowerCase().includes(searchPhrase) ||
            item.brand.toLowerCase().includes(searchPhrase) ||
            (item.specs.cpu && item.specs.cpu.toLowerCase().includes(searchPhrase)) ||
            (item.specs.ram && item.specs.ram.toLowerCase().includes(searchPhrase)) ||
            (item.specs.gpu && item.specs.gpu.toLowerCase().includes(searchPhrase)) ||
            (item.type && item.type.toLowerCase().includes(searchPhrase));
            
        const matchesBrand = activeBrand === 'all' || item.brand === activeBrand;
        const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
        
        const sellingUsd = 1.20 * item.price_usd + 140;
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
        const displayPrice = getFormattedPrice(laptop.price_usd);
        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('data-id', laptop.id);
        
        let categoryIcon = "fa-laptop";
        if (laptop.category === 'gaming') categoryIcon = "fa-gamepad";
        else if (laptop.category === 'productivity') categoryIcon = "fa-laptop-code";
        else if (laptop.category === 'design') categoryIcon = "fa-palette";
        
        // Custom badge for computer type (Notebook vs. Desktop PC)
        const typeBadge = laptop.type === 'desktop' ? 
            `<span class="card-category-badge" style="background: rgba(0, 113, 227, 0.1); border-color: rgba(0, 113, 227, 0.25); color: #8bbfff;"><i class="fa-solid fa-desktop"></i> PC Escritorio</span>` :
            `<span class="card-category-badge"><i class="fa-solid ${categoryIcon}"></i> ${laptop.category}</span>`;
        
        card.innerHTML = `
            ${typeBadge}
            <div class="product-image-wrapper">
                <img src="${laptop.image}" alt="${laptop.name}" onerror="this.src='https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=400&q=80'">
            </div>
            <div class="product-details">
                <span class="product-brand">${laptop.brand}</span>
                <h3 class="product-name" title="${laptop.name}">${laptop.name}</h3>
                
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
    
    const featuredIds = ['56990', '57003', '54911'];
    const featuredItems = allNotebooks.filter(item => featuredIds.includes(item.id) && item.price_usd > 700);
    
    featuredGrid.innerHTML = '';
    
    featuredItems.forEach(laptop => {
        const displayPrice = getFormattedPrice(laptop.price_usd);
        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('data-id', laptop.id);
        
        let categoryIcon = "fa-laptop";
        if (laptop.category === 'gaming') categoryIcon = "fa-gamepad";
        else if (laptop.category === 'productivity') categoryIcon = "fa-laptop-code";
        else if (laptop.category === 'design') categoryIcon = "fa-palette";
        
        const typeBadge = laptop.type === 'desktop' ? 
            `<span class="card-category-badge" style="background: rgba(0, 113, 227, 0.1); border-color: rgba(0, 113, 227, 0.25); color: #8bbfff;"><i class="fa-solid fa-desktop"></i> PC Escritorio</span>` :
            `<span class="card-category-badge"><i class="fa-solid ${categoryIcon}"></i> ${laptop.category}</span>`;
            
        card.innerHTML = `
            ${typeBadge}
            <div class="product-image-wrapper">
                <img src="${laptop.image}" alt="${laptop.name}" onerror="this.src='https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=400&q=80'">
            </div>
            <div class="product-details">
                <span class="product-brand">${laptop.brand}</span>
                <h3 class="product-name" title="${laptop.name}">${laptop.name}</h3>
                
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
    
    // Wire explore catalog button
    const exploreBtn = document.getElementById('explore-catalog-btn');
    if (exploreBtn) {
        exploreBtn.addEventListener('click', () => {
            switchView('catalog-view');
        });
    }
}

function getFormattedPrice(priceUsd, isPlainText = false) {
    const cost = Number(priceUsd);
    const selling_usd = 1.20 * cost + 140;
    const profit_usd = selling_usd - cost;
    
    if (currentCurrency === 'ARS') {
        const priceArs = selling_usd * blueRate;
        const formattedArs = '$' + Math.round(priceArs).toLocaleString('es-AR') + ' ARS';
        if (isPlainText) {
            return formattedArs;
        } else {
            return `${formattedArs}<span class="profit-label"> (Ganancia: +$${Math.round(profit_usd)} USD)</span>`;
        }
    } else {
        const formattedUsd = '$' + Math.round(selling_usd).toLocaleString('es-AR') + ' USD';
        if (isPlainText) {
            return formattedUsd;
        } else {
            return `${formattedUsd}<span class="profit-label"> (Ganancia: +$${Math.round(profit_usd)} USD)</span>`;
        }
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
    const displayPrice = getFormattedPrice(laptop.price_usd);
    const itemTypeWord = laptop.type === 'desktop' ? 'computadora de escritorio' : 'notebook';
    
    // WhatsApp prefilled message
    const message = `¡Hola Core Notebooks! Estoy interesado en la ${itemTypeWord} ${laptop.brand} (Código: ${laptop.id}) publicada a ${displayPrice}. ¿Tienen stock disponible y formas de entrega?\n\nEspecificaciones:\n- CPU: ${laptop.specs.cpu}\n- RAM: ${laptop.specs.ram}\n- SSD: ${laptop.specs.ssd}`;
    const wspUrl = `https://wa.me/${WSP_NUMBER}?text=${encodeURIComponent(message)}`;
    
    detailModalBody.innerHTML = `
        <button class="modal-close" id="close-detail-btn" style="position: absolute; right: 20px; top: 20px; z-index: 10;"><i class="fa-solid fa-xmark"></i></button>
        <div class="detail-modal-grid">
            <div class="detail-image-box">
                <img src="${laptop.image}" alt="${laptop.name}" onerror="this.src='https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=600&q=80'">
            </div>
            <div class="detail-info-box">
                <div class="detail-header-row">
                    <span class="detail-brand">${laptop.brand}</span>
                    <span class="card-category-badge">${laptop.category}</span>
                </div>
                <h2 class="detail-title">${laptop.name}</h2>
                
                <h4 class="filter-label" style="margin-bottom: 8px;">Especificaciones Técnicas</h4>
                <ul class="detail-specs-list">
                    <li><i class="fa-solid fa-microchip"></i> <div><strong>Procesador:</strong> ${laptop.specs.cpu}</div></li>
                    <li><i class="fa-solid fa-memory"></i> <div><strong>Memoria RAM:</strong> ${laptop.specs.ram}</div></li>
                    <li><i class="fa-solid fa-hard-drive"></i> <div><strong>Almacenamiento:</strong> ${laptop.specs.ssd}</div></li>
                    <li><i class="fa-solid fa-desktop"></i> <div><strong>Pantalla/Gabinete:</strong> ${laptop.specs.screen}</div></li>
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
                    <a href="${wspUrl}" target="_blank" class="btn btn-wsp">
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
   5. MODALS & NAV TRIGGERS (Sign Up, Learning, Consult)
   ========================================================================== */
openSettingsBtn.addEventListener('click', () => {
    openSettingsModal();
});

if (signupBtn) {
    signupBtn.addEventListener('click', () => {
        openSettingsModal();
    });
}

if (navAdvisorLink) {
    navAdvisorLink.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('advisor-anchor').scrollIntoView({ behavior: 'smooth' });
        if (aiChatPanel.classList.contains('chat-panel-hidden')) {
            toggleChatPanel();
        }
    });
}

if (heroScheduleBtn) {
    heroScheduleBtn.addEventListener('click', () => {
        const message = "¡Hola Core Notebooks! Quisiera coordinar una asesoría técnica personalizada para elegir mi próxima notebook.";
        const wspUrl = `https://wa.me/${WSP_NUMBER}?text=${encodeURIComponent(message)}`;
        window.open(wspUrl, '_blank');
    });
}

function openSettingsModal() {
    geminiApiKeyInput.value = geminiApiKey;
    settingsModal.classList.add('modal-active');
    updateSettingsUI();
}

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('modal-active');
});

settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.remove('modal-active');
    }
});

toggleKeyVisibilityBtn.addEventListener('click', () => {
    const isPassword = geminiApiKeyInput.type === 'password';
    geminiApiKeyInput.type = isPassword ? 'text' : 'password';
    toggleKeyVisibilityBtn.querySelector('i').className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
});

saveSettingsBtn.addEventListener('click', () => {
    const keyVal = geminiApiKeyInput.value.trim();
    if (keyVal === '') {
        localStorage.removeItem('gemini_api_key');
        geminiApiKey = '';
    } else {
        localStorage.setItem('gemini_api_key', keyVal);
        geminiApiKey = keyVal;
    }
    
    updateSettingsUI();
    addSystemChatMessage("API Key de Gemini configurada. El asesor AI ahora tiene inteligencia de lenguaje generativo.");
    
    setTimeout(() => {
        settingsModal.classList.remove('modal-active');
    }, 500);
});

clearSettingsBtn.addEventListener('click', () => {
    localStorage.removeItem('gemini_api_key');
    geminiApiKey = '';
    geminiApiKeyInput.value = '';
    updateSettingsUI();
    addSystemChatMessage("API Key de Gemini borrada. El asesor AI funcionará en modo de simulación local.");
});

function updateSettingsUI() {
    if (geminiApiKey && geminiApiKey.startsWith('AIzaSy')) {
        keyStatusBadge.className = "key-status-badge active-status";
        keyStatusBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> API Key configurada y activa. El Asesor AI inteligente está encendido.`;
    } else {
        keyStatusBadge.className = "key-status-badge idel-status";
        keyStatusBadge.innerHTML = `<i class="fa-solid fa-circle-question"></i> API Key no configurada. El asesor AI funcionará con respuestas de simulación locales.`;
    }
}

/* ==========================================================================
   6. GEMINI AI ADVISOR CHAT ENGINE
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
    let html = text
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
    chatHistory.push({ role: 'user', content: userText });
    if (geminiApiKey && geminiApiKey.startsWith('AIzaSy')) {
        return await fetchGeminiReply(userText);
    } else {
        return generateMockReply(userText);
    }
}

async function fetchGeminiReply(userText) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
    
    const catalogSubset = allNotebooks
        .filter(l => l.price_usd > 700)
        .map(l => {
            const cost = l.price_usd;
            const selling_usd = 1.20 * cost + 140;
            const selling_ars = selling_usd * blueRate;
            return {
                id: l.id,
                name: l.name,
                brand: l.brand,
                price_usd: Math.round(selling_usd),
                price_ars_blue: Math.round(selling_ars),
                category: l.category,
                type: l.type,
                cpu: l.specs.cpu,
                ram: l.specs.ram,
                ssd: l.specs.ssd,
                gpu: l.specs.gpu
            };
        });
    
    const systemInstruction = `
Eres el "Asesor Core AI", un consultor de tecnología experto para la tienda "Core Notebooks".
Core Notebooks es una tienda fundada por dos estudiantes de ingeniería: Felipe (estudia en la UBA) y Joaquín (estudia en la UNSAM), quienes importan notebooks seleccionadas y computadoras de alta calidad directamente de Paraguay y las testean rigurosamente antes de venderlas en Argentina.

TU OBJETIVO:
Recomendar notebooks o PCs de escritorio de nuestro catálogo basándote en la actividad del usuario y su presupuesto. Sé honesto, amigable y muy técnico.

REGLAS DE RESPUESTA:
1. Recomienda ÚNICAMENTE computadoras y notebooks que figuren en el catálogo adjunto. Menciona siempre su código de 5 dígitos (ej. "54911" para PCs o "57715" para notebooks) porque el sistema los hace interactivos en el chat.
2. Da los precios de los productos tanto en Dólares (USD) como convertidos a Pesos Argentinos (ARS) usando la tasa del Dólar Blue que te proveemos abajo.
3. Explica brevemente por qué el procesador, la memoria RAM o la placa de video de esa notebook/PC se ajusta a lo que busca el usuario (programación, juegos, estudio, diseño).
4. Termina sugiriendo que, si deciden comprar, hagan clic en el producto en el catálogo y utilicen el botón de "Comprar por WhatsApp" para contactar a Felipe y Joaquín directamente.
5. Responde con un tono tecnológico, claro y profesional. Usa listas y negritas en markdown.
`;

    const contextData = `
Cátalogo de Notebooks y PCs Core (Stock Real):
${JSON.stringify(catalogSubset, null, 2)}

Tasa de conversión Dólar Blue: 1 USD = $${blueRate} ARS.
`;

    const contents = [];
    contents.push({
        role: 'user',
        parts: [{ text: `${systemInstruction}\n\n${contextData}\n\nPregunta inicial del cliente: Hola.` }]
    });
    contents.push({
        role: 'model',
        parts: [{ text: "¡Hola! Bienvenido a Core Notebooks. Soy tu Asesor Core AI. Estoy aquí para recomendarte la notebook o PC ideal de nuestro catálogo según lo que necesites hacer (programar, gaming, diseño, oficina) y tu presupuesto. ¿Contame qué tenías en mente?" }]
    });
    
    const historySlice = chatHistory.slice(-8);
    historySlice.forEach(turn => {
        contents.push({
            role: turn.role === 'user' ? 'user' : 'model',
            parts: [{ text: turn.content }]
        });
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: contents,
                generationConfig: {
                    temperature: 0.6,
                    maxOutputTokens: 1000
                }
            })
        });

        if (!response.ok) throw new Error('API request failed');
        
        const data = await response.json();
        const responseText = data.candidates[0].content.parts[0].text;
        
        chatHistory.push({ role: 'model', content: responseText });
        return responseText;
    } catch (err) {
        console.error("Gemini API error. Falling back to local responder:", err);
        const p57715Usd = Math.round(1.20 * 789 + 140);
        const p57715Ars = Math.round(p57715Usd * blueRate);
        const p58300Usd = Math.round(1.20 * 419 + 140);
        const p58300Ars = Math.round(p58300Usd * blueRate);
        return `Disculpas, tuve un problema al conectarme con mis circuitos de IA de Google. Pero aquí tenés una recomendación directa de nuestro stock:\n\nSi buscás **gaming o alta potencia**, te sugiero la **HP Victus 15 (Código: 57715)** por **U$S ${p57715Usd}** (~$${p57715Ars.toLocaleString('es-AR')} ARS) con placa RTX 4050.\nSi buscás algo **económico para estudiar**, la **ASUS Vivobook Go 15 (Código: 58300)** por **U$S ${p58300Usd}** (~$${p58300Ars.toLocaleString('es-AR')} ARS) es una gran opción.`;
    }
}

function generateMockReply(userText) {
    const textLower = userText.toLowerCase();
    let reply = "";
    
    const getMockPriceString = (id, baseUsd) => {
        const laptop = allNotebooks.find(l => l.id === id);
        const cost = laptop ? laptop.price_usd : baseUsd;
        const usdPrice = Math.round(1.20 * cost + 140);
        const arsPrice = Math.round(usdPrice * blueRate);
        return `U$S ${usdPrice} (~$${arsPrice.toLocaleString('es-AR')} ARS)`;
    };

    if (textLower.includes('hola') || textLower.includes('buenas')) {
        reply = "¡Hola! Soy tu **Asesor Core AI** en modo de simulación. 💻\n\nContame qué presupuesto tenés o para qué actividades vas a usar tu notebook o PC de escritorio (programación, diseño, oficina, gaming) y te recomendaré opciones de nuestro catálogo.";
    } 
    else if (textLower.includes('game') || textLower.includes('jugar') || textLower.includes('gaming') || textLower.includes('placa') || textLower.includes('rtx')) {
        reply = "Para **Gaming y Alto Rendimiento**, te recomiendo estos modelos destacados:\n\n" +
                "1. **PC Gamer i7-14700F (Código: 54911)**:\n" +
                "   - **Precio:** " + getMockPriceString("54911", 1699) + "\n" +
                "   - **Fuerza:** Intel i7 de 14ta gen, 32GB RAM DDR5 y **RTX 4070** de 12GB. Gabinete con vidrio templado. ¡Una bestia de escritorio!\n\n" +
                "2. **HP Victus 15 (Código: 57715)**:\n" +
                "   - **Precio:** " + getMockPriceString("57715", 789) + "\n" +
                "   - **Fuerza:** Ryzen 7, 16GB RAM y una placa **RTX 4050** de 6GB. Excelente notebook portable.\n\n" +
                "Haciendo clic en el código de arriba podés ver los detalles de cada equipo.";
    } 
    else if (textLower.includes('program') || textLower.includes('desarroll') || textLower.includes('ingenier') || textLower.includes('code') || textLower.includes('codigo')) {
        reply = "Para **Programación y Desarrollo**, buscamos procesadores multinúcleo y buena RAM. Te sugiero:\n\n" +
                "1. **PC Workstation Ryzen 9 (Código: 54916)**:\n" +
                "   - **Precio:** " + getMockPriceString("54916", 2499) + "\n" +
                "   - **Fuerza:** Ryzen 9 7900X, **64GB RAM DDR5** y RTX 4080 Super. Ideal para grandes compilaciones, docker, virtualización extrema.\n\n" +
                "2. **ASUS Zenbook 14 OLED (Código: 57990)**:\n" +
                "   - **Precio:** " + getMockPriceString("57990", 1399) + "\n" +
                "   - **Fuerza:** Ultra 9, **32GB RAM** y pantalla 3K OLED. Muy portable y potente.\n\n" +
                "Hacé clic en el código de arriba para abrir sus detalles.";
    } 
    else if (textLower.includes('barat') || textLower.includes('estudiar') || textLower.includes('econom') || textLower.includes('oficina') || textLower.includes('simple')) {
        reply = "Para **Estudiantes y tareas de Oficina/Hogar**, te sugiero equipos ligeros y de excelente relación precio/calidad:\n\n" +
                "1. **ASUS Vivobook Go 15 (Código: 58300)**:\n" +
                "   - **Precio:** " + getMockPriceString("58300", 419) + "\n" +
                "   - **Fuerza:** Ryzen 5, 8GB RAM, 512GB SSD. Perfecta para Classroom, Word, Excel y navegar.\n\n" +
                "2. **PC de Oficina Slim i5 (Código: 54913)**:\n" +
                "   - **Precio:** " + getMockPriceString("54913", 489) + "\n" +
                "   - **Fuerza:** i5-13400 de 10 núcleos, 16GB RAM y 480GB SSD. Súper compacta y veloz para el escritorio.\n\n" +
                "Para conversar de forma fluida, recordá colocar tu **API Key de Gemini** en el botón de engranaje de la barra superior o en el botón Sign Up.";
    } 
    else if (textLower.includes('disen') || textLower.includes('edit') || textLower.includes('foto') || textLower.includes('video') || textLower.includes('mac') || textLower.includes('apple')) {
        reply = "Para **Diseño Gráfico y Edición**, te sugiero:\n\n" +
                "1. **MacBook Pro 14.2'' M3 Pro (Código: 57003)**:\n" +
                "   - **Precio:** " + getMockPriceString("57003", 1999) + "\n" +
                "   - **Fuerza:** Chip M3 Pro, 18GB RAM y pantalla Liquid Retina XDR de nivel profesional.\n\n" +
                "2. **PC Workstation Ryzen 9 (Código: 54916)**:\n" +
                "   - **Precio:** " + getMockPriceString("54916", 2499) + "\n" +
                "   - **Fuerza:** Ryzen 9, 64GB RAM DDR5, RTX 4080 Super. Ideal para renderizado 3D y edición de video 4K/8K sin tirones.";
    } 
    else {
        reply = "Entiendo. Decime si buscás alguna marca en particular o si prefieres una notebook o una PC de escritorio para que te recomiende opciones de nuestro catálogo de 55 modelos.";
    }
    
    chatHistory.push({ role: 'model', content: reply });
    return reply;
}

/* ==========================================================================
   7. SPA VIEW SWITCHING AND INITIALIZATION
   ========================================================================== */
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
        if (dashboardView && !dashboardView.classList.contains('hidden-view')) {
            dashboardView.classList.add('hidden-view');
            setTimeout(() => {
                if (dashboardView.classList.contains('hidden-view')) {
                    dashboardView.style.display = 'none';
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
        if (dashboardView && !dashboardView.classList.contains('hidden-view')) {
            dashboardView.classList.add('hidden-view');
            setTimeout(() => {
                if (dashboardView.classList.contains('hidden-view')) {
                    dashboardView.style.display = 'none';
                }
            }, 400);
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (viewName === 'dashboard-view') {
        const link = document.getElementById('nav-dashboard-link');
        if (link) link.classList.add('active');
        
        if (dashboardView.classList.contains('hidden-view')) {
            dashboardView.style.display = 'block';
            dashboardView.offsetHeight; // force reflow
            dashboardView.classList.remove('hidden-view');
        }
        if (!landingView.classList.contains('hidden-view')) {
            landingView.classList.add('hidden-view');
            setTimeout(() => {
                if (landingView.classList.contains('hidden-view')) {
                    landingView.style.display = 'none';
                }
            }, 400);
        }
        if (!catalogView.classList.contains('hidden-view')) {
            catalogView.classList.add('hidden-view');
            setTimeout(() => {
                if (catalogView.classList.contains('hidden-view')) {
                    catalogView.style.display = 'none';
                }
            }, 400);
        }
        
        renderDashboard();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Hide mobile nav when shifting view
    const mainNav = document.querySelector('.main-nav');
    if (mainNav) {
        mainNav.classList.remove('mobile-visible');
    }
}

// Render Dashboard products table
function renderDashboard() {
    const tbody = document.getElementById('dashboard-products-tbody');
    if (!tbody) return;
    
    const dashboardSearchPhrase = document.getElementById('dashboard-search')?.value.toLowerCase().trim() || '';
    
    const displayProducts = allNotebooks.filter(item => {
        return dashboardSearchPhrase === '' ||
            item.id.toLowerCase().includes(dashboardSearchPhrase) ||
            item.name.toLowerCase().includes(dashboardSearchPhrase) ||
            item.brand.toLowerCase().includes(dashboardSearchPhrase) ||
            (item.specs && item.specs.cpu && item.specs.cpu.toLowerCase().includes(dashboardSearchPhrase)) ||
            (item.specs && item.specs.ram && item.specs.ram.toLowerCase().includes(dashboardSearchPhrase));
    });
    
    tbody.innerHTML = '';
    
    if (displayProducts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">No se encontraron productos.</td></tr>`;
        return;
    }
    
    displayProducts.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 12px 8px; font-family: monospace; font-weight: bold; color: var(--accent-blue);">${item.id}</td>
            <td style="padding: 12px 8px; font-weight: 500;">${item.brand}</td>
            <td style="padding: 12px 8px;" title="${item.name}">${item.name.length > 50 ? item.name.substring(0, 50) + '...' : item.name}</td>
            <td style="padding: 12px 8px;"><span class="card-category-badge" style="margin: 0; padding: 2px 8px; font-size: 0.7rem;">${item.category}</span></td>
            <td style="padding: 12px 8px; font-weight: bold;">U$S ${item.price_usd}</td>
            <td style="padding: 12px 8px; text-align: right; white-space: nowrap;">
                <button class="btn-admin-action btn-edit-product" data-id="${item.id}"><i class="fa-solid fa-edit"></i> Editar</button>
                <button class="btn-admin-action btn-delete btn-delete-product" data-id="${item.id}"><i class="fa-solid fa-trash"></i> Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // Bind action buttons
    tbody.querySelectorAll('.btn-edit-product').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            const product = allNotebooks.find(p => p.id === id);
            if (product) {
                openEditModal(product);
            }
        });
    });
    
    tbody.querySelectorAll('.btn-delete-product').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            if (confirm(`¿Estás seguro de que deseas eliminar el producto con ID ${id}?`)) {
                deleteProduct(id);
            }
        });
    });
}

// Edit/Add modal variables and logic
const editModal = document.getElementById('dashboard-edit-modal');
const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
const cancelEditModalBtn = document.getElementById('cancel-edit-modal-btn');
const saveProductBtn = document.getElementById('save-product-btn');
const editProductForm = document.getElementById('edit-product-form');
const editProductFile = document.getElementById('edit-product-file');
const editImagePreview = document.getElementById('edit-product-image-preview');
const editImagePlaceholder = document.getElementById('edit-product-image-placeholder');

function openEditModal(product = null) {
    const titleEl = document.getElementById('edit-modal-title');
    editProductForm.reset();
    
    if (product) {
        titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Editar Producto`;
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
        titleEl.innerHTML = `<i class="fa-solid fa-plus"></i> Agregar Producto`;
        document.getElementById('edit-product-id').value = '';
        editImagePreview.style.display = 'none';
        editImagePlaceholder.style.display = 'block';
    }
    
    editModal.classList.add('modal-active');
}

function closeEditModal() {
    editModal.classList.remove('modal-active');
}

closeEditModalBtn?.addEventListener('click', closeEditModal);
cancelEditModalBtn?.addEventListener('click', closeEditModal);

editProductFile?.addEventListener('change', (e) => {
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

async function saveCatalog() {
    try {
        const response = await fetch('/api/save-catalog', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(allNotebooks)
        });
        if (!response.ok) throw new Error('API save error');
        const res = await response.json();
        return res.success;
    } catch (e) {
        console.error("Error saving catalog:", e);
        return false;
    }
}

async function deleteProduct(id) {
    allNotebooks = allNotebooks.filter(p => p.id !== id);
    const success = await saveCatalog();
    if (success) {
        alert("Producto eliminado con éxito.");
        renderDashboard();
        renderNotebooks();
        renderFeaturedNotebooks();
    } else {
        alert("Error al intentar guardar los cambios.");
    }
}

saveProductBtn?.addEventListener('click', async (e) => {
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
    
    if (id) {
        const existingProduct = allNotebooks.find(p => p.id === id);
        if (existingProduct) {
            imagePath = existingProduct.image;
        }
    }
    
    const file = editProductFile.files[0];
    if (file) {
        const formData = new FormData();
        formData.append('image', file);
        
        try {
            const uploadResponse = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData
            });
            if (!uploadResponse.ok) throw new Error('Image upload failed');
            const uploadData = await uploadResponse.json();
            imagePath = uploadData.image_path;
        } catch (err) {
            console.error("Error uploading image:", err);
            alert("Error al subir la imagen. Se guardará sin actualizar imagen.");
        }
    }
    
    if (!imagePath) {
        if (category === 'gaming') {
            imagePath = "assets/gaming_laptop.png";
        } else if (category === 'design' || brand === 'Apple') {
            imagePath = "assets/macbook.png";
        } else if (category === 'office') {
            imagePath = "assets/office_laptop.png";
        } else {
            imagePath = "assets/creative_laptop.png";
        }
    }
    
    const productData = {
        id: id || generateUniqueId(),
        name,
        brand,
        price_usd,
        category,
        type,
        specs: {
            cpu,
            ram,
            ssd,
            screen,
            gpu,
            os
        },
        image: imagePath
    };
    
    if (id) {
        const idx = allNotebooks.findIndex(p => p.id === id);
        if (idx !== -1) {
            allNotebooks[idx] = productData;
        }
    } else {
        allNotebooks.push(productData);
    }
    
    const success = await saveCatalog();
    if (success) {
        alert("Catálogo guardado con éxito.");
        closeEditModal();
        renderDashboard();
        renderNotebooks();
        renderFeaturedNotebooks();
    } else {
        alert("Ocurrió un error al guardar el producto.");
    }
});

function generateUniqueId() {
    let newId;
    do {
        newId = Math.floor(10000 + Math.random() * 90000).toString();
    } while (allNotebooks.some(p => p.id === newId));
    return newId;
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

    const navDashboard = document.getElementById('nav-dashboard-link');
    if (navDashboard) {
        navDashboard.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('dashboard-view');
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

    const footerDashboard = document.getElementById('footer-dashboard-link');
    if (footerDashboard) {
        footerDashboard.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('dashboard-view');
        });
    }

    const exportExcelBtn = document.getElementById('dashboard-export-excel-btn');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/export-excel', {
                    method: 'POST'
                });
                if (!response.ok) throw new Error('API Excel export error');
                const data = await response.json();
                if (data.success) {
                    alert("¡Precios exportados a Excel con éxito! Podés encontrar 'precios_venta.xlsx' en la carpeta raíz.");
                } else {
                    alert("Ocurrió un error al exportar a Excel.");
                }
            } catch (e) {
                console.error("Error exporting to Excel:", e);
                alert("Error al conectar con la API de exportación.");
            }
        });
    }
    
    const addProductBtn = document.getElementById('dashboard-add-product-btn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            openEditModal(null);
        });
    }

    const dashboardSearch = document.getElementById('dashboard-search');
    if (dashboardSearch) {
        dashboardSearch.addEventListener('input', () => {
            renderDashboard();
        });
    }
    
    // Mobile Menu Toggle Button
    const menuToggle = document.getElementById('menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            mainNav.classList.toggle('mobile-visible');
        });
        document.addEventListener('click', (e) => {
            if (!mainNav.contains(e.target) && e.target !== menuToggle) {
                mainNav.classList.remove('mobile-visible');
            }
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    initIntro();
    const activeLink = document.getElementById('nav-inicio-link');
    if (activeLink) activeLink.classList.add('active');
});
