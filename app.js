const els = {
  appStatus: document.querySelector("#appStatus"),
  installButton: document.querySelector("#installButton"),
  generator: document.querySelector(".generator"),
  modeButtons: document.querySelectorAll("[data-mode]"),
  modePanels: document.querySelectorAll("[data-mode-panel]"),
  qrBox: document.querySelector("#qrcode"),
  qrQualityLabel: document.querySelector("#qrQualityLabel"),
  textPayload: document.querySelector("#textPayload"),
  wifiSsid: document.querySelector("#wifiSsid"),
  wifiPassword: document.querySelector("#wifiPassword"),
  wifiType: document.querySelector("#wifiType"),
  wifiHidden: document.querySelector("#wifiHidden"),
  contactName: document.querySelector("#contactName"),
  contactPhone: document.querySelector("#contactPhone"),
  contactEmail: document.querySelector("#contactEmail"),
  contactOrg: document.querySelector("#contactOrg"),
  whatsappPhone: document.querySelector("#whatsappPhone"),
  whatsappMessage: document.querySelector("#whatsappMessage"),
  qrSize: document.querySelector("#qrSize"),
  qrCorrection: document.querySelector("#qrCorrection"),
  qrColor: document.querySelector("#qrColor"),
  qrBgColor: document.querySelector("#qrBgColor"),
  generateButton: document.querySelector("#generateButton"),
  downloadButton: document.querySelector("#downloadButton"),
  copyPayloadButton: document.querySelector("#copyPayloadButton"),
  cameraFrame: document.querySelector("#cameraFrame"),
  cameraPreview: document.querySelector("#cameraPreview"),
  scanCanvas: document.querySelector("#scanCanvas"),
  cameraSelect: document.querySelector("#cameraSelect"),
  startCameraButton: document.querySelector("#startCameraButton"),
  stopCameraButton: document.querySelector("#stopCameraButton"),
  imageInput: document.querySelector("#imageInput"),
  readerState: document.querySelector("#readerState"),
  resultBox: document.querySelector("#resultBox"),
  resultText: document.querySelector("#resultText"),
  resultActions: document.querySelector("#resultActions"),
};

const correctionLabels = {
  L: "Baja correccion",
  M: "Correccion media",
  Q: "Alta correccion",
  H: "Maxima correccion",
};

let activeMode = "text";
let renderTimer = 0;
let installPrompt = null;
let scanStream = null;
let scanFrame = 0;
let lastScan = "";

function setStatus(message, isError = false) {
  els.appStatus.textContent = message;
  els.appStatus.classList.toggle("danger", isError);
}

