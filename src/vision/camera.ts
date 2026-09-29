import { GestureTracker } from "./gestures.ts";
import type { Observation, Point } from "./gestures.ts";

export type CameraSession = { stop: () => void };
export type HandFrame = { at: number; hands: Point[][]; handedness: string[] };
export type CameraOptions = {
  numHands?: 1 | 2;
  onFrame?: (frame: HandFrame) => void;
};
export function cameraError(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Камера заблокирована. Разреши доступ в настройках сайта рядом с адресной строкой и попробуй снова.";
  if (name === "NotFoundError")
    return "Камера не найдена. Подключи веб-камеру и попробуй снова.";
  if (name === "NotReadableError")
    return "Камера занята другим приложением. Закрой видеозвонок и попробуй снова.";
  return "Не удалось запустить распознавание. Проверь интернет для загрузки файлов, обнови браузер и попробуй снова.";
}

export async function startCamera(
  video: HTMLVideoElement,
  onHand: (hand: Observation) => void,
  onStatus: (status: string) => void,
  onFatal: (message: string) => void,
  signal: AbortSignal,
  options: CameraOptions = {},
): Promise<CameraSession> {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
    throw new Error("Camera requires HTTPS or localhost");
  let stream: MediaStream | null = null;
  let worker: Worker | null = null;
  let frameId = 0;
  let stopped = false;
  let busy = false;
  let lastFrame = 0;
  let busySince = 0;
  const rightTracker = new GestureTracker();
  const leftTracker = new GestureTracker();
  const stop = () => {
    stopped = true;
    cancelAnimationFrame(frameId);
    worker?.terminate();
    stream?.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
    signal.removeEventListener("abort", stop);
  };
  signal.addEventListener("abort", stop, { once: true });
  try {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    onStatus("Разреши доступ к камере…");
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30, max: 30 },
      },
    });
    if (stopped) {
      stream.getTracks().forEach((t) => t.stop());
      throw new DOMException("Aborted", "AbortError");
    }
    video.srcObject = stream;
    await video.play();
    onStatus("Загружаем распознавание руки…");
    worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      };
      const timer = window.setTimeout(() => {
        signal.removeEventListener("abort", abort);
        reject(new Error("Model timeout"));
      }, 120000);
      signal.addEventListener("abort", abort, { once: true });
      worker!.onerror = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
        reject(new Error("Worker failed"));
      };
      worker!.onmessage = (event) => {
        if (event.data.type === "ready" || event.data.type === "error") {
          clearTimeout(timer);
          signal.removeEventListener("abort", abort);
          if (event.data.type === "ready") resolve();
          else reject(new Error(event.data.message));
        }
      };
      worker!.postMessage({ type: "init", base: window.location.origin, numHands: options.numHands ?? 1 });
    });
    if (stopped) throw new DOMException("Aborted", "AbortError");
    worker.onmessage = (event) => {
      busy = false;
      if (event.data.type === "result") {
        const now = performance.now();
        const hands = (event.data.hands ?? []) as Point[][];
        options.onFrame?.({
          at: now,
          hands,
          handedness: event.data.handedness ?? [],
        });
        if (options.numHands === 2 && hands.length > 1) {
          // Sort by the mirrored preview, so the physical left hand remains
          // the tuning hand even when MediaPipe changes detection order.
          const displayed = [...hands].sort((a, b) => b[9].x - a[9].x);
          const left = leftTracker.observe(displayed[0], now);
          const right = rightTracker.observe(displayed[1], now);
          onHand({ ...right, partner: left });
        } else {
          leftTracker.observe([], now);
          onHand(rightTracker.observe(event.data.points, now));
        }
      } else if (event.data.type === "error") {
        stop();
        onFatal("Распознавание остановилось. Перезапусти камеру.");
      }
    };
    worker.onerror = () => {
      stop();
      onFatal("Распознавание остановилось. Перезапусти камеру.");
    };
    stream.getVideoTracks()[0].addEventListener("ended", () => {
      if (!stopped) {
        stop();
        onFatal("Камера отключена. Подключи её и попробуй снова.");
      }
    });
    const loop = async (at: number) => {
      if (stopped) return;
      frameId = requestAnimationFrame(loop);
      if (document.hidden) {
        busySince = at;
        return;
      }
      if (busy && at - busySince > 12000) {
        stop();
        onFatal("Распознавание не отвечает. Перезапусти камеру.");
        return;
      }
      if (busy || at - lastFrame < 50 || video.readyState < 2) return;
      busy = true;
      busySince = at;
      lastFrame = at;
      try {
        const bitmap = await createImageBitmap(video);
        if (stopped) {
          bitmap.close();
          return;
        }
        worker!.postMessage({ type: "frame", bitmap, at }, [bitmap]);
      } catch {
        busy = false;
      }
    };
    frameId = requestAnimationFrame(loop);
    onStatus("Камера подключена");
    return { stop };
  } catch (error) {
    stop();
    throw error;
  }
}
