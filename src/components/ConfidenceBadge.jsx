import React from 'react';
import { cls } from '../styles/classes';

const ConfidenceBadge = ({ score, isResolved }) => {
  if (!isResolved) {
    return <span className={cls.badgeError}>Unresolved</span>;
  }

  if (score >= 90) {
    return <span className={cls.badgeSuccess}>High ({score}%)</span>;
  }
  if (score >= 70) {
    return <span className={cls.badgeWarning}>Medium ({score}%)</span>;
  }
  return <span className={cls.badgeError}>Low ({score}%)</span>;
};

export default ConfidenceBadge;
