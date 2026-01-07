/**
 * AudioWorklet processor for Porcupine wake word detection
 * Converts Float32 audio to Int16 and buffers frames for processing
 */
class PorcupineProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.frameLength = options.processorOptions?.frameLength || 512;
    this.audioBuffer = [];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) {
      return true;
    }

    const inputData = input[0];

    // Convert Float32 to Int16 and buffer
    for (let i = 0; i < inputData.length; i++) {
      const sample = Math.max(-32768, Math.min(32767, Math.round(inputData[i] * 32768)));
      this.audioBuffer.push(sample);
    }

    // Send complete frames to main thread
    while (this.audioBuffer.length >= this.frameLength) {
      const frame = new Int16Array(this.audioBuffer.slice(0, this.frameLength));
      this.audioBuffer = this.audioBuffer.slice(this.frameLength);
      this.port.postMessage({ type: 'frame', data: frame });
    }

    return true;
  }
}

registerProcessor('porcupine-processor', PorcupineProcessor);
