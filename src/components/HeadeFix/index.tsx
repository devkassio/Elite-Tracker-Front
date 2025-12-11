import styles from './styles.module.css';

type HeaderProps = {
	title?: string;
};

export default function Header({ title }: HeaderProps) {
	return (
		<header className={styles.header}>
			<h1>{title || 'Hábitos Diários'}</h1>
			<span>{`${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date())}`}</span>
		</header>
	);
}
