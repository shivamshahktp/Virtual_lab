import Matter from 'matter-js'
import { createGear } from './helpers'

const { Bodies, Composite, Constraint } = Matter

export const loadRoomState = (engine, roomData, width, isInitial = false) => {
  if (roomData && roomData.bodies && roomData.bodies.length > 0) {
    // Spin up all the shapes/motors that the DB or socket sent us
    const loadedBodies = roomData.bodies.map(b => {
      let newBody;
      const opts = b.options || {};
      const dimensions = b.dimensions || {};
      if (b.type === 'motor') {
        if (opts.motorType === 'gear') {
          newBody = createGear(b.x, b.y - 5, opts.gearRadius || 40, opts.gearTeeth || 12, {
            id: b.id, isStatic: opts.isMotorized ?? true, angle: b.angle,
            friction: 0.1, restitution: 0.2,
            render: { fillStyle: '#94a3b8', strokeStyle: '#475569', lineWidth: 2 }
          });
          newBody.isMotor = opts.isMotorized ?? true;
          newBody.motorSpeed = opts.motorSpeed || 0.05;
          newBody.motorDirection = opts.motorDirection || 'clockwise';
          newBody.motorType = 'gear';
          newBody.gearRadius = opts.gearRadius || 40;
          newBody.gearTeeth = opts.gearTeeth || 12;
        } else {
          newBody = Bodies.rectangle(b.x, b.y - 5, dimensions.width || 150, dimensions.height || 20, {
            id: b.id, isStatic: opts.isMotorized ?? true, angle: b.angle,
            render: { fillStyle: '#eab308', strokeStyle: '#ca8a04', lineWidth: 2 }
          });
          newBody.isMotor = opts.isMotorized ?? true;
          newBody.motorSpeed = opts.motorSpeed || 0.05;
          newBody.motorDirection = opts.motorDirection || 'clockwise';
          newBody.motorType = 'rod';
        }
      } else if (b.type === 'circle') {
        newBody = Bodies.circle(b.x, b.y - 5, dimensions.radius || 40, {
          id: b.id, angle: b.angle, velocity: b.velocity, angularVelocity: b.angularVelocity,
          restitution: opts.restitution ?? 0.8, friction: opts.friction ?? 0.1, density: opts.density ?? 0.001,
          render: { fillStyle: '#22c55e', strokeStyle: '#4ade80', lineWidth: 2 }
        });
        Matter.Body.setVelocity(newBody, b.velocity || { x: 0, y: 0 });
      } else {
        newBody = Bodies.rectangle(b.x, b.y - 5, dimensions.width || 80, dimensions.height || 80, {
          id: b.id, angle: b.angle, velocity: b.velocity, angularVelocity: b.angularVelocity,
          restitution: opts.restitution ?? 0.6, friction: opts.friction ?? 0.1, density: opts.density ?? 0.001,
          render: { fillStyle: '#6366f1', strokeStyle: '#818cf8', lineWidth: 2 }
        });
        Matter.Body.setVelocity(newBody, b.velocity || { x: 0, y: 0 });
      }
      return newBody;
    });

    Composite.add(engine.world, loadedBodies);

    // Wire up constraints between the bodies we just built
    if (roomData.constraints) {
      roomData.constraints.forEach(c => {
        const bodyA = Composite.get(engine.world, c.bodyAId, 'body');
        if (c.type === 'pivot' && bodyA) {
          const pivot = Constraint.create({
            id: c.id, bodyA: bodyA, 
            pointA: c.pointA || { x: 0, y: 0 },
            pointB: { x: c.x, y: c.y }, stiffness: 1, length: 0,
            render: c.hidden ? { visible: false } : { strokeStyle: '#f59e0b', lineWidth: 4 }
          });
          Composite.add(engine.world, pivot);
        } else if (c.type === 'spring' || c.type === 'rod' || c.type === 'rope') {
          const bodyB = Composite.get(engine.world, c.bodyBId, 'body');
          if ((bodyA || c.pointA) && bodyB) {
            const newConstraint = Constraint.create({
              id: c.id, bodyA: bodyA, bodyB: bodyB, 
              pointA: c.pointA || { x: 0, y: 0 },
              pointB: c.pointB || { x: 0, y: 0 },
              stiffness: c.stiffness || 0.05,
              length: c.length,
              isRope: c.type === 'rope' || c.isRope,
              maxLength: c.maxLength,
              render: c.type === 'rod' ? { strokeStyle: '#94a3b8', lineWidth: 5 } : c.type === 'rope' ? { strokeStyle: '#d97706', lineWidth: 3 } : { strokeStyle: '#ef4444', lineWidth: 3 }
            });
            Composite.add(engine.world, newConstraint);
          }
        }
      });
    }
  } else if (isInitial) {
    // Stick in a couple of default boxes/circles if the room is blank
    const box = Bodies.rectangle(width / 2, 100, 80, 80, {
      id: 1, restitution: 0.6,
      render: { fillStyle: '#6366f1', strokeStyle: '#4f46e5', lineWidth: 1.5 },
    });
    const circle = Bodies.circle(width / 2 - 120, 50, 40, {
      id: 2, restitution: 0.8,
      render: { fillStyle: '#22c55e', strokeStyle: '#16a34a', lineWidth: 1.5 },
    });
    Composite.add(engine.world, [box, circle]);
  }
};

export const getRoomState = (engine) => {
  const bodiesToSave = engine.world.bodies
    .filter(b => (!b.isStatic || b.isMotor) && b.id !== 999)
    .map(b => ({
      id: b.id,
      x: b.position.x,
      y: b.position.y,
      angle: b.angle,
      velocity: b.velocity,
      angularVelocity: b.angularVelocity,
      type: b.circleRadius ? 'circle' : (b.isMotor ? 'motor' : 'box'),
      dimensions: b.circleRadius ? { radius: b.circleRadius } : (
        b.motorType === 'gear' 
          ? { radius: b.gearRadius }
          : { width: b.bounds.max.x - b.bounds.min.x, height: b.bounds.max.y - b.bounds.min.y }
      ),
      options: {
        restitution: b.restitution,
        friction: b.friction,
        density: b.density,
        motorType: b.motorType,
        gearRadius: b.gearRadius,
        gearTeeth: b.gearTeeth,
        isMotorized: b.isMotor,
        motorSpeed: b.motorSpeed,
        motorDirection: b.motorDirection
      }
    }));

  const constraintsToSave = engine.world.constraints
    .filter(c => c.label !== 'Mouse Constraint')
    .map(c => ({
      id: c.id,
      type: c.length === 0 ? 'pivot' : (c.isRope ? 'rope' : (c.stiffness === 1 ? 'rod' : 'spring')),
      bodyAId: c.bodyA?.id,
      bodyBId: c.bodyB?.id,
      x: c.pointB?.x,
      y: c.pointB?.y,
      pointA: c.pointA,
      pointB: c.pointB,
      stiffness: c.stiffness,
      length: c.length,
      isRope: c.isRope,
      maxLength: c.maxLength,
      hidden: c.render?.visible === false
    }));

  return { bodies: bodiesToSave, constraints: constraintsToSave };
};
