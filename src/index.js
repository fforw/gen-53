import domready from "domready"
import { polygonLength } from "d3-polygon"
import "./style.css"
import { randomPaletteWithBlack } from "./randomPalette"
import blurRGBA from "glur"
import blurMono16 from "glur/mono16"
import Color from "./Color"
import distanceToLine from "./distanceToLine"
import isClockwise from "./isClockwise"
import AABB from "./AABB"
import weightedRandom from "./weightedRandom"
import { circle } from "./util"

const DEBUG_FILL = 0
const DEBUG_BLURMAP = 0

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

const TO_LINEAR = 2.4
const FROM_LINEAR = 1/TO_LINEAR
const BLUR_MAP_BLUR = 10


function xorPixel(map, x0, y0) {
    const { width, height } = config

    if (x0 >= 0 && x0 < width && y0 >= 0 && y0 <= height)
    {
        const off = y0 * width + x0
        map[off] = 65536 - map[off]
    }
}

function blackPixel(map, x0, y0) {
    const { width, height } = config

    if (x0 >= 0 && x0 < width && y0 >= 0 && y0 <= height)
    {
        const off = y0 * width + x0
        map[off] = 0
    }
}

function whitePixel(map, x0, y0) {
    const { width, height } = config

    if (x0 >= 0 && x0 < width && y0 >= 0 && y0 <= height)
    {
        const off = y0 * width + x0
        map[off] = 65536
    }
}

function greyPixel(map, x0, y0) {
    const { width, height } = config

    if (x0 >= 0 && x0 < width && y0 >= 0 && y0 <= height)
    {
        const off = y0 * width + x0
        map[off] = 40000
    }
}

const OP_XOR = "xor"
const OP_BLACK = "black"
const OP_WHITE = "white"


function line(x0, y0, x1, y1, op = xorPixel) {

    const dx = Math.abs(x1 - x0)
    const dy = Math.abs(y1 - y0)
    const sx = (x0 < x1) ? 1 : -1
    const sy = (y0 < y1) ? 1 : -1
    let err = dx - dy

    while(true) {

        op(x0,y0)

        if ((x0 === x1) && (y0 === y1)) break;
        const e2 = 2 * err
        if (e2 > -dy) { err -= dy; x0  += sx; }
        if (e2 < dx) { err += dx; y0  += sy; }
    }
}

function randomTwo(array)
{
    const rnd0 = 0|Math.random() * array.length
    let rnd1
    do
    {
        rnd1 = 0|Math.random() * array.length
    } while( rnd0 === rnd1 )

    return [ array[rnd0], array[rnd1] ]
}


function randomEdgePoint(shape)
{
    const edge = 0 | Math.random() * shape.length
    const t = Math.random()
    const [x0, y0] = shape[edge]
    const [x1, y1] = edge === shape.length - 1 ? shape[0] : shape[edge + 1]

    const x = x0 + (x1 - x0) * t
    const y = y0 + (y1 - y0) * t

    return [x,y]
}

const randomOp = weightedRandom([
    10, () => xorPixel,
    5, () => blackPixel,
    2, () => whitePixel,
])

function distort(map, shapes)
{
    for (let i = 0; i < shapes.length; i++)
    {
        const shape = shapes[i]
        
        const [[x0,y0],[x1,y1]] = randomTwo(shape)
        const angle = Math.atan2(y1-y0,x1-x0) + TAU/4

        const polyLen = polygonLength(shape)

        const count = Math.round((0.7 + Math.random() * 0.3) * polyLen)
        for (let j=0; j < count; j++)
        {
            const [x,y] = randomEdgePoint(shape)

            const len = Math.round((1 + Math.random() * 1.2) * Math.sqrt(polyLen))
            const offset = Math.round((-0.4 + 0.4 + Math.random() * 0.4) * polyLen)

            const x0 = Math.round(x + Math.cos(angle) * offset)
            const y0 = Math.round(y + Math.sin(angle) * offset)
            const x1 = Math.round(x0 + Math.cos(angle) * len)
            const y1 = Math.round(y0 + Math.sin(angle) * len)

            let op = randomOp()
            line(x0, y0, x1, y1, (x,y) => op(map,x,y))
            if(Math.random() < 0.5)
            {
                line(x0+1, y0, x1 + 1, y1, (x,y) => op(map,x,y))
            }
        }
    }
}


