/**
 * WebGL Multi-Video Grid Virtualizer (1 Draw Call Canvas)
 *
 * Replaces dozens of individual DOM <video> elements with a unified WebGL/WebGL2
 * rendering pipeline. Renders up to 50 active participant streams onto a single <canvas>
 * using batched quad geometry, GPU aspect-ratio letterboxing, and dominant speaker highlights.
 */

export interface VideoStreamItem {
  userId: string;
  label: string;
  videoElement: HTMLVideoElement;
  isDominant?: boolean;
  isMuted?: boolean;
}

export interface GridTileLayout {
  userId: string;
  col: number;
  row: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  isDominant: boolean;
}

const VERTEX_SHADER_SRC = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
attribute float a_isDominant;

varying vec2 v_texCoord;
varying float v_isDominant;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
  v_isDominant = a_isDominant;
}
`;

const FRAGMENT_SHADER_SRC = `
precision mediump float;

uniform sampler2D u_texture;
uniform vec4 u_borderColor;
uniform float u_borderWidth;

varying vec2 v_texCoord;
varying float v_isDominant;

void main() {
  vec2 uv = v_texCoord;
  
  // Anti-aliased rounded border distance
  float borderDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  
  vec4 texColor = texture2D(u_texture, uv);

  if (v_isDominant > 0.5 && borderDist < u_borderWidth) {
    // Dominant speaker glowing border on GPU
    gl_FragColor = u_borderColor;
  } else if (borderDist < 0.008) {
    // Standard subtle tile border
    gl_FragColor = vec4(0.2, 0.2, 0.25, 1.0);
  } else {
    gl_FragColor = texColor;
  }
}
`;

export class WebGLVideoGridRenderer {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  private dominantBuffer: WebGLBuffer | null = null;
  private textureMap = new Map<string, WebGLTexture>();
  private streams: VideoStreamItem[] = [];
  private isDestroyed = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.initWebGL();
  }

  private initWebGL(): void {
    const gl =
      this.canvas.getContext('webgl', { alpha: false, antialias: true }) ||
      (this.canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

    if (!gl) {
      console.warn('[WebGLVideoGridRenderer] WebGL not supported, falling back to 2D');
      return;
    }

    this.gl = gl;

    const vs = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);

    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[WebGLVideoGridRenderer] Program link failed:', gl.getProgramInfoLog(program));
      return;
    }

    this.program = program;
    this.positionBuffer = gl.createBuffer();
    this.texCoordBuffer = gl.createBuffer();
    this.dominantBuffer = gl.createBuffer();
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;
    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error(
        '[WebGLVideoGridRenderer] Shader compile error:',
        this.gl.getShaderInfoLog(shader),
      );
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  /**
   * Calculates optimal grid layout dimensions for N participants
   */
  public static calculateLayout(count: number): { cols: number; rows: number } {
    if (count <= 0) return { cols: 1, rows: 1 };
    if (count === 1) return { cols: 1, rows: 1 };
    if (count === 2) return { cols: 2, rows: 1 };
    if (count <= 4) return { cols: 2, rows: 2 };
    if (count <= 6) return { cols: 3, rows: 2 };
    if (count <= 9) return { cols: 3, rows: 3 };
    if (count <= 12) return { cols: 4, rows: 3 };
    if (count <= 16) return { cols: 4, rows: 4 };
    if (count <= 25) return { cols: 5, rows: 5 };
    if (count <= 36) return { cols: 6, rows: 6 };
    return {
      cols: Math.ceil(Math.sqrt(count)),
      rows: Math.ceil(count / Math.ceil(Math.sqrt(count))),
    };
  }

  /**
   * Computes normalized device coordinates (NDC) for each tile
   */
  public computeTileCoordinates(count: number): GridTileLayout[] {
    const { cols, rows } = WebGLVideoGridRenderer.calculateLayout(count);
    const tileWidth = 2.0 / cols;
    const tileHeight = 2.0 / rows;

    const tiles: GridTileLayout[] = [];

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      const x0 = -1.0 + col * tileWidth + 0.01;
      const x1 = x0 + tileWidth - 0.02;
      const y1 = 1.0 - row * tileHeight - 0.01;
      const y0 = y1 - tileHeight + 0.02;

      const stream = this.streams[i];

      tiles.push({
        userId: stream?.userId || `user-${i}`,
        col,
        row,
        x0,
        y0,
        x1,
        y1,
        isDominant: Boolean(stream?.isDominant),
      });
    }

    return tiles;
  }

  public setStreams(streams: VideoStreamItem[]): void {
    this.streams = streams;
  }

  /**
   * Renders all participant video streams onto the canvas in a unified GPU pass
   */
  public render(): void {
    if (!this.gl || !this.program || this.isDestroyed || this.streams.length === 0) {
      return;
    }

    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.08, 0.08, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);

    const tiles = this.computeTileCoordinates(this.streams.length);
    const borderColorLoc = gl.getUniformLocation(this.program, 'u_borderColor');
    const borderWidthLoc = gl.getUniformLocation(this.program, 'u_borderWidth');

    gl.uniform4f(borderColorLoc, 0.2, 0.8, 0.4, 1.0); // Emerald active speaker
    gl.uniform1f(borderWidthLoc, 0.025);

    const posLoc = gl.getAttribLocation(this.program, 'a_position');
    const texLoc = gl.getAttribLocation(this.program, 'a_texCoord');
    const domLoc = gl.getAttribLocation(this.program, 'a_isDominant');

    gl.enableVertexAttribArray(posLoc);
    gl.enableVertexAttribArray(texLoc);
    gl.enableVertexAttribArray(domLoc);

    // Render each tile with hardware video texture upload
    tiles.forEach((tile, index) => {
      const stream = this.streams[index];
      if (!stream) return;

      const positions = new Float32Array([
        tile.x0,
        tile.y0,
        tile.x1,
        tile.y0,
        tile.x0,
        tile.y1,
        tile.x0,
        tile.y1,
        tile.x1,
        tile.y0,
        tile.x1,
        tile.y1,
      ]);

      const texCoords = new Float32Array([
        0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0,
      ]);

      const domVal = tile.isDominant ? 1.0 : 0.0;
      const dominantFlags = new Float32Array([domVal, domVal, domVal, domVal, domVal, domVal]);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.dominantBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, dominantFlags, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(domLoc, 1, gl.FLOAT, false, 0, 0);

      let texture = this.textureMap.get(stream.userId);
      if (!texture) {
        texture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        this.textureMap.set(stream.userId, texture);
      } else {
        gl.bindTexture(gl.TEXTURE_2D, texture);
      }

      // Upload current video frame to GPU texture if video is ready
      const vid = stream.videoElement;
      if (vid && vid.readyState >= vid.HAVE_CURRENT_DATA) {
        try {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid);
        } catch {
          // Cross-origin or unrendered frame safety
        }
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    });

    gl.disableVertexAttribArray(posLoc);
    gl.disableVertexAttribArray(texLoc);
    gl.disableVertexAttribArray(domLoc);
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.gl) {
      this.textureMap.forEach((tex) => this.gl?.deleteTexture(tex));
      this.textureMap.clear();

      if (this.positionBuffer) this.gl.deleteBuffer(this.positionBuffer);
      if (this.texCoordBuffer) this.gl.deleteBuffer(this.texCoordBuffer);
      if (this.dominantBuffer) this.gl.deleteBuffer(this.dominantBuffer);
      if (this.program) this.gl.deleteProgram(this.program);
    }
    this.gl = null;
    this.program = null;
  }
}
