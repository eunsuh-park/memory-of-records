/**
 * UI Lab 문서 블록 — Figma 매핑 표와, 표에 안 들어가는 메모.
 */

/**
 * @param {string} title
 * @param {string[]} columns
 * @param {string[][]} rows
 * @returns {string}
 */
export function renderTable(title, columns, rows) {
  const head = columns.map((cell) => `<th scope="col">${cell}</th>`).join('');
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
    .join('');

  return `
    <div class="ui-lab__table-block">
      <h3 class="ui-lab__table-title">${title}</h3>
      <div class="ui-lab__table-wrap">
        <table class="ui-lab__table">
          <thead><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </div>`;
}

/**
 * @param {{ title: string, columns: string[], rows: string[][] }[]} tables
 * @returns {string}
 */
export function renderMapping(tables) {
  if (!tables?.length) return '';
  return `
    <section class="ui-lab__docs">
      <h2 class="ui-lab__docs-title">Figma 매핑</h2>
      <p class="ui-lab__section-desc">
        컴포넌트 값의 기준은 <code>src/styles/colors.css</code> · <code>src/styles/sizes.css</code>의 Foundation 토큰입니다.
        토큰과 숫자가 어긋나면 비고에 코드의 실제 값을 적었습니다.
      </p>
      ${tables.map((table) => renderTable(table.title, table.columns, table.rows)).join('')}
    </section>`;
}

/**
 * @param {string[]} items
 * @returns {string}
 */
export function renderMemo(items) {
  if (!items?.length) return '';
  return `
    <section class="ui-lab__memo">
      <h2 class="ui-lab__docs-title">메모</h2>
      <ul class="ui-lab__list">
        ${items.map((item) => `<li>${item}</li>`).join('')}
      </ul>
    </section>`;
}

/**
 * @param {{
 *   id?: string,
 *   group: string,
 *   title: string,
 *   lede?: string,
 *   files?: string,
 *   demo?: string,
 *   tables?: { title: string, columns: string[], rows: string[][] }[],
 *   notes?: string[]
 * }} page
 * @returns {string}
 */
export function renderLabPage({ id = '', group, title, lede = '', files = '', demo = '', tables = [], notes = [] }) {
  return `
    <article class="ui-lab__page"${id ? ` id="${id}"` : ''}>
      <header class="ui-lab__hero">
        <p class="ui-lab__eyebrow">${group}</p>
        <h1 class="ui-lab__title">${title}</h1>
        ${lede ? `<p class="ui-lab__lede">${lede}</p>` : ''}
        ${files ? `<p class="ui-lab__files">참조: ${files}</p>` : ''}
      </header>
      ${demo ? `<div class="ui-lab__demos">${demo}</div>` : ''}
      ${renderMapping(tables)}
      ${renderMemo(notes)}
    </article>`;
}
