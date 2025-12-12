import { MinusIcon, PlusIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../../components/Button';
import Header from '../../components/HeadeFix';
import api from '../../services/api';
import styles from './styles.module.css';

const MIN_TIME = 5;
const MAX_FOCUS_TIME = 120;
const MAX_REST_TIME = 30;
const TIME_STEP = 5;

type TimerStatus = 'idle' | 'running' | 'paused';
type TimerMode = 'focus' | 'rest';

export default function Focus() {
	const [focusTime, setFocusTime] = useState(25);
	const [restTime, setRestTime] = useState(5);
	const [timeLeft, setTimeLeft] = useState(25 * 60); // em segundos
	const [totalTime, setTotalTime] = useState(25 * 60); // tempo total para cálculo do progresso
	const [status, setStatus] = useState<TimerStatus>('idle');
	const [mode, setMode] = useState<TimerMode>('focus');
	const [timeFrom, setTimeFrom] = useState<Date | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Configurações do círculo de progresso
	const CIRCLE_RADIUS = 134;
	const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
	const progress = totalTime > 0 ? timeLeft / totalTime : 1;
	const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progress);

	// Formatar tempo para MM:SS
	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	};

	// Salvar tempo de foco no backend
	const saveFocusTime = async () => {
		if (!timeFrom || mode !== 'focus') return;

		try {
			await api.post('/focus-times', {
				timeFrom: timeFrom.toISOString(),
				timeTo: new Date().toISOString(),
			});
			toast.success('Tempo de foco salvo com sucesso!');
		} catch (error) {
			console.error('Erro ao salvar tempo de foco:', error);
			toast.error('Erro ao salvar tempo de foco');
		}
	};

	// Limpar intervalo
	const clearTimer = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}, []);

	// Iniciar timer
	const handleStart = useCallback(() => {
		const initialTime = mode === 'focus' ? focusTime * 60 : restTime * 60;
		if (status === 'idle') {
			setTimeLeft(initialTime);
			setTotalTime(initialTime);
			// Registrar início do foco
			if (mode === 'focus') {
				setTimeFrom(new Date());
			}
		}
		setStatus('running');
	}, [status, mode, focusTime, restTime]);

	// Pausar timer
	const handlePause = useCallback(async () => {
		clearTimer();
		setStatus('paused');

		// Salvar o tempo de foco acumulado até a pausa
		if (mode === 'focus' && timeFrom) {
			try {
				await api.post('/focus-times', {
					timeFrom: timeFrom.toISOString(),
					timeTo: new Date().toISOString(),
				});
				toast.success('Tempo de foco salvo!');
			} catch (error) {
				console.error('Erro ao salvar tempo de foco na pausa:', error);
				toast.error('Erro ao salvar tempo de foco');
			}
			setTimeFrom(null); // Limpar para evitar salvar duplicado
		}
	}, [clearTimer, mode, timeFrom]);

	// Retomar timer
	const handleResume = useCallback(() => {
		// Ao retomar no modo foco, inicia um novo período de tracking
		if (mode === 'focus') {
			setTimeFrom(new Date());
		}
		setStatus('running');
	}, [mode]);

	// Cancelar timer
	const handleCancel = useCallback(async () => {
		// Salvar tempo de foco se estava em execução (running) e tem timeFrom
		// Se estava pausado, o tempo já foi salvo no handlePause
		if (status === 'running' && mode === 'focus' && timeFrom) {
			await saveFocusTime();
		}

		clearTimer();
		setStatus('idle');
		setMode('focus');
		setTimeLeft(focusTime * 60);
		setTotalTime(focusTime * 60);
		setTimeFrom(null);
	}, [clearTimer, focusTime, status, mode, timeFrom]);

	// Iniciar descanso
	const handleStartRest = useCallback(async () => {
		// Salvar tempo de foco se estava rodando em modo foco
		// Se estava pausado, o tempo já foi salvo no handlePause
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
	}, [clearTimer, restTime, mode, timeFrom, status]);

	// Iniciar foco
	const handleStartFocus = useCallback(() => {
		clearTimer();
		setMode('focus');
		const time = focusTime * 60;
		setTimeLeft(time);
		setTotalTime(time);
		setTimeFrom(new Date()); // Registrar novo início de foco
		setStatus('running');
	}, [clearTimer, focusTime]);

	// Efeito do timer
	useEffect(() => {
		if (status === 'running') {
			intervalRef.current = setInterval(() => {
				setTimeLeft((prev) => {
					if (prev <= 1) {
						clearTimer();
						// Timer acabou - salvar e alternar
						if (mode === 'focus') {
							// Salvar tempo de foco completado
							saveFocusTime().then(() => {
								setMode('rest');
								setStatus('idle');
								const time = restTime * 60;
								setTotalTime(time);
								setTimeFrom(null);
							});
							return restTime * 60;
						}
						setMode('focus');
						setStatus('idle');
						const time = focusTime * 60;
						setTotalTime(time);
						return time;
					}
					return prev - 1;
				});
			}, 1000);
		}

		return () => clearTimer();
	}, [status, mode, focusTime, restTime, clearTimer]);

	// Atualizar timeLeft quando focusTime/restTime mudam e está idle
	useEffect(() => {
		if (status === 'idle') {
			const time = mode === 'focus' ? focusTime * 60 : restTime * 60;
			setTimeLeft(time);
			setTotalTime(time);
		}
	}, [focusTime, restTime, mode, status]);

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

	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<Header title="Tempo de Foco" />
				<div className={styles['input-group']}>
					<div className={styles['time-control']}>
						<span className={styles.label}>Tempo de Foco</span>
						<div className={styles['time-buttons']}>
							<button
								type="button"
								onClick={() => handleDecrement('focus')}
								disabled={focusTime <= MIN_TIME || isConfigDisabled}
								aria-label="Diminuir tempo de foco"
							>
								<MinusIcon size={20} />
							</button>
							<span>{focusTime} min</span>
							<button
								type="button"
								onClick={() => handleIncrement('focus')}
								disabled={focusTime >= MAX_FOCUS_TIME || isConfigDisabled}
								aria-label="Aumentar tempo de foco"
							>
								<PlusIcon size={20} />
							</button>
						</div>
					</div>
					<div className={styles['time-control']}>
						<span className={styles.label}>Tempo de Descanso</span>
						<div className={styles['time-buttons']}>
							<button
								type="button"
								onClick={() => handleDecrement('rest')}
								disabled={restTime <= MIN_TIME || isConfigDisabled}
								aria-label="Diminuir tempo de descanso"
							>
								<MinusIcon size={20} />
							</button>
							<span>{restTime} min</span>
							<button
								type="button"
								onClick={() => handleIncrement('rest')}
								disabled={restTime >= MAX_REST_TIME || isConfigDisabled}
								aria-label="Aumentar tempo de descanso"
							>
								<PlusIcon size={20} />
							</button>
						</div>
					</div>
				</div>

				<div className={styles['timer-section']}>
					<div className={styles.timer}>
						<svg className={styles['progress-ring']} width="280" height="280" aria-hidden="true">
							<circle
								className={styles['progress-ring-bg']}
								stroke="var(--light)"
								strokeWidth="6"
								fill="transparent"
								r={CIRCLE_RADIUS}
								cx="140"
								cy="140"
							/>
							<circle
								className={styles['progress-ring-circle']}
								stroke={mode === 'focus' ? 'var(--info)' : 'var(--success, #22c55e)'}
								strokeWidth="6"
								fill="transparent"
								r={CIRCLE_RADIUS}
								cx="140"
								cy="140"
								strokeDasharray={CIRCLE_CIRCUMFERENCE}
								strokeDashoffset={strokeDashoffset}
								strokeLinecap="round"
							/>
						</svg>
						<span className={styles['timer-text']}>{formatTime(timeLeft)}</span>
					</div>
					<div className={styles['button-group']}>
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
		</div>
	);
}
