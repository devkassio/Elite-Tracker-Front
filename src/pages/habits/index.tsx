import { PaperPlaneRightIcon, TrashIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import SideBar from '../../components/SideBar';
import api from '../../services/api';
import styles from './styles.module.css';

type Habit = {
	id: string;
	name: string;
	completed: boolean;
	userId: string;
	createdAt: string;
	updatedAt: string;
};

export default function HabitsPage() {
	const [habits, setHabits] = useState<Habit[]>([]);
	const [loading, setLoading] = useState(true);
	const nameInput = useRef<HTMLInputElement>(null);

	async function loadHabits() {
		try {
			setLoading(true);
			const response = await api.get<Habit[]>('/habits');
			setHabits(response.data);
		} catch (error) {
			console.error('Erro ao carregar hábitos:', error);
		} finally {
			setLoading(false);
		}
	}

	async function handleAddHabit() {
		if (!nameInput.current) {
			return;
		}

		const habitName = nameInput.current.value.trim();
		if (!habitName) {
			return;
		}

		try {
			await api.post('/habits', { name: habitName });
			nameInput.current.value = '';
			await loadHabits();
		} catch (error) {
			console.error('Erro ao adicionar hábito:', error);
		}
	}

	// Carrega os hábitos ao montar o componente
	// biome-ignore lint/correctness/useExhaustiveDependencies: loadHabits não deve estar nas dependências
	useEffect(() => {
		loadHabits();
	}, []);

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
						{loading ? (
							<p>Carregando hábitos...</p>
						) : habits.length === 0 ? (
							<p>Nenhum hábito cadastrado ainda.</p>
						) : (
							habits.map((habit) => (
								<div key={habit.id} className={styles.habit}>
									<p>{habit.name}</p>
									<div className={styles.actions}>
										<input type="checkbox" name="" id="" />
										<TrashIcon />
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
