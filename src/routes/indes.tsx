import { createBrowserRouter } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import AuthPage from '../pages/auth';
import Focus from '../pages/focus';
import HabitsPage from '../pages/habits';
import LoginPage from '../pages/login';

export const router = createBrowserRouter(
	[
		{
			path: '/',
			element: (
				<ProtectedRoute>
					<HabitsPage />
				</ProtectedRoute>
			),
		},
		{
			path: '/focus',
			element: (
				<ProtectedRoute>
					<Focus />
				</ProtectedRoute>
			),
		},
		{
			path: '/login',
			element: <LoginPage />,
		},
		{
			path: '/authentication',
			element: <AuthPage />,
		},
	],
	{
		basename: '/Elite-Tracker-Front',
	}
);
