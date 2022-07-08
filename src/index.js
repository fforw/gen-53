import domready from "domready"
import "./style.css"
import randomPalette from "./randomPalette"
import blurRGBA from "glur"
import blurMono16 from "glur/mono16"
import Color from "./Color"

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

const TO_LINEAR = 2.4
const FROM_LINEAR = 1/TO_LINEAR
const BLUR_MAP_BLUR = 9


function distort(map)
{
    const { width, height } = config

    const count = 250 + Math.random() * 50

    for (let i=0; i < count; i++)
    {
        const count = 5 + Math.random() * 15

        const x = Math.round(Math.random() * width)
        const y = Math.round(Math.random() * height)
        const l = Math.round(250 + 100 * Math.random())

        for (let j = 0; j < count; j++)
        {
            const xOff = Math.round((-0.5 + Math.random()) * 10) * 2
            const yOff = Math.round((-0.5 + Math.random()) * 200)

            const thick = Math.random() < 0.3
            for (let y2 = 0; y2 < l; y2++)
            {
                const off = (y + y2 + yOff) * width + x + xOff
                map[off] = 32768 - map[off]
                if (thick)
                {
                    map[off + 1] = 32768 - map[off + 1]
                }
                //map[off] -= 10000
            }
        }
    }
}


function createBlurMap()
{
    const { width, height } = config


    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height


    const ctx = canvas.getContext("2d")

    ctx.fillStyle = "#000";
    ctx.fillRect(0,0, width, height);

    ctx.fillStyle = "#ccc";

    for (let i=0; i < 10000; i++)
    {
        const x = Math.round(width * Math.random())
        const y = Math.round(height * Math.random())

        const rnd = Math.random()
        const size = 4 + Math.pow(rnd, 2) * 4
        const hSize = size/2
        ctx.fillRect(x - hSize, y - hSize, size, size)
    }

    const { data : src } = ctx.getImageData(0,0,width,height)

    const map = new Uint16Array(width * height)

    let off = 0
    for (let i = 0; i < src.length; i += 4)
    {
        const r = Math.pow(src[i    ]/255, TO_LINEAR)
        const g = Math.pow(src[i + 1]/255, TO_LINEAR)
        const b = Math.pow(src[i + 2]/255, TO_LINEAR)
        map[off++] = Math.floor(Math.pow( 0.2126 * r + 0.7152 * g + 0.0722 * b, FROM_LINEAR) * 65535)
    }

    //console.log("before blur", map)

    blurMono16(map, width, height, BLUR_MAP_BLUR)

    distort(map)

    //console.log("after blur", map)
    //
    // canvas.style.position = "absolute"
    // canvas.style.top = "0px"
    // canvas.style.left = "0px"
    // canvas.style.zIndex = "10"
    // document.body.appendChild(canvas)
    //
    // const imageData = ctx.createImageData(width, height)
    //
    // const { data } = imageData;
    // let off2 = 0
    // for (let i = 0; i < map.length; i++)
    // {
    //     const lum = map[i]/255
    //     data[off2] = lum
    //     data[off2 + 1] = lum
    //     data[off2 + 2] = lum
    //     data[off2 + 3] = 255
    //     off2 += 4
    // }
    //
    // ctx.putImageData(imageData, 0, 0)

    return map
}


function createCopy(imageData)
{
    const copy = ctx.createImageData(imageData)

    const { data : src } = imageData
    const { data : dst } = copy
    for (let i = 0; i < src.length; i++)
    {
        dst[i] = src[i]
    }
    return copy
}


function applyBlurMap(blurMap, imageData, copy)
{
    const { data : blurred } = imageData
    const { data : orig } = copy

    let off = 0
    for (let i = 0; i < blurred.length; i += 4)
    {
        let r0 = blurred[i    ]
        let g0 = blurred[i + 1]
        let b0 = blurred[i + 2]
        const r1 = orig[i    ]
        const g1 = orig[i + 1]
        const b1 = orig[i + 2]

        const lum = blurMap[off++]/32768

        r0 = r0 + (r1 - r0) * lum
        g0 = g0 + (g1 - g0) * lum
        b0 = b0 + (b1 - b0) * lum

        blurred[i    ] = r0
        blurred[i + 1] = g0
        blurred[i + 2] = b0
    }
}


domready(
    () => {

        canvas = document.getElementById("screen");
        ctx = canvas.getContext("2d");

        const width = (window.innerWidth) | 0;
        const height = (window.innerHeight) | 0;

        config.width = width;
        config.height = height;

        canvas.width = width;
        canvas.height = height;

        const paint = () => {

            const exp = 2 + Math.random() * 10;
            //const blurRadius = 50//Math.round(4 + Math.random() * 16);
            const palette = randomPalette()

            ctx.fillStyle = "#000";
            ctx.fillRect(0,0, width, height);

            const numLayers = Math.round(2 + Math.random() * 2)

            for (let i=0; i < numLayers; i++)
            {
                const blurMap = createBlurMap()
                const numShapes = 1000 / numLayers
                for (let j=0; j < numShapes; j++)
                {
                    const x = Math.round(width * Math.random())
                    const y = Math.round(height * Math.random())
                    ctx.fillStyle = Color.from(palette[0|Math.random() * palette.length]).toRGBA(0.4 + Math.pow(Math.random(),exp) * 0.6)

                    const rnd = Math.random()
                    const size = 2 + Math.pow(rnd, 8) * 128


                    const hSize = size/2
                    if (Math.random() < 0.5)
                    {
                        ctx.beginPath()
                        ctx.moveTo(x + size, y)
                        ctx.arc(x , y, size, 0, TAU, true)
                        ctx.fill()
                    }
                    else
                    {
                        ctx.fillRect(x - hSize, y - hSize, size, size)
                    }
                }

                const imageData = ctx.getImageData(0,0,width, height)
                const copy = createCopy(imageData)

                blurRGBA(imageData.data, width, height, Math.round(10 + Math.random() * 40))

                applyBlurMap(blurMap, imageData, copy)

                ctx.putImageData(imageData, 0, 0)

            }

        }

        paint()

        canvas.addEventListener("click", paint, true)
    }
);


export default {
    minmax: array => {
        let min = Infinity
        let max = -Infinity

        for (let i = 0; i < array.length; i++)
        {
            const elem = array[i]

            min = Math.min(min, elem)
            max = Math.max(max, elem)
        }

        return [min,max]
    }
}
