import Matter from 'matter-js'

export const setupMatterEngine = (engine) => {
  Matter.Resolver._restingThresh = 0.001 // push resting threshold down so small bounces don't just die instantly

  // Matter.js loses energy on elastic collisions, this is a workaround to bump speed back up
  Matter.Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
      const a = pair.bodyA;
      const b = pair.bodyB;
      if (a.isStatic && !b.isStatic) {
        b._impactSpeed = b.speed;
        b._impactTime = engine.timing.timestamp;
      }
      if (b.isStatic && !a.isStatic) {
        a._impactSpeed = a.speed;
        a._impactTime = engine.timing.timestamp;
      }
    });
  });

  Matter.Events.on(engine, 'collisionEnd', (event) => {
    event.pairs.forEach((pair) => {
      const a = pair.bodyA;
      const b = pair.bodyB;
      
      if (a.isStatic && !b.isStatic && b._impactTime !== undefined) {
         // boost the speed back if they bounced quick and are super elastic
         if (engine.timing.timestamp - b._impactTime < 150 && b.restitution >= 0.99) {
           Matter.Body.setSpeed(b, b._impactSpeed);
         }
         b._impactSpeed = undefined;
         b._impactTime = undefined;
      }
      if (b.isStatic && !a.isStatic && a._impactTime !== undefined) {
         if (engine.timing.timestamp - a._impactTime < 150 && a.restitution >= 0.99) {
           Matter.Body.setSpeed(a, a._impactSpeed);
         }
         a._impactSpeed = undefined;
         a._impactTime = undefined;
      }
    });
  });
}
