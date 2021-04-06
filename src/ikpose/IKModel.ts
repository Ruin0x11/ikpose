import * as THREE from "three";
import { VRM } from "@pixiv/three-vrm/types/VRM";
import { BoneAttachController } from "./BoneAttachController";
import { IKController } from "./IKController";
import { Signals } from "./Signals";
import { ISignalHandler, ISimpleEventHandler } from "strongly-typed-events";
import { HumanoidIK } from "./HumanoidIK";
import { IIKSettings } from "./IIKSettings";
import { JointController } from "./JointController";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";

export class IKModel {
    public boneAttachController: BoneAttachController;
    public ikController: IKController;
    public jointController: JointController;
    public settings: IIKSettings;

    private _onpc: ISignalHandler;

    private _ontsc: ISimpleEventHandler<[TransformControls, THREE.Object3D]>;
    private _onts: ISimpleEventHandler<THREE.Object3D>;
    private _ontf: ISimpleEventHandler<THREE.Object3D>;
    private _ontc: ISimpleEventHandler<[TransformControls, THREE.Object3D]>;
    private _ontrc: ISimpleEventHandler<[TransformControls, THREE.Object3D]>;

    private _onbtc: ISimpleEventHandler<number>;

    constructor(private signals: Signals, public vrm: VRM) {
        this.boneAttachController = new BoneAttachController(this.vrm.scene as THREE.Group);
        this.ikController = new IKController(this.signals, this.boneAttachController);
        this.jointController = new JointController(this.signals, this.boneAttachController, this.ikController);

        this._onpc = () => this.boneAttachController.update(true);
        this.signals.onPoseChanged.subscribe(this._onpc);

        this.settings = new HumanoidIK(this.ikController, this.boneAttachController, this.vrm);
        this.ikController.initialize(this.settings)
        this.signals._onIkSettingChanged.dispatch()

        this._ontsc = (target) => this.onTransformSelectionChanged(target);
        this._onts = (target) => this.onTransformStarted(target);
        this._ontf = (target) => this.onTransformFinished(target);
        this._ontc = (target) => this.onTransformChanged(target);
        this._ontrc = (target) => this.onTransformRotateChanged(target);

        this.signals.onTransformSelectionChanged.subscribe(this._ontsc);
        this.signals.onTransformStarted.subscribe(this._onts);
        this.signals.onTransformFinished.subscribe(this._ontf);
        this.signals.onTransformChanged.subscribe(this._ontc);
        this.signals.onTransformRotateChanged.subscribe(this._ontrc);

        this._onbtc = () => this.ikController.resetAllIkTargets();
        this.signals.onBoneTranslateChanged.subscribe(this._onbtc);

        this.signals._onLoadingModelFinished.dispatch(this);
    }

    addToScene(scene: THREE.Scene) {
        this.vrm.scene.add(this.ikController.object3d)
        scene.add(this.vrm.scene);

        // this.vrm.scene.rotation.z = Math.PI / 2.24
        // this.vrm.scene.rotation.y = -Math.PI / 2.24
        // this.vrm.scene.rotation.x = Math.PI / 1.24
    }

    update(delta: number) {
        this.vrm.update(delta);
    }

    onTransformSelectionChanged(target: [TransformControls, THREE.Object3D]) {
        this.jointController.onTransformSelectionChanged(target);
        this.ikController.onTransformSelectionChanged(target);
    }

    onTransformStarted(target: THREE.Object3D) {
        this.jointController.onTransformStarted(target);
        this.ikController.onTransformStarted(target);
    }

    onTransformFinished(target: THREE.Object3D) {
        this.jointController.onTransformFinished(target);
        this.ikController.onTransformFinished(target);
    }

    onTransformChanged(target: [TransformControls, THREE.Object3D]) {
        // JointController will go first so the IK targets can be updated to
        // reflect new rotatations afterward
        this.jointController.onTransformChanged(target);
        this.ikController.onTransformChanged(target);
    }

    onTransformRotateChanged(target: [TransformControls, THREE.Object3D]) {
        this.jointController.onTransformRotateChanged(target);
        this.ikController.onTransformRotateChanged(target);
    }

    dispose() {
        this.signals.onPoseChanged.unsubscribe(this._onpc);

        this.signals.onTransformSelectionChanged.unsubscribe(this._ontsc);
        this.signals.onTransformStarted.unsubscribe(this._onts);
        this.signals.onTransformFinished.unsubscribe(this._ontf);
        this.signals.onTransformChanged.unsubscribe(this._ontc);
        this.signals.onTransformRotateChanged.unsubscribe(this._ontrc);

        this.signals.onBoneTranslateChanged.unsubscribe(this._onbtc);

        this.boneAttachController.dispose();
        this.ikController.dispose();
    }
}
