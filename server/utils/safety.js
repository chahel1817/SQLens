/**
 * Basic safety check to prevent destructive SQL commands
 * In a real-world app, this would be much more sophisticated or 
 * use a read-only database user.
 */
const isQuerySafe = (sql) => {
    const destructiveCommands = [
        'DROP',
        'DELETE',
        'UPDATE',
        'INSERT',
        'TRUNCATE',
        'ALTER',
        'GRANT',
        'REVOKE',
        'CREATE'
    ];

    const normalizedSql = sql.toUpperCase().trim();

    // We only allow SELECT for the optimizer visualizer
    if (!normalizedSql.startsWith('SELECT') && !normalizedSql.startsWith('WITH')) {
        return false;
    }

    // Check for destructive commands even inside subqueries
    for (const command of destructiveCommands) {
        const regex = new RegExp(`\\b${command}\\b`, 'i');
        if (regex.test(normalizedSql)) {
            // Allow 'CREATE' only if it's NOT the start (though we already checked startsWith SELECT)
            // but let's be strict for now.
            return false;
        }
    }

    return true;
};

module.exports = { isQuerySafe };
