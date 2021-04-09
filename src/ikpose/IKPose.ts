import * as THREE from "three";
import * as dat from "dat.gui";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRM, VRMSchema } from '@pixiv/three-vrm';
import { Signals } from "./Signals";
import { IKModel } from "./IKModel";
import { TransformHandler } from "./TransformHandler";

export class IKPose {
    public renderer: THREE.WebGLRenderer;
    public camera: THREE.PerspectiveCamera;
    public scene: THREE.Scene;
    public signals: Signals;

    public controls: OrbitControls;
    public transformHandler: TransformHandler;

    private ikModels: Array<IKModel> = [];

    public params: any = {
        showIk: true
    };

    constructor() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.camera.position.set(0.0, 2.5, 1.5);
        this.scene.add(this.camera);

        this.signals = new Signals();

        this.addLight();
        this.addPlane();
        this.addGrid();

        this.bindControls();

        this.openGUI();

        let scope = this
        function onWindowResize(): void {
            scope.camera.aspect = window.innerWidth / window.innerHeight;
            scope.camera.updateProjectionMatrix();
            scope.renderer.setSize(window.innerWidth, window.innerHeight);
            scope.render()
        }
        window.addEventListener('resize', onWindowResize, false);

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
        var scope = this;

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        // controls.damping = 0.2;
        this.controls.addEventListener('change', () => scope.render());

        this.transformHandler = new TransformHandler(this.signals, this);

        this.signals.onJointSelectionChanged.subscribe((target: THREE.Object3D) => {
            if (target) {
                scope.transformHandler.setTarget(target);
            }
            scope.render();
        })

        this.signals.onIkSelectionChanged.subscribe((target: [THREE.Object3D, string]) => {
            if (target) {
                scope.transformHandler.setTarget(target[0]);
            }
            scope.render();
        })
    }

    private openGUI() {
        let scope = this

        const gui = new dat.GUI();

        gui.add(this.params, 'showIk').onChange((value) => scope.setShowIk(value));
        gui.open();
    }

    private setShowIk(enabled: boolean) {
        for (let ikModel of this.ikModels) {
            ikModel.ikController.setVisible(enabled);
        }
        this.transformHandler.selectTarget(null)
        this.render()
    }

    public render() {
        this.renderer.render(this.scene, this.camera);
    }

    public update(delta: number) {
        // this.ikModels.forEach((model) => model.update(delta));
    }

    public loadModel(url: string, pos: THREE.Vector3) {
        const loader = new GLTFLoader();
        loader.load(url,
            (gltf) => VRM.from(gltf).then((vrm) => this.onModelLoadSuccess(vrm, pos)),
            (progress) => this.onModelLoadProgress(progress),
            (error) => this.onModelLoadError(error)
        );
    }

    private onModelLoadSuccess(vrm: VRM, pos: THREE.Vector3) {
        const ikModel = new IKModel(this.signals, vrm)
        this.ikModels.push(ikModel);
        ikModel.vrm.scene.position.copy(pos)
        ikModel.vrm.humanoid.getBoneNode(VRMSchema.HumanoidBoneName.Hips).rotation.y = Math.PI;
        ikModel.ikController.setVisible(this.params.showIk);
        ikModel.addToScene(this.scene);

        console.log(vrm);
        this.render();
    }

    private onModelLoadProgress(progress: any) {
        console.log('Loading model...', 100.0 * (progress.loaded / progress.total), '%')
    }

    private onModelLoadError(error: ErrorEvent) {
        console.error(error)
    }

    public getIkTargets(): THREE.Mesh[] {
        const result = this.ikModels.map((model) => model.ikController.getIkTargetsValue());
        return [].concat.apply([], result);
    }

    public getJointTargets(): THREE.Mesh[] {
        const result = this.ikModels.map((model) => model.boneAttachController.getContainerList());
        return [].concat.apply([], result);
    }
}
