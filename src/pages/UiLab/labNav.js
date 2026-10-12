/**
 * UI Lab 사이드 메뉴.
 * 1단은 Foundation / Component, 그 아래는 부모 컴포넌트와 자식이다.
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
      {
        id: 'menu',
        label: 'Menu',
        children: [
          { id: 'filterChip', label: 'FilterChip' },
          { id: 'dropdown', label: 'Dropdown' }
        ]
      },
      { id: 'switch', label: 'Switch' },
      { id: 'noteInfoPanel', label: 'NoteInfoPanel' },
      {
        id: 'viewer',
        label: 'Viewer',
        children: [
          { id: 'viewerNav', label: 'Nav' },
          { id: 'viewerSheet', label: 'Sheet' },
          { id: 'viewerActions', label: 'Actions' }
        ]
      },
      {
        id: 'add',
        label: 'Add',
        children: [
          { id: 'step', label: 'Step' },
          { id: 'field', label: 'Field' }
        ]
      },
      { id: 'dialog', label: 'Dialog' },
      { id: 'toast', label: 'Toast' },
      { id: 'pageHeader', label: 'PageHeader' }
    ]
  }
];

/** 예전 주소. 부모 페이지로 보낸다. */
const ALIASES = {
  dropdownChip: 'dropdown',
  dropdownMenu: 'dropdown',
  themeSwitch: 'switch',
  viewerSwitch: 'switch',
  filterSubMenu: 'menu',
  addNote: 'add',
  addBookmark: 'add',
  addPage: 'add',
  noteViewer: 'viewer',
  viewerChrome: 'viewer',
  pdfModal: 'viewer'
};

export const LAB_DEFAULT = { group: 'foundation', id: 'color' };

/**
 * @param {Array<{ id: string, children?: unknown[] }>} items
 * @param {string} id
 * @returns {boolean}
 */
function containsId(items, id) {
  return items.some((item) => item.id === id || (item.children && containsId(item.children, id)));
}

/**
 * @param {string} hash
 * @returns {{ group: string, id: string }}
 */
export function parseLabHash(hash) {
  const raw = String(hash || '').replace(/^#/, '');
  const parts = raw.split('/').filter(Boolean);
  const groupId = parts[0];
  const leaf = ALIASES[parts[parts.length - 1]] || parts[parts.length - 1];
  const found = LAB_NAV.find((entry) => entry.id === groupId);
  if (found && leaf && containsId(found.items, leaf)) return { group: found.id, id: leaf };
  return { ...LAB_DEFAULT };
}

/**
 * @param {string} groupId
 * @returns {string}
 */
export function labGroupLabel(groupId) {
  return LAB_NAV.find((entry) => entry.id === groupId)?.label || groupId;
}
