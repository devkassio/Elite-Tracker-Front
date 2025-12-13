import { CaretLeft, CaretRight, CheckCircle, PaperPlaneRight, Trash, XCircle } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';
import Header from '../../components/HeadeFix';
import Info from '../../components/Info';
import api from '../../services/api';
import styles from './styles.module.css';

// Configurar dayjs para português
dayjs.locale('pt-br');

type CompletedDate = {
	date: string; // Formato: YYYY-MM-DD
};

type Habit = {
	id: string;
	name: string;
	isCompleted: CompletedDate[];
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

type HabitMetrics = {
	_id: string;
	name: string;
	isCompleted: CompletedDate[];
};

type HabitDayStatus = {
	habit: Habit;
	isCompleted: boolean;
	existedOnDate: boolean; // Se o hábito já existia na data selecionada
};

// Dias da semana em português
const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function HabitsPage() {
	const [habits, setHabits] = useState<Habit[]>([]);
	const [metrics, setMetrics] = useState<HabitMetrics | null>(null);
	const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
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

	// Data de hoje para comparações
	const todayStart = useMemo(() => dayjs().startOf('day'), []);

	// Calcular métricas do hábito selecionado
	const metricsInfo = useMemo(() => {
		const numberOfMonthDays = dayjs(currentMonth).endOf('month').date();
		const numberOfDays = metrics?.isCompleted?.length ?? 0;

		const completedDatesPerMonth = `${numberOfDays}/${numberOfMonthDays}`;
		const completionPercentage =
			numberOfMonthDays > 0 ? `${Math.round((numberOfDays / numberOfMonthDays) * 100)}%` : '0%';

		return {
			completedDatesPerMonth,
			completionPercentage,
		};
	}, [metrics, currentMonth]);

	// Set de datas completadas para busca rápida
	const completedDatesSet = useMemo(() => {
		if (!metrics?.isCompleted) return new Set<string>();
		return new Set(metrics.isCompleted.map((c) => dayjs(c.date).format('YYYY-MM-DD')));
	}, [metrics]);

	// Gerar dias do calendário
	const calendarDays = useMemo(() => {
		const startOfMonth = dayjs(currentMonth).startOf('month');
		const endOfMonth = dayjs(currentMonth).endOf('month');
		const startDay = startOfMonth.day(); // 0 = domingo
		const daysInMonth = endOfMonth.date();

		const days: Array<{ date: Date; day: number; isCurrentMonth: boolean; isCompleted: boolean; isFuture: boolean }> = [];

		// Dias do mês anterior
		const prevMonth = startOfMonth.subtract(1, 'month');
		const daysInPrevMonth = prevMonth.endOf('month').date();
		for (let i = startDay - 1; i >= 0; i--) {
			const day = daysInPrevMonth - i;
			const date = prevMonth.date(day).toDate();
			days.push({
				date,
				day,
				isCurrentMonth: false,
				isCompleted: false,
				isFuture: false,
			});
		}

		// Dias do mês atual
		for (let day = 1; day <= daysInMonth; day++) {
			const date = startOfMonth.date(day).toDate();
			const dateStr = dayjs(date).format('YYYY-MM-DD');
			const isFuture = dayjs(date).startOf('day').isAfter(todayStart);
			days.push({
				date,
				day,
				isCurrentMonth: true,
				isCompleted: completedDatesSet.has(dateStr),
				isFuture,
			});
		}

		// Dias do próximo mês (completar 6 semanas)
		const remainingDays = 42 - days.length;
		const nextMonth = startOfMonth.add(1, 'month');
		for (let day = 1; day <= remainingDays; day++) {
			const date = nextMonth.date(day).toDate();
			days.push({
				date,
				day,
				isCurrentMonth: false,
				isCompleted: false,
				isFuture: true,
			});
		}

		return days;
	}, [currentMonth, completedDatesSet, todayStart]);

	// Formatar data selecionada
	const selectedDateFormatted = useMemo(() => {
		if (!selectedDate) return null;
		return dayjs(selectedDate).format('D [de] MMMM');
	}, [selectedDate]);

	// Verificar se a data selecionada é futura (não permitido)
	const isSelectedDateFuture = useMemo(() => {
		if (!selectedDate) return false;
		return dayjs(selectedDate).startOf('day').isAfter(todayStart);
	}, [selectedDate, todayStart]);

	// Calcular status de TODOS os hábitos para a data selecionada
	// Só mostra hábitos que já existiam na data selecionada (baseado em createdAt)
	// NÃO mostra nada para datas futuras
	const allHabitsDayStatus = useMemo<HabitDayStatus[]>(() => {
		if (!selectedDate) return [];
		
		// Datas futuras não têm dados
		if (isSelectedDateFuture) return [];
		
		const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');
		const selectedDateStart = dayjs(selectedDate).startOf('day');

		return habits.map((habit) => {
			const completedDates = Array.isArray(habit.isCompleted) ? habit.isCompleted : [];
			const isCompleted = completedDates.some((c) => dayjs(c.date).format('YYYY-MM-DD') === dateStr);
			// Verificar se o hábito já existia na data selecionada (criado antes ou no mesmo dia)
			const habitCreatedAt = dayjs(habit.createdAt).startOf('day');
			const existedOnDate = selectedDateStart.isSame(habitCreatedAt) || selectedDateStart.isAfter(habitCreatedAt);
			return { habit, isCompleted, existedOnDate };
		});
	}, [selectedDate, habits, isSelectedDateFuture]);

	// Buscar métricas do hábito
	const fetchMetrics = useCallback(async (habit: Habit, month: Date) => {
		try {
			const { data } = await api.get<HabitMetrics>(`/habits/${habit.id}/metrics`, {
				params: {
					date: dayjs(month).startOf('month').toISOString(),
				},
			});
			setMetrics(data);
		} catch (error) {
			console.error('Erro ao carregar métricas:', error);
			toast.error('Erro ao carregar métricas do hábito');
		}
	}, []);

	// Selecionar hábito
	async function handleSelectHabit(habit: Habit) {
		setSelectedHabit(habit);
		setSelectedDate(null);
		await fetchMetrics(habit, currentMonth);
	}

	// Carregar hábitos
	async function loadHabits() {
		try {
			setLoading(true);
			const response = await api.get<BackendHabit[]>('/habits');

			const normalizedHabits: Habit[] = response.data.map((habit) => ({
				id: habit._id,
				name: habit.name,
				isCompleted: Array.isArray(habit.isCompleted)
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
			toast.error('Erro ao carregar hábitos');
		} finally {
			setLoading(false);
		}
	}

	// Adicionar hábito
	async function handleAddHabit() {
		if (!nameInput.current) return;

		const habitName = nameInput.current.value.trim();
		if (!habitName) {
			toast.error('Digite o nome do hábito');
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

	// Toggle hábito (marcar/desmarcar)
	async function handleToggleHabit(habit: Habit, e: React.MouseEvent) {
		e.stopPropagation();
		if (toggling !== null) return;

		try {
			setToggling(habit.id);

			const completedDates = Array.isArray(habit.isCompleted) ? habit.isCompleted : [];
			const isCompleted = completedDates.some((c) => c.date === today);

			await api.patch(`/habits/${habit.id}/toggle`);

			// Atualiza estado local imediatamente
			setHabits((prevHabits) =>
				prevHabits.map((h) => {
					if (h.id !== habit.id) return h;

					if (isCompleted) {
						return { ...h, isCompleted: h.isCompleted.filter((c) => c.date !== today) };
					}
					return { ...h, isCompleted: [...h.isCompleted, { date: today }] };
				})
			);

			// Atualiza métricas se o hábito selecionado for o mesmo
			if (selectedHabit?.id === habit.id) {
				await fetchMetrics(habit, currentMonth);
			}
		} catch (error: unknown) {
			console.error('Erro ao alternar hábito:', error);

			let errorMessage = 'Erro ao alternar hábito. Tente novamente.';
			if (error && typeof error === 'object' && 'response' in error) {
				const axiosError = error as { response?: { data?: { message?: string } } };
				errorMessage = axiosError.response?.data?.message || errorMessage;
			}

			toast.error(errorMessage);
			await loadHabits();
		} finally {
			setToggling(null);
		}
	}

	// Abrir modal de confirmação para deletar
	function handleDeleteClick(habitId: string, e: React.MouseEvent) {
		e.stopPropagation();
		if (deleting !== null) return;

		const habit = habits.find((h) => h.id === habitId);
		if (!habit) return;

		setConfirmModal({
			isOpen: true,
			habitId: habit.id,
			habitName: habit.name,
		});
	}

	// Confirmar exclusão
	async function confirmDelete() {
		const { habitId } = confirmModal;
		if (!habitId) return;

		try {
			setDeleting(habitId);
			await api.delete(`/habits/${habitId}`);

			setHabits((prevHabits) => prevHabits.filter((h) => h.id !== habitId));

			// Limpar seleção se o hábito deletado estava selecionado
			if (selectedHabit?.id === habitId) {
				setSelectedHabit(null);
				setMetrics(null);
				setSelectedDate(null);
			}

			toast.success('Hábito excluído com sucesso!');
		} catch (error: unknown) {
			console.error('Erro ao deletar hábito:', error);

			let errorMessage = 'Erro ao deletar hábito. Tente novamente.';
			if (error && typeof error === 'object' && 'response' in error) {
				const axiosError = error as { response?: { data?: { message?: string } } };
				errorMessage = axiosError.response?.data?.message || errorMessage;
			}

			toast.error(errorMessage);
			await loadHabits();
		} finally {
			setDeleting(null);
			setConfirmModal({ isOpen: false, habitId: null, habitName: '' });
		}
	}

	// Tecla Enter no input
	async function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Enter') {
			await handleAddHabit();
		}
	}

	// Navegar para mês anterior
	async function handlePrevMonth() {
		const newMonth = dayjs(currentMonth).subtract(1, 'month').toDate();
		setCurrentMonth(newMonth);
		setSelectedDate(null);
		if (selectedHabit) {
			await fetchMetrics(selectedHabit, newMonth);
		}
	}

	// Navegar para próximo mês
	async function handleNextMonth() {
		const newMonth = dayjs(currentMonth).add(1, 'month').toDate();
		setCurrentMonth(newMonth);
		setSelectedDate(null);
		if (selectedHabit) {
			await fetchMetrics(selectedHabit, newMonth);
		}
	}

	// Selecionar dia no calendário
	function handleSelectDate(date: Date, isCurrentMonth: boolean) {
		if (!isCurrentMonth) return;
		setSelectedDate(date);
	}

	// Carregar hábitos ao montar
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
						<input ref={nameInput} placeholder="Digite um novo hábito" type="text" onKeyDown={handleKeyDown} />
						<PaperPlaneRight onClick={handleAddHabit} className={styles.sendIcon} />
					</div>
					<div className={styles.habits}>
						{loading ? (
							<p className={styles.emptyMessage}>Carregando hábitos...</p>
						) : habits.length === 0 ? (
							<p className={styles.emptyMessage}>Nenhum hábito cadastrado ainda.</p>
						) : (
							habits.map((habit) => {
								const completedDates = Array.isArray(habit.isCompleted) ? habit.isCompleted : [];
								const isCompleted = completedDates.some((c) => c.date === today);
								const isBeingDeleted = deleting === habit.id;
								const isBeingToggled = toggling === habit.id;
								const isSelected = selectedHabit?.id === habit.id;

								return (
									<div
										key={habit.id}
										className={`${styles.habit} ${isSelected ? styles.habitActive : ''}`}
										style={{ opacity: isBeingDeleted ? 0.5 : 1 }}
										onClick={() => handleSelectHabit(habit)}
									>
										<p>{habit.name}</p>
										<div className={styles.actions}>
											<input
												type="checkbox"
												checked={isCompleted}
												onChange={(e) => handleToggleHabit(habit, e as unknown as React.MouseEvent)}
												onClick={(e) => e.stopPropagation()}
												disabled={isBeingToggled || isBeingDeleted}
											/>
											<Trash
												onClick={(e) => handleDeleteClick(habit.id, e)}
												className={styles.trashIcon}
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

				{selectedHabit ? (
					<div className={styles.metrics}>
						<h2>{selectedHabit.name}</h2>

						{/* Estatísticas */}
						<div className={styles.infoContainer}>
							<Info value={metricsInfo.completedDatesPerMonth} label="Dias concluídos" />
							<Info value={metricsInfo.completionPercentage} label="Porcentagem" />
						</div>

						{/* Feature: Detalhes do dia selecionado */}
						<div className={styles.dayDetails}>
							{selectedDate ? (
								<>
									<h3 className={styles.dayTitle}>{selectedDateFormatted}</h3>
									<div className={styles.dayContent}>
										{/* Data futura - não pode ter dados */}
										{isSelectedDateFuture ? (
											<p className={styles.noHabitsMessage}>Data futura - sem registros</p>
										) : allHabitsDayStatus.filter((item) => item.existedOnDate).length > 0 ? (
											allHabitsDayStatus
												.filter((item) => item.existedOnDate)
												.map((item) => (
													<div
														key={item.habit.id}
														className={`${styles.timeEntry} ${item.isCompleted ? styles.habitCompleted : styles.habitNotCompleted}`}
													>
														{item.isCompleted ? (
															<CheckCircle size={18} weight="fill" className={styles.iconCompleted} />
														) : (
															<XCircle size={18} weight="fill" className={styles.iconNotCompleted} />
														)}
														<span className={styles.timeRange}>{item.habit.name}</span>
														<span className={styles.duration}>{item.isCompleted ? 'Concluído' : 'Não concluído'}</span>
													</div>
												))
										) : (
											<p className={styles.noHabitsMessage}>Nenhum hábito existia nesta data</p>
										)}
									</div>
								</>
							) : (
								<p className={styles.dayPlaceholder}>Clique em um dia do calendário</p>
							)}
						</div>

						{/* Calendário customizado */}
						<div className={styles.calendar}>
							<div className={styles.calendarHeader}>
								<button type="button" onClick={handlePrevMonth} className={styles.calendarNav}>
									<CaretLeft size={20} weight="bold" />
								</button>
								<span className={styles.calendarTitle}>{dayjs(currentMonth).format('MMMM YYYY')}</span>
								<button type="button" onClick={handleNextMonth} className={styles.calendarNav}>
									<CaretRight size={20} weight="bold" />
								</button>
							</div>

							<div className={styles.calendarWeekdays}>
								{WEEK_DAYS.map((day, index) => (
									<span key={`weekday-${index}`} className={styles.weekday}>
										{day}
									</span>
								))}
							</div>

							<div className={styles.calendarDays}>
								{calendarDays.map((dayInfo, index) => {
									const isSelected =
										selectedDate &&
										dayjs(selectedDate).format('YYYY-MM-DD') === dayjs(dayInfo.date).format('YYYY-MM-DD');

									return (
										<button
											key={`day-${index}`}
											type="button"
											className={`${styles.calendarDay} ${
												!dayInfo.isCurrentMonth ? styles.calendarDayOutside : ''
											} ${dayInfo.isCompleted ? styles.calendarDayCompleted : ''} ${
												isSelected ? styles.calendarDaySelected : ''
											} ${dayInfo.isFuture ? styles.calendarDayFuture : ''}`}
											onClick={() => handleSelectDate(dayInfo.date, dayInfo.isCurrentMonth)}
											disabled={!dayInfo.isCurrentMonth || dayInfo.isFuture}
										>
											{dayInfo.day}
										</button>
									);
								})}
							</div>
						</div>
					</div>
				) : (
					<div className={styles.metricsEmpty}>
						<p>Selecione um hábito para ver as métricas</p>
					</div>
				)}
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
