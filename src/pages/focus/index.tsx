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

dayjs.locale('pt-br');

const MIN_TIME = 5;
const MAX_FOCUS_TIME = 120;
const MAX_REST_TIME = 30;
const TIME_STEP = 5;
const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

type TimerStatus = 'idle' | 'running' | 'paused';
type TimerMode = 'focus' | 'rest';

type FocusMetrics = {
	_id: [number, number, number];
	count: number;
};

type FocusTimeEntry = {
	_id: string;
	timeFrom: string;
	timeTo: string;
	type: 'focus' | 'rest';
	userId: string;
	createdAt: string;
	updatedAt: string;
};

export default function Focus() {
	const [focusTime, setFocusTime] = useState(25);
	const [restTime, setRestTime] = useState(5);
	const [timeLeft, setTimeLeft] = useState(25 * 60);
	const [totalTime, setTotalTime] = useState(25 * 60);
	const [status, setStatus] = useState<TimerStatus>('idle');
	const [mode, setMode] = useState<TimerMode>('focus');
	const [sessionStart, setSessionStart] = useState<Date | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const [focusMetrics, setFocusMetrics] = useState<FocusMetrics[]>([]);
	const [focusTimeEntries, setFocusTimeEntries] = useState<FocusTimeEntry[]>([]);
	const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());

	const todayDate = useMemo(() => dayjs().startOf('day'), []);

	const isSelectedDateFuture = useMemo(() => {
		return dayjs(selectedDate).startOf('day').isAfter(todayDate);
	}, [selectedDate, todayDate]);

	const CIRCLE_RADIUS = 100;
	const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
	const progress = totalTime > 0 ? timeLeft / totalTime : 1;
	const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progress);

	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	};

	const completedDatesSet = useMemo(() => {
		if (!focusMetrics.length) return new Set<string>();
		return new Set(
			focusMetrics.map((m) => dayjs(`${m._id[0]}-${m._id[1]}-${m._id[2]}`).format('YYYY-MM-DD'))
		);
	}, [focusMetrics]);

	const calendarDays = useMemo(() => {
		const startOfMonth = dayjs(currentMonth).startOf('month');
		const endOfMonth = dayjs(currentMonth).endOf('month');
		const startDay = startOfMonth.day();
		const daysInMonth = endOfMonth.date();

		const days: Array<{ date: Date; day: number; isCurrentMonth: boolean; hasActivity: boolean; isFuture: boolean }> = [];

		const prevMonth = startOfMonth.subtract(1, 'month');
		const daysInPrevMonth = prevMonth.endOf('month').date();
		for (let i = startDay - 1; i >= 0; i--) {
			const day = daysInPrevMonth - i;
			const date = prevMonth.date(day).toDate();
			days.push({ date, day, isCurrentMonth: false, hasActivity: false, isFuture: false });
		}

		for (let day = 1; day <= daysInMonth; day++) {
			const date = startOfMonth.date(day).toDate();
			const dateStr = dayjs(date).format('YYYY-MM-DD');
			const isFuture = dayjs(date).startOf('day').isAfter(todayDate);
			days.push({
				date,
				day,
				isCurrentMonth: true,
				hasActivity: completedDatesSet.has(dateStr),
				isFuture,
			});
		}

		const remainingDays = 42 - days.length;
		const nextMonth = startOfMonth.add(1, 'month');
		for (let day = 1; day <= remainingDays; day++) {
			const date = nextMonth.date(day).toDate();
			days.push({ date, day, isCurrentMonth: false, hasActivity: false, isFuture: true });
		}

		return days;
	}, [currentMonth, completedDatesSet, todayDate]);

	const selectedDateFormatted = useMemo(() => {
		return dayjs(selectedDate).format('D [de] MMMM');
	}, [selectedDate]);

	const monthMetrics = useMemo(() => {
		let totalCycles = 0;
		for (const m of focusMetrics) {
			totalCycles += m.count;
		}
		return { totalCycles };
	}, [focusMetrics]);

	const dayMetrics = useMemo(() => {
		const entries = focusTimeEntries.map((entry) => {
			const from = dayjs(entry.timeFrom);
			const to = dayjs(entry.timeTo);
			const durationSeconds = to.diff(from, 'second');
			const durationMinutes = Math.floor(durationSeconds / 60);
			const remainingSeconds = durationSeconds % 60;
			return {
				timeFrom: from,
				timeTo: to,
				durationMinutes,
				durationSeconds: remainingSeconds,
				totalSeconds: durationSeconds,
				type: entry.type || 'focus',
			};
		});
		const totalSeconds = entries.reduce((sum, e) => sum + e.totalSeconds, 0);
		const totalMinutes = Math.floor(totalSeconds / 60);
		return { entries, totalMinutes, totalSeconds };
	}, [focusTimeEntries]);

	const formatTotalTime = (minutes: number): string => {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 0) return `${hours}h ${mins}min`;
		return `${mins} min`;
	};

	const clearTimer = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}, []);

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

	const saveTime = useCallback(
		async (startTime: Date, type: 'focus' | 'rest') => {
			const endTime = new Date();
			const durationMs = endTime.getTime() - startTime.getTime();
			const durationSeconds = Math.floor(durationMs / 1000);

			if (durationSeconds < 10) {
				toast.error('Tempo muito curto (mínimo 10 segundos)');
				return false;
			}

			const durationMinutes = Math.floor(durationSeconds / 60);
			const remainingSeconds = durationSeconds % 60;

			try {
				await api.post('/focus-times', {
					timeFrom: startTime.toISOString(),
					timeTo: endTime.toISOString(),
					type,
				});
				const typeLabel = type === 'focus' ? 'Foco' : 'Descanso';
				toast.success(`${typeLabel} salvo: ${durationMinutes}min ${remainingSeconds}s`);
				await loadFocusMetrics(currentMonth);
				await loadFocusTimeEntries(selectedDate);
				return true;
			} catch (error) {
				console.error('Erro ao salvar:', error);
				toast.error('Erro ao salvar tempo');
				return false;
			}
		},
		[currentMonth, selectedDate]
	);

	const handleStart = useCallback(() => {
		const initialTime = mode === 'focus' ? focusTime * 60 : restTime * 60;
		if (status === 'idle') {
			setTimeLeft(initialTime);
			setTotalTime(initialTime);
			setSessionStart(new Date());
		}
		setStatus('running');
	}, [status, mode, focusTime, restTime]);

	const handlePause = useCallback(async () => {
		clearTimer();
		setStatus('paused');
		if (sessionStart) {
			await saveTime(sessionStart, mode);
			setSessionStart(null);
		}
	}, [clearTimer, mode, sessionStart, saveTime]);

	const handleResume = useCallback(() => {
		setSessionStart(new Date());
		setStatus('running');
	}, []);

	const cancelingRef = useRef(false);

	const handleCancel = useCallback(async () => {
		// Previne cliques duplos
		if (cancelingRef.current) {
			return;
		}

		cancelingRef.current = true;

		try {
			// Salva apenas se estiver rodando E tiver uma sessão ativa
			if (status === 'running' && sessionStart) {
				await saveTime(sessionStart, mode);
			}
		} catch (error) {
			console.error('Erro ao cancelar:', error);
		} finally {
			// Limpa imediatamente sem delay
			clearTimer();
			setStatus('idle');
			setMode('focus');
			setTimeLeft(focusTime * 60);
			setTotalTime(focusTime * 60);
			setSessionStart(null);

			// Libera o flag após 500ms
			setTimeout(() => {
				cancelingRef.current = false;
			}, 500);
		}
	}, [clearTimer, focusTime, status, mode, sessionStart, saveTime]);

	const handleStartRest = useCallback(async () => {
		if (status === 'running' && mode === 'focus' && sessionStart) {
			await saveTime(sessionStart, 'focus');
		}
		clearTimer();
		setMode('rest');
		const time = restTime * 60;
		setTimeLeft(time);
		setTotalTime(time);
		setSessionStart(new Date());
		setStatus('running');
	}, [clearTimer, restTime, mode, sessionStart, status, saveTime]);

	const handleStartFocus = useCallback(async () => {
		if (status === 'running' && mode === 'rest' && sessionStart) {
			await saveTime(sessionStart, 'rest');
		}
		clearTimer();
		setMode('focus');
		const time = focusTime * 60;
		setTimeLeft(time);
		setTotalTime(time);
		setSessionStart(new Date());
		setStatus('running');
	}, [clearTimer, focusTime, mode, sessionStart, status, saveTime]);

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

	async function handleSelectDate(date: Date, isCurrentMonth: boolean, isFuture: boolean) {
		if (!isCurrentMonth || isFuture) return;
		setSelectedDate(date);
		await loadFocusTimeEntries(date);
	}

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

	useEffect(() => {
		if (status === 'running') {
			intervalRef.current = setInterval(() => {
				setTimeLeft((prev) => {
					if (prev <= 1) {
						clearTimer();
						if (sessionStart) {
							saveTime(sessionStart, mode).then(() => {
								setSessionStart(null);
								if (mode === 'focus') {
									setMode('rest');
									setTotalTime(restTime * 60);
								} else {
									setMode('focus');
									setTotalTime(focusTime * 60);
								}
								setStatus('idle');
							});
						}
						return mode === 'focus' ? restTime * 60 : focusTime * 60;
					}
					return prev - 1;
				});
			}, 1000);
		}
		return () => clearTimer();
	}, [status, mode, focusTime, restTime, clearTimer, saveTime, sessionStart]);

	useEffect(() => {
		if (status === 'idle') {
			const time = mode === 'focus' ? focusTime * 60 : restTime * 60;
			setTimeLeft(time);
			setTotalTime(time);
		}
	}, [focusTime, restTime, mode, status]);

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
				<div className={styles.timerSection}>
					<Header title="Tempo de Foco" />
					<div className={styles.inputGroup}>
						<div className={styles.timeControl}>
							<span className={styles.label}>Tempo de Foco</span>
							<div className={styles.timeButtons}>
								<button type="button" onClick={() => handleDecrement('focus')} disabled={focusTime <= MIN_TIME || isConfigDisabled}>
									<Minus size={18} weight="bold" />
								</button>
								<span>{focusTime} min</span>
								<button type="button" onClick={() => handleIncrement('focus')} disabled={focusTime >= MAX_FOCUS_TIME || isConfigDisabled}>
									<Plus size={18} weight="bold" />
								</button>
							</div>
						</div>
						<div className={styles.timeControl}>
							<span className={styles.label}>Tempo de Descanso</span>
							<div className={styles.timeButtons}>
								<button type="button" onClick={() => handleDecrement('rest')} disabled={restTime <= MIN_TIME || isConfigDisabled}>
									<Minus size={18} weight="bold" />
								</button>
								<span>{restTime} min</span>
								<button type="button" onClick={() => handleIncrement('rest')} disabled={restTime >= MAX_REST_TIME || isConfigDisabled}>
									<Plus size={18} weight="bold" />
								</button>
							</div>
						</div>
					</div>
					<div className={styles.timerContainer}>
						<div className={styles.timer}>
							<svg className={styles.progressRing} width="260" height="260">
								<circle className={styles.progressRingBg} stroke="var(--light)" strokeWidth="6" fill="transparent" r={CIRCLE_RADIUS} cx="130" cy="130" />
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
							<div className={styles.timerContent}>
								<span className={styles.timerText}>{formatTime(timeLeft)}</span>
								{status !== 'idle' && (
									<span className={`${styles.timerStatus} ${mode === 'focus' ? styles.timerStatusFocus : styles.timerStatusRest}`}>
										{mode === 'focus' ? 'Em Foco' : 'Em Descanso'}
									</span>
								)}
							</div>
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
									<Button variant="error" onClick={handleCancel}>Cancelar</Button>
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
									<Button variant="error" onClick={handleCancel}>Cancelar</Button>
								</>
							)}
						</div>
					</div>
				</div>
				<div className={styles.statsSection}>
					<h2 className={styles.statsTitle}>Estatísticas</h2>
					<div className={styles.infoContainer}>
						<Info value={String(monthMetrics.totalCycles)} label="Ciclos do Mês" />
						<Info value={formatTotalTime(dayMetrics.totalMinutes)} label="Tempo Hoje" />
					</div>
					<div className={styles.dayDetails}>
						<h3 className={styles.dayTitle}>{selectedDateFormatted}</h3>
						<div className={styles.dayContent}>
							{isSelectedDateFuture ? (
								<div className={styles.timeEntry}>
									<Clock size={16} weight="regular" />
									<span className={styles.timeRange}>Data futura - sem registros</span>
									<span className={styles.duration}>—</span>
								</div>
							) : dayMetrics.entries.length > 0 ? (
								dayMetrics.entries.map((entry, index) => (
									<div key={index} className={`${styles.timeEntry} ${entry.type === 'rest' ? styles.timeEntryRest : ''}`}>
										<Clock size={16} weight="regular" />
										<span className={`${styles.entryType} ${entry.type === 'rest' ? styles.entryTypeRest : ''}`}>
											{entry.type === 'focus' ? 'Foco' : 'Descanso'}
										</span>
										<span className={styles.timeRange}>
											{entry.timeFrom.format('HH:mm:ss')} - {entry.timeTo.format('HH:mm:ss')}
										</span>
										<span className={styles.duration}>
											{entry.durationMinutes}min {entry.durationSeconds}s
										</span>
									</div>
								))
							) : (
								<div className={styles.timeEntry}>
									<Clock size={16} weight="regular" />
									<span className={styles.timeRange}>Sem sessões registradas</span>
									<span className={styles.duration}>—</span>
								</div>
							)}
						</div>
					</div>
					<div className={styles.calendar}>
						<div className={styles.calendarHeader}>
							<button type="button" onClick={handlePrevMonth} className={styles.calendarNav}>
								<CaretLeft size={18} weight="bold" />
							</button>
							<span className={styles.calendarTitle}>{dayjs(currentMonth).format('MMMM YYYY')}</span>
							<button type="button" onClick={handleNextMonth} className={styles.calendarNav}>
								<CaretRight size={18} weight="bold" />
							</button>
						</div>
						<div className={styles.calendarWeekdays}>
							{WEEK_DAYS.map((day, index) => (
								<span key={`weekday-${index}`} className={styles.weekday}>{day}</span>
							))}
						</div>
						<div className={styles.calendarDays}>
							{calendarDays.map((dayInfo, index) => {
								const isSelected = dayjs(selectedDate).format('YYYY-MM-DD') === dayjs(dayInfo.date).format('YYYY-MM-DD');
								return (
									<button
										key={`day-${index}`}
										type="button"
										className={`${styles.calendarDay} ${!dayInfo.isCurrentMonth ? styles.calendarDayOutside : ''} ${dayInfo.hasActivity ? styles.calendarDayCompleted : ''} ${isSelected ? styles.calendarDaySelected : ''} ${dayInfo.isFuture ? styles.calendarDayFuture : ''}`}
										onClick={() => handleSelectDate(dayInfo.date, dayInfo.isCurrentMonth, dayInfo.isFuture)}
										disabled={!dayInfo.isCurrentMonth || dayInfo.isFuture}
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
