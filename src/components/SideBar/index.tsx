import { ListChecksIcon, SignOutIcon } from '@phosphor-icons/react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../hooks/use.user';
import styles from './styles.module.css';

export default function SideBar() {
	const { userData, signOut } = useUser();
	const navigate = useNavigate();

	function handleLogout() {
		signOut();
		navigate('/login', { replace: true });
	}

	return (
		<aside className={styles.sidebar}>
			<img src={userData?.avatar_url || 'https://github.com/devkassio.png'} alt={userData?.name || 'Avatar'} />
			<div className={styles.links}>
				<Link to="/">
					<ListChecksIcon size={30} />
				</Link>
			</div>
			<button type="button" onClick={handleLogout} className={styles.logout} title="Sair">
				<SignOutIcon size={30} />
			</button>
		</aside>
	);
}
