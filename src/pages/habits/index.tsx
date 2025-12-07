import { PaperPlaneRightIcon, TrashIcon } from '@phosphor-icons/react';
import SideBar from '../../components/SideBar';
import styles from './styles.module.css';

export default function HabitsPage() {
	return (
		<div className={styles.app}>
			<SideBar />
			<div className={styles.container}>
				<div className={styles.content}>
					<header className={styles.header}>
						<h1>Hábitos Diários</h1>
						<span>Hoje, 06 de Dezembro</span>
					</header>
					<div className={styles.input}>
						<input placeholder="Digite um novo hábito" type="text" />
						<PaperPlaneRightIcon />
					</div>
					<div className={styles.habits}>
						<div className={styles.habit}>
							<p>Estudar React Native</p>
							<div className={styles.actions}>
								<input type="checkbox" name="" id="" />
								<TrashIcon />
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
