import * as THREE from "three";
import * as AppUtils from "./AppUtils";
import * as BoneUtils from "./BoneUtils";
import * as IKUtils from "./IKUtils";

import { BoneAttachController } from "./BoneAttachController";
import { IIKSettings } from "./IIKSettings";
import { IKData } from "./IKData";
import { Signals } from "./Signals";
import { ISignalHandler, ISimpleEventHandler } from "strongly-typed-events";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";

export class IKController {
    public logging: boolean = false;

    public iks: Map<string, IKData> = new Map();
    private ikSettings: IIKSettings;
    public object3d: THREE.Object3D = new THREE.Object3D();

    public ikLimitMin: Map<string, THREE.Vector3> = new Map();
    public ikLimitMax: Map<string, THREE.Vector3> = new Map();
    public ikDefaultLimitMin: Map<string, THREE.Vector3> = new Map();
    public ikDefaultLimitMax: Map<string, THREE.Vector3> = new Map();
    private ikBoneRatio: any = {};

    private _ikSolved = {};

    private selectedIk: IKData = null;

    private ikPresets: any = null;

    private ikLockX: boolean = false;
    private ikLockY: boolean = false;
    private ikLockZ: boolean = false;

    private boneLocked: any = {};
    private ikBoneSelectedOnly: boolean = false;
    private ikLimitkRotationEnabled: boolean = true;

    private followOtherIkTargets = true;

    private maxAngle: number = 1;
    private iteration: number = 25;

    private boneSelectedIndex: number = 0;

    private lastTargetMovedPosition: THREE.Vector3;
    private _euler: THREE.Euler;
    private _pos: THREE.Vector3;
    private _cubeMatrix: THREE.Matrix4;
    private _matrixWorldInv: THREE.Matrix4;
    private _quaternion: THREE.Quaternion;

    private debug: boolean = false;

    private _initialized = false;
    private _enabled = true;

    private _solving = false;
    private _mouseDown = false;

    constructor(private signals: Signals, private boneAttachController: BoneAttachController) {
        this.lastTargetMovedPosition = new THREE.Vector3();
        this._euler = new THREE.Euler();
        this._pos = new THREE.Vector3();
        this._cubeMatrix = new THREE.Matrix4();
        this._matrixWorldInv = new THREE.Matrix4();
        this._quaternion = new THREE.Quaternion();
    }

    public onIkSelectionChanged(target: [THREE.Object3D, string]) {
        if (this.logging) {
            console.log("onIkSelectionChanged called", target);
        }
        // var newTarget = this.getIkTargetFromName(ikName);
        // ap.signals.transformSelectionChanged.dispatch(newTarget);
    }

    public setVisible(visible) {
        var scope = this;
        var values = scope.getIkTargetsValue();
        values.forEach(function(target: THREE.Mesh) {
            target.visible = visible;
            var name = scope.getIkNameFromTarget(target);
            var enableEndSite = scope.isEnableEndSiteByName(name);
            if (enableEndSite) {
                scope.setEndSiteVisible(name, visible);
            }
        });
    }

    public setEnabled(enabled) {
        this._enabled = enabled;
        this.setVisible(enabled);
    };

    public isEnabled() {
        return this._enabled;
    }

    public addTarget(target: THREE.Object3D) {
        this.object3d.add(target)
    }

    public setBoneAttachController(boneAttachController: BoneAttachController) {
        this.boneSelectedIndex = 0;
        this.boneAttachController = boneAttachController;
        this.resetIkSettings();

        this.resetAllIkTargets(null);
    }

