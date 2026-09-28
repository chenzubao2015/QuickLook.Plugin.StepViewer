import * as THREE from 'three';

const viewport = document.getElementById('viewport');
const loading = document.getElementById('loading');
const status = document.getElementById('status');
const errorBox = document.getElementById('error');
const edgeButton = document.getElementById('edges');
const sizeX = document.getElementById('size-x');
const sizeY = document.getElementById('size-y');
const sizeZ = document.getElementById('size-z');
const colorButtons = [...document.querySelectorAll('.color-mode')];

function post(message) {
  if (window.chrome && window.chrome.webview) window.chrome.webview.postMessage(message);
}
function fail(error) {
  const message = error && error.message ? error.message : String(error);
  loading.hidden = true;
  loading.style.display = 'none';
  errorBox.hidden = false;
  errorBox.textContent = '无法预览此 CAD 文件\n\n' + message;
  post('error:' + message);
}
window.onerror = (message, source, line, column, error) => {
  fail(error || new Error(`${message} (${line}:${column})`));
  return true;
};
window.onunhandledrejection = event => fail(event.reason || new Error('未处理的异步错误'));

try {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeff2f5);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 1000000);
  camera.up.set(0, 0, 1);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'CAD 3D viewport');
  viewport.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x5d6872, 0.7));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xb7d8ff, 0.28);
  scene.add(fillLight);

  const modelRoot = new THREE.Group();
  scene.add(modelRoot);
  let edgesVisible = true;
  let modelRadius = 1;
  let colorMode = 'gray';
  let originalSize = new THREE.Vector3();
  const cameraTarget = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const drag = { active: false, mode: 'none', x: 0, y: 0 };

  function resize() {
    const width = Math.max(viewport.clientWidth, 1);
    const height = Math.max(viewport.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(viewport);

  function fitView() {
    modelRoot.position.set(0, 0, 0);
    modelRoot.rotation.set(0, 0, 0);
    modelRoot.scale.setScalar(1);
    const box = new THREE.Box3().setFromObject(modelRoot);
    if (box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    modelRadius = Math.max(sphere.radius, 0.001);
    const distance = modelRadius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.25;
    camera.near = Math.max(distance / 10000, 0.0001);
    camera.far = Math.max(distance * 100, 1000);
    cameraTarget.set(0, 0, 0);
    camera.position.copy(new THREE.Vector3(1, -1, 0.8).normalize().multiplyScalar(distance));
    camera.lookAt(cameraTarget);
    camera.updateProjectionMatrix();
    keyLight.position.set(modelRadius * 3.2, modelRadius * -4.0, modelRadius * 6.0);
    fillLight.position.set(modelRadius * -4.0, modelRadius * 2.0, modelRadius * 3.0);
  }

  function disposeModel() {
    while (modelRoot.children.length) {
      const child = modelRoot.children.pop();
      child.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else if (obj.material) obj.material.dispose();
      });
    }
    originalSize.set(0, 0, 0);
  }

  function makeMaterial(color) {
    return new THREE.MeshStandardMaterial({
      color,
      metalness: 0.08,
      roughness: 0.7,
      side: THREE.DoubleSide
    });
  }

  function colorfulFaceColor(index) {
    // Golden-angle hue spacing keeps adjacent faces visually distinct.
    const hue = (index * 0.61803398875 + 0.03) % 1;
    return new THREE.Color().setHSL(hue, 0.72, index % 2 ? 0.48 : 0.58);
  }

  function disposeMeshMaterials(mesh) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.filter(Boolean).forEach(material => material.dispose());
  }

  function applyColorMode(mode) {
    colorMode = mode;
    let faceIndex = 0;
    for (const mesh of modelRoot.children.filter(child => child.isMesh)) {
      disposeMeshMaterials(mesh);
      mesh.geometry.clearGroups();
      const faces = mesh.userData.brepFaces;
      if (mode === 'colorful') {
        const materials = [];
        for (const face of faces) {
          const materialIndex = materials.length;
          materials.push(makeMaterial(colorfulFaceColor(faceIndex++)));
          mesh.geometry.addGroup(face.first * 3, (face.last - face.first + 1) * 3, materialIndex);
        }
        mesh.material = materials;
      } else {
        const color = mode === 'gray' ? new THREE.Color(0x7a8288) : new THREE.Color(0x263d4d);
        mesh.material = makeMaterial(color);
        for (const face of faces) {
          mesh.geometry.addGroup(face.first * 3, (face.last - face.first + 1) * 3, 0);
        }
      }
    }
    colorButtons.forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
  }

  function addMesh(meshData) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(meshData.attributes.position.array, 3));
    if (meshData.attributes.normal && meshData.attributes.normal.array && meshData.attributes.normal.array.length) {
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(meshData.attributes.normal.array, 3));
    } else geometry.computeVertexNormals();
    geometry.setIndex(meshData.index.array);

    const triangleCount = meshData.index.array.length / 3;
    const faces = meshData.brep_faces && meshData.brep_faces.length
      ? meshData.brep_faces.map(face => ({ first: face.first, last: face.last }))
      : [{ first: 0, last: triangleCount - 1 }];
    const mesh = new THREE.Mesh(geometry, makeMaterial(new THREE.Color(0x263d4d)));
    mesh.name = meshData.name || 'STEP mesh';
    mesh.userData.brepFaces = faces;
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 28),
      new THREE.LineBasicMaterial({ color: 0x101820, transparent: true, opacity: 0.72 })
    );
    edge.userData.isEdge = true;
    edge.visible = edgesVisible;
    mesh.add(edge);
    modelRoot.add(mesh);
  }

  function formatDimension(value) {
    if (!Number.isFinite(value)) return '—';
    if (value >= 1000) return value.toFixed(1);
    if (value >= 10) return value.toFixed(2).replace(/\.00$/, '');
    return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  }

  function updateDimensions() {
    sizeX.textContent = formatDimension(originalSize.x);
    sizeY.textContent = formatDimension(originalSize.y);
    sizeZ.textContent = formatDimension(originalSize.z);
  }

  function centerModelGeometry() {
    const box = new THREE.Box3().setFromObject(modelRoot);
    originalSize.copy(box.getSize(new THREE.Vector3()));
    updateDimensions();
    const center = box.getCenter(new THREE.Vector3());
    for (const child of modelRoot.children) child.position.sub(center);
  }

  function pointerHitsModel(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(modelRoot.children.filter(child => child.isMesh), true).length > 0;
  }

  function rotateModel(dx, dy) {
    modelRoot.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), -dx * 0.008);
    const cameraRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    modelRoot.rotateOnWorldAxis(cameraRight, -dy * 0.008);
  }

  function moveModel(dx, dy) {
    const distance = camera.position.distanceTo(cameraTarget);
    const scale = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) / Math.max(viewport.clientHeight, 1);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    modelRoot.position.add(right.multiplyScalar(dx * scale).add(up.multiplyScalar(-dy * scale)));
  }

  function scaleModel(delta) {
    const factor = Math.exp(-delta * 0.0012);
    const next = THREE.MathUtils.clamp(modelRoot.scale.x * factor, 0.03, 40);
    modelRoot.scale.setScalar(next);
  }

  document.addEventListener('pointerdown', event => {
    if (event.button !== 0 || (event.target.closest && event.target.closest('#toolbar, #model-panel, #author'))) return;
    renderer.domElement.focus();
    drag.active = true;
    drag.mode = pointerHitsModel(event) ? 'move' : 'rotate';
    drag.x = event.clientX;
    drag.y = event.clientY;
    viewport.classList.add('dragging', drag.mode);
    try { event.target.setPointerCapture(event.pointerId); } catch (_) { }
    event.preventDefault();
    post('input:' + drag.mode);
  }, true);

  document.addEventListener('pointermove', event => {
    if (!drag.active) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (drag.mode === 'rotate') rotateModel(dx, dy);
    else if (drag.mode === 'move') moveModel(dx, dy);
    event.preventDefault();
  }, true);

  document.addEventListener('pointerup', event => {
    if (!drag.active) return;
    drag.active = false;
    viewport.classList.remove('dragging', 'rotate', 'move');
    drag.mode = 'none';
    event.preventDefault();
  }, true);

  document.addEventListener('wheel', event => {
    if (event.target.closest && event.target.closest('#toolbar, #model-panel, #author')) return;
    scaleModel(event.deltaY);
    event.preventDefault();
    post('input:scale');
  }, { passive: false, capture: true });
  document.addEventListener('contextmenu', event => event.preventDefault(), true);
  document.addEventListener('dragstart', event => event.preventDefault(), true);

  window.getStepViewerState = () => {
    const mesh = modelRoot.children.find(child => child.isMesh);
    const material = mesh && (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material);
    return {
      camera: camera.position.toArray(),
      modelPosition: modelRoot.position.toArray(),
      modelRotation: [modelRoot.rotation.x, modelRoot.rotation.y, modelRoot.rotation.z],
      modelScale: modelRoot.scale.x,
      dragMode: drag.mode,
      background: '#' + scene.background.getHexString(),
      firstMaterial: material ? '#' + material.color.getHexString() : null,
      colorMode,
      dimensions: originalSize.toArray(),
      materialCount: mesh ? (Array.isArray(mesh.material) ? mesh.material.length : 1) : 0
    };
  };

  window.loadCadFromUrl = async function (url, fileName, extension) {
    try {
      const ext = String(extension || '').toLowerCase();
      if (!['.stp', '.step', '.igs', '.iges', '.brep'].includes(ext))
        throw new Error(`不支持的 CAD 格式：${ext || '未知'}`);
      if (typeof occtimportjs !== 'function') throw new Error('OpenCascade 解析器未加载。');

      status.textContent = '正在读取并初始化模型…';
      const responsePromise = fetch(url, { cache: 'no-store' });
      const occtPromise = occtimportjs({ locateFile: file => './vendor/' + file });
      const response = await responsePromise;
      if (!response.ok) throw new Error(`无法读取模型文件（HTTP ${response.status}）。`);
      const [buffer, occt] = await Promise.all([response.arrayBuffer(), occtPromise]);
      const bytes = new Uint8Array(buffer);
      const params = {
        linearUnit: 'millimeter', linearDeflectionType: 'bounding_box_ratio',
        linearDeflection: 0.001, angularDeflection: 0.35
      };
      status.textContent = '正在三角化曲面…';
      let result;
      if (ext === '.stp' || ext === '.step') result = occt.ReadStepFile(bytes, params);
      else if (ext === '.igs' || ext === '.iges') result = occt.ReadIgesFile(bytes, params);
      else if (ext === '.brep') result = occt.ReadBrepFile(bytes, params);

      if (!result.success || !result.meshes || !result.meshes.length)
        throw new Error('OpenCascade 未能从文件中生成可显示的网格。');

      status.textContent = '正在创建三维场景…';
      disposeModel();
      result.meshes.forEach(addMesh);
      centerModelGeometry();
      applyColorMode('gray');
      fitView();
      loading.hidden = true;
      loading.style.display = 'none';
      renderer.domElement.focus();
      post('loaded');
    } catch (error) { fail(error); }
  };

  document.getElementById('fit').addEventListener('click', fitView);
  colorButtons.forEach(button => button.addEventListener('click', () => applyColorMode(button.dataset.mode)));
  edgeButton.addEventListener('click', () => {
    edgesVisible = !edgesVisible;
    edgeButton.classList.toggle('active', edgesVisible);
    modelRoot.traverse(obj => { if (obj.userData.isEdge) obj.visible = edgesVisible; });
  });

  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  resize();
  animate();
  post('ready');
} catch (error) { fail(error); }
