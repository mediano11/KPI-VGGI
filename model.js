function deg2rad(angle) {
  return (angle * Math.PI) / 180;
}

// Constructor
function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();
  this.count = 0;

  this.BufferData = function (vertices) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    this.count = vertices.length / 3;
  };

  this.Draw = function () {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.drawArrays(gl.LINE_STRIP, 0, this.count);
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
