import { PaperPlaneRightIcon, TrashIcon } from '@phosphor-icons/react';
import styles from './styles.module.css';

export default function HabitsPage() {
	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<header className={styles.header}>
					<h1>Hábitos diários</h1>
					<span>Hoje, 06 de Dezembro</span>
				</header>
				<div className={styles.input}>
					<input type="text" />
					<PaperPlaneRightIcon />
				</div>
				<div className={styles.habit}>
					<p>Estudar React Native</p>
					<input type="checkbox" name="" id="" />
					<TrashIcon />
				</div>
			</div>
		</div>
	);
}
