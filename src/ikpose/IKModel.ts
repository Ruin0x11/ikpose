import * as THREE from "three";
import { VRM } from "@pixiv/three-vrm/types/VRM";
import { BoneAttachController } from "./BoneAttachController";
import { IKController } from "./IKController";
import { Signals } from "./Signals";
import { ISignalHandler, ISimpleEventHandler } from "strongly-typed-events";
import { HumanoidIK } from "./HumanoidIK";
import { IIKSettings } from "./IIKSettings";

export class IKModel {
    public boneAttachController: BoneAttachController;
    public ikController: IKController;
    public settings: IIKSettings;

    private _onpc: ISignalHandler;

    private _ontsc: ISimpleEventHandler<THREE.Object3D>;
    private _onts: ISimpleEventHandler<THREE.Object3D>;
    private _ontf: ISimpleEventHandler<THREE.Object3D>;
    private _ontc: ISimpleEventHandler<THREE.Object3D>;

    private _onbtc: ISimpleEventHandler<number>;

    constructor(private signals: Signals, public vrm: VRM) {
        this.boneAttachController = new BoneAttachController(this.vrm.scene as THREE.Group);
        this.ikController = new IKController(this.signals, this.boneAttachController);

        this._onpc = () => this.boneAttachController.update(true);
        this.signals.onPoseChanged.subscribe(this._onpc);

        this.settings = new HumanoidIK(this.ikController, this.boneAttachController, this.vrm);
        this.ikController.initialize(this.settings)
        this.signals._onIkSettingChanged.dispatch()

        this._ontsc = (target) => this.ikController.onTransformSelectionChanged(target);
        this._onts = (target) => this.ikController.onTransformStarted(target);
        this._ontf = (target) => this.ikController.onTransformFinished(target);
        this._ontc = (target) => this.ikController.onTransformChanged(target);

        this.signals.onTransformSelectionChanged.subscribe(this._ontsc);
        this.signals.onTransformStarted.subscribe(this._onts);
        this.signals.onTransformFinished.subscribe(this._ontf);
        this.signals.onTransformChanged.subscribe(this._ontc);

        this._onbtc = () => this.ikController.resetAllIkTargets();
        this.signals.onBoneTranslateChanged.subscribe(this._onbtc);

        this.signals._onLoadingModelFinished.dispatch(this);
    }

    addToScene(scene: THREE.Scene) {
        scene.add(this.vrm.scene);

        Object.values(this.ikController.iks).forEach((ik) => {
            ik.addToScene(scene);
        })
    }

    update(delta: number) {
        this.vrm.update(delta);
    }

    dispose() {
        this.signals.onPoseChanged.unsubscribe(this._onpc);

        this.signals.onTransformSelectionChanged.unsubscribe(this._ontsc);
        this.signals.onTransformStarted.unsubscribe(this._onts);
        this.signals.onTransformFinished.unsubscribe(this._ontf);
        this.signals.onTransformChanged.unsubscribe(this._ontc);

        this.signals.onBoneTranslateChanged.unsubscribe(this._onbtc);

        Object.values(this.ikController.iks).forEach((ik) => {
            ik.dispose();
        })

        this.boneAttachController.dispose();
        this.ikController.dispose();
    }
}
