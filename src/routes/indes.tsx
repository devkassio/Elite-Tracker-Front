import { createBrowserRouter } from 'react-router-dom';
import LoginPage from '../pages/login';
import HabitsPage from '../pages/habits';

export const router = createBrowserRouter([
	{
		path: '/',
		element: <HabitsPage />,
	},
	{
		path: '/entrar',
		element: <LoginPage />,
	},
]);