    public resetIkSettings() {
        var scope = this;
        var list = this.boneAttachController.getContainerList();
        this.ikSettings.endSites.forEach(function(endsite) {
            var index = endsite.userData.endSiteIndex;
            var parentIndex = endsite.userData.endSiteParentIndex;
            list[index].add(endsite);
            list[index].add(endsite.userData.joint);
            list[index].userData.endsite = endsite;

            if (scope.logging) {
                console.log("endsite position recalucurate", index);
            }

            var diff = list[index].position.clone().sub(list[parentIndex].position);
            var length = endsite.userData.length ? endsite.userData.length : 10;

            endsite.position.copy(diff);
            let joint = endsite.userData.joint as THREE.Line;
            joint.geometry.attributes.position.setX(0, diff.x);
            joint.geometry.attributes.position.setY(0, diff.y);
            joint.geometry.attributes.position.setZ(0, diff.z);
            joint.geometry.attributes.position.needsUpdate = true;
        });
    }

    private _onbsc: ISimpleEventHandler<number>;
    private _onpc: ISignalHandler;
    private _onsic: ISignalHandler;
    private _onisc: ISimpleEventHandler<[THREE.Object3D, string]>;
    private _onbrc: ISimpleEventHandler<number>;

    public initialize(ikSettings: IIKSettings) {
        this.ikSettings = ikSettings;
        //TODO ikSettings move somewhere for switch settings

        this._onbsc = (index: number) => this.boneSelectedIndex = index
        this.signals.onBoneSelectionChanged.subscribe(this._onbsc)

        this._onpc = () => this.resetAllIkTargets()
        this.signals.onPoseChanged.subscribe(this._onpc);

        this._onsic = () => this.solveIk(true);
        this.signals.onSolveIkCalled.subscribe(this._onsic);

        this._onisc = (target) => this.onIkSelectionChanged(target)
        this.signals.onIkSelectionChanged.subscribe(this._onisc);

        /*
          ikController call when onTransformFinished for editor
          rotationController call when edited
        */

        this._onbrc = (index: number) => {
            var selection = this.getSelectedIkName();
            this.resetAllIkTargets(selection);

            if (index == 0) {
                this.signals._onBoneTranslateChanged.dispatch(index); //I'm not sure this is need?
            }
        };
        this.signals.onBoneRotateChanged.subscribe(this._onbrc);

        this.setBoneAttachController(this.boneAttachController);

        this._initialized = true;
    }

    public dispose() {
        this.signals.onIkSelectionChanged.unsubscribe(this._onisc);
        this.signals.onBoneSelectionChanged.unsubscribe(this._onbsc);
        this.signals.onPoseChanged.unsubscribe(this._onpc);
        this.signals.onSolveIkCalled.unsubscribe(this._onsic);
        this.signals.onBoneRotateChanged.unsubscribe(this._onbrc);

        Object.values(this.iks).forEach(function(ik) {
            ik.dispose();
        });
        this.iks.clear();

        //endsite die with bone-attach controler
    }

    public isInitialized() {
        return this._initialized;
    }


    public getIkNameFromTarget(target: THREE.Object3D) {
        if (target == null || target == undefined) {
            return target;
        }
        if (target.userData.ikName) {
            return target.userData.ikName;
        } else {
            //deprecated
            return null;
        }
    }

    public getIkTargetFromName(ikName: string) {
        return this.iks[ikName].target;
    }
    public getIkTargetsValue() {
        return Object.values(this.iks).map((ik) => ik.target)
    }
    public g

    public setPresets(ikPresets) {
        if (this.ikPresets) {
            this.ikPresets.dispose();
        }
        this.ikPresets = ikPresets;
        ikPresets.ikController = this;
    }

    public getPresets() {
        return this.ikPresets;
    }

    public getBoneList(): THREE.Bone[] {
        return this.boneAttachController.getBoneList();
    }

    public getIndices(name: string): IKData {
        return this.iks[name];
    }

    public getBoneRatioAsJson() {
        var jsonText = JSON.stringify(this.ikBoneRatio);
        return jsonText;
    }

    public setBoneRatioFromJson(json: Map<string, number>) {
        this.ikBoneRatio = json;
        Object.keys(json).forEach((k) => {
            var ik = this.iks[k];
            if (ik) {
                ik.boneRatio = json[k];
            }
        })
    }

