import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '../../hooks/use.user';
import styles from './style.module.css';

export default function AuthPage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { userData, getUserInfo, loading, error } = useUser();
	const [localError, setLocalError] = useState<string | null>(null);
	const [showWelcome, setShowWelcome] = useState(false);
	const hasProcessed = useRef(false);

	useEffect(() => {
		async function handleAuth() {
			if (hasProcessed.current) {
				return;
			}

			try {
				// Verificar se já recebemos os dados do usuário diretamente
				const dataParam = searchParams.get('data');
				
				if (dataParam) {
					// Processar dados do callback direto
					hasProcessed.current = true;
					const userData = JSON.parse(decodeURIComponent(dataParam));
					
					// Salvar no localStorage
					localStorage.setItem('elite-tracker-user', JSON.stringify(userData));
					
					setShowWelcome(true);
					setTimeout(() => navigate('/', { replace: true }), 2000);
					return;
				}

				const code = searchParams.get('code');

				if (!code || code.trim() === '') {
					setLocalError('Código de autenticação não encontrado');
					setTimeout(() => navigate('/login', { replace: true }), 3000);
					return;
				}

				if (userData?.token) {
					navigate('/', { replace: true });
					return;
				}

				hasProcessed.current = true;

				await getUserInfo(code);

				setShowWelcome(true);
				setTimeout(() => navigate('/', { replace: true }), 2000);
			} catch {
				setLocalError('Falha na autenticação. Redirecionando para login...');
				setTimeout(() => navigate('/login', { replace: true }), 3000);
			}
		}

		handleAuth();
	}, [searchParams, getUserInfo, userData, navigate]);

	// Renderiza mensagens de erro ou sucesso
	const displayError = localError || error;

	if (displayError) {
		return (
			<div className={styles.container}>
				<h1 style={{ color: 'var(--danger)' }}>{displayError}</h1>
			</div>
		);
	}

	if (showWelcome && userData) {
		return (
			<div className={styles.container}>
				<h1>Bem-vindo, {userData.name}! ✨</h1>
				<p>Redirecionando...</p>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<h1>Autenticando...</h1>
			{loading && <p>Aguarde um momento</p>}
		</div>
	);
}
