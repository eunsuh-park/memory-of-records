// Activity IDs in order
const activityIds = [
    'research-seminar-2024',
    'conference-presentation-2024',
    'workshop-2024',
    'research-collaboration-2023',
    'publication-release-2023',
    'lab-meeting-2023',
    'guest-lecture-2023',
    'field-research-2023',
    'data-analysis-2023',
    'research-presentation-2023',
    'team-building-2023',
    'paper-submission-2023',
    'research-discussion-2023',
    'collaboration-meeting-2023',
    'publication-award-2023',
    'annual-review-2022'
];

const galleryPlaceholderIconHtml = `
    <div class="gallery-placeholder-icon">
        <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><title>pic_2_fill</title><g id="pic_2_fill" fill='none'><path d='M24 0v24H0V0zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z'/><path fill='#D8D8D8FF' d='M20 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2H4v14h.929l9.308-9.308a1.25 1.25 0 0 1 1.768 0L20 13.686zM7.5 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3'/></g></svg>
    </div>
`;

// Activity detail data
const activityDetails = {
    'research-seminar-2024': {
        title: 'Research Seminar',
        date: '2024-03-15',
        source: 'DaLI Lab @ KAIST',
        description: 'This research seminar explored the latest findings in communication theory and information science. The seminar featured presentations on situational theory of problem solving and discussed implications for strategic communication practices.',
        url: 'https://example.com/news/research-seminar-2024'
    },
    'conference-presentation-2024': {
        title: 'Conference Presentation',
        date: '2024-02-20',
        source: 'International Communication Conference',
        description: 'Our team presented research findings on digital media effects and public opinion formation at the International Communication Conference. The presentation highlighted innovative approaches to studying information markets.',
        url: 'https://example.com/news/conference-2024'
    },
    'workshop-2024': {
        title: 'Workshop',
        date: '2024-01-10',
        source: 'Strategic Communication Workshop',
        description: 'A comprehensive workshop on strategic communication strategies and their applications in various contexts. Participants engaged in hands-on activities and case study discussions.',
        url: 'https://example.com/news/workshop-2024'
    },
    'research-collaboration-2023': {
        title: 'Research Collaboration',
        date: '2023-12-05',
        source: 'DaLI Lab @ KAIST',
        description: 'Initiated a new research collaboration focusing on cognitive biases and epistemic inertia in public decision-making processes. The collaboration brings together experts from multiple institutions.',
        url: 'https://example.com/news/collaboration-2023'
    },
    'publication-release-2023': {
        title: 'Publication Release',
        date: '2023-11-18',
        source: 'Journal of Communication',
        description: 'New publication released in the Journal of Communication exploring information processing and decision-making patterns among lay problem solvers. The research contributes to our understanding of public communication behaviors.',
        url: 'https://example.com/news/publication-2023'
    },
    'lab-meeting-2023': {
        title: 'Lab Meeting',
        date: '2023-10-30',
        source: 'DaLI Lab @ KAIST',
        description: 'Regular lab meeting discussing ongoing research projects, upcoming deadlines, and collaborative opportunities. Team members shared progress updates and future research plans.',
        url: 'https://example.com/news/lab-meeting-2023'
    },
    'guest-lecture-2023': {
        title: 'Guest Lecture',
        date: '2023-09-25',
        source: 'KAIST Communication Department',
        description: 'Invited guest lecture on communication theory and media studies. The lecture provided insights into current trends in communication research and their practical applications.',
        url: 'https://example.com/news/guest-lecture-2023'
    },
    'field-research-2023': {
        title: 'Field Research',
        date: '2023-08-15',
        source: 'Public Information Survey',
        description: 'Conducted comprehensive field research on public information seeking behaviors and information market dynamics. The study involved extensive data collection and analysis.',
        url: 'https://example.com/news/field-research-2023'
    },
    'data-analysis-2023': {
        title: 'Data Analysis',
        date: '2023-07-22',
        source: 'DaLI Lab @ KAIST',
        description: 'Completed data analysis phase of major research project examining information trafficking patterns and their effects on public decision-making processes.',
        url: 'https://example.com/news/data-analysis-2023'
    },
    'research-presentation-2023': {
        title: 'Research Presentation',
        date: '2023-06-10',
        source: 'Academic Conference',
        description: 'Presented research findings at major academic conference focusing on communication theory and strategic communication practices. The presentation received positive feedback from the academic community.',
        url: 'https://example.com/news/presentation-2023'
    },
    'team-building-2023': {
        title: 'Team Building',
        date: '2023-05-28',
        source: 'DaLI Lab @ KAIST',
        description: 'Team building event fostering collaboration and strengthening relationships among lab members. Activities included research discussions and social interactions.',
        url: 'https://example.com/news/team-building-2023'
    },
    'paper-submission-2023': {
        title: 'Paper Submission',
        date: '2023-04-12',
        source: 'Journal Submission',
        description: 'Submitted research paper for peer review examining cognitive biases and information market failures. The paper represents significant contribution to the field.',
        url: 'https://example.com/news/paper-submission-2023'
    },
    'research-discussion-2023': {
        title: 'Research Discussion',
        date: '2023-03-20',
        source: 'DaLI Lab @ KAIST',
        description: 'Research discussion session reviewing current literature and exploring new research directions. Team members engaged in critical analysis and idea exchange.',
        url: 'https://example.com/news/discussion-2023'
    },
    'collaboration-meeting-2023': {
        title: 'Collaboration Meeting',
        date: '2023-02-08',
        source: 'Inter-University Research',
        description: 'Collaboration meeting with researchers from other institutions to discuss joint research initiatives and potential collaborative projects in communication studies.',
        url: 'https://example.com/news/collaboration-meeting-2023'
    },
    'publication-award-2023': {
        title: 'Publication Award',
        date: '2023-01-15',
        source: 'Best Paper Award',
        description: 'Received Best Paper Award for outstanding contribution to communication research. The award recognizes excellence in theoretical development and empirical rigor.',
        url: 'https://example.com/news/award-2023'
    },
    'annual-review-2022': {
        title: 'Annual Review',
        date: '2022-12-30',
        source: 'DaLI Lab @ KAIST',
        description: 'Annual review of research accomplishments, publications, and future research directions. The review highlighted significant progress and achievements throughout the year.',
        url: 'https://example.com/news/annual-review-2022'
    }
};

