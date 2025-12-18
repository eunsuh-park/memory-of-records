/**
 * 표지 이미지 유틸리티
 * 노트의 표지 이미지 경로를 반환하는 함수들
 */

import { notesData } from '../data/notesData.js';

/**
 * 같은 period 내에서 노트의 인덱스를 반환하는 함수
 * @param {Object} note - 노트 객체
 * @returns {number} period 내 인덱스 (0부터 시작)
 */
function getNoteIndexInPeriod(note) {
  const samePeriodNotes = notesData.filter(n => n.period === note.period);
  return samePeriodNotes.findIndex(n => n.id === note.id);
}

/**
 * 같은 연도 내에서 노트의 인덱스를 반환하는 함수
 * @param {Object} note - 노트 객체
 * @returns {number} 연도 내 인덱스 (0부터 시작)
 */
function getNoteIndexInYear(note) {
  const sameYearNotes = notesData.filter(n => n.year === note.year && n.period === note.period);
  return sameYearNotes.findIndex(n => n.id === note.id);
}

/**
 * 노트의 표지 이미지 경로를 반환하는 함수
 * @param {Object} note - 노트 객체 (id, period, year 포함)
 * @returns {string|null} 표지 이미지 경로 또는 null
 */
export function getCoverImagePath(note) {
  if (!note) return null;

  const { period, year } = note;
  
  // period별 폴더 매핑
  const periodFolderMap = {
    'elementary': '2005-2010',
    'middle-high': '2010-2016',
    'university': '2017-2022',
    'after-graduation': '2023-'
  };

  const folder = periodFolderMap[period];
  if (!folder) return null;

  // 2005-2010 기간: note-cover_YY_N.png 형식
  if (period === 'elementary') {
    const yearLastTwo = String(year).slice(-2);
    const noteIndexInYear = getNoteIndexInYear(note);
    const noteNumber = noteIndexInYear + 1; // 1부터 시작
    // Vite에서 assets 폴더의 이미지는 상대 경로로 접근
    return new URL(`../assets/cover/${folder}/note-cover_${yearLastTwo}_${noteNumber}.png`, import.meta.url).href;
  }

  // 2010-2016, 2017-2022, 2023- 기간: note_XX.png 형식
  const noteIndexInPeriod = getNoteIndexInPeriod(note);
  let noteNumber;
  
  if (period === 'middle-high') {
    // 2010-2016: note_01.png ~ note_07.png
    noteNumber = String(noteIndexInPeriod + 1).padStart(2, '0');
  } else if (period === 'university') {
    // 2017-2022: note_08.png ~ note_14.png
    // period 내 첫 번째 노트가 note_08이므로 +8
    noteNumber = String(noteIndexInPeriod + 8).padStart(2, '0');
  } else if (period === 'after-graduation') {
    // 2023-: note_15.png ~ note_19.png
    // period 내 첫 번째 노트가 note_15이므로 +15
    noteNumber = String(noteIndexInPeriod + 15).padStart(2, '0');
  } else {
    return null;
  }

  return new URL(`../assets/cover/${folder}/note_${noteNumber}.png`, import.meta.url).href;
}

/**
 * 노트의 뒷표지 이미지 경로를 반환하는 함수
 * @param {Object} note - 노트 객체 (id, period, year 포함)
 * @returns {string|null} 뒷표지 이미지 경로 또는 null
 */
export function getBackCoverImagePath(note) {
  if (!note) return null;

  const { period, year } = note;
  
  const periodFolderMap = {
    'elementary': '2005-2010',
    'middle-high': '2010-2016',
    'university': '2017-2022',
    'after-graduation': '2023-'
  };

  const folder = periodFolderMap[period];
  if (!folder) return null;

  if (period === 'elementary') {
    const yearLastTwo = String(year).slice(-2);
    const noteIndexInYear = getNoteIndexInYear(note);
    const noteNumber = noteIndexInYear + 1;
    return new URL(`../assets/cover/${folder}/note-back_${yearLastTwo}_${noteNumber}.png`, import.meta.url).href;
  }

  const noteIndexInPeriod = getNoteIndexInPeriod(note);
  let noteNumber;
  
  if (period === 'middle-high') {
    noteNumber = String(noteIndexInPeriod + 1).padStart(2, '0');
  } else if (period === 'university') {
    noteNumber = String(noteIndexInPeriod + 8).padStart(2, '0');
  } else if (period === 'after-graduation') {
    noteNumber = String(noteIndexInPeriod + 15).padStart(2, '0');
  } else {
    return null;
  }

  return new URL(`../assets/cover/${folder}/note_${noteNumber}_back.png`, import.meta.url).href;
}

