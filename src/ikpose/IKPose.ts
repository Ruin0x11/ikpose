import * as THREE from "three";
import * as AppUtils from "./AppUtils";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRM, VRMPose, VRMSchema } from '@pixiv/three-vrm';
import { Signals } from "./Signals";
import { IKModel } from "./IKModel";
import { TransformHandler } from "./TransformHandler";
import Tweakpane from "tweakpane";
import { FolderApi } from "tweakpane/dist/types/blade/folder/api/folder";
import fileDialog from "file-dialog";
import FileSaver from "file-saver";

export class IKPose {
    public renderer: THREE.WebGLRenderer;
    public camera: THREE.PerspectiveCamera;
    public scene: THREE.Scene;
    public signals: Signals;
    public gui: Tweakpane;
    private folderModels: FolderApi;

    public controls: OrbitControls;
    public transformHandler: TransformHandler;

    private ikModels: Array<IKModel> = [];
    private clock: THREE.Clock;

    public params: any = {
        showIk: true,
        updateModels: true
    };

    constructor() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.camera.position.set(0.0, 2.0, -3.5);
        this.scene.add(this.camera);

        this.signals = new Signals();
        this.clock = new THREE.Clock()

        this.addLight();
        this.addPlane();
        this.addGrid();

        this.bindControls();

        this.openGUI();

        this.render();

        if (this.params.updateModels) {
            this.loopUpdate();
        }
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
        this.controls.target.set(0.0, 1.0, 0.0)
        this.controls.update()

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

        function onWindowResize(): void {
            scope.camera.aspect = window.innerWidth / window.innerHeight;
            scope.camera.updateProjectionMatrix();
            scope.renderer.setSize(window.innerWidth, window.innerHeight);
            scope.render()
        }
        window.addEventListener('resize', onWindowResize, false);
    }

    private openGUI() {
        let scope = this

        this.gui = new Tweakpane()
        this.gui.addInput(this.params, "showIk", { label: "Show IK" })
            .on("change", (ev) => scope.setShowIk(ev.value))
        this.gui.addInput(this.params, "updateModels", { label: "Update Models" })
            .on("change", (ev) => this.loopUpdate())

        this.folderModels = this.gui.addFolder({ title: "Models" })
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
        this.ikModels.forEach((model) => model.update(delta));
    }

    private loopUpdate() {
        if (this.params.updateModels) {
            window.requestAnimationFrame(this.loopUpdate.bind(this));

            let delta = this.clock.getDelta();

            this.update(delta)
            this.render()
        }
    }

    public loadModel(url: string, pos: THREE.Vector3) {
        const loader = new GLTFLoader();
        loader.load(url,
            (gltf) => VRM.from(gltf).then((vrm) => this.onModelLoadSuccess(vrm, pos)),
            (progress) => this.onModelLoadProgress(progress),
            (error) => this.onModelLoadError(error)
        );
    }

    public loadPose(ikModel: IKModel, url: string) {
        var scope = this

        fetch(url)
            .then((resp) => resp.json())
            .then((pose) => {
                ikModel.loadPose(pose as VRMPose)
                scope.render()
            })
    }

    private queryLoadPose(ikModel: IKModel) {
        let pose = "/assets/poses/gaoo.json"
        var scope = this

        fileDialog({ multiple: false, accept: "application/json" })
            .then(files => {
                let reader = new FileReader()
                reader.addEventListener("load", () => {
                    let pose: VRMPose = JSON.parse(reader.result as string)
                    ikModel.loadPose(pose)
                    scope.render()
                });

                reader.readAsText(files[0]);
            })
    }

    public savePose(ikModel: IKModel) {
        let pose = ikModel.serializePose();

        let filename = window.prompt("Please enter a filename.", "pose")
        if (filename == null) {
            return
        }
        filename = `${filename}.json`

        let obj = AppUtils.stringMapToObject(pose)
        let json = JSON.stringify(obj)

        let blob = new Blob([json], { type: "application/json;charset=utf-8" })
        FileSaver.saveAs(blob, filename)
    }

    private onModelLoadSuccess(vrm: VRM, pos: THREE.Vector3) {
        const ikModel = new IKModel(this.signals, vrm)
        this.ikModels.push(ikModel);
        ikModel.vrm.scene.position.copy(pos)
        ikModel.ikController.setVisible(this.params.showIk);
        ikModel.addToScene(this.scene);

        var scope = this

        let folder = this.folderModels.addFolder({ expanded: true, title: ikModel.vrm.meta.title })
        folder.addButton({ title: "Load Pose" })
            .on("click", () => scope.queryLoadPose(ikModel))
        folder.addButton({ title: "Save Pose" })
            .on("click", () => scope.savePose(ikModel))
        folder.addButton({ title: "Reset Pose" })
            .on("click", () => ikModel.resetPose())

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
