(function(){
  const statusEl = document.getElementById('status');
  const resultEl = document.getElementById('result');
  const video = document.getElementById('video');
  const startBtn = document.getElementById('start');
  const stopBtn = document.getElementById('stop');
  const switchBtn = document.getElementById('switch');
  const openBtn = document.getElementById('openCallback');
  const callbackInput = document.getElementById('callback');

  let controls = null;
  let currentFacingMode = 'environment';
  let lastCode = '';

  function log(msg){
    const t = new Date().toLocaleTimeString();
    statusEl.innerHTML += `[${t}] ${msg}<br/>`;
    statusEl.scrollTop = statusEl.scrollHeight;
  }

  function readQueryCallback(){
    try {
      const url = new URL(window.location.href);
      const cb = url.searchParams.get('callback');
      if (cb) {
        callbackInput.value = cb;
      } else {
        // Default callback to DL scan page
        const base = `${window.location.origin}/dl-scan`;
        callbackInput.value = base;
      }
    } catch {}
  }

  async function start(){
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
        log('MediaDevices API not available. Use HTTPS and main browser.');
        return;
      }
      statusEl.innerHTML = '';
      resultEl.textContent = '';
      lastCode = '';

      const hints = new ZXing.BrowserMultiFormatReader();
      const devices = await ZXing.BrowserCodeReader.listVideoInputDevices();
      log(`Video inputs: ${devices.length}`);

      controls = await ZXing.BrowserMultiFormatReader.decodeOnceFromVideoDevice(
        undefined,
        video,
        (res, err, ctrl) => {
          controls = ctrl; // store to stop later
          if (res && res.getText){
            lastCode = res.getText();
            resultEl.textContent = `Scanned: ${lastCode}`;
            log('Scan success');
            // Auto-navigate: if QR is a URL, go there; otherwise go to /dl-scan with barcode param
            try {
              const maybeUrl = new URL(lastCode);
              window.location.href = maybeUrl.toString();
            } catch {
              openCallback();
            }
          }
          if (err && !(err instanceof ZXing.NotFoundException)){
            // ignore NotFound spam; log other errors
            log(`Scan error: ${err.message || err}`);
          }
        },
        { delayBetweenScanAttempts: 250 }
      );

      // Try to set facing mode via constraints if supported
      const stream = video.srcObject;
      if (stream) {
        const track = stream.getVideoTracks()[0];
        if (track && track.getCapabilities && track.applyConstraints){
          const caps = track.getCapabilities();
          if (caps.facingMode){
            try{
              await track.applyConstraints({ facingMode: currentFacingMode });
              log(`Applied facingMode: ${currentFacingMode}`);
            }catch(e){ log(`facingMode constraint failed: ${e.message}`); }
          }
        }
      }
      log('Camera started');
    } catch (e){
      log(`Start failed: ${e.message || e}`);
    }
  }

  async function stop(){
    try {
      if (controls && controls.stop){
        controls.stop();
      }
      const s = video.srcObject;
      if (s){
        s.getTracks().forEach(t => t.stop());
        video.srcObject = null;
      }
      log('Camera stopped');
    } catch(e){
      log(`Stop failed: ${e.message || e}`);
    }
  }

  async function switchCamera(){
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    log(`Switching camera to ${currentFacingMode}`);
    await stop();
    await start();
  }

  function openCallback(){
    const cb = (callbackInput.value || '').trim();
    if (!cb){ log('Callback URL is empty'); return; }
    try {
      const u = new URL(cb);
      if (lastCode){
        u.searchParams.set('barcode', lastCode);
      }
      window.location.href = u.toString();
    } catch(e){
      log('Invalid callback URL');
    }
  }

  readQueryCallback();
  startBtn.addEventListener('click', start);
  stopBtn.addEventListener('click', stop);
  switchBtn.addEventListener('click', switchCamera);
  openBtn.addEventListener('click', openCallback);
})();


