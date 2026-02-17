// ========== GrubSight App ==========
let allProducts = [];
let filteredProducts = [];
let currentCategory = 'all';
let currentSort = 'popular';
let currentPriceFilter = 'all';
let currentRatingFilter = 'all';
let currentOriginFilter = 'all';
let displayCount = 24;
const PER_PAGE = 24;
const TAG = 'grubsight-20';
const shortLinks = {};

document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts();
    setupSearch();
    setupNavScroll();
    setupScrollReveal();
    animateCounters();
});

async function loadProducts() {
    try {
        const r = await fetch('./data/products.json');
        allProducts = await r.json();
        filteredProducts = [...allProducts];
        updateCategoryCounts();
        populateOriginFilter();
        renderProducts();
    } catch (e) {
        document.getElementById('product-grid').innerHTML = `<div class="no-results"><div class="no-results-emoji">😿</div><h3>Couldn't load products</h3><p>Please try refreshing.</p></div>`;
    }
}

function renderProducts() {
    const grid = document.getElementById('product-grid');
    const visible = filteredProducts.slice(0, displayCount);
    if (!visible.length) {
        grid.innerHTML = `<div class="no-results"><div class="no-results-emoji">🔍</div><h3>No products found</h3><p>Try adjusting your filters.</p></div>`;
        document.getElementById('load-more-wrap').style.display = 'none';
        updateCount(0); return;
    }
    grid.innerHTML = visible.map((p, i) => {
        const link = shortLinks[p.asin] || `https://www.amazon.com/dp/${p.asin}?tag=${TAG}`;
        const stars = getStars(p.rating);
        const img = p.image || `https://via.placeholder.com/300x300/141414/FF6B35?text=${encodeURIComponent(p.name.substring(0,15))}`;
        return `
        <div class="product-card" style="--i:${i}">
            ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
            ${p.origin ? `<span class="product-origin">${p.origin}</span>` : ''}
            <a href="${link}" target="_blank" rel="noopener noreferrer nofollow">
                <div class="product-img-wrap">
                    <img src="${img}" alt="${esc(p.name)}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x300/141414/FF6B35?text=Food'">
                </div>
            </a>
            <div class="product-info">
                <div class="product-name" title="${esc(p.name)}">${esc(p.name)}</div>
                <div class="product-rating"><span class="stars">${stars}</span><span class="rating-text">${p.rating} (${p.reviews})</span></div>
                <div class="product-price-row">
                    <span class="product-price">$${p.price.toFixed(2)}</span>
                    <a href="${link}" target="_blank" rel="noopener noreferrer nofollow" class="buy-btn">View on Amazon</a>
                </div>
            </div>
        </div>`;
    }).join('');
    document.getElementById('load-more-wrap').style.display = displayCount < filteredProducts.length ? 'block' : 'none';
    updateCount(filteredProducts.length);
}

