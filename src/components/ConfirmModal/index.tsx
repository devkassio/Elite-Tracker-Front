import { X } from '@phosphor-icons/react';
import Modal from 'react-modal';
import styles from './styles.module.css';

Modal.setAppElement('#root');

type ConfirmModalProps = {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	isLoading?: boolean;
};

export default function ConfirmModal({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmText = 'Confirmar',
	cancelText = 'Cancelar',
	isLoading = false,
}: ConfirmModalProps) {
	const handleConfirm = () => {
		onConfirm();
		onClose();
	};

	return (
		<Modal
			isOpen={isOpen}
			onRequestClose={onClose}
			className={styles.modal}
			overlayClassName={styles.overlay}
			closeTimeoutMS={200}
		>
			<div className={styles.content}>
				<button type="button" onClick={onClose} className={styles.closeButton} aria-label="Fechar">
					<X size={20} weight="bold" />
				</button>
				<h2>{title}</h2>
				<p>{message}</p>
				<div className={styles.buttons}>
					<button type="button" onClick={onClose} className={styles.cancelButton} disabled={isLoading}>
						{cancelText}
					</button>
					<button type="button" onClick={handleConfirm} className={styles.confirmButton} disabled={isLoading}>
						{isLoading ? 'Processando...' : confirmText}
					</button>
				</div>
			</div>
		</Modal>
	);
}
