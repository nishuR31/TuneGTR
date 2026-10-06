export class RingBuffer {
  private buffer: Float32Array;
  private pointer = 0;
  private readonly length: number;
  private count = 0;

  constructor(size: number) {
    if (!Number.isInteger(size) || size <= 0) throw new Error("RingBuffer size must be > 0");
    this.buffer = new Float32Array(size);
    this.length = size;
  }

  push(data: Float32Array) {
    for (let i = 0; i < data.length; i++) {
      this.buffer[this.pointer] = data[i];
      this.pointer = (this.pointer + 1) % this.length;
      this.count = Math.min(this.count + 1, this.length);
    }
  }

  get(outBuffer: Float32Array) {
    if (outBuffer.length !== this.length) throw new Error(`Expected output buffer of ${this.length} samples`);
    for (let i = 0; i < this.length; i++) {
      const idx = (this.pointer + i) % this.length;
      outBuffer[i] = this.buffer[idx];
    }
  }

  get isReady(): boolean {
    return this.count >= this.length;
  }

  get fillRatio(): number {
    return this.count / this.length;
  }

  clear() {
    this.buffer.fill(0);
    this.pointer = 0;
    this.count = 0;
  }
}
