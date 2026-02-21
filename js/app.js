document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const contentGrid = document.getElementById('content-grid');
    const searchInput = document.getElementById('search-input');
    const sortButtons = document.querySelectorAll('.btn-sort');
    const themeToggle = document.getElementById('theme-toggle');
    const noResults = document.getElementById('no-results');
    const resultsCount = document.getElementById('results-count');
    const paginationContainer = document.getElementById('pagination');
    const htmlElement = document.documentElement;

    // Filter Elements
    const platformFilters = document.getElementById('platform-filters');
    const tagFiltersContainer = document.getElementById('tag-filters');

    // Modal Elements
    const modalOverlay = document.getElementById('modal-overlay');
    const modalClose = document.getElementById('modal-close');
    const modalTitle = document.getElementById('modal-title');
    const modalId = document.getElementById('modal-id');
    const modalTags = document.getElementById('modal-tags');
    const modalUrl = document.getElementById('modal-url');
    const modalUrlText = document.getElementById('modal-url-text');
    const modalDownload = document.getElementById('modal-download');
    const modalContent = modalOverlay.querySelector('.modal-content');
    const header = document.querySelector('header');
    const mainContent = document.querySelector('main');
    const footer = document.querySelector('footer');

    // Constants
    const ITEMS_PER_PAGE = 12;
    const ARROW_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';
    const THEME_COLORS = { dark: '#202020', light: '#f0f0f0' };
    const DEFAULTS = { page: 1, platform: 'all', tag: 'all', sort: 'newest', q: '' };

    // State
    const allContent = window.CONTENT_DATA || [];
    let currentPage = 1;
    let currentFilter = '';
    let currentSort = 'newest';
    let currentPlatform = 'all';
    let currentTag = 'all';
    let isModalOpen = false;
    let lastFocusedElement = null;
    let debounceTimer = null;
    let suppressPush = false; // Prevent pushing state during popstate handling

    // Build lookup map
    const contentByKey = new Map(allContent.map(item => [`${item.platform}-${item.id}`, item]));

    // Collect all unique tags from data
    const allTags = [...new Set(allContent.flatMap(item => item.tags))].sort();

    // ─── URL State Management ───────────────────────────────────────────

    function readStateFromURL() {
        const params = new URLSearchParams(window.location.search);
        currentPage = Math.max(1, parseInt(params.get('page'), 10) || DEFAULTS.page);
        currentPlatform = params.get('platform') || DEFAULTS.platform;
        currentTag = params.get('tag') || DEFAULTS.tag;
        currentSort = params.get('sort') || DEFAULTS.sort;
        currentFilter = (params.get('q') || DEFAULTS.q).toLowerCase();
        searchInput.value = params.get('q') || '';
    }

    function buildQueryString() {
        const params = new URLSearchParams();
        if (currentPage > 1) params.set('page', currentPage);
        if (currentPlatform !== DEFAULTS.platform) params.set('platform', currentPlatform);
        if (currentTag !== DEFAULTS.tag) params.set('tag', currentTag);
        if (currentSort !== DEFAULTS.sort) params.set('sort', currentSort);
        if (currentFilter) params.set('q', currentFilter);
        const qs = params.toString();
        return qs ? `?${qs}` : window.location.pathname;
    }

    function pushState() {
        if (suppressPush) return;
        const url = buildQueryString();
        if (url !== window.location.search && url !== `${window.location.pathname}${window.location.search}`) {
            history.pushState(null, '', url);
        }
    }

    // Browser back/forward
    window.addEventListener('popstate', () => {
        suppressPush = true;
        readStateFromURL();
        syncUIToState();
        renderContent();
        suppressPush = false;
    });

    // ─── Theme Management ───────────────────────────────────────────────

    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme, false);

    themeToggle.addEventListener('click', () => {
        const current = htmlElement.getAttribute('data-theme');
        applyTheme(current === 'dark' ? 'light' : 'dark');
    });

    function applyTheme(theme, persist = true) {
        htmlElement.setAttribute('data-theme', theme);
        if (persist) localStorage.setItem('theme', theme);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.dark);
    }

    // ─── Dynamic Tag Buttons ────────────────────────────────────────────

    allTags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'btn-filter';
        btn.dataset.tag = tag;
        btn.textContent = tag;
        tagFiltersContainer.appendChild(btn);
    });

    // ─── Initialize from URL ────────────────────────────────────────────

    readStateFromURL();
    syncUIToState();
    renderContent();

    function syncUIToState() {
        // Search
        searchInput.value = currentFilter;

        // Sort buttons
        sortButtons.forEach(btn => {
            const isActive = btn.dataset.sort === currentSort;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', String(isActive));
        });

        // Platform filters
        platformFilters.querySelectorAll('.btn-filter').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.platform === currentPlatform);
        });

        // Tag filters
        tagFiltersContainer.querySelectorAll('.btn-filter').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tag === currentTag);
        });
    }

    // ─── Event Listeners ────────────────────────────────────────────────

    // Search with debounce
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentFilter = e.target.value.toLowerCase();
            currentPage = 1;
            pushState();
            renderContent();
        }, 150);
    });

    // Sort buttons
    sortButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            sortButtons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            currentSort = btn.dataset.sort;
            currentPage = 1;
            pushState();
            renderContent();
        });
    });

    // Platform filters
    platformFilters.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-filter');
        if (!btn) return;
        platformFilters.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentPlatform = btn.dataset.platform;
        currentPage = 1;
        pushState();
        renderContent();
    });

    // Tag filters
    tagFiltersContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-filter');
        if (!btn) return;
        tagFiltersContainer.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTag = btn.dataset.tag;
        currentPage = 1;
        pushState();
        renderContent();
    });

    // Card clicks (event delegation)
    contentGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.session-card');
        if (!card) return;
        const item = contentByKey.get(card.dataset.key);
        if (item) openModal(item);
    });

    contentGrid.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const card = e.target.closest('.session-card');
        if (!card) return;
        e.preventDefault();
        const item = contentByKey.get(card.dataset.key);
        if (item) openModal(item);
    });

    // Pagination clicks (event delegation)
    paginationContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-page]');
        if (!btn || btn.disabled) return;
        const page = parseInt(btn.dataset.page, 10);
        if (page && page !== currentPage) {
            currentPage = page;
            pushState();
            renderContent();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // Modal Events
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
    document.addEventListener('keydown', (e) => {
        if (!isModalOpen) return;
        if (e.key === 'Escape') closeModal();
        else if (e.key === 'Tab') handleModalTabKey(e);
    });

    // ─── Utility Functions ──────────────────────────────────────────────

    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function sanitizeUrl(url) {
        if (!url) return '#';
        try {
            const parsed = new URL(url, window.location.href);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return escapeHtml(parsed.href);
        } catch { /* invalid */ }
        return '#';
    }

    function formatId(item) {
        if (item.platform === 'youtube') {
            const d = item.id;
            if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
        }
        return item.id;
    }

    function platformLabel(platform) {
        return platform === 'linkedin' ? 'LinkedIn' : 'YouTube';
    }

    function sortKey(item) {
        return parseInt(item.id, 10) || 0;
    }

    // ─── Render ─────────────────────────────────────────────────────────

    function renderContent() {
        // Filter
        let filtered = allContent.filter(item => {
            if (currentPlatform !== 'all' && item.platform !== currentPlatform) return false;
            if (currentTag !== 'all' && !item.tags.includes(currentTag)) return false;
            if (currentFilter) {
                const searchable = `${item.title} ${item.tags.join(' ')} ${item.id} ${item.platform}`.toLowerCase();
                if (!searchable.includes(currentFilter)) return false;
            }
            return true;
        });

        // Sort
        filtered.sort((a, b) => {
            const aKey = sortKey(a);
            const bKey = sortKey(b);
            return currentSort === 'newest' ? bKey - aKey : aKey - bKey;
        });

        // Pagination math
        const totalItems = filtered.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
        if (currentPage > totalPages) currentPage = totalPages;
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
        const pageItems = filtered.slice(startIndex, endIndex);

        // Results count
        if (totalItems === 0) {
            resultsCount.textContent = 'No items found';
        } else {
            resultsCount.textContent = `Showing ${startIndex + 1}–${endIndex} of ${totalItems} items`;
        }

        // Render cards
        if (totalItems === 0) {
            contentGrid.innerHTML = '';
            noResults.classList.remove('hidden');
            paginationContainer.innerHTML = '';
        } else {
            noResults.classList.add('hidden');
            contentGrid.innerHTML = pageItems.map(createCard).join('');
            renderPagination(totalPages);
        }
    }

    function createCard(item) {
        const key = escapeHtml(`${item.platform}-${item.id}`);
        const tagsHtml = item.tags.map(t => `<span class="tag-badge">${escapeHtml(t)}</span>`).join('');
        return `
            <article class="session-card" data-key="${key}" tabindex="0" role="button"
                aria-label="View details for ${escapeHtml(item.title)}">
                <div>
                    <div class="session-id">
                        <span class="platform-badge ${escapeHtml(item.platform)}">${platformLabel(item.platform)}</span>
                    </div>
                    <h3 class="session-title">${escapeHtml(item.title)}</h3>
                    <div class="card-tags">${tagsHtml}</div>
                </div>
                <div class="card-cta">
                    <span>View Details</span>
                    ${ARROW_ICON}
                </div>
            </article>
        `;
    }

    // ─── Pagination ─────────────────────────────────────────────────────

    function renderPagination(totalPages) {
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        const pages = getPageNumbers(currentPage, totalPages);
        let html = '';

        // Previous button
        html += `<button class="page-btn page-prev" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} aria-label="Previous page">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            Prev
        </button>`;

        // Page numbers
        for (const page of pages) {
            if (page === '...') {
                html += '<span class="page-ellipsis">&hellip;</span>';
            } else {
                const isActive = page === currentPage;
                html += `<button class="page-btn page-num ${isActive ? 'active' : ''}" data-page="${page}" ${isActive ? 'aria-current="page"' : ''} aria-label="Page ${page}">${page}</button>`;
            }
        }

        // Next button
        html += `<button class="page-btn page-next" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Next page">
            Next
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>`;

        paginationContainer.innerHTML = html;
    }

    function getPageNumbers(current, total) {
        // Always show first, last, current, and neighbors
        // Use ellipsis for gaps
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

        const pages = [];
        const addPage = (p) => { if (!pages.includes(p)) pages.push(p); };

        addPage(1);
        addPage(2);
        for (let i = current - 1; i <= current + 1; i++) {
            if (i >= 1 && i <= total) addPage(i);
        }
        addPage(total - 1);
        addPage(total);

        pages.sort((a, b) => a - b);

        // Insert ellipsis for gaps
        const result = [];
        for (let i = 0; i < pages.length; i++) {
            if (i > 0 && pages[i] - pages[i - 1] > 1) {
                result.push('...');
            }
            result.push(pages[i]);
        }
        return result;
    }

    // ─── Modal ──────────────────────────────────────────────────────────

    function getFocusableElements(container) {
        const selectors = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
        return Array.from(container.querySelectorAll(selectors)).filter(el => el.offsetParent !== null);
    }

    function handleModalTabKey(event) {
        if (!modalContent) return;
        const focusable = getFocusableElements(modalContent);
        if (focusable.length === 0) { event.preventDefault(); modalClose.focus(); return; }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    function setBackgroundAriaHidden(isHidden) {
        [header, mainContent, footer].forEach(el => {
            if (!el) return;
            if (isHidden) el.setAttribute('aria-hidden', 'true');
            else el.removeAttribute('aria-hidden');
        });
    }

    function openModal(item) {
        modalId.innerHTML = `<span class="platform-badge ${escapeHtml(item.platform)}">${platformLabel(item.platform)}</span> ${escapeHtml(formatId(item))}`;
        modalTitle.textContent = item.title;

        modalTags.innerHTML = item.tags.map(t => `<span class="tag-badge">${escapeHtml(t)}</span>`).join('');

        if (item.url) {
            modalUrl.href = sanitizeUrl(item.url);
            modalUrlText.textContent = item.platform === 'youtube' ? 'Watch Video' : 'View Post';
            modalUrl.classList.remove('hidden');
        } else {
            modalUrl.classList.add('hidden');
        }

        if (item.download_url) {
            modalDownload.href = sanitizeUrl(item.download_url);
            modalDownload.classList.remove('hidden');
        } else {
            modalDownload.classList.add('hidden');
        }

        lastFocusedElement = document.activeElement;
        isModalOpen = true;
        modalOverlay.classList.add('modal-active');
        modalOverlay.setAttribute('aria-hidden', 'false');
        setBackgroundAriaHidden(true);
        document.body.style.overflow = 'hidden';
        modalClose.focus();
    }

    function closeModal() {
        isModalOpen = false;
        modalOverlay.classList.remove('modal-active');
        modalOverlay.setAttribute('aria-hidden', 'true');
        setBackgroundAriaHidden(false);
        document.body.style.overflow = '';
        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
        lastFocusedElement = null;
    }
});
