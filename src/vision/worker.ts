/// <reference lib="webworker" />
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

let landmarker: HandLandmarker | null = null;
self.onmessage = async (event: MessageEvent) => {
  if (event.data.type === "init") {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        event.data.base + "/vision",
        true,
      );
      // CPU/WASM works on a wider range of integrated webcams/laptops.
      landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: event.data.base + "/vision/hand_landmarker.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numHands: event.data.numHands === 2 ? 2 : 1,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });
      self.postMessage({ type: "ready" });
    } catch (error) {
      self.postMessage({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Model initialization failed",
      });
    }
    return;
  }
  if (event.data.type === "frame") {
    const bitmap = event.data.bitmap as ImageBitmap;
    try {
      if (!landmarker) throw new Error("Model is not ready");
      const result = landmarker.detectForVideo(bitmap, event.data.at);
      self.postMessage({
        type: "result",
        at: event.data.at,
        points: result.landmarks[0] ?? [],
        hands: result.landmarks,
        handedness: result.handedness.map((entries) => entries[0]?.categoryName ?? "Unknown"),
      });
    } catch (error) {
      self.postMessage({
        type: "error",
        message:
          error instanceof Error ? error.message : "Frame detection failed",
      });
    } finally {
      bitmap.close();
    }
  }
};
