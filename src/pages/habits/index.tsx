import { PaperPlaneRightIcon, TrashIcon } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';
import Header from '../../components/HeadeFix';
import api from '../../services/api';
import styles from './styles.module.css';

type CompletedDate = {
	date: string; // Formato: YYYY-MM-DD
};

type Habit = {
	id: string;
	name: string;
	completed: CompletedDate[];
	userId: string;
	createdAt: string;
	updatedAt: string;
};

// Tipo da resposta do backend (MongoDB)
type BackendHabit = {
	_id: string;
	name: string;
	isCompleted: CompletedDate[];
	userId: string;
	createdAt: string;
	updatedAt: string;
};

export default function HabitsPage() {
	const [habits, setHabits] = useState<Habit[]>([]);
	const [loading, setLoading] = useState(true);
	const [deleting, setDeleting] = useState<string | null>(null);
	const [toggling, setToggling] = useState<string | null>(null);
	const [confirmModal, setConfirmModal] = useState<{
		isOpen: boolean;
		habitId: string | null;
		habitName: string;
	}>({ isOpen: false, habitId: null, habitName: '' });
	const nameInput = useRef<HTMLInputElement>(null);
	// Usa formato YYYY-MM-DD para comparação consistente de datas
	const today = dayjs().format('YYYY-MM-DD');

	async function loadHabits() {
		try {
			setLoading(true);
			const response = await api.get<BackendHabit[]>('/habits');

			// Normaliza os dados do backend (MongoDB) para o formato do frontend
			// _id -> id, isCompleted -> completed
			// Garante que as datas estejam no formato YYYY-MM-DD
			const normalizedHabits: Habit[] = response.data.map((habit) => ({
				id: habit._id,
				name: habit.name,
				completed: Array.isArray(habit.isCompleted)
					? habit.isCompleted.map((c) => ({
							date: dayjs(c.date).format('YYYY-MM-DD'),
						}))
					: [],
				userId: habit.userId,
				createdAt: habit.createdAt,
				updatedAt: habit.updatedAt,
			}));

			setHabits(normalizedHabits);
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
			toast.success('Hábito criado com sucesso!');
			await loadHabits();
		} catch (error) {
			console.error('Erro ao adicionar hábito:', error);
			toast.error('Erro ao criar hábito. Tente novamente.');
		}
	}

	async function handleToggleHabit(habitId: string) {
		if (toggling !== null) {
			return;
		}

		try {
			setToggling(habitId);
			const habit = habits.find((h) => h.id === habitId);
			if (!habit) {
				return;
			}

			// Garante que completed é um array
			const completedDates = Array.isArray(habit.completed) ? habit.completed : [];
			const isCompleted = completedDates.some((c) => c.date === today);

			// Usa PATCH /habits/:id/toggle - o backend gerencia o toggle automaticamente
			await api.patch(`/habits/${habitId}/toggle`);

			// Atualiza estado local imediatamente baseado no estado anterior
			if (isCompleted) {
				// Remove a data da lista de completados
				setHabits((prevHabits) =>
					prevHabits.map((h) =>
						h.id === habitId ? { ...h, completed: h.completed.filter((c) => c.date !== today) } : h
					)
				);
			} else {
				// Adiciona a data à lista de completados
				setHabits((prevHabits) =>
					prevHabits.map((h) => (h.id === habitId ? { ...h, completed: [...h.completed, { date: today }] } : h))
				);
			}
		} catch (error: unknown) {
			console.error('Erro ao alternar hábito:', error);

			let errorMessage = 'Erro ao alternar hábito. Tente novamente.';
			if (error && typeof error === 'object' && 'response' in error) {
				const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
				errorMessage = axiosError.response?.data?.message || errorMessage;
			}

			toast.error(errorMessage);
			// Recarrega em caso de erro para sincronizar com o servidor
			await loadHabits();
		} finally {
			setToggling(null);
		}
	}

	function handleDeleteHabit(habitId: string) {
		if (deleting !== null) {
			return;
		}

		const habit = habits.find((h) => h.id === habitId);
		if (!habit) {
			return;
		}

		// Abre o modal de confirmação
		setConfirmModal({
			isOpen: true,
			habitId: habit.id,
			habitName: habit.name,
		});
	}

	async function confirmDelete() {
		const { habitId } = confirmModal;
		if (!habitId) {
			return;
		}

		try {
			setDeleting(habitId);
			await api.delete(`/habits/${habitId}`);
			// Atualiza estado local imediatamente
			setHabits((prevHabits) => prevHabits.filter((h) => h.id !== habitId));
			toast.success('Hábito excluído com sucesso!');
		} catch (error: unknown) {
			console.error('Erro ao deletar hábito:', error);

			let errorMessage = 'Erro ao deletar hábito. Tente novamente.';
			if (error && typeof error === 'object' && 'response' in error) {
				const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
				errorMessage = axiosError.response?.data?.message || errorMessage;
			}

			toast.error(errorMessage);
			// Recarrega em caso de erro para sincronizar com o servidor
			await loadHabits();
		} finally {
			setDeleting(null);
			setConfirmModal({ isOpen: false, habitId: null, habitName: '' });
		}
	}

	async function handleKeyPress(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Enter') {
			await handleAddHabit();
		}
	}

	// Carrega os hábitos ao montar o componente
	// biome-ignore lint/correctness/useExhaustiveDependencies: loadHabits não deve estar nas dependências
	useEffect(() => {
		loadHabits();
	}, []);

	return (
		<>
			<Toaster
				position="top-right"
				toastOptions={{
					duration: 3000,
					style: {
						background: '#1a1a1a',
						color: '#fff',
						border: '1px solid #333',
					},
					success: {
						iconTheme: {
							primary: '#10b981',
							secondary: '#fff',
						},
					},
					error: {
						iconTheme: {
							primary: '#ef4444',
							secondary: '#fff',
						},
					},
				}}
			/>
			<div className={styles.container}>
				<div className={styles.content}>
					<Header title="Hábitos Diários" />
					<div className={styles.input}>
						<input ref={nameInput} placeholder="Digite um novo hábito" type="text" onKeyPress={handleKeyPress} />
						<PaperPlaneRightIcon onClick={handleAddHabit} />
					</div>
					<div className={styles.habits}>
						{loading ? (
							<p>Carregando hábitos...</p>
						) : habits.length === 0 ? (
							<p>Nenhum hábito cadastrado ainda.</p>
						) : (
							habits.map((habit) => {
								// Garante que completed é um array
								const completedDates = Array.isArray(habit.completed) ? habit.completed : [];
								const isCompleted = completedDates.some((c) => c.date === today);
								const isBeingDeleted = deleting === habit.id;
								const isBeingToggled = toggling === habit.id;

								return (
									<div key={habit.id} className={styles.habit} style={{ opacity: isBeingDeleted ? 0.5 : 1 }}>
										<p>{habit.name}</p>
										<div className={styles.actions}>
											<input
												type="checkbox"
												checked={isCompleted}
												onChange={() => handleToggleHabit(habit.id)}
												disabled={isBeingToggled || isBeingDeleted}
											/>
											<TrashIcon
												onClick={() => handleDeleteHabit(habit.id)}
												style={{
													cursor: isBeingDeleted ? 'not-allowed' : 'pointer',
													opacity: isBeingDeleted ? 0.5 : 1,
												}}
											/>
										</div>
									</div>
								);
							})
						)}
					</div>
				</div>
			</div>
			<ConfirmModal
				isOpen={confirmModal.isOpen}
				onClose={() => setConfirmModal({ isOpen: false, habitId: null, habitName: '' })}
				onConfirm={confirmDelete}
				title="Excluir Hábito"
				message={`Tem certeza que deseja excluir o hábito "${confirmModal.habitName}"? Esta ação não pode ser desfeita.`}
				confirmText="Excluir"
				cancelText="Cancelar"
				isLoading={deleting !== null}
			/>
		</>
	);
}
