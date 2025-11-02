import styles from './HomePage.module.css';

export default function HomePage() {
    return (
        <div className={styles.root}>
            <h1>Welcome to the Home Page</h1>
            <p>This is the main landing page of the application.</p>
        </div>
    );
}