import domready from "domready"
import "./style.css"

const PHI = (1 + Math.sqrt(5)) / 2;
const TAU = Math.PI * 2;
const DEG2RAD_FACTOR = TAU / 360;

const config = {
    width: 0,
    height: 0
};

/**
 * @type CanvasRenderingContext2D
 */
let ctx;
let canvas;

/**
 * @type CanvasRenderingContext2D
 */
let tmpCtx;
let tmpCanvas;


function createChecker()
{
    const { width, height} = config

    const imageData = ctx.createImageData(width, height)
    const { data } = imageData

    let off = 0
    for (let y = 0 ; y < height ; y++)
    {
        for (let x = 0 ; x < width ; x++)
        {
            const v = ((x + y) & 1) * 255

            data[off] = v
            data[off + 1] = v
            data[off + 2] = v
            data[off + 3] = 255

            off += 4
        }
    }

    return imageData
}


domready(
    () => {

        canvas = document.getElementById("screen");
        tmpCanvas = document.createElement("canvas")
        ctx = tmpCanvas.getContext("2d");

        const width = (window.innerWidth) | 0;
        const height = (window.innerHeight) | 0;

        config.width = width;
        config.height = height;

        canvas.width = width;
        canvas.height = height;

        tmpCanvas.width = width;
        tmpCanvas.height = height;

        tmpCtx = canvas.getContext("2d");

        const paint = () => {

            ctx.fillStyle = "#000";
            ctx.fillRect(0,0, width, height);

            ctx.putImageData(createChecker(), 0, 0)


            tmpCtx.drawImage(tmpCanvas, 0 ,0, width >> 1, height >> 1)
        }

        paint()

        canvas.addEventListener("click", paint, true)
    }
);
