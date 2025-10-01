// Global variables for the surface parameters
let currentParams = {
  R1: 0.5,
  R2: 1.5,
  c: 6.0,
  phiDeg: 30,
  numU: 24,
  numV: 72,
  numVlines: 36,
};

// Initialize sliders and event listeners
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
      // Calculate and display derived parameters using exact formulas
      const phi = deg2rad(currentParams.phiDeg);
      const tanPhi = Math.tan(phi);
      const discriminant =
        Math.pow(currentParams.R1 - currentParams.R2, 2) / 2 +
        Math.pow(currentParams.c * tanPhi, 2) / (8 * Math.PI * Math.PI);
      const a = (-1 / (currentParams.R1 - currentParams.R2)) * discriminant;

      // b calculation with conditional logic
      const arcsinArg = (currentParams.c * tanPhi) / (2 * Math.PI * a);
      let b;

      if (
        (phi > 0 && currentParams.R2 > currentParams.R1) ||
        (phi < 0 && currentParams.R2 < currentParams.R1)
      ) {
        b = (currentParams.c / (2 * Math.PI)) * Math.asin(arcsinArg);
      } else if (
        (phi < 0 && currentParams.R2 > currentParams.R1) ||
        (phi > 0 && currentParams.R2 < currentParams.R1)
      ) {
        b =
          currentParams.c / 2 -
          (currentParams.c / (2 * Math.PI)) * Math.asin(arcsinArg);
      } else {
        b = (currentParams.c / (2 * Math.PI)) * Math.asin(arcsinArg);
      }

      // Update calculated parameters display
      const aValue = document.getElementById("a-value");
      const bValue = document.getElementById("b-value");
      if (aValue) aValue.textContent = a.toFixed(3);
      if (bValue) bValue.textContent = b.toFixed(3);

      // Calculate and display curvature information at z=0
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

      // Rebuild the surface
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
