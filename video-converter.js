(() => {
  "use strict";

  const OUTPUT_MIME_TYPES = [
    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
    "video/mp4",
    'video/mp4;codecs="avc1.42E01E"'
  ];

  function waitFor(target, eventName, errorName = "error") {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        target.removeEventListener(eventName, onSuccess);
        target.removeEventListener(errorName, onError);
      };
      const onSuccess = event => {
        cleanup();
        resolve(event);
      };
      const onError = () => {
        cleanup();
        reject(new Error("O navegador não conseguiu ler este vídeo."));
      };
      target.addEventListener(eventName, onSuccess, { once: true });
      target.addEventListener(errorName, onError, { once: true });
    });
  }

  function supportedOutputMimeType() {
    if (typeof MediaRecorder !== "function") return "";
    return OUTPUT_MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type)) || "";
  }

  function convertedFileName(fileName) {
    const base = String(fileName || "video")
      .replace(/\.[^.]+$/, "")
      .replace(/[\\/:*?"<>|]+/g, "-") || "video";
    return `${base}-h264.mp4`;
  }

  async function inspectFile(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const signature = new TextDecoder("latin1").decode(bytes);
    return {
      hasH264: signature.includes("avc1") || signature.includes("avc3"),
      hasHevc: signature.includes("hvc1") || signature.includes("hev1"),
      isMp4: String(file?.name || "").toLowerCase().endsWith(".mp4") ||
        String(file?.type || "").toLowerCase().startsWith("video/mp4")
    };
  }

  async function convertToWhatsAppVideo(file, onProgress) {
    const mimeType = supportedOutputMimeType();
    if (!mimeType) {
      throw new Error(
        "Este Chrome não possui conversão automática para MP4/H.264. " +
        "Atualize o navegador ou converta o arquivo para MP4/H.264 com áudio AAC."
      );
    }

    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    let sourceStream = null;
    let outputStream = null;
    let audioContext = null;
    let recorder = null;
    let progressTimer = 0;

    video.preload = "auto";
    video.playsInline = true;
    video.style.cssText = "position:fixed;left:-4px;top:-4px;width:2px;height:2px;opacity:.001;pointer-events:none";
    const loaded = waitFor(video, "loadeddata");
    video.src = objectUrl;
    document.body.appendChild(video);

    try {
      onProgress?.(2);
      await loaded;
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        throw new Error("Não foi possível identificar a duração deste vídeo.");
      }

      const capture = video.captureStream || video.mozCaptureStream;
      if (typeof capture !== "function") {
        throw new Error("Este Chrome não permite converter vídeos automaticamente.");
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      let audioTracks = [];
      if (AudioContextClass) {
        audioContext = new AudioContextClass();
        const mediaSource = audioContext.createMediaElementSource(video);
        const silentDestination = audioContext.createMediaStreamDestination();
        mediaSource.connect(silentDestination);
        audioTracks = silentDestination.stream.getAudioTracks();
        await audioContext.resume().catch(() => {});
      }

      sourceStream = capture.call(video);
      outputStream = new MediaStream([
        ...sourceStream.getVideoTracks(),
        ...audioTracks
      ]);
      if (!outputStream.getVideoTracks().length) {
        throw new Error("O navegador não conseguiu capturar as imagens deste vídeo.");
      }

      const chunks = [];
      let recorderError = null;
      recorder = new MediaRecorder(outputStream, {
        mimeType,
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 128000
      });
      recorder.addEventListener("dataavailable", event => {
        if (event.data?.size) chunks.push(event.data);
      });
      recorder.addEventListener("error", event => {
        recorderError = event.error || new Error("Falha ao converter o vídeo.");
      });

      const stopped = waitFor(recorder, "stop", "error");
      recorder.start(1000);
      onProgress?.(5);
      await video.play();

      progressTimer = window.setInterval(() => {
        const ratio = Math.max(0, Math.min(1, video.currentTime / video.duration));
        onProgress?.(5 + Math.round(ratio * 90));
      }, 300);

      await waitFor(video, "ended");
      if (recorder.state !== "inactive") recorder.stop();
      await stopped;
      if (recorderError) throw recorderError;
      if (!chunks.length) throw new Error("A conversão não gerou um arquivo de vídeo.");

      const blob = new Blob(chunks, { type: "video/mp4" });
      const result = new File([blob], convertedFileName(file.name), {
        type: "video/mp4",
        lastModified: Date.now()
      });
      const inspection = await inspectFile(result);
      if (!inspection.isMp4 || !inspection.hasH264) {
        throw new Error("A conversão não gerou um vídeo MP4/H.264 válido.");
      }
      onProgress?.(100);
      return result;
    } finally {
      if (progressTimer) window.clearInterval(progressTimer);
      if (recorder?.state && recorder.state !== "inactive") recorder.stop();
      outputStream?.getTracks().forEach(track => track.stop());
      sourceStream?.getTracks().forEach(track => track.stop());
      if (audioContext) await audioContext.close().catch(() => {});
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
      URL.revokeObjectURL(objectUrl);
    }
  }

  window.WFVideoConverter = Object.freeze({
    inspectFile,
    supported: () => Boolean(supportedOutputMimeType()),
    convertToWhatsAppVideo
  });
})();
