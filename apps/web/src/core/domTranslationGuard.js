/**
 * Browser page translation (Chrome "Translate this page", extensions) wraps text nodes in <font> elements.
 * React then tries to remove or insert next to a node that is no longer where it left it and throws
 * ("Failed to execute 'insertBefore' on 'Node'"), which blanks the screen until a reload.
 * See https://github.com/facebook/react/issues/11538. Users who do not read Portuguese rely on translation,
 * so instead of blocking it, ignore those stale operations.
 */
export function guardDomAgainstTranslators() {
  if (typeof Node !== 'function' || !Node.prototype || Node.prototype.__impTranslationGuard) return
  Node.prototype.__impTranslationGuard = true

  const originalRemoveChild = Node.prototype.removeChild
  Node.prototype.removeChild = function removeChild(child) {
    if (child.parentNode !== this) return child
    return originalRemoveChild.call(this, child)
  }

  const originalInsertBefore = Node.prototype.insertBefore
  Node.prototype.insertBefore = function insertBefore(newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      return originalInsertBefore.call(this, newNode, null)
    }
    return originalInsertBefore.call(this, newNode, referenceNode)
  }
}
