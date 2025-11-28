// Publications data loaded from JavaScript file
// publicationsData is defined in publications-data.js

const publicationDetailsMap = new Map();
let publicationsListElement;
let publicationDetailElement;
let publicationDetailHeaderElement;
let publicationDetailInfoElement;
let lastSelectedPublicationElement = null;

function scrollToPublicationCard(element) {
    if (!element) return;
    requestAnimationFrame(() => {
        const navHeight = 64;
        const extraOffset = 16;
        const rect = element.getBoundingClientRect();
        const target = rect.top + window.pageYOffset - (navHeight + extraOffset);
        window.scrollTo({ top: target > 0 ? target : 0, behavior: 'smooth' });
    });
}

// Load publications from JavaScript data file
function loadPublications() {
    return new Promise((resolve, reject) => {
        try {
            // publicationsData should be loaded from publications-data.js before this script runs
            if (typeof publicationsData === 'undefined') {
                console.warn('publicationsData not found. Make sure publications-data.js is loaded before publications.js');
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    mainContent.innerHTML = '<p style="text-align: center; color: var(--text-color-light); padding: 2rem;">Publications data is being loaded. Please ensure publications-data.js file exists.</p>';
                }
                reject(new Error('Publications data not found'));
                return;
            }
            
            // Group publications by year
            const publicationsByYear = groupByYear(publicationsData);
            
            // Generate sidebar menu
            generateSidebarMenu(publicationsByYear);
            
            // Generate publication cards
            generatePublicationCards(publicationsByYear);
            
            resolve();
        } catch (error) {
            console.error('Error loading publications:', error);
            // Show fallback message
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.innerHTML = '<p style="text-align: center; color: var(--text-color-light); padding: 2rem;">Error loading publications data.</p>';
            }
            reject(error);
        }
    });
}

// Extract year from date string (e.g., "Mar 2025" -> "2025")
function extractYear(dateString) {
    if (!dateString) return null;
    
    // Try to extract 4-digit year
    const yearMatch = dateString.match(/\b(20\d{2})\b/);
    if (yearMatch) {
        return yearMatch[1];
    }
    
    // Fallback: try Date2 field
    return null;
}

// Filter only Article type publications
function filterArticles(publications) {
    return publications.filter(pub => pub.Type === 'Article');
}

// Group publications by year
function groupByYear(publications) {
    // Filter only Article type
    const articles = filterArticles(publications);
    
    const grouped = {};
    articles.forEach(pub => {
        // Try Date field first, then Date2, then Year
        let year = extractYear(pub.Date) || extractYear(pub.Date2) || pub.Year || pub.year || '';
        
        if (year) {
            if (!grouped[year]) {
                grouped[year] = [];
            }
            grouped[year].push(pub);
        }
    });
    return grouped;
}

function renderPublicationDetailHeader(options) {
    if (!publicationDetailHeaderElement || typeof getDetailHeaderTemplate !== 'function') {
        return;
    }

    const {
        title,
        date,
        backButtonId,
        backButtonAriaLabel,
        onBackClick,
        titleId = '',
        titleTag = 'h2'
    } = options;

    publicationDetailHeaderElement.innerHTML = getDetailHeaderTemplate({
        backButtonId,
        backButtonAriaLabel,
        title,
        date,
        titleId,
        titleTag
    });

    const backButton = document.getElementById(backButtonId);
    if (backButton && typeof onBackClick === 'function') {
        backButton.addEventListener('click', onBackClick, { once: true });
    }
}

