/**
 * GET /api/noteFormMeta
 * 새 노트 폼용 Notion DB select 옵션·속성 존재 여부 반환
 */
import {
  NOTEBOOK_DB_ID,
  findSchemaProperty,
  findTitleProperty,
  notionFetch,
  selectOptionsFromProp
} from './_lib/notionDb.js';

const FALLBACK_COLORS = ['파랑', '빨강', '검정', '초록', '노랑', '보라', '회색', '갈색', '분홍', '흰색'];
const FALLBACK_SIZES = ['A4', 'A5', 'A6', 'B5', 'B6', '16절', '8절', '4절'];
const FALLBACK_PERIODS = [
  'Elementary School',
  'University',
  'Middle & High School',
  'After School'
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const database = await notionFetch(`/databases/${NOTEBOOK_DB_ID}`);
    const schema = database?.properties || {};

    const titleProp = findTitleProperty(schema);
    const typeProp = findSchemaProperty(schema, 'notebook_type', 'Notebook Type', 'type', 'Type');
    const periodNameProp = findSchemaProperty(
      schema,
      'period_name',
      'Period Name',
      'period name',
      'Period',
      '시기'
    );
    const colorProp = findSchemaProperty(schema, 'color', 'Color', '색', '색상');
    const sizeProp = findSchemaProperty(schema, 'size', 'Size', '사이즈', '노트 사이즈');
    const notesProp = findSchemaProperty(
      schema,
      'notes',
      'Notes',
      '메모',
      'description',
      'Description',
      'note',
      'Note'
    );
    const keptProp = findSchemaProperty(schema, 'is_kept', 'is kept', 'kept', '보관');
    const visibleProp = findSchemaProperty(schema, 'visible', 'Visible', '노출', '공개');

    const notebookTypes = selectOptionsFromProp(typeProp);
    const periodNames = selectOptionsFromProp(periodNameProp);
    const colors = selectOptionsFromProp(colorProp);
    const sizes =
      sizeProp?.type === 'select' ? selectOptionsFromProp(sizeProp) : FALLBACK_SIZES;

    return res.status(200).json({
      ok: true,
      titleProperty: titleProp?.key || 'Name',
      fields: {
        notebook_type: { exists: Boolean(typeProp), type: typeProp?.type || null },
        period_name: { exists: Boolean(periodNameProp), type: periodNameProp?.type || null },
        color: { exists: Boolean(colorProp), type: colorProp?.type || null },
        size: { exists: Boolean(sizeProp), type: sizeProp?.type || null },
        notes: { exists: Boolean(notesProp), type: notesProp?.type || null, key: notesProp?.key || null },
        is_kept: { exists: Boolean(keptProp), type: keptProp?.type || null },
        visible: { exists: Boolean(visibleProp), type: visibleProp?.type || null }
      },
      options: {
        notebook_type: notebookTypes,
        period_name: periodNames.length ? periodNames : FALLBACK_PERIODS,
        color: colors.length ? colors : FALLBACK_COLORS,
        size: sizes.length ? sizes : FALLBACK_SIZES
      }
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: 'Failed to load form meta',
      message: error.message,
      details: error.details
    });
  }
}
