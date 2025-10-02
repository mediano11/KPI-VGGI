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

    let a = R2 - R1;
    if (Math.abs(R2 - R1) < 1e-9) a = 1e-5

    let b;
    if (phi < 0 && a < 0) b = c / 4;
    else if (phi > 0 && a > 0) b = c / 4;
    else if (phi < 0 && a > 0) b = (3 * c) / 4;
    else if (phi > 0 && a < 0) b = (3 * c) / 4;


    // --- Surface definition ---
    const r = (z) => a * (1 - Math.cos((2 * Math.PI * z) / c)) + R1;
    const rPrime = (z) => a * ((2 * Math.PI) / c) * Math.sin((2 * Math.PI * z) / c);
    const A = (z) => Math.sqrt(1 + Math.pow(rPrime(z), 2));

    const k1 = (z) => {
      const rpp = a * Math.pow((2 * Math.PI) / c, 2) * Math.cos((2 * Math.PI * z) / c);
      return -rpp / Math.pow(A(z), 3);
    }
   
    const k2 = (z) => 1 / (r(z) * A(z));
    const K = (z) => k1(z) * k2(z);

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
}
