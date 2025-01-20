import { createCanvas, loadImage } from "canvas";
import { VercelRequest, VercelResponse } from "@vercel/node";
import fetch from "node-fetch"; // Using node-fetch to fetch the image from URL

function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function seededRandom(seed: number) {
  let value = seed % 2147483647;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function drawPattern(canvas: any, random: () => number) {
  const ctx = canvas.getContext("2d");
  const size = 340;
  const step = 20;
  const dpr = 1;
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

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#0052fe";
  ctx.strokeRect(0, 0, size * dpr, size * dpr);

  for (let x = 0; x < size; x += step) {
    for (let y = 0; y < size; y += step) {
      let leftToRight = random() >= 0.5;
      draw(leftToRight, x, y, step, step);
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { address = "", data = "" } = req.query;

  const seed = hashString(`${address}${data}`);
  const random = seededRandom(seed);

  const frameSize = 460;
  const padding = 60;
  const canvas = createCanvas(frameSize, frameSize);

  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#FFF";
  ctx.fillRect(0, 0, frameSize, frameSize);

  const patternCanvas = createCanvas(320, 320);
  drawPattern(patternCanvas, random);
  ctx.drawImage(patternCanvas, padding, padding);

  ctx.strokeStyle = "#0052fe";
  ctx.lineWidth = 45;
  ctx.strokeRect(0, 0, frameSize, frameSize);

  try {
    const response = await fetch(
      "https://altcoinsbox.com/wp-content/uploads/2023/02/base-logo-in-blue.png"
    );
    const buffer = await response.buffer();
    const baseImage = await loadImage(buffer);
    const scaledWidth = 100;
    const scaledHeight = 100;
    const baseX = (frameSize - scaledWidth) / 2;
    const baseY = (frameSize - scaledHeight) / 2;

    // Draw circular background
    ctx.beginPath();
    ctx.arc(baseX + scaledWidth/2, baseY + scaledHeight/2, scaledWidth/2 + 10, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();

    // Add white border
    ctx.strokeStyle = "#0052fe";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw the image
    ctx.drawImage(baseImage, baseX, baseY, scaledWidth, scaledHeight);
  } catch (error) {
    console.error("Failed to load base image:", error);
  }

  const buffer = canvas.toBuffer("image/png");
  res.setHeader("Content-Type", "image/png");
  res.send(buffer);
}
