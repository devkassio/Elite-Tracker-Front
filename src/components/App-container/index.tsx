import styles from './styles.module.css';

type AppContainerProps = {
	children: React.ReactNode;
};

export function AppContainer({ children }: AppContainerProps) {
	return <div className={styles.app}>{children}</div>;
}