function escapeQrField(value) {
  return String(value || "").replace(/([\\;,:"])/g, "\\$1");
}

function payloadFromMode() {
  if (activeMode === "wifi") {
    const ssid = els.wifiSsid.value.trim();
    if (!ssid) return "";
    const security = els.wifiType.value;
    const password = security === "nopass" ? "" : `P:${escapeQrField(els.wifiPassword.value)};`;
    const hidden = els.wifiHidden.checked ? "true" : "false";
    return `WIFI:T:${security};S:${escapeQrField(ssid)};${password}H:${hidden};;`;
  }

  if (activeMode === "contact") {
    const fields = [
      ["N", els.contactName.value],
      ["TEL", els.contactPhone.value],
      ["EMAIL", els.contactEmail.value],
      ["ORG", els.contactOrg.value],
    ].filter(([, value]) => value.trim());
    if (!fields.length) return "";
    return `MECARD:${fields.map(([key, value]) => `${key}:${escapeQrField(value.trim())}`).join(";")};;`;
  }

  if (activeMode === "whatsapp") {
    const phone = els.whatsappPhone.value.replace(/[^\d]/g, "");
    if (!phone) return "";
    const message = els.whatsappMessage.value.trim();
    return `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  }

  return els.textPayload.value.trim();
}

function showPlaceholder(message) {
  els.qrBox.innerHTML = "";
  const placeholder = document.createElement("p");
  placeholder.className = "placeholder";
  placeholder.textContent = message;
  els.qrBox.appendChild(placeholder);
}

function renderQr() {
  const payload = payloadFromMode();
  const size = Number(els.qrSize.value);
  els.qrBox.style.setProperty("--qr-size", `${size}px`);
  els.qrQualityLabel.textContent = correctionLabels[els.qrCorrection.value];

  if (!payload) {
    showPlaceholder("Completa los campos para crear el QR.");
    return;
  }

  try {
    els.qrBox.innerHTML = "";
    new QRCode(els.qrBox, {
      text: payload,
      width: size,
      height: size,
      colorDark: els.qrColor.value,
      colorLight: els.qrBgColor.value,
      correctLevel: QRCode.CorrectLevel[els.qrCorrection.value],
    });
    setStatus("QR actualizado.");
  } catch (error) {
    showPlaceholder("El contenido es demasiado largo para este codigo.");
    setStatus(error.message || "No se pudo crear el QR.", true);
  }
}

function scheduleRender() {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(renderQr, 180);
}

function setMode(mode) {
  activeMode = mode;
  els.modeButtons.forEach((button) => {
    const selected = button.dataset.mode === mode;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
  });
  els.modePanels.forEach((panel) => {
    const selected = panel.dataset.modePanel === mode;
    panel.hidden = !selected;
    panel.classList.toggle("active", selected);
  });
  scheduleRender();
}

async function copyText(text) {
  if (!text) return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    const copied = document.execCommand("copy");
    helper.remove();
    return copied;
  }
}

function triggerDownload(url, fileName) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadQr() {
  const canvas = els.qrBox.querySelector("canvas");
  const image = els.qrBox.querySelector("img");

  if (canvas) {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      triggerDownload(url, "codigo-qr.png");
      URL.revokeObjectURL(url);
      setStatus("QR descargado.");
    }, "image/png");
    return;
  }

  if (image?.src) {
    triggerDownload(image.src, "codigo-qr.png");
    setStatus("QR descargado.");
    return;
  }

  setStatus("Primero genera un QR.", true);
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

function isOpenableUri(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol);
  } catch (_) {
    return false;
  }
}

function isImageUrl(value) {
  return isHttpUrl(value) && /\.(png|jpe?g|gif|webp|bmp|avif)(\?.*)?$/i.test(value);
}

function makeAction(label, handler, kind = "secondary-button") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = kind;
  button.textContent = label;
  button.addEventListener("click", handler);
  return button;
}

async function downloadRemoteImage(url) {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) throw new Error("No se pudo descargar la imagen.");
    const blob = await response.blob();
    const extension = blob.type.split("/")[1] || "png";
    const objectUrl = URL.createObjectURL(blob);
    triggerDownload(objectUrl, `imagen-qr.${extension}`);
    URL.revokeObjectURL(objectUrl);
    setStatus("Imagen descargada.");
  } catch (_) {
    window.open(url, "_blank", "noopener,noreferrer");
    setStatus("Abri la imagen en una nueva pestana.");
  }
}

function renderResult(data) {
  els.resultBox.hidden = false;
  els.resultText.textContent = data;
  els.resultActions.innerHTML = "";

  els.resultActions.appendChild(makeAction("Copiar", async () => {
    const copied = await copyText(data);
    setStatus(copied ? "Contenido copiado." : "No se pudo copiar.", !copied);
  }));

  if (isOpenableUri(data)) {
    els.resultActions.appendChild(makeAction("Abrir", () => {
      window.open(data, "_blank", "noopener,noreferrer");
    }, "primary-button"));
  }

  if (isImageUrl(data)) {
    els.resultActions.appendChild(makeAction("Descargar imagen", () => downloadRemoteImage(data)));
  }

  if (navigator.share) {
    els.resultActions.appendChild(makeAction("Compartir", async () => {
      try {
        await navigator.share({ text: data });
      } catch (_) {
        setStatus("Accion cancelada.");
      }
    }));
  }
}

function onScanResult(data) {
  if (!data || data === lastScan) return;
  lastScan = data;
  window.setTimeout(() => {
    lastScan = "";
  }, 1800);

  renderResult(data);
  navigator.vibrate?.(70);
  els.cameraFrame.classList.add("detected");
  window.setTimeout(() => els.cameraFrame.classList.remove("detected"), 450);
  setStatus("QR detectado.");
}

function scanFrameLoop() {
  if (!scanStream) return;

  const video = els.cameraPreview;
  const width = video.videoWidth;
  const height = video.videoHeight;

  if (width && height && window.jsQR) {
    const canvas = els.scanCanvas;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    const code = jsQR(imageData.data, width, height, { inversionAttempts: "attemptBoth" });
    if (code?.data) onScanResult(code.data);
  }

  scanFrame = window.requestAnimationFrame(scanFrameLoop);
}

async function populateCameras() {
  if (!navigator.mediaDevices?.enumerateDevices) return;

  const devices = await navigator.mediaDevices.enumerateDevices();
  const cameras = devices.filter((device) => device.kind === "videoinput");
  els.cameraSelect.innerHTML = "";

  cameras.forEach((camera, index) => {
    const option = document.createElement("option");
    option.value = camera.deviceId;
    option.textContent = camera.label || `Camara ${index + 1}`;
    els.cameraSelect.appendChild(option);
  });

  els.cameraSelect.hidden = cameras.length < 2;
  const activeTrack = scanStream?.getVideoTracks()[0];
  const activeDeviceId = activeTrack?.getSettings().deviceId;
  if (activeDeviceId) els.cameraSelect.value = activeDeviceId;
}

async function startCamera(deviceId = "") {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("Este navegador no permite usar camara desde aqui.", true);
    return;
  }

  await stopCamera(false);

  try {
    const video = deviceId
      ? { deviceId: { exact: deviceId } }
      : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } };

    scanStream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
    els.cameraPreview.srcObject = scanStream;
    await els.cameraPreview.play();
    await populateCameras();

    els.startCameraButton.disabled = true;
    els.stopCameraButton.disabled = false;
    els.readerState.textContent = "Escaneando";
    els.readerState.classList.remove("muted");
    setStatus("Camara activa.");
    scanFrameLoop();
  } catch (error) {
    scanStream = null;
    els.startCameraButton.disabled = false;
    els.stopCameraButton.disabled = true;
    els.readerState.textContent = "Camara inactiva";
    els.readerState.classList.add("muted");
    setStatus(error.message || "No se pudo abrir la camara.", true);
  }
}

async function stopCamera(updateStatus = true) {
  if (scanFrame) {
    window.cancelAnimationFrame(scanFrame);
    scanFrame = 0;
  }

  if (scanStream) {
    scanStream.getTracks().forEach((track) => track.stop());
    scanStream = null;
  }

  els.cameraPreview.pause();
  els.cameraPreview.removeAttribute("src");
  els.cameraPreview.srcObject = null;
  els.startCameraButton.disabled = false;
  els.stopCameraButton.disabled = true;
  els.readerState.textContent = "Camara inactiva";
  els.readerState.classList.add("muted");

  if (updateStatus) setStatus("Camara detenida.");
}

function readImageFile(file) {
  if (!file) return;

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();

  image.onload = () => {
    const maxSide = 1500;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = els.scanCanvas;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    const imageData = context.getImageData(0, 0, width, height);
    const code = window.jsQR?.(imageData.data, width, height, { inversionAttempts: "attemptBoth" });
    URL.revokeObjectURL(objectUrl);

    if (code?.data) {
      onScanResult(code.data);
      return;
    }

    setStatus("No encontre un QR en esa imagen.", true);
  };

  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    setStatus("No se pudo leer la imagen.", true);
  };

  image.src = objectUrl;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    setStatus("Lista para trabajar.");
    return;
  }

  const canRegister = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (!canRegister) {
    setStatus("Para instalarla, abre la app desde HTTPS o localhost.");
    return;
  }

  navigator.serviceWorker.register("./sw.js")
    .then(() => setStatus("PWA lista para instalar."))
    .catch(() => setStatus("La app funciona, pero no se activo el modo PWA.", true));
}

function bindEvents() {
  els.modeButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });

  els.generator.querySelectorAll("input, textarea, select").forEach((field) => {
    field.addEventListener("input", scheduleRender);
    field.addEventListener("change", scheduleRender);
  });

  els.generateButton.addEventListener("click", renderQr);
  els.downloadButton.addEventListener("click", downloadQr);
  els.copyPayloadButton.addEventListener("click", async () => {
    const copied = await copyText(payloadFromMode());
    setStatus(copied ? "Contenido copiado." : "No se pudo copiar.", !copied);
  });

  els.startCameraButton.addEventListener("click", () => startCamera());
  els.stopCameraButton.addEventListener("click", () => stopCamera());
  els.cameraSelect.addEventListener("change", () => startCamera(els.cameraSelect.value));
  els.imageInput.addEventListener("change", () => {
    readImageFile(els.imageInput.files[0]);
    els.imageInput.value = "";
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    els.installButton.hidden = false;
  });

  els.installButton.addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    els.installButton.hidden = true;
  });
}

bindEvents();
renderQr();
registerServiceWorker();