function createBlurMap(shapes)
{
    const { width, height } = config


    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext("2d")

    ctx.fillStyle = "#fff";
    ctx.fillRect(0,0, width, height);
    ctx.fillStyle = "#000";
    for (let i=0; i < 5; i++)
    {
        const x = Math.round(width * Math.random())
        const y = Math.round(height * Math.random())

        const rnd = Math.random()
        const size = 150 + Math.pow(rnd, 2) * 200

        ctx.beginPath()
        ctx.moveTo(x + size, y);
        ctx.arc(x, y, size, 0, TAU, true)
        ctx.fill()
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
    distort(map, shapes)

    const count = Math.round(20 + Math.random() * 30)

    for (let i=0; i < count; i++)
    {
        const x = Math.round(width * Math.random())
        const y = Math.round(height * Math.random())

        const rnd = Math.random()
        const size = Math.round(25 + rnd * 20)

        circle(x,y,size, (x,y) => greyPixel(map,x,y))
    }

    if (DEBUG_BLURMAP)
    {

        for (let i = 0; i < shapes.length; i++)
        {
            const shape = shapes[i]

            const last = shape.length - 1
            for (let j = 0; j < shape.length; j++)
            {
                const [x0,y0] = shape[j]
                const [x1,y1] = j === last ? shape[0] : shape[j + 1]

                line(x0,y0,x1,y1, (x,y) => xorPixel(map, x,y))

            }
        }

        console.log("after blur", map)

        canvas.style.position = "absolute"
        canvas.style.top = "0px"
        canvas.style.left = "0px"
        canvas.style.zIndex = "10"
        document.body.appendChild(canvas)

        const imageData = ctx.createImageData(width, height)

        const { data } = imageData;
        let off2 = 0
        for (let i = 0; i < map.length; i++)
        {
            const lum = map[i]/255
            data[off2] = lum
            data[off2 + 1] = lum
            data[off2 + 2] = lum
            data[off2 + 3] = 255
            off2 += 4
        }

        ctx.putImageData(imageData, 0, 0)

    }

    return map
}


function createCopy(ctx, imageData)
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
        let a0 = blurred[i + 3]
        const r1 = orig[i    ]
        const g1 = orig[i + 1]
        const b1 = orig[i + 2]
        const a1 = blurred[i + 3]

        const lum = blurMap[off++]/32768

        r0 = r0 + (r1 - r0) * lum
        g0 = g0 + (g1 - g0) * lum
        b0 = b0 + (b1 - b0) * lum
        a0 = a0 + (a1 - a0) * lum

        blurred[i    ] = r0
        blurred[i + 1] = g0
        blurred[i + 2] = b0
        blurred[i + 3] = a0
    }
}


function randomShape(diameter)
{
    const { width, height } = config

    const x = Math.round(width * Math.random())
    const y = Math.round(height * Math.random())

    const radius = diameter/2

    const points = []
    const resolution = Math.max(5, Math.ceil(Math.sqrt(TAU * radius) * 0.3))

    const step = TAU/resolution;
    for (let i = 0; i < resolution; i++)
    {
        const angle = step * i

        const r = (Math.random() * 0.5 + 0.5 )* radius
        points.push([
            Math.round(x + Math.cos(angle) * r),
            Math.round(y + Math.sin(angle) * r)
        ])
    }
    return points
}

function getDistance(x0,y0,x1,y1)
{
    const dx = x1 - x0
    const dy = y1 - y0

    return Math.sqrt(dx * dx + dy * dy)
}

function paintShape(ctx, shape, roundness)
{
    ctx.beginPath()
    const last = shape.length - 1
    const [x, y] = shape[last]
    ctx.moveTo(x,y);

    let prevX, prevY

    prevX = x
    prevY = y

    for (let i = 0; i < shape.length; i++)
    {
        const [x, y] = shape[i]

        if (!roundness[i])
        {
            ctx.lineTo(x,y)
        }
        else
        {
            const [x2, y2] = i === last ? shape[0] : shape[i + 1]
            const r = Math.min(getDistance(prevX, prevY, x, y), getDistance(x, y, x2, y2)) * 0.33
            ctx.arcTo(x,y, x2,y2, r);
        }

        prevX = x
        prevY = y
    }
    ctx.fill()
}




/*
    x0/y0 x1/y1

    
 */

function drawLine(x0,y0,angle)
{
    const x1 = x0 + Math.cos(angle) * 2000
    const y1 = y0 + Math.sin(angle) * 2000
    const x2 = x0 - Math.cos(angle) * 2000
    const y2 = y0 - Math.sin(angle) * 2000

    ctx.strokeStyle = "#000"
    ctx.beginPath()
    ctx.moveTo(x1,y1)
    ctx.lineTo(x2,y2)
    ctx.stroke()

}

