import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export type UserData = {
	id: string;
	name: string;
	avatar_url: string;
	token: string;
};

type UseContextProps = {
	userData: UserData | null;
	loading: boolean;
	error: string | null;
	getUserInfo: (gitHubCode: string) => Promise<void>;
	signOut: () => void;
	isAuthenticated: boolean;
};

type UserProviderProps = {
	children: ReactNode;
};

const USER_STORAGE_KEY = '@elitetracker:user';
const TOKEN_STORAGE_KEY = '@elitetracker:token';

const UserContext = createContext<UseContextProps>({} as UseContextProps);

export default function UserProvider({ children }: UserProviderProps) {
	const [userData, setUserData] = useState<UserData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Carrega dados do localStorage ao iniciar
	useEffect(() => {
		function loadStoredUser() {
			try {
				const storedUser = localStorage.getItem(USER_STORAGE_KEY);
				const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

				if (storedUser && storedToken) {
					const user = JSON.parse(storedUser) as UserData;
					setUserData(user);

					// Configura o token no header do axios
					api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
				}
			} catch (err) {
				console.error('Erro ao carregar usuário do localStorage:', err);
				// Limpa dados corrompidos
				localStorage.removeItem(USER_STORAGE_KEY);
				localStorage.removeItem(TOKEN_STORAGE_KEY);
			} finally {
				setLoading(false);
			}
		}

		loadStoredUser();
	}, []);

	async function getUserInfo(gitHubCode: string) {
		try {
			setLoading(true);
			setError(null);

			if (!gitHubCode || gitHubCode.trim() === '') {
				throw new Error('Código de autenticação inválido');
			}

			// Remove o token antigo antes de fazer a requisição de callback (rota pública)
			delete api.defaults.headers.common.Authorization;

			const { data } = await api.get<UserData>(`/auth/callback?code=${gitHubCode}`);

			if (!data) {
				throw new Error('Resposta inválida do servidor');
			}

			if (!data.token) {
				throw new Error('Token não encontrado na resposta');
			}

			// Salva no localStorage
			localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));
			localStorage.setItem(TOKEN_STORAGE_KEY, data.token);

			// Configura o token no header do axios
			api.defaults.headers.common.Authorization = `Bearer ${data.token}`;

			setUserData(data);
		} catch (err: unknown) {
			let errorMessage = 'Erro desconhecido na autenticação';
			const axiosError = err as {
				response?: { status?: number; data?: { message?: string; error?: string } };
				code?: string;
			};

			// Extrai mensagem de erro do backend se houver
			if (axiosError.response?.data?.message) {
				errorMessage = axiosError.response.data.message;
			} else if (axiosError.response?.data?.error) {
				errorMessage = axiosError.response.data.error;
			} else if (err instanceof Error) {
				errorMessage = err.message;
			}

			console.error('❌ Erro na autenticação:', {
				message: errorMessage,
				status: axiosError.response?.status,
				data: axiosError.response?.data,
				code: axiosError.code,
			});

			setError(errorMessage);

			// Limpa dados antigos em caso de erro
			localStorage.removeItem(USER_STORAGE_KEY);
			localStorage.removeItem(TOKEN_STORAGE_KEY);
			delete api.defaults.headers.common.Authorization;

			throw new Error(errorMessage); // Propaga erro com mensagem clara
		} finally {
			setLoading(false);
		}
	}

	function signOut() {
		// Limpa dados do estado
		setUserData(null);
		setError(null);

		// Limpa localStorage
		localStorage.removeItem(USER_STORAGE_KEY);
		localStorage.removeItem(TOKEN_STORAGE_KEY);

		// Remove token do header do axios
		delete api.defaults.headers.common.Authorization;
	}

	const isAuthenticated = !!userData && !!userData.token;

	return (
		<UserContext.Provider value={{ userData, loading, error, getUserInfo, signOut, isAuthenticated }}>
			{children}
		</UserContext.Provider>
	);
}

export function useUser() {
	const context = useContext(UserContext);

	if (!context) {
		throw new Error('useUser deve ser usado dentro de um UserProvider');
	}
	return context;
}

// Hook adicional para proteção de rotas
export function useRequireAuth() {
	const { isAuthenticated, loading } = useUser();
	const navigate = useNavigate();

	useEffect(() => {
		if (loading) {
			return;
		}

		if (!isAuthenticated) {
			navigate('/login', { replace: true });
		}
	}, [isAuthenticated, loading, navigate]);

	return { isAuthenticated, loading };
}
