import axios from 'axios';
import { FaGithub } from 'react-icons/fa';
import Button from '../../components/Button';
import styles from './styles.module.css';
/* import { useNavigate } from 'react-router-dom'; */

export default function LoginPage() {
	/* const navigate = useNavigate(); */

	async function handleAuth() {
		try {
			const { data } = await axios.get('http://localhost:4000/auth', {
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
