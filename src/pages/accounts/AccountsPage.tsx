// ============================================
// Fundly.id — Placeholder Pages
// ============================================

import React from 'react';
import { Card, CardHeader } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Wallet, Plus, MoreHorizontal, Banknote, Building2, Smartphone, CreditCard } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import styles from './AccountsPage.module.css';

const DEMO_ACCOUNTS = [
  { name: 'Kas', type: 'Cash', balance: 50000000, icon: Banknote, color: '#34C759' },
  { name: 'BCA', type: 'Bank', balance: 85000000, icon: Building2, color: '#45B7D1' },
  { name: 'GoPay', type: 'E-wallet', balance: 15000000, icon: Smartphone, color: '#5AC8FA' },
  { name: 'OVO', type: 'E-wallet', balance: 8000000, icon: Smartphone, color: '#AF52DE' },
  { name: 'Kartu Kredit', type: 'Credit Card', balance: -25000000, icon: CreditCard, color: '#FF3B30' },
];

export const AccountsPage: React.FC = () => {
  const totalBalance = DEMO_ACCOUNTS.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div className={styles.page}>
      <Card variant="primary" padding="lg" className={styles.totalCard}>
        <div className={styles.totalHeader}>
          <Wallet size={24} />
          <span>Total Saldo</span>
        </div>
        <div className={styles.totalAmount}>{formatCurrency(totalBalance)}</div>
        <div className={styles.totalSub}>{DEMO_ACCOUNTS.length} akun aktif</div>
      </Card>

      <div className={styles.accountsList}>
        {DEMO_ACCOUNTS.map((acc) => {
          const IconComp = acc.icon;
          return (
            <Card key={acc.name} padding="md" hoverable className={styles.accountItem}>
              <div className={styles.accountIcon} style={{ background: `${acc.color}20`, color: acc.color }}>
                <IconComp size={20} />
              </div>
              <div className={styles.accountInfo}>
                <span className={styles.accountName}>{acc.name}</span>
                <span className={styles.accountType}>{acc.type}</span>
              </div>
              <span className={styles.accountBalance} style={{ color: acc.balance < 0 ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
                {formatCurrency(acc.balance)}
              </span>
              <button className={styles.moreBtn}><MoreHorizontal size={16} /></button>
            </Card>
          );
        })}
      </div>

      <Button variant="outline" size="lg" fullWidth icon={<Plus size={18} />} className={styles.addBtn}>
        Tambah Akun Baru
      </Button>
    </div>
  );
};