function getGradientCoords(centroidX, centroidY, angle, shape)
{
    const perpendicularAngle = angle + TAU / 4
    const x1 = centroidX + Math.cos(angle) * 2000
    const y1 = centroidY + Math.sin(angle) * 2000
    const x2 = centroidX - Math.cos(angle) * 2000
    const y2 = centroidY - Math.sin(angle) * 2000

    let minDist = Infinity
    let maxDist = -Infinity
    for (let i = 0; i < shape.length; i++)
    {
        const [x, y] = shape[i]

        // calculate signed distance
        const d = distanceToLine(x,y, x1, y1, x2, y2) * (isClockwise(x1, y1, x2, y2, x, y) ? -1 : 1)

        if (d < minDist)
        {
            minDist = d
        }
        if (d > maxDist)
        {
            maxDist = d
        }
    }

    //console.log({minDist, maxDist})
    return [
        centroidX + Math.cos(perpendicularAngle) * minDist,
        centroidY + Math.sin(perpendicularAngle) * minDist,
        centroidX + Math.cos(perpendicularAngle) * maxDist,
        centroidY + Math.sin(perpendicularAngle) * maxDist
    ]

}


/**
 * Creates a random gradient fill for the given shape
 *
 * @param palette
 * @param shape
 * @param alpha
 * @return {*}
 */
function randomFill(ctx, palette, shape, alpha = 1)
{
    const a = palette[0|Math.random() * palette.length]
    const b = palette[0|Math.random() * palette.length]

    if ( a === b)
    {
        //console.log("Constant color: ", a)
        return Color.from(a).toRGBA(alpha);
    }

    const [centroidX, centroidY] = getCentroid(shape)
    const angle = TAU * Math.random()

    const [x0,y0,x1,y1] = getGradientCoords(centroidX, centroidY, angle, shape)

    const gradient = ctx.createLinearGradient(x0,y0,x1,y1)
    gradient.addColorStop(0,Color.from(a).toRGBA(alpha))
    gradient.addColorStop(1,Color.from(b).toRGBA(alpha))

    //console.log("Gradient from", a, " to ", b, " at ", angle, "°, alpha", alpha)
    if (DEBUG_FILL)
    {

        drawLine(centroidX, centroidY, angle)
        drawLine(x0, y0, angle)
        drawLine(x1, y1, angle)

        ctx.fillStyle = "#080"
        ctx.fillRect(centroidX - 2, centroidY - 2, 4, 4)

        ctx.fillStyle = "#f00"
        ctx.fillRect(x0 - 2, y0 - 2, 4, 4)
        ctx.fillRect(x1 - 2, y1 - 2, 4, 4)

    }

    return gradient
}


function getCentroid(shape)
{
    let cx = 0, cy = 0, sum = 0
    for (let i = 0; i < shape.length; i++)
    {
        const [x, y] = shape[i]
        cx += x
        cy += y
        sum++
    }

    return [cx/sum,cy/sum]
}


function centerShape(shape)
{
    const out = [];

    const { width, height } = config

    const cx = width >> 1
    const cy = height >> 1

    const aabb = new AABB()

    for (let i = 0; i < shape.length; i++)
    {
        const [x, y] = shape[i]
        aabb.add(x,y)
    }

    const offX = cx - aabb.minX - aabb.width/2
    const offY = cy - aabb.minY - aabb.height/2

    for (let i = 0; i < shape.length; i++)
    {
        const [x, y] = shape[i]
        out.push([
            offX + x,
            offY + y
        ])
    }

    return out
}


function randomBooleans(length, limit = 0.5)
{
    const out = [ false ];
    for (let i = 1; i < length; i++)
    {
        out.push(Math.random() < limit)
    }
    return out
}


