/**
 * UI Lab 사이드 메뉴. 1단은 Foundation / Component, 2단은 토큰과 컴포넌트.
 */

export const LAB_NAV = [
  {
    id: 'foundation',
    label: 'Foundation',
    items: [
      { id: 'color', label: 'Color' },
      { id: 'space', label: 'Space' },
      { id: 'radius', label: 'Radius' },
      { id: 'type', label: 'Type' },
      { id: 'shadow', label: 'Shadow' },
      { id: 'icon', label: 'Icon' },
      { id: 'breakpoint', label: 'Breakpoint' }
    ]
  },
  {
    id: 'component',
    label: 'Component',
    items: [
      { id: 'button', label: 'Button' },
      { id: 'filterChip', label: 'FilterChip' },
      { id: 'dropdownChip', label: 'DropdownChip' },
      { id: 'dropdownMenu', label: 'DropdownMenu' },
      { id: 'themeSwitch', label: 'ThemeSwitch' },
      { id: 'viewerSwitch', label: 'ViewerSwitch' },
      { id: 'noteInfoPanel', label: 'NoteInfoPanel' },
      { id: 'viewerChrome', label: 'ViewerChrome' },
      { id: 'toast', label: 'Toast' },
      { id: 'filterSubMenu', label: 'FilterSubMenu' },
      { id: 'dialog', label: 'Dialog' },
      { id: 'addNote', label: 'AddNote' },
      { id: 'addBookmark', label: 'AddBookmark' },
      { id: 'addPage', label: 'AddPage' },
      { id: 'noteViewer', label: 'NoteViewer' },
      { id: 'pdfModal', label: 'PdfModal' },
      { id: 'pageHeader', label: 'PageHeader' },
      { id: 'pages', label: 'Pages' }
    ]
  }
];

export const LAB_DEFAULT = { group: 'foundation', id: 'color' };

/**
 * @param {string} hash
 * @returns {{ group: string, id: string }}
 */
export function parseLabHash(hash) {
  const raw = String(hash || '').replace(/^#/, '');
  const [group, id] = raw.split('/');
  const found = LAB_NAV.find((entry) => entry.id === group);
  const item = found?.items.find((entry) => entry.id === id);
  if (found && item) return { group: found.id, id: item.id };
  return { ...LAB_DEFAULT };
}

/**
 * @param {string} groupId
 * @returns {string}
 */
export function labGroupLabel(groupId) {
  return LAB_NAV.find((entry) => entry.id === groupId)?.label || groupId;
}
