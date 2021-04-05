import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder"
import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial"
import { Light } from "@babylonjs/core/Lights/light"
import { Mesh } from "@babylonjs/core/Meshes/mesh"

import { SampleMaterial } from "./Materials/SampleMaterial"

export class PoserScene extends Scene {
    light: Light;
    mesh: Mesh;
    material: ShaderMaterial;

    constructor(engine: Engine) {
        super(engine);

        this.light = new HemisphericLight(
            "light",
            new Vector3(0, 1, 0),
            this)

        this.mesh = MeshBuilder.CreateGround("mesh", {}, this)

        this.material = new SampleMaterial("material", this)
        this.mesh.material = this.material
    }
}
