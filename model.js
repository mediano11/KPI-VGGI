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

  // Build U/V wireframe for surface of conjugation using the analytical
  // parametric surface from the PDF: r(z) = a(1-cos(2πz/c)) + R₁
  // with matching conditions to determine parameters a and b
  this.BuildConjugationSurface = function (params) {
    // Input parameters
    const R1 = params.R1 !== undefined ? params.R1 : 0.5; // cylinder radius
    const R2 = params.R2 !== undefined ? params.R2 : 1.5; // cone base radius at junction
    const c = params.c !== undefined ? params.c : 4 * R2; // meridian period parameter
    const phiDeg = params.phiDeg !== undefined ? params.phiDeg : 30; // cone vertex angle
    const numU = params.numU !== undefined ? params.numU : 20; // along z (meridian)
    const numV = params.numV !== undefined ? params.numV : 48; // around axis per U polyline
    const numVlines = params.numVlines !== undefined ? params.numVlines : 24; // meridians

    const phi = deg2rad(phiDeg);
    const tanPhi = Math.tan(phi);

    // Solve matching conditions for a and b using exact formulas from PDF:
    // a = -1/(R1-R2) * [((R1-R2)²/2 + (c²tan²φ)/(8π²))]
    const discriminant =
      Math.pow(R1 - R2, 2) / 2 +
      Math.pow(c * tanPhi, 2) / (8 * Math.PI * Math.PI);
    const a = (-1 / (R1 - R2)) * discriminant;

    // b calculation with conditional logic based on angle and radius relationships:
    // b = c/(2π) * arcsin((c*tanφ)/(2πa)) if φ > 0, R2 > R1 or φ < 0, R2 < R1
    // b = c/2 - c/(2π) * arcsin((c*tanφ)/(2πa)) if φ < 0, R2 > R1 or φ > 0, R2 < R1
    const arcsinArg = (c * tanPhi) / (2 * Math.PI * a);
    let b;

    // Validate arcsin argument is within valid range [-1, 1]
    if (Math.abs(arcsinArg) > 1) {
      console.warn(
        "Invalid parameter combination: arcsin argument out of range. " +
          "Try adjusting R1, R2, c, or φ values."
      );
      b = c / 4; // fallback value
    } else {
      if ((phi > 0 && R2 > R1) || (phi < 0 && R2 < R1)) {
        b = (c / (2 * Math.PI)) * Math.asin(arcsinArg);
      } else if ((phi < 0 && R2 > R1) || (phi > 0 && R2 < R1)) {
        b = c / 2 - (c / (2 * Math.PI)) * Math.asin(arcsinArg);
      } else {
        // Default case (should not happen with proper parameters)
        b = (c / (2 * Math.PI)) * Math.asin(arcsinArg);
      }
    }

    // Ensure b is positive and reasonable
    if (b <= 0 || b > c) {
      console.warn("Invalid b value, using fallback");
      b = Math.min(c / 2, Math.max(0.1, b));
    }

    // Meridian function: r(z) = a(1-cos(2πz/c)) + R₁
    const r = (z) => a * (1 - Math.cos((2 * Math.PI * z) / c)) + R1;

    // Derivative of r(z): r'(z) = a * (2π/c) * sin(2πz/c)
    const rPrime = (z) =>
      a * ((2 * Math.PI) / c) * Math.sin((2 * Math.PI * z) / c);

    // A(z) term for fundamental forms
    const A = (z) =>
      Math.sqrt(
        1 +
          Math.pow((2 * Math.PI * a) / c, 2) *
            Math.pow(Math.sin((2 * Math.PI * z) / c), 2)
      );

    // Surface point function: parametric equations
    const surfacePoint = (z, theta) => {
      const radius = r(z);
      return [
        radius * Math.cos(theta), // x
        radius * Math.sin(theta), // y
        z, // z
      ];
    };

    // Normal vector function
    const normal = (z, theta) => {
      const rx = r(z);
      const rp = rPrime(z);
      const nx = -rx * Math.cos(theta);
      const ny = -rx * Math.sin(theta);
      const nz = rx * rp;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      return [nx / len, ny / len, nz / len];
    };

    // Curvature functions
    const k1 = (z) =>
      (-(4 * Math.PI * Math.PI * a) / (c * c * Math.pow(A(z), 3))) *
      Math.cos((2 * Math.PI * z) / c);
    const k2 = (z) => 1 / (r(z) * A(z));
    const K = (z) =>
      (-(4 * Math.PI * Math.PI * a) / (c * c * r(z) * Math.pow(A(z), 4))) *
      Math.cos((2 * Math.PI * z) / c);

    // Generate U-polylines: constant z, sweep θ around [0, 2π]
    this.uBuffers = [];
    this.uCounts = [];
    for (let i = 0; i < numU; i++) {
      const z = (b * i) / (numU - 1); // z from 0 to b
      const radius = r(z);

      const vertices = [];
      const loops = numV + 1; // close the ring visually by repeating first vertex
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

    // Generate V-polylines: constant θ, sweep z along the meridian
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
        const x = radius * cosTheta;
        const y = radius * sinTheta;
        vertices.push(x, y, z);
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

    // Store geometric functions for external access
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

  // Method to get curvature information at a specific z value
  this.getCurvatureInfo = function (z) {
    if (!this.geometricFunctions) return null;

    const { r, A, k1, k2, K } = this.geometricFunctions;
    return {
      radius: r(z),
      A: A(z),
      k1: k1(z),
      k2: k2(z),
      K: K(z),
    };
  };

  // Method to get normal vectors for visualization
  this.getNormals = function (numSamples = 20) {
    if (!this.geometricFunctions) return [];

    const { normal, b } = this.geometricFunctions;
    const normals = [];

    for (let i = 0; i < numSamples; i++) {
      const z = (b * i) / (numSamples - 1);
      const theta = 0; // Sample at theta = 0 for simplicity
      const n = normal(z, theta);
      normals.push({ z, theta, normal: n });
    }

    return normals;
  };
}

function CreateSurfaceData() {
  let vertexList = [];

  for (let i = 0; i < 360; i += 5) {
    vertexList.push(Math.sin(deg2rad(i)), 1, Math.cos(deg2rad(i)));
    vertexList.push(Math.sin(deg2rad(i)), 0, Math.cos(deg2rad(i)));
  }

  return vertexList;
}
