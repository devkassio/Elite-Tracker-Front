import styles from './styles.module.css';


type InfoProps = {
    value: string;
    label: string;
};

export default function Info({ value, label }: InfoProps) {
    return (
        <div className={styles.container}>
            <strong className={styles.value}>{value}</strong>
            <span className={styles.label}>{label}</span>
        </div>
    );
}
