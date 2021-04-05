import { PointerDragBehavior } from "@babylonjs/core/Behaviors/Meshes/pointerDragBehavior";
import { Bone } from "@babylonjs/core/Bones/bone";
import { BoneIKController } from "@babylonjs/core/Bones/boneIKController";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { IKModel } from "./IKModel";

export class IKGizmo extends TransformNode {
    private scale: number = 1.00;
    private ikCtrl: BoneIKController;
    private ctrlMesh: Mesh;
    private dragging: boolean;

    constructor(private model: IKModel, private bone: Bone) {
        super("IKBone")
        this.scaling = new Vector3(this.scale, this.scale, this.scale)

        this.ctrlMesh = MeshBuilder.CreateBox('', { size: 5 }, model.scene);
        this.ctrlMesh.position = this.bone.children[0].getAbsolutePosition();
        this.ctrlMesh.parent = model;

        let drag = new PointerDragBehavior();
        drag.onDragStartObservable.add(() => this.dragging = true)
        drag.onDragObservable.add((data, state) => {
            this.ikCtrl.update()
        })
        drag.onDragEndObservable.add(() => this.dragging = false)
        this.ctrlMesh.addBehavior(drag);

        let options = {
            targetMesh: this.ctrlMesh
        }
        this.ikCtrl = new BoneIKController(this.model.mesh, this.bone, options);
    }

    public update() {
        if (!this.dragging) {
            this.ctrlMesh.position = this.bone.children[0].getAbsolutePosition();
        }
    }
}
