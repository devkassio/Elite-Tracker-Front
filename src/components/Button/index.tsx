import styles from './styles.module.css';

type ButtonProps = {
	children: React.ReactNode;
};

export default function Button({ children }: ButtonProps) {
	return (
		<button type="button" className={styles.container}>
			{children}
		</button>
	);
}
