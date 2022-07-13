export default function isClockwise(x0, y0, x1, y1, x2, y2)
{
    return ((x2 - x0) * (y1 - y0) - (y2 - y0) * (x1 - x0)) <= 0;
}
