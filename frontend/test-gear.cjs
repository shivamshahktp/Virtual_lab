const Matter = require('matter-js');

function createGear(x, y, radius, teethCount, isMotor) {
  const parts = [];
  // Core
  parts.push(Matter.Bodies.circle(x, y, radius));
  
  // Teeth
  const toothWidth = (radius * Math.PI * 2) / teethCount * 0.4;
  const toothHeight = radius * 0.4; // Extends outwards
  
  for (let i = 0; i < teethCount; i++) {
    const angle = (Math.PI * 2 / teethCount) * i;
    // position at edge
    const tx = x + Math.cos(angle) * (radius);
    const ty = y + Math.sin(angle) * (radius);
    
    const tooth = Matter.Bodies.rectangle(tx, ty, toothHeight, toothWidth, {
      angle: angle
    });
    parts.push(tooth);
  }
  
  const body = Matter.Body.create({
    parts: parts,
    isStatic: isMotor,
    friction: 0.1,
    restitution: 0.2,
  });
  
  return body;
}

const g = createGear(100, 100, 50, 12, true);
console.log('Parts count:', g.parts.length);
console.log('Total area:', g.area);
