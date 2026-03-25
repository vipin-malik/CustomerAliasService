import { Link } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import HelpOutline from '@mui/icons-material/HelpOutline';
import Settings from '@mui/icons-material/Settings';
import People from '@mui/icons-material/People';
import appConfig from '@core/config/appConfig';
import styles from './Header.module.css';

export const Header = () => {
  return (
    <header className={styles.header}>
      <Link to="/" className={styles.appName}>
        {appConfig.appName}
      </Link>
      <div className={styles.actions}>
        <IconButton className={styles.iconButton} title="Help" size="small">
          <HelpOutline fontSize="small" />
        </IconButton>
        <IconButton className={styles.iconButton} title="Settings" size="small">
          <Settings fontSize="small" />
        </IconButton>
        <IconButton className={styles.iconButton} title="Users" size="small">
          <People fontSize="small" />
        </IconButton>
      </div>
    </header>
  );
};
