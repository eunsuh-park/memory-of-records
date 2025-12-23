/**
 * public/cover 폴더의 이미지 파일을 기반으로 노트 목록을 생성하는 유틸리티
 */

/**
 * 각 period별로 가능한 모든 노트 이미지 경로를 생성하여 노트 객체 배열을 반환
 * @param {string} period - 시기 (elementary, middle-high, university, after-graduation)
 * @returns {Array} 노트 객체 배열
 */
export function getNotesFromCoverImages(period) {
  const periodFolderMap = {
    'elementary': '2005-2010',
    'middle-high': '2010-2016',
    'university': '2017-2022',
    'after-graduation': '2023-'
  };

  const folder = periodFolderMap[period];
  if (!folder) return [];

  const notes = [];

  if (period === 'elementary') {
    // 2005-2010: note-cover_YY_N.png 형식
    // 실제 파일 목록을 기반으로 노트 생성
    const yearNoteCounts = {
      5: 3,  // 2005년: 3개
      6: 6,  // 2006년: 6개
      7: 2,  // 2007년: 2개
      8: 3,  // 2008년: 3개
      9: 2,  // 2009년: 2개
      10: 2  // 2010년: 2개
    };
    
    Object.keys(yearNoteCounts).forEach(year => {
      const yearNum = parseInt(year);
      const yearStr = String(yearNum).padStart(2, '0');
      const count = yearNoteCounts[yearNum];
      
      for (let num = 1; num <= count; num++) {
        const coverPath = `/cover/${folder}/note-cover_${yearStr}_${num}.png`;
        notes.push({
          id: `elementary-${yearStr}-${num}`,
          period: 'elementary',
          year: 2000 + yearNum,
          coverPath: coverPath,
          backCoverPath: `/cover/${folder}/note-back_${yearStr}_${num}.png`
        });
      }
    });
  } else {
    let startNoteNum;
    let endNoteNum;

    if (period === 'middle-high') {
      // 2010-2016: note_01.png ~ note_07.png
      startNoteNum = 1;
      endNoteNum = 7;
    } else if (period === 'university') {
      // 2017-2022: note_08.png ~ note_14.png
      startNoteNum = 8;
      endNoteNum = 14;
    } else if (period === 'after-graduation') {
      // 2023-: note_15.png ~ note_19.png
      startNoteNum = 15;
      endNoteNum = 19;
    }

    for (let num = startNoteNum; num <= endNoteNum; num++) {
      const noteNum = String(num).padStart(2, '0');
      notes.push({
        id: `${period}-${noteNum}`,
        period: period,
        coverPath: `/cover/${folder}/note_${noteNum}.png`,
        backCoverPath: `/cover/${folder}/note_${noteNum}_back.png`
      });
    }
  }

  return notes;
}