function strokeShape(ctx, shape, roundness, stroked)
{

    const stroke = (start,end) => {

        if (end - start < 2)
        {
            return
        }

        ctx.beginPath()
        const [x, y] = shape[start]
        ctx.moveTo(x,y);

        let prevX, prevY
        prevX = x
        prevY = y

        const last = shape.length - 1

        for (let i = start; i < end; i++)
        {
            const [x, y] = shape[i]

            if (!roundness[i])
            {
                ctx.lineTo(x,y)
            }
            else
            {
                const [x2, y2] = i === last ? shape[0] : shape[i + 1]
                const r = Math.min(getDistance(prevX, prevY, x, y), getDistance(x, y, x2, y2)) * 0.33
                ctx.arcTo(x,y, x2,y2, r);
            }

            prevX = x
            prevY = y
        }
        ctx.stroke()
    }

    let wasStroked = false
    let start = -1
    for (let i = 0; i < stroked.length; i++)
    {
        const isStroked = stroked[i]

        if (isStroked && !wasStroked)
        {
            start = i
        }
        else if (!isStroked && wasStroked)
        {
            stroke(start, i)
            start = -1
        }
        wasStroked = isStroked
    }

    if (start > 0)
    {
        stroke(start, stroked.length - 1)
    }

}


function rubStrokes(ctx)
{
    const { width, height } = config

    ctx.save()
    ctx.globalCompositeOperation = "destination-out"
    ctx.fillStyle = "#fff"
    ctx.lineWidth = 2
    const angle = TAU * Math.random();

    const count = 10 + Math.pow(Math.random(), 8) * 500
    for (let i=0; i < count; i++)
    {
        const x = Math.round(Math.random() * width)
        const y = Math.round(Math.random() * width)

        const len = 100 * Math.random() * 200
        ctx.beginPath()
        ctx.moveTo(x,y)
        ctx.lineTo(
            x + Math.cos(angle) * len,
            y + Math.cos(angle) * len,
        )
        ctx.stroke()
    }
    ctx.restore()
}


function glitter(ctx, palette, shapes, multiplier = 1)
{
    const count = Math.round((10 + 30 * Math.random()) * multiplier)
    for (let i=0; i < count; i++)
    {
        const shape = shapes[0|Math.random() * shapes.length]
        const center = shape[0|Math.random() * shape.length]

        const count = Math.round(5 + 4 * Math.random())
        const spread = 10 + Math.pow(Math.random(), 1) * 400
        for (let j = 0; j < count; j++)
        {
            const radius = 2 + Math.pow(Math.random(), 6) * 40

            const angle = Math.random() * TAU
            const r = spread * Math.random()

            const ox = center[0] + Math.cos(angle) * r
            const oy = center[1] + Math.sin(angle) * r

            const base = Math.random() < 0.6 ? palette[palette.length - 1] : "#fff"
            ctx.fillStyle = Color.from(base).toRGBA(0.3 + Math.pow(Math.random(), 5) * 0.69)
            ctx.beginPath()
            ctx.moveTo(ox + radius, oy)
            ctx.arc(ox, oy,radius, 0, TAU, true)
            ctx.fill()
        }
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

        tmpCanvas = document.createElement("canvas")
        tmpCanvas.width = width;
        tmpCanvas.height = height;

        tmpCtx = tmpCanvas.getContext("2d");

        const paint = () => {

            const exp = 2 + Math.random() * 10;
            //const blurRadius = 50//Math.round(4 + Math.random() * 16);
            const palette = randomPaletteWithBlack()

            ctx.fillStyle = "#fff";
            ctx.fillRect(0,0, width, height);



            const bgShape = [
                [0,0],
                [width,0],
                [width,height],
                [0,height]
            ];

            ctx.fillStyle = randomFill(ctx, palette, bgShape, 0.4)
            ctx.fillRect(0,0,width,height)

            const layers = [0.05 + Math.random() * 0.05, 0.3 + Math.random() * 0.3, 1 - Math.random() * 0.3]
            //const layers = [0.8]

            tmpCtx.clearRect(0,0,width,height)

            const shapes = []

            for (let i = 0; i < layers.length; i++)
            {
                const alpha = layers[i]
                const count = Math.round(3 + Math.random() * 5)

                for (let i = 0; i < count; i++)
                {
                    const size = 20 + Math.random() * 1000
                    const shape = randomShape(size)
                    const roundness = randomBooleans(shape.length)

                    ctx.fillStyle = randomFill(ctx, palette, shape, alpha)
                    paintShape(ctx, shape, roundness)

                    if (i > 0)
                    {
                        shapes.push(shape)
                    }
                }
            }

            glitter(ctx, palette, shapes, 0.5)

            const imageData = ctx.getImageData(0,0,width, height)
            const copy = createCopy(ctx, imageData)

            blurRGBA(imageData.data, width, height, 12)

            //console.log({shapes})

            const blurMap = createBlurMap(shapes)
            applyBlurMap(blurMap, imageData, copy)
            ctx.putImageData(imageData, 0, 0)

            glitter(ctx, palette, shapes, 0.25)

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
