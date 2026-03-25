import { Header } from '@core/components/Header';
import { TabNav } from '@core/components/TabNav';
import styles from './Layout.module.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className={styles.root}>
      <Header />
      <TabNav />
      <main className={styles.content}>{children}</main>
    </div>
  );
};
