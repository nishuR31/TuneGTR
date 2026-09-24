export class RingBuffer {
  private buffer: Float32Array;
  private pointer: number = 0;
  private length: number;

  constructor(size: number) {
    this.buffer = new Float32Array(size);
    this.length = size;
  }

  push(data: Float32Array) {
    for (let i = 0; i < data.length; i++) {
      this.buffer[this.pointer] = data[i];
      this.pointer = (this.pointer + 1) % this.length;
    }
  }

  // Gets the current window of samples (oldest to newest)
  get(outBuffer: Float32Array) {
    for (let i = 0; i < this.length; i++) {
      const idx = (this.pointer + i) % this.length;
      outBuffer[i] = this.buffer[idx];
    }
  }
}
