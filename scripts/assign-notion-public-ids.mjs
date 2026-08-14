#!/usr/bin/env node
/**
 * Notion 노트북 DB의 public_id를 연도 규칙으로 채운다.
 *
 * 기본은 dry-run. 실제 반영:
 *   NOTION_API_KEY=secret_xxx node scripts/assign-notion-public-ids.mjs --apply
 *
 * Notion DB에 public_id (rich_text) 속성이 있어야 한다.
 */
import {
  NOTEBOOK_DB_ID,
  buildPublicIdPayload,
  findPublicIdProperty,
  findSchemaProperty,
  findTitleProperty,
  notionFetch,
  queryAllNotebookPages,
  readPublicIdValue
} from '../api/_lib/notionDb.js';
import { assignPublicIdsToNotes } from '../api/_lib/publicId.js';

const APPLY = process.argv.includes('--apply');

function readPlain(property) {
  if (!property) return '';
  if (property.type === 'title') return String(property.title?.[0]?.plain_text || '').trim();
  if (property.type === 'rich_text') {
    return String(property.rich_text?.[0]?.plain_text || '').trim();
  }
  if (property.type === 'select') return String(property.select?.name || '').trim();
  if (property.type === 'date') {
    const start = property.date?.start || '';
    return String(start).includes('T') ? start.split('T')[0] : String(start);
  }
  return '';
}

async function main() {
  if (!process.env.NOTION_API_KEY) {
    console.error('NOTION_API_KEY 환경 변수가 필요합니다.');
    process.exit(1);
  }

  const database = await notionFetch(`/databases/${NOTEBOOK_DB_ID}`);
  const schema = database?.properties || {};
  const titleProp = findTitleProperty(schema);
  const typeProp = findSchemaProperty(schema, 'notebook_type', 'Notebook Type', 'type', 'Type');
  const startProp = findSchemaProperty(schema, 'period_start', 'Period Start', 'period start');
  const endProp = findSchemaProperty(schema, 'period_end', 'Period End', 'period end');
  const publicIdProp = findPublicIdProperty(schema);

  if (!titleProp) {
    console.error('Notion DB에 title 속성이 없습니다.');
    process.exit(1);
  }
  if (!publicIdProp) {
    console.error(
      'Notion DB에 public_id 속성(rich_text)이 없습니다. 텍스트 속성 이름을 public_id 로 추가한 뒤 다시 실행하세요.'
    );
    process.exit(1);
  }
  if (publicIdProp.type !== 'rich_text') {
    console.error(`public_id 속성 타입이 ${publicIdProp.type}입니다. rich_text여야 합니다.`);
    process.exit(1);
  }

  const pages = await queryAllNotebookPages();
  const notes = pages.map((page) => {
    const properties = page?.properties || {};
    return {
      id: page.id,
      name: readPlain(properties[titleProp.key]),
      notebookType: typeProp ? readPlain(properties[typeProp.key]) : '',
      periodStart: startProp ? readPlain(properties[startProp.key]) : '',
      periodEnd: endProp ? readPlain(properties[endProp.key]) : '',
      currentPublicId: readPublicIdValue(properties[publicIdProp.key])
    };
  });

  const assigned = assignPublicIdsToNotes(notes);
  const rows = assigned.map((row, index) => ({
    ...row,
    currentPublicId: notes[index].currentPublicId
  }));

  const changed = rows.filter((row) => row.publicId !== row.currentPublicId);
  const unchanged = rows.length - changed.length;

  console.log(`노트북 ${rows.length}개 / 변경 ${changed.length}개 / 유지 ${unchanged}개`);
  console.log('');
  console.log(
    ['노트북명', '유형', '기간', '현재', '새 public_id'].join('\t')
  );
  for (const row of rows.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return a.publicId.localeCompare(b.publicId);
  })) {
    const period =
      row.periodStart || row.periodEnd
        ? `${row.periodStart || '?'} ~ ${row.periodEnd || '(작성중)'}`
        : '미상';
    const marker = row.publicId === row.currentPublicId ? '' : ' *';
    console.log(
      [row.name, row.notebookType, period, row.currentPublicId || '-', row.publicId + marker].join(
        '\t'
      )
    );
  }

  if (!APPLY) {
    console.log('\n위 내용이 맞으면 --apply 를 붙여 다시 실행하세요.');
    return;
  }

  let updated = 0;
  for (const row of changed) {
    const payload = buildPublicIdPayload(publicIdProp, row.publicId);
    if (!payload || !row.id) continue;
    await notionFetch(`/pages/${row.id}`, {
      method: 'PATCH',
      body: { properties: { [publicIdProp.key]: payload } }
    });
    updated += 1;
    console.log(`updated ${row.name} → ${row.publicId}`);
  }
  console.log(`\nNotion public_id ${updated}개 갱신 완료`);
}

main().catch((error) => {
  console.error('실행 실패:', error.message);
  if (error.details) console.error(error.details);
  process.exit(1);
});
