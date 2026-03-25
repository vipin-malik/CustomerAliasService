import { Link, useLocation } from 'react-router-dom';
import appConfig from '@core/config/appConfig';
import styles from './TabNav.module.css';

export const TabNav = () => {
  const location = useLocation();

  return (
    <nav className={styles.nav}>
      <div className={styles.tabList}>
        {appConfig.navigation.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`${styles.tab} ${isActive ? styles.active : ''}`}
            >
              {item.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
