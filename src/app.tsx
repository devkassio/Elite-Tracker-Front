import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { MantineProvider } from '@mantine/core';
import { RouterProvider } from 'react-router-dom';
import UserProvider from './hooks/use.user.tsx';
import { router } from './routes/indes.tsx';

export function App() {
	return (
		<UserProvider>
			<MantineProvider defaultColorScheme='dark'>
				<RouterProvider router={router} />
			</MantineProvider>
		</UserProvider>
	);
}
