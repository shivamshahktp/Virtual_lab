import React, { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { io } from 'socket.io-client';

const PhysicsCanvas = ({ spawnRequest, setChartData }) => {
  const sceneRef = useRef(null);
  const engineRef = useRef(Matter.Engine.create());
  const socketRef = useRef(null);
  const lastChartUpdate = useRef(0);

  // ---------------------------------------------------------
  // EFFECT 1: Initialize Physics Engine & Socket Connection
  // ---------------------------------------------------------
  useEffect(() => {
    const { Engine, Render, Runner, World, Bodies, Mouse, MouseConstraint, Events } = Matter;
    const engine = engineRef.current;

    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: 800,
        height: 500, // Adjusted height slightly to fit the UI better
        wireframes: false,
        background: '#0f172a'
      }
    });

    const floor = Bodies.rectangle(400, 490, 810, 60, { 
      isStatic: true, 
      render: { fillStyle: '#334155' } 
    });
    World.add(engine.world, [floor]);

    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: { stiffness: 0.2, render: { visible: false } }
    });
    World.add(engine.world, mouseConstraint);
    render.mouse = mouse;

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    // Setup WebSockets
    socketRef.current = io('http://localhost:3000'); 

    // Extract Data on every physics tick
    Events.on(engine, 'afterUpdate', () => {
      const bodies = engine.world.bodies;
      
      // 1. Send data to socket (Backend sync)
      const payload = bodies.map(body => ({
        id: body.id, x: body.position.x, y: body.position.y, angle: body.angle, velocity: body.velocity
      }));
      socketRef.current.emit('physics-state-update', payload);

      // 2. Calculate Chart Data (Throttled to 10fps for performance)
      const now = Date.now();
      if (now - lastChartUpdate.current > 100) {
        let totalEnergy = 0;
        
        bodies.forEach(body => {
          if (!body.isStatic) {
            const speed = body.speed;
            // KE = 1/2 * m * v^2
            totalEnergy += 0.5 * body.mass * (speed * speed);
          }
        });

        if (setChartData) {
          setChartData(prevData => {
            const newData = [...prevData, { time: now, energy: Math.round(totalEnergy) }];
            // Keep array size small to prevent memory leaks
            return newData.length > 60 ? newData.slice(newData.length - 60) : newData;
          });
        }
        
        lastChartUpdate.current = now;
      }
    });

    // Listen for incoming server states
    socketRef.current.on('server-state-update', (serverBodies) => {
      const localBodies = engine.world.bodies;
      serverBodies.forEach(serverData => {
        const bodyToUpdate = localBodies.find(b => b.id === serverData.id);
        if (bodyToUpdate) {
          Matter.Body.setPosition(bodyToUpdate, { x: serverData.x, y: serverData.y });
          Matter.Body.setAngle(bodyToUpdate, serverData.angle);
          Matter.Body.setVelocity(bodyToUpdate, serverData.velocity);
        }
      });
    });

    return () => {
      Render.stop(render);
      Runner.stop(runner);
      World.clear(engine.world);
      Engine.clear(engine);
      render.canvas.remove();
      render.canvas = null;
      render.context = null;
      render.textures = {};
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [setChartData]);

  // ---------------------------------------------------------
  // EFFECT 2: Handle Spawning New Objects
  // ---------------------------------------------------------
  useEffect(() => {
    if (!spawnRequest || !engineRef.current) return;

    const { Bodies, World } = Matter;
    let newBody;

    // Add a bit of randomness to the spawn X coordinate so they don't stack perfectly
    const randomX = 350 + Math.random() * 100;

    if (spawnRequest.type === 'box') {
      newBody = Bodies.rectangle(randomX, 50, 60, 60, { 
        id: spawnRequest.id, 
        render: { fillStyle: '#10b981' } 
      });
    } else if (spawnRequest.type === 'circle') {
      newBody = Bodies.circle(randomX, 50, 30, { 
        id: spawnRequest.id, 
        render: { fillStyle: '#f59e0b' } 
      });
    }

    if (newBody) {
      World.add(engineRef.current.world, newBody);
      if (socketRef.current) {
        socketRef.current.emit('object-created', { type: spawnRequest.type, id: spawnRequest.id, x: randomX, y: 50 });
      }
    }
  }, [spawnRequest]);

  return (
    <div className="flex justify-center items-center h-full w-full bg-slate-800 overflow-hidden">
      <div ref={sceneRef} className="rounded-lg overflow-hidden shadow-2xl" />
    </div>
  );
};

export default PhysicsCanvas;