// Get previous and next activity IDs
function getPreviousActivityId(currentId) {
    const currentIndex = activityIds.indexOf(currentId);
    if (currentIndex > 0) {
        return activityIds[currentIndex - 1];
    }
    return null;
}

function getNextActivityId(currentId) {
    const currentIndex = activityIds.indexOf(currentId);
    if (currentIndex < activityIds.length - 1) {
        return activityIds[currentIndex + 1];
    }
    return null;
}

// Store current activity ID
let currentActivityId = null;
let lastSelectedActivityElement = null;

function scrollToActivityElement(element) {
    if (!element) return;
    requestAnimationFrame(() => {
        const navHeight = 64;
        const extraOffset = 16;
        const rect = element.getBoundingClientRect();
        const target = rect.top + window.pageYOffset - (navHeight + extraOffset);
        window.scrollTo({ top: target > 0 ? target : 0, behavior: 'smooth' });
    });
}

/**
 * Initialize detail header using detail-header component
 * @param {string} parentElementId - 상위 요소의 ID (페이지명이 포함된 요소, 예: 'member-detail', 'activity-detail')
 * @param {Object} options - 헤더 옵션
 * @param {string} options.title - 제목 텍스트
 * @param {string} [options.date] - 날짜 (선택사항, activity 상세에서는 사용)
 * @param {string} options.backButtonId - 뒤로가기 버튼의 ID
 * @param {string} options.backButtonAriaLabel - 뒤로가기 버튼의 aria-label
 * @param {Function} options.onBackClick - 뒤로가기 버튼 클릭 핸들러
 */
function initializeDetailHeader(parentElementId, options) {
    // Find parent element by ID
    const parentElement = document.getElementById(parentElementId);
    if (!parentElement || typeof getDetailHeaderTemplate === 'undefined') {
        return;
    }
    
    // Find detail-header element inside parent
    const headerElement = parentElement.querySelector('#detail-header');
    if (!headerElement) {
        return;
    }
    
    const {
        title,
        date,
        backButtonId,
        backButtonAriaLabel,
        onBackClick,
        titleId = ''
    } = options;
    
    // Create header using detail-header component
    const headerHtml = getDetailHeaderTemplate({
        backButtonId: backButtonId,
        backButtonAriaLabel: backButtonAriaLabel,
        title: title,
        date: date, // Activity에서는 date를 표시
        titleId: titleId
    });
    
    headerElement.innerHTML = headerHtml;
    
    // Add click handler for back button
    const backButton = document.getElementById(backButtonId);
    if (backButton && onBackClick) {
        backButton.addEventListener('click', onBackClick);
    }
}