    public clearBoneRatio() {
        Object.values(this.iks).forEach((ik) => ik.boneRatio = 1)
    }

    public setBoneRatio(name: string, ratio: number) {
        this.ikBoneRatio[name] = ratio;
    }
    public getBoneRatio(name: string): number {
        return this.ikBoneRatio[name] == undefined ? 1 : this.ikBoneRatio[name];
    }

    public getSelectedIkName() {
        return this.selectedIk != null ? this.selectedIk.name : null;
    }

    public getIkNames() {
        return Object.keys(this.iks);
    }

    public isEnableEndSiteByName(name: string) {
        var target = this.iks[name].target;
        var ik = this.iks[name];

        var index = ik.indices[ik.indices.length - 1];
        var object = this.boneAttachController.getContainerList()[index];

        return this.enableEndSite(object);
    }

    public enableEndSite(object) {
        return object.userData.endsite && object.userData.endsite.userData.enabled == true;
    }

    updateIkTargets() {
        this._matrixWorldInv.copy(this.object3d.matrixWorld).invert();
        this.object3d.getWorldQuaternion(this._quaternion);

        this.boneAttachController.updateMatrix();
        for (let name in this.iks) {
            var ik = this.iks[name];
            var index = ik.indices[ik.indices.length - 1];
            var cube = this.boneAttachController.getContainerList()[index];
            let target = ik.target

            target.position.copy(cube.position)

            this.boneAttachController.updateOne(index);
        }
    }

    public resetAllIkTargets(exclude: string = null) {
        var scope = this;
        this.boneAttachController.update();
        Object.keys(this.iks).forEach(function(key) {
            if (key != exclude)
                scope.resetIkTargetPosition(key);
        });
    }

    public resetIkTargetPosition(name) {
        var target = this.iks[name].target;
        /*var indices=this.iks[name];


          var index=indices[indices.length-1];
          var lastMesh=this.boneAttachController.containerList[index];*/

        var position = this.getLastPosition(name);

        target.position.copy(position);
    }

    public getLastPosition(name: string) {
        var target = this.iks[name].target;
        var ik = this.iks[name];
        var index = ik.indices[ik.indices.length - 1];
        var lastMesh = this.boneAttachController.getContainerList()[index];
        var position = lastMesh.position;

        if (this.enableEndSite(lastMesh)) {
            position = lastMesh.userData.endsite.getWorldPosition(this._pos);
        }
        return position;
    }

    public setEndSiteEnabled(name: string, enabled: boolean) {
        var target = this.iks[name].target;
        if (target == undefined) {
            console.error("setEndSiteEnabled:No target found ", name);
        }
        var ik = this.iks[name];

        var index = ik.indices[ik.indices.length - 1];

        var lastMesh = this.boneAttachController.getContainerList()[index];

        lastMesh.userData.endsite.userData.enabled = enabled;
        lastMesh.userData.endsite.material.visible = enabled;
        lastMesh.userData.endsite.userData.joint.material.visible = enabled;

        this.resetIkTargetPosition(name);
    }

    public setEndSiteVisible(name: string, visible: boolean) {
        var target = this.iks[name].target;
        if (!target) {
            console.error("setEndSiteEnabled:No target found ", name);
        }
        var ik = this.iks[name];

        var index = ik.indices[ik.indices.length - 1];

        var lastMesh = this.boneAttachController.getContainerList()[index];

        lastMesh.userData.endsite.material.visible = visible;
        lastMesh.userData.endsite.userData.joint.material.visible = visible;
    }

    public setIkTarget(target: THREE.Object3D) {
        if (target == null) {
            this.selectedIk = null;
            this.signals._onIkSelectionChanged.dispatch(null);
            this.resetAllIkTargets(null);//should add signal?
        } else {
            this.selectedIk = this.iks[target.userData.ikName]
            this.signals._onIkSelectionChanged.dispatch([target, this.getIkNameFromTarget(target)]);
        }
    }

