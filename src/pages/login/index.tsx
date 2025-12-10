import { useEffect } from 'react';
import { FaGithub } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import { useUser } from '../../hooks/use.user';
import api from '../../services/api';
import styles from './styles.module.css';

export default function LoginPage() {
	const { isAuthenticated, loading } = useUser();
	const navigate = useNavigate();

	// Redireciona se já estiver autenticado
	useEffect(() => {
		if (!loading && isAuthenticated) {
			navigate('/', { replace: true });
		}
	}, [isAuthenticated, loading, navigate]);

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

	// Não renderiza se estiver autenticado
	if (loading) {
		return null;
	}

	if (isAuthenticated) {
		return null;
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
