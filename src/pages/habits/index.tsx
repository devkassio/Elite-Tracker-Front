import { PaperPlaneRightIcon, TrashIcon } from '@phosphor-icons/react';
import { useRef } from 'react';
import SideBar from '../../components/SideBar';
import api from '../../services/api';
import styles from './styles.module.css';

export default function HabitsPage() {
	const nameInput = useRef<HTMLInputElement>(null);

	async function handleAddHabit() {
		const habitName = nameInput.current?.value;
		if (habitName && nameInput.current) {
			await api.post('/habits', { name: habitName });
			nameInput.current.value = '';
		}
	}

	return (
		<div className={styles.app}>
			<SideBar />
			<div className={styles.container}>
				<div className={styles.content}>
					<header className={styles.header}>
						<h1>Hábitos Diários</h1>
						<span>{`${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date())}`}</span>
					</header>
					<div className={styles.input}>
						<input ref={nameInput} placeholder="Digite um novo hábito" type="text" />
						<PaperPlaneRightIcon onClick={handleAddHabit} />
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
