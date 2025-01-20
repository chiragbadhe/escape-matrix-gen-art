import { createCanvas } from "canvas";
import { VercelRequest, VercelResponse } from "@vercel/node";

// Simple hash function to generate a consistent seed from input
function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// PRNG based on a simple linear congruential generator
function seededRandom(seed: number) {
  let value = seed % 2147483647;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function drawPattern(canvas: any, random: () => number) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  const size = 340;
  const step = 20;
  const dpr = 1; // Assuming a default DPR of 1 for server-side rendering
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.scale(dpr, dpr);

  ctx.lineCap = "square";

  function draw(leftToRight, x, y, width, height) {
    ctx.lineWidth = 1;
    if (leftToRight) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y + height);
    } else {
      ctx.moveTo(x + width, y);
      ctx.lineTo(x, y + height);
    }

    ctx.stroke();
  }

  // Draw border around the pattern
  ctx.lineWidth = 0.2;
  ctx.strokeStyle = "#000";
  ctx.strokeRect(0, 0, size * dpr, size * dpr);

  for (let x = 0; x < size; x += step) {
    for (let y = 0; y < size; y += step) {
      let leftToRight = random() >= 0.5;
      draw(leftToRight, x, y, step, step);
    }
  }
}

/**
 * API endpoint handler that generates the art pattern image.
 *
 * @param req - Vercel HTTP request object
 * @param res - Vercel HTTP response object
 * @returns PNG image buffer
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { address = "", data = "" } = req.query;

  // Combine address and data into a single string to generate a unique seed
  const seed = hashString(`${address}${data}`);
  const random = seededRandom(seed);

  const frameSize = 460;
  const padding = 60;
  const canvas = createCanvas(frameSize, frameSize);

  const ctx = canvas.getContext("2d");

  // Draw gray border
  ctx.fillStyle = "#FFF";
  ctx.fillRect(0, 0, frameSize, frameSize);

  // Draw green frame
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 45;
  ctx.strokeRect(0, 0, frameSize, frameSize);

  // Draw pattern inside frame
  const patternCanvas = createCanvas(320, 320);
  drawPattern(patternCanvas, random);
  ctx.drawImage(patternCanvas, padding, padding);

  const buffer = canvas.toBuffer("image/png");
  res.setHeader("Content-Type", "image/png");
  res.send(buffer);
}
