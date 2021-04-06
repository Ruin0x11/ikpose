import * as THREE from "three";
import { SignalDispatcher, SimpleEventDispatcher } from "strongly-typed-events";
import { IKModel } from "./IKModel";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";

export class Signals {
    public _onBoneSelectionChanged = new SimpleEventDispatcher<number>();
    public get onBoneSelectionChanged() {
        return this._onBoneSelectionChanged.asEvent();
    }

    public _onBoneTranslateChanged = new SimpleEventDispatcher<number>();
    public get onBoneTranslateChanged() {
        return this._onBoneTranslateChanged.asEvent();
    }

    public _onBoneRotateChanged = new SimpleEventDispatcher<number>();
    public get onBoneRotateChanged() {
        return this._onBoneRotateChanged.asEvent();
    }

    public _onBoneRotateFinished = new SimpleEventDispatcher<number>();
    public get onBoneRotateFinished() {
        return this._onBoneRotateFinished.asEvent();
    }

    public _onTransformSelectionChanged = new SimpleEventDispatcher<THREE.Object3D>();
    public get onTransformSelectionChanged() {
        return this._onTransformSelectionChanged.asEvent();
    }

    public _onTransformStarted = new SimpleEventDispatcher<THREE.Object3D>();
    public get onTransformStarted() {
        return this._onTransformStarted.asEvent();
    }

    public _onTransformFinished = new SimpleEventDispatcher<THREE.Object3D>();
    public get onTransformFinished() {
        return this._onTransformFinished.asEvent();
    }

    public _onTransformChanged = new SimpleEventDispatcher<[TransformControls, THREE.Object3D]>();
    public get onTransformChanged() {
        return this._onTransformChanged.asEvent();
    }

    public _onPoseChanged = new SignalDispatcher();
    public get onPoseChanged() {
        return this._onPoseChanged.asEvent();
    }

    public _onSolveIkCalled = new SignalDispatcher();
    public get onSolveIkCalled() {
        return this._onSolveIkCalled.asEvent();
    }

    public _onIkSettingChanged = new SignalDispatcher();
    public get onIkSettingChanged() {
        return this._onIkSettingChanged.asEvent();
    }

    public _onIkSelectionChanged = new SimpleEventDispatcher<[THREE.Object3D, string]>();
    public get onIkSelectionChanged() {
        return this._onIkSelectionChanged.asEvent();
    }

    public _onJointSelectionChanged = new SimpleEventDispatcher<THREE.Object3D>();
    public get onJointSelectionChanged() {
        return this._onJointSelectionChanged.asEvent();
    }

    public _onLoadingModelFinished = new SimpleEventDispatcher<IKModel>();
    public get onLoadingModelFinished() {
        return this._onLoadingModelFinished.asEvent();
    }
}
