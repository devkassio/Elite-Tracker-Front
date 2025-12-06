import { FaGithub } from 'react-icons/fa';
import Button from '../../components/Button';
import styles from './styles.module.css';

export default function LoginPage() {
	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<h1>Entre com</h1>
				<Button>
					<FaGithub size={24} /> GitHub
				</Button>
				<p>Ao entrar, eu concordo com o Termos de Serviço e Política de Privacidade.</p>
			</div>
		</div>
	);
}
