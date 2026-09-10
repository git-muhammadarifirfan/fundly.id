// Fundly.id — Goals Page
import React from 'react';
import { Card, CardHeader } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Plus, Target, Building2, GraduationCap, Palmtree, Laptop } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import styles from './GoalsPage.module.css';

const DEMO_GOALS = [
  { name: 'Tabungan Darurat', icon: Building2, current: 800000000, target: 2000000000, color: '#C6E83B', deadline: 'Des 2026' },
  { name: 'Dana Pendidikan', icon: GraduationCap, current: 640000000, target: 2000000000, color: '#5AC8FA', deadline: 'Jun 2027' },
  { name: 'Dana Pensiun', icon: Palmtree, current: 180000000, target: 2000000000, color: '#FF9500', deadline: 'Des 2040' },
  { name: 'Laptop Baru', icon: Laptop, current: 300000000, target: 500000000, color: '#AF52DE', deadline: 'Mar 2026' },
];

export const GoalsPage: React.FC = () => {
  return (
    <div className={styles.page}>
      <div className={styles.goalGrid}>
        {DEMO_GOALS.map((goal) => {
          const IconComp = goal.icon;
          const pct = Math.round((goal.current / goal.target) * 100);
          const circumference = 2 * Math.PI * 40;
          const dashoffset = circumference - (pct / 100) * circumference;
          return (
            <Card key={goal.name} padding="lg" hoverable>
              <div className={styles.goalTop}>
                <div className={styles.goalRing}>
                  <svg viewBox="0 0 100 100" className={styles.ringSvg}>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-bg-input)" strokeWidth="8" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke={goal.color} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={dashoffset} strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 1s ease-out' }} />
                  </svg>
                  <span className={styles.ringIcon}><IconComp size={20} /></span>
                </div>
                <span className={styles.goalPct} style={{ color: goal.color }}>{pct}%</span>
              </div>
              <h3 className={styles.goalName}>{goal.name}</h3>
              <p className={styles.goalProgress}>{formatCurrency(goal.current)} / {formatCurrency(goal.target)}</p>
              <p className={styles.goalDeadline}>Target: {goal.deadline}</p>
            </Card>
          );
        })}
      </div>
      <Button variant="primary" size="lg" fullWidth icon={<Plus size={18} />}>Tambah Target Baru</Button>
    </div>
  );
};
