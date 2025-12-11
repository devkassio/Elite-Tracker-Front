import Header from '../../components/HeadeFix';
import styles from './styles.module.css';

export default function Focus() {
	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<Header title="Tempo de Foco" />
			</div>
		</div>
	);
}