    public clearIkTarget() {
        this.setIkTarget(null);
    }

    public solveOtherIkTargets() {
        var current = this.selectedIk;
        var scope = this;
        Object.values(this.iks).forEach(function(ik) {
            scope.setIkTarget(ik.target);
            if (current != ik.target) {
                var solved = scope.solveIk(false);
                if (solved) {
                    scope._ikSolved[ik.name] = true;
                    if (scope.logging) {
                        console.log("ik solved", ik.name);
                    }
                }
            }
        });
        this.setIkTarget(current.target);
    }

    public onTransformSelectionChanged(target: THREE.Object3D) {
        var scope = this;
        // ap.getSignal("ikSelectionChanged").remove(this.onIkSelectionChanged);

        if (target == null) {
            this.clearIkTarget();
        } else if (target.userData.transformSelectionType == "BoneIk" && this._enabled) {
            if (scope.logging) {
                console.log("IkController onTransformSelectionChanged");
            }

            scope.setIkTarget(target);

            if (scope.logging) {
                console.log("IkController dispatch ikSelectionChanged", scope.getIkNameFromTarget(target));
            }
        } else {//other
            this.clearIkTarget();
        }
        // ap.getSignal("ikSelectionChanged").add(this.onIkSelectionChanged);
    }

    public onTransformChanged(pair: [TransformControls, THREE.Object3D]) {
        if (pair != null) {
            let target = pair[1]
            if (target.userData.transformSelectionType == "BoneIk") {
                if (this.logging) {
                    console.log("IkController onTransformChanged");
                }

                if (this._mouseDown == false) {
                    if (this.logging) {
                        console.log("IkController not mouse down");
                    }
                    return;
                }

                if (this._solving) {
                    if (this.logging) {
                        console.log("IkController still solving ignored");
                    }
                    return;
                }
                this._solving = true;
                var solved = this.solveIk(false);
                //_ikSolved overwrited in solveOtherIkTargets
                this._solving = false;

                if (solved) {
                    this._ikSolved[this.getIkNameFromTarget(target)] = true;
                    if (this.logging) {
                        console.log("ik solved", this.getIkNameFromTarget(target));
                    }
                    //solve others,TODO independent
                    if (!this.followOtherIkTargets) {
                        this.solveOtherIkTargets();
                    }
                }

                this.boneAttachController.update();
            } else {
                this.updateIkTargets()
            }
        }
    }

    public onTransformRotateChanged(pair: [TransformControls, THREE.Object3D]) {
        if (pair != null) {
            let target = pair[1]
            if (target.userData.transformSelectionType == "Joint") {
                this.updateIkTargets()
            }
        }
    }

    public onTransformStarted(target: THREE.Object3D) {
        if (target != null && target.userData.transformSelectionType == "BoneIk") {
            if (this.logging) {
                console.log("IkController onTransformStarted");
            }
            this._mouseDown = true;

            this._ikSolved = {};//reset all

            /*
             * TODO add fixed attribute
             * this is for non-follow ik target & resolve,however sometime this reset move iktarget position.
             */
            this.resetAllIkTargets(this.getIkNameFromTarget(target));//for previus selected iktarget
        }
    }

    public onTransformFinished(target: THREE.Object3D) {
        var scope = this;
        if (target != null && target.userData.transformSelectionType == "BoneIk") {
            if (this.logging) {
                console.log("IkController onTransformFinished");
            }
            this._mouseDown = false;

            Object.keys(this._ikSolved).forEach(function(key) {
                if (scope._ikSolved[key] == true) {
                    var indices = scope.getEffectedBoneIndices(key);
                    indices.forEach(function(index) {
                        scope.signals._onBoneRotateChanged.dispatch(index);//really need?
                        if (scope.logging) {
                            console.log("IkController dispatch boneRotationChanged", index);
                        }
                        scope.signals._onBoneRotateFinished.dispatch(index);//really need?
                        if (scope.logging) {
                            console.log("IkController dispatch boneRotationFinished", index);
                        }
                    });
                }
            });
        }
    }

