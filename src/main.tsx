import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import UserProvider from './hooks/use.user.tsx';
import { router } from './routes/indes.tsx';

const rootElement = document.getElementById('root');
if (rootElement) {
	createRoot(rootElement).render(
		<StrictMode>
			<UserProvider>
				<RouterProvider router={router} />
			</UserProvider>
		</StrictMode>
	);
}
