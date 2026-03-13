import WidgetBase from '../WidgetBase.js';
import WidgetElement from '../WidgetElement.js';
import eventBus from '../EventBus.js';

export default class NesEmulatorWidget {
  constructor(widget) {
    this.widget = widget;
    this.canvas = widget.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.romInput = widget.querySelector('[data-role="romLoader"]');

    // NES canvas
    this.imageData = this.ctx.createImageData(256, 240);

    // ===== АУДИО (исправленная версия) =====
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 44100
    });

    this.bufferSize = 2048;
    this.audioQueue = [];

    this.scriptNode = this.audioCtx.createScriptProcessor(this.bufferSize, 0, 2);
    this.scriptNode.connect(this.audioCtx.destination);

    this.scriptNode.onaudioprocess = (e) => {
      const left = e.outputBuffer.getChannelData(0);
      const right = e.outputBuffer.getChannelData(1);

      for (let i = 0; i < left.length; i++) {
        if (this.audioQueue.length > 0) {
          const sample = this.audioQueue.shift();
          left[i] = sample[0];
          right[i] = sample[1];
        } else {
          left[i] = 0;
          right[i] = 0;
        }
      }
    };

    // ===== NES =====
    this.nes = new jsnes.NES({
      onFrame: (frame) => this.onFrame(frame),
      onAudioSample: (l, r) => this.pushAudio(l, r)
    });

    this.bindEvents();
  }
  bindEvents() {
    // Разблокировка AudioContext
    const resumeAudio = async () => {
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      window.removeEventListener('click', resumeAudio);
      window.removeEventListener('touchstart', resumeAudio);
    };

    window.addEventListener('click', resumeAudio);
    window.addEventListener('touchstart', resumeAudio);

    // ROM loader
    this.romInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (ev) => {
        this.nes.loadROM(ev.target.result);
        await this.audioCtx.resume();
        this.start();
      };

      reader.readAsBinaryString(file);
    });

    // Клавиатура
    window.addEventListener("keydown", (e) => this.handleKey(e.code, true));
    window.addEventListener("keyup", (e) => this.handleKey(e.code, false));
    
    // ===== Overlay кнопки =====
    this.overlayButtons = this.widget.querySelectorAll(".overlay button");

    this.overlayButtons.forEach(btn => {
      const key = btn.dataset.key;
    
      const press = (e) => {
        e.preventDefault();
        this.handleKey(key, true);
        btn.classList.add("pressed");
      };
    
      const release = (e) => {
        e.preventDefault();
        this.handleKey(key, false);
        btn.classList.remove("pressed");
      };
    
      // ПК
      btn.addEventListener("mousedown", press);
      btn.addEventListener("mouseup", release);
      btn.addEventListener("mouseleave", release);
    
      // Телефон (multitouch)
      btn.addEventListener("touchstart", press, { passive: false });
      btn.addEventListener("touchend", release);
      btn.addEventListener("touchcancel", release);
    });
  }
  handleKey(code, pressed) {
    const map = {
      ArrowUp: 4,
      ArrowDown: 5,
      ArrowLeft: 6,
      ArrowRight: 7,
      KeyZ: 0,
      KeyX: 1,
      Enter: 3,
      ShiftRight: 2
    };

    const button = map[code];
    if (button === undefined) return;

    if (pressed) {
      this.nes.buttonDown(1, button);
    } else {
      this.nes.buttonUp(1, button);
    }
  }
  onFrame(frameBuffer) {
    for (let i = 0; i < frameBuffer.length; i++) {
      const pixel = frameBuffer[i];
      const j = i * 4;

      this.imageData.data[j] = pixel & 0xff;
      this.imageData.data[j + 1] = (pixel >> 8) & 0xff;
      this.imageData.data[j + 2] = (pixel >> 16) & 0xff;
      this.imageData.data[j + 3] = 255;
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }
  pushAudio(left, right) {
    this.audioQueue.push([left * 0.5, right * 0.5]);

    // защита от переполнения
    if (this.audioQueue.length > 44100) {
      this.audioQueue.splice(0, 2048);
    }
  }
  start() {
    const frame = () => {
      this.nes.frame();
      this.animationFrame = requestAnimationFrame(frame);
    };
    frame();
  }
  destroy() {
    cancelAnimationFrame(this.animationFrame);
    this.scriptNode.disconnect();
    this.audioCtx.close();
  }
}