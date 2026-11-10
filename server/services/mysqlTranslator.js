const { Parser } = require('node-sql-parser');

class MySQLTranslator {
    constructor(userSchema) {
        this.userSchema = userSchema;       // e.g. "user_5"
        this.activeDb = userSchema;         // current "USE" target
        this.parser = new Parser();
    }

    /**
     * Main entry: takes raw MySQL query, returns { pgQuery, isMeta }
     * isMeta = true means it's a synthetic response (SHOW TABLES, etc.)
     */
    translate(mysqlQuery) {
        const trimmed = mysqlQuery.trim().replace(/;$/, '').trim();
        const upper = trimmed.toUpperCase();

        // ── META COMMANDS (return synthetic PG queries) ──
        if (upper.startsWith('SHOW DATABASES')) {
            return {
                isMeta: false,
                astMode: 'meta',
                statementTypes: ['SHOW DATABASES'],
                tables: [],
                dialectTransforms: ['MySQL SHOW DATABASES → information_schema.schemata query'],
                pgQuery: `SELECT schema_name AS "Database" FROM information_schema.schemata WHERE schema_name LIKE '${this.userSchema}%' OR schema_name = '${this.userSchema}'`
            };
        }

        if (upper.startsWith('SHOW TABLES')) {
            return {
                isMeta: false,
                astMode: 'meta',
                statementTypes: ['SHOW TABLES'],
                tables: [],
                dialectTransforms: ['MySQL SHOW TABLES → information_schema.tables query'],
                pgQuery: `SELECT table_name AS "Table" FROM information_schema.tables WHERE table_schema = '${this.activeDb}' AND table_type = 'BASE TABLE'`
            };
        }

        if (upper.startsWith('DESC ') || upper.startsWith('DESCRIBE ')) {
            const rawTable = trimmed.split(/\s+/)[1]?.replace(/`/g, '').toLowerCase() || '';
            if (!/^[a-z_][a-z0-9_]*$/.test(rawTable)) {
                throw new Error('Invalid table name in DESCRIBE statement.');
            }
            return {
                isMeta: false,
                astMode: 'meta',
                statementTypes: ['DESCRIBE'],
                tables: [rawTable],
                dialectTransforms: ['MySQL DESCRIBE → information_schema.columns query'],
                pgQuery: `SELECT column_name AS "Field", data_type AS "Type", is_nullable AS "Null", column_default AS "Default" FROM information_schema.columns WHERE table_schema = '${this.activeDb}' AND table_name = '${rawTable}' ORDER BY ordinal_position`
            };
        }

        if (upper.startsWith('SHOW COLUMNS FROM')) {
            const rawTable = trimmed.split(/\s+/)[3]?.replace(/`/g, '').toLowerCase() || '';
            if (!/^[a-z_][a-z0-9_]*$/.test(rawTable)) {
                throw new Error('Invalid table name in SHOW COLUMNS statement.');
            }
            return {
                isMeta: false,
                astMode: 'meta',
                statementTypes: ['SHOW COLUMNS'],
                tables: [rawTable],
                dialectTransforms: ['MySQL SHOW COLUMNS → information_schema.columns query'],
                pgQuery: `SELECT column_name AS "Field", data_type AS "Type", is_nullable AS "Null", column_default AS "Default" FROM information_schema.columns WHERE table_schema = '${this.activeDb}' AND table_name = '${rawTable}' ORDER BY ordinal_position`
            };
        }

        // ── USE database ──
        if (upper.startsWith('USE ')) {
            const dbName = trimmed.split(/\s+/)[1]?.replace(/`/g, '').toLowerCase() || '';
            if (!/^[a-z0-9_]+$/.test(dbName)) {
                throw new Error('Invalid database name in USE statement.');
            }
            const targetSchema = dbName === this.userSchema ? this.userSchema : `${this.userSchema}_${dbName}`;
            this.activeDb = targetSchema;
            return {
                isMeta: true,
                targetSchema,
                astMode: 'meta',
                statementTypes: ['USE'],
                tables: [],
                dialectTransforms: [`USE ${dbName} → SET search_path TO ${targetSchema}`],
                pgQuery: `SET search_path TO ${targetSchema}`,
                message: `Database changed to "${dbName}"`
            };
        }

        // ── CREATE DATABASE ──
        if (upper.startsWith('CREATE DATABASE')) {
            const parts = trimmed.match(/CREATE\s+DATABASE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)[`"]?/i);
            if (!parts) return { isMeta: false, pgQuery: trimmed };
            const dbName = parts[1].toLowerCase();
            const schemaName = `${this.userSchema}_${dbName}`;
            const ifNotExists = upper.includes('IF NOT EXISTS') ? 'IF NOT EXISTS' : '';
            return {
                isMeta: false,
                astMode: 'meta',
                statementTypes: ['CREATE DATABASE'],
                tables: [],
                dialectTransforms: [`MySQL CREATE DATABASE → PostgreSQL CREATE SCHEMA ${schemaName}`],
                pgQuery: `CREATE SCHEMA ${ifNotExists} ${schemaName}`,
                noTransaction: true
            };
        }

        // ── DROP DATABASE ──
        if (upper.startsWith('DROP DATABASE')) {
            const parts = trimmed.match(/DROP\s+DATABASE\s+(?:IF\s+EXISTS\s+)?[`"]?(\w+)[`"]?/i);
            if (!parts) return { isMeta: false, pgQuery: trimmed };
            const dbName = parts[1].toLowerCase();
            const schemaName = `${this.userSchema}_${dbName}`;
            const ifExists = upper.includes('IF EXISTS') ? 'IF EXISTS' : '';
            return {
                isMeta: false,
                astMode: 'meta',
                statementTypes: ['DROP DATABASE'],
                tables: [],
                dialectTransforms: [`MySQL DROP DATABASE → PostgreSQL DROP SCHEMA ${schemaName} CASCADE`],
                pgQuery: `DROP SCHEMA ${ifExists} ${schemaName} CASCADE`,
                noTransaction: true
            };
        }

        // ── ANALYZE [TABLE] <table> ──
        if (upper.startsWith('ANALYZE ')) {
            const match = trimmed.match(/^ANALYZE\s+(?:TABLE\s+)?[`"]?([a-z_][a-z0-9_]*)[`"]?$/i);
            if (!match) {
                throw new Error('Invalid table name in ANALYZE statement.');
            }
            const tableName = match[1].toLowerCase();
            return {
                isMeta: false,
                pgQuery: `ANALYZE ${tableName}`,
                ast: { type: 'analyze', table: tableName },
                astMode: 'meta',
                parseError: null,
                statementTypes: ['ANALYZE'],
                tables: [tableName],
                dialectTransforms: /^ANALYZE\s+TABLE\b/i.test(trimmed) ? ['MySQL ANALYZE TABLE → PostgreSQL ANALYZE'] : []
            };
        }

        // ── Robust Parsing for Standard SQL ──
        let pgQuery;
        let ast = null;
        let astMode = 'ast';
        let parseError = null;
        let statementTypes = [];
        let tables = [];

        try {
            // Use node-sql-parser for structural integrity (CTEs, subqueries, complex joins)
            ast = this.parser.astify(trimmed, { database: 'MySQL' });
            const astNodes = Array.isArray(ast) ? ast : [ast];
            statementTypes = [...new Set(astNodes.map((n) => String(n?.type || '').toUpperCase()).filter(Boolean))];

            try {
                const rawTables = this.parser.tableList(trimmed, { database: 'MySQL' });
                tables = [...new Set(
                    rawTables
                        .map((entry) => entry.split('::').pop())
                        .filter(Boolean)
                )];
            } catch (_) { }

            // Re-stringify as PostgreSQL
            pgQuery = this.parser.sqlify(ast, { database: 'PostgreSQL' });

            // Final pass: apply regex-based fixes for types and nuances that the parser 
            // might not automatically translate between dialects
            pgQuery = this.translateSyntax(pgQuery);
        } catch (err) {
            // Fallback to legacy regex-only translation if parsing fails
            console.warn('SQL Parser failed, falling back to regex:', err.message);
            astMode = 'regex-fallback';
            parseError = err.message;
            const firstKeyword = trimmed.split(/\s+/)[0]?.toUpperCase();
            if (firstKeyword) statementTypes = [firstKeyword];
            pgQuery = this.translateSyntax(trimmed);
        }

        return {
            isMeta: false,
            pgQuery,
            ast,
            astMode,
            parseError,
            statementTypes,
            tables,
            dialectTransforms: this.detectDialectTransforms(trimmed, pgQuery)
        };
    }

    /**
     * Summarize dialect conversions applied from MySQL input to PostgreSQL SQL
     */
    detectDialectTransforms(rawQuery, pgQuery) {
        const transforms = [];
        if (/`/.test(rawQuery) && !/`/.test(pgQuery)) {
            transforms.push('Backtick quotes (`) → PostgreSQL identifiers');
        }
        if (/\bAUTO_INCREMENT\b/i.test(rawQuery) && /\b(?:BIG|SMALL)?SERIAL\b/i.test(pgQuery)) {
            transforms.push('AUTO_INCREMENT → SERIAL / BIGSERIAL');
        }
        if (/\bLIMIT\s+\d+\s*,\s*\d+/i.test(rawQuery) && /\bOFFSET\b/i.test(pgQuery)) {
            transforms.push('LIMIT offset, count → LIMIT count OFFSET offset');
        }
        if (/\bTINYINT\s*\(\s*1\s*\)/i.test(rawQuery) && /\bBOOLEAN\b/i.test(pgQuery)) {
            transforms.push('TINYINT(1) → BOOLEAN');
        }
        if (/\bDATETIME\b/i.test(rawQuery) && /\bTIMESTAMP\b/i.test(pgQuery)) {
            transforms.push('DATETIME → TIMESTAMP');
        }
        if (/\bIFNULL\s*\(/i.test(rawQuery) && /\bCOALESCE\s*\(/i.test(pgQuery)) {
            transforms.push('IFNULL() → COALESCE()');
        }
        if (/\bENGINE\s*=\s*\w+/i.test(rawQuery)) {
            transforms.push('Stripped MySQL storage ENGINE clause');
        }
        if (/\bSHOW\s+|DESC(?:RIBE)?\s+/i.test(rawQuery)) {
            transforms.push('MySQL metadata command → information_schema catalog query');
        }
        return transforms;
    }

    /**
     * Translate MySQL-specific SQL syntax to PostgreSQL
     */
    translateSyntax(query) {
        let q = query;

        // Remove backtick quoting → PostgreSQL doesn't use backticks
        q = q.replace(/`/g, '');

        // AUTO_INCREMENT → use SERIAL type instead
        // "INT AUTO_INCREMENT" or "INTEGER AUTO_INCREMENT" → "SERIAL"
        q = q.replace(/\bINT(?:EGER)?\s+AUTO_INCREMENT/gi, 'SERIAL');
        q = q.replace(/\bBIGINT\s+AUTO_INCREMENT/gi, 'BIGSERIAL');
        q = q.replace(/\bSMALLINT\s+AUTO_INCREMENT/gi, 'SMALLSERIAL');

        // Remove AUTO_INCREMENT if it appears standalone (e.g. after PRIMARY KEY)
        q = q.replace(/\bAUTO_INCREMENT/gi, '');

        // Remove ENGINE= clause
        q = q.replace(/\s*ENGINE\s*=\s*\w+/gi, '');

        // Remove DEFAULT CHARSET/CHARACTER SET clause
        q = q.replace(/\s*(?:DEFAULT\s+)?CHARSET\s*=\s*\w+/gi, '');
        q = q.replace(/\s*(?:DEFAULT\s+)?CHARACTER\s+SET\s*=?\s*\w+/gi, '');
        q = q.replace(/\s*COLLATE\s*=?\s*\w+/gi, '');

        // MySQL TINYINT(1) → BOOLEAN
        q = q.replace(/\bTINYINT\s*\(\s*1\s*\)/gi, 'BOOLEAN');

        // MySQL TINYINT → SMALLINT
        q = q.replace(/\bTINYINT/gi, 'SMALLINT');

        // MySQL MEDIUMINT → INTEGER
        q = q.replace(/\bMEDIUMINT/gi, 'INTEGER');

        // MySQL DOUBLE → DOUBLE PRECISION
        q = q.replace(/\bDOUBLE\b(?!\s+PRECISION)/gi, 'DOUBLE PRECISION');

        // MySQL FLOAT → REAL
        q = q.replace(/\bFLOAT/gi, 'REAL');

        // MySQL DATETIME → TIMESTAMP
        q = q.replace(/\bDATETIME/gi, 'TIMESTAMP');

        // MySQL LONGTEXT / MEDIUMTEXT / TINYTEXT → TEXT
        q = q.replace(/\b(?:LONG|MEDIUM|TINY)TEXT/gi, 'TEXT');

        // MySQL LONGBLOB / MEDIUMBLOB / TINYBLOB / BLOB → BYTEA
        q = q.replace(/\b(?:LONG|MEDIUM|TINY)?BLOB/gi, 'BYTEA');

        // MySQL ENUM('a','b') → VARCHAR(255) CHECK (uses a simpler approach)
        // Keep it simple: ENUM → TEXT
        q = q.replace(/\bENUM\s*\([^)]+\)/gi, 'TEXT');

        // MySQL UNSIGNED → remove (PostgreSQL doesn't support UNSIGNED)
        q = q.replace(/\bUNSIGNED/gi, '');

        // MySQL MODIFY COLUMN → ALTER COLUMN ... TYPE
        q = q.replace(/\bMODIFY\s+COLUMN/gi, 'ALTER COLUMN');

        // MySQL LIMIT x, y → LIMIT y OFFSET x
        // The parser output might still have x, y if it didn't translate perfectly
        const limitMatch = q.match(/LIMIT\s+(\d+)\s*,\s*(\d+)/i);
        if (limitMatch) {
            q = q.replace(/LIMIT\s+\d+\s*,\s*\d+/i, `LIMIT ${limitMatch[2]} OFFSET ${limitMatch[1]}`);
        }

        // MySQL IFNULL → COALESCE
        q = q.replace(/\bIFNULL\s*\(/gi, 'COALESCE(');

        return q;
    }
}

module.exports = MySQLTranslator;
