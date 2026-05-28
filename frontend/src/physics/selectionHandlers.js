import Matter from 'matter-js'
import { resetBodyHighlight, applyConstraintRender, getConstraintType } from './helpers'

const { Composite } = Matter

export const createSelectionHandlers = (ctx) => {
  const { 
    engine, 
    selectedBodyRef, 
    selectedConstraintRef, 
    firstSelectedBodyRef, 
    firstSelectedPointRef, 
    firstSelectedAnchorRef, 
    pivotAnchorRef, 
    socket, 
    roomId 
  } = ctx;

  const clearPendingSelections = () => {
    if (firstSelectedBodyRef.current) {
      resetBodyHighlight(firstSelectedBodyRef.current)
      firstSelectedBodyRef.current = null
    }
    firstSelectedPointRef.current = null
    firstSelectedAnchorRef.current = null
    pivotAnchorRef.current = null
  }

  const clearSelectedBody = () => {
    if (selectedBodyRef.current) {
      resetBodyHighlight(selectedBodyRef.current)
      selectedBodyRef.current = null
    }
    window.dispatchEvent(new CustomEvent('body-selection-change', { detail: null }))
  }

  const clearSelectedConstraint = () => {
    if (selectedConstraintRef.current) {
      applyConstraintRender(selectedConstraintRef.current, false)
      selectedConstraintRef.current = null
    }
    window.dispatchEvent(new CustomEvent('constraint-selection-change', { detail: {} }))
  }

  const selectConstraint = (constraint) => {
    clearSelectedBody()
    if (selectedConstraintRef.current && selectedConstraintRef.current.id !== constraint.id) {
      applyConstraintRender(selectedConstraintRef.current, false)
    }

    selectedConstraintRef.current = constraint
    applyConstraintRender(constraint, true)
    window.dispatchEvent(
      new CustomEvent('constraint-selection-change', {
        detail: {
          type: getConstraintType(constraint),
          length: constraint.maxLength || constraint.length,
        },
      })
    )
  }

  const deleteSelectedConstraint = () => {
    if (!selectedConstraintRef.current) return false

    const constraintId = selectedConstraintRef.current.id
    Composite.remove(engine.world, selectedConstraintRef.current)
    clearSelectedConstraint()
    socket.emit('remove-constraint', { roomId, id: constraintId })
    return true
  }

  const deleteSelectedBody = () => {
    if (!selectedBodyRef.current) return false

    const bodyId = selectedBodyRef.current.id
    const attachedConstraints = engine.world.constraints.filter(
      (constraint) => constraint.bodyA?.id === bodyId || constraint.bodyB?.id === bodyId
    )

    if (selectedConstraintRef.current && attachedConstraints.some((c) => c.id === selectedConstraintRef.current.id)) {
      clearSelectedConstraint()
    }

    Composite.remove(engine.world, attachedConstraints)
    attachedConstraints.forEach((constraint) => {
      socket.emit('remove-constraint', { roomId, id: constraint.id })
    })

    Composite.remove(engine.world, selectedBodyRef.current)
    clearSelectedBody()

    if (firstSelectedBodyRef.current?.id === bodyId) {
      clearPendingSelections()
    }

    socket.emit('remove-body', { roomId, id: bodyId })
    return true
  }

  return {
    clearPendingSelections,
    clearSelectedBody,
    clearSelectedConstraint,
    selectConstraint,
    deleteSelectedConstraint,
    deleteSelectedBody
  }
}
