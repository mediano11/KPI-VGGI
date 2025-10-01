function deg2rad(angle) {
  return (angle * Math.PI) / 180;
}

// Constructor
function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();
  this.count = 0;

  // Collections of line-strips for U and V families
  this.uBuffers = [];
  this.uCounts = [];
  this.vBuffers = [];
  this.vCounts = [];

  this.BufferData = function (vertices) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
    this.count = vertices.length / 3;
  };

  this.Draw = function () {
    // Draw U polylines
    for (let i = 0; i < this.uBuffers.length; i++) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.uBuffers[i]);
      gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(shProgram.iAttribVertex);
      gl.drawArrays(gl.LINE_STRIP, 0, this.uCounts[i]);
    }
    // Draw V polylines
    for (let i = 0; i < this.vBuffers.length; i++) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffers[i]);
      gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(shProgram.iAttribVertex);
      gl.drawArrays(gl.LINE_STRIP, 0, this.vCounts[i]);
    }
  };

  this.BuildConjugationSurface = function (params) {
    const { R1, R2, c, phiDeg, numU, numV, numVlines } = params;

    const phi = deg2rad(phiDeg);
    const tanPhi = Math.tan(phi);

    // let a;
    let a = currentParams.R2 - currentParams.R1;
    // if (Math.abs(R1 - R2) < 1e-12) {
    //   console.warn("R1 == R2; degeneracy, set a=0.");
    //   a = 0;
    // } else {
    //   const discriminant =
    //     Math.pow(R1 - R2, 2) / 2 +
    //     Math.pow(c * tanPhi, 2) / (8 * Math.PI * Math.PI);
    //   a = (-1 / (R1 - R2)) * discriminant;

    //   if (R1 > R2 && a >= 0) {
    //     console.warn("Expected a < 0 when R1 > R2; check input parameters.");
    //   }
    // }

    let arg = (c * tanPhi) / (2 * Math.PI * a);
    if (!isFinite(arg)) {
      console.error("Invalid parameter combination (division by zero).");
      arg = 0;
    }
    if (Math.abs(arg) > 1) {
      console.warn("arcsin argument out of range; clamping.");
      arg = Math.max(-1, Math.min(1, arg));
    }

    // let asinVal = Math.asin(arg);
    // let bCandidate;
    // if ((phi > 0 && R2 > R1) || (phi < 0 && R2 < R1)) {
    //   bCandidate = (c / (2 * Math.PI)) * asinVal;
    // } else {
    //   bCandidate = c / 2 - (c / (2 * Math.PI)) * asinVal;
    // }
    let bCandidate;
    if (phi < 0 && a < 0) bCandidate = c / 4;
    else if (phi > 0 && a > 0) bCandidate = c / 4;
    else if (phi < 0 && a > 0) bCandidate = (3 * c) / 4;
    else if (phi > 0 && a < 0) bCandidate = (3 * c) / 4;

    // normalize b into (0,c)
    let b = ((bCandidate % c) + c) % c;
    if (b <= 1e-9) b = 1e-6;

    // --- Surface definition ---
    const r = (z) => a * (1 - Math.cos((2 * Math.PI * z) / c)) + R1;
    const rPrime = (z) =>
      a * ((2 * Math.PI) / c) * Math.sin((2 * Math.PI * z) / c);
    const A = (z) =>
      Math.sqrt(
        1 +
          Math.pow((2 * Math.PI * a) / c, 2) *
            Math.pow(Math.sin((2 * Math.PI * z) / c), 2)
      );

    const surfacePoint = (z, theta) => {
      const radius = r(z);
      return [radius * Math.cos(theta), radius * Math.sin(theta), z];
    };

    const normal = (z, theta) => {
      const rx = r(z);
      const rp = rPrime(z);
      let nx = -rx * Math.cos(theta);
      let ny = -rx * Math.sin(theta);
      let nz = rx * rp;
      let len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (len < 1e-12) return [0, 0, 1]; // FIX: fallback if degenerate
      return [nx / len, ny / len, nz / len];
    };

    const k1 = (z) =>
      (-(4 * Math.PI * Math.PI * a) / (c * c * Math.pow(A(z), 3))) *
      Math.cos((2 * Math.PI * z) / c);
    const k2 = (z) => 1 / (r(z) * A(z));
    const K = (z) =>
      (-(4 * Math.PI * Math.PI * a) / (c * c * r(z) * Math.pow(A(z), 4))) *
      Math.cos((2 * Math.PI * z) / c);

    // Generate U-polylines
    this.uBuffers = [];
    this.uCounts = [];
    for (let i = 0; i < numU; i++) {
      const z = (b * i) / (numU - 1);
      const radius = r(z);
      const vertices = [];
      const loops = numV + 1;
      for (let j = 0; j < loops; j++) {
        const theta = (2 * Math.PI * j) / numV;
        const x = radius * Math.cos(theta);
        const y = radius * Math.sin(theta);
        vertices.push(x, y, z);
      }
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(vertices),
        gl.STREAM_DRAW
      );
      this.uBuffers.push(buf);
      this.uCounts.push(vertices.length / 3);
    }

    // Generate V-polylines
    this.vBuffers = [];
    this.vCounts = [];
    for (let j = 0; j < numVlines; j++) {
      const theta = (2 * Math.PI * j) / numVlines;
      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);
      const vertices = [];
      for (let i = 0; i < numU; i++) {
        const z = (b * i) / (numU - 1);
        const radius = r(z);
        vertices.push(radius * cosTheta, radius * sinTheta, z);
      }
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(vertices),
        gl.STREAM_DRAW
      );
      this.vBuffers.push(buf);
      this.vCounts.push(vertices.length / 3);
    }

    this.geometricFunctions = {
      r: r,
      rPrime: rPrime,
      A: A,
      surfacePoint: surfacePoint,
      normal: normal,
      k1: k1,
      k2: k2,
      K: K,
      a: a,
      b: b,
    };
  };

  this.getCurvatureInfo = function (z) {
    if (!this.geometricFunctions) return null;
    const { r, A, k1, k2, K } = this.geometricFunctions;
    return { radius: r(z), A: A(z), k1: k1(z), k2: k2(z), K: K(z) };
  };

  this.getNormals = function (numSamples = 20) {
    if (!this.geometricFunctions) return [];
    const { normal, b } = this.geometricFunctions;
    const normals = [];
    for (let i = 0; i < numSamples; i++) {
      const z = (b * i) / (numSamples - 1);
      const theta = 0;
      normals.push({ z, theta, normal: normal(z, theta) });
    }
    return normals;
  };
}
