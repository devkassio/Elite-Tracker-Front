import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import styles from './style.module.css';

export default function AuthPage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function getUserInfo() {
			try {
				const code = searchParams.get('code');

				if (!code) {
					setError('Código de autenticação não encontrado');
					setTimeout(() => navigate('/login'), 3000);
					return;
				}

				const { data } = await api.get(`/auth/callback?code=${code}`);

				// Salva token ou dados do usuário se necessário
				if (data.token) {
					localStorage.setItem('token', data.token);
				}

				// Redireciona para a página principal
				navigate('/');
			} catch (err) {
				console.error('Erro na autenticação:', err);
				setError('Falha na autenticação. Redirecionando...');
				setTimeout(() => navigate('/login'), 3000);
			}
		}

		getUserInfo();
	}, [searchParams, navigate]);

	return <div className={styles.container}>{error ? <h1>{error}</h1> : <h1>Autenticando...</h1>}</div>;
}
