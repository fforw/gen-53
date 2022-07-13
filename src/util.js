export function clamp(v)
{
    return v < 0 ? 0 : v > 1 ? 1 : v;
}

// r² = oy² + ox²
// r² - oy² = ox²

export function circle(x, y, r, op)
{
    const rSquared = r * r
    for (let oy = -r; oy < r; oy++)
    {
        const xOff = Math.round(Math.sqrt(rSquared - oy * oy))
        for (let ox = -xOff; ox < xOff; ox++)
        {
            op(x + ox, y + oy)
        }
    }
}

