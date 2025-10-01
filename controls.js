// // Global variables for the surface parameters
let currentParams = {
  R1: 0.5,
  R2: 1.5,
  c: 6.0,
  phiDeg: 30,
  numU: 24,
  numV: 72,
  numVlines: 36,
};

function initializeControls() {
  const sliders = ["R1", "R2", "c", "phiDeg", "numU", "numV", "numVlines"];

  sliders.forEach((param) => {
    const slider = document.getElementById(param);
    const valueDisplay = document.getElementById(param + "-value");

    if (slider && valueDisplay) {
      // Update display when slider changes
      slider.addEventListener("input", function () {
        const value = parseFloat(this.value);
        currentParams[param] = value;

        // Update display
        if (param === "phiDeg") {
          valueDisplay.textContent = (value >= 0 ? "+" : "") + value + "°";
        } else if (
          param === "numU" ||
          param === "numV" ||
          param === "numVlines"
        ) {
          valueDisplay.textContent = Math.round(value);
        } else {
          valueDisplay.textContent = value.toFixed(1);
        }

        // Rebuild surface with new parameters
        rebuildSurface();
      });
    }
  });

  // Reset button
  const resetBtn = document.getElementById("reset-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", resetToDefaults);
  }

  // Preset buttons
  const p1 = document.getElementById("preset-1");
  const p2 = document.getElementById("preset-2");
  const p3 = document.getElementById("preset-3");
  const p4 = document.getElementById("preset-4");

  if (p1) p1.addEventListener("click", applyPreset1);
  if (p2) p2.addEventListener("click", applyPreset2);
  if (p3) p3.addEventListener("click", applyPreset3);
  if (p4) p4.addEventListener("click", applyPreset4);

  // Initial display update
  updateAllDisplays();
}

function updateAllDisplays() {
  Object.keys(currentParams).forEach((param) => {
    const slider = document.getElementById(param);
    const valueDisplay = document.getElementById(param + "-value");
    const value = currentParams[param];

    if (slider && valueDisplay) {
      slider.value = value;

      if (param === "phiDeg") {
        valueDisplay.textContent = (value >= 0 ? "+" : "") + value + "°";
      } else if (
        param === "numU" ||
        param === "numV" ||
        param === "numVlines"
      ) {
        valueDisplay.textContent = Math.round(value);
      } else {
        valueDisplay.textContent = value.toFixed(1);
      }
    }
  });
}

function rebuildSurface() {
  if (surface && surface.BuildConjugationSurface) {
    try {
      const phi = deg2rad(currentParams.phiDeg);
      const a = currentParams.R2 - currentParams.R1;
      c = currentParams.c;
      let b;
      // const tanPhi = Math.tan(phi);
      // const discriminant =
      //   Math.pow(currentParams.R1 - currentParams.R2, 2) / 2 +
      //   Math.pow(currentParams.c * tanPhi, 2) / (8 * Math.PI * Math.PI);
      // const a = (-1 / (currentParams.R1 - currentParams.R2)) * discriminant;
      // const arcsinArg = (currentParams.c * tanPhi) / (2 * Math.PI * a);
      // if (
      //   (phi > 0 && currentParams.R2 > currentParams.R1) ||
      //   (phi < 0 && currentParams.R2 < currentParams.R1)
      // ) {
      //   b = (currentParams.c / (2 * Math.PI)) * Math.asin(arcsinArg);

      // } else if (
      //   (phi < 0 && currentParams.R2 > currentParams.R1) ||
      //   (phi > 0 && currentParams.R2 < currentParams.R1)
      // ) {
      //   b =
      //     currentParams.c / 2 -
      //     (currentParams.c / (2 * Math.PI)) * Math.asin(arcsinArg);
      // } else {
      //   b = (currentParams.c / (2 * Math.PI)) * Math.asin(arcsinArg);
      // }
      if (phi < 0 && a < 0) b = c / 4;
      else if (phi > 0 && a > 0) b = c / 4;
      else if (phi < 0 && a > 0) b = (3 * c) / 4;
      else if (phi > 0 && a < 0) b = (3 * c) / 4;

      const aValue = document.getElementById("a-value");
      const bValue = document.getElementById("b-value");
      if (aValue) aValue.textContent = a.toFixed(3);
      if (bValue) bValue.textContent = b.toFixed(3);

      if (surface && surface.getCurvatureInfo) {
        const curvatureInfo = surface.getCurvatureInfo(0);
        if (curvatureInfo) {
          const k1Value = document.getElementById("k1-value");
          const k2Value = document.getElementById("k2-value");
          const KValue = document.getElementById("K-value");

          if (k1Value) k1Value.textContent = curvatureInfo.k1.toFixed(4);
          if (k2Value) k2Value.textContent = curvatureInfo.k2.toFixed(4);
          if (KValue) KValue.textContent = curvatureInfo.K.toFixed(4);
        }
      }

      surface.BuildConjugationSurface(currentParams);

      // Redraw
      if (typeof draw === "function") {
        draw();
      }
    } catch (error) {
      console.error("Error rebuilding surface:", error);
    }
  }
}

function resetToDefaults() {
  currentParams = {
    R1: 0.5,
    R2: 1.5,
    c: 6.0,
    phiDeg: 30,
    numU: 24,
    numV: 72,
    numVlines: 36,
  };

  updateAllDisplays();
  rebuildSurface();
}

// Override the original initGL function to use our parameters
const originalInitGL = initGL;
initGL = function () {
  originalInitGL();

  // Initialize controls after WebGL is set up
  setTimeout(() => {
    initializeControls();
    rebuildSurface();
  }, 100);
};

function applyPreset1() {
  // 1) phi > 0, a > 0
  const baseR1 = 0.5;
  const baseR2 = 0.8;
  const baseC = 3;
  const basePhiDeg = 30;
  currentParams.R1 = baseR1;
  currentParams.R2 = baseR2;
  currentParams.c = baseC;
  currentParams.phiDeg = basePhiDeg;
  updateAllDisplays();
  rebuildSurface();
}

function applyPreset2() {
  // 2) phi < 0, a < 0
  const baseR1 = 0.9;
  const baseR2 = 0.5;
  const baseC = 4.0;
  const basePhiDeg = -30;
  currentParams.R1 = baseR1;
  currentParams.R2 = baseR2;
  currentParams.c = baseC;
  currentParams.phiDeg = basePhiDeg;
  updateAllDisplays();
  rebuildSurface();
}

function applyPreset3() {
  // 3) phi < 0, a > 0
  currentParams.phiDeg = -30;
  currentParams.R1 = 0.5;
  currentParams.R2 = 0.8;
  currentParams.c = 3.0;
  updateAllDisplays();
  rebuildSurface();
}

function applyPreset4() {
  // 4) phi > 0, a < 0
  currentParams.phiDeg = 30;
  currentParams.R1 = 0.8;
  currentParams.R2 = 0.5;
  currentParams.c = 3.0;
  updateAllDisplays();
  rebuildSurface();
}
