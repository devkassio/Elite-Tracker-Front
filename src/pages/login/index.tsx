import styles from './styles.module.css';

export default function LoginPage() {
	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<h1>Entre com</h1>
				<button type="button">GitHub</button>
				<p>Ao entrar, eu concordo com o Termos de Serviço e Política de Privacidade.</p>
			</div>
		</div>
	);
}
