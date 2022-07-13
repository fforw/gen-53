import domready from "domready"
import "./style.css"
import distanceToLine from "./distanceToLine"
import isClockwise from "./isClockwise"

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

let x0,y0

function onMouseMove(ev)
{
    x0 = ev.clientX;
    y0 = ev.clientY;
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

        x0 = Math.round(width * Math.random())
        y0 = Math.round(height * Math.random())

        const x1 = Math.round(width * Math.random())
        const y1 = Math.round(height * Math.random())
        const x2 = x1//Math.round(width * Math.random())
        const y2 = Math.round(height * Math.random())

        const paint = () => {



            const d = distanceToLine(x0,y0,x1,y1,x2,y2)

            ctx.fillStyle = "#000";
            ctx.fillRect(0,0, width, height);


            ctx.strokeStyle = "#fff"
            ctx.beginPath()
            ctx.moveTo(x1,y1)
            ctx.lineTo(x2,y2)
            ctx.lineTo(x0,y0)
            ctx.lineTo(x1,y1)
            ctx.stroke()

            ctx.fillStyle = "#f00"
            ctx.fillRect(x1-2,y1-2,4,4)
            ctx.fillStyle = "#0f0"
            ctx.fillRect(x2-2,y2-2,4,4)

            ctx.fillStyle = "#ff0"
            ctx.fillRect(x0-2,y0-2,4,4)

            ctx.fillStyle = "#fff"
            ctx.fillText("Distance = " + d, 30, 30)
            ctx.fillText("clockwise = " + isClockwise(x1,y1,x2,y2,x0,y0), 30, 50)

            requestAnimationFrame(paint)
        }

        paint()

        canvas.addEventListener("click", paint, true)
        canvas.addEventListener("mousemove", onMouseMove, true)
    }
);

