import * as THREE from "three";
import * as BoneUtils from "./BoneUtils";
import * as AppUtils from "./AppUtils";

import { BoneAttachController } from "./BoneAttachController";
import { Signals } from "./Signals";
import { IKController } from "./IKController";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";

export class JointController {
    public logging: boolean = false;

    private selectedJoint: THREE.Object3D;
    private _mouseDown = false;
    private _enabled = true;

    constructor(private signals: Signals, private boneAttachController: BoneAttachController, private ikController: IKController) {
    }

    public setJointTarget(target: THREE.Object3D) {
        if (target == null) {
            this.selectedJoint = null;
            this.signals._onJointSelectionChanged.dispatch(null);
        } else {
            this.selectedJoint = target
            this.signals._onJointSelectionChanged.dispatch(target);
        }
    }

    public clearJointTarget() {
        this.setJointTarget(null);
    }

    public onTransformSelectionChanged(target: THREE.Object3D) {
        var scope = this;

        if (target == null) {
            this.clearJointTarget();
        } else if (target.userData.transformSelectionType == "Joint" && target.userData.isTargetable && this._enabled) {
            if (scope.logging) {
                console.log("JointController onTransformSelectionChanged");
            }

            scope.setJointTarget(target);
        } else {//other
            this.clearJointTarget();
        }
    }

    public onTransformChanged(pair: [TransformControls, THREE.Object3D]) {
        if (pair != null && pair[1].userData.transformSelectionType == "Joint" && pair[1].userData.isTargetable) {
            let target = pair[1]

            let bone: THREE.Bone = target.userData.bone

            const limitMin = this.ikController.ikLimitMin[bone.name];
            const limitMax = this.ikController.ikLimitMax[bone.name];

            // let r = target.rotation
            // console.log("WORLD", target.rotation)
            // console.log("BONE", bone.rotation)

            let newR = new THREE.Quaternion()
            newR.copy(target.quaternion)

            let q = new THREE.Quaternion();
            this.boneAttachController.object3d.getWorldQuaternion(q)
            q.invert()
            let q2 = new THREE.Quaternion();
            bone.getWorldQuaternion(q2);
            q2.invert()

            newR.multiply(q)
            newR.multiply(q2)

            let r = newR;

            // console.log("WORLD IN BONE", r)

            let x = r.x
            let y = r.y
            let z = r.z

            if (limitMin) {
                var minX = THREE.MathUtils.degToRad(limitMin.x);
                var maxX = THREE.MathUtils.degToRad(limitMax.x);
                var minY = THREE.MathUtils.degToRad(limitMin.y);
                var maxY = THREE.MathUtils.degToRad(limitMax.y);
                var minZ = THREE.MathUtils.degToRad(limitMin.z);
                var maxZ = THREE.MathUtils.degToRad(limitMax.z);
                x = Math.max(Math.min(x, maxX), minX)
                y = Math.max(Math.min(y, maxY), minY)
                z = Math.max(Math.min(z, maxZ), minZ)

                // if (r.x > Math.PI) {
                //     r.x -= Math.PI * 2;
                // }
                // if (r.y > Math.PI) {
                //     r.y -= Math.PI * 2;
                // }
                // if (r.z > Math.PI) {
                //     r.z -= Math.PI * 2;
                // }
                // if (r.x < -Math.PI) {
                //     r.x += Math.PI * 2;
                // }
                // if (r.y < -Math.PI) {
                //     r.y += Math.PI * 2;
                // }
                // if (r.z < -Math.PI) {
                //     r.z += Math.PI * 2;
                // }

                // console.log("LIMIT", r)
            }

            // r.x = x
            // r.y = y
            // r.z = z

            bone.getWorldQuaternion(q2);
            r.multiply(q2)
            this.boneAttachController.object3d.getWorldQuaternion(q);
            r.multiply(q)

            // target.setRotationFromQuaternion(r)
        }
    }

    public onTransformRotateChanged(pair: [TransformControls, THREE.Object3D]) {
        if (pair != null && pair[1] instanceof THREE.Bone) {
            let bone: THREE.Bone = pair[1]
            if (this.logging) {
                console.log("JointController onTransformChanged");
            }

            if (this._mouseDown == false) {
                if (this.logging) {
                    console.log("JointController not mouse down");
                }
                return;
            }

            // let bone: THREE.Bone = target.userData.bone

            // var r = target.rotation;

            // console.log("WORLD", bone.getWorldQuaternion(new THREE.Quaternion()))
            // let r = target.quaternion;
            // console.log("TARGET", r)

            // // bone.rotation.y = y
            // // target.rotation.y = y
            // console.log("BEF", bone.quaternion)
            // bone.setRotationFromQuaternion(r)
            // target.updateMatrixWorld(true);
            // bone.updateMatrixWorld(true);
            // console.log("AF", bone.quaternion)
            // bone.updateMatrixWorld(true);
            // target.updateMatrixWorld(true)
            // pair[0].rotation.set(x, y, z)
            // this.boneAttachController.update()
        }
    }

    public onTransformStarted(target: THREE.Object3D) {
        if (target != null && target.userData.transformSelectionType == "Joint" && target.userData.isTargetable) {
            if (this.logging) {
                console.log("JointController onTransformStarted");
            }
            this._mouseDown = true;
        }
    }

    public onTransformFinished(target: THREE.Object3D) {
        if (target != null && target.userData.transformSelectionType == "Joint" && target.userData.isTargetable) {
            if (this.logging) {
                console.log("JointController onTransformFinished");
            }
            this._mouseDown = false;
        }
    }
}
