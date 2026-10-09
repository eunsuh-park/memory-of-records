/**
 * UI Lab 공통 렌더 조각. 토큰 램프, 스와치, 아이콘, 데모 스테이지.
 */

import { MINGCUTE } from '../../assets/mingcuteIcons.js';

/**
 * @param {{ title: string, desc?: string, names: string[], labels: Array<string|number> }} ramp
 * @returns {string}
 */
export function renderRamp({ title, desc, names, labels }) {
  const cells = names
    .map(
      (varName, i) => `
      <div class="ui-lab__ramp-cell">
        <div class="ui-lab__ramp-chip" style="background: var(${varName})" title="${varName}"></div>
        <p class="ui-lab__ramp-step">${labels[i]}</p>
        <p class="ui-lab__ramp-value" data-token="${varName}">…</p>
      </div>`
    )
    .join('');

  return `
    <div class="ui-lab__ramp-group">
      <p class="ui-lab__ramp-title">${title}</p>
      ${desc ? `<p class="ui-lab__section-desc">${desc}</p>` : ''}
      <div class="ui-lab__ramp">${cells}</div>
    </div>`;
}

/**
 * @param {{ title: string, names: string[] }} group
 * @returns {string}
 */
export function renderSwatchGroup({ title, names }) {
  const swatches = names
    .map(
      (varName) => `
      <div class="ui-lab__swatch">
        <div class="ui-lab__swatch-chip" style="background: var(${varName})"></div>
        <p class="ui-lab__swatch-name">${varName}</p>
        <p class="ui-lab__swatch-value" data-token="${varName}">…</p>
      </div>`
    )
    .join('');

  return `
    <div class="ui-lab__ramp-group">
      <p class="ui-lab__ramp-title">${title}</p>
      <div class="ui-lab__swatches">${swatches}</div>
    </div>`;
}

/**
 * @returns {string}
 */
export function renderIconGrid() {
  return Object.entries(MINGCUTE)
    .map(
      ([name, svg]) => `
      <div class="ui-lab__icon-cell">
        <span class="ui-lab__icon-preview">${svg}</span>
        <p class="ui-lab__icon-name">${name}</p>
      </div>`
    )
    .join('');
}

/**
 * 라벨 + 데모 스테이지. flow는 fixed·absolute role을 흐름대로 눕혀 보여준다.
 * @param {string} label
 * @param {string} demoHtml
 * @param {{ flow?: boolean, stageClass?: string }} [options]
 * @returns {string}
 */
export function renderVariantRow(label, demoHtml, options = {}) {
  const { flow = true, stageClass = '' } = options;
  const classes = ['ui-lab__demo-stage'];
  if (flow) classes.push('ui-lab__demo-stage--flow');
  if (stageClass) classes.push(stageClass);
  return `
    <div class="ui-lab__variant">
      <p class="ui-lab__variant-label">${label}</p>
      <div class="${classes.join(' ')}">${demoHtml}</div>
    </div>`;
}

/**
 * @param {{ name: string, rem: string, px: string }[]} steps
 * @param {'space'|'radius'|'type'|'shadow'} kind
 * @returns {string}
 */
export function renderTokenSpecimens(steps, kind) {
  return steps
    .map((step) => {
      if (kind === 'space') {
        return `
          <div class="ui-lab__token-row">
            <div class="ui-lab__space-bar" style="width: var(${step.name})"></div>
            <p class="ui-lab__token-name">${step.name}</p>
            <p class="ui-lab__token-meta">${step.rem} · ${step.px}</p>
            <p class="ui-lab__ramp-value" data-token="${step.name}">…</p>
          </div>`;
      }
      if (kind === 'radius') {
        return `
          <div class="ui-lab__token-row">
            <div class="ui-lab__radius-box" style="border-radius: var(${step.name})"></div>
            <p class="ui-lab__token-name">${step.name}</p>
            <p class="ui-lab__token-meta">${step.px}</p>
            <p class="ui-lab__ramp-value" data-token="${step.name}">…</p>
          </div>`;
      }
      if (kind === 'shadow') {
        return `
          <div class="ui-lab__token-row">
            <div class="ui-lab__shadow-card" style="box-shadow: var(${step.name})"></div>
            <p class="ui-lab__token-name">${step.name}</p>
            <p class="ui-lab__token-meta">${step.note}</p>
          </div>`;
      }
      return `
        <div class="ui-lab__token-row ui-lab__token-row--type">
          <p class="ui-lab__type-sample" style="font-size: var(${step.name}); font-weight: var(${step.weight})">가나다 Ag</p>
          <p class="ui-lab__token-name">${step.name}</p>
          <p class="ui-lab__token-meta">${step.rem}${step.weightLabel ? ` · ${step.weightLabel}` : ''}</p>
          <p class="ui-lab__ramp-value" data-token="${step.name}">…</p>
        </div>`;
    })
    .join('');
}