function showPublicationDetail(publicationId) {
    const publication = publicationDetailsMap.get(publicationId);
    if (!publication || !publicationsListElement || !publicationDetailElement || !publicationDetailInfoElement) {
        return;
    }

    publicationsListElement.style.display = 'none';
    publicationDetailElement.style.display = 'block';
    document.body.classList.add('detail-view-open');

    renderPublicationDetailHeader({
        title: publication.Title || 'Publication Detail',
        date: publication.Date || publication.Date2 || publication.year || '',
        backButtonId: 'back-to-publications',
        backButtonAriaLabel: 'Back to publications list',
        onBackClick: showPublicationsList,
        titleId: 'publication-detail-title',
        titleTag: 'h5'
    });

    const authors = publication.Authors || publication.authors || '';
    const venue = publication.ETC || '';
    const recommendation = publication.Recommentation || publication.Recommendation || '';
    const summary = publication.Summary || '';

    const metaParts = [];
    if (authors) metaParts.push(`<span class="publication-detail-authors">${authors}</span>`);
    if (venue) metaParts.push(`<span class="publication-detail-venue">${venue}</span>`);

    const researchGateUrl = publication.URL || publication.URL2 || publication.URL3 || '';
    const scholarUrl = `https://scholar.google.com/scholar_lookup?title=${encodeURIComponent(publication.Title || '')}${authors ? `&author=${encodeURIComponent(authors)}` : ''}`;

    const actions = [];
    if (typeof getActionButtonTemplate === 'function') {
        actions.push(getActionButtonTemplate({
            type: 'primary',
            href: scholarUrl,
            text: 'Google Scholar',
            target: '_blank',
            rel: 'noopener noreferrer',
            ariaLabel: 'Search this publication on Google Scholar'
        }));
    }

    const abstractText = summary.trim() !== '' ? summary : 'Abstract is not available.';

    publicationDetailInfoElement.innerHTML = `
        <div class="publication-detail-image">
            <div class="publication-placeholder-image">
                <div class="publication-icon">
                    <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><title>blockquote_line</title><g id="blockquote_line" fill='none' fill-rule='evenodd'><path d='M24 0v24H0V0zM12.594 23.258l-.012.002-.071.035-.02.004-.014-.004-.071-.036c-.01-.003-.019 0-.024.006l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.016-.018m.264-.113-.014.002-.184.093-.01.01-.003.011.018.43.005.012.008.008.201.092c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.003-.011.018-.43-.003-.012-.01-.01z'/><path fill='#D8D8D8FF' d='M11.778 4.371a1 1 0 0 1-.15 1.407c-.559.452-.924.886-1.163 1.276a2 2 0 1 1-2.46 1.792c-.024-.492.02-1.15.293-1.892.326-.884.956-1.829 2.073-2.732a1 1 0 0 1 1.407.15ZM15 5a1 1 0 1 0 0 2h5a1 1 0 1 0 0-2zm0 4a1 1 0 1 0 0 2h5a1 1 0 1 0 0-2zM4 14a1 1 0 0 1 1-1h15a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1m1 3a1 1 0 1 0 0 2h15a1 1 0 1 0 0-2zM3.006 8.846a2 2 0 1 0 2.459-1.792c.239-.39.604-.824 1.164-1.276A1 1 0 1 0 5.37 4.222c-1.117.903-1.747 1.848-2.073 2.732a4.757 4.757 0 0 0-.292 1.892Z'/></g></svg>
                </div>
            </div>
        </div>
        ${metaParts.length ? `<div class="publication-detail-meta">${metaParts.join('')}</div>` : ''}
        <div class="publication-detail-abstract">
            <h5>Abstract</h5>
            <p>${abstractText}</p>
        </div>
        <div class="publication-detail-actions">
            ${actions.join('')}
        </div>
    `;

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showPublicationsList() {
    if (!publicationsListElement || !publicationDetailElement) {
        return;
    }

    publicationDetailElement.style.display = 'none';
    publicationsListElement.style.display = 'block';
    document.body.classList.remove('detail-view-open');
    scrollToPublicationCard(lastSelectedPublicationElement);
}

function initializePublicationCardClicks() {
    const cards = document.querySelectorAll('.publication-card[data-publication-id]');
    cards.forEach(card => {
        if (card.dataset.detailBound === 'true') {
            return;
        }
        card.dataset.detailBound = 'true';
        card.addEventListener('click', function(event) {
            if (event.target.closest('a')) {
                return;
            }
            const publicationId = this.getAttribute('data-publication-id');
            if (publicationId) {
                lastSelectedPublicationElement = this;
                showPublicationDetail(publicationId);
            }
        });
    });
}

// Generate sidebar menu with year counts
function generateSidebarMenu(publicationsByYear) {
    const menus = Array.from(document.querySelectorAll('.sidebar-menu, .quick-scroll-menu'));
    if (menus.length === 0) return;

    menus.forEach(menu => {
        menu.innerHTML = '';
        if (menu.classList.contains('quick-scroll-menu')) {
            menu.classList.add('quick-scroll-menu--hidden');
        }
    });
    
    // Get years sorted in descending order
    const years = Object.keys(publicationsByYear).sort((a, b) => b - a);
    
    years.forEach((year, index) => {
        menus.forEach(menu => {
            const li = document.createElement('li');
            const a = document.createElement('a');

            if (menu.classList.contains('quick-scroll-menu')) {
                li.classList.add('quick-scroll-item');
                a.classList.add('quick-scroll-link');
                menu.classList.remove('quick-scroll-menu--hidden');
            }

            a.href = `#${year}`;
            a.textContent = year;
            if (index === 0) {
                a.classList.add('active');
            }

            li.appendChild(a);
            menu.appendChild(li);
        });
    });

    menus.forEach(menu => {
        if (menu.classList.contains('quick-scroll-menu') && menu.children.length === 0) {
            menu.classList.add('quick-scroll-menu--hidden');
        }
    });
}

// Generate publication cards
function generatePublicationCards(publicationsByYear) {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;
    
    mainContent.innerHTML = '';
    publicationDetailsMap.clear();
    
    // Get years sorted in descending order
    const years = Object.keys(publicationsByYear).sort((a, b) => b - a);
    
    years.forEach(year => {
        const yearSection = document.createElement('div');
        yearSection.className = 'publication-year';
        yearSection.id = year;
        
        const h5 = document.createElement('h5');
        h5.className = 'publication-year-title';
        h5.textContent = year;
        yearSection.appendChild(h5);
        
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'publication-cards';
        
        publicationsByYear[year].forEach((pub, index) => {
            const publicationId = `${year}-${index}`;
            publicationDetailsMap.set(publicationId, { ...pub, year });
            const card = createPublicationCard(pub, publicationId);
            cardsContainer.appendChild(card);
        });
        
        yearSection.appendChild(cardsContainer);
        mainContent.appendChild(yearSection);
    });

    initializePublicationCardClicks();
}

// Create a publication card
function createPublicationCard(pub, publicationId) {
    const card = document.createElement('div');
    card.className = 'publication-card';
    if (publicationId) {
        card.setAttribute('data-publication-id', publicationId);
    }
    
    const imageDiv = document.createElement('div');
    imageDiv.className = 'publication-image';
    // const img = document.createElement('img');
    // img.src = '../../shared/assets/images/members/no_profile.jpg';
    // img.alt = pub.Title || 'Publication';
    // imageDiv.appendChild(img);
    const svgIcon = document.createElement('div');
    svgIcon.className = 'publication-icon';
    svgIcon.innerHTML = '<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'><title>blockquote_line</title><g id="blockquote_line" fill=\'none\' fill-rule=\'evenodd\'><path d=\'M24 0v24H0V0zM12.594 23.258l-.012.002-.071.035-.02.004-.014-.004-.071-.036c-.01-.003-.019 0-.024.006l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.016-.018m.264-.113-.014.002-.184.093-.01.01-.003.011.018.43.005.012.008.008.201.092c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.003-.011.018-.43-.003-.012-.01-.01z\'/><path fill=\'#D8D8D8FF\' d=\'M11.778 4.371a1 1 0 0 1-.15 1.407c-.559.452-.924.886-1.163 1.276a2 2 0 1 1-2.46 1.792c-.024-.492.02-1.15.293-1.892.326-.884.956-1.829 2.073-2.732a1 1 0 0 1 1.407.15ZM15 5a1 1 0 1 0 0 2h5a1 1 0 1 0 0-2zm0 4a1 1 0 1 0 0 2h5a1 1 0 1 0 0-2zM4 14a1 1 0 0 1 1-1h15a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1m1 3a1 1 0 1 0 0 2h15a1 1 0 1 0 0-2zM3.006 8.846a2 2 0 1 0 2.459-1.792c.239-.39.604-.824 1.164-1.276A1 1 0 1 0 5.37 4.222c-1.117.903-1.747 1.848-2.073 2.732a4.757 4.757 0 0 0-.292 1.892Z\'/></g></svg>';
    imageDiv.appendChild(svgIcon);
    card.appendChild(imageDiv);
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'publication-content';
    
    const titleHeading = document.createElement('h5');
    titleHeading.className = 'publication-title';
    titleHeading.textContent = pub.Title || '';
    contentDiv.appendChild(titleHeading);
    
    // Add Authors if available
    if (pub.Authors || pub.authors) {
        const authorsDiv = document.createElement('div');
        authorsDiv.className = 'publication-authors';
        authorsDiv.textContent = pub.Authors || pub.authors || '';
        contentDiv.appendChild(authorsDiv);
    }
    
    // Add Date if available
    if (pub.Date || pub.Date2) {
        const dateDiv = document.createElement('div');
        dateDiv.className = 'publication-date';
        dateDiv.textContent = pub.Date || pub.Date2 || '';
        contentDiv.appendChild(dateDiv);
    }
    
    // Add ETC as venue if available
    if (pub.ETC) {
        const venueDiv = document.createElement('div');
        venueDiv.className = 'publication-venue';
        venueDiv.textContent = pub.ETC;
        contentDiv.appendChild(venueDiv);
    }
    
    card.appendChild(contentDiv);
    
    return card;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    publicationsListElement = document.getElementById('publications-content');
    publicationDetailElement = document.getElementById('publication-detail');
    publicationDetailHeaderElement = document.getElementById('publication-detail-header');
    publicationDetailInfoElement = document.getElementById('publication-detail-info');

    if (publicationDetailElement) {
        publicationDetailElement.style.display = 'none';
    }
    if (publicationDetailInfoElement) {
        publicationDetailInfoElement.innerHTML = '';
    }

    loadPublications().then(() => {
        // Re-initialize scroll-based sidebar activation after publications are loaded
        initializeScrollSidebar();
    });
});

