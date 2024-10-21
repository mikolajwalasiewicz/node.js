window.onload = function() {
    const canvas = document.getElementById('mandelbrotCanvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size to cover the entire window
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    let maxIterations = 1000;
    let zoom = 400;  // Adjust zoom level here for close-up effect
    let offsetX = -0.743643887037151; // Focus on an interesting region
    let offsetY = 0.13182590420533;   // Focus on an interesting region

    // Mandelbrot calculation function
    function mandelbrot(cx, cy) {
        let x = 0, y = 0, iteration = 0;
        while (x * x + y * y <= 4 && iteration < maxIterations) {
            let xTemp = x * x - y * y + cx;
            y = 2 * x * y + cy;
            x = xTemp;
            iteration++;
        }
        return iteration;
    }

    // Drawing the Mandelbrot fractal
    function drawMandelbrot() {
        for (let px = 0; px < width; px++) {
            for (let py = 0; py < height; py++) {
                const x0 = (px - width / 2) / zoom + offsetX;
                const y0 = (py - height / 2) / zoom + offsetY;

                const iteration = mandelbrot(x0, y0);

                // Determine green shades for each point
                const colorValue = iteration === maxIterations ? 0 : 255 - Math.floor(iteration / maxIterations * 255);
                ctx.fillStyle = `rgb(0, ${colorValue}, 0)`;  // Green color for Mandelbrot effect
                ctx.fillRect(px, py, 1, 1);
            }
        }
    }

    drawMandelbrot();
}
