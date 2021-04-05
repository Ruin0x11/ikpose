import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/loaders";
import "@babylonjs/core/Loading/Plugins/babylonFileLoader"
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera"
import { Engine } from "@babylonjs/core/Engines/engine"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"

import { PoserScene } from "./PoserScene"
import { ArcRotateCameraMouseWheelInput } from "@babylonjs/core";

const view = document.getElementById("view") as HTMLCanvasElement
const engine = new Engine(view, true)
const scene = new PoserScene(engine)

const camera = new ArcRotateCamera(
    "camera",
    Math.PI / 2,
    Math.PI / 3.2,
    200,
    Vector3.Zero(),
    scene)

const mousewheel = camera.inputs.attached.mousewheel as ArcRotateCameraMouseWheelInput;
mousewheel.wheelPrecision = 100;

camera.attachControl(view)

engine.runRenderLoop(() => {
    scene.render();
})

window.addEventListener("resize", function() {
    engine.resize();
});
