import * as THREE from "three";
import * as dat from "dat.gui";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRM, VRMSchema } from '@pixiv/three-vrm';

export class IKPose {
    public renderer: THREE.WebGLRenderer;
    public camera: THREE.PerspectiveCamera;
    public scene: THREE.Scene;

    public transformControl: TransformControls;

    public params: any = {
        uniform: false
    };

    constructor() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);

        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000);
        this.camera.position.set(0.0, 2.5, 1.5);
        this.scene.add(this.camera);

        this.addLight();
        this.addPlane();
        this.addGrid();

        this.bindControls();

        this.openGUI();

        this.render();
    }

    private addLight() {
        this.scene.add(new THREE.AmbientLight(0xf0f0f0));
        const light = new THREE.SpotLight(0xffffff, 1.5);
        light.position.set(0, 1500, 200);
        light.angle = Math.PI * 0.2;
        light.castShadow = true;
        light.shadow.camera.near = 200;
        light.shadow.camera.far = 2000;
        light.shadow.bias = -0.000222;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        this.scene.add(light);
    }

    private addPlane() {
        const planeGeometry = new THREE.PlaneGeometry(2000, 2000);
        planeGeometry.rotateX(-Math.PI / 2);
        const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.2 });

        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.position.y = -1;
        plane.receiveShadow = true;
        this.scene.add(plane);
    }

    private addGrid() {
        const helper = new THREE.GridHelper(50, 100);
        helper.position.y = 0;
        const material: THREE.Material = helper.material as THREE.Material
        material.opacity = 0.25;
        material.transparent = true;
        this.scene.add(helper);
    }

    private bindControls() {
        // Controls
        const controls = new OrbitControls(this.camera, this.renderer.domElement);
        // controls.damping = 0.2;
        controls.addEventListener('change', () => this.render());

        this.transformControl = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControl.addEventListener('change', () => this.render());
        this.transformControl.addEventListener('dragging-changed', function(event) {
            controls.enabled = !event.value;
        });
        this.scene.add(this.transformControl);

        document.addEventListener('pointerdown', this.onPointerDown);
        document.addEventListener('pointerup', this.onPointerUp);
        document.addEventListener('pointermove', this.onPointerMove);
    }

    private openGUI() {
        const gui = new dat.GUI();

        gui.add(this.params, 'uniform');
        gui.open();
    }

    private onPointerDown(event: PointerEvent) {
    }

    private onPointerUp(event: PointerEvent) {
    }

    private onPointerMove(event: PointerEvent) {
    }

    private render() {
        this.renderer.render(this.scene, this.camera);
    }

    public loadModel(url: string) {
        const loader = new GLTFLoader();
        loader.load(url,
            (gltf) => VRM.from(gltf).then((vrm) => this.onModelLoadSuccess(vrm)),
            (progress) => this.onModelLoadProgress(progress),
            (error) => this.onModelLoadError(error)
        );
    }

    private onModelLoadSuccess(vrm: VRM) {
        this.scene.add(vrm.scene);
        vrm.humanoid.getBoneNode(VRMSchema.HumanoidBoneName.Hips).rotation.y = Math.PI;

        console.log(vrm);
        this.render();
    }

    private onModelLoadProgress(progress: any) {
        console.log('Loading model...', 100.0 * (progress.loaded / progress.total), '%')
    }

    private onModelLoadError(error: ErrorEvent) {
        console.error(error)
    }
}
