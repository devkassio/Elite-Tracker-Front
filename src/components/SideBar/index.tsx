import { ListChecksIcon, SignOutIcon } from '@phosphor-icons/react';
import { ClockClockwiseIcon } from '@phosphor-icons/react/dist/ssr';
import clsx from 'clsx';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../../hooks/use.user';
import styles from './styles.module.css';

export default function SideBar() {
	const { userData, signOut } = useUser();
	const navigate = useNavigate();
	const { pathname } = useLocation();

	function handleLogout() {
		signOut();
		navigate('/login', { replace: true });
	}

	return (
		<aside className={styles.sidebar}>
			<img src={userData?.avatar_url || 'https://github.com/devkassio.png'} alt={userData?.name || 'Avatar'} />
			<nav className={styles.links}>
				<Link to="/" className={clsx(styles.link, pathname === '/' && styles.active)} title="Hábitos">
					<ListChecksIcon size={30} />
				</Link>
				<Link to="/focus" className={clsx(styles.link, pathname === '/focus' && styles.active)} title="Foco">
					<ClockClockwiseIcon size={30} />
				</Link>
			</nav>
			<button type="button" onClick={handleLogout} className={styles.logout} title="Sair">
				<SignOutIcon size={30} />
			</button>
		</aside>
	);
}
