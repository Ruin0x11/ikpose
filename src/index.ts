import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/loaders";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera"
import { Engine } from "@babylonjs/core/Engines/engine"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"

import { PoserScene } from "./PoserScene"
import { IKModel } from "./IKModel"

const view = document.getElementById("view") as HTMLCanvasElement
const engine = new Engine(view, true)

import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
console.log(SceneLoader.IsPluginForExtensionAvailable(".babylon"))

const scene = new PoserScene(engine)

const camera = new ArcRotateCamera(
    "camera",
    Math.PI / 2,
    Math.PI / 3.2,
    2,
    Vector3.Zero(),
    scene)

camera.attachControl(view)

const model = new IKModel("assets/models/", "Dude.babylon", scene);

engine.runRenderLoop(() => {
    scene.render();
})

window.addEventListener("resize", function() {
    engine.resize();
});
