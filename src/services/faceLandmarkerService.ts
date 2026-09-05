import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { NormalizedLandmark } from '../types';

let faceLandmarkerInstance: FaceLandmarker | null = null;
let isLoading = false;
let initPromise: Promise<FaceLandmarker | null> | null = null;

export async function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (faceLandmarkerInstance) {
    return faceLandmarkerInstance;
  }

  if (initPromise) {
    const res = await initPromise;
    if (res) return res;
  }

  isLoading = true;
  initPromise = (async () => {
    try {
      // Load wasm binaries from jsdelivr CDN
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      // Try GPU delegate first, fallback to CPU if needed
      try {
        faceLandmarkerInstance = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          outputFaceBlendshapes: true,
          runningMode: 'VIDEO',
          numFaces: 1,
        });
      } catch (gpuError) {
        console.warn('FaceLandmarker GPU init failed, falling back to CPU:', gpuError);
        faceLandmarkerInstance = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'CPU',
          },
          outputFaceBlendshapes: true,
          runningMode: 'VIDEO',
          numFaces: 1,
        });
      }

      isLoading = false;
      return faceLandmarkerInstance;
    } catch (err) {
      isLoading = false;
      console.error('Failed to initialize FaceLandmarker:', err);
      throw err;
    }
  })();

  const result = await initPromise;
  if (!result) {
    throw new Error('Could not instantiate FaceLandmarker');
  }
  return result;
}

export function detectFace(
  landmarker: FaceLandmarker,
  videoElement: HTMLVideoElement,
  timestampMs: number
): NormalizedLandmark[] | null {
  try {
    if (videoElement.readyState < 2) return null;
    const results = landmarker.detectForVideo(videoElement, timestampMs);
    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
      return results.faceLandmarks[0] as unknown as NormalizedLandmark[];
    }
    return null;
  } catch (e) {
    console.error('Detection error:', e);
    return null;
  }
}
