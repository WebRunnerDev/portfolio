// Bare WebGL2 plumbing for the Swarm (ADR-0013): render targets and the
// float textures the scene writes its nodes and threads into every frame.

export type Target = {
  texture: WebGLTexture
  framebuffer: WebGLFramebuffer
  depth: WebGLRenderbuffer | null
  width: number
  height: number
}

// A color buffer (light over 1 when `hdr`), with depth if asked, sampled
// bilinear: the glow reads the scene at a quarter of its size.
export function target(gl: WebGL2RenderingContext, depth: boolean): Target {
  return {
    texture: gl.createTexture(),
    framebuffer: gl.createFramebuffer(),
    depth: depth ? gl.createRenderbuffer() : null,
    width: 0,
    height: 0,
  }
}

export function sizeTarget(
  gl: WebGL2RenderingContext,
  t: Target,
  width: number,
  height: number,
  hdr: boolean
) {
  t.width = width
  t.height = height
  gl.bindTexture(gl.TEXTURE_2D, t.texture)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    hdr ? gl.RGBA16F : gl.RGBA8,
    width,
    height,
    0,
    gl.RGBA,
    hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
    null
  )
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.bindFramebuffer(gl.FRAMEBUFFER, t.framebuffer)
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    t.texture,
    0
  )
  if (t.depth) {
    gl.bindRenderbuffer(gl.RENDERBUFFER, t.depth)
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height)
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER,
      t.depth
    )
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
}

export function deleteTarget(gl: WebGL2RenderingContext, t: Target) {
  gl.deleteTexture(t.texture)
  gl.deleteFramebuffer(t.framebuffer)
  if (t.depth) gl.deleteRenderbuffer(t.depth)
}

// A float texture of `width` × `height` RGBA texels that shaders read with
// texelFetch (no filtering, which RGBA32F lacks without an extension), its
// data in `data`, uploaded by `upload`: whole, or its first `columns`.
export function dataTexture(
  gl: WebGL2RenderingContext,
  width: number,
  height: number
) {
  const texture = gl.createTexture()
  const data = new Float32Array(Math.max(1, width) * height * 4)
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA32F,
    Math.max(1, width),
    height,
    0,
    gl.RGBA,
    gl.FLOAT,
    data
  )
  return {
    texture,
    data,
    upload(columns = width) {
      if (columns < 1) return
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.pixelStorei(gl.UNPACK_ROW_LENGTH, Math.max(1, width))
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        Math.min(columns, Math.max(1, width)),
        height,
        gl.RGBA,
        gl.FLOAT,
        data
      )
      gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0)
    },
  }
}
