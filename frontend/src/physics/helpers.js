import Matter from 'matter-js'

const { Bodies } = Matter

export const createGear = (x, y, radius, teethCount, options) => {
  const parts = [];
  const renderOpts = options && options.render ? options.render : { fillStyle: '#94a3b8', strokeStyle: '#475569', lineWidth: 2 };

  // Circular core of the gear
  parts.push(Bodies.circle(x, y, radius, { render: renderOpts }));

  // Plop rectangles around the edge to form the teeth
  const toothWidth = (radius * Math.PI * 2) / teethCount * 0.4;
  const toothHeight = radius * 0.4;

  for (let i = 0; i < teethCount; i++) {
    const angle = (Math.PI * 2 / teethCount) * i;
    const tx = x + Math.cos(angle) * radius;
    const ty = y + Math.sin(angle) * radius;

    parts.push(Bodies.rectangle(tx, ty, toothHeight, toothWidth, { angle: angle, render: renderOpts }));
  }

  return Matter.Body.create({ parts: parts, ...options });
};

export const getBodyDimensions = (body) => {
  if (body.circleRadius) {
    return { radius: body.circleRadius }
  }

  if (body.vertices && body.vertices.length >= 4) {
    const v = body.vertices
    const width = Math.hypot(v[1].x - v[0].x, v[1].y - v[0].y)
    const height = Math.hypot(v[2].x - v[1].x, v[2].y - v[1].y)
    return { width: Math.round(width), height: Math.round(height) }
  }

  return {
    width: body.bounds.max.x - body.bounds.min.x,
    height: body.bounds.max.y - body.bounds.min.y,
  }
}

export const getConstraintType = (constraint) => {
  if (constraint.length === 0) return 'pivot'
  if (constraint.isRope) return 'rope'
  if (constraint.stiffness === 1) return 'rod'
  return 'spring'
}

export const getConstraintStrokeStyle = (type, isSelected = false) => {
  if (type === 'pivot') {
    return {
      strokeStyle: isSelected ? '#fcd34d' : '#f59e0b',
      lineWidth: isSelected ? 5 : 4,
    }
  }

  if (type === 'rod') {
    return {
      strokeStyle: isSelected ? '#38bdf8' : '#94a3b8',
      lineWidth: isSelected ? 7 : 5,
    }
  }

  if (type === 'rope') {
    return {
      strokeStyle: isSelected ? '#facc15' : '#d97706',
      lineWidth: isSelected ? 5 : 3,
    }
  }

  return {
    strokeStyle: isSelected ? '#f87171' : '#ef4444',
    lineWidth: isSelected ? 5 : 3,
  }
}

export const applyConstraintRender = (constraint, isSelected = false) => {
  const type = getConstraintType(constraint)
  if (constraint.render?.visible === false && type === 'pivot') return
  Object.assign(constraint.render, getConstraintStrokeStyle(type, isSelected))
}

export const getConstraintWorldPoint = (body, point) => {
  if (body) {
    if (body.isStatic) {
      return Matter.Vector.add(body.position, point || { x: 0, y: 0 })
    }
    return Matter.Vector.add(body.position, Matter.Vector.rotate(point || { x: 0, y: 0 }, body.angle))
  }

  return point || { x: 0, y: 0 }
}

export const getDistanceToSegment = (point, start, end) => {
  const dx = end.x - start.x
  const dy = end.y - start.y

  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y)
  }

  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy))
  )

  const projection = {
    x: start.x + t * dx,
    y: start.y + t * dy,
  }

  return Math.hypot(point.x - projection.x, point.y - projection.y)
}

export const resetBodyHighlight = (body) => {
  if (!body?.render) return
  body.render.lineWidth = 1.5
  if (body.render.fillStyle === '#6366f1') body.render.strokeStyle = '#4f46e5'
  else if (body.render.fillStyle === '#22c55e') body.render.strokeStyle = '#16a34a'
  else if (body.render.fillStyle === '#eab308') body.render.strokeStyle = '#ca8a04'
  else if (body.render.fillStyle === '#94a3b8') body.render.strokeStyle = '#64748b'
  else body.render.strokeStyle = '#94a3b8'
}
