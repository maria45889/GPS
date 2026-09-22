import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Salvaguarda global para mutaciones directas del DOM provocadas por extensiones del navegador o Google Translate (React removeChild fix)
if (typeof window !== 'undefined') {
  const originalRemoveChild = Node.prototype.removeChild
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) {
      if (child.parentNode) {
        return child.parentNode.removeChild(child)
      }
      return child
    }
    return originalRemoveChild.apply(this, arguments)
  }

  const originalInsertBefore = Node.prototype.insertBefore
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (referenceNode.parentNode) {
        return referenceNode.parentNode.insertBefore(newNode, referenceNode)
      }
      return newNode
    }
    return originalInsertBefore.apply(this, arguments)
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