// Function to initialize scroll-based sidebar activation
function initializeScrollSidebar() {
    const menus = Array.from(document.querySelectorAll('.sidebar-menu, .quick-scroll-menu'));
    if (menus.length === 0) return;

    // Get all sections that can be observed
    const sections = document.querySelectorAll('.publication-year');
    if (sections.length === 0) return;

    // Get all menu links across sidebar and quick scroll menus
    const menuLinks = menus.reduce((acc, menu) => {
        return acc.concat(Array.from(menu.querySelectorAll('a')));
    }, []);

    // Function to update active menu item
    function updateActiveMenu(activeId) {
        menuLinks.forEach(link => {
            const href = link.getAttribute('href');
            const targetId = href.replace('#', '');
            if (targetId === activeId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Function to determine which section should be active based on scroll position
    function getActiveSection() {
        const navHeight = 64; // --nav-height value
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const viewportTop = scrollTop + navHeight + 100; // Offset for better detection

        let activeSection = null;
        let minDistance = Infinity;

        sections.forEach(section => {
            if (!section.id) return;
            const rect = section.getBoundingClientRect();
            const sectionTop = rect.top + scrollTop;
            const sectionBottom = sectionTop + rect.height;

            // Check if section is visible and calculate distance from viewport top
            if (sectionTop <= viewportTop && sectionBottom >= viewportTop) {
                const distance = Math.abs(sectionTop - viewportTop);
                if (distance < minDistance) {
                    minDistance = distance;
                    activeSection = section;
                }
            } else if (sectionTop > viewportTop && sectionTop - viewportTop < minDistance) {
                // If we haven't scrolled past any section yet, use the first one
                minDistance = sectionTop - viewportTop;
                activeSection = section;
            }
        });

        // If no section is found, use the first section
        if (!activeSection && sections.length > 0 && sections[0].id) {
            activeSection = sections[0];
        }

        return activeSection;
    }

    // Update active menu based on scroll position
    function updateActiveMenuOnScroll() {
        const activeSection = getActiveSection();
        if (activeSection && activeSection.id) {
            updateActiveMenu(activeSection.id);
        }
    }

    // Handle initial page load
    updateActiveMenuOnScroll();

    // Handle scroll events with throttling
    let scrollTimeout;
    let isScrolling = false;
    
    window.addEventListener('scroll', () => {
        if (!isScrolling) {
            updateActiveMenuOnScroll();
            isScrolling = true;
        }
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            isScrolling = false;
            updateActiveMenuOnScroll();
        }, 50);
    }, { passive: true });

    // Keep existing click functionality - smooth scroll to section
    menuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    const navHeight = 64; // --nav-height value
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    
                    // Check if tablet or mobile
                    const isTablet = window.innerWidth >= 768 && window.innerWidth <= 1023;
                    const isMobile = window.innerWidth <= 767;
                    // On tablet and mobile, add extra offset equal to nav height to show the year subtitle
                    const additionalOffset = (isTablet || isMobile) ? navHeight : 0;
                    const offsetPosition = elementPosition + window.pageYOffset - navHeight - additionalOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
}

