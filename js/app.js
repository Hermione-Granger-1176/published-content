document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const contentGrid = document.getElementById('content-grid');
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    const sortButtons = document.querySelectorAll('.btn-sort');
    const themeToggle = document.getElementById('theme-toggle');
    const noResults = document.getElementById('no-results');
    const noResultsReset = document.getElementById('no-results-reset');
    const resultsCount = document.getElementById('results-count');
    const paginationContainer = document.getElementById('pagination');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const activeFiltersBar = document.getElementById('active-filters');
    const scrollTopBtn = document.getElementById('scroll-top');
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
    const CHEVRON_LEFT = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';
    const CHEVRON_RIGHT = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
    const CHEVRON_FIRST = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 18 7 12 13 6"></polyline><line x1="17" y1="6" x2="17" y2="18"></line></svg>';
    const CHEVRON_LAST = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 18 17 12 11 6"></polyline><line x1="7" y1="6" x2="7" y2="18"></line></svg>';
    const THEME_COLORS = { dark: '#202020', light: '#f0f0f0' };
    const DEFAULTS = { page: 1, platform: 'all', tag: 'all', sort: 'newest', q: '' };
    const SCROLL_TOP_THRESHOLD = 300;

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
        btn.innerHTML = `${escapeHtml(tag)}<span class="filter-count"></span>`;
        tagFiltersContainer.appendChild(btn);
    });

    // Also add count spans to platform filter buttons (except "All")
    platformFilters.querySelectorAll('.btn-filter').forEach(btn => {
        if (btn.dataset.platform !== 'all') {
            const span = document.createElement('span');
            span.className = 'filter-count';
            btn.appendChild(span);
        }
    });

    // ─── Initialize from URL ────────────────────────────────────────────

    readStateFromURL();
    syncUIToState();
    renderContent();

    function syncUIToState() {
        // Search — preserve original casing if the lowercased values match
        if (searchInput.value.toLowerCase() !== currentFilter) {
            searchInput.value = currentFilter;
        }
        updateSearchClearVisibility();

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

        // Reset button & active filters bar
        updateResetButtonVisibility();
        renderActiveFilters();
    }

    // ─── Event Listeners ────────────────────────────────────────────────

    // Search with debounce
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentFilter = e.target.value.toLowerCase();
            currentPage = 1;
            updateSearchClearVisibility();
            pushState();
            renderContent();
        }, 150);
    });

    // Clear search button
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        currentFilter = '';
        currentPage = 1;
        updateSearchClearVisibility();
        pushState();
        renderContent();
        searchInput.focus();
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

    // Reset all filters
    resetFiltersBtn.addEventListener('click', resetAllFilters);
    noResultsReset.addEventListener('click', resetAllFilters);

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

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Modal-specific keys
        if (isModalOpen) {
            if (e.key === 'Escape') closeModal();
            else if (e.key === 'Tab') handleModalTabKey(e);
            return;
        }

        // "/" to focus search (when not already in an input and modal not open)
        if (e.key === '/' && !isModalOpen) {
            const active = document.activeElement;
            const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
            if (!isInput) {
                e.preventDefault();
                searchInput.focus();
            }
        }
    });

    // Scroll to top button
    let scrollTicking = false;
    window.addEventListener('scroll', () => {
        if (!scrollTicking) {
            requestAnimationFrame(() => {
                scrollTopBtn.classList.toggle('visible', window.scrollY > SCROLL_TOP_THRESHOLD);
                scrollTicking = false;
            });
            scrollTicking = true;
        }
    }, { passive: true });

    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // ─── Reset All Filters ──────────────────────────────────────────────

    function resetAllFilters() {
        currentFilter = '';
        currentPlatform = DEFAULTS.platform;
        currentTag = DEFAULTS.tag;
        currentSort = DEFAULTS.sort;
        currentPage = DEFAULTS.page;
        searchInput.value = '';

        syncUIToState();
        pushState();
        renderContent();
        searchInput.focus();
    }

    // ─── Search Clear Visibility ────────────────────────────────────────

    function updateSearchClearVisibility() {
        const hasValue = searchInput.value.length > 0;
        searchClear.classList.toggle('hidden', !hasValue);
    }

    // ─── Reset Button Visibility ────────────────────────────────────────

    function updateResetButtonVisibility() {
        const hasActiveFilters =
            currentPlatform !== DEFAULTS.platform ||
            currentTag !== DEFAULTS.tag ||
            currentSort !== DEFAULTS.sort ||
            currentFilter !== DEFAULTS.q;
        resetFiltersBtn.classList.toggle('hidden', !hasActiveFilters);
    }

    // ─── Active Filters Bar ─────────────────────────────────────────────

    function renderActiveFilters() {
        const chips = [];

        if (currentPlatform !== DEFAULTS.platform) {
            chips.push({ label: `Platform: ${platformLabel(currentPlatform)}`, action: 'platform' });
        }
        if (currentTag !== DEFAULTS.tag) {
            chips.push({ label: `Tag: ${currentTag}`, action: 'tag' });
        }
        if (currentSort !== DEFAULTS.sort) {
            chips.push({ label: `Sort: ${currentSort === 'oldest' ? 'Oldest first' : 'Newest first'}`, action: 'sort' });
        }
        if (currentFilter) {
            chips.push({ label: `Search: "${currentFilter}"`, action: 'search' });
        }

        if (chips.length === 0) {
            activeFiltersBar.classList.add('hidden');
            activeFiltersBar.innerHTML = '';
            return;
        }

        activeFiltersBar.classList.remove('hidden');
        activeFiltersBar.innerHTML = chips.map(chip =>
            `<button class="active-filter-chip" data-dismiss="${escapeHtml(chip.action)}" aria-label="Remove filter: ${escapeHtml(chip.label)}">${escapeHtml(chip.label)} <span class="chip-dismiss">&times;</span></button>`
        ).join('');
    }

    // Active filter chip dismissal
    activeFiltersBar.addEventListener('click', (e) => {
        const chip = e.target.closest('.active-filter-chip');
        if (!chip) return;
        const action = chip.dataset.dismiss;

        if (action === 'platform') currentPlatform = DEFAULTS.platform;
        else if (action === 'tag') currentTag = DEFAULTS.tag;
        else if (action === 'sort') currentSort = DEFAULTS.sort;
        else if (action === 'search') { currentFilter = ''; searchInput.value = ''; }

        currentPage = 1;
        syncUIToState();
        pushState();
        renderContent();
    });

    // ─── Utility Functions ──────────────────────────────────────────────

    function getSearchableText(item) {
        return `${item.title} ${item.tags.join(' ')} ${item.id} ${item.platform}`.toLowerCase();
    }

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

    function platformLabel(platform) {
        return platform === 'linkedin' ? 'LinkedIn' : 'YouTube';
    }

    function sortKey(item) {
        return parseInt(item.id, 10) || 0;
    }

    // ─── Filter Count Badges ────────────────────────────────────────────

    function updateFilterCounts() {
        // Platform counts — count how many items match current tag & search, per platform
        const platformCounts = { linkedin: 0, youtube: 0 };
        const tagCounts = {};
        allTags.forEach(t => { tagCounts[t] = 0; });

        allContent.forEach(item => {
            // Check if item matches tag & search (for platform counts)
            const matchesTag = currentTag === 'all' || item.tags.includes(currentTag);
            const matchesSearch = !currentFilter || getSearchableText(item).includes(currentFilter);

            if (matchesTag && matchesSearch) {
                if (platformCounts[item.platform] !== undefined) {
                    platformCounts[item.platform]++;
                }
            }

            // Check if item matches platform & search (for tag counts)
            const matchesPlatform = currentPlatform === 'all' || item.platform === currentPlatform;
            if (matchesPlatform && matchesSearch) {
                item.tags.forEach(t => {
                    if (tagCounts[t] !== undefined) tagCounts[t]++;
                });
            }
        });

        // Update platform buttons
        platformFilters.querySelectorAll('.btn-filter').forEach(btn => {
            const countSpan = btn.querySelector('.filter-count');
            if (!countSpan) return;
            const platform = btn.dataset.platform;
            const count = platformCounts[platform] || 0;
            countSpan.textContent = count;
        });

        // Update tag buttons
        tagFiltersContainer.querySelectorAll('.btn-filter').forEach(btn => {
            const countSpan = btn.querySelector('.filter-count');
            if (!countSpan) return;
            const tag = btn.dataset.tag;
            if (tag === 'all') return;
            const count = tagCounts[tag] || 0;
            countSpan.textContent = count;
        });
    }

    // ─── Render ─────────────────────────────────────────────────────────

    function renderContent() {
        // Filter
        let filtered = allContent.filter(item => {
            if (currentPlatform !== 'all' && item.platform !== currentPlatform) return false;
            if (currentTag !== 'all' && !item.tags.includes(currentTag)) return false;
            if (currentFilter) {
                if (!getSearchableText(item).includes(currentFilter)) return false;
            }
            return true;
        });

        // Sort
        filtered.sort((a, b) => {
            const aKey = sortKey(a);
            const bKey = sortKey(b);
            return currentSort === 'newest' ? bKey - aKey : aKey - bKey;
        });

        // Update filter count badges
        updateFilterCounts();

        // Update active filters bar & reset button
        updateResetButtonVisibility();
        renderActiveFilters();

        // Pagination math
        const totalItems = filtered.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
        currentPage = Math.max(1, Math.min(currentPage, totalPages));
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
        const pageItems = filtered.slice(startIndex, endIndex);

        // Results count
        if (totalItems === 0) {
            resultsCount.textContent = 'No items found';
        } else {
            resultsCount.textContent = `Showing ${startIndex + 1}\u2013${endIndex} of ${totalItems} items`;
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

        const onFirst = currentPage === 1;
        const onLast = currentPage === totalPages;

        // First page button
        html += `<button class="page-btn page-first" data-page="1" ${onFirst ? 'disabled' : ''} aria-label="First page">${CHEVRON_FIRST}</button>`;

        // Previous button
        html += `<button class="page-btn page-prev" data-page="${currentPage - 1}" ${onFirst ? 'disabled' : ''} aria-label="Previous page">${CHEVRON_LEFT}</button>`;

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
        html += `<button class="page-btn page-next" data-page="${currentPage + 1}" ${onLast ? 'disabled' : ''} aria-label="Next page">${CHEVRON_RIGHT}</button>`;

        // Last page button
        html += `<button class="page-btn page-last" data-page="${totalPages}" ${onLast ? 'disabled' : ''} aria-label="Last page">${CHEVRON_LAST}</button>`;

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
        modalId.innerHTML = `<span class="platform-badge ${escapeHtml(item.platform)}">${platformLabel(item.platform)}</span>`;
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
