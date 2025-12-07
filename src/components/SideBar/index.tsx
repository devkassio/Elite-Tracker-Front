import { ListChecksIcon, SignOutIcon } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import styles from './styles.module.css';

export default function SideBar() {
	return (
		<aside className={styles.sidebar}>
			<img src="https://github.com/devkassio.png" alt="Avatar" />
			<div className={styles.links}>
				<Link to="/">
					<ListChecksIcon size={30} />
				</Link>
			</div>
			<SignOutIcon size={30} className={styles.logout} />
		</aside>
	);
}