// Show activity detail
function showActivityDetail(activityId) {
    const activityList = document.getElementById('activity-content');
    const activityDetail = document.getElementById('activity-detail');
    const activityInfo = activityDetails[activityId];
    
    if (!activityInfo) {
        console.warn(`Activity detail not found for: ${activityId}`);
        return;
    }
    
    currentActivityId = activityId;
    
    // Hide activity list
    activityList.style.display = 'none';
    
    // Show detail view
    activityDetail.style.display = 'block';
    
    // Add class to body to hide sidebar on tablet/mobile
    document.body.classList.add('detail-view-open');
    
    // Get previous and next IDs
    const prevId = getPreviousActivityId(activityId);
    const nextId = getNextActivityId(activityId);
    
    // Get data from gallery item
    const galleryItem = document.querySelector(`.gallery-item[data-activity-id="${activityId}"]`);
    
    // Get image
    const galleryImage = galleryItem ? galleryItem.querySelector('.gallery-item-image img') : null;
    const imageSrc = galleryImage ? galleryImage.getAttribute('src') : null;
    const imageAlt = galleryImage ? galleryImage.getAttribute('alt') : activityInfo.title;
    
    // Get title, date, and source from gallery item
    const galleryTitle = galleryItem ? galleryItem.querySelector('.gallery-item-title') : null;
    const galleryDate = galleryItem ? galleryItem.querySelector('.gallery-item-date') : null;
    const gallerySource = galleryItem ? galleryItem.querySelector('.gallery-item-source') : null;
    
    const title = galleryTitle ? galleryTitle.textContent.trim() : activityInfo.title;
    const date = galleryDate ? galleryDate.textContent.trim() : activityInfo.date;
    const source = gallerySource ? gallerySource.textContent.trim() : activityInfo.source;

    // Update detail header with gallery item data
    initializeDetailHeader('activity-detail', {
        title: title,
        date: date,
        backButtonId: 'back-to-activities',
        backButtonAriaLabel: 'Back to activities list',
        onBackClick: showActivitiesList,
        titleId: 'activity-detail-name'
    });

    // Build detail content
    const detailContent = document.getElementById('activity-detail-info');
    const prevButtonHtml = prevId ? `
            <button class="activity-nav-btn activity-prev-btn" data-activity-id="${prevId}" aria-label="Previous activity">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        ` : '<div class="activity-nav-btn-placeholder"></div>';

    const nextButtonHtml = nextId ? `
            <button class="activity-nav-btn activity-next-btn" data-activity-id="${nextId}" aria-label="Next activity">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        ` : '<div class="activity-nav-btn-placeholder"></div>';

    // Image HTML - use gallery item image if available, otherwise use placeholder
    const imageHtml = imageSrc ? `
        <img src="${imageSrc}" alt="${imageAlt}">
    ` : `
        <div class="activity-placeholder-image">${galleryPlaceholderIconHtml}</div>
    `;

    const metaHtml = source ? `
        <div class="activity-detail-meta">
            <div class="activity-detail-source">${source}</div>
        </div>
    ` : '';

    const actionsHtml = (activityInfo.url && typeof getActionButtonTemplate === 'function') ? `
        <div class="activity-detail-actions">
            ${getActionButtonTemplate({
                type: 'primary',
                href: activityInfo.url,
                text: 'View Original News',
                iconSvg: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                target: '_blank',
                rel: 'noopener noreferrer',
                ariaLabel: 'View original news'
            })}
        </div>
    ` : '';

    detailContent.innerHTML = `
        <div class="activity-image-container">
            ${prevButtonHtml}
            <div class="activity-detail-image">
                ${imageHtml}
            </div>
            ${nextButtonHtml}
        </div>
        ${metaHtml}
        <div class="activity-detail-description">
            <p>${activityInfo.description || ''}</p>
        </div>
        ${actionsHtml}
    `
        .replace(/\n\s+\n/g, '\n');

    const prevBtn = detailContent.querySelector('.activity-prev-btn');
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-activity-id');
            if (targetId) {
                const targetCard = document.querySelector(`.gallery-item[data-activity-id="${targetId}"]`);
                if (targetCard) {
                    lastSelectedActivityElement = targetCard;
                }
                showActivityDetail(targetId);
            }
        });
    }

    const nextBtn = detailContent.querySelector('.activity-next-btn');
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-activity-id');
            if (targetId) {
                const targetCard = document.querySelector(`.gallery-item[data-activity-id="${targetId}"]`);
                if (targetCard) {
                    lastSelectedActivityElement = targetCard;
                }
                showActivityDetail(targetId);
            }
        });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}
 
 // Back to activities list
 function showActivitiesList() {
     const activityList = document.getElementById('activity-content');
     const activityDetail = document.getElementById('activity-detail');
 
     activityList.style.display = 'block';
     activityDetail.style.display = 'none';
 
     // Remove class from body to show sidebar on tablet/mobile
     document.body.classList.remove('detail-view-open');
 
     // Scroll to top
     scrollToActivityElement(lastSelectedActivityElement);
 }
 
 // Initialize activity item click handlers
 document.addEventListener('DOMContentLoaded', function() {
     const galleryPlaceholders = document.querySelectorAll('.gallery-item-placeholder');
     galleryPlaceholders.forEach(placeholder => {
         placeholder.innerHTML = galleryPlaceholderIconHtml;
     });

     // Add click handlers to all gallery items
     const galleryItems = document.querySelectorAll('.gallery-item[data-activity-id]');
     galleryItems.forEach(item => {
         item.addEventListener('click', function(e) {
             const activityId = this.getAttribute('data-activity-id');
             if (activityId && activityDetails[activityId]) {
                 lastSelectedActivityElement = this;
                 showActivityDetail(activityId);
             }
         });
     });
 });