    public getEffectedBoneIndices(name: string) {
        var indices = this.iks[name].indices;

        var result = [];
        var length = this.isEnableEndSiteByName(name) ? indices.length : indices.length - 1;
        for (var i = 0; i < length; i++) {
            var index = indices[i];
            result.push(index);
        }
        return result;
    }


    public solveIk(forceUpdate: boolean = false) {

        if (this.logging) {
            console.log("call solveIk ", this.selectedIk);
        }
        var forceUpdate = forceUpdate != undefined ? forceUpdate : false;
        var scope = this;

        function getEndSitePos(lastMesh) {
            var position = lastMesh.position;
            if (scope.enableEndSite(lastMesh)) {
                position = lastMesh.userData.endsite.getWorldPosition(scope._pos);
            }
            return position;
        }


        if (this.selectedIk == null) {
            if (this.debug) {
                console.log("ikTarget is null");
            }
            return false;
        }

        var ikTargetName = this.selectedIk.name;
        var ikIndices = this.selectedIk.indices;

        var lastMesh = this.boneAttachController.getContainerList()[ikIndices[ikIndices.length - 1]];
        var targetMesh = this.selectedIk.target;



        var targetPos = targetMesh.position;
        if (this.lastTargetMovedPosition.equals(targetPos) && forceUpdate == false) {
            //this Ik need move or force
            if (this.debug) {
                console.log(ikTargetName, "lastTargetMovedPosition same as targetPos forceUpdate=", forceUpdate);
            }
            return false;
        }
        this.lastTargetMovedPosition.copy(targetPos);

        if (targetMesh.position.equals(getEndSitePos(lastMesh))) {
            if (this.debug) {
                console.log(ikTargetName, "ik target pos == endsitepos");
            }

            //no need to solve,just reseted
            return false;
        }


        for (var j = 0; j < this.iteration; j++) {
            var ikIndicesLength = scope.enableEndSite(lastMesh) ? ikIndices.length : ikIndices.length - 1;

            for (var i = 0; i < ikIndicesLength; i++) {
                var ikBoneIndex = ikIndices[i];

                if (this.ikBoneSelectedOnly && ikBoneIndex != this.boneSelectedIndex) {
                    if (this.logging) {
                        console.log("ik ikBoneSelectedOnly & skipped", ikBoneIndex);
                    }
                    continue;
                }

                var lastJointPos = getEndSitePos(lastMesh);

                var bone = this.boneAttachController.getBoneList()[ikBoneIndex];
                var name = bone.name;
                var joint = this.boneAttachController.getContainerList()[ikIndices[i]];
                var jointPos = joint.position;

                if (this.boneLocked[name]) {
                    if (this.logging) {
                        console.log("ik bonelocked & skipped", name);
                    }
                    continue;
                }

                // var jointRotQ = joint.quaternion;

                //TODO improve,maybe never happen exactlly equals
                if (targetPos.equals(lastJointPos)) {
                    if (this.logging) {
                        console.log(ikTargetName, "no need ik, skipped");
                    }
                    return false;
                }

                //var newQ=IkUtils.calculateAngles(lastJointPos,jointPos,jointRotQ,targetPos,this.maxAngle,false);

                var inverseQ = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
                if (!(bone.parent instanceof THREE.Bone)) {
                    //root but using skinned mesh quaterrnion,no problem.
                    //inverseQ=new THREE.Quaternion();//no parent;
                }

                var maxAngle = this.maxAngle * this.getBoneRatio(bone.name);

                /*not good at
                 * if(!this.ikLimitkRotationEnabled){
                 maxAngle=0;
                 }*/

                if (this.logging) {
                    console.log("ik maxAngle", name, maxAngle);
                }

                var newQ = IKUtils.stepCalculate2(inverseQ, lastJointPos, jointPos, targetPos, maxAngle);

                if (newQ == null) {
                    if (this.logging) {
                        console.log("null quaternion");
                    }
                    //maybe so small
                    continue;
                }

                var order = bone.rotation.order;
                var euler = this._euler.setFromQuaternion(newQ, order);

                var r = bone.rotation;
                BoneUtils.convertToIkSafeRoatation(r);

                var x = r.x;
                var y = r.y;
                var z = r.z;

                if (BoneUtils.isD180(x) || BoneUtils.isD180(y) || BoneUtils.isD180(z)) {
                    AppUtils.printDeg(r, "not safe ik angles");
                    continue;
                }

                if (this.ikLimitkRotationEnabled) {
                    function toDegree(v1: number, v2: number) {
                        var tmp = THREE.MathUtils.radToDeg(v1 + v2);
                        if (tmp > 180) {
                            tmp -= 360;
                        }
                        if (tmp < -180) {
                            tmp += 180;
                        }
                        //console.log(v1,v2,tmp);
                        return tmp;
                    }

                    const limitMin = this.ikLimitMin[bone.name];
                    const limitMax = this.ikLimitMax[bone.name];

                    if (!limitMin) {
                        if (this.logging)
                            console.log("no ikLimitMin", bone.name);
                    } else {
                        var tmpX = toDegree(x, euler.x);
                        if (!this.ikLockX && tmpX >= limitMin.x && tmpX <= limitMax.x) {
                            x = x + euler.x;
                            //console.log(bone.name,"ok",limitMin.x,limitMax.x,tmpX);
                        } else {
                            if (this.debug)
                                console.log(bone.name, "limit-x", limitMin.x, limitMax.x, tmpX);
                        }
                        var tmpY = toDegree(y, euler.y);
                        if (!this.ikLockY && tmpY >= limitMin.y && tmpY <= limitMax.y) {
                            y = y + euler.y;
                        } else {
                            if (this.debug)
                                console.log(bone.name, "limit-y", limitMin.y, limitMax.y, tmpY);
                        }
                        var tmpZ = toDegree(z, euler.z);
                        if (!this.ikLockZ && tmpZ >= limitMin.z && tmpZ <= limitMax.z) {
                            z = z + euler.z;
                        } else {
                            if (this.debug)
                                console.log(bone.name, "limit-z", limitMin.z, limitMax.z, tmpZ);
                        }

                        //fix rad
                        if (x > Math.PI) {
                            x -= Math.PI * 2;
                        }
                        if (y > Math.PI) {
                            y -= Math.PI * 2;
                        }
                        if (z > Math.PI) {
                            z -= Math.PI * 2;
                        }
                        if (x < -Math.PI) {
                            x += Math.PI * 2;
                        }
                        if (y < -Math.PI) {
                            y += Math.PI * 2;
                        }
                        if (z < -Math.PI) {
                            z += Math.PI * 2;
                        }
                    }
                } else {
                    if (this.logging) {
                        console.log("ik not limited", name, euler.x.toFixed(2), euler.y.toFixed(2), euler.z.toFixed(2));
                    }
                    x = x + euler.x;
                    y = y + euler.y;
                    z = z + euler.z;
                }

                bone.rotation.set(x, y, z);

                //bone.quaternion.multiply(newQ); //somehow not stable
            }

            this.boneAttachController.updateMatrix();
            for (var i = ikIndicesLength; i >= 0; i--) {
                this.boneAttachController.updateOne(ikIndices[i]);
            }
        }

        if (this.followOtherIkTargets) {
            this.resetAllIkTargets(ikTargetName);
        }

        return true;
    };

}
