/**
 * MySQL → PostgreSQL Translator
 * 
 * Translates common MySQL syntax into PostgreSQL equivalents
 * so users can write MySQL queries that execute on a PostgreSQL backend.
 */

class MySQLTranslator {
    constructor(userSchema) {
        this.userSchema = userSchema;       // e.g. "user_5"
        this.activeDb = userSchema;         // current "USE" target
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
                pgQuery: `SELECT schema_name AS "Database" FROM information_schema.schemata WHERE schema_name LIKE '${this.userSchema}%' OR schema_name = '${this.userSchema}'`
            };
        }

        if (upper.startsWith('SHOW TABLES')) {
            return {
                isMeta: false,
                pgQuery: `SELECT table_name AS "Table" FROM information_schema.tables WHERE table_schema = '${this.activeDb}' AND table_type = 'BASE TABLE'`
            };
        }

        if (upper.startsWith('DESC ') || upper.startsWith('DESCRIBE ')) {
            const tableName = trimmed.split(/\s+/)[1].replace(/`/g, '').toLowerCase();
            return {
                isMeta: false,
                pgQuery: `SELECT column_name AS "Field", data_type AS "Type", is_nullable AS "Null", column_default AS "Default" FROM information_schema.columns WHERE table_schema = '${this.activeDb}' AND table_name = '${tableName}' ORDER BY ordinal_position`
            };
        }

        if (upper.startsWith('SHOW COLUMNS FROM')) {
            const tableName = trimmed.split(/\s+/)[3].replace(/`/g, '').toLowerCase();
            return {
                isMeta: false,
                pgQuery: `SELECT column_name AS "Field", data_type AS "Type", is_nullable AS "Null", column_default AS "Default" FROM information_schema.columns WHERE table_schema = '${this.activeDb}' AND table_name = '${tableName}' ORDER BY ordinal_position`
            };
        }

        // ── USE database ──
        if (upper.startsWith('USE ')) {
            const dbName = trimmed.split(/\s+/)[1].replace(/`/g, '').toLowerCase();
            const targetSchema = dbName === this.userSchema ? this.userSchema : `${this.userSchema}_${dbName}`;
            this.activeDb = targetSchema;
            return {
                isMeta: true,
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
                pgQuery: `DROP SCHEMA ${ifExists} ${schemaName} CASCADE`,
                noTransaction: true
            };
        }

        // ── Standard SQL → translate MySQL-specific syntax ──
        let pgQuery = this.translateSyntax(trimmed);

        return { isMeta: false, pgQuery };
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

        // MySQL IF NOT EXISTS for CREATE TABLE (PG supports this natively)
        // No change needed

        // MySQL MODIFY COLUMN → ALTER COLUMN ... TYPE
        q = q.replace(/\bMODIFY\s+COLUMN/gi, 'ALTER COLUMN');

        // MySQL LIMIT x, y → LIMIT y OFFSET x
        const limitMatch = q.match(/LIMIT\s+(\d+)\s*,\s*(\d+)/i);
        if (limitMatch) {
            q = q.replace(/LIMIT\s+\d+\s*,\s*\d+/i, `LIMIT ${limitMatch[2]} OFFSET ${limitMatch[1]}`);
        }

        // MySQL NOW() works in PG too — no change needed
        // MySQL IFNULL → COALESCE
        q = q.replace(/\bIFNULL\s*\(/gi, 'COALESCE(');

        // MySQL TRUNCATE TABLE → same in PG

        return q;
    }
}

module.exports = MySQLTranslator;
