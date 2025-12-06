import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/indes.tsx';

const rootElement = document.getElementById('root');
if (rootElement) {
	createRoot(rootElement).render(
		<StrictMode>
			<RouterProvider router={router} />
		</StrictMode>
	);
}
