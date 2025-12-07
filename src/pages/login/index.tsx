import { FaGithub } from 'react-icons/fa';
import Button from '../../components/Button';
import api from '../../services/api';
import styles from './styles.module.css';

export default function LoginPage() {
	async function handleAuth() {
		try {
			const { data } = await api.get('/auth', {
				withCredentials: true,
			});
			window.location.href = data.redirectUrl;
		} catch (error) {
			console.error('Erro ao autenticar:', error);
		}
	}

	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<h1>Entre com</h1>
				<Button onClick={handleAuth}>
					<FaGithub size={24} /> GitHub
				</Button>
				<p>Ao entrar, eu concordo com o Termos de Serviço e Política de Privacidade.</p>
			</div>
		</div>
	);
}
