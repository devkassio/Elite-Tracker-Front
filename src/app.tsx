import { RouterProvider } from 'react-router-dom';
import UserProvider from './hooks/use.user.tsx';
import { router } from './routes/indes.tsx';

export function App() {
	return (
		<UserProvider>
			<RouterProvider router={router} />
		</UserProvider>
	);
}
