/**
 * BookFlip3D — Memory of Records 이식용 3D 책장 엔진
 *
 * 데이터 계약 (MoR / Cloudinary와 동일 네이밍):
 * {
 *   cover_front: string,  // notebooks/{id}/cover_front
 *   cover_back: string,   // notebooks/{id}/cover_back
 *   pages: Array<{ pageNumber: number, url: string }>
 *     // notebooks/{id}/pages/page-000001 …
 * }
 *
 * 잎(leaf) 모델:
 * - 페이지 1 잎: FrontSide = pages[0], BackSide = cover_front
 * - 마지막 페이지 잎: FrontSide = pages[n-1], BackSide = cover_back
 * - 그 외 잎: FrontSide = page k, BackSide = page k±1 (넘김 방향에 맞게)
 *
 * 상태:
 * - bookState 'open'   → 스프레드 (왼·오른 페이지)
 * - bookState 'closed' → cover_front | cover_back (중앙 정렬)
 */

function applyTextureColorSpace(THREE, texture) {
  if (THREE.SRGBColorSpace) {
    texture.colorSpace = THREE.SRGBColorSpace;
  } else if (THREE.sRGBEncoding != null) {
    texture.encoding = THREE.sRGBEncoding;
  }
}

export function createBookFlip3D(THREE, options) {
  const {
    canvas,
    assets,
    onStateChange,
    pageWidth = 0.5,
    pageHeight = 1.4,
    backgroundColor = null,
  } = options;

  if (!canvas) throw new Error('canvas is required');
  if (!assets?.cover_front || !assets?.cover_back) {
    throw new Error('assets.cover_front / assets.cover_back are required');
  }

  const pages = normalizePages(assets.pages);
  if (pages.length < 1) throw new Error('assets.pages must have at least 1 page');

  const UNDERLAY_Z = -0.015;
  const FLIP_SPEED = 0.045;
  const FLIP_DURATION = 1;
  const FLIP_RATIO = 0.62;
  const LAST_PAGE_INDEX = pages.length - 1;
  const LAST_LEFT_INDEX = LAST_PAGE_INDEX % 2 === 0
    ? Math.max(0, LAST_PAGE_INDEX - 1)
    : LAST_PAGE_INDEX - 1;

  const scene = new THREE.Scene();
  scene.background = backgroundColor != null ? new THREE.Color(backgroundColor) : null;

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  camera.position.set(0, 0, 3);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.75);
  keyLight.position.set(4, 5, 8);
  scene.add(keyLight);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const textureLoader = new THREE.TextureLoader();
  textureLoader.setCrossOrigin('anonymous');
  const pageRoot = new THREE.Group();
  scene.add(pageRoot);

  /** @type {Map<string, THREE.Texture>} */
  const textureMap = new Map();

  let bookState = 'open'; // 'open' | 'closed'
  let closedFace = null; // 'front' | 'back'
  let currentLeftIndex = 0;
  let isAnimating = false;
  let animProgress = 0;
  let animKind = null;

  let leftLeaf = null;
  let rightLeaf = null;
  let underLeft = null;
  let underRight = null;
  let coverLeaf = null;
  let rafId = 0;
  let disposed = false;

  function normalizePages(list) {
    return (Array.isArray(list) ? list : [])
      .map((page, i) => ({
        pageNumber: Math.floor(Number(page?.pageNumber) || i + 1),
        url: String(page?.url || '').trim(),
      }))
      .filter((page) => page.url)
      .sort((a, b) => a.pageNumber - b.pageNumber);
  }

  function snapshotState() {
    return {
      bookState,
      closedFace,
      currentLeftIndex,
      leftPageNumber: pages[currentLeftIndex]?.pageNumber ?? null,
      rightPageNumber: pages[currentLeftIndex + 1]?.pageNumber ?? null,
      pageCount: pages.length,
      isAnimating,
      canGoPrev: canGoPrev(),
      canGoNext: canGoNext(),
    };
  }

  function emitState() {
    onStateChange?.(snapshotState());
  }

  function closedCenterX(face) {
    return face === 'front' ? -pageWidth / 2 : pageWidth / 2;
  }

  function disposeObject(object) {
    if (!object) return;
    object.traverse((child) => {
      if (!child.isMesh) return;
      child.geometry?.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        // 공유 텍스처는 textureMap에서 일괄 dispose
        material?.dispose();
      });
    });
  }

  function clearPages() {
    [leftLeaf, rightLeaf, underLeft, underRight, coverLeaf].forEach((page) => {
      if (!page) return;
      pageRoot.remove(page);
      disposeObject(page);
    });
    leftLeaf = rightLeaf = underLeft = underRight = coverLeaf = null;
  }

  function loadTexture(url) {
    const key = String(url || '').trim();
    if (!key) return Promise.reject(new Error('empty texture url'));
    if (textureMap.has(key)) return Promise.resolve(textureMap.get(key));

    return new Promise((resolve, reject) => {
      textureLoader.load(
        key,
        (texture) => {
          applyTextureColorSpace(THREE, texture);
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          textureMap.set(key, texture);
          resolve(texture);
        },
        undefined,
        (err) => reject(err || new Error(`failed to load ${key}`))
      );
    });
  }

  function cloneTexture(texture, mirrorX) {
    const map = texture.clone();
    map.needsUpdate = true;
    if (mirrorX) {
      map.wrapS = THREE.RepeatWrapping;
      map.repeat.x = -1;
      map.offset.x = 1;
    }
    return map;
  }

  function makeFaceMaterial(faceKey, side) {
    const url = resolveFaceUrl(faceKey);
    const base = textureMap.get(url);
    if (!base) {
      return new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        side,
        transparent: true,
        opacity: 1,
        roughness: 0.85,
        metalness: 0,
      });
    }

    return new THREE.MeshStandardMaterial({
      map: cloneTexture(base, side === THREE.BackSide),
      side,
      transparent: true,
      opacity: 1,
      roughness: 0.85,
      metalness: 0,
    });
  }

  /**
   * faceKey:
   * - number → pages[index]
   * - 'front' → cover_front
   * - 'back' → cover_back
   */
  function resolveFaceUrl(faceKey) {
    if (faceKey === 'front') return assets.cover_front;
    if (faceKey === 'back') return assets.cover_back;
    const page = pages[faceKey];
    return page?.url || '';
  }

  function hingeGeometry(isRight) {
    const geometry = new THREE.PlaneGeometry(pageWidth, pageHeight);
    geometry.translate(isRight ? pageWidth / 2 : -pageWidth / 2, 0, 0);
    return geometry;
  }

  function setGroupOpacity(group, opacity) {
    if (!group) return;
    group.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.transparent = true;
        child.material.opacity = opacity;
      }
    });
  }

  function createLeaf(frontFace, backFace, isRight) {
    const group = new THREE.Group();
    group.userData = { role: isRight ? 'right' : 'left', frontFace, backFace };

    const frontMesh = new THREE.Mesh(
      hingeGeometry(isRight),
      makeFaceMaterial(frontFace, THREE.FrontSide)
    );
    frontMesh.userData.pageRole = isRight ? 'right' : 'left';

    const backMesh = new THREE.Mesh(
      hingeGeometry(isRight),
      makeFaceMaterial(backFace, THREE.BackSide)
    );
    backMesh.userData.pageRole = isRight ? 'right' : 'left';

    frontMesh.position.z = 0.001;
    backMesh.position.z = -0.001;
    group.add(frontMesh);
    group.add(backMesh);
    return group;
  }

  function createUnderlay(pageIndex, isRight) {
    if (pageIndex < 0 || pageIndex > LAST_PAGE_INDEX) return null;
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(
      hingeGeometry(isRight),
      makeFaceMaterial(pageIndex, THREE.FrontSide)
    );
    mesh.userData.pageRole = 'underlay';
    group.add(mesh);
    group.position.z = UNDERLAY_Z;
    return group;
  }

  function createClosedCover(face) {
    const leaf = face === 'front'
      ? createLeaf(0, 'front', false)
      : createLeaf(LAST_PAGE_INDEX, 'back', true);

    leaf.rotation.y = face === 'front' ? Math.PI : -Math.PI;
    leaf.userData.role = 'cover';
    leaf.userData.closedFace = face;
    leaf.children.forEach((child) => {
      child.userData.pageRole = 'cover';
    });
    return leaf;
  }

  function backFaceForLeft(leftIndex) {
    if (leftIndex === 0) return 'front';
    // 홀수 장: 마지막 페이지가 왼쪽에만 있을 때 뒷면 = cover_back
    if (leftIndex === LAST_PAGE_INDEX) return 'back';
    return leftIndex - 1;
  }

  function backFaceForRight(rightIndex) {
    return rightIndex === LAST_PAGE_INDEX ? 'back' : rightIndex + 1;
  }

  function lastPageIsOnLeft() {
    return LAST_PAGE_INDEX % 2 === 0;
  }

  function isFirstSpread() {
    return bookState === 'open' && currentLeftIndex === 0;
  }

  function isLastSpread() {
    return bookState === 'open' && currentLeftIndex >= LAST_LEFT_INDEX;
  }

  function canGoNext() {
    return !isAnimating && !(bookState === 'closed' && closedFace === 'back');
  }

  function canGoPrev() {
    return !isAnimating && !(bookState === 'closed' && closedFace === 'front');
  }

  function buildOpenSpread() {
    clearPages();
    bookState = 'open';
    closedFace = null;

    const leftIndex = currentLeftIndex;
    const rightIndex = leftIndex + 1;

    underLeft = createUnderlay(leftIndex - 2, false);
    if (underLeft) pageRoot.add(underLeft);

    underRight = createUnderlay(rightIndex + 2, true);
    if (underRight) pageRoot.add(underRight);

    leftLeaf = createLeaf(leftIndex, backFaceForLeft(leftIndex), false);
    pageRoot.add(leftLeaf);

    if (rightIndex <= LAST_PAGE_INDEX) {
      rightLeaf = createLeaf(rightIndex, backFaceForRight(rightIndex), true);
      pageRoot.add(rightLeaf);
    }

    emitState();
  }

  function buildClosedCover(face) {
    clearPages();
    bookState = 'closed';
    closedFace = face;
    coverLeaf = createClosedCover(face);
    coverLeaf.position.x = closedCenterX(face);
    pageRoot.add(coverLeaf);
    emitState();
  }

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function beginAnim(kind) {
    isAnimating = true;
    animProgress = 0;
    animKind = kind;
    emitState();
  }

  function startCloseToFront() {
    beginAnim('closeFront');
  }

  function startCloseToBack() {
    // 마지막 페이지가 왼쪽만 있으면 왼쪽 잎을 넘겨 cover_back 노출
    beginAnim(lastPageIsOnLeft() ? 'closeBackFromLeft' : 'closeBack');
  }

  function startOpenFromFront() {
    currentLeftIndex = 0;
    clearPages();
    bookState = 'open';
    closedFace = null;

    underRight = createUnderlay(3, true);
    if (underRight) pageRoot.add(underRight);

    if (1 <= LAST_PAGE_INDEX) {
      rightLeaf = createLeaf(1, backFaceForRight(1), true);
      pageRoot.add(rightLeaf);
    }

    leftLeaf = createLeaf(0, 'front', false);
    leftLeaf.rotation.y = Math.PI;
    leftLeaf.position.x = closedCenterX('front');
    pageRoot.add(leftLeaf);

    beginAnim('openFront');
  }

  function startOpenFromBack() {
    currentLeftIndex = Math.max(0, LAST_LEFT_INDEX);
    clearPages();
    bookState = 'open';
    closedFace = null;

    underLeft = createUnderlay(currentLeftIndex - 2, false);
    if (underLeft) pageRoot.add(underLeft);

    if (lastPageIsOnLeft()) {
      // 홀수 장: 닫힌 cover_back → 왼쪽 마지막 페이지로 펼침
      leftLeaf = createLeaf(LAST_PAGE_INDEX, 'back', false);
      leftLeaf.rotation.y = Math.PI;
      leftLeaf.position.x = closedCenterX('front');
      pageRoot.add(leftLeaf);
      beginAnim('openBackFromLeft');
      return;
    }

    leftLeaf = createLeaf(currentLeftIndex, backFaceForLeft(currentLeftIndex), false);
    pageRoot.add(leftLeaf);

    rightLeaf = createLeaf(LAST_PAGE_INDEX, 'back', true);
    rightLeaf.rotation.y = -Math.PI;
    rightLeaf.position.x = closedCenterX('back');
    pageRoot.add(rightLeaf);

    beginAnim('openBack');
  }

  function startPageFlip(direction) {
    beginAnim(direction === 1 ? 'pageNext' : 'pagePrev');
  }

  function startNav(direction) {
    if (isAnimating) return;

    if (direction === 1) {
      if (bookState === 'closed' && closedFace === 'front') return startOpenFromFront();
      if (bookState === 'open') {
        if (isLastSpread()) return startCloseToBack();
        return startPageFlip(1);
      }
    }

    if (direction === -1) {
      if (bookState === 'closed' && closedFace === 'back') return startOpenFromBack();
      if (bookState === 'open') {
        if (isFirstSpread()) return startCloseToFront();
        return startPageFlip(-1);
      }
    }
  }

  function finishAnim() {
    const kind = animKind;
    isAnimating = false;
    animProgress = 0;
    animKind = null;

    if (kind === 'pageNext') {
      currentLeftIndex += 2;
      buildOpenSpread();
      return;
    }
    if (kind === 'pagePrev') {
      currentLeftIndex -= 2;
      buildOpenSpread();
      return;
    }
    if (kind === 'closeFront') {
      buildClosedCover('front');
      return;
    }
    if (kind === 'closeBack' || kind === 'closeBackFromLeft') {
      buildClosedCover('back');
      return;
    }
    if (kind === 'openFront' || kind === 'openBack' || kind === 'openBackFromLeft') {
      bookState = 'open';
      closedFace = null;
      if (leftLeaf) {
        leftLeaf.rotation.y = 0;
        leftLeaf.position.set(0, 0, 0);
      }
      if (rightLeaf) {
        rightLeaf.rotation.y = 0;
        rightLeaf.position.set(0, 0, 0);
      }
      setGroupOpacity(leftLeaf, 1);
      setGroupOpacity(rightLeaf, 1);
      emitState();
    }
  }

  function updateAnim() {
    animProgress = Math.min(FLIP_DURATION, animProgress + FLIP_SPEED);
    const raw = animProgress / FLIP_DURATION;
    const t = easeInOutQuad(raw);

    if (animKind === 'pageNext' && rightLeaf) {
      rightLeaf.rotation.y = -t * Math.PI;
      rightLeaf.position.z = 0.02;
    } else if (animKind === 'pagePrev' && leftLeaf) {
      leftLeaf.rotation.y = t * Math.PI;
      leftLeaf.position.z = 0.02;
    } else if (animKind === 'closeFront' && leftLeaf) {
      if (raw < FLIP_RATIO) {
        const tf = easeInOutQuad(raw / FLIP_RATIO);
        leftLeaf.rotation.y = tf * Math.PI;
        leftLeaf.position.x = 0;
        leftLeaf.position.z = 0.02;
        if (rightLeaf) setGroupOpacity(rightLeaf, 1 - tf);
        if (underLeft) setGroupOpacity(underLeft, 1 - tf);
        if (underRight) setGroupOpacity(underRight, 1 - tf);
      } else {
        const tc = easeInOutQuad((raw - FLIP_RATIO) / (1 - FLIP_RATIO));
        leftLeaf.rotation.y = Math.PI;
        leftLeaf.position.x = lerp(0, closedCenterX('front'), tc);
        leftLeaf.position.z = 0.02;
        if (rightLeaf) setGroupOpacity(rightLeaf, 0);
        if (underLeft) setGroupOpacity(underLeft, 0);
        if (underRight) setGroupOpacity(underRight, 0);
      }
    } else if (animKind === 'closeBack' && rightLeaf) {
      if (raw < FLIP_RATIO) {
        const tf = easeInOutQuad(raw / FLIP_RATIO);
        rightLeaf.rotation.y = -tf * Math.PI;
        rightLeaf.position.x = 0;
        rightLeaf.position.z = 0.02;
        if (leftLeaf) setGroupOpacity(leftLeaf, 1 - tf);
        if (underLeft) setGroupOpacity(underLeft, 1 - tf);
        if (underRight) setGroupOpacity(underRight, 1 - tf);
      } else {
        const tc = easeInOutQuad((raw - FLIP_RATIO) / (1 - FLIP_RATIO));
        rightLeaf.rotation.y = -Math.PI;
        rightLeaf.position.x = lerp(0, closedCenterX('back'), tc);
        rightLeaf.position.z = 0.02;
        if (leftLeaf) setGroupOpacity(leftLeaf, 0);
        if (underLeft) setGroupOpacity(underLeft, 0);
        if (underRight) setGroupOpacity(underRight, 0);
      }
    } else if (animKind === 'closeBackFromLeft' && leftLeaf) {
      if (raw < FLIP_RATIO) {
        const tf = easeInOutQuad(raw / FLIP_RATIO);
        leftLeaf.rotation.y = tf * Math.PI;
        leftLeaf.position.x = 0;
        leftLeaf.position.z = 0.02;
        if (underLeft) setGroupOpacity(underLeft, 1 - tf);
        if (underRight) setGroupOpacity(underRight, 1 - tf);
      } else {
        const tc = easeInOutQuad((raw - FLIP_RATIO) / (1 - FLIP_RATIO));
        leftLeaf.rotation.y = Math.PI;
        // 왼→오른쪽으로 넘긴 뒤 중앙 정렬 (front 닫힘과 동일 오프셋)
        leftLeaf.position.x = lerp(0, closedCenterX('front'), tc);
        leftLeaf.position.z = 0.02;
        if (underLeft) setGroupOpacity(underLeft, 0);
        if (underRight) setGroupOpacity(underRight, 0);
      }
    } else if (animKind === 'openFront' && leftLeaf) {
      const uncenterRatio = 1 - FLIP_RATIO;
      if (raw < uncenterRatio) {
        const tu = easeInOutQuad(raw / uncenterRatio);
        leftLeaf.rotation.y = Math.PI;
        leftLeaf.position.x = lerp(closedCenterX('front'), 0, tu);
        leftLeaf.position.z = 0.02;
      } else {
        const tf = easeInOutQuad((raw - uncenterRatio) / FLIP_RATIO);
        leftLeaf.position.x = 0;
        leftLeaf.rotation.y = Math.PI * (1 - tf);
        leftLeaf.position.z = 0.02;
      }
    } else if (animKind === 'openBack' && rightLeaf) {
      const uncenterRatio = 1 - FLIP_RATIO;
      if (raw < uncenterRatio) {
        const tu = easeInOutQuad(raw / uncenterRatio);
        rightLeaf.rotation.y = -Math.PI;
        rightLeaf.position.x = lerp(closedCenterX('back'), 0, tu);
        rightLeaf.position.z = 0.02;
      } else {
        const tf = easeInOutQuad((raw - uncenterRatio) / FLIP_RATIO);
        rightLeaf.position.x = 0;
        rightLeaf.rotation.y = -Math.PI * (1 - tf);
        rightLeaf.position.z = 0.02;
      }
    } else if (animKind === 'openBackFromLeft' && leftLeaf) {
      const uncenterRatio = 1 - FLIP_RATIO;
      if (raw < uncenterRatio) {
        const tu = easeInOutQuad(raw / uncenterRatio);
        leftLeaf.rotation.y = Math.PI;
        leftLeaf.position.x = lerp(closedCenterX('front'), 0, tu);
        leftLeaf.position.z = 0.02;
      } else {
        const tf = easeInOutQuad((raw - uncenterRatio) / FLIP_RATIO);
        leftLeaf.position.x = 0;
        leftLeaf.rotation.y = Math.PI * (1 - tf);
        leftLeaf.position.z = 0.02;
      }
    }

    if (animProgress >= FLIP_DURATION) finishAnim();
  }

  function getPointerNdc(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function handleCanvasClick(event) {
    if (isAnimating) return;
    if (canvas.dataset.skipClick === '1') return;
    getPointerNdc(event);
    raycaster.setFromCamera(pointer, camera);

    const targets = [];
    if (coverLeaf) targets.push(...coverLeaf.children);
    if (leftLeaf) targets.push(...leftLeaf.children);
    if (rightLeaf) targets.push(...rightLeaf.children);

    const hits = raycaster.intersectObjects(targets, false);
    if (!hits.length) return;

    const role = hits[0].object.userData.pageRole;
    if (role === 'cover') {
      if (closedFace === 'front') startNav(1);
      else if (closedFace === 'back') startNav(-1);
      return;
    }
    if (role === 'right') startNav(1);
    else if (role === 'left') startNav(-1);
  }

  function resize() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function tick() {
    if (disposed) return;
    rafId = requestAnimationFrame(tick);
    if (isAnimating) updateAnim();
    renderer.render(scene, camera);
  }

  function currentFaceUrls() {
    const urls = [];
    const add = (faceKey) => {
      const url = resolveFaceUrl(faceKey);
      if (url) urls.push(url);
    };
    if (bookState === 'closed') {
      add(closedFace);
      add(closedFace === 'front' ? 0 : LAST_PAGE_INDEX);
      return urls;
    }
    add(currentLeftIndex);
    add(backFaceForLeft(currentLeftIndex));
    if (currentLeftIndex + 1 <= LAST_PAGE_INDEX) {
      add(currentLeftIndex + 1);
      add(backFaceForRight(currentLeftIndex + 1));
    }
    return urls;
  }

  function refreshIfUrlVisible(url) {
    if (disposed || isAnimating) return;
    if (!currentFaceUrls().includes(url)) return;
    if (bookState === 'closed' && closedFace) {
      buildClosedCover(closedFace);
      return;
    }
    if (bookState === 'open') buildOpenSpread();
  }

  async function preloadEssential() {
    const urls = [
      assets.cover_front,
      assets.cover_back,
      pages[0]?.url,
      pages[1]?.url,
      pages[2]?.url,
      pages[3]?.url,
    ].filter(Boolean);
    await Promise.all(urls.map((url) => loadTexture(url).catch(() => null)));
  }

  function preloadRest() {
    pages.forEach((page, index) => {
      if (index < 4) return;
      loadTexture(page.url)
        .then(() => refreshIfUrlVisible(page.url))
        .catch(() => {});
    });
  }

  function goToCover(face) {
    if (isAnimating || disposed) return;
    if (face !== 'front' && face !== 'back') return;
    if (bookState === 'closed' && closedFace === face) return;
    currentLeftIndex = face === 'front' ? 0 : Math.max(0, LAST_LEFT_INDEX);
    buildClosedCover(face);
  }

  function goToPageNumber(pageNumber) {
    if (isAnimating || disposed) return;
    const index = pages.findIndex((page) => page.pageNumber === pageNumber);
    if (index < 0) return;
    const leftIndex = index % 2 === 0 ? index : Math.max(0, index - 1);
    currentLeftIndex = Math.max(0, Math.min(LAST_LEFT_INDEX, leftIndex));
    buildOpenSpread();
  }

  async function start({ initialClosedFace = null, initialPageNumber = null } = {}) {
    await preloadEssential();
    resize();
    if (initialClosedFace === 'front' || initialClosedFace === 'back') {
      buildClosedCover(initialClosedFace);
    } else {
      const pageNumber = Number(initialPageNumber);
      if (Number.isFinite(pageNumber) && pageNumber >= 1) {
        const index = pages.findIndex((page) => page.pageNumber === pageNumber);
        if (index >= 0) {
          const leftIndex = index % 2 === 0 ? index : Math.max(0, index - 1);
          currentLeftIndex = Math.max(0, Math.min(LAST_LEFT_INDEX, leftIndex));
        }
      }
      buildOpenSpread();
    }
    tick();
    preloadRest();
  }

  function destroy() {
    disposed = true;
    cancelAnimationFrame(rafId);
    canvas.removeEventListener('click', handleCanvasClick);
    window.removeEventListener('resize', resize);
    clearPages();
    textureMap.forEach((texture) => texture.dispose());
    textureMap.clear();
    renderer.dispose();
  }

  canvas.addEventListener('click', handleCanvasClick);
  window.addEventListener('resize', resize);

  return {
    start,
    destroy,
    resize,
    next: () => startNav(1),
    prev: () => startNav(-1),
    goToCover,
    goToPageNumber,
    getState: () => snapshotState(),
  };
}
