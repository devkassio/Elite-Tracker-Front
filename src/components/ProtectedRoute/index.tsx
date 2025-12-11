import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../../hooks/use.user';
import { AppContainer } from '../App-container';
import SideBar from '../SideBar';

type ProtectedRouteProps = {
	children: ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
	const { isAuthenticated, loading } = useUser();

	// Aguarda o carregamento do estado de autenticação
	if (loading) {
		return (
			<div
				style={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					height: '100vh',
					backgroundColor: 'var(--dark-blue)',
					color: 'var(--white)',
				}}
			>
				<h2>Carregando...</h2>
			</div>
		);
	}

	// Se não estiver autenticado, redireciona para login
	if (!isAuthenticated) {
		return <Navigate to="/login" replace />;
	}

	// Se autenticado, renderiza o conteúdo
	return (
		<AppContainer>
			<SideBar />
			{children}
		</AppContainer>
	);
}
