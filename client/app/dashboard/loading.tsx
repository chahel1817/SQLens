import Image from 'next/image';
import styles from '../page.module.css';

export default function DashboardLoading() {
  return (
    <div className={styles.loaderScreen}>
      <Image src="/SQLens.png" alt="SQLens" width={56} height={56} priority className={styles.loaderLogo} />
      <div className={styles.loaderBar}>
        <div
          className={styles.loaderFill}
          style={{ background: 'linear-gradient(135deg, #FF7A18, #FF3D77)' }}
        />
      </div>
      <p>Loading your SQLens workspace...</p>
    </div>
  );
}
