import { CaretLeft, CaretRight, Clock, Minus, Plus } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import Button from '../../components/Button';
import Header from '../../components/HeadeFix';
import Info from '../../components/Info';
import api from '../../services/api';
import styles from './styles.module.css';

// Configurar dayjs para português
dayjs.locale('pt-br');

const MIN_TIME = 5;
const MAX_FOCUS_TIME = 120;
const MAX_REST_TIME = 30;
const TIME_STEP = 5;

// Dias da semana em português
const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

type TimerStatus = 'idle' | 'running' | 'paused';
type TimerMode = 'focus' | 'rest';

type FocusMetrics = {
	_id: [number, number, number]; // [ano, mês, dia]
	count: number;
};

type FocusTimeEntry = {
	_id: string;
	timeFrom: string;
	timeTo: string;
	userId: string;
	createdAt: string;
	updatedAt: string;
};

export default function Focus() {
	// Timer states
	const [focusTime, setFocusTime] = useState(25);
	const [restTime, setRestTime] = useState(5);
	const [timeLeft, setTimeLeft] = useState(25 * 60);
	const [totalTime, setTotalTime] = useState(25 * 60);
	const [status, setStatus] = useState<TimerStatus>('idle');
	const [mode, setMode] = useState<TimerMode>('focus');
	const [timeFrom, setTimeFrom] = useState<Date | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Metrics states
	const [focusMetrics, setFocusMetrics] = useState<FocusMetrics[]>([]);
	const [focusTimeEntries, setFocusTimeEntries] = useState<FocusTimeEntry[]>([]);
	const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());

	// Configurações do círculo de progresso
	const CIRCLE_RADIUS = 120;
	const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
	const progress = totalTime > 0 ? timeLeft / totalTime : 1;
	const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progress);

	// Formatar tempo para MM:SS
	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	};

	// Set de datas com foco para busca rápida
	const completedDatesSet = useMemo(() => {
		if (!focusMetrics.length) return new Set<string>();
		return new Set(
			focusMetrics.map((m) =>
				dayjs(`${m._id[0]}-${m._id[1]}-${m._id[2]}`).format('YYYY-MM-DD')
			)
		);
	}, [focusMetrics]);

	// Gerar dias do calendário
	const calendarDays = useMemo(() => {
		const startOfMonth = dayjs(currentMonth).startOf('month');
		const endOfMonth = dayjs(currentMonth).endOf('month');
		const startDay = startOfMonth.day();
		const daysInMonth = endOfMonth.date();

		const days: Array<{ date: Date; day: number; isCurrentMonth: boolean; hasActivity: boolean }> = [];

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
				hasActivity: false,
			});
		}

		// Dias do mês atual
		for (let day = 1; day <= daysInMonth; day++) {
			const date = startOfMonth.date(day).toDate();
			const dateStr = dayjs(date).format('YYYY-MM-DD');
			days.push({
				date,
				day,
				isCurrentMonth: true,
				hasActivity: completedDatesSet.has(dateStr),
			});
		}

		// Dias do próximo mês
		const remainingDays = 42 - days.length;
		const nextMonth = startOfMonth.add(1, 'month');
		for (let day = 1; day <= remainingDays; day++) {
			const date = nextMonth.date(day).toDate();
			days.push({
				date,
				day,
				isCurrentMonth: false,
				hasActivity: false,
			});
		}

		return days;
	}, [currentMonth, completedDatesSet]);

	// Formatar data selecionada
	const selectedDateFormatted = useMemo(() => {
		return dayjs(selectedDate).format('D [de] MMMM');
	}, [selectedDate]);

	// Calcular métricas totais do mês
	const monthMetrics = useMemo(() => {
		let totalCycles = 0;
		for (const m of focusMetrics) {
			totalCycles += m.count;
		}
		return { totalCycles };
	}, [focusMetrics]);

	// Calcular métricas do dia selecionado
	const dayMetrics = useMemo(() => {
		const entries = focusTimeEntries.map((entry) => ({
			timeFrom: dayjs(entry.timeFrom),
			timeTo: dayjs(entry.timeTo),
			duration: dayjs(entry.timeTo).diff(dayjs(entry.timeFrom), 'minutes'),
		}));

		const totalMinutes = entries.reduce((sum, e) => sum + e.duration, 0);

		return { entries, totalMinutes };
	}, [focusTimeEntries]);

	// Formatar duração total
	const formatTotalTime = (minutes: number): string => {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 0) {
			return `${hours}h ${mins}min`;
		}
		return `${mins} min`;
	};

	// Salvar tempo de foco no backend
	const saveFocusTime = useCallback(async () => {
		if (!timeFrom || mode !== 'focus') return;

		try {
			await api.post('/focus-times', {
				timeFrom: timeFrom.toISOString(),
				timeTo: new Date().toISOString(),
			});
			toast.success('Tempo de foco salvo!');
			// Recarregar métricas
			await loadFocusMetrics(currentMonth);
			await loadFocusTimeEntries(selectedDate);
		} catch (error) {
			console.error('Erro ao salvar tempo de foco:', error);
			toast.error('Erro ao salvar tempo de foco');
		}
	}, [timeFrom, mode, currentMonth, selectedDate]);

	// Limpar intervalo
	const clearTimer = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}, []);

	// Carregar métricas do mês
	async function loadFocusMetrics(month: Date) {
		try {
			const { data } = await api.get<FocusMetrics[]>('/focus-times/metrics', {
				params: { date: dayjs(month).startOf('month').toISOString() },
			});
			setFocusMetrics(data);
		} catch (error) {
			console.error('Erro ao carregar métricas:', error);
		}
	}

	// Carregar entradas do dia
	async function loadFocusTimeEntries(date: Date) {
		try {
			const { data } = await api.get<FocusTimeEntry[]>('/focus-times', {
				params: { date: dayjs(date).toISOString() },
			});
			setFocusTimeEntries(data);
		} catch (error) {
			console.error('Erro ao carregar entradas:', error);
		}
	}

	// Handlers do timer
	const handleStart = useCallback(() => {
		const initialTime = mode === 'focus' ? focusTime * 60 : restTime * 60;
		if (status === 'idle') {
			setTimeLeft(initialTime);
			setTotalTime(initialTime);
			if (mode === 'focus') {
				setTimeFrom(new Date());
			}
		}
		setStatus('running');
	}, [status, mode, focusTime, restTime]);

	const handlePause = useCallback(async () => {
		clearTimer();
		setStatus('paused');

		if (mode === 'focus' && timeFrom) {
			try {
				await api.post('/focus-times', {
					timeFrom: timeFrom.toISOString(),
					timeTo: new Date().toISOString(),
				});
				toast.success('Tempo de foco salvo!');
				await loadFocusMetrics(currentMonth);
				await loadFocusTimeEntries(selectedDate);
			} catch (error) {
				console.error('Erro ao salvar:', error);
				toast.error('Erro ao salvar tempo de foco');
			}
			setTimeFrom(null);
		}
	}, [clearTimer, mode, timeFrom, currentMonth, selectedDate]);

	const handleResume = useCallback(() => {
		if (mode === 'focus') {
			setTimeFrom(new Date());
		}
		setStatus('running');
	}, [mode]);

	const handleCancel = useCallback(async () => {
		if (status === 'running' && mode === 'focus' && timeFrom) {
			await saveFocusTime();
		}

		clearTimer();
		setStatus('idle');
		setMode('focus');
		setTimeLeft(focusTime * 60);
		setTotalTime(focusTime * 60);
		setTimeFrom(null);
	}, [clearTimer, focusTime, status, mode, timeFrom, saveFocusTime]);

	const handleStartRest = useCallback(async () => {
		if (status === 'running' && mode === 'focus' && timeFrom) {
			await saveFocusTime();
		}

		clearTimer();
		setMode('rest');
		const time = restTime * 60;
		setTimeLeft(time);
		setTotalTime(time);
		setTimeFrom(null);
		setStatus('running');
	}, [clearTimer, restTime, mode, timeFrom, status, saveFocusTime]);

	const handleStartFocus = useCallback(() => {
		clearTimer();
		setMode('focus');
		const time = focusTime * 60;
		setTimeLeft(time);
		setTotalTime(time);
		setTimeFrom(new Date());
		setStatus('running');
	}, [clearTimer, focusTime]);

	// Navegação do calendário
	async function handlePrevMonth() {
		const newMonth = dayjs(currentMonth).subtract(1, 'month').toDate();
		setCurrentMonth(newMonth);
		await loadFocusMetrics(newMonth);
	}

	async function handleNextMonth() {
		const newMonth = dayjs(currentMonth).add(1, 'month').toDate();
		setCurrentMonth(newMonth);
		await loadFocusMetrics(newMonth);
	}

	// Selecionar dia no calendário
	async function handleSelectDate(date: Date, isCurrentMonth: boolean) {
		if (!isCurrentMonth) return;
		setSelectedDate(date);
		await loadFocusTimeEntries(date);
	}

	// Incrementar/decrementar tempo
	const handleIncrement = (type: 'focus' | 'rest') => {
		if (type === 'focus') {
			setFocusTime((prev) => Math.min(prev + TIME_STEP, MAX_FOCUS_TIME));
		} else {
			setRestTime((prev) => Math.min(prev + TIME_STEP, MAX_REST_TIME));
		}
	};

	const handleDecrement = (type: 'focus' | 'rest') => {
		if (type === 'focus') {
			setFocusTime((prev) => Math.max(prev - TIME_STEP, MIN_TIME));
		} else {
			setRestTime((prev) => Math.max(prev - TIME_STEP, MIN_TIME));
		}
	};

	const isConfigDisabled = status !== 'idle';

	// Efeito do timer
	useEffect(() => {
		if (status === 'running') {
			intervalRef.current = setInterval(() => {
				setTimeLeft((prev) => {
					if (prev <= 1) {
						clearTimer();
						if (mode === 'focus') {
							saveFocusTime().then(() => {
								setMode('rest');
								setStatus('idle');
								setTotalTime(restTime * 60);
								setTimeFrom(null);
							});
							return restTime * 60;
						}
						setMode('focus');
						setStatus('idle');
						setTotalTime(focusTime * 60);
						return focusTime * 60;
					}
					return prev - 1;
				});
			}, 1000);
		}

		return () => clearTimer();
	}, [status, mode, focusTime, restTime, clearTimer, saveFocusTime]);

	// Atualizar timeLeft quando configurações mudam
	useEffect(() => {
		if (status === 'idle') {
			const time = mode === 'focus' ? focusTime * 60 : restTime * 60;
			setTimeLeft(time);
			setTotalTime(time);
		}
	}, [focusTime, restTime, mode, status]);

	// Carregar dados iniciais
	useEffect(() => {
		loadFocusMetrics(currentMonth);
		loadFocusTimeEntries(selectedDate);
	}, []);

	return (
		<>
			<Toaster
				position="top-right"
				toastOptions={{
					duration: 3000,
					style: { background: '#1a1a1a', color: '#fff', border: '1px solid #333' },
				}}
			/>
			<div className={styles.container}>
				{/* Lado Esquerdo - Timer */}
				<div className={styles.timerSection}>
					<Header title="Tempo de Foco" />

					<div className={styles.inputGroup}>
						<div className={styles.timeControl}>
							<span className={styles.label}>Tempo de Foco</span>
							<div className={styles.timeButtons}>
								<button
									type="button"
									onClick={() => handleDecrement('focus')}
									disabled={focusTime <= MIN_TIME || isConfigDisabled}
								>
									<Minus size={18} weight="bold" />
								</button>
								<span>{focusTime} min</span>
								<button
									type="button"
									onClick={() => handleIncrement('focus')}
									disabled={focusTime >= MAX_FOCUS_TIME || isConfigDisabled}
								>
									<Plus size={18} weight="bold" />
								</button>
							</div>
						</div>
						<div className={styles.timeControl}>
							<span className={styles.label}>Tempo de Descanso</span>
							<div className={styles.timeButtons}>
								<button
									type="button"
									onClick={() => handleDecrement('rest')}
									disabled={restTime <= MIN_TIME || isConfigDisabled}
								>
									<Minus size={18} weight="bold" />
								</button>
								<span>{restTime} min</span>
								<button
									type="button"
									onClick={() => handleIncrement('rest')}
									disabled={restTime >= MAX_REST_TIME || isConfigDisabled}
								>
									<Plus size={18} weight="bold" />
								</button>
							</div>
						</div>
					</div>

					<div className={styles.timerContainer}>
						<div className={styles.timer}>
							<svg className={styles.progressRing} width="260" height="260">
								<circle
									className={styles.progressRingBg}
									stroke="var(--light)"
									strokeWidth="6"
									fill="transparent"
									r={CIRCLE_RADIUS}
									cx="130"
									cy="130"
								/>
								<circle
									className={styles.progressRingCircle}
									stroke={mode === 'focus' ? 'var(--info)' : 'var(--success, #22c55e)'}
									strokeWidth="6"
									fill="transparent"
									r={CIRCLE_RADIUS}
									cx="130"
									cy="130"
									strokeDasharray={CIRCLE_CIRCUMFERENCE}
									strokeDashoffset={strokeDashoffset}
									strokeLinecap="round"
								/>
							</svg>
							<span className={styles.timerText}>{formatTime(timeLeft)}</span>
						</div>

						<div className={styles.buttonGroup}>
							{status === 'idle' && (
								<>
									<Button onClick={handleStart}>Começar Foco</Button>
									<Button onClick={handleStartRest}>Começar Descanso</Button>
								</>
							)}
							{status === 'running' && (
								<>
									<Button onClick={handlePause}>Pausar</Button>
									{mode === 'focus' ? (
										<Button onClick={handleStartRest}>Pular para Descanso</Button>
									) : (
										<Button onClick={handleStartFocus}>Pular para Foco</Button>
									)}
									<Button variant="error" onClick={handleCancel}>
										Cancelar
									</Button>
								</>
							)}
							{status === 'paused' && (
								<>
									<Button onClick={handleResume}>Retomar</Button>
									{mode === 'focus' ? (
										<Button onClick={handleStartRest}>Iniciar Descanso</Button>
									) : (
										<Button onClick={handleStartFocus}>Iniciar Foco</Button>
									)}
									<Button variant="error" onClick={handleCancel}>
										Cancelar
									</Button>
								</>
							)}
						</div>
					</div>
				</div>

				{/* Lado Direito - Estatísticas */}
				<div className={styles.statsSection}>
					<h2 className={styles.statsTitle}>Estatísticas</h2>

					{/* Info Cards */}
					<div className={styles.infoContainer}>
						<Info value={String(monthMetrics.totalCycles)} label="Ciclos Totais" />
						<Info value={formatTotalTime(dayMetrics.totalMinutes)} label="Tempo Total de Foco" />
					</div>

					{/* Feature: Detalhes do dia selecionado */}
					<div className={styles.dayDetails}>
						<h3 className={styles.dayTitle}>{selectedDateFormatted}</h3>
						<div className={styles.dayContent}>
							{dayMetrics.entries.length > 0 ? (
								dayMetrics.entries.map((entry, index) => (
									<div key={index} className={styles.timeEntry}>
										<Clock size={16} weight="regular" />
										<span className={styles.timeRange}>
											{entry.timeFrom.format('HH:mm')} - {entry.timeTo.format('HH:mm')}
										</span>
										<span className={styles.duration}>{entry.duration} minutos</span>
									</div>
								))
							) : (
								<div className={styles.timeEntry}>
									<Clock size={16} weight="regular" />
									<span className={styles.timeRange}>Sem sessões de foco</span>
									<span className={styles.duration}>—</span>
								</div>
							)}
						</div>
					</div>

					{/* Calendário customizado */}
					<div className={styles.calendar}>
						<div className={styles.calendarHeader}>
							<button type="button" onClick={handlePrevMonth} className={styles.calendarNav}>
								<CaretLeft size={20} weight="bold" />
							</button>
							<span className={styles.calendarTitle}>
								{dayjs(currentMonth).format('MMMM YYYY')}
							</span>
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
									dayjs(selectedDate).format('YYYY-MM-DD') ===
									dayjs(dayInfo.date).format('YYYY-MM-DD');

								return (
									<button
										key={`day-${index}`}
										type="button"
										className={`${styles.calendarDay} ${
											!dayInfo.isCurrentMonth ? styles.calendarDayOutside : ''
										} ${dayInfo.hasActivity ? styles.calendarDayCompleted : ''} ${
											isSelected ? styles.calendarDaySelected : ''
										}`}
										onClick={() => handleSelectDate(dayInfo.date, dayInfo.isCurrentMonth)}
										disabled={!dayInfo.isCurrentMonth}
									>
										{dayInfo.day}
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
