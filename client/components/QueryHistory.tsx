'use client';

import React from 'react';
import styles from '../app/page.module.css';
import { UserLog } from './types';

interface QueryHistoryProps {
    userLogs: UserLog[];
}

const QueryHistory: React.FC<QueryHistoryProps> = ({ userLogs }) => {
    return (
        <div className={styles.moduleContainer}>
            <div className={styles.moduleHeader}>
                <h2 className={styles.moduleTitle}>System Logs</h2>
                <p className={styles.moduleDesc}>Audit trail for all database activity and analyzer operations.</p>
            </div>

            <table className={styles.logsTable}>
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>Event</th>
                        <th>User</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {userLogs.length > 0 ? userLogs.map((log, i) => (
                        <tr key={i}>
                            <td style={{ opacity: 0.6 }}>{log.time}</td>
                            <td style={{ fontWeight: 600 }}>{log.event}</td>
                            <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.detail}>{log.detail}</td>
                            <td>
                                <span className={`${styles.badge} ${log.status === 'SUCCESS' ? styles.statusOk : styles.statusWarn}`}>
                                    {log.status}
                                </span>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={4} style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>No logs available yet. Run some queries!</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default QueryHistory;
