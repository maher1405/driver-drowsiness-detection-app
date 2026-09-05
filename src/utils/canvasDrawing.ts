import { NormalizedLandmark, DetectionMetrics, DetectionConfig } from '../types';
import {
  RIGHT_EYE_INDICES,
  LEFT_EYE_INDICES,
} from './math';

const RIGHT_EYE_CONTOUR = [
  33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
];

const LEFT_EYE_CONTOUR = [
  362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398,
];

const LIPS_OUTER = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185,
];

const LIPS_INNER = [
  78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191,
];

const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
  152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];

export function drawFaceLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  metrics: DetectionMetrics,
  config: DetectionConfig
) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Helper to convert normalized landmark to canvas coords
  const toPoint = (lm: NormalizedLandmark) => {
    let x = lm.x * width;
    if (config.mirrorWebcam) {
      x = (1 - lm.x) * width;
    }
    const y = lm.y * height;
    return { x, y };
  };

  // 1. Draw subtle Face Oval
  if (config.showMeshOverlay) {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    FACE_OVAL.forEach((idx, i) => {
      const lm = landmarks[idx];
      if (!lm) return;
      const pt = toPoint(lm);
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.stroke();
  }

  // 2. Draw Eyes
  const eyeAlert = metrics.isEyesClosed || metrics.ear < config.earThreshold;
  const eyeColor = eyeAlert ? '#ef4444' : '#06b6d4'; // Red if closed/drowsy, Cyan if normal
  const eyeGlow = eyeAlert ? 'rgba(239, 68, 68, 0.4)' : 'rgba(6, 182, 212, 0.2)';

  const drawContour = (indices: number[], strokeColor: string, fillColor?: string, lineWidth = 2) => {
    ctx.beginPath();
    indices.forEach((idx, i) => {
      const lm = landmarks[idx];
      if (!lm) return;
      const pt = toPoint(lm);
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  };

  // Draw eye polygons
  drawContour(RIGHT_EYE_CONTOUR, eyeColor, eyeGlow, 2);
  drawContour(LEFT_EYE_CONTOUR, eyeColor, eyeGlow, 2);

  // Draw EAR vertical & horizontal measurement vectors on each eye
  const drawEyeVectors = (indices: [number, number, number, number, number, number]) => {
    const [p1, p2, p3, p4, p5, p6] = indices.map((idx) => toPoint(landmarks[idx]));
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = eyeAlert ? '#f87171' : '#38bdf8';

    // Horizontal p1 - p4
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.stroke();

    // Vertical p2 - p6
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p6.x, p6.y);
    ctx.stroke();

    // Vertical p3 - p5
    ctx.beginPath();
    ctx.moveTo(p3.x, p3.y);
    ctx.lineTo(p5.x, p5.y);
    ctx.stroke();
  };

  drawEyeVectors(RIGHT_EYE_INDICES);
  drawEyeVectors(LEFT_EYE_INDICES);

  // 3. Draw Mouth
  const mouthAlert = metrics.isYawning || metrics.mar > config.marThreshold;
  const mouthColor = mouthAlert ? '#f97316' : '#a855f7'; // Orange/Red if yawning, Purple if normal
  const mouthGlow = mouthAlert ? 'rgba(249, 115, 22, 0.4)' : 'rgba(168, 85, 247, 0.15)';

  drawContour(LIPS_OUTER, mouthColor, undefined, 2);
  drawContour(LIPS_INNER, mouthAlert ? '#ef4444' : '#c084fc', mouthGlow, 1.5);

  // Draw MAR vertical lines (13-14, 81-178, 311-402)
  const p13 = toPoint(landmarks[13]);
  const p14 = toPoint(landmarks[14]);
  const p61 = toPoint(landmarks[61]);
  const p291 = toPoint(landmarks[291]);

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = mouthAlert ? '#f87171' : '#e879f9';
  ctx.beginPath();
  ctx.moveTo(p13.x, p13.y);
  ctx.lineTo(p14.x, p14.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(p61.x, p61.y);
  ctx.lineTo(p291.x, p291.y);
  ctx.stroke();

  // 4. Head Pose / Orientation Axis
  const nosePt = toPoint(landmarks[1]);
  const chinPt = toPoint(landmarks[152]);
  const foreheadPt = toPoint(landmarks[10]);

  // Head tilt vector from nose
  const pitchRad = (metrics.headPitch * Math.PI) / 180;
  const yawRad = (metrics.headYaw * Math.PI) / 180;
  const arrowLength = 55;

  // Compute 2D projection of 3D gaze vector
  const mirrorMult = config.mirrorWebcam ? -1 : 1;
  const targetX = nosePt.x + arrowLength * Math.sin(yawRad) * mirrorMult;
  // Negative pitch means tilted down, so targetY moves down (positive Y in canvas)
  const targetY = nosePt.y - arrowLength * Math.sin(pitchRad);

  const headAlert = metrics.isHeadNodding;
  const headColor = headAlert ? '#ef4444' : '#10b981';

  // Draw midline (forehead -> nose -> chin)
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.moveTo(foreheadPt.x, foreheadPt.y);
  ctx.lineTo(chinPt.x, chinPt.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw pose vector arrow
  ctx.beginPath();
  ctx.strokeStyle = headColor;
  ctx.lineWidth = 3;
  ctx.moveTo(nosePt.x, nosePt.y);
  ctx.lineTo(targetX, targetY);
  ctx.stroke();

  // Arrowhead
  const headAngle = Math.atan2(targetY - nosePt.y, targetX - nosePt.x);
  ctx.beginPath();
  ctx.fillStyle = headColor;
  ctx.moveTo(targetX, targetY);
  ctx.lineTo(
    targetX - 10 * Math.cos(headAngle - Math.PI / 6),
    targetY - 10 * Math.sin(headAngle - Math.PI / 6)
  );
  ctx.lineTo(
    targetX - 10 * Math.cos(headAngle + Math.PI / 6),
    targetY - 10 * Math.sin(headAngle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();

  // 5. Draw individual key landmark dots if enabled
  if (config.showLandmarkPoints) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    // Highlight specific driver monitoring points
    const keyPoints = [1, 10, 152, 33, 133, 362, 263, 61, 291, 13, 14];
    keyPoints.forEach((idx) => {
      const pt = toPoint(landmarks[idx]);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.5, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  // 6. Draw HUD bounding target box around face
  // Find face bounds
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;

  FACE_OVAL.forEach((idx) => {
    const pt = toPoint(landmarks[idx]);
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  });

  const padX = (maxX - minX) * 0.1;
  const padY = (maxY - minY) * 0.1;
  const boxX = Math.max(0, minX - padX);
  const boxY = Math.max(0, minY - padY);
  const boxW = Math.min(width - boxX, maxX - minX + padX * 2);
  const boxH = Math.min(height - boxY, maxY - minY + padY * 2);

  // Draw HUD corner brackets
  const cornerLen = 16;
  ctx.strokeStyle = eyeAlert || mouthAlert || headAlert ? '#ef4444' : 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(boxX, boxY + cornerLen);
  ctx.lineTo(boxX, boxY);
  ctx.lineTo(boxX + cornerLen, boxY);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(boxX + boxW - cornerLen, boxY);
  ctx.lineTo(boxX + boxW, boxY);
  ctx.lineTo(boxX + boxW, boxY + cornerLen);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(boxX, boxY + boxH - cornerLen);
  ctx.lineTo(boxX, boxY + boxH);
  ctx.lineTo(boxX + cornerLen, boxY + boxH);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(boxX + boxW - cornerLen, boxY + boxH);
  ctx.lineTo(boxX + boxW, boxY + boxH);
  ctx.lineTo(boxX + boxW, boxY + boxH - cornerLen);
  ctx.stroke();

  // 7. Floating tag above face
  const labelY = Math.max(24, boxY - 10);
  const statusLabel = metrics.isEyesClosed
    ? '⚠️ EYES CLOSED'
    : metrics.isYawning
    ? '⚠️ YAWNING'
    : metrics.isHeadNodding
    ? '⚠️ HEAD NOD'
    : 'DRIVER ACTIVE';

  const badgeColor = metrics.isEyesClosed || metrics.isHeadNodding
    ? '#ef4444'
    : metrics.isYawning
    ? '#f97316'
    : '#10b981';

  ctx.font = '700 10px ui-monospace, monospace';
  const textWidth = ctx.measureText(statusLabel).width;
  const pillW = textWidth + 14;
  const pillH = 18;
  const pillX = boxX + boxW / 2 - pillW / 2;

  ctx.fillStyle = 'rgba(10, 10, 10, 0.9)';
  ctx.strokeStyle = badgeColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(pillX, labelY - 13, pillW, pillH);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = badgeColor;
  ctx.fillText(statusLabel, pillX + 7, labelY);

  ctx.restore();
}
