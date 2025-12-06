import type { ComponentProps } from 'react';
import styles from './styles.module.css';

type ButtonProps = ComponentProps<'button'>;

export default function Button({ children, ...rest }: ButtonProps) {
	return (
		<button type="button" className={styles.container} {...rest}>
			{children}
		</button>
	);
}
