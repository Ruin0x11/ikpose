import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder"
import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial"
import { Light } from "@babylonjs/core/Lights/light"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { GizmoManager } from "@babylonjs/core/Gizmos/gizmoManager"
import * as dat from 'dat.gui';

import { SampleMaterial } from "./Materials/SampleMaterial"
import { IKModel } from "./IKModel"

export class PoserScene extends Scene {
    light: Light;
    private mesh: Mesh;
    private material: ShaderMaterial;
    private models: Array<IKModel> = [];
    private gizmoManager: GizmoManager;

    private options: any = {
        showSkeleton: true
    }

    constructor(engine: Engine) {
        super(engine);

        this.light = new HemisphericLight(
            "light",
            new Vector3(0, 1, 0),
            this)

        this.mesh = MeshBuilder.CreateGround("mesh", {}, this)

        this.material = new SampleMaterial("material", this)
        this.mesh.material = this.material

        this.gizmoManager = new GizmoManager(this)
        this.gizmoManager.positionGizmoEnabled = true;
        this.gizmoManager.rotationGizmoEnabled = true;
        this.gizmoManager.scaleGizmoEnabled = true;
        this.gizmoManager.boundingBoxGizmoEnabled = true;

        this.loadModel("assets/models/", "Dude.babylon");

        this.setupGui();

        this.registerBeforeRender(() => this.update())
    }

    loadModel(rootDir: string, filename: string) {
        const model = new IKModel(rootDir, filename, this);
        this.models.push(model);
    }

    update() {
        this.models.forEach(model => model.updateIks())
    }

    private setupGui() {
        var oldgui = document.getElementById("datGUI");
        if (oldgui != null) {
            oldgui.remove();
        }

        var gui = new dat.GUI();
        gui.domElement.style.marginTop = "0px";
        gui.domElement.id = "datGUI";

        gui.add(this.options, "showSkeleton").onChange((value: boolean) => this.toggleSkeletonViewer(value));
    }

    private toggleSkeletonViewer(needed: boolean) {
        this.models.forEach((model) => model.showSkeleton(needed))
    }
}