function getStars(r) { const f=Math.floor(r), h=r%1>=0.3; return '★'.repeat(f)+(h?'½':'')+'☆'.repeat(5-f-(h?1:0)); }
function esc(s) { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
function updateCount(n) { document.getElementById('product-count').textContent=`Showing ${Math.min(displayCount,n)} of ${n} products`; }

function updateCategoryCounts() {
    const c = {};
    allProducts.forEach(p => c[p.category] = (c[p.category]||0)+1);
    document.querySelectorAll('.cuisine-count').forEach(el => el.textContent = c[el.dataset.cat]||0);
}

function populateOriginFilter() {
    const origins = [...new Set(allProducts.map(p=>p.origin).filter(Boolean))].sort();
    const sel = document.getElementById('origin-filter');
    origins.forEach(o => { const opt=document.createElement('option'); opt.value=o; opt.textContent=o; sel.appendChild(opt); });
}

// Filtering
window.filterCategory = function(cat, el) {
    currentCategory = cat;
    displayCount = PER_PAGE;
    applyFilters();
    document.querySelectorAll('.nav-link[data-category]').forEach(l => l.classList.remove('active'));
    if (el) el.classList.add('active');
    else { const n=document.querySelector(`.nav-link[data-category="${cat}"]`); if(n) n.classList.add('active'); }
    const titles = { all:'All Foods', mexican:'Mexican 🇲🇽', indian:'Indian 🇮🇳', japanese:'Japanese 🇯🇵', korean:'Korean 🇰🇷', italian:'Italian 🇮🇹', spicy:'Spicy & Hot 🌶️', snacks:'Global Snacks 🍿', sauces:'Sauces & Condiments 🫙', seafood:'Seafood 🐟', plantbased:'Plant-Based 🌱' };
    document.getElementById('section-heading').textContent = titles[cat]||'Foods';
    document.getElementById('products').scrollIntoView({ behavior:'smooth', block:'start' });
};

window.resetFilters = function() {
    currentCategory='all'; currentSort='popular'; currentPriceFilter='all'; currentRatingFilter='all'; currentOriginFilter='all';
    displayCount=PER_PAGE;
    ['sort-select','price-filter','rating-filter','origin-filter'].forEach(id => document.getElementById(id).value = id==='sort-select'?'popular':'all');
    document.getElementById('search').value='';
    applyFilters();
    document.querySelectorAll('.nav-link[data-category]').forEach(l=>l.classList.remove('active'));
    document.querySelector('.nav-link[data-category="all"]')?.classList.add('active');
    document.getElementById('section-heading').textContent='All Foods';
};

function applyFilters() {
    let p = [...allProducts];
    if (currentCategory!=='all') p=p.filter(x=>x.category===currentCategory);
    const q = document.getElementById('search').value.toLowerCase().trim();
    if (q) p=p.filter(x=>x.name.toLowerCase().includes(q)||x.category.includes(q)||(x.origin||'').toLowerCase().includes(q));
    if (currentPriceFilter!=='all') {
        if (currentPriceFilter==='35+') p=p.filter(x=>x.price>=35);
        else { const[a,b]=currentPriceFilter.split('-').map(Number); p=p.filter(x=>x.price>=a&&x.price<b); }
    }
    if (currentRatingFilter!=='all') { const m=parseFloat(currentRatingFilter); p=p.filter(x=>x.rating>=m); }
    if (currentOriginFilter!=='all') p=p.filter(x=>x.origin===currentOriginFilter);
    switch(currentSort) {
        case 'price-low': p.sort((a,b)=>a.price-b.price); break;
        case 'price-high': p.sort((a,b)=>b.price-a.price); break;
        case 'rating': p.sort((a,b)=>b.rating-a.rating); break;
        case 'name': p.sort((a,b)=>a.name.localeCompare(b.name)); break;
    }
    filteredProducts=p; renderProducts();
}

window.applySort = v => { currentSort=v; applyFilters(); };
window.applyPriceFilter = v => { currentPriceFilter=v; applyFilters(); };
window.applyRatingFilter = v => { currentRatingFilter=v; applyFilters(); };
window.applyOriginFilter = v => { currentOriginFilter=v; applyFilters(); };
window.loadMore = () => { displayCount+=PER_PAGE; renderProducts(); };

function setupSearch() {
    let t;
    document.getElementById('search').addEventListener('input', () => { clearTimeout(t); t=setTimeout(()=>{ displayCount=PER_PAGE; applyFilters(); },300); });
}

function setupNavScroll() {
    window.addEventListener('scroll', () => document.getElementById('navbar').classList.toggle('scrolled', scrollY>20), {passive:true});
}

function setupScrollReveal() {
    const obs = new IntersectionObserver(entries => entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible'); }), {threshold:0.1});
    document.querySelectorAll('.cuisine-card, .article-card, .trust-item').forEach(el => { el.classList.add('reveal'); obs.observe(el); });
}

function animateCounters() {
    const obs = new IntersectionObserver(entries => entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el=e.target, target=parseInt(el.dataset.count); let cur=0;
        const step=Math.max(1,Math.floor(target/40));
        const timer=setInterval(()=>{ cur+=step; if(cur>=target){cur=target;clearInterval(timer);} el.textContent=cur; },30);
        obs.unobserve(el);
    }), {threshold:0.5});
    document.querySelectorAll('.stat-num[data-count]').forEach(el=>obs.observe(el));
}

window.scrollToArticles = () => document.getElementById('articles').scrollIntoView({behavior:'smooth'});
window.openArticle = () => alert('Article coming soon! Stay tuned for our full food guide.');
