import * as THREE from "three";
import { SignalDispatcher, SimpleEventDispatcher } from "strongly-typed-events";

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

    public _onTransformSelectionChanged = new SimpleEventDispatcher<THREE.Mesh>();
    public get onTransformSelectionChanged() {
        return this._onTransformSelectionChanged.asEvent();
    }

    public _onTransformStarted = new SimpleEventDispatcher<THREE.Mesh>();
    public get onTransformStarted() {
        return this._onTransformStarted.asEvent();
    }

    public _onTransformFinished = new SimpleEventDispatcher<THREE.Mesh>();
    public get onTransformFinished() {
        return this._onTransformFinished.asEvent();
    }

    public _onTransformChanged = new SimpleEventDispatcher<THREE.Mesh>();
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

    public _onIkSelectionChanged = new SimpleEventDispatcher<string>();
    public get onIkSelectionChanged() {
        return this._onIkSelectionChanged.asEvent();
    }
}
