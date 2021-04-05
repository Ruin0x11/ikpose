import { Skeleton } from "@babylonjs/core/Bones/skeleton";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { AssetsManager } from "@babylonjs/core/Misc";
import { MeshAssetTask } from "@babylonjs/core/Misc/assetsManager";
import { Scene } from "@babylonjs/core/scene";

export class IKModel {
    private mesh: AbstractMesh;
    private skeleton: Skeleton;

    constructor(private rootDir: string, private filename: string, private readonly scene: Scene) {
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
        console.error(`Unable to load spaceship mesh: ${message}`);
        throw new Error('Error loading spaceship assets');
    }

    private onMeshLoadSuccess(task: MeshAssetTask, parent: IKModel): void {
        this.mesh = task.loadedMeshes[0];
        this.skeleton = task.loadedSkeletons[0];
    }
}
