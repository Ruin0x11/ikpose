import { BoneIKController } from "@babylonjs/core/Bones/boneIKController";
import { Skeleton } from "@babylonjs/core/Bones/skeleton";
import { SkeletonViewer } from "@babylonjs/core/Debug/skeletonViewer";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { AssetsManager } from "@babylonjs/core/Misc";
import { MeshAssetTask } from "@babylonjs/core/Misc/assetsManager";
import { Scene } from "@babylonjs/core/scene";
import { IKGizmo } from "./IKGizmo";

export class IKModel extends TransformNode {
    public mesh: AbstractMesh;
    public skeleton: Skeleton;

    private scale: number = 1.0;
    private skeletonViewer: SkeletonViewer;
    private ikCtrls: Array<IKGizmo> = [];

    constructor(private rootDir: string, private filename: string, public readonly scene: Scene) {
        super("IKModel " + filename)
        this.scaling = new Vector3(this.scale, this.scale, this.scale)

        this.startMeshLoad();
    }

    private startMeshLoad() {
        const assetsManager = new AssetsManager(this.scene);
        const meshTask = assetsManager.addMeshTask('IKModelTask', '', this.rootDir, this.filename);
        meshTask.onSuccess = (res) => this.onMeshLoadSuccess(res, this);
        meshTask.onError = this.onMeshLoadFailure;
        assetsManager.load();
    }

    private onMeshLoadFailure(task: MeshAssetTask, message: string, exception?: any): void {
        throw new Error(`Unable to load mesh: ${message} ${exception}`);
    }

    private onMeshLoadSuccess(task: MeshAssetTask, parent: IKModel): void {
        this.mesh = task.loadedMeshes[0];
        this.mesh.parent = parent;
        this.skeleton = task.loadedSkeletons[0];

        this.skeletonViewer = new SkeletonViewer(this.skeleton, this.mesh, this.scene);
        this.skeletonViewer.displayMode = SkeletonViewer.DISPLAY_LINES;
        this.skeletonViewer.color = Color3.Green();
        this.skeletonViewer.update();

        this.skeleton.bones.forEach((bone, index) => {
            console.log(bone.name + " " + index);
            if (bone.children.length > 0) {
                this.ikCtrls[index] = new IKGizmo(this, bone)
            }
        })
        // this.ikCtrls[0] = new IKGizmo(this, this.skeleton.bones[14]);
    }

    public showSkeleton(show: boolean) {
        if (this.skeletonViewer) {
            this.skeletonViewer.isEnabled = show
            this.skeletonViewer.update();
        }
    }

    public updateIks() {
        this.ikCtrls.forEach(ctrl => ctrl.update())
    }
}
