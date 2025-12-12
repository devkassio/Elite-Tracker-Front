import clsx from 'clsx';
import type { ComponentProps } from 'react';
import styles from './styles.module.css';

type ButtonProps = ComponentProps<'button'> & {
	variant?: 'info' | 'error';
};

export default function Button({ children, disabled, variant = 'info', ...rest }: ButtonProps) {
	return (
		<button
			{...rest}
			className={clsx(styles.container, variant === 'error' && styles.error, disabled && styles.disabled)}
		>
			{children}
		</button>
	);
}
