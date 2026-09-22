/* ==========================================================================
   3D PRINT HUB - THREE.JS STL VIEWER MODULE
   ========================================================================== */

class STLViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.currentMesh = null;
    this.wireframe = false;
    this.animationFrameId = null;

    this.init();
  }

  init() {
    // Create Scene
    this.scene = new THREE.Scene();

    // Create Camera
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(100, 100, 100);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    // Clear previous canvas if any
    const oldCanvas = this.container.querySelector('canvas');
    if (oldCanvas) oldCanvas.remove();

    this.renderer.domElement.id = 'stl-canvas';
    this.container.appendChild(this.renderer.domElement);

    // Controls
    if (THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
    }

    // Lighting setup for sleek metallic 3D print look
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x00f2fe, 1.2);
    dirLight1.position.set(100, 200, 100);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x7928ca, 0.8);
    dirLight2.position.set(-100, -100, -100);
    this.scene.add(dirLight2);

    // Grid Floor
    const grid = new THREE.GridHelper(200, 20, 0x00f2fe, 0x223344);
    grid.position.y = -0.5;
    this.scene.add(grid);

    // Responsive Resize Handler
    window.addEventListener('resize', () => this.onWindowResize());

    // Start Render Loop
    this.animate();
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  loadSTLFromFile(file, onLoadedCallback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const contents = e.target.result;
      const loader = new THREE.STLLoader();
      const geometry = loader.parse(contents);

      this.displayGeometry(geometry, file.name);

      if (onLoadedCallback) {
        const info = this.calculateSTLMetrics(geometry);
        onLoadedCallback(info);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  loadDefaultCube() {
    const geometry = new THREE.BoxGeometry(40, 40, 40);
    this.displayGeometry(geometry, 'Modelo 3D de Ejemplo (Cubo)');
  }

  displayGeometry(geometry, name = 'Pieza 3D') {
    // Remove previous mesh
    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      this.currentMesh.geometry.dispose();
      this.currentMesh.material.dispose();
    }

    geometry.center();
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      roughness: 0.3,
      metalness: 0.4,
      wireframe: this.wireframe
    });

    this.currentMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.currentMesh);

    // Adjust camera to fit bounding box
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    const maxDim = Math.max(
      bbox.max.x - bbox.min.x,
      bbox.max.y - bbox.min.y,
      bbox.max.z - bbox.min.z
    );

    this.camera.position.set(maxDim * 1.5, maxDim * 1.5, maxDim * 1.5);
    if (this.controls) {
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }

    // Update overlay text
    const overlay = document.querySelector('.stl-overlay');
    if (overlay) {
      overlay.innerHTML = `<strong>${name}</strong>`;
    }
  }

  toggleWireframe() {
    this.wireframe = !this.wireframe;
    if (this.currentMesh) {
      this.currentMesh.material.wireframe = this.wireframe;
    }
  }

  resetView() {
    if (this.currentMesh && this.controls) {
      this.currentMesh.geometry.computeBoundingBox();
      const bbox = this.currentMesh.geometry.boundingBox;
      const maxDim = Math.max(
        bbox.max.x - bbox.min.x,
        bbox.max.y - bbox.min.y,
        bbox.max.z - bbox.min.z
      );
      this.camera.position.set(maxDim * 1.5, maxDim * 1.5, maxDim * 1.5);
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }
  }

  calculateSTLMetrics(geometry) {
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    const sizeX = (bbox.max.x - bbox.min.x).toFixed(1);
    const sizeY = (bbox.max.y - bbox.min.y).toFixed(1);
    const sizeZ = (bbox.max.z - bbox.min.z).toFixed(1);

    // Volume calculation approximation for triangle mesh
    let volume = 0;
    const pos = geometry.attributes.position;
    if (pos) {
      const p1 = new THREE.Vector3();
      const p2 = new THREE.Vector3();
      const p3 = new THREE.Vector3();

      for (let i = 0; i < pos.count; i += 3) {
        p1.fromBufferAttribute(pos, i);
        p2.fromBufferAttribute(pos, i + 1);
        p3.fromBufferAttribute(pos, i + 2);
        volume += p1.dot(p2.cross(p3)) / 6.0;
      }
    }

    const volumeCm3 = Math.abs(volume / 1000).toFixed(2);
    const estWeightGramsPLA = (volumeCm3 * 1.24).toFixed(1); // PLA density ~1.24 g/cm3

    return {
      dimensions: `${sizeX} x ${sizeY} x ${sizeZ} mm`,
      volumeCm3: `${volumeCm3} cm³`,
      estWeightGramsPLA: `${estWeightGramsPLA} g (PLA)`
    };
  }
}

window.STLViewer = STLViewer;
