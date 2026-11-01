const fs = require('fs');
const path = require('path');

const backupPath = path.join(__dirname, '../backups/supabase_backup_2026_11_01.json');
const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

let sql = '-- BACKUP RESTORE SCRIPT FOR SUPABASE\n';
sql += '-- Generated at: ' + backup.timestamp + '\n\n';

sql += '-- 1. Admin\n';
sql += `INSERT INTO public.tf_admin (id, created_at) VALUES ('${backup.admin.id}', '${backup.admin.created_at}') ON CONFLICT (id) DO NOTHING;\n\n`;

sql += '-- 2. Settings\n';
const settingsEscaped = JSON.stringify(backup.settings.data).replace(/'/g, "''");
sql += `INSERT INTO public.tf_settings (user_id, data, updated_at) VALUES ('${backup.settings.user_id}', '${settingsEscaped}'::jsonb, '${backup.settings.updated_at}') ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;\n\n`;

sql += `-- 3. Records (${backup.records.length} rows)\n`;
for (const r of backup.records) {
  const dataEscaped = JSON.stringify(r.data).replace(/'/g, "''");
  sql += `INSERT INTO public.tf_records (id, user_id, kind, data, created_at, updated_at) VALUES ('${r.id}', '${r.user_id}', '${r.kind}', '${dataEscaped}'::jsonb, '${r.created_at}', '${r.updated_at}') ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;\n`;
}

const outSqlPath = path.join(__dirname, '../backups/supabase_backup_2026_11_01.sql');
fs.writeFileSync(outSqlPath, sql, 'utf8');
console.log('SUCCESS: SQL restore script generated with ' + backup.records.length + ' inserts.');
