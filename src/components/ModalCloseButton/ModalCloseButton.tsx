import './ModalCloseButton.css'

interface ModalCloseButtonProps {
  onClick: () => void
  className?: string
}

const ModalCloseButton = ({
  onClick,
  className = '',
}: ModalCloseButtonProps) => (
  <button
    className={`modal-close-btn${className ? ` ${className}` : ''}`}
    onClick={onClick}
    aria-label="Close"
  >
    <span className="material-symbols-rounded">close</span>
  </button>
)

export default ModalCloseButton
